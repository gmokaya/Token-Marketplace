import { pgTable, serial, integer, timestamp, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { settlementsTable } from "./settlements";

export const digitalReleaseTokensTable = pgTable("digital_release_tokens", {
  id: serial("id").primaryKey(),
  settlementId: integer("settlement_id").notNull().references(() => settlementsTable.id),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  token: text("token").notNull().unique(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("drt_settlement_id_idx").on(t.settlementId),
]);

export const insertDigitalReleaseTokenSchema = createInsertSchema(digitalReleaseTokensTable)
  .omit({ id: true, createdAt: true });
export type InsertDigitalReleaseToken = z.infer<typeof insertDigitalReleaseTokenSchema>;
export type DigitalReleaseToken = typeof digitalReleaseTokensTable.$inferSelect;
