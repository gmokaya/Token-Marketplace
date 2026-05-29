import { pgTable, serial, integer, timestamp, numeric, pgEnum, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { loansTable } from "./loans";

export const settlementEntityTypeEnum = pgEnum("settlement_entity_type", ["ORDER", "AUCTION", "FORWARD"]);
export const settlementLegStatusEnum = pgEnum("settlement_leg_status", ["PENDING", "DISBURSED", "N_A"]);

export const settlementsTable = pgTable("settlements", {
  id: serial("id").primaryKey(),
  entityType: settlementEntityTypeEnum("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  initiatedById: integer("initiated_by_id").references(() => usersTable.id),
  vTotalUsd: numeric("v_total_usd", { precision: 14, scale: 2 }).notNull(),
  rBankUsd: numeric("r_bank_usd", { precision: 14, scale: 2 }).notNull().default("0"),
  fPlatformUsd: numeric("f_platform_usd", { precision: 14, scale: 2 }).notNull(),
  pProducerUsd: numeric("p_producer_usd", { precision: 14, scale: 2 }).notNull(),
  loanId: integer("loan_id").references(() => loansTable.id),
  bankLegStatus: settlementLegStatusEnum("bank_leg_status").notNull().default("N_A"),
  platformLegStatus: settlementLegStatusEnum("platform_leg_status").notNull().default("PENDING"),
  producerLegStatus: settlementLegStatusEnum("producer_leg_status").notNull().default("PENDING"),
  bankLegDisbursedAt: timestamp("bank_leg_disbursed_at", { withTimezone: true }),
  platformLegDisbursedAt: timestamp("platform_leg_disbursed_at", { withTimezone: true }),
  producerLegDisbursedAt: timestamp("producer_leg_disbursed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSettlementSchema = createInsertSchema(settlementsTable).omit({ id: true, createdAt: true });
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type Settlement = typeof settlementsTable.$inferSelect;
