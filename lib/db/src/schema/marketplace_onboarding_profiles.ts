import { pgTable, serial, integer, timestamp, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const marketplaceOnboardingProfilesTable = pgTable("marketplace_onboarding_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  marketplaceRole: text("marketplace_role").notNull(),
  fullName: text("full_name").notNull(),
  region: text("region"),
  commodities: text("commodities").array().notNull().default([]),
  payoutMobileMoney: text("payout_mobile_money"),
  businessName: text("business_name"),
  businessRegistrationNumber: text("business_registration_number"),
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