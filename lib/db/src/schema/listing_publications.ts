import {
  pgTable, serial, integer, text, timestamp, pgEnum, uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { teaLotsTable } from "./tea_lots";

/**
 * Listing Publications — tracks external Marketplace sync state per lot.
 *
 * Separates authoring state (tea_lots.status) from publication state so
 * a lot can be locally "active" but still "pending" externally, or "live"
 * externally while a local update is queued.
 *
 * Uniqueness: exactly one record per (listingId, marketplaceName) pair is
 * enforced by a database unique index. The publish route uses
 * INSERT … ON CONFLICT DO UPDATE to prevent race-condition duplicates.
 */
export const publicationStatusEnum = pgEnum("publication_status", [
  "not_published",
  "pending",
  "live",
  "update_pending",
  "failed",
  "unpublished",
]);

export const listingPublicationsTable = pgTable("listing_publications", {
  id:            serial("id").primaryKey(),
  factoryId:     integer("factory_id").references(() => usersTable.id),
  listingId:     integer("listing_id").references(() => teaLotsTable.id),

  // Which external marketplace this record tracks
  marketplaceName: text("marketplace_name").notNull().default("tokenharvest"),

  // External correlation
  externalListingId: text("external_listing_id"),

  // Publication state machine
  status: publicationStatusEnum("status").notNull().default("not_published"),

  // Audit / retry metadata
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastError:     text("last_error"),

  // Hash of the payload sent on lastSuccessAt — detect stale projections
  payloadHash: text("payload_hash"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // One record per lot+marketplace — prevents concurrent-publish duplicates
  lotMarketplaceUniq: uniqueIndex("listing_publications_lot_marketplace_uniq")
    .on(table.listingId, table.marketplaceName),
}));

export type ListingPublication    = typeof listingPublicationsTable.$inferSelect;
export type NewListingPublication = typeof listingPublicationsTable.$inferInsert;
