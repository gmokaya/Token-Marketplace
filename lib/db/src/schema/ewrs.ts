import { pgTable, serial, text, integer, timestamp, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const commodityTypeEnum = pgEnum("commodity_type", ["MAIZE", "RICE", "COFFEE", "TEA", "AVOCADO"]);
export const ewrStateEnum = pgEnum("ewr_state", ["INGESTED", "MARKET_LISTED", "LOCK_TRADING", "SETTLED", "ENCUMBERED"]);

export const ewrsTable = pgTable("ewrs", {
  id: serial("id").primaryKey(),
  ewrsReceiptId: text("ewrs_receipt_id").notNull().unique(),
  wrscSignature: text("wrsc_signature").notNull(),
  warehouseCode: text("warehouse_code").notNull(),
  commodityType: commodityTypeEnum("commodity_type").notNull(),
  grade: text("grade").notNull(),
  weightMt: numeric("weight_mt", { precision: 10, scale: 3 }).notNull(),
  moisturePct: numeric("moisture_pct", { precision: 5, scale: 2 }),
  harvestSeason: text("harvest_season").notNull(),
  isLienActive: boolean("is_lien_active").notNull().default(false),
  lienHolderId: integer("lien_holder_id").references(() => usersTable.id),
  state: ewrStateEnum("state").notNull().default("INGESTED"),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),
  expiryAt: timestamp("expiry_at", { withTimezone: true }),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  estimatedValueUsd: numeric("estimated_value_usd", { precision: 14, scale: 2 }),
});

export const insertEwrSchema = createInsertSchema(ewrsTable).omit({ id: true, issuedAt: true });
export type InsertEwr = z.infer<typeof insertEwrSchema>;
export type Ewr = typeof ewrsTable.$inferSelect;
