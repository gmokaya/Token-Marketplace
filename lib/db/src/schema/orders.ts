import { pgTable, serial, integer, timestamp, numeric, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { spotListingsTable } from "./spot_listings";

export const orderStatusEnum = pgEnum("order_status", ["PENDING_SETTLEMENT", "SETTLED", "EXPIRED", "CANCELLED"]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => spotListingsTable.id),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  status: orderStatusEnum("status").notNull().default("PENDING_SETTLEMENT"),
  totalUsd: numeric("total_usd", { precision: 14, scale: 2 }).notNull(),
  platformFeeUsd: numeric("platform_fee_usd", { precision: 12, scale: 2 }).notNull(),
  escrowFeeUsd: numeric("escrow_fee_usd", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  buyerIdIdx:   index("orders_buyer_id_idx").on(table.buyerId),
  listingIdIdx: index("orders_listing_id_idx").on(table.listingId),
  // Expiry worker polls PENDING_SETTLEMENT + expiresAt — compound keeps it to one index scan
  statusExpiresIdx: index("orders_status_expires_at_idx").on(table.status, table.expiresAt),
}));

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, lockedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
