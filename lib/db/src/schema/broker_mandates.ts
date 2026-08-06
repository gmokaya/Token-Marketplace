import { pgTable, serial, integer, timestamp, boolean, numeric, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { commodityTypeEnum } from "./ewrs";

export const brokerMandatesTable = pgTable("broker_mandates", {
  id: serial("id").primaryKey(),

  // The commodity producer / owner granting the mandate
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id),

  // The ENABLER-tier broker receiving the mandate
  brokerId: integer("broker_id")
    .notNull()
    .references(() => usersTable.id),

  // Which commodity this mandate covers (TEA, COFFEE, etc.)
  commodityType: commodityTypeEnum("commodity_type").notNull(),

  // JSONB array of permission strings, e.g. ["list", "accept_bids", "negotiate", "set_reserve"]
  permissions: jsonb("permissions").notNull().default([]),

  // Override the broker's default commission rate for this mandate (optional)
  commissionRateOverride: numeric("commission_rate_override", { precision: 5, scale: 4 }),

  validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
  validTo: timestamp("valid_to", { withTimezone: true }), // null = open-ended

  revoked: boolean("revoked").notNull().default(false),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ownerIdIdx:  index("broker_mandates_owner_id_idx").on(table.ownerId),
  brokerIdIdx: index("broker_mandates_broker_id_idx").on(table.brokerId),
  // Hot path: active-mandate lookup (brokerId + commodityType + revoked)
  brokerCommodityRevokedIdx: index("broker_mandates_broker_commodity_revoked_idx")
    .on(table.brokerId, table.commodityType, table.revoked),
  // Owner-side lookup (duplicate-check, given-mandates list)
  ownerBrokerCommodityIdx: index("broker_mandates_owner_broker_commodity_idx")
    .on(table.ownerId, table.brokerId, table.commodityType),
}));

export const insertBrokerMandateSchema = createInsertSchema(brokerMandatesTable).omit({
  id: true,
  createdAt: true,
  revokedAt: true,
});
export type InsertBrokerMandate = z.infer<typeof insertBrokerMandateSchema>;
export type BrokerMandate = typeof brokerMandatesTable.$inferSelect;
