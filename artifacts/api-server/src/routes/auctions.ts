import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  auctionsTable,
  auctionBidsTable,
  ewrsTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, and, sql, count } from "drizzle-orm";

const router = Router();

const ANTI_SNIPE_WINDOW_MS = 3 * 60 * 1000;
const ANTI_SNIPE_EXTENSION_MS = 3 * 60 * 1000;
const SETTLEMENT_WINDOW_MS = 60 * 60 * 1000;
const MIN_BID_INCREMENT_PCT = 1.5;

async function enrichAuction(auction: typeof auctionsTable.$inferSelect) {
  const [highBidRow] = await db
    .select({
      maxBid: sql<number>`MAX(CAST(${auctionBidsTable.amountUsd} AS NUMERIC))`,
      bidCount: count(auctionBidsTable.id),
    })
    .from(auctionBidsTable)
    .where(eq(auctionBidsTable.auctionId, auction.id));

  const [seller] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, auction.sellerId))
    .limit(1);

  const [ewr] = await db
    .select({
      commodityType: ewrsTable.commodityType,
      grade: ewrsTable.grade,
      weightMt: ewrsTable.weightMt,
      warehouseCode: ewrsTable.warehouseCode,
    })
    .from(ewrsTable)
    .where(eq(ewrsTable.id, auction.ewrId))
    .limit(1);

  return {
    ...auction,
    sellerName: seller?.name ?? null,
    currentHighBidUsd: highBidRow?.maxBid ?? null,
    bidCount: Number(highBidRow?.bidCount ?? 0),
    commodityType: ewr?.commodityType ?? null,
    grade: ewr?.grade ?? null,
    weightMt: ewr?.weightMt ?? null,
    warehouseCode: ewr?.warehouseCode ?? null,
  };
}

router.get("/auctions", async (req, res) => {
  const { status, commodityType, sellerId } = req.query as {
    status?: string;
    commodityType?: string;
    sellerId?: string;
  };

  const conditions = [];
  if (status) conditions.push(eq(auctionsTable.status, status as typeof auctionsTable.$inferSelect["status"]));
  if (sellerId) conditions.push(eq(auctionsTable.sellerId, parseInt(sellerId)));

  const auctions = await db
    .select()
    .from(auctionsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auctionsTable.createdAt));

  let filtered = auctions;
  if (commodityType) {
    const ewrMap = new Map<number, string>();
    const ewrRows = await db.select({ id: ewrsTable.id, commodityType: ewrsTable.commodityType }).from(ewrsTable);
    for (const row of ewrRows) ewrMap.set(row.id, row.commodityType);
    filtered = auctions.filter(a => ewrMap.get(a.ewrId) === commodityType);
  }

  const enriched = await Promise.all(filtered.map(enrichAuction));
  return res.json(enriched);
});

router.post("/auctions", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "PRODUCER") return res.status(403).json({ error: "Only producers can create auctions" });

  const { ewrId, reservePriceUsd, bidIncrementPct = 1.5, durationMinutes } = req.body as {
    ewrId: number;
    reservePriceUsd: number;
    bidIncrementPct?: number;
    durationMinutes: number;
  };

  if (!ewrId || !reservePriceUsd || !durationMinutes) {
    return res.status(400).json({ error: "ewrId, reservePriceUsd, and durationMinutes are required" });
  }

  if (bidIncrementPct < MIN_BID_INCREMENT_PCT) {
    return res.status(400).json({ error: `bidIncrementPct must be at least ${MIN_BID_INCREMENT_PCT}%` });
  }

  const [ewr] = await db.select().from(ewrsTable).where(eq(ewrsTable.id, ewrId)).limit(1);
  if (!ewr) return res.status(404).json({ error: "eWR not found" });
  if (ewr.ownerId !== user.id) return res.status(403).json({ error: "You do not own this eWR" });
  if (!["INGESTED", "ENCUMBERED"].includes(ewr.state)) return res.status(400).json({ error: "eWR must be INGESTED or ENCUMBERED to auction" });

  const now = new Date();
  const endAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

  const auction = await db.transaction(async (tx) => {
    const [created] = await tx.insert(auctionsTable).values({
      ewrId,
      sellerId: user.id,
      reservePriceUsd: String(reservePriceUsd),
      bidIncrementPct: String(bidIncrementPct),
      startAt: now,
      endAt,
    }).returning();

    await tx.update(ewrsTable).set({ state: "MARKET_LISTED" }).where(eq(ewrsTable.id, ewrId));
    return created;
  });

  const enriched = await enrichAuction(auction);
  return res.status(201).json(enriched);
});

router.get("/auctions/:auctionId", async (req, res) => {
  const auctionId = parseInt(req.params.auctionId);
  if (isNaN(auctionId)) return res.status(400).json({ error: "Invalid auction ID" });

  const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, auctionId)).limit(1);
  if (!auction) return res.status(404).json({ error: "Auction not found" });

  const [ewr] = await db.select().from(ewrsTable).where(eq(ewrsTable.id, auction.ewrId)).limit(1);

  const bids = await db
    .select({
      id: auctionBidsTable.id,
      auctionId: auctionBidsTable.auctionId,
      bidderId: auctionBidsTable.bidderId,
      bidderName: usersTable.name,
      amountUsd: auctionBidsTable.amountUsd,
      placedAt: auctionBidsTable.placedAt,
      isWinning: auctionBidsTable.isWinning,
    })
    .from(auctionBidsTable)
    .leftJoin(usersTable, eq(auctionBidsTable.bidderId, usersTable.id))
    .where(eq(auctionBidsTable.auctionId, auctionId))
    .orderBy(desc(auctionBidsTable.amountUsd));

  const now = new Date();
  const secondsRemaining = Math.max(0, (auction.endAt.getTime() - now.getTime()) / 1000);

  const enrichedAuction = await enrichAuction(auction);

  return res.json({
    auction: enrichedAuction,
    bids,
    secondsRemaining,
    ewr: ewr ?? null,
  });
});

router.get("/auctions/:auctionId/bids", async (req, res) => {
  const auctionId = parseInt(req.params.auctionId);
  if (isNaN(auctionId)) return res.status(400).json({ error: "Invalid auction ID" });

  const bids = await db
    .select({
      id: auctionBidsTable.id,
      auctionId: auctionBidsTable.auctionId,
      bidderId: auctionBidsTable.bidderId,
      bidderName: usersTable.name,
      amountUsd: auctionBidsTable.amountUsd,
      placedAt: auctionBidsTable.placedAt,
      isWinning: auctionBidsTable.isWinning,
    })
    .from(auctionBidsTable)
    .leftJoin(usersTable, eq(auctionBidsTable.bidderId, usersTable.id))
    .where(eq(auctionBidsTable.auctionId, auctionId))
    .orderBy(desc(auctionBidsTable.placedAt));

  return res.json(bids);
});

router.post("/auctions/:auctionId/bids", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const auctionId = parseInt(req.params.auctionId);
  if (isNaN(auctionId)) return res.status(400).json({ error: "Invalid auction ID" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "OFF_TAKER") return res.status(403).json({ error: "Only off-takers can place bids" });

  const { amountUsd } = req.body as { amountUsd: number };
  if (!amountUsd || amountUsd <= 0) return res.status(400).json({ error: "amountUsd must be positive" });

  try {
    const bid = await db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      const [auction] = await tx
        .select()
        .from(auctionsTable)
        .where(eq(auctionsTable.id, auctionId))
        .limit(1)
        .for("update");

      if (!auction) throw Object.assign(new Error("Auction not found"), { statusCode: 404 });
      if (auction.status !== "OPEN") throw Object.assign(new Error("Auction is not open"), { statusCode: 400 });

      const now = new Date();
      if (auction.endAt <= now) throw Object.assign(new Error("Auction has ended"), { statusCode: 400 });

      if (auction.sellerId === user.id) {
        throw Object.assign(new Error("Seller cannot bid on their own auction"), { statusCode: 403 });
      }

      const [highBidRow] = await tx
        .select({ maxBid: sql<number>`MAX(CAST(${auctionBidsTable.amountUsd} AS NUMERIC))` })
        .from(auctionBidsTable)
        .where(eq(auctionBidsTable.auctionId, auctionId));

      const currentHigh = highBidRow?.maxBid ?? null;
      const increment = parseFloat(auction.bidIncrementPct);
      const floor = currentHigh !== null
        ? currentHigh * (1 + increment / 100)
        : parseFloat(auction.reservePriceUsd);

      if (amountUsd < floor) {
        throw Object.assign(
          new Error(`Bid must be at least $${floor.toFixed(2)} (${currentHigh !== null ? `${increment}% above current high of $${currentHigh.toFixed(2)}` : "reserve price"})`),
          { statusCode: 400 }
        );
      }

      await tx.update(auctionBidsTable).set({ isWinning: false }).where(eq(auctionBidsTable.auctionId, auctionId));

      const [newBid] = await tx.insert(auctionBidsTable).values({
        auctionId,
        bidderId: user.id,
        amountUsd: String(amountUsd),
        isWinning: true,
      }).returning();

      const msLeft = auction.endAt.getTime() - now.getTime();
      if (msLeft <= ANTI_SNIPE_WINDOW_MS) {
        // Extend from current end_at (not from now), cascading
        const newEndAt = new Date(auction.endAt.getTime() + ANTI_SNIPE_EXTENSION_MS);
        await tx.update(auctionsTable)
          .set({ winningBidId: newBid.id, endAt: newEndAt })
          .where(eq(auctionsTable.id, auctionId));
      } else {
        await tx.update(auctionsTable)
          .set({ winningBidId: newBid.id })
          .where(eq(auctionsTable.id, auctionId));
      }

      return newBid;
    });

    const [bidWithBidder] = await db
      .select({
        id: auctionBidsTable.id,
        auctionId: auctionBidsTable.auctionId,
        bidderId: auctionBidsTable.bidderId,
        bidderName: usersTable.name,
        amountUsd: auctionBidsTable.amountUsd,
        placedAt: auctionBidsTable.placedAt,
        isWinning: auctionBidsTable.isWinning,
      })
      .from(auctionBidsTable)
      .leftJoin(usersTable, eq(auctionBidsTable.bidderId, usersTable.id))
      .where(eq(auctionBidsTable.id, bid.id))
      .limit(1);

    return res.status(201).json(bidWithBidder);
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    if (statusCode < 500) return res.status(statusCode).json({ error: err.message });
    throw err;
  }
});

export async function startAuctionExpiryWorker() {
  setInterval(async () => {
    try {
      const now = new Date();

      // ── Phase 1: Close OPEN auctions past end_at ──────────────────────────
      const openAuctions = await db
        .select()
        .from(auctionsTable)
        .where(eq(auctionsTable.status, "OPEN"));

      for (const auction of openAuctions) {
        if (auction.endAt > now) continue;

        await db.transaction(async (tx) => {
          const affected = await tx
            .update(auctionsTable)
            .set({ status: "CLOSED" })
            .where(
              sql`${auctionsTable.id} = ${auction.id}
                  AND ${auctionsTable.status} = 'OPEN'
                  AND ${auctionsTable.endAt} <= ${now.toISOString()}`
            )
            .returning({ id: auctionsTable.id });

          if (affected.length === 0) return;

          if (auction.winningBidId) {
            const [winBid] = await tx
              .select()
              .from(auctionBidsTable)
              .where(eq(auctionBidsTable.id, auction.winningBidId))
              .limit(1);

            if (winBid && parseFloat(winBid.amountUsd) >= parseFloat(auction.reservePriceUsd)) {
              // Winner exists and meets reserve → CLOSED + start 60-min settlement window
              const settlementDeadlineAt = new Date(now.getTime() + SETTLEMENT_WINDOW_MS);
              await tx.update(auctionsTable)
                .set({ settlementDeadlineAt })
                .where(eq(auctionsTable.id, auction.id));
              // Lock eWR while settlement is pending
              await tx.update(ewrsTable).set({ state: "LOCK_TRADING" }).where(eq(ewrsTable.id, auction.ewrId));
            } else {
              // No valid winner → cancel; restore eWR to ENCUMBERED if lien is still active
              const [ewrData] = await tx.select({ isLienActive: ewrsTable.isLienActive }).from(ewrsTable).where(eq(ewrsTable.id, auction.ewrId)).limit(1);
              await tx.update(auctionsTable)
                .set({ status: "CANCELLED", winningBidId: null })
                .where(eq(auctionsTable.id, auction.id));
              await tx.update(ewrsTable).set({ state: ewrData?.isLienActive ? "ENCUMBERED" : "INGESTED" }).where(eq(ewrsTable.id, auction.ewrId));
            }
          } else {
            // No bids → cancel; restore eWR to ENCUMBERED if lien is still active
            const [ewrData] = await tx.select({ isLienActive: ewrsTable.isLienActive }).from(ewrsTable).where(eq(ewrsTable.id, auction.ewrId)).limit(1);
            await tx.update(auctionsTable)
              .set({ status: "CANCELLED" })
              .where(eq(auctionsTable.id, auction.id));
            await tx.update(ewrsTable).set({ state: ewrData?.isLienActive ? "ENCUMBERED" : "INGESTED" }).where(eq(ewrsTable.id, auction.ewrId));
          }
        });
      }

      // ── Phase 2: SETTLED CLOSED auctions past settlement deadline ─────────
      const closedAuctions = await db
        .select()
        .from(auctionsTable)
        .where(eq(auctionsTable.status, "CLOSED"));

      for (const auction of closedAuctions) {
        if (!auction.settlementDeadlineAt || auction.settlementDeadlineAt > now) continue;

        await db.transaction(async (tx) => {
          const affected = await tx
            .update(auctionsTable)
            .set({ status: "SETTLED" })
            .where(
              sql`${auctionsTable.id} = ${auction.id}
                  AND ${auctionsTable.status} = 'CLOSED'
                  AND ${auctionsTable.settlementDeadlineAt} <= ${now.toISOString()}`
            )
            .returning({ id: auctionsTable.id });

          if (affected.length === 0) return;
          // eWR remains LOCK_TRADING — settlement complete
        });
      }
    } catch (err) {
      console.error("[AuctionExpiryWorker] Error:", err);
    }
  }, 15_000);
}

export default router;
