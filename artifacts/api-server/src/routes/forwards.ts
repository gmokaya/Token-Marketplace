import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  forwardContractsTable,
  contractEventsTable,
  ewrsTable,
  usersTable,
  reputationEventsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();
const BOND_RATE = 0.15;

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
  if (!["INGESTED", "MARKET_LISTED"].includes(ewr.state)) {
    return res.status(400).json({ error: "eWR must be in INGESTED or MARKET_LISTED state" });
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

    await tx.update(ewrsTable).set({ state: "MARKET_LISTED" }).where(eq(ewrsTable.id, ewrId));
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

      await tx.update(ewrsTable).set({ state: "ENCUMBERED", lienHolderId: user.id, isLienActive: true }).where(eq(ewrsTable.id, contract.ewrId));

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

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!["ENABLER", "PRODUCER"].includes(user.tier)) {
    return res.status(403).json({ error: "Only enablers or the seller can trigger default resolution" });
  }

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
      const isMatured = contract.maturityDate <= now;

      if (!isMatured) {
        throw Object.assign(new Error("Contract has not yet reached maturity date"), { statusCode: 400 });
      }

      const [result] = await tx
        .update(forwardContractsTable)
        .set({
          contractStatus: "DEFAULTED",
          buyerBondStatus: "FORFEITED",
        })
        .where(eq(forwardContractsTable.id, contractId))
        .returning();

      await tx.insert(contractEventsTable).values({
        contractId,
        eventType: "DEFAULTED",
        actorId: user.id,
        note: `Buyer defaulted at maturity. Buyer bond forfeited to seller.`,
      });

      if (contract.buyerId) {
        const BOND_PENALTY = 10;
        await tx.insert(reputationEventsTable).values({
          userId: contract.buyerId,
          delta: -BOND_PENALTY,
          reason: `Forward contract #${contractId} default — bond forfeited`,
        });
        await tx.execute(
          sql`UPDATE users SET reputation_score = GREATEST(0, reputation_score - ${BOND_PENALTY}) WHERE id = ${contract.buyerId}`
        );
      }

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

export default router;
