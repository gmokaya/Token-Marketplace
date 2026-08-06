import { pgTable, serial, integer, timestamp, numeric, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { auctionsTable } from "./auctions";

export const auctionBidsTable = pgTable("auction_bids", {
  id: serial("id").primaryKey(),
  auctionId: integer("auction_id").notNull().references(() => auctionsTable.id),
  bidderId: integer("bidder_id").notNull().references(() => usersTable.id),
  amountUsd: numeric("amount_usd", { precision: 14, scale: 2 }).notNull(),
  placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
  isWinning: boolean("is_winning").notNull().default(false),
}, (table) => ({
  auctionIdIdx: index("auction_bids_auction_id_idx").on(table.auctionId),
  bidderIdIdx:  index("auction_bids_bidder_id_idx").on(table.bidderId),
}));

export const insertAuctionBidSchema = createInsertSchema(auctionBidsTable).omit({ id: true, placedAt: true });
export type InsertAuctionBid = z.infer<typeof insertAuctionBidSchema>;
export type AuctionBid = typeof auctionBidsTable.$inferSelect;
