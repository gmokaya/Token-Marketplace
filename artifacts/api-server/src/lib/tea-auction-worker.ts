/**
 * Tea Auction Session Worker
 *
 * Polls every 10 seconds. Uses pg_try_advisory_lock(3) for leader election so
 * only one server instance drives state transitions at a time.
 *
 * Responsibilities:
 *   1. Close LIVE lots whose auctionEndAt has passed → SOLD or RESERVE_NOT_MET
 *   2. After closure, advance session to the next catalogue lot (or mark CLOSED)
 *   3. Forfeit bid-security holds when buyer defaults past prompt date
 */

import { db, pool, withTxRetry } from "@workspace/db";
import {
  teaLotsTable,
  teaLotBidsTable,
  teaAuctionSessionsTable,
  teaLotSettlementsTable,
  bidSecurityHoldsTable,
  ewrsTable,
} from "@workspace/db";
import { eq, and, lte, sql, lt } from "drizzle-orm";
import { broadcastSseEvent } from "../routes/auctions";
import { publishAuctionEvent } from "./pg-pubsub";
import { calcPromptDate } from "./prompt-date";

const POLL_INTERVAL_MS = 10_000;
export const DEFAULT_LOT_DURATION_MS = 7 * 60 * 1000; // 7 minutes per lot
const TEA_PLATFORM_FEE_RATE = 0.005; // 0.5%

// ── Tick calculator ───────────────────────────────────────────────────────────

export interface TickTier {
  upToUsd?: number;
  above?: boolean;
  incrementPct: number;
}

/**
 * Given the current high bid and the lot's tick-tier schedule, returns the
 * minimum valid next bid amount.
 *
 * Schedule: ordered [{upToUsd, incrementPct}…] with optional {above:true, incrementPct} tail.
 * If no tiers are provided, falls back to 1.5% increment (generic auction default).
 */
export function calcMinBid(currentHigh: number, tickTiers: TickTier[]): number {
  if (!tickTiers || tickTiers.length === 0) {
    return parseFloat((currentHigh * 1.015).toFixed(2));
  }
  for (const tier of tickTiers) {
    if (tier.above === true || tier.upToUsd === undefined || currentHigh <= tier.upToUsd) {
      return parseFloat((currentHigh * (1 + tier.incrementPct / 100)).toFixed(2));
    }
  }
  const last = tickTiers[tickTiers.length - 1];
  return parseFloat((currentHigh * (1 + last.incrementPct / 100)).toFixed(2));
}

// ── Internal result type so we can broadcast *outside* the transaction ────────

interface CloseResult {
  closeSseData: object;
  closeSseType: string;
  nextLotId: number | null;
  nextEndAt: Date | null;
  sessionClosed: boolean;
}

// ── Lot close state machine ───────────────────────────────────────────────────

async function closeLot(lotId: number, sessionId: number, now: Date): Promise<void> {
  // Perform all DB mutations inside the retryable serializable transaction.
  // Capture SSE data to broadcast AFTER the transaction commits.
  const closeResult = await withTxRetry<CloseResult | null>(() =>
    db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      const [lot] = await tx
        .select()
        .from(teaLotsTable)
        .where(eq(teaLotsTable.id, lotId))
        .for("update")
        .limit(1);

      if (!lot || lot.status !== "LIVE") return null; // already handled

      // Find current winning bid
      const [winningBid] = await tx
        .select()
        .from(teaLotBidsTable)
        .where(and(eq(teaLotBidsTable.lotId, lotId), eq(teaLotBidsTable.isWinning, true)))
        .limit(1);

      const reserve = lot.reservePriceUsd ? parseFloat(lot.reservePriceUsd) : null;
      const winAmount = winningBid ? parseFloat(winningBid.amountUsd) : null;
      const reserveMet = winAmount !== null && (reserve === null || winAmount >= reserve);

      // ── Session catalogue: find the next lot ────────────────────────────────
      const [session] = await tx
        .select()
        .from(teaAuctionSessionsTable)
        .where(eq(teaAuctionSessionsTable.id, sessionId))
        .for("update")
        .limit(1);

      const catalogueOrder = (session?.catalogueOrder as number[]) ?? [];
      const currentIndex = catalogueOrder.indexOf(lotId);
      const nextLotId = currentIndex >= 0 ? (catalogueOrder[currentIndex + 1] ?? null) : null;
      const nextEndAt = nextLotId !== null
        ? new Date(now.getTime() + DEFAULT_LOT_DURATION_MS)
        : null;

      if (!reserveMet) {
        // ── RESERVE_NOT_MET ─────────────────────────────────────────────────
        await tx
          .update(teaLotsTable)
          .set({ status: "RESERVE_NOT_MET", updatedAt: now })
          .where(eq(teaLotsTable.id, lotId));

        // Release only non-winner bid security holds.
        // Winner's hold stays HELD so broker can still accept-below-reserve.
        if (winningBid) {
          await tx
            .update(bidSecurityHoldsTable)
            .set({ status: "RELEASED", resolvedAt: now })
            .where(
              and(
                eq(bidSecurityHoldsTable.lotId, lotId),
                eq(bidSecurityHoldsTable.status, "HELD"),
                sql`${bidSecurityHoldsTable.bidderId} != ${winningBid.bidderId}`,
              )
            );
        } else {
          // No bids at all — release everything
          await tx
            .update(bidSecurityHoldsTable)
            .set({ status: "RELEASED", resolvedAt: now })
            .where(and(eq(bidSecurityHoldsTable.lotId, lotId), eq(bidSecurityHoldsTable.status, "HELD")));
        }
      } else {
        // ── SOLD ─────────────────────────────────────────────────────────────
        const grossAmount = parseFloat(winningBid!.amountUsd);
        const commissionRate = lot.commissionRate ? parseFloat(lot.commissionRate) : 0.01;
        const platformFee = parseFloat((grossAmount * TEA_PLATFORM_FEE_RATE).toFixed(2));
        const brokerCommission = parseFloat((grossAmount * commissionRate).toFixed(2));
        const netProducer = parseFloat((grossAmount - platformFee - brokerCommission).toFixed(2));
        const promptDate = calcPromptDate(now);

        await tx.update(teaLotsTable).set({ status: "SOLD", updatedAt: now }).where(eq(teaLotsTable.id, lotId));

        // Transfer eWR ownership to buyer
        await tx
          .update(ewrsTable)
          .set({ ownerId: winningBid!.bidderId, state: "SETTLED" })
          .where(eq(ewrsTable.id, lot.ewrId));

        // Create settlement
        await tx.insert(teaLotSettlementsTable).values({
          lotId,
          sessionId,
          winningBidId: winningBid!.id,
          buyerId: winningBid!.bidderId,
          grossAmountUsd: String(grossAmount),
          platformFeeUsd: String(platformFee),
          brokerCommissionUsd: String(brokerCommission),
          netProducerAmountUsd: String(netProducer),
          promptDate,
          paymentStatus: "PENDING",
          deliveryOrderStatus: "NOT_ISSUABLE",
          acceptedBelowReserve: 0,
        });

        // Release non-winner holds; winner's hold stays HELD until payment confirmed
        await tx
          .update(bidSecurityHoldsTable)
          .set({ status: "RELEASED", resolvedAt: now })
          .where(
            and(
              eq(bidSecurityHoldsTable.lotId, lotId),
              eq(bidSecurityHoldsTable.status, "HELD"),
              sql`${bidSecurityHoldsTable.bidderId} != ${winningBid!.bidderId}`,
            )
          );
      }

      // ── Advance session ───────────────────────────────────────────────────
      if (nextLotId !== null && nextEndAt !== null) {
        // Promote next lot to LIVE
        await tx
          .update(teaLotsTable)
          .set({
            status: "LIVE",
            auctionStartAt: now,
            auctionEndAt: nextEndAt,
            totalExtensionSecs: 0,
            updatedAt: now,
          })
          .where(eq(teaLotsTable.id, nextLotId));

        await tx
          .update(teaAuctionSessionsTable)
          .set({ currentLotId: nextLotId, updatedAt: now })
          .where(eq(teaAuctionSessionsTable.id, sessionId));
      } else {
        // No more lots — close session
        await tx
          .update(teaAuctionSessionsTable)
          .set({ status: "CLOSED", currentLotId: null, updatedAt: now })
          .where(eq(teaAuctionSessionsTable.id, sessionId));
      }

      return {
        closeSseType: reserveMet ? "closed" : "reserve_not_met",
        closeSseData: reserveMet
          ? {
              lotId,
              status: "SOLD",
              commodity: "TEA",
              sessionId,
              winningBidId: winningBid!.id,
              grossAmountUsd: parseFloat(winningBid!.amountUsd),
              promptDate: calcPromptDate(now),
            }
          : { lotId, status: "RESERVE_NOT_MET", commodity: "TEA", sessionId },
        nextLotId,
        nextEndAt,
        sessionClosed: nextLotId === null,
      };
    })
  );

  if (!closeResult) return;

  // Broadcast lot-closed event
  broadcastSseEvent(sessionId, closeResult.closeSseType, closeResult.closeSseData);
  publishAuctionEvent({
    type: "closed",
    auctionId: sessionId,
    data: closeResult.closeSseData,
  }).catch(() => {});

  // Broadcast next-lot-live or session-closed event
  if (closeResult.nextLotId !== null && closeResult.nextEndAt !== null) {
    const nextLiveSseData = {
      sessionId,
      lotId: closeResult.nextLotId,
      status: "LIVE",
      commodity: "TEA",
      auctionEndAt: closeResult.nextEndAt.toISOString(),
    };
    broadcastSseEvent(sessionId, "tea_lot_live", nextLiveSseData);
    publishAuctionEvent({ type: "bid", auctionId: sessionId, data: nextLiveSseData }).catch(() => {});
  } else if (closeResult.sessionClosed) {
    const sessionClosedData = { sessionId, status: "CLOSED", commodity: "TEA" };
    broadcastSseEvent(sessionId, "session_closed", sessionClosedData);
    publishAuctionEvent({ type: "closed", auctionId: sessionId, data: sessionClosedData }).catch(() => {});
  }
}

// ── Main worker tick ──────────────────────────────────────────────────────────

async function runTeaAuctionWorker(): Promise<void> {
  const now = new Date();

  const { rows: lockRows } = await pool.query("SELECT pg_try_advisory_lock(3) AS acquired");
  const acquired = lockRows[0]?.acquired;
  if (!acquired) return;

  try {
    // Phase 1: Close LIVE lots whose auctionEndAt has passed
    const expiredLots = await db
      .select({ id: teaLotsTable.id, sessionId: teaLotsTable.sessionId })
      .from(teaLotsTable)
      .where(and(eq(teaLotsTable.status, "LIVE"), lte(teaLotsTable.auctionEndAt, now)));

    for (const lot of expiredLots) {
      if (lot.sessionId) {
        await closeLot(lot.id, lot.sessionId, now).catch((err) =>
          console.error(`[TeaWorker] Error closing lot ${lot.id}:`, err)
        );
      }
    }

    // Phase 2: Forfeit bid security for Prompt Date defaults (payment still PENDING, prompt date past)
    const defaultedSettlements = await db
      .select({ lotId: teaLotSettlementsTable.lotId, buyerId: teaLotSettlementsTable.buyerId })
      .from(teaLotSettlementsTable)
      .where(
        and(
          eq(teaLotSettlementsTable.paymentStatus, "PENDING"),
          lt(teaLotSettlementsTable.promptDate, now.toISOString().slice(0, 10)),
        )
      );

    for (const settlement of defaultedSettlements) {
      await db
        .update(bidSecurityHoldsTable)
        .set({ status: "FORFEITED", resolvedAt: now })
        .where(
          and(
            eq(bidSecurityHoldsTable.lotId, settlement.lotId),
            eq(bidSecurityHoldsTable.bidderId, settlement.buyerId),
            eq(bidSecurityHoldsTable.status, "HELD"),
          )
        );

      await db
        .update(teaLotSettlementsTable)
        .set({ paymentStatus: "DEFAULTED" } as any)
        .where(eq(teaLotSettlementsTable.lotId, settlement.lotId));

      // Dock buyer reputation
      await pool.query(
        "UPDATE users SET reputation_score = GREATEST(0, reputation_score - 15) WHERE id = $1",
        [settlement.buyerId]
      );
    }
  } finally {
    await pool.query("SELECT pg_advisory_unlock(3)");
  }
}

export function startTeaAuctionWorker(): void {
  setInterval(() => {
    runTeaAuctionWorker().catch((err) =>
      console.error("[TeaWorker] Unhandled error:", err)
    );
  }, POLL_INTERVAL_MS);
}
