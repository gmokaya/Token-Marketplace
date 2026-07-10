import { pgTable, serial, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
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
});

export const insertBidSecurityHoldSchema = createInsertSchema(bidSecurityHoldsTable).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});
export type InsertBidSecurityHold = z.infer<typeof insertBidSecurityHoldSchema>;
export type BidSecurityHold = typeof bidSecurityHoldsTable.$inferSelect;
