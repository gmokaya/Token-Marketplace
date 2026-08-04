import {
  pgTable, serial, integer, text, timestamp, jsonb, pgEnum,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { teaLotsTable } from "./tea_lots";
import { teaRfqsTable } from "./tea_rfqs";

/**
 * Tea Shipments — tracks physical movement of tea from factory to buyer.
 *
 * milestones: [{date, event, location, notes}]
 * exportDocs: [{docType, docName, fileUrl, issuedAt, issuedBy}]
 *
 * docType examples: "Bill of Lading", "Phytosanitary Certificate",
 *   "Certificate of Origin", "Packing List", "Commercial Invoice",
 *   "Fumigation Certificate", "Weighment Certificate"
 */

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "PENDING",
  "DISPATCHED",
  "IN_TRANSIT",
  "AT_PORT",
  "CUSTOMS_CLEARANCE",
  "DELIVERED",
  "CANCELLED",
]);

export const teaShipmentsTable = pgTable("tea_shipments", {
  id:      serial("id").primaryKey(),
  lotId:   integer("lot_id").references(() => teaLotsTable.id),
  rfqId:   integer("rfq_id").references(() => teaRfqsTable.id),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),

  // Shipment identity
  shipmentRef:     text("shipment_ref").notNull(),  // factory-assigned ref
  blNumber:        text("bl_number"),               // Bill of Lading
  containerNumber: text("container_number"),
  vesselName:      text("vessel_name"),
  voyageNumber:    text("voyage_number"),
  shippingLine:    text("shipping_line"),

  // Route
  portOfLoading:    text("port_of_loading"),    // e.g. "Mombasa"
  portOfDischarge:  text("port_of_discharge"),  // e.g. "Hamburg"
  destinationPort:  text("destination_port"),
  incoterms:        text("incoterms"),          // FOB | CIF | EXW | DAP | DDP

  // Buyer info
  buyerCompany:   text("buyer_company"),
  buyerCountry:   text("buyer_country"),

  // Dates
  etd:              timestamp("etd",              { withTimezone: true }), // estimated departure
  eta:              timestamp("eta",              { withTimezone: true }), // estimated arrival
  actualDepartAt:   timestamp("actual_depart_at", { withTimezone: true }),
  actualArriveAt:   timestamp("actual_arrive_at", { withTimezone: true }),

  status: shipmentStatusEnum("status").notNull().default("PENDING"),

  // Milestones — [{date: ISO, event: string, location: string, notes?: string}]
  milestones: jsonb("milestones").notNull().default([]),

  // Export / trade documents
  // [{docType, docName, fileUrl, issuedAt, issuedBy, expiryDate?}]
  exportDocs: jsonb("export_docs").notNull().default([]),

  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeaShipment    = typeof teaShipmentsTable.$inferSelect;
export type NewTeaShipment = typeof teaShipmentsTable.$inferInsert;
