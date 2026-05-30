import { Router, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import pg from "pg";
import { db, pool, withTxRetry } from "@workspace/db";
import { publishAuctionEvent } from "../lib/pg-pubsub";
import {
  auctionsTable,
  auctionBidsTable,
  ewrsTable,
  usersTable,
  settlementsTable,
  auditLogTable,
} from "@workspace/db";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { sha256, auditEntry } from "../lib/audit";

const router = Router();

const ANTI_SNIPE_WINDOW_MS = 3 * 60 * 1000;
const ANTI_SNIPE_EXTENSION_MS = 3 * 60 * 1000;
const SETTLEMENT_WINDOW_MS = 60 * 60 * 1000;
const MIN_BID_INCREMENT_PCT = 1.5;

// ── SSE fan-out registry ──────────────────────────────────────────────────────
// Maps auctionId -> Set of active SSE response objects (per-auction detail pages)
const sseClients = new Map<number, Set<Response>>();

// Global SSE clients — receive events for ALL auctions (used by the list page)
const globalSseClients = new Set<Response>();

function registerSseClient(auctionId: number, res: Response) {
  if (!sseClients.has(auctionId)) sseClients.set(auctionId, new Set());
  sseClients.get(auctionId)!.add(res);
}

function unregisterSseClient(auctionId: number, res: Response) {
  sseClients.get(auctionId)?.delete(res);
  if (sseClients.get(auctionId)?.size === 0) sseClients.delete(auctionId);
}

export function broadcastReconnectHint() {
  const payload = `event: reconnect\ndata: {}\n\n`;
  for (const client of globalSseClients) {
    try { client.write(payload); } catch { /* client gone */ }
  }
  for (const clients of sseClients.values()) {
    for (const client of clients) {
      try { client.write(payload); } catch { /* client gone */ }
    }
  }
}

export function broadcastSseEvent(auctionId: number, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  // Fan-out to per-auction detail subscribers
  const perAuctionClients = sseClients.get(auctionId);
  if (perAuctionClients) {
    for (const client of perAuctionClients) {
      try { client.write(payload); } catch { /* client gone */ }
    }
  }

  // Fan-out to global list subscribers — include auctionId in the envelope
  const globalPayload = `event: ${event}\ndata: ${JSON.stringify({ auctionId, ...((typeof data === "object" && data !== null) ? data : { data }) })}\n\n`;
  for (const client of globalSseClients) {
    try { client.write(globalPayload); } catch { /* client gone */ }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

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

  const enriched: Record<string, unknown> = {
    ...auction,
    sellerName: seller?.name ?? null,
    currentHighBidUsd: highBidRow?.maxBid ?? null,
    bidCount: Number(highBidRow?.bidCount ?? 0),
    commodityType: ewr?.commodityType ?? null,
    grade: ewr?.grade ?? null,
    weightMt: ewr?.weightMt ?? null,
    warehouseCode: ewr?.warehouseCode ?? null,
  };

  if (seller) {
    const [sellerFull] = await db.select({ tier: usersTable.tier })
      .from(usersTable).where(eq(usersTable.id, auction.sellerId)).limit(1);
    if (sellerFull?.tier === "COOPERATIVE") {
      enriched.sellerName = null;
      enriched.sellerId = null;
      enriched.warehouseCode = typeof enriched.warehouseCode === "string"
        ? (enriched.warehouseCode as string).slice(0, 3)
        : null;
      enriched._anonymous = true;
    }
  }

  return enriched;
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
  if (!["PRODUCER", "COOPERATIVE"].includes(user.tier)) return res.status(403).json({ error: "Only PRODUCER or COOPERATIVE accounts can create auctions" });

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

    // §6.1: INGESTED/ENCUMBERED → AUCTION_ACTIVE (asset enters live auction)
    await tx.update(ewrsTable).set({ state: "AUCTION_ACTIVE" }).where(eq(ewrsTable.id, ewrId));

    await tx.insert(auditLogTable).values(
      auditEntry("AUCTION", created.id, "AUCTION_CREATED", user.id,
        { auctionId: created.id, ewrId, sellerId: user.id, reservePriceUsd, endAt: endAt.toISOString() },
        { reservePriceUsd, bidIncrementPct, durationMinutes }
      )
    );
    return created;
  });

  const enriched = await enrichAuction(auction);
  return res.status(201).json(enriched);
});

// ── Global SSE stream endpoint ────────────────────────────────────────────────
// MUST be registered before /auctions/:auctionId so Express doesn't match
// "stream" as an auctionId and return 400.
// Clients connect here and receive pushed events for ALL open auctions at once.
// Events emitted:
//   - "bid"       → { auctionId, bid, antiSnipeTriggered, newEndAt }
//   - "closed"    → { auctionId }
//   - "ping"      → {}  — keepalive every 25s
//   - "connected" → {}
//   - "reconnect" → {}  — subscriber reconnected after a gap; clients should re-fetch current state
router.get("/auctions/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`event: connected\ndata: {}\n\n`);

  globalSseClients.add(res);

  const pingInterval = setInterval(() => {
    try {
      res.write(`event: ping\ndata: {}\n\n`);
    } catch {
      clearInterval(pingInterval);
    }
  }, 25_000);

  req.on("close", () => {
    clearInterval(pingInterval);
    globalSseClients.delete(res);
  });
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

// ── Per-auction SSE stream endpoint ──────────────────────────────────────────
// Clients connect here and receive pushed events whenever a bid is placed.
// Events emitted:
//   - "bid"       → { bid, auction } — new bid placed + updated auction state
//   - "closed"    → { auctionId }    — auction status changed to non-OPEN
//   - "ping"      → {}               — keepalive every 25s
//   - "reconnect" → {}               — subscriber reconnected after a gap; clients should re-fetch current state
router.get("/auctions/:auctionId/stream", async (req: Request, res: Response) => {
  const auctionId = parseInt(req.params["auctionId"] as string);
  if (isNaN(auctionId)) {
    res.status(400).json({ error: "Invalid auction ID" });
    return;
  }

  // Verify auction exists
  const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, auctionId)).limit(1);
  if (!auction) {
    res.status(404).json({ error: "Auction not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send initial connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ auctionId })}\n\n`);

  registerSseClient(auctionId, res);

  // Keepalive ping every 25 seconds to prevent proxy/load-balancer timeouts
  const pingInterval = setInterval(() => {
    try {
      res.write(`event: ping\ndata: {}\n\n`);
    } catch {
      clearInterval(pingInterval);
    }
  }, 25_000);

  req.on("close", () => {
    clearInterval(pingInterval);
    unregisterSseClient(auctionId, res);
  });
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
    const { bid, antiSnipeTriggered, newEndAt } = await withTxRetry(() => db.transaction(async (tx) => {
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
      let antiSnipeTriggered = false;
      let newEndAt: Date | null = null;

      if (msLeft <= ANTI_SNIPE_WINDOW_MS) {
        antiSnipeTriggered = true;
        newEndAt = new Date(auction.endAt.getTime() + ANTI_SNIPE_EXTENSION_MS);
        await tx.update(auctionsTable)
          .set({ winningBidId: newBid.id, endAt: newEndAt })
          .where(eq(auctionsTable.id, auctionId));
        // §6.2: log anti-snipe extension event
        await tx.insert(auditLogTable).values(
          auditEntry("AUCTION", auctionId, "ANTI_SNIPE_EXTENDED", user.id,
            { auctionId, bidId: newBid.id, oldEndAt: auction.endAt.toISOString(), newEndAt: newEndAt.toISOString() },
            { extensionMs: ANTI_SNIPE_EXTENSION_MS, amountUsd }
          )
        );
      } else {
        await tx.update(auctionsTable)
          .set({ winningBidId: newBid.id })
          .where(eq(auctionsTable.id, auctionId));
      }

      // §6.2: log every bid with SHA-256 hash
      await tx.insert(auditLogTable).values(
        auditEntry("AUCTION", auctionId, "BID_PLACED", user.id,
          { auctionId, bidId: newBid.id, bidderId: user.id, amountUsd, placedAt: now.toISOString() },
          { amountUsd, antiSnipeTriggered, floor: currentHigh ? currentHigh * (1 + parseFloat(auction.bidIncrementPct) / 100) : parseFloat(auction.reservePriceUsd) }
        )
      );

      return { bid: newBid, antiSnipeTriggered, newEndAt };
    }));

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

    // Publish bid event via pg NOTIFY so all server instances fan-out to their local SSE clients
    await publishAuctionEvent({
      type: "bid",
      auctionId,
      data: {
        bid: bidWithBidder,
        antiSnipeTriggered,
        newEndAt: newEndAt?.toISOString() ?? null,
      },
    });

    return res.status(201).json(bidWithBidder);
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    if (statusCode < 500) return res.status(statusCode).json({ error: err.message });
    throw err;
  }
});

// Arbitrary stable key used for pg_try_advisory_lock to elect a single leader
// across all server instances for the auction expiry sweep.
const EXPIRY_WORKER_LOCK_KEY = 7_369_621n;

export async function startAuctionExpiryWorker() {
  setInterval(async () => {
    // ── Leader election via PostgreSQL session-level advisory lock ─────────
    // pg_try_advisory_lock / pg_advisory_unlock are session-scoped, so acquire
    // and release MUST happen on the same physical connection. We pin a single
    // PoolClient for the lock calls and release it when the tick is done.
    // The sweep itself still uses the pool-backed `db` for its own queries.
    let lockClient: pg.PoolClient | undefined;
    let lockAcquired = false;
    try {
      lockClient = await pool.connect();
      const lockRes = await lockClient.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock($1) AS acquired",
        [EXPIRY_WORKER_LOCK_KEY.toString()]
      );
      lockAcquired = lockRes.rows[0]?.acquired ?? false;
      if (!lockAcquired) return;

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
              // §6.1: AUCTION_ACTIVE → LOCK_TRADING (settlement window open)
              await tx.update(ewrsTable).set({ state: "LOCK_TRADING" }).where(eq(ewrsTable.id, auction.ewrId));
              await tx.insert(auditLogTable).values(
                auditEntry("AUCTION", auction.id, "AUCTION_CLOSED", null,
                  { auctionId: auction.id, winningBidId: winBid.id, winnerAmountUsd: parseFloat(winBid.amountUsd), closedAt: now.toISOString() },
                  { settlementDeadlineAt: settlementDeadlineAt.toISOString(), ewrState: "LOCK_TRADING" }
                )
              );
            } else {
              // No valid winner → cancel; restore eWR to ENCUMBERED if lien is still active
              const [ewrData] = await tx.select({ isLienActive: ewrsTable.isLienActive }).from(ewrsTable).where(eq(ewrsTable.id, auction.ewrId)).limit(1);
              const restoreState = ewrData?.isLienActive ? "ENCUMBERED" : "INGESTED";
              await tx.update(auctionsTable)
                .set({ status: "CANCELLED", winningBidId: null })
                .where(eq(auctionsTable.id, auction.id));
              await tx.update(ewrsTable).set({ state: restoreState }).where(eq(ewrsTable.id, auction.ewrId));
              await tx.insert(auditLogTable).values(
                auditEntry("AUCTION", auction.id, "AUCTION_CANCELLED", null,
                  { auctionId: auction.id, reason: "reserve_not_met", restoredEwrState: restoreState },
                  { reservePriceUsd: auction.reservePriceUsd, topBidUsd: winBid ? parseFloat(winBid.amountUsd) : null }
                )
              );
            }
          } else {
            // No bids → cancel; restore eWR to ENCUMBERED if lien is still active
            const [ewrData] = await tx.select({ isLienActive: ewrsTable.isLienActive }).from(ewrsTable).where(eq(ewrsTable.id, auction.ewrId)).limit(1);
            const restoreState = ewrData?.isLienActive ? "ENCUMBERED" : "INGESTED";
            await tx.update(auctionsTable)
              .set({ status: "CANCELLED" })
              .where(eq(auctionsTable.id, auction.id));
            await tx.update(ewrsTable).set({ state: restoreState }).where(eq(ewrsTable.id, auction.ewrId));
            await tx.insert(auditLogTable).values(
              auditEntry("AUCTION", auction.id, "AUCTION_CANCELLED", null,
                { auctionId: auction.id, reason: "no_bids", restoredEwrState: restoreState },
                { reservePriceUsd: auction.reservePriceUsd }
              )
            );
          }
        });

        // Publish closed event via pg NOTIFY so all server instances fan-out to their local SSE clients
        await publishAuctionEvent({ type: "closed", auctionId: auction.id, data: { auctionId: auction.id } });
      }

      // ── Phase 2: CLOSED auctions past settlement deadline without a settlement record ──
      // The split-settlement engine is the ONLY path to SETTLED status for auctions.
      // If the deadline passes and no settlement record was created, cancel the auction
      // so the eWR is unlocked and the asset can be re-listed or auctioned.
      const closedAuctions = await db
        .select()
        .from(auctionsTable)
        .where(eq(auctionsTable.status, "CLOSED"));

      for (const auction of closedAuctions) {
        if (!auction.settlementDeadlineAt || auction.settlementDeadlineAt > now) continue;

        // Check if a settlement record already exists for this auction
        const [existingSettlement] = await db
          .select({ id: settlementsTable.id })
          .from(settlementsTable)
          .where(and(eq(settlementsTable.entityType, "AUCTION"), eq(settlementsTable.entityId, auction.id)))
          .limit(1);

        if (existingSettlement) continue; // Settlement initiated — split engine takes it from here

        // No settlement initiated before deadline — cancel and release the eWR
        await db.transaction(async (tx) => {
          const affected = await tx
            .update(auctionsTable)
            .set({ status: "CANCELLED" })
            .where(
              sql`${auctionsTable.id} = ${auction.id}
                  AND ${auctionsTable.status} = 'CLOSED'
                  AND ${auctionsTable.settlementDeadlineAt} <= ${now.toISOString()}`
            )
            .returning({ id: auctionsTable.id });

          if (affected.length === 0) return;

          const [ewrData] = await tx.select({ isLienActive: ewrsTable.isLienActive })
            .from(ewrsTable).where(eq(ewrsTable.id, auction.ewrId)).limit(1);
          await tx.update(ewrsTable)
            .set({ state: ewrData?.isLienActive ? "ENCUMBERED" : "INGESTED" })
            .where(eq(ewrsTable.id, auction.ewrId));
        });
      }
    } catch (err) {
      console.error("[AuctionExpiryWorker] Error:", err);
    } finally {
      // Release the advisory lock on the same physical connection that acquired
      // it, then return that connection to the pool.
      if (lockClient) {
        if (lockAcquired) {
          try {
            const unlockRes = await lockClient.query<{ released: boolean }>(
              "SELECT pg_advisory_unlock($1) AS released",
              [EXPIRY_WORKER_LOCK_KEY.toString()]
            );
            if (!unlockRes.rows[0]?.released) {
              console.warn("[AuctionExpiryWorker] pg_advisory_unlock returned false — possible session mismatch");
            }
          } catch (unlockErr) {
            console.error("[AuctionExpiryWorker] Failed to release advisory lock:", unlockErr);
          }
        }
        lockClient.release();
      }
    }
  }, 15_000);
}

export default router;
