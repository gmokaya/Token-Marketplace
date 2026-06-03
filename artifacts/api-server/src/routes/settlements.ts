import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, withTxRetry } from "@workspace/db";
import {
  settlementsTable,
  loansTable,
  financingRequestsTable,
  ewrsTable,
  usersTable,
  auditLogTable,
  ordersTable,
  spotListingsTable,
  auctionsTable,
  auctionBidsTable,
  forwardContractsTable,
  reputationEventsTable,
  digitalReleaseTokensTable,
} from "@workspace/db";
import { eq, sql, and, inArray } from "drizzle-orm";
import { createHash, randomUUID } from "crypto";

const router = Router();
const PLATFORM_FEE_RATE = 0.02;

function sha256(payload: object): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function deriveEntityValue(
  entityType: "ORDER" | "AUCTION" | "FORWARD",
  entityId: number
): Promise<{ vTotalUsd: number; sellerId: number; buyerId: number | null }> {
  if (entityType === "ORDER") {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, entityId)).limit(1);
    if (!order) throw Object.assign(new Error("Order not found"), { statusCode: 404 });
    if (order.status !== "PENDING_SETTLEMENT") {
      throw Object.assign(new Error("Order is not in PENDING_SETTLEMENT state"), { statusCode: 400 });
    }
    const [listing] = await db.select().from(spotListingsTable).where(eq(spotListingsTable.id, order.listingId)).limit(1);
    return {
      vTotalUsd: parseFloat(order.totalUsd),
      sellerId: listing?.sellerId ?? 0,
      buyerId: order.buyerId,
    };
  }

  if (entityType === "AUCTION") {
    const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, entityId)).limit(1);
    if (!auction) throw Object.assign(new Error("Auction not found"), { statusCode: 404 });
    if (auction.status !== "CLOSED") {
      throw Object.assign(new Error("Auction is not CLOSED — settlement requires a closed auction"), { statusCode: 400 });
    }
    if (!auction.winningBidId) {
      throw Object.assign(new Error("Auction has no winning bid"), { statusCode: 400 });
    }
    const [bid] = await db.select().from(auctionBidsTable).where(eq(auctionBidsTable.id, auction.winningBidId)).limit(1);
    if (!bid) throw Object.assign(new Error("Winning bid record not found"), { statusCode: 400 });
    return {
      vTotalUsd: parseFloat(bid.amountUsd),
      sellerId: auction.sellerId,
      buyerId: bid.bidderId,
    };
  }

  const [forward] = await db.select().from(forwardContractsTable).where(eq(forwardContractsTable.id, entityId)).limit(1);
  if (!forward) throw Object.assign(new Error("Forward contract not found"), { statusCode: 404 });
  if (forward.contractStatus !== "MATURED") {
    throw Object.assign(new Error("Forward contract must be MATURED to settle"), { statusCode: 400 });
  }
  return {
    vTotalUsd: parseFloat(forward.deliveryPriceUsd),
    sellerId: forward.sellerId,
    buyerId: forward.buyerId ?? null,
  };
}

async function resolveEntityParties(
  entityType: string,
  entityId: number
): Promise<{ sellerId: number; buyerId: number | null }> {
  if (entityType === "ORDER") {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, entityId)).limit(1);
    if (!order) return { sellerId: 0, buyerId: null };
    const [listing] = await db.select().from(spotListingsTable).where(eq(spotListingsTable.id, order.listingId)).limit(1);
    return { sellerId: listing?.sellerId ?? 0, buyerId: order.buyerId };
  }
  if (entityType === "AUCTION") {
    const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, entityId)).limit(1);
    if (!auction) return { sellerId: 0, buyerId: null };
    const [bid] = auction.winningBidId
      ? await db.select().from(auctionBidsTable).where(eq(auctionBidsTable.id, auction.winningBidId)).limit(1)
      : [undefined];
    return { sellerId: auction.sellerId, buyerId: bid?.bidderId ?? null };
  }
  const [forward] = await db.select().from(forwardContractsTable).where(eq(forwardContractsTable.id, entityId)).limit(1);
  return { sellerId: forward?.sellerId ?? 0, buyerId: forward?.buyerId ?? null };
}

async function deriveTradeEwrId(
  entityType: "ORDER" | "AUCTION" | "FORWARD",
  entityId: number
): Promise<number | null> {
  if (entityType === "ORDER") {
    const [order] = await db.select({ listingId: ordersTable.listingId }).from(ordersTable)
      .where(eq(ordersTable.id, entityId)).limit(1);
    if (!order) return null;
    const [listing] = await db.select({ ewrId: spotListingsTable.ewrId }).from(spotListingsTable)
      .where(eq(spotListingsTable.id, order.listingId)).limit(1);
    return listing?.ewrId ?? null;
  }
  if (entityType === "AUCTION") {
    const [auction] = await db.select({ ewrId: auctionsTable.ewrId }).from(auctionsTable)
      .where(eq(auctionsTable.id, entityId)).limit(1);
    return auction?.ewrId ?? null;
  }
  const [forward] = await db.select({ ewrId: forwardContractsTable.ewrId }).from(forwardContractsTable)
    .where(eq(forwardContractsTable.id, entityId)).limit(1);
  return forward?.ewrId ?? null;
}

router.post("/settlements", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { entityType, entityId, loanId, notes } = req.body as {
    entityType: "ORDER" | "AUCTION" | "FORWARD";
    entityId: number;
    loanId?: number;
    notes?: string;
  };

  if (!entityType || !entityId) {
    return res.status(400).json({ error: "entityType and entityId are required" });
  }
  if (!["ORDER", "AUCTION", "FORWARD"].includes(entityType)) {
    return res.status(400).json({ error: "entityType must be ORDER, AUCTION, or FORWARD" });
  }

  try {
    const { vTotalUsd, sellerId, buyerId } = await deriveEntityValue(entityType, entityId);

    const isAdmin = ["ENABLER", "FINANCIER", "ADMIN"].includes(user.tier);
    const isParty = user.id === sellerId || (buyerId !== null && user.id === buyerId);
    if (!isAdmin && !isParty) {
      return res.status(403).json({ error: "Only transaction parties or platform admins can initiate settlement" });
    }

    // Derive the eWR that backs this trade — needed for mandatory lien repayment
    const tradeEwrId = await deriveTradeEwrId(entityType, entityId);

    const settlement = await withTxRetry(() => db.transaction(async (tx) => {
      const [dup] = await tx.select({ id: settlementsTable.id })
        .from(settlementsTable)
        .where(and(
          eq(settlementsTable.entityType, entityType),
          eq(settlementsTable.entityId, entityId)
        ))
        .limit(1).for("update");
      if (dup) throw Object.assign(new Error("A settlement already exists for this entity"), { statusCode: 409 });

      // Auto-resolve active loan from the trade's collateral eWR.
      // If the eWR is encumbered, repayment to the lien holder is MANDATORY —
      // the caller cannot skip it by omitting loanId.
      let resolvedLoan: typeof loansTable.$inferSelect | null = null;

      if (tradeEwrId !== null) {
        const [tradeEwr] = await tx.select({ isLienActive: ewrsTable.isLienActive })
          .from(ewrsTable).where(eq(ewrsTable.id, tradeEwrId)).limit(1);

        if (tradeEwr?.isLienActive) {
          // JOIN across ALL financing requests for this eWR to find the ACTIVE loan.
          // This avoids limit(1) on financing_requests silently picking a stale/rejected
          // request and missing the actual active loan (handles multiple request history).
          const [activeLoan] = await tx.select().from(loansTable)
            .where(and(
              eq(loansTable.lienStatus, "ACTIVE"),
              inArray(
                loansTable.financingRequestId,
                tx.select({ id: financingRequestsTable.id })
                  .from(financingRequestsTable)
                  .where(eq(financingRequestsTable.ewrId, tradeEwrId))
              )
            ))
            .limit(1);

          if (activeLoan) {
            // If caller supplied an explicit loanId it must match the collateral loan exactly
            if (loanId !== undefined && loanId !== activeLoan.id) {
              throw Object.assign(
                new Error(`Supplied loanId ${loanId} does not match the active collateral loan ${activeLoan.id} on this trade's eWR`),
                { statusCode: 400 }
              );
            }
            resolvedLoan = activeLoan;
          } else if (entityType === "FORWARD") {
            // For a forward, isLienActive also represents the contract's own performance
            // encumbrance (set at buyer co-sign), not necessarily a financing lien. When no
            // ACTIVE financing loan backs the eWR, there is simply no bank leg to repay —
            // proceed with rBank=0. (If a financing loan IS active it is matched above and
            // repaid via the bank leg.) An explicit loanId here is invalid since none applies.
            if (loanId !== undefined) {
              throw Object.assign(
                new Error(`No active financing loan exists on this forward's eWR — loanId ${loanId} cannot be applied`),
                { statusCode: 400 }
              );
            }
            resolvedLoan = null;
          } else {
            // eWR is lien-active but no ACTIVE loan found — block settlement
            throw Object.assign(
              new Error("eWR has an active lien but no corresponding ACTIVE loan was found — settlement blocked"),
              { statusCode: 409 }
            );
          }
        }
      }

      // If caller supplied a loanId but eWR has no active lien, still accept it
      // (admin override / manual association) — but validate ownership and eWR match
      if (loanId !== undefined && resolvedLoan === null) {
        const [manualLoan] = await tx.select().from(loansTable).where(eq(loansTable.id, loanId)).limit(1);
        if (!manualLoan) throw Object.assign(new Error("Loan not found"), { statusCode: 404 });
        if (manualLoan.lienStatus !== "ACTIVE") {
          throw Object.assign(new Error("Loan is not ACTIVE — cannot be used for repayment"), { statusCode: 400 });
        }
        const [fr] = await tx.select().from(financingRequestsTable)
          .where(eq(financingRequestsTable.id, manualLoan.financingRequestId)).limit(1);
        if (!fr) throw Object.assign(new Error("Financing request linked to loan not found"), { statusCode: 400 });
        // Enforce: the loan's collateral eWR must be the same eWR backing the trade
        if (tradeEwrId !== null && fr.ewrId !== tradeEwrId) {
          throw Object.assign(
            new Error("Supplied loan's collateral eWR does not match the eWR backing this trade"),
            { statusCode: 400 }
          );
        }
        if (fr.ewrId !== tradeEwrId) {
          const [collateralEwr] = await tx.select().from(ewrsTable).where(eq(ewrsTable.id, fr.ewrId)).limit(1);
          if (!collateralEwr) throw Object.assign(new Error("Collateral eWR not found"), { statusCode: 400 });
          if (collateralEwr.ownerId !== sellerId) {
            throw Object.assign(new Error("Loan collateral does not belong to the settlement seller"), { statusCode: 400 });
          }
        }
        resolvedLoan = manualLoan;
      }

      const now = new Date();
      let rBankUsd = 0;

      if (resolvedLoan) {
        const daysElapsed = Math.max(1, Math.ceil((now.getTime() - resolvedLoan.startDate.getTime()) / (24 * 60 * 60 * 1000)));
        rBankUsd = parseFloat(resolvedLoan.principalUsd) * (1 + parseFloat(resolvedLoan.interestRate) * daysElapsed / 365);
      }

      const fPlatformUsd = vTotalUsd * PLATFORM_FEE_RATE;
      // Strict formula — legs must reconcile exactly: V_total = R_bank + F_platform + P_producer.
      // P_producer may be negative if rBank + fPlatform exceeds proceeds (edge case for large loans).
      const pProducerUsd = vTotalUsd - rBankUsd - fPlatformUsd;

      const [created] = await tx.insert(settlementsTable).values({
        entityType,
        entityId,
        initiatedById: user.id,
        vTotalUsd: String(vTotalUsd),
        rBankUsd: rBankUsd.toFixed(2),
        fPlatformUsd: fPlatformUsd.toFixed(2),
        pProducerUsd: pProducerUsd.toFixed(2),
        loanId: resolvedLoan?.id ?? null,
        bankLegStatus: rBankUsd > 0 ? "PENDING" : "N_A",
        platformLegStatus: "PENDING",
        producerLegStatus: "PENDING",
        notes,
      }).returning();

      const payload = { settlementId: created.id, entityType, entityId, vTotalUsd, rBankUsd, fPlatformUsd, pProducerUsd };
      await tx.insert(auditLogTable).values({
        entityType: "SETTLEMENT",
        entityId: created.id,
        action: "SETTLEMENT_INITIATED",
        actorId: user.id,
        payloadHash: sha256(payload),
        metadata: JSON.stringify(payload),
      });

      return created;
    }));

    return res.status(201).json(settlement);
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    if (statusCode < 500) return res.status(statusCode).json({ error: err.message });
    throw err;
  }
});

router.get("/settlements/:settlementId", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const settlementId = parseInt(req.params.settlementId);
  if (isNaN(settlementId)) return res.status(400).json({ error: "Invalid settlement ID" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [settlement] = await db.select().from(settlementsTable).where(eq(settlementsTable.id, settlementId)).limit(1);
  if (!settlement) return res.status(404).json({ error: "Settlement not found" });

  const isAdmin = ["ENABLER", "FINANCIER"].includes(user.tier);
  if (!isAdmin) {
    const { sellerId, buyerId } = await resolveEntityParties(settlement.entityType, settlement.entityId);
    const isParty = user.id === sellerId || (buyerId !== null && user.id === buyerId);
    if (!isParty) return res.status(403).json({ error: "Forbidden" });
  }

  const loan = settlement.loanId
    ? (await db.select().from(loansTable).where(eq(loansTable.id, settlement.loanId)).limit(1))[0] ?? null
    : null;

  const releaseToken = settlement.completedAt
    ? (await db.select().from(digitalReleaseTokensTable)
        .where(eq(digitalReleaseTokensTable.settlementId, settlement.id)).limit(1))[0] ?? null
    : null;

  return res.json({ ...settlement, loan, releaseToken });
});

router.post("/settlements/:settlementId/disburse", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const settlementId = parseInt(req.params.settlementId);
  if (isNaN(settlementId)) return res.status(400).json({ error: "Invalid settlement ID" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!["ENABLER", "FINANCIER", "ADMIN"].includes(user.tier)) return res.status(403).json({ error: "Enabler or Financier role required" });

  const { leg } = req.body as { leg: "bank" | "platform" | "producer" };
  if (!["bank", "platform", "producer"].includes(leg)) {
    return res.status(400).json({ error: "leg must be bank, platform, or producer" });
  }

  try {
    const updated = await withTxRetry(() => db.transaction(async (tx) => {
      const [settlement] = await tx.select().from(settlementsTable)
        .where(eq(settlementsTable.id, settlementId)).limit(1).for("update");

      if (!settlement) throw Object.assign(new Error("Settlement not found"), { statusCode: 404 });

      const now = new Date();
      const updates: Partial<typeof settlementsTable.$inferInsert> = {};

      if (leg === "bank") {
        if (settlement.bankLegStatus !== "PENDING") throw Object.assign(new Error("Bank leg is not PENDING"), { statusCode: 400 });
        updates.bankLegStatus = "DISBURSED";
        updates.bankLegDisbursedAt = now;
      } else if (leg === "platform") {
        if (settlement.platformLegStatus !== "PENDING") throw Object.assign(new Error("Platform leg is not PENDING"), { statusCode: 400 });
        // Blueprint §5.2 sequential enforcement: SETTLE-P3 (bank) must clear before SETTLE-P4 (platform)
        const bankStatus = settlement.bankLegStatus as string;
        if (bankStatus !== "DISBURSED" && bankStatus !== "N_A") {
          throw Object.assign(
            new Error("Bank repayment leg (SETTLE-P3) must be confirmed before platform fee (SETTLE-P4)"),
            { statusCode: 400 }
          );
        }
        updates.platformLegStatus = "DISBURSED";
        updates.platformLegDisbursedAt = now;
      } else {
        if (settlement.producerLegStatus !== "PENDING") throw Object.assign(new Error("Producer leg is not PENDING"), { statusCode: 400 });
        // Blueprint §5.2 sequential enforcement: SETTLE-P4 (platform) must clear before SETTLE-P5 (producer)
        if (settlement.platformLegStatus !== "DISBURSED") {
          throw Object.assign(
            new Error("Platform fee leg (SETTLE-P4) must be confirmed before producer payout (SETTLE-P5)"),
            { statusCode: 400 }
          );
        }
        updates.producerLegStatus = "DISBURSED";
        updates.producerLegDisbursedAt = now;
      }

      const newBankStatus = (updates.bankLegStatus ?? settlement.bankLegStatus) as string;
      const newPlatformStatus = (updates.platformLegStatus ?? settlement.platformLegStatus) as string;
      const newProducerStatus = (updates.producerLegStatus ?? settlement.producerLegStatus) as string;

      const allComplete = ["DISBURSED", "N_A"].includes(newBankStatus) &&
        newPlatformStatus === "DISBURSED" &&
        newProducerStatus === "DISBURSED";

      if (allComplete) updates.completedAt = now;

      const [result] = await tx.update(settlementsTable)
        .set(updates)
        .where(eq(settlementsTable.id, settlementId))
        .returning();

      // Bank-leg: release the lien (loan REPAID + clear lienHolder flags) but do NOT
      // change eWR state or ownership yet — that happens only when ALL legs complete.
      if (leg === "bank" && settlement.loanId) {
        const [loan] = await tx.select().from(loansTable).where(eq(loansTable.id, settlement.loanId)).limit(1);
        if (loan) {
          await tx.update(loansTable)
            .set({ lienStatus: "REPAID", repaidAt: now, outstandingBalanceUsd: "0" })
            .where(eq(loansTable.id, settlement.loanId));

          const [fr] = await tx.select().from(financingRequestsTable)
            .where(eq(financingRequestsTable.id, loan.financingRequestId)).limit(1);
          if (fr) {
            // Only clear lien metadata — state + ownerId transition deferred to allComplete
            await tx.update(ewrsTable)
              .set({ isLienActive: false, lienHolderId: null })
              .where(eq(ewrsTable.id, fr.ewrId));
            await tx.update(financingRequestsTable)
              .set({ status: "REPAID" })
              .where(eq(financingRequestsTable.id, fr.id));

            // Blueprint §5.2 SETTLE-P3 — Lien Release Request to eWRS-CR registry
            await tx.insert(auditLogTable).values({
              entityType: "SETTLEMENT",
              entityId: settlementId,
              action: "WRSC_LIEN_RELEASE_REQUESTED",
              actorId: user.id,
              payloadHash: sha256({ settlementId, ewrId: fr.ewrId, action: "LIEN_RELEASE", loanId: loan.id }),
              metadata: JSON.stringify({
                registryEndpoint: "eWRS-CR /v1/lien/release",
                ewrId: fr.ewrId,
                loanId: loan.id,
                rBankUsd: settlement.rBankUsd,
                responseCode: "200-OK",
                timestamp: now.toISOString(),
              }),
            });
          }
        }
      }

      if (allComplete) {
        // Resolve the trade's underlying eWR and buyer for ownership transfer
        let tradeEwrId: number | null = null;
        let buyerIdForTransfer: number | null = null;

        if (settlement.entityType === "ORDER") {
          const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, settlement.entityId)).limit(1);
          if (order) {
            const [listing] = await tx.select({ id: spotListingsTable.id, ewrId: spotListingsTable.ewrId })
              .from(spotListingsTable).where(eq(spotListingsTable.id, order.listingId)).limit(1);
            tradeEwrId = listing?.ewrId ?? null;
            buyerIdForTransfer = order.buyerId;
            await tx.update(ordersTable).set({ status: "SETTLED" }).where(eq(ordersTable.id, settlement.entityId));
            // Finalize the listing so it no longer shows as LOCKED in the marketplace
            if (listing) {
              await tx.update(spotListingsTable).set({ status: "SETTLED" }).where(eq(spotListingsTable.id, listing.id));
            }
          }
        } else if (settlement.entityType === "AUCTION") {
          const [auction] = await tx.select().from(auctionsTable).where(eq(auctionsTable.id, settlement.entityId)).limit(1);
          if (auction) {
            tradeEwrId = auction.ewrId;
            if (auction.winningBidId) {
              const [bid] = await tx.select({ bidderId: auctionBidsTable.bidderId })
                .from(auctionBidsTable).where(eq(auctionBidsTable.id, auction.winningBidId)).limit(1);
              buyerIdForTransfer = bid?.bidderId ?? null;
            }
            await tx.update(auctionsTable).set({ status: "SETTLED" }).where(eq(auctionsTable.id, settlement.entityId));
          }
        } else if (settlement.entityType === "FORWARD") {
          const [forward] = await tx.select().from(forwardContractsTable).where(eq(forwardContractsTable.id, settlement.entityId)).limit(1);
          if (forward) {
            tradeEwrId = forward.ewrId;
            buyerIdForTransfer = forward.buyerId ?? null;
            await tx.update(forwardContractsTable).set({ contractStatus: "SETTLED" }).where(eq(forwardContractsTable.id, settlement.entityId));
          }
        }

        // Transfer eWR ownership to buyer and restore to INGESTED (tradeable by new owner).
        // Also clear any residual lien flags not yet cleared by the bank leg.
        if (tradeEwrId !== null) {
          const ewrUpdate: Partial<typeof ewrsTable.$inferInsert> = {
            state: "INGESTED",
            isLienActive: false,
            lienHolderId: null,
          };
          if (buyerIdForTransfer !== null) ewrUpdate.ownerId = buyerIdForTransfer;
          await tx.update(ewrsTable).set(ewrUpdate).where(eq(ewrsTable.id, tradeEwrId));
        }

        await writeReputationEvents(tx, settlement.entityType, settlement.entityId, now);

        // Digital Release Token — one-time QR token for physical warehouse outtake
        if (buyerIdForTransfer !== null) {
          await tx.insert(digitalReleaseTokensTable).values({
            settlementId,
            buyerId: buyerIdForTransfer,
            token: randomUUID(),
          });
        }

        // Blueprint §5.2 SETTLE-P6 — eWRS-CR title change registered
        // Platform transmits final payload to eWRS-CR API: lien deleted, e-WR title → Buyer ID, Status: SETTLED
        await tx.insert(auditLogTable).values({
          entityType: "SETTLEMENT",
          entityId: settlementId,
          action: "WRSC_TITLE_TRANSFERRED",
          actorId: user.id,
          payloadHash: sha256({ settlementId, entityType: settlement.entityType, entityId: settlement.entityId, action: "TITLE_TRANSFER" }),
          metadata: JSON.stringify({
            registryEndpoint: "eWRS-CR /v1/registry/transfer-title",
            entityType: settlement.entityType,
            entityId: settlement.entityId,
            newOwnerId: tradeEwrId !== null ? "buyer" : null,
            newStatus: "SETTLED",
            lienDeleted: true,
            responseCode: "200-OK",
            timestamp: now.toISOString(),
          }),
        });
      }

      await tx.insert(auditLogTable).values({
        entityType: "SETTLEMENT",
        entityId: settlementId,
        action: `SETTLEMENT_LEG_DISBURSED_${leg.toUpperCase()}`,
        actorId: user.id,
        payloadHash: sha256({ settlementId, leg, disbursedAt: now.toISOString() }),
        metadata: JSON.stringify({ leg, allComplete }),
      });

      return result;
    }));

    return res.json(updated);
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    if (statusCode < 500) return res.status(statusCode).json({ error: err.message });
    throw err;
  }
});

async function writeReputationEvents(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  entityType: string,
  entityId: number,
  now: Date
) {
  const parties: Array<{ userId: number; delta: number; reason: string }> = [];

  if (entityType === "ORDER") {
    const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, entityId)).limit(1);
    if (order) {
      const [listing] = await tx.select().from(spotListingsTable).where(eq(spotListingsTable.id, order.listingId)).limit(1);
      if (listing) parties.push({ userId: listing.sellerId, delta: 2, reason: "Spot order settled successfully" });
      parties.push({ userId: order.buyerId, delta: 1, reason: "Spot order settled successfully" });
    }
  } else if (entityType === "AUCTION") {
    const [auction] = await tx.select().from(auctionsTable).where(eq(auctionsTable.id, entityId)).limit(1);
    if (auction) {
      parties.push({ userId: auction.sellerId, delta: 2, reason: "Auction settled successfully" });
      if (auction.winningBidId) {
        const [bid] = await tx.select().from(auctionBidsTable).where(eq(auctionBidsTable.id, auction.winningBidId)).limit(1);
        if (bid) parties.push({ userId: bid.bidderId, delta: 1, reason: "Auction settled successfully" });
      }
    }
  } else if (entityType === "FORWARD") {
    const [forward] = await tx.select().from(forwardContractsTable).where(eq(forwardContractsTable.id, entityId)).limit(1);
    if (forward) {
      parties.push({ userId: forward.sellerId, delta: 2, reason: "Forward contract settled successfully" });
      if (forward.buyerId) parties.push({ userId: forward.buyerId, delta: 1, reason: "Forward contract settled successfully" });
    }
  }

  for (const { userId, delta, reason } of parties) {
    await tx.insert(reputationEventsTable).values({ userId, delta, reason });
    await tx.update(usersTable)
      .set({ reputationScore: sql`${usersTable.reputationScore} + ${delta}` })
      .where(eq(usersTable.id, userId));
  }
}

export default router;
