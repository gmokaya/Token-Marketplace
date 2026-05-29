import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userTierEnum = pgEnum("user_tier", ["PRODUCER", "OFF_TAKER", "ENABLER", "FINANCIER"]);
export const kybStatusEnum = pgEnum("kyb_status", ["PENDING", "VERIFIED", "REJECTED"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  tier: userTierEnum("tier").notNull().default("PRODUCER"),
  reputationScore: integer("reputation_score").notNull().default(100),
  kybStatus: kybStatusEnum("kyb_status").notNull().default("PENDING"),
  company: text("company"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
