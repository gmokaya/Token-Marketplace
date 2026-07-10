import { pgTable, serial, integer, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { teaLotsTable } from "./tea_lots";

export const teaDocTypeEnum = pgEnum("tea_doc_type", [
  "PRE_AUCTION_DISPATCH",
  "WEIGHMENT_REPORT",
  "DELIVERY_ORDER",
]);

export const teaDispatchDocsTable = pgTable("tea_dispatch_docs", {
  id: serial("id").primaryKey(),

  lotId: integer("lot_id")
    .notNull()
    .references(() => teaLotsTable.id),

  docType: teaDocTypeEnum("doc_type").notNull(),

  submittedBy: integer("submitted_by")
    .notNull()
    .references(() => usersTable.id),

  // Flexible JSONB payload: varies by doc_type
  // PRE_AUCTION_DISPATCH: { dispatchDate, warehouseCode, truckId, ... }
  // WEIGHMENT_REPORT:     { netWeightKg, grossWeightKg, weighedBy, weighedAt, ... }
  // DELIVERY_ORDER:       { buyerId, issuedAt, dueDate, instructions, ... }
  docData: jsonb("doc_data").notNull().default({}),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTeaDispatchDocSchema = createInsertSchema(teaDispatchDocsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTeaDispatchDoc = z.infer<typeof insertTeaDispatchDocSchema>;
export type TeaDispatchDoc = typeof teaDispatchDocsTable.$inferSelect;
