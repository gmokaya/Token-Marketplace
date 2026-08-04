import {
  pgTable, serial, text, integer, timestamp, numeric, jsonb, uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * Tea Product / PIM (Product Information Management)
 *
 * The canonical record for a factory's tea product. Every tea lot and
 * digital e-Passport anchors back to one of these records via productId.
 * The passportId is the stable public identifier exposed to buyers.
 */
export const teaProductsTable = pgTable("tea_products", {
  id:         serial("id").primaryKey(),
  passportId: uuid("passport_id").notNull().defaultRandom().unique(),
  ownerId:    integer("owner_id").notNull().references(() => usersTable.id),

  // ── Product identity ────────────────────────────────────────────────────────
  name:             text("name").notNull(),
  grade:            text("grade").notNull(),         // e.g. "BOP", "OP1"
  region:           text("region").notNull(),         // e.g. "Kericho", "Nandi"
  altitude:         text("altitude"),                 // e.g. "1,800 – 2,200m"
  cultivar:         text("cultivar"),                 // e.g. "TRFK 6/8", "Yabukita"
  harvestDate:      text("harvest_date"),             // e.g. "2025-Q1", "April 2025"
  processingMethod: text("processing_method"),        // CTC | Orthodox | Green | White
  tastingNotes:     text("tasting_notes"),

  // ── Packaging and batch ─────────────────────────────────────────────────────
  packageType:          text("package_type"),          // e.g. "Chest", "Sack"
  batchInfo:            text("batch_info"),             // factory batch reference
  availableQuantityKg:  numeric("available_quantity_kg", { precision: 12, scale: 3 }),

  // ── Certifications — JSONB string array ─────────────────────────────────────
  // e.g. ["Rainforest Alliance", "UTZ", "Fairtrade", "Organic"]
  certifications: jsonb("certifications").notNull().default([]),

  // ── Traceability events — JSONB array of objects ────────────────────────────
  // e.g. [{ "date": "2025-04-01", "event": "Plucking", "location": "Block A", "verifiedBy": "KTDA" }]
  traceabilityEvents: jsonb("traceability_events").notNull().default([]),

  // ── ESG indicators — JSONB object ───────────────────────────────────────────
  // e.g. { "co2KgPerKg": 0.8, "waterM3PerKg": 4.2, "femaleWorkersPct": 62 }
  esgData: jsonb("esg_data").notNull().default({}),

  // ── Factory and origin info ─────────────────────────────────────────────────
  factoryName:    text("factory_name"),
  originCountry:  text("origin_country").default("Kenya"),
  originRegion:   text("origin_region"),

  // ── Status ──────────────────────────────────────────────────────────────────
  // draft | active | archived
  status: text("status").notNull().default("draft"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeaProduct   = typeof teaProductsTable.$inferSelect;
export type NewTeaProduct = typeof teaProductsTable.$inferInsert;
