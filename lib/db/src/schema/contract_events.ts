import { pgTable, serial, integer, timestamp, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { forwardContractsTable } from "./forward_contracts";

export const contractEventTypeEnum = pgEnum("contract_event_type", ["CREATED", "CO_SIGNED", "BOND_POSTED", "MATURED", "DEFAULTED", "CANCELLED"]);

export const contractEventsTable = pgTable("contract_events", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => forwardContractsTable.id),
  eventType: contractEventTypeEnum("event_type").notNull(),
  actorId: integer("actor_id").references(() => usersTable.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContractEventSchema = createInsertSchema(contractEventsTable).omit({ id: true, createdAt: true });
export type InsertContractEvent = z.infer<typeof insertContractEventSchema>;
export type ContractEvent = typeof contractEventsTable.$inferSelect;
