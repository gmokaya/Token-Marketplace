import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
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
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createHash } from "crypto";

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

  // entityType === "FORWARD"
  const [forward] = await db.select().from(forwardContractsTable).where(eq(forwardContractsTable.id, entityId)).limit(1);
  if (!forward) throw Object.assign(new Error("Forward contract not found"), { statusCode: 404 });
  if (!["ACTIVE", "MATURED"].includes(forward.contractStatus)) {
    throw Object.assign(new Error("Forward contract must be ACTIVE or MATURED to settle"), { statusCode: 400 });
  }
  return {
    vTotalUsd: parseFloat(forward.deliveryPriceUsd),
    sellerId: forward.sellerId,
    buyerId: forward.buyerId ?? null,
  };
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
    const { vTotalUsd } = await deriveEntityValue(entityType, entityId);

    const settlement = await db.transaction(async (tx) => {
      let loan: typeof loansTable.$inferSelect | null = null;
      if (loanId) {
        [loan] = await tx.select().from(loansTable).where(eq(loansTable.id, loanId)).limit(1);
        if (!loan) throw Object.assign(new Error("Loan not found"), { statusCode: 404 });
      }

      const now = new Date();
      let rBankUsd = 0;

      if (loan && loan.lienStatus === "ACTIVE") {
        const daysElapsed = Math.max(1, Math.ceil((now.getTime() - loan.startDate.getTime()) / (24 * 60 * 60 * 1000)));
        rBankUsd = parseFloat(loan.principalUsd) * (1 + parseFloat(loan.interestRate) * daysElapsed / 365);
        rBankUsd = Math.min(rBankUsd, vTotalUsd * 0.90);
      }

      const fPlatformUsd = vTotalUsd * PLATFORM_FEE_RATE;
      const pProducerUsd = Math.max(0, vTotalUsd - rBankUsd - fPlatformUsd);

      const [created] = await tx.insert(settlementsTable).values({
        entityType,
        entityId,
        initiatedById: user.id,
        vTotalUsd: String(vTotalUsd),
        rBankUsd: rBankUsd.toFixed(2),
        fPlatformUsd: fPlatformUsd.toFixed(2),
        pProducerUsd: pProducerUsd.toFixed(2),
        loanId: loan?.id ?? null,
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
    });

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

  const [settlement] = await db.select().from(settlementsTable).where(eq(settlementsTable.id, settlementId)).limit(1);
  if (!settlement) return res.status(404).json({ error: "Settlement not found" });

  const loan = settlement.loanId
    ? (await db.select().from(loansTable).where(eq(loansTable.id, settlement.loanId)).limit(1))[0] ?? null
    : null;

  return res.json({ ...settlement, loan });
});

router.post("/settlements/:settlementId/disburse", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const settlementId = parseInt(req.params.settlementId);
  if (isNaN(settlementId)) return res.status(400).json({ error: "Invalid settlement ID" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!["ENABLER", "FINANCIER"].includes(user.tier)) return res.status(403).json({ error: "Enabler or Financier role required" });

  const { leg } = req.body as { leg: "bank" | "platform" | "producer" };
  if (!["bank", "platform", "producer"].includes(leg)) {
    return res.status(400).json({ error: "leg must be bank, platform, or producer" });
  }

  try {
    const updated = await db.transaction(async (tx) => {
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
        updates.platformLegStatus = "DISBURSED";
        updates.platformLegDisbursedAt = now;
      } else {
        if (settlement.producerLegStatus !== "PENDING") throw Object.assign(new Error("Producer leg is not PENDING"), { statusCode: 400 });
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

      if (leg === "bank" && settlement.loanId) {
        const [loan] = await tx.select().from(loansTable).where(eq(loansTable.id, settlement.loanId)).limit(1);
        if (loan) {
          await tx.update(loansTable)
            .set({ lienStatus: "REPAID", repaidAt: now, outstandingBalanceUsd: "0" })
            .where(eq(loansTable.id, settlement.loanId));

          const [fr] = await tx.select().from(financingRequestsTable)
            .where(eq(financingRequestsTable.id, loan.financingRequestId)).limit(1);
          if (fr) {
            await tx.update(ewrsTable)
              .set({ isLienActive: false, lienHolderId: null, state: "INGESTED" })
              .where(eq(ewrsTable.id, fr.ewrId));
            await tx.update(financingRequestsTable)
              .set({ status: "REPAID" })
              .where(eq(financingRequestsTable.id, fr.id));
          }
        }
      }

      if (allComplete) {
        await writeReputationEvents(tx, settlement.entityType, settlement.entityId, now);
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
    });

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
