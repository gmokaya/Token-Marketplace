import { pgTable, serial, text, integer, timestamp, boolean, numeric, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ewrsTable } from "./ewrs";

export const teaLotStatusEnum = pgEnum("tea_lot_status", [
  "DRAFT",
  "CATALOGUED",
  "DISPATCHED",
  "LIVE",
  "SOLD",
  "UNSOLD",
  "WITHDRAWN",
  "RESERVE_NOT_MET",
]);

export const teaListingTypeEnum = pgEnum("tea_listing_type", [
  "AUCTION",
  "FIXED_PRICE",
]);

export const teaCatalogueTypeEnum = pgEnum("tea_catalogue_type", [
  "WITH_VALUATION",
  "WITHOUT_VALUATION",
]);

export const teaLotsTable = pgTable("tea_lots", {
  id: serial("id").primaryKey(),

  // ── eWR linkage ──────────────────────────────────────────────────────────
  ewrId: integer("ewr_id")
    .notNull()
    .references(() => ewrsTable.id),

  // ── Ownership & brokerage ─────────────────────────────────────────────────
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id),
  brokerId: integer("broker_id")
    .notNull()
    .references(() => usersTable.id),

  // ── Table 2 catalogue fields ──────────────────────────────────────────────
  grade: text("grade").notNull(),           // e.g. "BOP", "BOPF", "PF"
  gradeMark: text("grade_mark").notNull(),  // estate mark, e.g. "NKT"
  giOrigin: text("gi_origin").notNull(),    // Geographic Indication, e.g. "Nyeri-ABK"

  // Weights (kg)
  grossWeightKg: numeric("gross_weight_kg", { precision: 12, scale: 3 }).notNull(),
  netWeightKg: numeric("net_weight_kg", { precision: 12, scale: 3 }).notNull(),
  tareWeightKg: numeric("tare_weight_kg", { precision: 12, scale: 3 }).notNull(),

  packageType: text("package_type").notNull(),          // e.g. "sack", "chest"
  packingWeightKg: numeric("packing_weight_kg", { precision: 10, scale: 3 }), // per-package weight

  tasterRemarks: text("taster_remarks"),

  // JSONB array of certification strings, e.g. ["ORGANIC", "FAIRTRADE", "RAINFOREST_ALLIANCE"]
  certifications: jsonb("certifications").notNull().default([]),

  storageStatus: text("storage_status"),   // e.g. "IN_STORE", "DISPATCHED"

  // ── Listing & valuation ───────────────────────────────────────────────────
  listingType: teaListingTypeEnum("listing_type").notNull().default("AUCTION"),
  catalogueType: teaCatalogueTypeEnum("catalogue_type").notNull().default("WITHOUT_VALUATION"),

  reservePriceUsd: numeric("reserve_price_usd", { precision: 14, scale: 2 }),
  brokerValuationUsd: numeric("broker_valuation_usd", { precision: 14, scale: 2 }),
  fixedPricePerKgUsd: numeric("fixed_price_per_kg_usd", { precision: 10, scale: 4 }), // for FIXED_PRICE lots

  commissionRate: numeric("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.0100"), // 1% default

  // ── Auction mechanics (JSONB) ─────────────────────────────────────────────
  // tick_tiers: [{upToUsd: number, incrementPct: number}, ..., {above: true, incrementPct: number}]
  tickTiers: jsonb("tick_tiers").notNull().default([]),

  // anti_snipe_config: {windowSecs: 180, extensionSecs: 180, maxExtensionSecs: 1800}
  antiSnipeConfig: jsonb("anti_snipe_config").notNull().default({}),

  bidSecurityPct: numeric("bid_security_pct", { precision: 5, scale: 4 }).notNull().default("0.1000"), // 10%

  // ── Auction session linkage & live timing ────────────────────────────────
  // session_id set when lot is assigned to an auction session
  sessionId: integer("session_id"),
  // Timestamps for when this lot goes LIVE within the session
  auctionStartAt: timestamp("auction_start_at", { withTimezone: true }),
  auctionEndAt: timestamp("auction_end_at", { withTimezone: true }),
  // Total seconds of anti-snipe extension applied so far (capped at antiSnipeConfig.maxExtensionSecs)
  totalExtensionSecs: integer("total_extension_secs").notNull().default(0),

  // ── Status & timestamps ───────────────────────────────────────────────────
  status: teaLotStatusEnum("status").notNull().default("DRAFT"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ewrIdIdx:      index("tea_lots_ewr_id_idx").on(table.ewrId),
  ownerIdIdx:    index("tea_lots_owner_id_idx").on(table.ownerId),
  brokerIdIdx:   index("tea_lots_broker_id_idx").on(table.brokerId),
  statusIdx:     index("tea_lots_status_idx").on(table.status),
  sessionIdIdx:  index("tea_lots_session_id_idx").on(table.sessionId),
  // Worker scans open lots by auctionEndAt — compound with status keeps the scan tight
  statusEndAtIdx: index("tea_lots_status_end_at_idx").on(table.status, table.auctionEndAt),
}));

export const insertTeaLotSchema = createInsertSchema(teaLotsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTeaLot = z.infer<typeof insertTeaLotSchema>;
export type TeaLot = typeof teaLotsTable.$inferSelect;
