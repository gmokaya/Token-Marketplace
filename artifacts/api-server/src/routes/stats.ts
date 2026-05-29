import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { ewrsTable, spotListingsTable, ordersTable, usersTable } from "@workspace/db";
import { eq, sql, count, avg, lt, and } from "drizzle-orm";
import { auctionsTable, auctionBidsTable } from "@workspace/db";

const router = Router();

router.get("/stats/market-summary", async (_req, res) => {
  const [totalActive] = await db
    .select({ count: count() })
    .from(spotListingsTable)
    .where(eq(spotListingsTable.status, "ACTIVE"));

  const [totalEwrs] = await db.select({ count: count() }).from(ewrsTable);

  const [totalIngested] = await db
    .select({ count: count() })
    .from(ewrsTable)
    .where(eq(ewrsTable.state, "INGESTED"));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [settledToday] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(
      sql`${ordersTable.status} = 'SETTLED' AND ${ordersTable.settledAt} >= ${today.toISOString()}`
    );

  const [volumeResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(CAST(${ordersTable.totalUsd} as NUMERIC)), 0)` })
    .from(ordersTable)
    .where(eq(ordersTable.status, "SETTLED"));

  const [avgPrice] = await db
    .select({ avg: avg(spotListingsTable.pricePerMt) })
    .from(spotListingsTable)
    .where(eq(spotListingsTable.status, "ACTIVE"));

  return res.json({
    totalActiveListings: totalActive.count,
    totalEwrsIngested: totalIngested.count,
    totalEwrs: totalEwrs.count,
    totalSettledToday: settledToday.count,
    totalVolumeUsd: Number(volumeResult.total) || 0,
    avgPricePerMt: avgPrice.avg ? Number(avgPrice.avg) : null,
  });
});

router.get("/stats/commodity-breakdown", async (_req, res) => {
  const rows = await db
    .select({
      commodityType: ewrsTable.commodityType,
      totalEwrs: count(ewrsTable.id),
      totalWeightMt: sql<number>`COALESCE(SUM(CAST(${ewrsTable.weightMt} as NUMERIC)), 0)`,
    })
    .from(ewrsTable)
    .groupBy(ewrsTable.commodityType);

  const listingRows = await db
    .select({
      commodityType: ewrsTable.commodityType,
      activeListings: count(spotListingsTable.id),
      avgPricePerMt: avg(spotListingsTable.pricePerMt),
    })
    .from(spotListingsTable)
    .leftJoin(ewrsTable, eq(spotListingsTable.ewrId, ewrsTable.id))
    .where(eq(spotListingsTable.status, "ACTIVE"))
    .groupBy(ewrsTable.commodityType);

  const listingMap = new Map(listingRows.map((r) => [r.commodityType, r]));

  const result = rows.map((row) => {
    const listing = listingMap.get(row.commodityType);
    return {
      commodityType: row.commodityType,
      activeListings: listing?.activeListings ?? 0,
      totalEwrs: row.totalEwrs,
      totalWeightMt: Number(row.totalWeightMt),
      avgPricePerMt: listing?.avgPricePerMt ? Number(listing.avgPricePerMt) : null,
    };
  });

  return res.json(result);
});

router.get("/stats/recent-activity", async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? "10"), 50);

  const recentOrders = await db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      totalUsd: ordersTable.totalUsd,
      createdAt: ordersTable.createdAt,
      settledAt: ordersTable.settledAt,
      commodityType: ewrsTable.commodityType,
    })
    .from(ordersTable)
    .leftJoin(spotListingsTable, eq(ordersTable.listingId, spotListingsTable.id))
    .leftJoin(ewrsTable, eq(spotListingsTable.ewrId, ewrsTable.id))
    .orderBy(sql`${ordersTable.createdAt} DESC`)
    .limit(limit);

  const activities = recentOrders.map((order) => {
    const type = order.status === "SETTLED" ? "ORDER_SETTLED" : "ORDER_EXECUTED";
    const description =
      type === "ORDER_SETTLED"
        ? `${order.commodityType ?? "Commodity"} order settled for $${Number(order.totalUsd).toLocaleString()}`
        : `Buy order placed for ${order.commodityType ?? "commodity"}`;

    return {
      id: order.id,
      type,
      description,
      commodityType: order.commodityType ?? null,
      valueUsd: order.totalUsd ? Number(order.totalUsd) : null,
      createdAt: (order.status === "SETTLED" && order.settledAt ? order.settledAt : order.createdAt).toISOString(),
    };
  });

  return res.json(activities);
});

router.get("/stats/market-risk", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [caller] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!caller) return res.status(404).json({ error: "User not found" });

  const myEncumberedEwrs = await db
    .select({
      id: ewrsTable.id,
      ewrsReceiptId: ewrsTable.ewrsReceiptId,
      commodityType: ewrsTable.commodityType,
      grade: ewrsTable.grade,
      weightMt: ewrsTable.weightMt,
      warehouseCode: ewrsTable.warehouseCode,
      estimatedValueUsd: ewrsTable.estimatedValueUsd,
      ownerId: ewrsTable.ownerId,
      ownerName: usersTable.name,
      issuedAt: ewrsTable.issuedAt,
    })
    .from(ewrsTable)
    .leftJoin(usersTable, eq(ewrsTable.ownerId, usersTable.id))
    .where(and(eq(ewrsTable.state, "ENCUMBERED"), eq(ewrsTable.lienHolderId, caller.id)));

  const totalLienValueUsd = myEncumberedEwrs.reduce(
    (sum, e) => sum + parseFloat(e.estimatedValueUsd ?? "0"),
    0
  );

  const [pendingResult] = await db
    .select({
      count: count(),
      totalUsd: sql<number>`COALESCE(SUM(CAST(${ordersTable.totalUsd} as NUMERIC)), 0)`,
    })
    .from(ordersTable)
    .where(eq(ordersTable.status, "PENDING_SETTLEMENT"));

  const now = new Date();
  const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
  const [expiringSoon] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(
      sql`${ordersTable.status} = 'PENDING_SETTLEMENT' AND ${ordersTable.expiresAt} <= ${in1Hour.toISOString()}`
    );

  const [atRiskBuyers] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(and(eq(usersTable.tier, "OFF_TAKER"), lt(usersTable.reputationScore, 70)));

  return res.json({
    myEncumberedEwrs,
    totalLienValueUsd,
    myLienCount: myEncumberedEwrs.length,
    pendingSettlementCount: pendingResult.count,
    pendingSettlementValueUsd: Number(pendingResult.totalUsd) || 0,
    expiringSoonCount: expiringSoon.count,
    atRiskBuyerCount: atRiskBuyers.count,
  });
});

router.get("/stats/warehouse-distribution", async (_req, res) => {
  const rows = await db
    .select({
      warehouseCode: ewrsTable.warehouseCode,
      ewrCount: count(ewrsTable.id),
      totalWeightMt: sql<number>`COALESCE(SUM(CAST(${ewrsTable.weightMt} as NUMERIC)), 0)`,
      commodities: sql<string>`STRING_AGG(DISTINCT ${ewrsTable.commodityType}::text, ',')`,
    })
    .from(ewrsTable)
    .groupBy(ewrsTable.warehouseCode);

  return res.json(
    rows.map((row) => ({
      warehouseCode: row.warehouseCode,
      ewrCount: row.ewrCount,
      totalWeightMt: Number(row.totalWeightMt),
      activeCommodities: row.commodities ? row.commodities.split(",") : [],
    }))
  );
});

router.get("/stats/price-trends", async (req, res) => {
  const { commodityType } = req.query as { commodityType?: string };

  const rows = await db
    .select({
      commodityType: ewrsTable.commodityType,
      clearingPriceUsd: sql<number>`CAST(${auctionBidsTable.amountUsd} AS NUMERIC)`,
      settledAt: auctionsTable.endAt,
      weightMt: ewrsTable.weightMt,
    })
    .from(auctionsTable)
    .innerJoin(auctionBidsTable, sql`${auctionBidsTable.id} = ${auctionsTable.winningBidId}`)
    .innerJoin(ewrsTable, eq(auctionsTable.ewrId, ewrsTable.id))
    .where(
      commodityType
        ? and(eq(auctionsTable.status, "SETTLED"), eq(ewrsTable.commodityType, commodityType as typeof ewrsTable.$inferSelect["commodityType"]))
        : eq(auctionsTable.status, "SETTLED")
    )
    .orderBy(auctionsTable.endAt);

  return res.json(rows);
});

router.get("/stats/top-bidders", async (req, res) => {
  const { commodityType, limit = "10" } = req.query as { commodityType?: string; limit?: string };
  const limitNum = Math.min(parseInt(limit) || 10, 50);

  const rows = await db
    .select({
      bidderId: auctionBidsTable.bidderId,
      bidderName: usersTable.name,
      commodityType: ewrsTable.commodityType,
      totalBids: count(auctionBidsTable.id),
      highestBidUsd: sql<number>`MAX(CAST(${auctionBidsTable.amountUsd} AS NUMERIC))`,
    })
    .from(auctionBidsTable)
    .innerJoin(auctionsTable, eq(auctionBidsTable.auctionId, auctionsTable.id))
    .innerJoin(ewrsTable, eq(auctionsTable.ewrId, ewrsTable.id))
    .leftJoin(usersTable, eq(auctionBidsTable.bidderId, usersTable.id))
    .where(
      commodityType
        ? eq(ewrsTable.commodityType, commodityType as typeof ewrsTable.$inferSelect["commodityType"])
        : undefined
    )
    .groupBy(auctionBidsTable.bidderId, usersTable.name, ewrsTable.commodityType)
    .orderBy(sql`MAX(CAST(${auctionBidsTable.amountUsd} AS NUMERIC)) DESC`)
    .limit(limitNum);

  return res.json(rows);
});

export default router;
