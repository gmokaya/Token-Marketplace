import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { ordersTable, spotListingsTable, ewrsTable, usersTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";

const PLATFORM_FEE_RATE = 0.02;
const ESCROW_FEE_RATE = 0.005;
const LOCK_DURATION_MS = 60 * 60 * 1000;

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

  const [listing] = await db.select().from(spotListingsTable).where(eq(spotListingsTable.id, listingId)).limit(1);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (listing.status !== "ACTIVE") return res.status(400).json({ error: "Listing is not ACTIVE" });
  if (listing.sellerId === user.id) return res.status(400).json({ error: "Cannot buy your own listing" });

  const [ewr] = await db.select().from(ewrsTable).where(eq(ewrsTable.id, listing.ewrId)).limit(1);
  if (!ewr) return res.status(404).json({ error: "eWR not found" });

  const weightMt = parseFloat(ewr.weightMt);
  const pricePerMt = parseFloat(listing.pricePerMt);
  const totalUsd = weightMt * pricePerMt;
  const platformFeeUsd = totalUsd * PLATFORM_FEE_RATE;
  const escrowFeeUsd = totalUsd * ESCROW_FEE_RATE;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

  const [order] = await db.insert(ordersTable).values({
    listingId,
    buyerId: user.id,
    lockedAt: now,
    expiresAt,
    status: "PENDING_SETTLEMENT",
    totalUsd: String(totalUsd),
    platformFeeUsd: String(platformFeeUsd),
    escrowFeeUsd: String(escrowFeeUsd),
  }).returning();

  await db.update(spotListingsTable).set({ status: "LOCKED" }).where(eq(spotListingsTable.id, listingId));
  await db.update(ewrsTable).set({ state: "LOCK_TRADING" }).where(eq(ewrsTable.id, ewr.id));

  const enriched = await enrichOrder(order);
  return res.status(201).json(enriched);
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

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.buyerId !== user.id) return res.status(403).json({ error: "Forbidden" });
  if (order.status !== "PENDING_SETTLEMENT") return res.status(400).json({ error: "Order is not in PENDING_SETTLEMENT state" });

  const { status } = req.body as { status: "SETTLED" | "CANCELLED" };
  if (!status || !["SETTLED", "CANCELLED"].includes(status)) {
    return res.status(400).json({ error: "status must be SETTLED or CANCELLED" });
  }

  const [listing] = await db.select().from(spotListingsTable).where(eq(spotListingsTable.id, order.listingId)).limit(1);

  if (status === "SETTLED") {
    const now = new Date();
    const [updated] = await db.update(ordersTable)
      .set({ status: "SETTLED", settledAt: now })
      .where(eq(ordersTable.id, orderId))
      .returning();

    if (listing) {
      await db.update(spotListingsTable).set({ status: "SETTLED" }).where(eq(spotListingsTable.id, listing.id));
      await db.update(ewrsTable).set({
        state: "SETTLED",
        ownerId: user.id,
      }).where(eq(ewrsTable.id, listing.ewrId));
    }

    const enriched = await enrichOrder(updated);
    return res.json(enriched);
  } else {
    const [updated] = await db.update(ordersTable)
      .set({ status: "CANCELLED" })
      .where(eq(ordersTable.id, orderId))
      .returning();

    if (listing) {
      await db.update(spotListingsTable).set({ status: "ACTIVE" }).where(eq(spotListingsTable.id, listing.id));
      await db.update(ewrsTable).set({ state: "MARKET_LISTED" }).where(eq(ewrsTable.id, listing.ewrId));
    }

    const enriched = await enrichOrder(updated);
    return res.json(enriched);
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
          await db.update(ordersTable).set({ status: "EXPIRED" }).where(eq(ordersTable.id, order.id));
          const [listing] = await db.select().from(spotListingsTable).where(eq(spotListingsTable.id, order.listingId)).limit(1);
          if (listing) {
            await db.update(spotListingsTable).set({ status: "ACTIVE" }).where(eq(spotListingsTable.id, listing.id));
            await db.update(ewrsTable).set({ state: "MARKET_LISTED" }).where(eq(ewrsTable.id, listing.ewrId));
          }
        }
      }
    } catch (_err) {
    }
  }, 60_000);
}

export default router;
