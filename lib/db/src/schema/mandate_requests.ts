import { pgTable, serial, integer, timestamp, text, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { commodityTypeEnum } from "./ewrs";
import { brokerMandatesTable } from "./broker_mandates";

/**
 * mandate_requests
 *
 * A broker generates a request token that they share (out of band) with a producer.
 * The producer then POSTs /broker-mandates/confirm with that token and their API key
 * to grant the mandate — no producer UI login required.
 *
 * Status lifecycle: PENDING → CONFIRMED | CANCELLED | EXPIRED
 */
export const mandateRequestsTable = pgTable("mandate_requests", {
  id: serial("id").primaryKey(),

  // The ENABLER-tier broker who originated this request
  brokerId: integer("broker_id")
    .notNull()
    .references(() => usersTable.id),

  commodityType: commodityTypeEnum("commodity_type").notNull(),

  // Opaque random token shared with the producer (UUID v4)
  token: text("token").notNull().unique(),

  // PENDING | CONFIRMED | CANCELLED | EXPIRED
  status: text("status").notNull().default("PENDING"),

  // Request expires after 7 days by default
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

  // Set when a producer confirms — FK to the resulting mandate
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  confirmedMandateId: integer("confirmed_mandate_id").references(
    () => brokerMandatesTable.id
  ),

  // Optional note the broker adds when generating the request
  note: text("note"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  brokerIdIdx: index("mandate_requests_broker_id_idx").on(table.brokerId),
  tokenIdx:    index("mandate_requests_token_idx").on(table.token),
  statusIdx:   index("mandate_requests_status_idx").on(table.status),
}));

export type MandateRequest = typeof mandateRequestsTable.$inferSelect;
