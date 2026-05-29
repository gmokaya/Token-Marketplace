import { pgTable, serial, integer, timestamp, numeric, pgEnum, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ewrsTable } from "./ewrs";

export const financingRequestStatusEnum = pgEnum("financing_request_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "DISBURSED",
  "REPAID",
]);

export const financingRequestsTable = pgTable("financing_requests", {
  id: serial("id").primaryKey(),
  ewrId: integer("ewr_id").notNull().references(() => ewrsTable.id),
  requesterId: integer("requester_id").notNull().references(() => usersTable.id),
  marketValueUsd: numeric("market_value_usd", { precision: 14, scale: 2 }).notNull(),
  lMaxUsd: numeric("l_max_usd", { precision: 14, scale: 2 }).notNull(),
  interestRate: numeric("interest_rate", { precision: 6, scale: 4 }).notNull().default("0.1200"),
  status: financingRequestStatusEnum("status").notNull().default("PENDING"),
  lenderId: integer("lender_id").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  disbursedAt: timestamp("disbursed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFinancingRequestSchema = createInsertSchema(financingRequestsTable).omit({ id: true, createdAt: true });
export type InsertFinancingRequest = z.infer<typeof insertFinancingRequestSchema>;
export type FinancingRequest = typeof financingRequestsTable.$inferSelect;
