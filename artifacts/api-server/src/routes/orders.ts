import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { ordersTable, spotListingsTable, ewrsTable, usersTable, reputationEventsTable, auditLogTable } from "@workspace/db";
import { eq, and, SQL, sql } from "drizzle-orm";
import { sha256, auditEntry } from "../lib/audit";

const PLATFORM_FEE_RATE = 0.02;
const ESCROW_FEE_RATE = 0.005;
const LOCK_DURATION_MS = 60 * 60 * 1000;
const EXPIRY_REPUTATION_PENALTY = 5;

const router = Router();

async function enrichOrder(order: typeof ordersTable.$inferSelect) {
  const [listing] = await db.select().from(spotListingsTable).where(eq(spotListingsTable.id, order.listingId)).limit(1);
  const ewr = listing ? (await db.select().from(ewrsTable).where(eq(ewrsTable.id, listing.ewrId)).limit(1))[0] : null;
  const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.buyerId)).limit(1);
  const [seller] = listing ? (await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, listing.sellerId)).limit(1)) : [null];

  return {
    ...order,
    buyerName: buyer?.name ?? null,
    sellerName: seller?.name ?? null,
    commodityType: ewr?.commodityType ?? null,
    grade: ewr?.grade ?? null,
    weightMt: ewr?.weightMt ?? null,
    warehouseCode: ewr?.warehouseCode ?? null,
    pricePerMt: listing?.pricePerMt ?? null,
  };
}

router.get("/orders", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { status } = req.query as { status?: string };
  const conditions: SQL[] = [eq(ordersTable.buyerId, user.id)];
  if (status) conditions.push(eq(ordersTable.status, status as typeof ordersTable.$inferSelect["status"]));

  const orders = await db.select().from(ordersTable).where(and(...conditions));
  const enriched = await Promise.all(orders.map(enrichOrder));
  return res.json(enriched);
});

router.post("/orders", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "OFF_TAKER") return res.status(403).json({ error: "Only OFF_TAKER accounts can place orders" });

  const { listingId } = req.body as { listingId: number };
  if (!listingId) return res.status(400).json({ error: "listingId is required" });

  try {
    const order = await db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
      type LockedRow = { id: number; status: string; seller_id: number; ewr_id: number; price_per_mt: string };
      const lockResult = await tx.execute<LockedRow>(
        sql`SELECT id, status, seller_id, ewr_id, price_per_mt FROM spot_listings WHERE id = ${listingId} FOR UPDATE`
      );
      const locked = lockResult.rows[0];
      if (!locked) throw Object.assign(new Error("Listing not found"), { statusCode: 404 });
      if (locked.status !== "ACTIVE") throw Object.assign(new Error("Listing is not ACTIVE — it may have just been taken"), { statusCode: 400 });
      if (locked.seller_id === user.id) throw Object.assign(new Error("Cannot buy your own listing"), { statusCode: 400 });

      const [ewr] = await tx.select().from(ewrsTable).where(eq(ewrsTable.id, locked.ewr_id)).limit(1);
      if (!ewr) throw Object.assign(new Error("eWR not found"), { statusCode: 404 });

      const weightMt = parseFloat(ewr.weightMt);
      const pricePerMt = parseFloat(locked.price_per_mt);
      const totalUsd = weightMt * pricePerMt;
      const platformFeeUsd = totalUsd * PLATFORM_FEE_RATE;
      const escrowFeeUsd = totalUsd * ESCROW_FEE_RATE;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

      const [newOrder] = await tx.insert(ordersTable).values({
        listingId,
        buyerId: user.id,
        lockedAt: now,
        expiresAt,
        status: "PENDING_SETTLEMENT",
        totalUsd: String(totalUsd),
        platformFeeUsd: String(platformFeeUsd),
        escrowFeeUsd: String(escrowFeeUsd),
      }).returning();

      await tx.update(spotListingsTable).set({ status: "LOCKED" }).where(eq(spotListingsTable.id, listingId));
      // §6.1: MARKET_LISTED → LOCK_TRADING (spot order checkout lock)
      await tx.update(ewrsTable).set({ state: "LOCK_TRADING" }).where(eq(ewrsTable.id, ewr.id));

      await tx.insert(auditLogTable).values(
        auditEntry("ORDER", newOrder.id, "ORDER_PLACED", user.id,
          { orderId: newOrder.id, listingId, buyerId: user.id, totalUsd, expiresAt: expiresAt.toISOString() },
          { totalUsd, platformFeeUsd, escrowFeeUsd, ewrId: ewr.id }
        )
      );
      return newOrder;
    });

    const enriched = await enrichOrder(order);
    return res.status(201).json(enriched);
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    const message = err.message ?? "Internal server error";
    if (statusCode < 500) return res.status(statusCode).json({ error: message });
    throw err;
  }
});

router.get("/orders/:orderId", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const orderId = parseInt(req.params.orderId);
  if (isNaN(orderId)) return res.status(400).json({ error: "Invalid order ID" });

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user || order.buyerId !== user.id) return res.status(403).json({ error: "Forbidden" });

  const enriched = await enrichOrder(order);
  return res.json(enriched);
});

router.patch("/orders/:orderId", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const orderId = parseInt(req.params.orderId);
  if (isNaN(orderId)) return res.status(400).json({ error: "Invalid order ID" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { status } = req.body as { status: "CANCELLED" };
  if (!status || status !== "CANCELLED") {
    return res.status(400).json({ error: "status must be CANCELLED — use POST /settlements to settle an order through the split engine" });
  }

  try {
    const updated = await db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      const [lockedOrder] = await tx
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId))
        .limit(1)
        .for("update");

      if (!lockedOrder) throw Object.assign(new Error("Order not found"), { statusCode: 404 });
      if (lockedOrder.buyerId !== user.id) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
      if (lockedOrder.status !== "PENDING_SETTLEMENT") {
        throw Object.assign(new Error("Order is not in PENDING_SETTLEMENT state"), { statusCode: 400 });
      }

      const [listing] = await tx
        .select()
        .from(spotListingsTable)
        .where(eq(spotListingsTable.id, lockedOrder.listingId))
        .limit(1);

      // CANCELLED only — SETTLED is handled exclusively by POST /settlements (split engine)
      const [result] = await tx
        .update(ordersTable)
        .set({ status: "CANCELLED" })
        .where(eq(ordersTable.id, orderId))
        .returning();

      if (listing) {
        await tx.update(spotListingsTable).set({ status: "ACTIVE" }).where(eq(spotListingsTable.id, listing.id));
        const [ewrForListing] = await tx.select({ isLienActive: ewrsTable.isLienActive })
          .from(ewrsTable).where(eq(ewrsTable.id, listing.ewrId)).limit(1);
        await tx.update(ewrsTable)
          .set({ state: ewrForListing?.isLienActive ? "ENCUMBERED" : "MARKET_LISTED" })
          .where(eq(ewrsTable.id, listing.ewrId));
      }

      await tx.insert(auditLogTable).values(
        auditEntry("ORDER", orderId, "ORDER_CANCELLED", user.id,
          { orderId, listingId: lockedOrder.listingId, buyerId: user.id },
          { reason: "buyer_cancelled" }
        )
      );
      return result;
    });

    const enriched = await enrichOrder(updated);
    return res.json(enriched);
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    const message = err.message ?? "Internal server error";
    if (statusCode < 500) return res.status(statusCode).json({ error: message });
    throw err;
  }
});

export function startOrderExpiryWorker() {
  setInterval(async () => {
    try {
      const now = new Date();
      const expiredOrders = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.status, "PENDING_SETTLEMENT"));

      for (const order of expiredOrders) {
        if (order.expiresAt <= now) {
          await db.transaction(async (tx) => {
            const affected = await tx
              .update(ordersTable)
              .set({ status: "EXPIRED" })
              .where(
                sql`${ordersTable.id} = ${order.id}
                    AND ${ordersTable.status} = 'PENDING_SETTLEMENT'
                    AND ${ordersTable.expiresAt} <= ${now.toISOString()}`
              )
              .returning({ id: ordersTable.id });

            if (affected.length === 0) return;

            const [listing] = await tx.select().from(spotListingsTable).where(eq(spotListingsTable.id, order.listingId)).limit(1);
            if (listing) {
              await tx.update(spotListingsTable).set({ status: "ACTIVE" }).where(eq(spotListingsTable.id, listing.id));
              await tx.update(ewrsTable).set({ state: "MARKET_LISTED" }).where(eq(ewrsTable.id, listing.ewrId));
            }

            await tx.insert(reputationEventsTable).values({
              userId: order.buyerId,
              delta: -EXPIRY_REPUTATION_PENALTY,
              reason: `Missed settlement window for order #${order.id}`,
            });

            await tx.execute(
              sql`UPDATE users SET reputation_score = GREATEST(0, reputation_score - ${EXPIRY_REPUTATION_PENALTY}) WHERE id = ${order.buyerId}`
            );

            await tx.insert(auditLogTable).values(
              auditEntry("ORDER", order.id, "ORDER_EXPIRED", null,
                { orderId: order.id, buyerId: order.buyerId, expiredAt: now.toISOString() },
                { reputationPenalty: EXPIRY_REPUTATION_PENALTY }
              )
            );
          });
        }
      }
    } catch (err) {
      console.error("[ExpiryWorker] Error processing expired orders:", err);
    }
  }, 60_000);
}

export default router;
