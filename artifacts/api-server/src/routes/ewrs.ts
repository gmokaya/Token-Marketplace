import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { ewrsTable, usersTable, spotListingsTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";

const router = Router();

router.get("/ewrs/my-portfolio", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const ewrs = await db
    .select({
      id: ewrsTable.id,
      ewrsReceiptId: ewrsTable.ewrsReceiptId,
      wrscSignature: ewrsTable.wrscSignature,
      warehouseCode: ewrsTable.warehouseCode,
      commodityType: ewrsTable.commodityType,
      grade: ewrsTable.grade,
      weightMt: ewrsTable.weightMt,
      moisturePct: ewrsTable.moisturePct,
      harvestSeason: ewrsTable.harvestSeason,
      isLienActive: ewrsTable.isLienActive,
      lienHolderId: ewrsTable.lienHolderId,
      state: ewrsTable.state,
      ownerId: ewrsTable.ownerId,
      ownerName: usersTable.name,
      expiryAt: ewrsTable.expiryAt,
      issuedAt: ewrsTable.issuedAt,
      estimatedValueUsd: ewrsTable.estimatedValueUsd,
    })
    .from(ewrsTable)
    .leftJoin(usersTable, eq(ewrsTable.ownerId, usersTable.id))
    .where(eq(ewrsTable.ownerId, user.id));

  const totalValueUsd = ewrs.reduce((sum, e) => sum + parseFloat(e.estimatedValueUsd ?? "0"), 0);

  const byStateMap = new Map<string, number>();
  const byCommodityMap = new Map<string, { count: number; totalWeightMt: number }>();

  for (const ewr of ewrs) {
    byStateMap.set(ewr.state, (byStateMap.get(ewr.state) ?? 0) + 1);
    const existing = byCommodityMap.get(ewr.commodityType) ?? { count: 0, totalWeightMt: 0 };
    byCommodityMap.set(ewr.commodityType, {
      count: existing.count + 1,
      totalWeightMt: existing.totalWeightMt + parseFloat(ewr.weightMt ?? "0"),
    });
  }

  return res.json({
    ewrs,
    totalValueUsd,
    byState: Array.from(byStateMap.entries()).map(([state, count]) => ({ state, count })),
    byCommodity: Array.from(byCommodityMap.entries()).map(([commodityType, data]) => ({ commodityType, ...data })),
  });
});

router.get("/ewrs", async (req, res) => {
  const { ownerId, state, commodityType } = req.query as {
    ownerId?: string;
    state?: string;
    commodityType?: string;
  };

  const conditions: SQL[] = [];
  if (ownerId) conditions.push(eq(ewrsTable.ownerId, parseInt(ownerId)));
  if (state) conditions.push(eq(ewrsTable.state, state as typeof ewrsTable.$inferSelect["state"]));
  if (commodityType) conditions.push(eq(ewrsTable.commodityType, commodityType as typeof ewrsTable.$inferSelect["commodityType"]));

  const ewrs = await db
    .select({
      id: ewrsTable.id,
      ewrsReceiptId: ewrsTable.ewrsReceiptId,
      wrscSignature: ewrsTable.wrscSignature,
      warehouseCode: ewrsTable.warehouseCode,
      commodityType: ewrsTable.commodityType,
      grade: ewrsTable.grade,
      weightMt: ewrsTable.weightMt,
      moisturePct: ewrsTable.moisturePct,
      harvestSeason: ewrsTable.harvestSeason,
      isLienActive: ewrsTable.isLienActive,
      lienHolderId: ewrsTable.lienHolderId,
      state: ewrsTable.state,
      ownerId: ewrsTable.ownerId,
      ownerName: usersTable.name,
      expiryAt: ewrsTable.expiryAt,
      issuedAt: ewrsTable.issuedAt,
      estimatedValueUsd: ewrsTable.estimatedValueUsd,
    })
    .from(ewrsTable)
    .leftJoin(usersTable, eq(ewrsTable.ownerId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return res.json(ewrs);
});

router.get("/ewrs/:ewrId", async (req, res) => {
  const ewrId = parseInt(req.params.ewrId);
  if (isNaN(ewrId)) return res.status(400).json({ error: "Invalid eWR ID" });

  const [ewr] = await db
    .select({
      id: ewrsTable.id,
      ewrsReceiptId: ewrsTable.ewrsReceiptId,
      wrscSignature: ewrsTable.wrscSignature,
      warehouseCode: ewrsTable.warehouseCode,
      commodityType: ewrsTable.commodityType,
      grade: ewrsTable.grade,
      weightMt: ewrsTable.weightMt,
      moisturePct: ewrsTable.moisturePct,
      harvestSeason: ewrsTable.harvestSeason,
      isLienActive: ewrsTable.isLienActive,
      lienHolderId: ewrsTable.lienHolderId,
      state: ewrsTable.state,
      ownerId: ewrsTable.ownerId,
      ownerName: usersTable.name,
      expiryAt: ewrsTable.expiryAt,
      issuedAt: ewrsTable.issuedAt,
      estimatedValueUsd: ewrsTable.estimatedValueUsd,
    })
    .from(ewrsTable)
    .leftJoin(usersTable, eq(ewrsTable.ownerId, usersTable.id))
    .where(eq(ewrsTable.id, ewrId))
    .limit(1);

  if (!ewr) return res.status(404).json({ error: "eWR not found" });
  return res.json(ewr);
});

export default router;
