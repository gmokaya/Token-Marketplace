import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { commodityTypeEnum } from "./ewrs";

export const marketDailyClosesTable = pgTable(
  "market_daily_closes",
  {
    id: serial("id").primaryKey(),
    commodityType: commodityTypeEnum("commodity_type").notNull(),
    tradingDate: date("trading_date", { mode: "string" }).notNull(),
    closePriceUsdPerMt: numeric("close_price_usd_per_mt", {
      precision: 14,
      scale: 4,
    }).notNull(),
    tradedVolumeMt: numeric("traded_volume_mt", {
      precision: 14,
      scale: 3,
    }).notNull(),
    turnoverUsd: numeric("turnover_usd", {
      precision: 16,
      scale: 2,
    }).notNull(),
    tradeCount: integer("trade_count").notNull(),
    sourceMarkets: jsonb("source_markets").$type<string[]>().notNull(),
    sourceTimestamp: timestamp("source_timestamp", {
      withTimezone: true,
    }).notNull(),
    timezone: text("timezone").notNull().default("Africa/Nairobi"),
    cutoffTime: text("cutoff_time").notNull().default("17:00"),
    isComplete: boolean("is_complete").notNull().default(true),
    calculatedAt: timestamp("calculated_at", {
      withTimezone: true,
    }).notNull().defaultNow(),
  },
  (table) => ({
    commodityTradingDateUniq: uniqueIndex(
      "market_daily_closes_commodity_trading_date_uniq",
    ).on(table.commodityType, table.tradingDate),
  }),
);

export const insertMarketDailyCloseSchema = createInsertSchema(
  marketDailyClosesTable,
).omit({ id: true, calculatedAt: true });
export type InsertMarketDailyClose = z.infer<
  typeof insertMarketDailyCloseSchema
>;
export type MarketDailyClose = typeof marketDailyClosesTable.$inferSelect;