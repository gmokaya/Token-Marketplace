import { pgTable, serial, integer, timestamp, text, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { commodityTypeEnum } from "./ewrs";

export const macroLotStatusEnum = pgEnum("macro_lot_status", ["OPEN", "FINALISED", "EWR_REQUESTED", "EWR_ISSUED"]);

export const macroLotsTable = pgTable("macro_lots", {
  id: serial("id").primaryKey(),
  cooperativeId: integer("cooperative_id").notNull().references(() => usersTable.id),
  commodityType: commodityTypeEnum("commodity_type").notNull(),
  grade: text("grade").notNull(),
  totalWeightMt: numeric("total_weight_mt", { precision: 10, scale: 3 }).notNull().default("0"),
  status: macroLotStatusEnum("status").notNull().default("OPEN"),
  ewrId: integer("ewr_id"),
  warehouseCode: text("warehouse_code"),
  harvestSeason: text("harvest_season"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMacroLotSchema = createInsertSchema(macroLotsTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMacroLot = z.infer<typeof insertMacroLotSchema>;
export type MacroLot = typeof macroLotsTable.$inferSelect;
