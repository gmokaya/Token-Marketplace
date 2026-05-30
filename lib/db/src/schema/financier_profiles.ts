import { pgTable, serial, integer, timestamp, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const financierProfilesTable = pgTable("financier_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  // Corporate Identity
  institutionName: text("institution_name").notNull(),
  centralBankLicenseCode: text("central_bank_license_code").notNull(),
  departmentDesignation: text("department_designation"),
  // Risk Management
  creditApproverName: text("credit_approver_name"),
  creditApproverDesignation: text("credit_approver_designation"),
  creditApproverEmail: text("credit_approver_email"),
  // Liquidity
  maxLiquidityPoolUsd: text("max_liquidity_pool_usd"),
  // Status
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFinancierProfileSchema = createInsertSchema(financierProfilesTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinancierProfile = z.infer<typeof insertFinancierProfileSchema>;
export type FinancierProfile = typeof financierProfilesTable.$inferSelect;
