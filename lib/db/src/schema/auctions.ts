import { pgTable, serial, integer, timestamp, numeric, pgEnum, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ewrsTable } from "./ewrs";

export const auctionStatusEnum = pgEnum("auction_status", ["OPEN", "CLOSED", "SETTLED", "CANCELLED"]);

export const auctionsTable = pgTable("auctions", {
  id: serial("id").primaryKey(),
  ewrId: integer("ewr_id").notNull().references(() => ewrsTable.id),
  sellerId: integer("seller_id").notNull().references(() => usersTable.id),
  reservePriceUsd: numeric("reserve_price_usd", { precision: 14, scale: 2 }).notNull(),
  bidIncrementPct: numeric("bid_increment_pct", { precision: 5, scale: 2 }).notNull().default("1.5"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  status: auctionStatusEnum("status").notNull().default("OPEN"),
  winningBidId: integer("winning_bid_id"),
  settlementDeadlineAt: timestamp("settlement_deadline_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ewrIdIdx:    index("auctions_ewr_id_idx").on(table.ewrId),
  sellerIdIdx: index("auctions_seller_id_idx").on(table.sellerId),
  statusIdx:   index("auctions_status_idx").on(table.status),
}));

export const insertAuctionSchema = createInsertSchema(auctionsTable).omit({ id: true, createdAt: true });
export type InsertAuction = z.infer<typeof insertAuctionSchema>;
export type Auction = typeof auctionsTable.$inferSelect;
