import { pgTable, serial, integer, timestamp, numeric, text, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ewrsTable } from "./ewrs";

export const listingStatusEnum = pgEnum("listing_status", ["ACTIVE", "LOCKED", "SETTLED", "CANCELLED"]);

export const spotListingsTable = pgTable("spot_listings", {
  id: serial("id").primaryKey(),
  ewrId: integer("ewr_id").notNull().references(() => ewrsTable.id),
  sellerId: integer("seller_id").notNull().references(() => usersTable.id),
  pricePerMt: numeric("price_per_mt", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: listingStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ewrIdIdx:    index("spot_listings_ewr_id_idx").on(table.ewrId),
  sellerIdIdx: index("spot_listings_seller_id_idx").on(table.sellerId),
  statusIdx:   index("spot_listings_status_idx").on(table.status),
}));

export const insertSpotListingSchema = createInsertSchema(spotListingsTable).omit({ id: true, createdAt: true });
export type InsertSpotListing = z.infer<typeof insertSpotListingSchema>;
export type SpotListing = typeof spotListingsTable.$inferSelect;
