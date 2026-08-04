import {
  pgTable, serial, integer, text, timestamp, numeric, jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { teaProductsTable } from "./tea_products";

/**
 * Tea ESG Reports — Environmental, Social & Governance data.
 *
 * Scope: per factory (ownerId) and optionally per product (productId).
 * reportingPeriod: "2025", "2025-Q1", "2025-H1" etc.
 *
 * certifications: [{ name, body, validFrom, validTo, certificateUrl }]
 * additionalIndicators: freeform JSONB for custom metrics
 */
export const teaEsgReportsTable = pgTable("tea_esg_reports", {
  id:        serial("id").primaryKey(),
  ownerId:   integer("owner_id").notNull().references(() => usersTable.id),
  productId: integer("product_id").references(() => teaProductsTable.id), // null = factory-level

  reportingPeriod: text("reporting_period").notNull(), // "2025", "2025-Q1", ...

  // ── Environmental ───────────────────────────────────────────────────────────
  energyKwhTotal:     numeric("energy_kwh_total",     { precision: 14, scale: 2 }),
  energyKwhPerKg:     numeric("energy_kwh_per_kg",    { precision: 10, scale: 4 }),
  waterM3Total:       numeric("water_m3_total",        { precision: 14, scale: 2 }),
  waterM3PerKg:       numeric("water_m3_per_kg",       { precision: 10, scale: 4 }),
  co2KgTotal:         numeric("co2_kg_total",          { precision: 14, scale: 2 }),
  co2KgPerKg:         numeric("co2_kg_per_kg",         { precision: 10, scale: 4 }),
  wasteKgTotal:       numeric("waste_kg_total",        { precision: 14, scale: 2 }),
  wasteRecycledPct:   numeric("waste_recycled_pct",    { precision: 5,  scale: 2 }),
  renewableEnergyPct: numeric("renewable_energy_pct",  { precision: 5,  scale: 2 }),

  // ── Social ──────────────────────────────────────────────────────────────────
  totalWorkers:           integer("total_workers"),
  femaleWorkersPct:       numeric("female_workers_pct",      { precision: 5, scale: 2 }),
  averageWageUsd:         numeric("average_wage_usd",         { precision: 10, scale: 2 }),
  minimumWageCompliancePct: numeric("min_wage_compliance_pct", { precision: 5, scale: 2 }),
  safetyIncidents:        integer("safety_incidents"),
  trainingHrsPerWorker:   numeric("training_hrs_per_worker",  { precision: 8, scale: 2 }),
  childLaborPolicy:       text("child_labor_policy"),         // "Zero Tolerance", etc.
  communityInvestmentUsd: numeric("community_investment_usd", { precision: 12, scale: 2 }),

  // ── Governance ──────────────────────────────────────────────────────────────
  // [{ name, issuingBody, validFrom, validTo, certificateUrl }]
  certifications: jsonb("certifications").notNull().default([]),
  auditDate:      timestamp("audit_date", { withTimezone: true }),
  auditorName:    text("auditor_name"),
  auditReportUrl: text("audit_report_url"),

  // ── Freeform / custom metrics ───────────────────────────────────────────────
  additionalIndicators: jsonb("additional_indicators").notNull().default({}),

  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeaEsgReport    = typeof teaEsgReportsTable.$inferSelect;
export type NewTeaEsgReport = typeof teaEsgReportsTable.$inferInsert;
