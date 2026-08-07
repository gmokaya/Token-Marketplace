/**
 * Coffee Auction Engine routes
 *
 * POST /coffee/auctions                       — exchange admin creates a session
 * GET  /coffee/auctions                       — list sessions (all authenticated users)
 * GET  /coffee/auctions/:id                   — session detail + lot list
 * POST /coffee/auctions/:id/lots              — broker submits coffee lots to a SCHEDULED session
 * POST /coffee/auctions/:id/start             — admin starts the session
 * POST /coffee/lots/:id/bids                  — place a bid on a LIVE coffee lot
 * POST /coffee/lots/:id/take-out              — broker withdraws a RESERVE_NOT_MET coffee lot
 * POST /coffee/lots/:id/accept-below-reserve  — broker accepts below-reserve offer
 * POST /coffee/lots/:id/settle                — confirm payment received
 * GET  /coffee/lots/:id/settlement            — settlement detail
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

const COFFEE_PLATFORM_FEE_RATE = 0.005; // 0.5%
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

/** Verify a lot is backed by a COFFEE eWR */
async function isCoffeeLot(lotId: number): Promise<boolean> {
  const [row] = await db
    .select({ commodityType: ewrsTable.commodityType })
    .from(teaLotsTable)
    .innerJoin(ewrsTable, eq(ewrsTable.id, teaLotsTable.ewrId))
    .where(eq(teaLotsTable.id, lotId))
    .limit(1);
  return row?.commodityType === "COFFEE";
}

// ── POST /coffee/auctions — admin creates session ─────────────────────────────

const createSessionSchema = z.object({
  auctionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "auctionDate must be YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be HH:MM").optional(),
});

router.post("/coffee/auctions", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "ADMIN") {
    return res.status(403).json({ error: "Only exchange admin accounts can create coffee auction sessions" });
  }

  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const { auctionDate, startTime } = parsed.data;

  const [session] = await db
    .insert(teaAuctionSessionsTable)
    .values({
      createdByBrokerId: user.id,
      auctionDate,
      scheduledStartTime: startTime ?? null,
      catalogueOrder: [],
      status: "SCHEDULED",
    })
    .returning();

  return res.status(201).json(session);
});

// ── GET /coffee/auctions — list sessions ──────────────────────────────────────

router.get("/coffee/auctions", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const statusFilter = req.query.status as string | undefined;

  const sessions = await db
    .select()
    .from(teaAuctionSessionsTable)
    .orderBy(sql`${teaAuctionSessionsTable.auctionDate} DESC`);

  // Filter to sessions that contain only COFFEE lots (or are SCHEDULED with no lots yet)
  const coffeeSessions = await Promise.all(
    sessions.map(async (session) => {
      const lotIds = (session.catalogueOrder as number[]) ?? [];
      if (lotIds.length === 0) return session; // include empty SCHEDULED sessions
      // Check if any lot is a COFFEE lot
      const [coffeeCheck] = await db
        .select({ id: teaLotsTable.id })
        .from(teaLotsTable)
        .innerJoin(ewrsTable, eq(ewrsTable.id, teaLotsTable.ewrId))
        .where(and(
          sql`${teaLotsTable.id} = ANY(${lotIds})`,
          eq(ewrsTable.commodityType, "COFFEE"),
        ))
        .limit(1);
      return coffeeCheck ? session : null;
    })
  );

  const filtered = coffeeSessions.filter(Boolean);
  const withStatusFilter = statusFilter
    ? filtered.filter((s) => s!.status === statusFilter)
    : filtered;

  return res.json(withStatusFilter);
});

// ── POST /coffee/auctions/:id/lots — broker submits coffee lots to session ────

const addLotsSchema = z.object({
  lotIds: z.array(z.number().int().positive()).min(1),
});

router.post("/coffee/auctions/:id/lots", async (req, res) => {
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
    .select({ lot: teaLotsTable, commodityType: ewrsTable.commodityType })
    .from(teaLotsTable)
    .innerJoin(ewrsTable, eq(ewrsTable.id, teaLotsTable.ewrId))
    .where(sql`${teaLotsTable.id} = ANY(${lotIds})`);

  if (lots.length !== lotIds.length) {
    return res.status(404).json({ error: "One or more lot IDs not found" });
  }

  // Ensure all lots are COFFEE lots
  const nonCoffeeLots = lots.filter((l) => l.commodityType !== "COFFEE");
  if (nonCoffeeLots.length > 0) {
    return res.status(400).json({
      error: "All lots must be COFFEE commodity lots for a coffee auction session",
      nonCoffeeLotIds: nonCoffeeLots.map((l) => l.lot.id),
    });
  }

  const ineligible = lots.filter((l) => !["CATALOGUED", "DISPATCHED"].includes(l.lot.status));
  if (ineligible.length > 0) {
    return res.status(400).json({
      error: "All lots must be CATALOGUED or DISPATCHED to be submitted to a session",
      ineligibleLotIds: ineligible.map((l) => l.lot.id),
    });
  }

  // Brokers may only submit lots where they hold the mandate
  if (user.tier === "ENABLER") {
    const notMyLots = lots.filter((l) => l.lot.brokerId !== user.id);
    if (notMyLots.length > 0) {
      return res.status(403).json({
        error: "You can only submit lots where you are the mandate broker",
        foreignLotIds: notMyLots.map((l) => l.lot.id),
      });
    }
  }

  // Reject lots already assigned to a different session
  const alreadyAssigned = lots.filter((l) => l.lot.sessionId !== null && l.lot.sessionId !== sessionId);
  if (alreadyAssigned.length > 0) {
    return res.status(400).json({
      error: "Some lots are already assigned to another session",
      conflictingLotIds: alreadyAssigned.map((l) => l.lot.id),
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

// ── GET /coffee/auctions/:id — session detail ─────────────────────────────────

router.get("/coffee/auctions/:id", async (req, res) => {
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

  if (!session) return res.status(404).json({ error: "Coffee auction session not found" });

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

// ── POST /coffee/auctions/:id/start — start the session ──────────────────────

router.post("/coffee/auctions/:id/start", async (req, res) => {
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
    commodity: "COFFEE",
    auctionEndAt: endAt.toISOString(),
  };
  broadcastSseEvent(sessionId, "coffee_lot_live", sseData);
  publishAuctionEvent({ type: "bid", auctionId: sessionId, data: sseData }).catch(() => {});

  return res.json({ sessionId, currentLotId: firstLotId, auctionEndAt: endAt.toISOString() });
});

// ── POST /coffee/lots/:id/bids — place a bid ──────────────────────────────────

const placeBidSchema = z.object({
  amountUsd: z.number().positive(),
});

router.post("/coffee/lots/:id/bids", async (req, res) => {
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

        const [lotRow] = await tx
          .select({ lot: teaLotsTable, commodityType: ewrsTable.commodityType })
          .from(teaLotsTable)
          .innerJoin(ewrsTable, eq(ewrsTable.id, teaLotsTable.ewrId))
          .where(eq(teaLotsTable.id, lotId))
          .for("update")
          .limit(1);

        if (!lotRow) throw Object.assign(new Error("Coffee lot not found"), { statusCode: 404 });
        if (lotRow.commodityType !== "COFFEE") throw Object.assign(new Error("Coffee lot not found"), { statusCode: 404 });

        const lot = lotRow.lot;

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

        const bidSecurityPct = lot.bidSecurityPct ? parseFloat(lot.bidSecurityPct) : 0.1;
        const holdAmount = parseFloat((amountUsd * bidSecurityPct).toFixed(2));

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

        // Anti-snipe
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

    const sseData = {
      lotId,
      sessionId: result.sessionId,
      commodity: "COFFEE",
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
    console.error("[coffee-auctions] Bid error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /coffee/lots/:id/take-out ────────────────────────────────────────────

router.post("/coffee/lots/:id/take-out", async (req, res) => {
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

  if (!lot) return res.status(404).json({ error: "Coffee lot not found" });
  if (!(await isCoffeeLot(lotId))) return res.status(404).json({ error: "Coffee lot not found" });

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

// ── POST /coffee/lots/:id/accept-below-reserve ────────────────────────────────

router.post("/coffee/lots/:id/accept-below-reserve", async (req, res) => {
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

  if (!lot) return res.status(404).json({ error: "Coffee lot not found" });
  if (!(await isCoffeeLot(lotId))) return res.status(404).json({ error: "Coffee lot not found" });

  if (lot.status !== "RESERVE_NOT_MET") {
    return res.status(400).json({ error: `Lot must be in RESERVE_NOT_MET status (current: ${lot.status})` });
  }
  if (lot.brokerId !== user.id && user.tier !== "ADMIN") {
    return res.status(403).json({ error: "Only the mandate broker or admin can accept below reserve" });
  }

  if (!lot.sessionId) {
    return res.status(400).json({ error: "Lot is not associated with an auction session" });
  }

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
  const platformFee = parseFloat((grossAmount * COFFEE_PLATFORM_FEE_RATE).toFixed(2));
  const brokerCommission = parseFloat((grossAmount * commissionRate).toFixed(2));
  const netProducer = parseFloat((grossAmount - platformFee - brokerCommission).toFixed(2));
  const promptDate = calcPromptDate(now);
  const sessionId = lot.sessionId;

  await db.transaction(async (tx) => {
    await tx
      .update(teaLotsTable)
      .set({ status: "SOLD", updatedAt: now })
      .where(eq(teaLotsTable.id, lotId));

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

// ── POST /coffee/lots/:id/settle ──────────────────────────────────────────────

router.post("/coffee/lots/:id/settle", async (req, res) => {
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

// ── GET /coffee/lots/:id/settlement ──────────────────────────────────────────

router.get("/coffee/lots/:id/settlement", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const lotId = parseInt(req.params.id);
  if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [lot] = await db.select().from(teaLotsTable).where(eq(teaLotsTable.id, lotId)).limit(1);
  if (!lot) return res.status(404).json({ error: "Coffee lot not found" });

  const [settlement] = await db
    .select()
    .from(teaLotSettlementsTable)
    .where(eq(teaLotSettlementsTable.lotId, lotId))
    .limit(1);

  if (!settlement) return res.status(404).json({ error: "No settlement record for this lot" });

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
