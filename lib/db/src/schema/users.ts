import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userTierEnum = pgEnum("user_tier", ["PRODUCER", "OFF_TAKER", "ENABLER", "FINANCIER", "COOPERATIVE", "ADMIN"]);
export const kybStatusEnum = pgEnum("kyb_status", ["PENDING", "VERIFIED", "REJECTED"]);
export const onboardingStatusEnum = pgEnum("onboarding_status", ["PENDING_KYB_APPROVAL", "WRSC_VERIFIED", "ACTIVE", "REJECTED"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  tier: userTierEnum("tier").notNull().default("PRODUCER"),
  reputationScore: integer("reputation_score").notNull().default(100),
  kybStatus: kybStatusEnum("kyb_status").notNull().default("PENDING"),
  onboardingStatus: onboardingStatusEnum("onboarding_status").notNull().default("PENDING_KYB_APPROVAL"),
  company: text("company"),
  phone: text("phone"),
  nationalId: text("national_id"),
  socialBio: text("social_bio"),
  websiteUrl: text("website_url"),
  linkedinUrl: text("linkedin_url"),
  instagramUrl: text("instagram_url"),
  xUrl: text("x_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
