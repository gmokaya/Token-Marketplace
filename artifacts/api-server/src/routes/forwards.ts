import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  forwardContractsTable,
  contractEventsTable,
  ewrsTable,
  usersTable,
  reputationEventsTable,
  auditLogTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { sha256, auditEntry } from "../lib/audit";

const router = Router();
const BOND_RATE = 0.15;
const BOND_PENALTY = 10;

async function enrichContract(contract: typeof forwardContractsTable.$inferSelect) {
  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, contract.sellerId)).limit(1);
  const buyer = contract.buyerId
    ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, contract.buyerId)).limit(1).then(r => r[0])
    : null;
  const [ewr] = await db.select({
    commodityType: ewrsTable.commodityType,
    grade: ewrsTable.grade,
    weightMt: ewrsTable.weightMt,
    warehouseCode: ewrsTable.warehouseCode,
  }).from(ewrsTable).where(eq(ewrsTable.id, contract.ewrId)).limit(1);

  return {
    ...contract,
    sellerName: seller?.name ?? null,
    buyerName: buyer?.name ?? null,
    commodityType: ewr?.commodityType ?? null,
    grade: ewr?.grade ?? null,
    weightMt: ewr?.weightMt ?? null,
    warehouseCode: ewr?.warehouseCode ?? null,
  };
}

router.get("/forwards", async (req, res) => {
  const { status, sellerId, buyerId } = req.query as {
    status?: string;
    sellerId?: string;
    buyerId?: string;
  };

  const conditions = [];
  if (status) conditions.push(eq(forwardContractsTable.contractStatus, status as typeof forwardContractsTable.$inferSelect["contractStatus"]));
  if (sellerId) conditions.push(eq(forwardContractsTable.sellerId, parseInt(sellerId)));
  if (buyerId) conditions.push(eq(forwardContractsTable.buyerId, parseInt(buyerId)));

  const contracts = await db
    .select()
    .from(forwardContractsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const enriched = await Promise.all(contracts.map(enrichContract));
  return res.json(enriched);
});

router.post("/forwards", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "PRODUCER") return res.status(403).json({ error: "Only producers can create forward contracts" });

  const { ewrId, maturityDate, deliveryPriceUsd } = req.body as {
    ewrId: number;
    maturityDate: string;
    deliveryPriceUsd: number;
  };

  if (!ewrId || !maturityDate || !deliveryPriceUsd) {
    return res.status(400).json({ error: "ewrId, maturityDate, and deliveryPriceUsd are required" });
  }

  const [ewr] = await db.select().from(ewrsTable).where(eq(ewrsTable.id, ewrId)).limit(1);
  if (!ewr) return res.status(404).json({ error: "eWR not found" });
  if (ewr.ownerId !== user.id) return res.status(403).json({ error: "You do not own this eWR" });
  if (!["INGESTED", "ENCUMBERED"].includes(ewr.state)) {
    return res.status(400).json({ error: "eWR must be in INGESTED or ENCUMBERED state to create a forward contract" });
  }

  const maturity = new Date(maturityDate);
  if (isNaN(maturity.getTime()) || maturity <= new Date()) {
    return res.status(400).json({ error: "maturityDate must be a valid future date" });
  }

  const performanceBondUsd = deliveryPriceUsd * BOND_RATE;

  const contract = await db.transaction(async (tx) => {
    const [created] = await tx.insert(forwardContractsTable).values({
      ewrId,
      sellerId: user.id,
      maturityDate: maturity,
      deliveryPriceUsd: String(deliveryPriceUsd),
      performanceBondUsd: String(performanceBondUsd),
    }).returning();

    await tx.insert(contractEventsTable).values({
      contractId: created.id,
      eventType: "CREATED",
      actorId: user.id,
      note: `Forward contract created. Delivery: $${deliveryPriceUsd}, Bond: $${performanceBondUsd.toFixed(2)}`,
    });

    // §6.1: INGESTED/ENCUMBERED → FORWARD_BOUND (asset reserved under pending forward)
    await tx.update(ewrsTable).set({ state: "FORWARD_BOUND" }).where(eq(ewrsTable.id, ewrId));

    await tx.insert(auditLogTable).values(
      auditEntry("FORWARD", created.id, "FORWARD_CREATED", user.id,
        { contractId: created.id, ewrId, sellerId: user.id, deliveryPriceUsd, maturityDate: maturity.toISOString() },
        { deliveryPriceUsd, performanceBondUsd, maturityDate }
      )
    );
    return created;
  });

  const enriched = await enrichContract(contract);
  return res.status(201).json(enriched);
});

router.get("/forwards/:contractId", async (req, res) => {
  const contractId = parseInt(req.params.contractId);
  if (isNaN(contractId)) return res.status(400).json({ error: "Invalid contract ID" });

  const [contract] = await db.select().from(forwardContractsTable).where(eq(forwardContractsTable.id, contractId)).limit(1);
  if (!contract) return res.status(404).json({ error: "Forward contract not found" });

  const enriched = await enrichContract(contract);
  return res.json(enriched);
});

router.post("/forwards/:contractId/co-sign", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const contractId = parseInt(req.params.contractId);
  if (isNaN(contractId)) return res.status(400).json({ error: "Invalid contract ID" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "OFF_TAKER") return res.status(403).json({ error: "Only off-takers can co-sign forward contracts" });

  try {
    const updated = await db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      const [contract] = await tx
        .select()
        .from(forwardContractsTable)
        .where(eq(forwardContractsTable.id, contractId))
        .limit(1)
        .for("update");

      if (!contract) throw Object.assign(new Error("Contract not found"), { statusCode: 404 });
      if (contract.contractStatus !== "PENDING_SIGNATURE") {
        throw Object.assign(new Error("Contract is not pending signature"), { statusCode: 400 });
      }
      if (contract.sellerId === user.id) {
        throw Object.assign(new Error("Seller cannot co-sign their own contract"), { statusCode: 400 });
      }

      const [signed] = await tx
        .update(forwardContractsTable)
        .set({
          buyerId: user.id,
          contractStatus: "ACTIVE",
          sellerBondStatus: "ACTIVE",
          buyerBondStatus: "ACTIVE",
          signedAt: new Date(),
        })
        .where(eq(forwardContractsTable.id, contractId))
        .returning();

      await tx.insert(contractEventsTable).values({
        contractId,
        eventType: "CO_SIGNED",
        actorId: user.id,
        note: `Contract co-signed by buyer. Both performance bonds of $${parseFloat(contract.performanceBondUsd).toFixed(2)} activated.`,
      });

      await tx.insert(contractEventsTable).values({
        contractId,
        eventType: "BOND_POSTED",
        actorId: user.id,
        note: `Buyer bond ACTIVE. Seller bond ACTIVE. Total secured: $${(2 * parseFloat(contract.performanceBondUsd)).toFixed(2)}`,
      });

      // §6.1: FORWARD_BOUND → ENCUMBERED (buyer co-signs, lien activates)
      await tx.update(ewrsTable)
        .set({ state: "ENCUMBERED", lienHolderId: user.id, isLienActive: true })
        .where(eq(ewrsTable.id, contract.ewrId));

      await tx.insert(auditLogTable).values(
        auditEntry("FORWARD", contractId, "FORWARD_CO_SIGNED", user.id,
          { contractId, buyerId: user.id, sellerId: contract.sellerId, ewrId: contract.ewrId },
          { performanceBondUsd: contract.performanceBondUsd, deliveryPriceUsd: contract.deliveryPriceUsd }
        )
      );
      await tx.insert(auditLogTable).values(
        auditEntry("FORWARD", contractId, "FORWARD_BOND_POSTED", user.id,
          { contractId, totalBondUsd: 2 * parseFloat(contract.performanceBondUsd) },
          { sellerBond: "ACTIVE", buyerBond: "ACTIVE" }
        )
      );

      return signed;
    });

    const enriched = await enrichContract(updated);
    return res.json(enriched);
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    if (statusCode < 500) return res.status(statusCode).json({ error: err.message });
    throw err;
  }
});

router.post("/forwards/:contractId/resolve-default", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const contractId = parseInt(req.params.contractId);
  if (isNaN(contractId)) return res.status(400).json({ error: "Invalid contract ID" });

  const { defaultSide } = req.body as { defaultSide?: "BUYER" | "SELLER" };
  const side = defaultSide ?? "BUYER";
  if (!["BUYER", "SELLER"].includes(side)) {
    return res.status(400).json({ error: "defaultSide must be BUYER or SELLER" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    const updated = await db.transaction(async (tx) => {
      const [contract] = await tx
        .select()
        .from(forwardContractsTable)
        .where(eq(forwardContractsTable.id, contractId))
        .limit(1)
        .for("update");

      if (!contract) throw Object.assign(new Error("Contract not found"), { statusCode: 404 });
      if (contract.contractStatus !== "ACTIVE") {
        throw Object.assign(new Error("Contract must be ACTIVE to resolve default"), { statusCode: 400 });
      }

      const now = new Date();
      if (contract.maturityDate > now) {
        throw Object.assign(new Error("Contract has not yet reached maturity date"), { statusCode: 400 });
      }

      // Authorization: ENABLER can trigger either side; seller can trigger BUYER default; buyer can trigger SELLER default
      const isSeller = contract.sellerId === user.id;
      const isBuyer = contract.buyerId === user.id;
      const isEnabler = user.tier === "ENABLER";

      if (!isEnabler && side === "BUYER" && !isSeller) {
        throw Object.assign(new Error("Only the seller or an enabler can trigger a buyer default"), { statusCode: 403 });
      }
      if (!isEnabler && side === "SELLER" && !isBuyer) {
        throw Object.assign(new Error("Only the buyer or an enabler can trigger a seller default"), { statusCode: 403 });
      }
      if (!isEnabler && !isSeller && !isBuyer) {
        throw Object.assign(new Error("Only a contract party or enabler can resolve a default"), { statusCode: 403 });
      }

      let updates: Partial<typeof forwardContractsTable.$inferInsert>;
      let penaltyUserId: number | null = null;
      let note: string;

      if (side === "BUYER") {
        // Buyer failed to perform → buyer bond forfeited to seller
        updates = { contractStatus: "DEFAULTED", buyerBondStatus: "FORFEITED", sellerBondStatus: "RELEASED" };
        penaltyUserId = contract.buyerId;
        note = `Buyer defaulted at maturity. Buyer bond ($${parseFloat(contract.performanceBondUsd).toFixed(2)}) forfeited to seller.`;
      } else {
        // Seller breached encumbrance → seller bond forfeited to buyer
        updates = { contractStatus: "DEFAULTED", sellerBondStatus: "FORFEITED", buyerBondStatus: "RELEASED" };
        penaltyUserId = contract.sellerId;
        note = `Seller breached contract at maturity. Seller bond ($${parseFloat(contract.performanceBondUsd).toFixed(2)}) forfeited to buyer.`;
      }

      const [result] = await tx
        .update(forwardContractsTable)
        .set(updates)
        .where(eq(forwardContractsTable.id, contractId))
        .returning();

      await tx.insert(contractEventsTable).values({
        contractId,
        eventType: "DEFAULTED",
        actorId: user.id,
        note,
      });

      await tx.insert(auditLogTable).values(
        auditEntry("FORWARD", contractId, "FORWARD_DEFAULTED", user.id,
          { contractId, defaultSide: side, penaltyUserId, bondForfeitedUsd: parseFloat(contract.performanceBondUsd) },
          { note }
        )
      );

      if (penaltyUserId) {
        await tx.insert(reputationEventsTable).values({
          userId: penaltyUserId,
          delta: -BOND_PENALTY,
          reason: `Forward contract #${contractId} default (${side} side) — bond forfeited`,
        });
        await tx.execute(
          sql`UPDATE users SET reputation_score = GREATEST(0, reputation_score - ${BOND_PENALTY}) WHERE id = ${penaltyUserId}`
        );
      }

      // Release eWR back to seller
      await tx.update(ewrsTable)
        .set({ state: "INGESTED", isLienActive: false, lienHolderId: null })
        .where(eq(ewrsTable.id, contract.ewrId));

      return result;
    });

    const enriched = await enrichContract(updated);
    return res.json(enriched);
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    if (statusCode < 500) return res.status(statusCode).json({ error: err.message });
    throw err;
  }
});

router.post("/forwards/:contractId/complete", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const contractId = parseInt(req.params.contractId);
  if (isNaN(contractId)) return res.status(400).json({ error: "Invalid contract ID" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    const updated = await db.transaction(async (tx) => {
      const [contract] = await tx
        .select()
        .from(forwardContractsTable)
        .where(eq(forwardContractsTable.id, contractId))
        .limit(1)
        .for("update");

      if (!contract) throw Object.assign(new Error("Contract not found"), { statusCode: 404 });
      if (contract.contractStatus !== "ACTIVE") {
        throw Object.assign(new Error("Contract must be ACTIVE to complete"), { statusCode: 400 });
      }

      const now = new Date();
      if (contract.maturityDate > now) {
        throw Object.assign(new Error("Contract has not yet reached maturity date"), { statusCode: 400 });
      }

      const isSeller = contract.sellerId === user.id;
      const isBuyer = contract.buyerId === user.id;
      const isEnabler = user.tier === "ENABLER";
      if (!isSeller && !isBuyer && !isEnabler) {
        throw Object.assign(new Error("Only a contract party or enabler can complete a contract"), { statusCode: 403 });
      }

      const [result] = await tx
        .update(forwardContractsTable)
        .set({
          contractStatus: "MATURED",
          sellerBondStatus: "RELEASED",
          buyerBondStatus: "RELEASED",
        })
        .where(eq(forwardContractsTable.id, contractId))
        .returning();

      await tx.insert(contractEventsTable).values({
        contractId,
        eventType: "MATURED",
        actorId: user.id,
        note: `Contract completed at maturity. Both performance bonds released.`,
      });

      await tx.insert(auditLogTable).values(
        auditEntry("FORWARD", contractId, "FORWARD_MATURED", user.id,
          { contractId, ewrId: contract.ewrId, deliveryPriceUsd: contract.deliveryPriceUsd },
          { sellerBond: "RELEASED", buyerBond: "RELEASED" }
        )
      );

      // Release eWR encumbrance — ownership transfer happens off-chain
      await tx.update(ewrsTable)
        .set({ state: "SETTLED", isLienActive: false, lienHolderId: null })
        .where(eq(ewrsTable.id, contract.ewrId));

      return result;
    });

    const enriched = await enrichContract(updated);
    return res.json(enriched);
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    if (statusCode < 500) return res.status(statusCode).json({ error: err.message });
    throw err;
  }
});

export function startForwardMaturityWorker() {
  setInterval(async () => {
    try {
      const now = new Date();
      const activeContracts = await db
        .select()
        .from(forwardContractsTable)
        .where(eq(forwardContractsTable.contractStatus, "ACTIVE"));

      for (const contract of activeContracts) {
        if (contract.maturityDate > now) continue;

        await db.transaction(async (tx) => {
          const affected = await tx
            .update(forwardContractsTable)
            .set({
              contractStatus: "MATURED",
              sellerBondStatus: "RELEASED",
              buyerBondStatus: "RELEASED",
            })
            .where(
              sql`${forwardContractsTable.id} = ${contract.id}
                  AND ${forwardContractsTable.contractStatus} = 'ACTIVE'
                  AND ${forwardContractsTable.maturityDate} <= ${now.toISOString()}`
            )
            .returning({ id: forwardContractsTable.id });

          if (affected.length === 0) return;

          await tx.insert(contractEventsTable).values({
            contractId: contract.id,
            eventType: "MATURED",
            actorId: null,
            note: `Contract auto-matured by system at maturity date. Both bonds released. Settlement can now proceed.`,
          });

          await tx.update(ewrsTable)
            .set({ state: "SETTLED", isLienActive: false, lienHolderId: null })
            .where(eq(ewrsTable.id, contract.ewrId));
        });

        console.log(`[ForwardMaturityWorker] Auto-matured contract #${contract.id}`);
      }
    } catch (err) {
      console.error("[ForwardMaturityWorker] Error:", err);
    }
  }, 60_000);
}

export default router;
