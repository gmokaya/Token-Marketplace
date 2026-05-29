import { pgTable, serial, integer, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { financingRequestsTable } from "./financing_requests";

export const lienStatusEnum = pgEnum("lien_status", ["ACTIVE", "REPAID", "DEFAULTED"]);

export const loansTable = pgTable("loans", {
  id: serial("id").primaryKey(),
  financingRequestId: integer("financing_request_id").notNull().references(() => financingRequestsTable.id),
  principalUsd: numeric("principal_usd", { precision: 14, scale: 2 }).notNull(),
  interestRate: numeric("interest_rate", { precision: 6, scale: 4 }).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
  outstandingBalanceUsd: numeric("outstanding_balance_usd", { precision: 14, scale: 2 }).notNull(),
  lienStatus: lienStatusEnum("lien_status").notNull().default("ACTIVE"),
  repaidAt: timestamp("repaid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLoanSchema = createInsertSchema(loansTable).omit({ id: true, createdAt: true });
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loansTable.$inferSelect;
