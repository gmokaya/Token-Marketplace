/**
 * Tea Auction Engine routes
 *
 * POST /tea/auctions                       — exchange admin creates a session
 * GET  /tea/auctions                       — list sessions (all authenticated users)
 * GET  /tea/auctions/:id                   — session detail + lot list
 * POST /tea/auctions/:id/lots              — broker submits lots to a SCHEDULED session
 * POST /tea/auctions/:id/start             — admin starts the session (moves first lot to LIVE)
 * POST /tea/lots/:id/bids                  — place a bid (tick-enforced, anti-snipe, bid security)
 * POST /tea/lots/:id/take-out              — broker withdraws a RESERVE_NOT_MET lot
 * POST /tea/lots/:id/accept-below-reserve  — broker accepts below-reserve offer
 * POST /tea/lots/:id/settle                — confirm payment received → ISSUABLE delivery order
 * GET  /tea/lots/:id/settlement            — settlement detail including prompt date
 */

import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { db, withTxRetry } from "@workspace/db";
import {
  teaLotsTable,
  teaAuctionSessionsTable,
  teaLotBidsTable,
  bidSecurityHoldsTable,
  teaLotSettlementsTable,
  usersTable,
  ewrsTable,
} from "@workspace/db";
import { eq, and, sql, lte } from "drizzle-orm";
import { z } from "zod";
import { calcMinBid, DEFAULT_LOT_DURATION_MS, type TickTier } from "../lib/tea-auction-worker";
import { calcPromptDate } from "../lib/prompt-date";
import { broadcastSseEvent } from "./auctions";
import { publishAuctionEvent } from "../lib/pg-pubsub";

const router = Router();

const TEA_PLATFORM_FEE_RATE = 0.005; // 0.5%
const DEFAULT_LOT_DURATION_MINS = Math.round(DEFAULT_LOT_DURATION_MS / 60_000); // 7 minutes

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);
  return user ?? null;
}

// ── POST /tea/auctions — admin creates session ────────────────────────────────

const createSessionSchema = z.object({
  auctionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "auctionDate must be YYYY-MM-DD"),
});

router.post("/tea/auctions", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "ADMIN") {
    return res.status(403).json({ error: "Only exchange admin accounts can create tea auction sessions" });
  }

  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const { auctionDate } = parsed.data;

  const [session] = await db
    .insert(teaAuctionSessionsTable)
    .values({
      createdByBrokerId: user.id,   // stores the admin's user ID
      auctionDate,
      catalogueOrder: [],
      status: "SCHEDULED",
    })
    .returning();

  return res.status(201).json(session);
});

// ── GET /tea/auctions — list sessions ─────────────────────────────────────────

router.get("/tea/auctions", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const statusFilter = req.query.status as string | undefined;

  const sessions = await db
    .select()
    .from(teaAuctionSessionsTable)
    .orderBy(sql`${teaAuctionSessionsTable.auctionDate} DESC`);

  const filtered = statusFilter
    ? sessions.filter((s) => s.status === statusFilter)
    : sessions;

  return res.json(filtered);
});

// ── POST /tea/auctions/:id/lots — broker submits lots to a scheduled session ──

const addLotsSchema = z.object({
  lotIds: z.array(z.number().int().positive()).min(1),
});

router.post("/tea/auctions/:id/lots", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const sessionId = parseInt(req.params.id);
  if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!["ENABLER", "ADMIN"].includes(user.tier)) {
    return res.status(403).json({ error: "Only brokers (ENABLER) can submit lots to auction sessions" });
  }

  const parsed = addLotsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const { lotIds } = parsed.data;

  const [session] = await db
    .select()
    .from(teaAuctionSessionsTable)
    .where(eq(teaAuctionSessionsTable.id, sessionId))
    .limit(1);

  if (!session) return res.status(404).json({ error: "Auction session not found" });
  if (session.status !== "SCHEDULED") {
    return res.status(400).json({ error: `Cannot add lots to a session with status ${session.status}. Session must be SCHEDULED.` });
  }

  // Validate all requested lots
  const lots = await db
    .select()
    .from(teaLotsTable)
    .where(sql`${teaLotsTable.id} = ANY(${lotIds})`);

  if (lots.length !== lotIds.length) {
    return res.status(404).json({ error: "One or more lot IDs not found" });
  }

  const ineligible = lots.filter((l) => !["CATALOGUED", "DISPATCHED"].includes(l.status));
  if (ineligible.length > 0) {
    return res.status(400).json({
      error: "All lots must be CATALOGUED or DISPATCHED to be submitted to a session",
      ineligibleLotIds: ineligible.map((l) => l.id),
    });
  }

  // Brokers may only submit lots where they hold the mandate
  if (user.tier === "ENABLER") {
    const notMyLots = lots.filter((l) => l.brokerId !== user.id);
    if (notMyLots.length > 0) {
      return res.status(403).json({
        error: "You can only submit lots where you are the mandate broker",
        foreignLotIds: notMyLots.map((l) => l.id),
      });
    }
  }

  // Reject lots already assigned to a different session
  const alreadyAssigned = lots.filter((l) => l.sessionId !== null && l.sessionId !== sessionId);
  if (alreadyAssigned.length > 0) {
    return res.status(400).json({
      error: "Some lots are already assigned to another session",
      conflictingLotIds: alreadyAssigned.map((l) => l.id),
    });
  }

  // Merge new lotIds into existing catalogueOrder (deduplicate)
  const existingOrder = (session.catalogueOrder as number[]) ?? [];
  const existingSet = new Set(existingOrder);
  const newOrder = [...existingOrder, ...lotIds.filter((id) => !existingSet.has(id))];

  await db.transaction(async (tx) => {
    await tx
      .update(teaAuctionSessionsTable)
      .set({ catalogueOrder: newOrder, updatedAt: new Date() })
      .where(eq(teaAuctionSessionsTable.id, sessionId));

    await tx
      .update(teaLotsTable)
      .set({ sessionId, updatedAt: new Date() })
      .where(sql`${teaLotsTable.id} = ANY(${lotIds})`);
  });

  const [updated] = await db
    .select()
    .from(teaAuctionSessionsTable)
    .where(eq(teaAuctionSessionsTable.id, sessionId))
    .limit(1);

  return res.status(200).json(updated);
});

// ── GET /tea/auctions/:id — session detail ────────────────────────────────────

router.get("/tea/auctions/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const sessionId = parseInt(req.params.id);
  if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [session] = await db
    .select()
    .from(teaAuctionSessionsTable)
    .where(eq(teaAuctionSessionsTable.id, sessionId))
    .limit(1);

  if (!session) return res.status(404).json({ error: "Tea auction session not found" });

  // Authorization:
  // - ADMIN: always
  // - Any authenticated user: can view SCHEDULED sessions (so brokers can browse and submit lots)
  // - For LIVE/CLOSED sessions: must be the admin who created it, a lot owner/broker, or a bidder
  const isAdmin = user.tier === "ADMIN";

  if (!isAdmin && session.status !== "SCHEDULED") {
    const lotIds = (session.catalogueOrder as number[]) ?? [];
    let permitted = false;

    if (lotIds.length > 0) {
      const relevantLots = await db
        .select({ ownerId: teaLotsTable.ownerId, brokerId: teaLotsTable.brokerId })
        .from(teaLotsTable)
        .where(sql`${teaLotsTable.id} = ANY(${lotIds})`);

      permitted = relevantLots.some((l) => l.ownerId === user.id || l.brokerId === user.id);

      if (!permitted) {
        const [bidRow] = await db
          .select({ id: teaLotBidsTable.id })
          .from(teaLotBidsTable)
          .where(and(eq(teaLotBidsTable.sessionId, sessionId), eq(teaLotBidsTable.bidderId, user.id)))
          .limit(1);
        permitted = !!bidRow;
      }
    }

    if (!permitted) {
      return res.status(403).json({ error: "Access denied" });
    }
  }

  // Fetch lots in catalogue order
  const lotIds = (session.catalogueOrder as number[]) ?? [];
  const lots =
    lotIds.length > 0
      ? await db
          .select()
          .from(teaLotsTable)
          .where(sql`${teaLotsTable.id} = ANY(${lotIds})`)
      : [];

  // Sort by catalogue order
  const lotsById = new Map(lots.map((l) => [l.id, l]));
  const orderedLots = lotIds.map((id) => lotsById.get(id)).filter(Boolean);

  // For each LIVE lot, attach current high bid
  const enrichedLots = await Promise.all(
    orderedLots.map(async (lot) => {
      if (!lot) return lot;
      const [highBid] = await db
        .select({
          amount: sql<number>`MAX(CAST(${teaLotBidsTable.amountUsd} AS NUMERIC))`,
          bidCount: sql<number>`COUNT(${teaLotBidsTable.id})`,
        })
        .from(teaLotBidsTable)
        .where(eq(teaLotBidsTable.lotId, lot.id));

      const now = new Date();
      const secsRemaining =
        lot.status === "LIVE" && lot.auctionEndAt
          ? Math.max(0, (new Date(lot.auctionEndAt).getTime() - now.getTime()) / 1000)
          : null;

      const tickTiers = (lot.tickTiers as TickTier[]) ?? [];
      const currentHigh = highBid?.amount ?? null;
      const minNextBid =
        currentHigh !== null
          ? calcMinBid(currentHigh, tickTiers)
          : lot.reservePriceUsd
          ? parseFloat(lot.reservePriceUsd)
          : null;

      return {
        ...lot,
        currentHighBidUsd: currentHigh,
        bidCount: Number(highBid?.bidCount ?? 0),
        secsRemaining,
        minNextBidUsd: minNextBid,
      };
    })
  );

  const [broker] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, session.createdByBrokerId))
    .limit(1);

  return res.json({ ...session, brokerName: broker?.name ?? null, lots: enrichedLots });
});

// ── POST /tea/auctions/:id/start — start the session ─────────────────────────

router.post("/tea/auctions/:id/start", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const sessionId = parseInt(req.params.id);
  if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid session ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [session] = await db
    .select()
    .from(teaAuctionSessionsTable)
    .where(eq(teaAuctionSessionsTable.id, sessionId))
    .limit(1);

  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status !== "SCHEDULED") {
    return res.status(400).json({ error: `Session is already ${session.status}` });
  }
  if (user.tier !== "ADMIN") {
    return res.status(403).json({ error: "Only exchange admin accounts can start auction sessions" });
  }

  const lotIds = (session.catalogueOrder as number[]) ?? [];
  if (lotIds.length === 0) {
    return res.status(400).json({ error: "Session has no lots" });
  }

  const firstLotId = lotIds[0];
  const now = new Date();

  // Validate durationMins: must be a whole-number integer in [1, 120]
  const rawDuration = (req.body as { durationMins?: unknown }).durationMins;
  let durationMins = DEFAULT_LOT_DURATION_MINS;
  if (rawDuration !== undefined) {
    const numDuration = Number(rawDuration);
    if (!Number.isInteger(numDuration) || numDuration < 1 || numDuration > 120) {
      return res.status(400).json({ error: "durationMins must be a whole number between 1 and 120" });
    }
    durationMins = numDuration;
  }

  const endAt = new Date(now.getTime() + durationMins * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx
      .update(teaAuctionSessionsTable)
      .set({ status: "LIVE", currentLotId: firstLotId, updatedAt: now })
      .where(eq(teaAuctionSessionsTable.id, sessionId));

    await tx
      .update(teaLotsTable)
      .set({
        status: "LIVE",
        auctionStartAt: now,
        auctionEndAt: endAt,
        totalExtensionSecs: 0,
        updatedAt: now,
      })
      .where(eq(teaLotsTable.id, firstLotId));
  });

  const sseData = {
    sessionId,
    lotId: firstLotId,
    status: "LIVE",
    commodity: "TEA",
    auctionEndAt: endAt.toISOString(),
  };
  broadcastSseEvent(sessionId, "tea_lot_live", sseData);
  publishAuctionEvent({ type: "bid", auctionId: sessionId, data: sseData }).catch(() => {});

  return res.json({ sessionId, currentLotId: firstLotId, auctionEndAt: endAt.toISOString() });
});

// ── POST /tea/lots/:id/bids — place a bid ─────────────────────────────────────

const placeBidSchema = z.object({
  amountUsd: z.number().positive(),
});

router.post("/tea/lots/:id/bids", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const lotId = parseInt(req.params.id);
  if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "OFF_TAKER") {
    return res.status(403).json({ error: "Only OFF_TAKER accounts can place bids" });
  }

  const parsed = placeBidSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const { amountUsd } = parsed.data;

  try {
    const result = await withTxRetry(() =>
      db.transaction(async (tx) => {
        await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

        const [lot] = await tx
          .select()
          .from(teaLotsTable)
          .where(eq(teaLotsTable.id, lotId))
          .for("update")
          .limit(1);

        if (!lot) throw Object.assign(new Error("Tea lot not found"), { statusCode: 404 });
        if (lot.status !== "LIVE") {
          throw Object.assign(new Error(`Lot is not LIVE (current status: ${lot.status})`), { statusCode: 400 });
        }

        const now = new Date();
        const endAt = lot.auctionEndAt ? new Date(lot.auctionEndAt) : null;
        if (!endAt || endAt <= now) {
          throw Object.assign(new Error("Lot auction has already ended"), { statusCode: 400 });
        }

        if (lot.ownerId === user.id) {
          throw Object.assign(new Error("Owner cannot bid on their own lot"), { statusCode: 403 });
        }

        // Find current high bid
        const [highBidRow] = await tx
          .select({ maxBid: sql<number>`MAX(CAST(${teaLotBidsTable.amountUsd} AS NUMERIC))` })
          .from(teaLotBidsTable)
          .where(eq(teaLotBidsTable.lotId, lotId));

        const currentHigh = highBidRow?.maxBid ?? null;
        const tickTiers = (lot.tickTiers as TickTier[]) ?? [];
        const floor =
          currentHigh !== null
            ? calcMinBid(currentHigh, tickTiers)
            : lot.reservePriceUsd
            ? parseFloat(lot.reservePriceUsd)
            : 0;

        if (amountUsd < floor) {
          throw Object.assign(
            new Error(
              `Bid must be at least $${floor.toFixed(2)} (${
                currentHigh !== null
                  ? `minimum increment above current high of $${currentHigh.toFixed(2)}`
                  : "reserve price"
              })`
            ),
            { statusCode: 400, minBidUsd: floor }
          );
        }

        // Mark previous winning bid as non-winning
        await tx
          .update(teaLotBidsTable)
          .set({ isWinning: false })
          .where(eq(teaLotBidsTable.lotId, lotId));

        const sessionId = lot.sessionId!;

        const [newBid] = await tx
          .insert(teaLotBidsTable)
          .values({
            lotId,
            sessionId,
            bidderId: user.id,
            amountUsd: String(amountUsd),
            isWinning: true,
          })
          .returning();

        // Bid security hold: lock bid_security_pct × amount
        const bidSecurityPct = lot.bidSecurityPct ? parseFloat(lot.bidSecurityPct) : 0.1;
        const holdAmount = parseFloat((amountUsd * bidSecurityPct).toFixed(2));

        // Release previous hold for this bidder on this lot
        await tx
          .update(bidSecurityHoldsTable)
          .set({ status: "RELEASED", resolvedAt: now })
          .where(
            and(
              eq(bidSecurityHoldsTable.lotId, lotId),
              eq(bidSecurityHoldsTable.bidderId, user.id),
              eq(bidSecurityHoldsTable.status, "HELD"),
            )
          );

        await tx.insert(bidSecurityHoldsTable).values({
          lotId,
          bidId: newBid.id,
          bidderId: user.id,
          amountUsd: String(holdAmount),
          status: "HELD",
        });

        // Also release any previous HELD hold from the displaced winner
        if (currentHigh !== null) {
          const [prevWinner] = await tx
            .select({ bidderId: teaLotBidsTable.bidderId })
            .from(teaLotBidsTable)
            .where(
              and(
                eq(teaLotBidsTable.lotId, lotId),
                eq(teaLotBidsTable.isWinning, false),
              )
            )
            .orderBy(sql`${teaLotBidsTable.placedAt} DESC`)
            .limit(1);

          if (prevWinner && prevWinner.bidderId !== user.id) {
            await tx
              .update(bidSecurityHoldsTable)
              .set({ status: "RELEASED", resolvedAt: now })
              .where(
                and(
                  eq(bidSecurityHoldsTable.lotId, lotId),
                  eq(bidSecurityHoldsTable.bidderId, prevWinner.bidderId),
                  eq(bidSecurityHoldsTable.status, "HELD"),
                )
              );
          }
        }

        // ── Anti-snipe: if bid arrives within windowSecs of endAt, extend ──
        const antiSnipeCfg = (lot.antiSnipeConfig as { windowSecs?: number; extensionSecs?: number; maxExtensionSecs?: number } | null) ?? {};
        const windowSecs = antiSnipeCfg.windowSecs ?? 180;
        const extensionSecs = antiSnipeCfg.extensionSecs ?? 180;
        const maxExtensionSecs = antiSnipeCfg.maxExtensionSecs ?? 1800;

        const msLeft = endAt.getTime() - now.getTime();
        let antiSnipeTriggered = false;
        let newEndAt: Date | null = null;
        let newTotalExtension = lot.totalExtensionSecs ?? 0;

        if (msLeft <= windowSecs * 1000) {
          const remainingExtension = maxExtensionSecs - newTotalExtension;
          const actualExtension = Math.min(extensionSecs, remainingExtension);
          if (actualExtension > 0) {
            antiSnipeTriggered = true;
            newTotalExtension += actualExtension;
            newEndAt = new Date(endAt.getTime() + actualExtension * 1000);

            await tx
              .update(teaLotsTable)
              .set({ auctionEndAt: newEndAt, totalExtensionSecs: newTotalExtension, updatedAt: now })
              .where(eq(teaLotsTable.id, lotId));
          }
        }

        return { bid: newBid, antiSnipeTriggered, newEndAt, sessionId, holdAmount };
      })
    );

    // Broadcast bid event
    const sseData = {
      lotId,
      sessionId: result.sessionId,
      commodity: "TEA",
      bid: {
        id: result.bid.id,
        amountUsd: parseFloat(result.bid.amountUsd),
        bidderId: result.bid.bidderId,
        placedAt: result.bid.placedAt,
      },
      antiSnipeTriggered: result.antiSnipeTriggered,
      newEndAt: result.newEndAt?.toISOString() ?? null,
      bidSecurityHeldUsd: result.holdAmount,
    };

    broadcastSseEvent(result.sessionId, "bid", sseData);
    publishAuctionEvent({
      type: "bid",
      auctionId: result.sessionId,
      data: sseData,
    }).catch(() => {});

    return res.status(201).json({
      bid: { ...result.bid, amountUsd: parseFloat(result.bid.amountUsd) },
      antiSnipeTriggered: result.antiSnipeTriggered,
      newEndAt: result.newEndAt?.toISOString() ?? null,
      bidSecurityHeldUsd: result.holdAmount,
    });
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    if (statusCode < 500) {
      return res.status(statusCode).json({ error: err.message, minBidUsd: err.minBidUsd });
    }
    console.error("[tea-auctions] Bid error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /tea/lots/:id/take-out — broker withdraws RESERVE_NOT_MET lot ────────

router.post("/tea/lots/:id/take-out", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const lotId = parseInt(req.params.id);
  if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [lot] = await db
    .select()
    .from(teaLotsTable)
    .where(eq(teaLotsTable.id, lotId))
    .limit(1);

  if (!lot) return res.status(404).json({ error: "Tea lot not found" });
  if (lot.status !== "RESERVE_NOT_MET") {
    return res.status(400).json({ error: `Lot must be in RESERVE_NOT_MET status (current: ${lot.status})` });
  }
  if (lot.brokerId !== user.id && user.tier !== "ADMIN") {
    return res.status(403).json({ error: "Only the mandate broker or admin can take out this lot" });
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(teaLotsTable)
      .set({ status: "WITHDRAWN", updatedAt: now })
      .where(eq(teaLotsTable.id, lotId));

    // Release all remaining HELD bid-security holds for this lot
    // (winner's hold was kept HELD during RESERVE_NOT_MET; releasing it now that lot is withdrawn)
    await tx
      .update(bidSecurityHoldsTable)
      .set({ status: "RELEASED", resolvedAt: now })
      .where(and(eq(bidSecurityHoldsTable.lotId, lotId), eq(bidSecurityHoldsTable.status, "HELD")));
  });

  const [updated] = await db
    .select()
    .from(teaLotsTable)
    .where(eq(teaLotsTable.id, lotId))
    .limit(1);

  return res.json(updated);
});

// ── POST /tea/lots/:id/accept-below-reserve ───────────────────────────────────

router.post("/tea/lots/:id/accept-below-reserve", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const lotId = parseInt(req.params.id);
  if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [lot] = await db
    .select()
    .from(teaLotsTable)
    .where(eq(teaLotsTable.id, lotId))
    .limit(1);

  if (!lot) return res.status(404).json({ error: "Tea lot not found" });
  if (lot.status !== "RESERVE_NOT_MET") {
    return res.status(400).json({ error: `Lot must be in RESERVE_NOT_MET status (current: ${lot.status})` });
  }
  if (lot.brokerId !== user.id && user.tier !== "ADMIN") {
    return res.status(403).json({ error: "Only the mandate broker or admin can accept below reserve" });
  }

  if (!lot.sessionId) {
    return res.status(400).json({ error: "Lot is not associated with an auction session" });
  }

  // Find the highest bid on this lot
  const [topBid] = await db
    .select()
    .from(teaLotBidsTable)
    .where(and(eq(teaLotBidsTable.lotId, lotId), eq(teaLotBidsTable.isWinning, true)))
    .limit(1);

  if (!topBid) {
    return res.status(400).json({ error: "No bids on this lot to accept" });
  }

  const now = new Date();
  const grossAmount = parseFloat(topBid.amountUsd);
  const commissionRate = lot.commissionRate ? parseFloat(lot.commissionRate) : 0.01;
  const platformFee = parseFloat((grossAmount * TEA_PLATFORM_FEE_RATE).toFixed(2));
  const brokerCommission = parseFloat((grossAmount * commissionRate).toFixed(2));
  const netProducer = parseFloat((grossAmount - platformFee - brokerCommission).toFixed(2));
  const promptDate = calcPromptDate(now);
  const sessionId = lot.sessionId;

  await db.transaction(async (tx) => {
    await tx
      .update(teaLotsTable)
      .set({ status: "SOLD", updatedAt: now })
      .where(eq(teaLotsTable.id, lotId));

    // Transfer eWR ownership
    await tx
      .update(ewrsTable)
      .set({ ownerId: topBid.bidderId, state: "SETTLED" })
      .where(eq(ewrsTable.id, lot.ewrId));

    await tx.insert(teaLotSettlementsTable).values({
      lotId,
      sessionId,
      winningBidId: topBid.id,
      buyerId: topBid.bidderId,
      grossAmountUsd: String(grossAmount),
      platformFeeUsd: String(platformFee),
      brokerCommissionUsd: String(brokerCommission),
      netProducerAmountUsd: String(netProducer),
      promptDate,
      paymentStatus: "PENDING",
      deliveryOrderStatus: "NOT_ISSUABLE",
      acceptedBelowReserve: 1,
    });
  });

  return res.json({
    lotId,
    status: "SOLD",
    acceptedBelowReserve: true,
    grossAmountUsd: grossAmount,
    promptDate,
  });
});

// ── POST /tea/lots/:id/settle — confirm payment, mark delivery order issuable ─

router.post("/tea/lots/:id/settle", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const lotId = parseInt(req.params.id);
  if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "ADMIN") {
    return res.status(403).json({ error: "Only ADMIN accounts can confirm settlement" });
  }

  const [settlement] = await db
    .select()
    .from(teaLotSettlementsTable)
    .where(eq(teaLotSettlementsTable.lotId, lotId))
    .limit(1);

  if (!settlement) return res.status(404).json({ error: "No settlement record found for this lot" });
  if (settlement.paymentStatus !== "PENDING") {
    return res.status(400).json({ error: `Payment is already ${settlement.paymentStatus}` });
  }

  const now = new Date();

  const [updated] = await db
    .update(teaLotSettlementsTable)
    .set({ paymentStatus: "PAID", deliveryOrderStatus: "ISSUABLE", updatedAt: now } as any)
    .where(eq(teaLotSettlementsTable.lotId, lotId))
    .returning();

  // Release winning bidder's bid security hold
  await db
    .update(bidSecurityHoldsTable)
    .set({ status: "RELEASED", resolvedAt: now })
    .where(
      and(
        eq(bidSecurityHoldsTable.lotId, lotId),
        eq(bidSecurityHoldsTable.bidderId, settlement.buyerId),
        eq(bidSecurityHoldsTable.status, "HELD"),
      )
    );

  return res.json(updated);
});

// ── GET /tea/lots/:id/settlement — settlement detail ──────────────────────────

router.get("/tea/lots/:id/settlement", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const lotId = parseInt(req.params.id);
  if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [lot] = await db.select().from(teaLotsTable).where(eq(teaLotsTable.id, lotId)).limit(1);
  if (!lot) return res.status(404).json({ error: "Tea lot not found" });

  const [settlement] = await db
    .select()
    .from(teaLotSettlementsTable)
    .where(eq(teaLotSettlementsTable.lotId, lotId))
    .limit(1);

  if (!settlement) return res.status(404).json({ error: "No settlement record for this lot" });

  // Authorization: ADMIN; lot owner (producer); lot broker; or the winning buyer
  const isAdmin = user.tier === "ADMIN";
  const isOwner = lot.ownerId === user.id;
  const isBroker = lot.brokerId === user.id;
  const isBuyer = settlement.buyerId === user.id;
  if (!isAdmin && !isOwner && !isBroker && !isBuyer) {
    return res.status(403).json({ error: "Access denied" });
  }

  const [buyer] = await db
    .select({ name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, settlement.buyerId))
    .limit(1);

  return res.json({ ...settlement, buyerName: buyer?.name ?? null });
});

export default router;
