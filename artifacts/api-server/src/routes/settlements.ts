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
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";

const router = Router();
const PLATFORM_FEE_RATE = 0.02;

function sha256(payload: object): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

router.post("/settlements", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { entityType, entityId, vTotalUsd, loanId, notes } = req.body as {
    entityType: "ORDER" | "AUCTION" | "FORWARD";
    entityId: number;
    vTotalUsd: number;
    loanId?: number;
    notes?: string;
  };

  if (!entityType || !entityId || !vTotalUsd) {
    return res.status(400).json({ error: "entityType, entityId, and vTotalUsd are required" });
  }
  if (!["ORDER", "AUCTION", "FORWARD"].includes(entityType)) {
    return res.status(400).json({ error: "entityType must be ORDER, AUCTION, or FORWARD" });
  }

  try {
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
              .set({ isLienActive: false, lienHolderId: null })
              .where(eq(ewrsTable.id, fr.ewrId));
            await tx.update(financingRequestsTable)
              .set({ status: "REPAID" })
              .where(eq(financingRequestsTable.id, fr.id));
          }
        }
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

export default router;
