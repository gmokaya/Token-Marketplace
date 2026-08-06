import {
  pgTable, serial, integer, text, timestamp, numeric, pgEnum, jsonb, index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { teaLotsTable } from "./tea_lots";

/**
 * Tea RFQs — Request for Quotation records.
 *
 * Created either internally (buyer on this platform) or from an inbound
 * Marketplace webhook (external buyer). The eventId field deduplicates
 * webhook deliveries so retries never create duplicate RFQs.
 */

export const rfqStatusEnum = pgEnum("rfq_status", [
  "open",
  "quoted",
  "negotiating",
  "accepted",
  "rejected",
  "expired",
  "converted",
]);

export const teaRfqsTable = pgTable("tea_rfqs", {
  id:      serial("id").primaryKey(),
  lotId:   integer("lot_id").references(() => teaLotsTable.id),
  ownerId: integer("owner_id").references(() => usersTable.id), // factory / producer

  // Buyer — may be a platform user or an external marketplace buyer
  buyerId:      integer("buyer_id").references(() => usersTable.id),
  buyerCompany: text("buyer_company"),
  buyerEmail:   text("buyer_email"),

  // Request details
  requestedQuantityKg:       numeric("requested_quantity_kg",        { precision: 12, scale: 3 }),
  requestedPriceUsdPerKg:    numeric("requested_price_usd_per_kg",   { precision: 10, scale: 4 }),
  message:                   text("message"),
  preferredIncoterms:        text("preferred_incoterms"),
  requestedShipmentDate:     text("requested_shipment_date"),

  // External Marketplace correlation
  externalRfqId:      text("external_rfq_id"),
  externalListingId:  text("external_listing_id"),
  eventId:            text("event_id").unique(), // idempotency — dedup inbound webhooks

  status: rfqStatusEnum("status").notNull().default("open"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  lotIdIdx:    index("tea_rfqs_lot_id_idx").on(table.lotId),
  ownerIdIdx:  index("tea_rfqs_owner_id_idx").on(table.ownerId),
  buyerIdIdx:  index("tea_rfqs_buyer_id_idx").on(table.buyerId),
  statusIdx:   index("tea_rfqs_status_idx").on(table.status),
}));

/**
 * Negotiation messages between factory and buyer on an RFQ thread.
 */
export const teaRfqMessagesTable = pgTable("tea_rfq_messages", {
  id:          serial("id").primaryKey(),
  rfqId:       integer("rfq_id").notNull().references(() => teaRfqsTable.id),
  senderId:    integer("sender_id").references(() => usersTable.id),
  senderRole:  text("sender_role"),   // "factory" | "buyer"
  content:     text("content").notNull(),
  // Array of {fileName, fileUrl, uploadedAt}
  attachments: jsonb("attachments").notNull().default([]),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  rfqIdIdx:    index("tea_rfq_messages_rfq_id_idx").on(table.rfqId),
  senderIdIdx: index("tea_rfq_messages_sender_id_idx").on(table.senderId),
}));

/**
 * Quotations submitted by the factory in response to an RFQ.
 */
export const teaQuotationsTable = pgTable("tea_quotations", {
  id:              serial("id").primaryKey(),
  rfqId:           integer("rfq_id").notNull().references(() => teaRfqsTable.id),
  quotedByUserId:  integer("quoted_by_user_id").references(() => usersTable.id),

  offerPriceUsdPerKg: numeric("offer_price_usd_per_kg", { precision: 10, scale: 4 }).notNull(),
  offerQuantityKg:    numeric("offer_quantity_kg",       { precision: 12, scale: 3 }).notNull(),
  incoterms:          text("incoterms"),
  leadTimeDays:       integer("lead_time_days"),
  validUntil:         timestamp("valid_until", { withTimezone: true }),
  notes:              text("notes"),
  commercialPitch:    text("commercial_pitch"),

  // pending | accepted | rejected | expired | superseded
  status: text("status").notNull().default("pending"),

  externalQuotationId: text("external_quotation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  rfqIdIdx: index("tea_quotations_rfq_id_idx").on(table.rfqId),
}));

export type TeaRfq         = typeof teaRfqsTable.$inferSelect;
export type NewTeaRfq      = typeof teaRfqsTable.$inferInsert;
export type TeaQuotation   = typeof teaQuotationsTable.$inferSelect;
export type TeaRfqMessage  = typeof teaRfqMessagesTable.$inferSelect;
