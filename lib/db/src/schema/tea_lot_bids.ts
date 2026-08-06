import { pgTable, serial, integer, numeric, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { teaLotsTable } from "./tea_lots";
import { teaAuctionSessionsTable } from "./tea_auction_sessions";

export const teaLotBidsTable = pgTable("tea_lot_bids", {
  id: serial("id").primaryKey(),

  lotId: integer("lot_id")
    .notNull()
    .references(() => teaLotsTable.id),

  sessionId: integer("session_id")
    .notNull()
    .references(() => teaAuctionSessionsTable.id),

  bidderId: integer("bidder_id")
    .notNull()
    .references(() => usersTable.id),

  amountUsd: numeric("amount_usd", { precision: 14, scale: 2 }).notNull(),

  // Whether this is the current high bid for the lot
  isWinning: boolean("is_winning").notNull().default(false),

  placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  lotIdIdx:      index("tea_lot_bids_lot_id_idx").on(table.lotId),
  sessionIdIdx:  index("tea_lot_bids_session_id_idx").on(table.sessionId),
  bidderIdIdx:   index("tea_lot_bids_bidder_id_idx").on(table.bidderId),
  // Hot path: find winning bid — lot + isWinning filter is extremely frequent
  lotWinningIdx: index("tea_lot_bids_lot_winning_idx").on(table.lotId, table.isWinning),
}));

export const insertTeaLotBidSchema = createInsertSchema(teaLotBidsTable).omit({
  id: true,
  placedAt: true,
});
export type InsertTeaLotBid = z.infer<typeof insertTeaLotBidSchema>;
export type TeaLotBid = typeof teaLotBidsTable.$inferSelect;
