import { pgTable, serial, integer, timestamp, numeric, pgEnum, text, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ewrsTable } from "./ewrs";

export const contractStatusEnum = pgEnum("contract_status", ["PENDING_SIGNATURE", "ACTIVE", "MATURED", "DEFAULTED", "CANCELLED", "SETTLED"]);
export const bondStatusEnum = pgEnum("bond_status", ["PENDING_BOND", "ACTIVE", "FORFEITED", "RELEASED"]);

export const forwardContractsTable = pgTable("forward_contracts", {
  id: serial("id").primaryKey(),
  ewrId: integer("ewr_id").notNull().references(() => ewrsTable.id),
  sellerId: integer("seller_id").notNull().references(() => usersTable.id),
  buyerId: integer("buyer_id").references(() => usersTable.id),
  maturityDate: timestamp("maturity_date", { withTimezone: true }).notNull(),
  deliveryPriceUsd: numeric("delivery_price_usd", { precision: 14, scale: 2 }).notNull(),
  performanceBondUsd: numeric("performance_bond_usd", { precision: 14, scale: 2 }).notNull(),
  sellerBondStatus: bondStatusEnum("seller_bond_status").notNull().default("PENDING_BOND"),
  buyerBondStatus: bondStatusEnum("buyer_bond_status").notNull().default("PENDING_BOND"),
  contractStatus: contractStatusEnum("contract_status").notNull().default("PENDING_SIGNATURE"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ewrIdIdx:        index("fwd_contracts_ewr_id_idx").on(table.ewrId),
  sellerIdIdx:     index("fwd_contracts_seller_id_idx").on(table.sellerId),
  buyerIdIdx:      index("fwd_contracts_buyer_id_idx").on(table.buyerId),
  contractStatusIdx: index("fwd_contracts_status_idx").on(table.contractStatus),
}));

export const insertForwardContractSchema = createInsertSchema(forwardContractsTable).omit({ id: true, createdAt: true });
export type InsertForwardContract = z.infer<typeof insertForwardContractSchema>;
export type ForwardContract = typeof forwardContractsTable.$inferSelect;
