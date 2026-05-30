import { pgTable, serial, integer, timestamp, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const warehouseFacilityTypeEnum = pgEnum("warehouse_facility_type", [
  "DRY_GRAIN_SILO",
  "CONTROLLED_ATMOSPHERE_COLD_STORAGE",
  "WAREHOUSE",
  "DEPOT",
  "OTHER",
]);

export const warehouseProfilesTable = pgTable("warehouse_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  // Legal
  operatorName: text("operator_name").notNull(),
  wrscLicenseNumber: text("wrsc_license_number").notNull(),
  wrscApiKey: text("wrsc_api_key"),
  // Structural
  facilityType: warehouseFacilityTypeEnum("facility_type"),
  capacityMt: text("capacity_mt"),
  // Value chains handled
  handlesMaize: text("handles_maize"),
  handlesRice: text("handles_rice"),
  handlesCoffee: text("handles_coffee"),
  handlesTea: text("handles_tea"),
  handlesAvocado: text("handles_avocado"),
  // Insurance
  insurerName: text("insurer_name"),
  insurancePolicyNumber: text("insurance_policy_number"),
  insuranceUnderwrittenValue: text("insurance_underwritten_value"),
  insuranceExpiryDate: text("insurance_expiry_date"),
  // Operations
  warehouseInChargeName: text("warehouse_in_charge_name"),
  warehouseInChargePhone: text("warehouse_in_charge_phone"),
  warehouseInChargeEmail: text("warehouse_in_charge_email"),
  // Status
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWarehouseProfileSchema = createInsertSchema(warehouseProfilesTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWarehouseProfile = z.infer<typeof insertWarehouseProfileSchema>;
export type WarehouseProfile = typeof warehouseProfilesTable.$inferSelect;
