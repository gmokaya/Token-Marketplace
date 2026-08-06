import { pgTable, serial, integer, numeric, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { teaLotsTable } from "./tea_lots";
import { teaLotBidsTable } from "./tea_lot_bids";

export const bidSecurityHoldStatusEnum = pgEnum("bid_security_hold_status", [
  "HELD",
  "RELEASED",
  "FORFEITED",
]);

export const bidSecurityHoldsTable = pgTable("bid_security_holds", {
  id: serial("id").primaryKey(),

  lotId: integer("lot_id")
    .notNull()
    .references(() => teaLotsTable.id),

  bidId: integer("bid_id")
    .notNull()
    .references(() => teaLotBidsTable.id),

  bidderId: integer("bidder_id")
    .notNull()
    .references(() => usersTable.id),

  // Amount locked = bid_amount × bid_security_pct
  amountUsd: numeric("amount_usd", { precision: 14, scale: 2 }).notNull(),

  status: bidSecurityHoldStatusEnum("status").notNull().default("HELD"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => ({
  lotIdIdx:        index("bid_sec_holds_lot_id_idx").on(table.lotId),
  bidderIdIdx:     index("bid_sec_holds_bidder_id_idx").on(table.bidderId),
  bidIdIdx:        index("bid_sec_holds_bid_id_idx").on(table.bidId),
  // Frequent: release HELD holds for a lot — compound covers the most common WHERE
  lotStatusIdx:    index("bid_sec_holds_lot_status_idx").on(table.lotId, table.status),
}));

export const insertBidSecurityHoldSchema = createInsertSchema(bidSecurityHoldsTable).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});
export type InsertBidSecurityHold = z.infer<typeof insertBidSecurityHoldSchema>;
export type BidSecurityHold = typeof bidSecurityHoldsTable.$inferSelect;
