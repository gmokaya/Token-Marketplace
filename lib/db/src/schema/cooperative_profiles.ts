import { pgTable, serial, integer, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const cooperativeProfilesTable = pgTable("cooperative_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  entityName: text("entity_name").notNull(),
  registrationNumber: text("registration_number").notNull(),
  licenceNumber: text("licence_number"),
  kraPin: text("kra_pin"),
  officeAddress: text("office_address"),
  gpsLatitude: text("gps_latitude"),
  gpsLongitude: text("gps_longitude"),
  adminFirstName: text("admin_first_name"),
  adminLastName: text("admin_last_name"),
  adminNationalId: text("admin_national_id"),
  adminPhone: text("admin_phone"),
  adminEmail: text("admin_email"),
  bankName: text("bank_name"),
  bankBranch: text("bank_branch"),
  bankSwiftCode: text("bank_swift_code"),
  bankAccountNumber: text("bank_account_number"),
  mobileMoneyPaybill: text("mobile_money_paybill"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCooperativeProfileSchema = createInsertSchema(cooperativeProfilesTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCooperativeProfile = z.infer<typeof insertCooperativeProfileSchema>;
export type CooperativeProfile = typeof cooperativeProfilesTable.$inferSelect;
