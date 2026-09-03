import {
  db,
  withDbRetry,
  ewrsTable,
  marketDailyClosesTable,
  ordersTable,
  spotListingsTable,
  teaLotBidsTable,
  teaLotSettlementsTable,
  teaLotsTable,
} from "@workspace/db";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
} from "drizzle-orm";
import { logger } from "./logger";

export const MARKET_CLOSE_TIMEZONE = "Africa/Nairobi";
const DEFAULT_CLOSE_HOUR = 17;
const DEFAULT_CLOSE_MINUTE = 0;
const DEFAULT_GRACE_MINUTES = 5;
const HISTORY_DAYS = 400;
const SPOT_COMMODITIES = ["MAIZE", "RICE", "AVOCADO"] as const;
const AUCTION_COMMODITIES = ["COFFEE", "TEA"] as const;

type CommodityType = typeof ewrsTable.$inferSelect["commodityType"];

type TradeObservation = {
  commodityType: CommodityType;
  totalUsd: number;
  weightMt: number;
  completedAt: Date;
  sourceMarket: "GRAIN_SPOT" | "COFFEE_AUCTION" | "TEA_AUCTION";
};

type Aggregate = {
  commodityType: CommodityType;
  tradingDate: string;
  turnoverUsd: number;
  tradedVolumeMt: number;
  tradeCount: number;
  sourceMarkets: Set<string>;
  sourceTimestamp: Date;
};

export type DailyMarketCloseItem = {
  commodityType: CommodityType;
  displayName: string;
  closePriceUsdPerMt: number;
  previousClosePriceUsdPerMt: number | null;
  changePct: number | null;
  tradedVolumeMt: number;
  turnoverUsd: number;
  tradeCount: number;
  sourceMarkets: string[];
  sourceTimestamp: string;
  tradingDate: string;
  isStale: boolean;
  isComplete: boolean;
};

export type DailyMarketCloseFeed = {
  asOfTradingDate: string;
  timezone: typeof MARKET_CLOSE_TIMEZONE;
  cutoffTime: string;
  calculatedAt: string;
  closes: DailyMarketCloseItem[];
};

function envInt(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

function closeClock(): { hour: number; minute: number; label: string } {
  const hour = envInt("MARKET_CLOSE_HOUR_EAT", DEFAULT_CLOSE_HOUR, 0, 23);
  const minute = envInt(
    "MARKET_CLOSE_MINUTE_EAT",
    DEFAULT_CLOSE_MINUTE,
    0,
    59,
  );
  return {
    hour,
    minute,
    label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function closeGraceMinutes(): number {
  return envInt(
    "MARKET_CLOSE_GRACE_MINUTES",
    DEFAULT_GRACE_MINUTES,
    0,
    120,
  );
}

function nairobiParts(value: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MARKET_CLOSE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function dateLabel(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function nairobiInstant(date: string, hour: number, minute: number): Date {
  return new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+03:00`,
  );
}

export function completedTradingDate(now = new Date()): {
  tradingDate: string;
  cutoff: Date;
  cutoffTime: string;
} {
  const parts = nairobiParts(now);
  const close = closeClock();
  const graceMinutes = closeGraceMinutes();
  const today = dateLabel(parts);
  const localMinutes = parts.hour * 60 + parts.minute;
  const closeWithGraceMinutes =
    close.hour * 60 + close.minute + graceMinutes;
  const afterClose = localMinutes >= closeWithGraceMinutes;
  const tradingDate = afterClose ? today : addCalendarDays(today, -1);
  return {
    tradingDate,
    cutoff: nairobiInstant(tradingDate, close.hour, close.minute),
    cutoffTime: close.label,
  };
}

function tradingDateFor(value: Date): string {
  const parts = nairobiParts(value);
  const close = closeClock();
  const calendarDate = dateLabel(parts);
  const cutoff = nairobiInstant(calendarDate, close.hour, close.minute);
  return value <= cutoff
    ? calendarDate
    : addCalendarDays(calendarDate, 1);
}

function displayName(commodityType: CommodityType): string {
  if (commodityType === "MAIZE") return "Grain";
  if (commodityType === "RICE") return "Nuts";
  return commodityType.charAt(0) + commodityType.slice(1).toLowerCase();
}

function validObservation(observation: TradeObservation): boolean {
  return (
    Number.isFinite(observation.totalUsd) &&
    observation.totalUsd > 0 &&
    Number.isFinite(observation.weightMt) &&
    observation.weightMt > 0
  );
}

async function loadObservations(
  rangeStart: Date,
  cutoff: Date,
): Promise<TradeObservation[]> {
  const spotRows = await withDbRetry(() => db
    .select({
      commodityType: ewrsTable.commodityType,
      totalUsd: ordersTable.totalUsd,
      weightMt: ewrsTable.weightMt,
      completedAt: ordersTable.settledAt,
    })
    .from(ordersTable)
    .innerJoin(
      spotListingsTable,
      eq(ordersTable.listingId, spotListingsTable.id),
    )
    .innerJoin(ewrsTable, eq(spotListingsTable.ewrId, ewrsTable.id))
    .where(
      and(
        eq(ordersTable.status, "SETTLED"),
        isNotNull(ordersTable.settledAt),
        eq(spotListingsTable.currency, "USD"),
        inArray(ewrsTable.commodityType, [...SPOT_COMMODITIES]),
        gte(ordersTable.settledAt, rangeStart),
        lte(ordersTable.settledAt, cutoff),
      ),
    ));

  const auctionRows = await withDbRetry(() => db
    .select({
      commodityType: ewrsTable.commodityType,
      totalUsd: teaLotBidsTable.amountUsd,
      netWeightKg: teaLotsTable.netWeightKg,
      completedAt: teaLotSettlementsTable.updatedAt,
    })
    .from(teaLotSettlementsTable)
    .innerJoin(
      teaLotsTable,
      eq(teaLotSettlementsTable.lotId, teaLotsTable.id),
    )
    .innerJoin(
      teaLotBidsTable,
      eq(teaLotSettlementsTable.winningBidId, teaLotBidsTable.id),
    )
    .innerJoin(ewrsTable, eq(teaLotsTable.ewrId, ewrsTable.id))
    .where(
      and(
        eq(teaLotSettlementsTable.paymentStatus, "PAID"),
        eq(teaLotsTable.status, "SOLD"),
        eq(teaLotBidsTable.isWinning, true),
        inArray(ewrsTable.commodityType, [...AUCTION_COMMODITIES]),
        gte(teaLotSettlementsTable.updatedAt, rangeStart),
        lte(teaLotSettlementsTable.updatedAt, cutoff),
      ),
    ));

  return [
    ...spotRows
      .filter(
        (
          row,
        ): row is typeof row & {
          completedAt: Date;
        } => row.completedAt !== null,
      )
      .map((row) => ({
        commodityType: row.commodityType,
        totalUsd: Number(row.totalUsd),
        weightMt: Number(row.weightMt),
        completedAt: row.completedAt,
        sourceMarket: "GRAIN_SPOT" as const,
      })),
    ...auctionRows.map((row) => ({
      commodityType: row.commodityType,
      totalUsd: Number(row.totalUsd),
      weightMt: Number(row.netWeightKg) / 1_000,
      completedAt: row.completedAt,
      sourceMarket:
        row.commodityType === "COFFEE"
          ? ("COFFEE_AUCTION" as const)
          : ("TEA_AUCTION" as const),
    })),
  ].filter(validObservation);
}

function aggregateObservations(
  observations: TradeObservation[],
): Aggregate[] {
  const groups = new Map<string, Aggregate>();
  for (const observation of observations) {
    const tradingDate = tradingDateFor(observation.completedAt);
    const key = `${observation.commodityType}:${tradingDate}`;
    const existing = groups.get(key);
    if (existing) {
      existing.turnoverUsd += observation.totalUsd;
      existing.tradedVolumeMt += observation.weightMt;
      existing.tradeCount += 1;
      existing.sourceMarkets.add(observation.sourceMarket);
      if (observation.completedAt > existing.sourceTimestamp) {
        existing.sourceTimestamp = observation.completedAt;
      }
      continue;
    }
    groups.set(key, {
      commodityType: observation.commodityType,
      tradingDate,
      turnoverUsd: observation.totalUsd,
      tradedVolumeMt: observation.weightMt,
      tradeCount: 1,
      sourceMarkets: new Set([observation.sourceMarket]),
      sourceTimestamp: observation.completedAt,
    });
  }
  return [...groups.values()];
}

export async function finalizeMarketCloseSnapshots(
  now = new Date(),
): Promise<void> {
  const { tradingDate, cutoff, cutoffTime } = completedTradingDate(now);
  await materializeSnapshots(tradingDate, cutoff, cutoffTime);
}

async function materializeSnapshots(
  tradingDate: string,
  cutoff: Date,
  cutoffTime: string,
): Promise<void> {
  const historyStartDate = addCalendarDays(tradingDate, -HISTORY_DAYS);
  const observations = await loadObservations(
    nairobiInstant(addCalendarDays(historyStartDate, -1), 0, 0),
    cutoff,
  );
  const aggregates = aggregateObservations(observations).filter(
    (aggregate) => aggregate.tradingDate <= tradingDate,
  );
  if (aggregates.length === 0) return;

  await withDbRetry(() => db
    .insert(marketDailyClosesTable)
    .values(
      aggregates.map((aggregate) => ({
        commodityType: aggregate.commodityType,
        tradingDate: aggregate.tradingDate,
        closePriceUsdPerMt: String(
          aggregate.turnoverUsd / aggregate.tradedVolumeMt,
        ),
        tradedVolumeMt: String(aggregate.tradedVolumeMt),
        turnoverUsd: String(aggregate.turnoverUsd),
        tradeCount: aggregate.tradeCount,
        sourceMarkets: [...aggregate.sourceMarkets].sort(),
        sourceTimestamp: aggregate.sourceTimestamp,
        timezone: MARKET_CLOSE_TIMEZONE,
        cutoffTime,
        isComplete: true,
      })),
    )
    .onConflictDoNothing({
      target: [
        marketDailyClosesTable.commodityType,
        marketDailyClosesTable.tradingDate,
      ],
    }));
}

export async function getDailyMarketCloseFeed(
  now = new Date(),
): Promise<DailyMarketCloseFeed> {
  const { tradingDate, cutoffTime } = completedTradingDate(now);

  const rows = await db
    .select()
    .from(marketDailyClosesTable)
    .where(lte(marketDailyClosesTable.tradingDate, tradingDate))
    .orderBy(
      asc(marketDailyClosesTable.commodityType),
      desc(marketDailyClosesTable.tradingDate),
    );

  const byCommodity = new Map<CommodityType, typeof rows>();
  for (const row of rows) {
    const existing = byCommodity.get(row.commodityType) ?? [];
    existing.push(row);
    byCommodity.set(row.commodityType, existing);
  }

  const closes = [...byCommodity.entries()]
    .map(([commodityType, commodityRows]): DailyMarketCloseItem => {
      const [latest, previous] = commodityRows;
      const close = Number(latest.closePriceUsdPerMt);
      const previousClose = previous
        ? Number(previous.closePriceUsdPerMt)
        : null;
      return {
        commodityType,
        displayName: displayName(commodityType),
        closePriceUsdPerMt: close,
        previousClosePriceUsdPerMt: previousClose,
        changePct:
          previousClose && previousClose > 0
            ? ((close - previousClose) / previousClose) * 100
            : null,
        tradedVolumeMt: Number(latest.tradedVolumeMt),
        turnoverUsd: Number(latest.turnoverUsd),
        tradeCount: latest.tradeCount,
        sourceMarkets: latest.sourceMarkets,
        sourceTimestamp: latest.sourceTimestamp.toISOString(),
        tradingDate: latest.tradingDate,
        isStale: latest.tradingDate !== tradingDate,
        isComplete: latest.isComplete,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    asOfTradingDate: tradingDate,
    timezone: MARKET_CLOSE_TIMEZONE,
    cutoffTime,
    calculatedAt: now.toISOString(),
    closes,
  };
}

export type MarketCloseWorkerHandle = { stop(): Promise<void> };

export function startMarketCloseWorker(): MarketCloseWorkerHandle {
  let running = false;
  let stopped = false;
  let activeTick: Promise<void> | null = null;
  const run = async () => {
    if (stopped || running) return;
    running = true;
    try {
      await finalizeMarketCloseSnapshots();
    } catch (error) {
      logger.error({ err: error }, "Market close finalization failed");
    } finally {
      running = false;
    }
  };

  activeTick = run();
  const interval = setInterval(() => {
    if (!stopped && !running) activeTick = run();
  }, 60_000);
  interval.unref();
  return {
    async stop() {
      stopped = true;
      clearInterval(interval);
      await activeTick;
    },
  };
}