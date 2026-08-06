import { pgTable, serial, integer, numeric, date, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { teaLotsTable } from "./tea_lots";
import { teaAuctionSessionsTable } from "./tea_auction_sessions";
import { teaLotBidsTable } from "./tea_lot_bids";

export const teaPaymentStatusEnum = pgEnum("tea_payment_status", [
  "PENDING",
  "PAID",
  "DEFAULTED",
]);

export const deliveryOrderStatusEnum = pgEnum("delivery_order_status", [
  "NOT_ISSUABLE",
  "ISSUABLE",
  "ISSUED",
]);

export const teaLotSettlementsTable = pgTable("tea_lot_settlements", {
  id: serial("id").primaryKey(),

  lotId: integer("lot_id")
    .notNull()
    .unique()
    .references(() => teaLotsTable.id),

  sessionId: integer("session_id")
    .notNull()
    .references(() => teaAuctionSessionsTable.id),

  winningBidId: integer("winning_bid_id")
    .notNull()
    .references(() => teaLotBidsTable.id),

  buyerId: integer("buyer_id")
    .notNull()
    .references(() => usersTable.id),

  grossAmountUsd: numeric("gross_amount_usd", { precision: 14, scale: 2 }).notNull(),
  platformFeeUsd: numeric("platform_fee_usd", { precision: 14, scale: 2 }).notNull(),
  brokerCommissionUsd: numeric("broker_commission_usd", { precision: 14, scale: 2 }).notNull(),
  netProducerAmountUsd: numeric("net_producer_amount_usd", { precision: 14, scale: 2 }).notNull(),

  // 10 working days from lot close date (Kenyan holiday calendar)
  promptDate: date("prompt_date").notNull(),

  paymentStatus: teaPaymentStatusEnum("payment_status").notNull().default("PENDING"),
  deliveryOrderStatus: deliveryOrderStatusEnum("delivery_order_status").notNull().default("NOT_ISSUABLE"),

  // Whether below-reserve sale was explicitly accepted by broker
  acceptedBelowReserve: integer("accepted_below_reserve").notNull().default(0), // 0=no, 1=yes

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx:   index("tea_lot_settlements_session_id_idx").on(table.sessionId),
  buyerIdIdx:     index("tea_lot_settlements_buyer_id_idx").on(table.buyerId),
  winningBidIdx:  index("tea_lot_settlements_winning_bid_id_idx").on(table.winningBidId),
  // Worker scans PENDING settlements past their promptDate every 10 s
  paymentPromptIdx: index("tea_lot_settlements_payment_prompt_idx").on(table.paymentStatus, table.promptDate),
}));

export const insertTeaLotSettlementSchema = createInsertSchema(teaLotSettlementsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTeaLotSettlement = z.infer<typeof insertTeaLotSettlementSchema>;
export type TeaLotSettlement = typeof teaLotSettlementsTable.$inferSelect;
