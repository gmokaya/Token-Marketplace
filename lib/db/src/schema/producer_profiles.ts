import { pgTable, serial, integer, timestamp, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const producerProfilesTable = pgTable("producer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  // General Identity & KYB
  entityName: text("entity_name").notNull(),
  registrationNumber: text("registration_number").notNull(),
  kraPin: text("kra_pin"),
  officeAddress: text("office_address"),
  gpsLatitude: text("gps_latitude"),
  gpsLongitude: text("gps_longitude"),
  // Contact & Operational
  adminFirstName: text("admin_first_name"),
  adminLastName: text("admin_last_name"),
  adminNationalId: text("admin_national_id"),
  adminPhone: text("admin_phone"),
  adminEmail: text("admin_email"),
  factoryMarks: text("factory_marks"),
  // Banking
  bankName: text("bank_name"),
  bankBranch: text("bank_branch"),
  bankSwiftCode: text("bank_swift_code"),
  bankAccountNumber: text("bank_account_number"),
  mobileMoneyPaybill: text("mobile_money_paybill"),
  // Status
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProducerProfileSchema = createInsertSchema(producerProfilesTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProducerProfile = z.infer<typeof insertProducerProfileSchema>;
export type ProducerProfile = typeof producerProfilesTable.$inferSelect;
