import { pgTable, serial, integer, timestamp, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { commodityTypeEnum } from "./ewrs";

export const intakeLogsTable = pgTable("intake_logs", {
  id: serial("id").primaryKey(),
  cooperativeId: integer("cooperative_id").notNull().references(() => usersTable.id),
  memberRef: text("member_ref").notNull(),
  commodityType: commodityTypeEnum("commodity_type").notNull(),
  weightMt: numeric("weight_mt", { precision: 10, scale: 3 }).notNull(),
  moisturePct: numeric("moisture_pct", { precision: 5, scale: 2 }),
  grade: text("grade").notNull(),
  macroLotId: integer("macro_lot_id"),
  intakeAt: timestamp("intake_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIntakeLogSchema = createInsertSchema(intakeLogsTable)
  .omit({ id: true, createdAt: true });
export type InsertIntakeLog = z.infer<typeof insertIntakeLogSchema>;
export type IntakeLog = typeof intakeLogsTable.$inferSelect;
