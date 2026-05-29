import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const reputationEventsTable = pgTable("reputation_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReputationEventSchema = createInsertSchema(reputationEventsTable).omit({ id: true, createdAt: true });
export type InsertReputationEvent = z.infer<typeof insertReputationEventSchema>;
export type ReputationEvent = typeof reputationEventsTable.$inferSelect;
