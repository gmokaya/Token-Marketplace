import { pgTable, serial, integer, date, timestamp, pgEnum, jsonb, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const teaAuctionSessionStatusEnum = pgEnum("tea_auction_session_status", [
  "SCHEDULED",
  "LIVE",
  "CLOSED",
  "COMPLETED",
]);

export const teaAuctionSessionsTable = pgTable("tea_auction_sessions", {
  id: serial("id").primaryKey(),

  // The broker who created this session
  createdByBrokerId: integer("created_by_broker_id")
    .notNull()
    .references(() => usersTable.id),

  // Planned date for this auction session (YYYY-MM-DD)
  auctionDate: date("auction_date").notNull(),

  // Scheduled start time of day, e.g. "09:00" or "14:30" (HH:mm, 24-hour)
  scheduledStartTime: text("scheduled_start_time"),

  // Ordered array of tea_lot IDs in catalogue sequence
  catalogueOrder: jsonb("catalogue_order").notNull().default([]),

  // The lot currently being auctioned (null when between lots or session ended)
  // Stored as plain integer — no FK constraint to avoid circular dependency with tea_lots
  currentLotId: integer("current_lot_id"),

  status: teaAuctionSessionStatusEnum("status").notNull().default("SCHEDULED"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTeaAuctionSessionSchema = createInsertSchema(teaAuctionSessionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTeaAuctionSession = z.infer<typeof insertTeaAuctionSessionSchema>;
export type TeaAuctionSession = typeof teaAuctionSessionsTable.$inferSelect;
