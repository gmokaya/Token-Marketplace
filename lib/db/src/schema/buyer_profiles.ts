import { pgTable, serial, integer, timestamp, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const buyerProfilesTable = pgTable("buyer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  // General Identity
  companyLegalName: text("company_legal_name").notNull(),
  registrationNumber: text("registration_number").notNull(),
  kraPin: text("kra_pin"),
  officeAddress: text("office_address"),
  // Sector Licenses
  grainLicenseUrl: text("grain_license_url"),
  coffeeLicenseUrl: text("coffee_license_url"),
  teaLicenseUrl: text("tea_license_url"),
  // Financial
  bankName: text("bank_name"),
  bankBranch: text("bank_branch"),
  bankAccountNumber: text("bank_account_number"),
  bankSwiftCode: text("bank_swift_code"),
  // Authorized Buyer
  buyerPersonnelName: text("buyer_personnel_name"),
  buyerPersonnelNationalId: text("buyer_personnel_national_id"),
  buyerPersonnelPhone: text("buyer_personnel_phone"),
  buyerPersonnelEmail: text("buyer_personnel_email"),
  purchasingLimitUsd: text("purchasing_limit_usd"),
  // Status
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBuyerProfileSchema = createInsertSchema(buyerProfilesTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBuyerProfile = z.infer<typeof insertBuyerProfileSchema>;
export type BuyerProfile = typeof buyerProfilesTable.$inferSelect;
