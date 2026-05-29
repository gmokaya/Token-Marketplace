import { Router } from "express";
import { db } from "@workspace/db";
import { ewrsTable, spotListingsTable, ordersTable } from "@workspace/db";
import { eq, sql, count, avg } from "drizzle-orm";

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

export default router;
