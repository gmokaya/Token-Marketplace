import { pgTable, serial, text, integer, timestamp, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const commodityTypeEnum = pgEnum("commodity_type", ["MAIZE", "RICE", "COFFEE", "TEA", "AVOCADO"]);
export const ewrStateEnum = pgEnum("ewr_state", ["INGESTED", "MARKET_LISTED", "AUCTION_ACTIVE", "FORWARD_BOUND", "LOCK_TRADING", "SETTLED", "ENCUMBERED", "EXTINGUISHED"]);
export const batchTypeEnum = pgEnum("batch_type", ["FUNGIBLE", "SEMI_FUNGIBLE", "NON_FUNGIBLE", "TIME_DECAYING"]);
export const coffeeBeanSizeEnum = pgEnum("coffee_bean_size", ["AA", "AB", "PB", "C"]);
export const teaProcessingTypeEnum = pgEnum("tea_processing_type", ["CTC", "ORTHODOX"]);
export const teaLeafGradeEnum = pgEnum("tea_leaf_grade", ["BOP", "BOPF", "D1", "PF"]);
export const avocadoVarietyEnum = pgEnum("avocado_variety", ["HASS", "FUERTE"]);

export const ewrsTable = pgTable("ewrs", {
  id: serial("id").primaryKey(),
  ewrsReceiptId: text("ewrs_receipt_id").notNull().unique(),
  wrscSignature: text("wrsc_signature").notNull(),
  warehouseCode: text("warehouse_code").notNull(),
  commodityType: commodityTypeEnum("commodity_type").notNull(),
  batchType: batchTypeEnum("batch_type").notNull().default("FUNGIBLE"),
  grade: text("grade").notNull(),
  weightMt: numeric("weight_mt", { precision: 10, scale: 3 }).notNull(),
  harvestSeason: text("harvest_season").notNull(),
  isLienActive: boolean("is_lien_active").notNull().default(false),
  lienHolderId: integer("lien_holder_id").references(() => usersTable.id),
  state: ewrStateEnum("state").notNull().default("INGESTED"),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),
  expiryAt: timestamp("expiry_at", { withTimezone: true }),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  estimatedValueUsd: numeric("estimated_value_usd", { precision: 14, scale: 2 }),

  // ── Grain grading (Maize / Rice — EAS 2:2013 / EAS 128:2013) ──────────
  moisturePct: numeric("moisture_pct", { precision: 5, scale: 2 }),
  foreignMatterPct: numeric("foreign_matter_pct", { precision: 5, scale: 2 }),
  brokenGrainsPct: numeric("broken_grains_pct", { precision: 5, scale: 2 }),
  insectDamagedGrainsPct: numeric("insect_damaged_grains_pct", { precision: 5, scale: 2 }),

  // ── Coffee grading (Coffea arabica / canephora) ──────────────────────
  coffeeBeanSize: coffeeBeanSizeEnum("coffee_bean_size"),
  coffeeCuppingScore: numeric("coffee_cupping_score", { precision: 4, scale: 1 }),

  // ── Tea grading (Camellia sinensis) ──────────────────────────────────
  teaProcessingType: teaProcessingTypeEnum("tea_processing_type"),
  teaLeafGrade: teaLeafGradeEnum("tea_leaf_grade"),
  teaInvoiceSerial: text("tea_invoice_serial"),

  // ── Avocado grading (Persea americana — EAS 19:2017) ─────────────────
  avocadoVariety: avocadoVarietyEnum("avocado_variety"),
  avocadoSizingCode: integer("avocado_sizing_code"),
  avocadoColdChainCompliant: boolean("avocado_cold_chain_compliant"),
  avocadoDegradationCoefficient: numeric("avocado_degradation_coefficient", { precision: 5, scale: 4 }),

  // ── Fungible pooling (Maize / Rice silos) ────────────────────────────
  poolGroupId: text("pool_group_id"),
});

export const insertEwrSchema = createInsertSchema(ewrsTable).omit({ id: true, issuedAt: true });
export type InsertEwr = z.infer<typeof insertEwrSchema>;
export type Ewr = typeof ewrsTable.$inferSelect;
