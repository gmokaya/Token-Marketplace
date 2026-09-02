import { pgTable, serial, integer, timestamp, text, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export type CommoditySelection = {
  commodity: string;
  subType: string | null;
};

export const marketplaceOnboardingProfilesTable = pgTable("marketplace_onboarding_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  marketplaceRole: text("marketplace_role").notNull(),
  fullName: text("full_name").notNull(),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  commodities: text("commodities").array().notNull().default([]),
  commoditySelections: jsonb("commodity_selections").$type<CommoditySelection[]>().notNull().default([]),
  payoutMobileMoney: text("payout_mobile_money"),
  businessName: text("business_name"),
  businessRegistrationNumber: text("business_registration_number"),
  entityType: text("entity_type"),
  bankDetails: text("bank_details"),
  sourcingCommodity: text("sourcing_commodity"),
  expectedVolume: text("expected_volume"),
  destinationCountry: text("destination_country"),
  interests: text("interests").array().notNull().default([]),
  producerStory: text("producer_story"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MarketplaceOnboardingProfile = typeof marketplaceOnboardingProfilesTable.$inferSelect;