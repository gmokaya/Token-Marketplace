import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, withTxRetry } from "@workspace/db";
import {
  ordersTable,
  spotListingsTable,
  ewrsTable,
  usersTable,
  reputationEventsTable,
  auditLogTable,
} from "@workspace/db";
import { eq, and, lte, SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auditEntry } from "../lib/audit";
import { logger } from "../lib/logger";

const PLATFORM_FEE_RATE = 0.02;
const ESCROW_FEE_RATE = 0.005;
const LOCK_DURATION_MS = 60 * 60 * 1000;
const EXPIRY_REPUTATION_PENALTY = 5;

const router = Router();

// ── Shared aliases for buyer / seller self-join on users ──────────────────────
const buyerAlias  = alias(usersTable, "buyer");
const sellerAlias = alias(usersTable, "seller");

type EnrichedOrder = {
  id: number;
  listingId: number;
  buyerId: number;
  lockedAt: Date;
  expiresAt: Date;
  settledAt: Date | null;
  status: typeof ordersTable.$inferSelect["status"];
  totalUsd: string;
  platformFeeUsd: string;
  escrowFeeUsd: string;
  createdAt: Date;
  buyerName: string | null;
  sellerName: string | null;
  commodityType: string | null;
  grade: string | null;
  weightMt: string | null;
  warehouseCode: string | null;
  pricePerMt: string | null;
};

/**
 * Enriches order rows in a single JOIN — replaces the old per-row `enrichOrder()`
 * function which fired 3–4 sequential queries per order (N+1).
 *
 * Handles both list (pass one condition per buyer) and single-row (add an
 * ordersTable.id = X condition) use cases.
 */
async function queryEnrichedOrders(conditions: SQL[]): Promise<EnrichedOrder[]> {
  return db
    .select({
      id:           ordersTable.id,
      listingId:    ordersTable.listingId,
      buyerId:      ordersTable.buyerId,
      lockedAt:     ordersTable.lockedAt,
      expiresAt:    ordersTable.expiresAt,
      settledAt:    ordersTable.settledAt,
      status:       ordersTable.status,
      totalUsd:     ordersTable.totalUsd,
      platformFeeUsd: ordersTable.platformFeeUsd,
      escrowFeeUsd:   ordersTable.escrowFeeUsd,
      createdAt:    ordersTable.createdAt,
      buyerName:    buyerAlias.name,
      sellerName:   sellerAlias.name,
      commodityType: ewrsTable.commodityType,
      grade:         ewrsTable.grade,
      weightMt:      ewrsTable.weightMt,
      warehouseCode: ewrsTable.warehouseCode,
      pricePerMt:    spotListingsTable.pricePerMt,
    })
    .from(ordersTable)
    .leftJoin(buyerAlias,        eq(ordersTable.buyerId,          buyerAlias.id))
    .leftJoin(spotListingsTable,  eq(ordersTable.listingId,        spotListingsTable.id))
    .leftJoin(ewrsTable,          eq(spotListingsTable.ewrId,      ewrsTable.id))
    .leftJoin(sellerAlias,        eq(spotListingsTable.sellerId,   sellerAlias.id))
    .where(and(...conditions));
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get("/orders", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { status } = req.query as { status?: string };
  const conditions: SQL[] = [eq(ordersTable.buyerId, user.id)];
  if (status) conditions.push(eq(ordersTable.status, status as typeof ordersTable.$inferSelect["status"]));

  const enriched = await queryEnrichedOrders(conditions);
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
    const order = await withTxRetry(() => db.transaction(async (tx) => {
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
    }));

    const [enriched] = await queryEnrichedOrders([eq(ordersTable.id, order.id)]);
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

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [enriched] = await queryEnrichedOrders([
    eq(ordersTable.id, orderId),
    eq(ordersTable.buyerId, user.id),
  ]);

  if (!enriched) return res.status(404).json({ error: "Order not found" });
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
    await withTxRetry(() => db.transaction(async (tx) => {
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
      await tx
        .update(ordersTable)
        .set({ status: "CANCELLED" })
        .where(eq(ordersTable.id, orderId));

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
    }));

    const [enriched] = await queryEnrichedOrders([eq(ordersTable.id, orderId)]);
    return res.json(enriched);
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    const message = err.message ?? "Internal server error";
    if (statusCode < 500) return res.status(statusCode).json({ error: message });
    throw err;
  }
});

// ── Order expiry background worker ────────────────────────────────────────────

export function startOrderExpiryWorker() {
  setInterval(async () => {
    try {
      const now = new Date();

      // Filter expired orders at the DB level — uses the compound index
      // (status, expires_at) added to the schema. Avoids loading the full
      // PENDING_SETTLEMENT set and filtering in JS (was O(all-pending) per tick).
      const expiredOrders = await db
        .select()
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.status, "PENDING_SETTLEMENT"),
            lte(ordersTable.expiresAt, now),
          )
        );

      for (const order of expiredOrders) {
        await db.transaction(async (tx) => {
          // Atomic claim: skip if a concurrent worker already transitioned this row
          const affected = await tx
            .update(ordersTable)
            .set({ status: "EXPIRED" })
            .where(
              and(
                eq(ordersTable.id, order.id),
                eq(ordersTable.status, "PENDING_SETTLEMENT"),
              )
            )
            .returning({ id: ordersTable.id });

          if (affected.length === 0) return;

          const [listing] = await tx
            .select()
            .from(spotListingsTable)
            .where(eq(spotListingsTable.id, order.listingId))
            .limit(1);

          if (listing) {
            await tx
              .update(spotListingsTable)
              .set({ status: "ACTIVE" })
              .where(eq(spotListingsTable.id, listing.id));

            const [ewrRow] = await tx
              .select({ isLienActive: ewrsTable.isLienActive })
              .from(ewrsTable)
              .where(eq(ewrsTable.id, listing.ewrId))
              .limit(1);

            await tx
              .update(ewrsTable)
              .set({ state: ewrRow?.isLienActive ? "ENCUMBERED" : "MARKET_LISTED" })
              .where(eq(ewrsTable.id, listing.ewrId));
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
            auditEntry(
              "ORDER", order.id, "ORDER_EXPIRED", null,
              { orderId: order.id, buyerId: order.buyerId, expiredAt: now.toISOString() },
              { reputationPenalty: EXPIRY_REPUTATION_PENALTY }
            )
          );
        });
      }
    } catch (err) {
      logger.error({ err }, "[ExpiryWorker] Error processing expired orders");
    }
  }, 60_000);
}

export default router;
