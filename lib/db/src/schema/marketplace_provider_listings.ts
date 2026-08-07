import {
  jsonb,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Provider-side source of truth for listings published through the
 * first-party TokenHarvest Marketplace API.
 *
 * This is intentionally separate from listing_publications, which is the
 * caller-side sync/outbox record. The separation lets the provider API expose
 * stable external IDs and idempotent retries even when the caller retries.
 */
export const marketplaceProviderListingsTable = pgTable(
  "marketplace_provider_listings",
  {
    id: serial("id").primaryKey(),
    externalListingId: text("external_listing_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    accountId: text("account_id").notNull(),
    factoryId: integer("factory_id"),
    brokerId: integer("broker_id"),
    lotId: integer("lot_id").notNull(),
    ewrId: integer("ewr_id"),
    commodityType: text("commodity_type").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("live"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    externalListingIdUniq: uniqueIndex(
      "marketplace_provider_external_listing_id_uniq",
    ).on(table.externalListingId),
    idempotencyKeyUniq: uniqueIndex(
      "marketplace_provider_idempotency_key_uniq",
    ).on(table.idempotencyKey),
  }),
);

export type MarketplaceProviderListing =
  typeof marketplaceProviderListingsTable.$inferSelect;
export type NewMarketplaceProviderListing =
  typeof marketplaceProviderListingsTable.$inferInsert;