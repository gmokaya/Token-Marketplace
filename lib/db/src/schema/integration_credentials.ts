import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const integrationCredentialsTable = pgTable("integration_credentials", {
  id:         serial("id").primaryKey(),
  userId:     integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name:       text("name").notNull(),
  /** First 16 characters of the full key, stored in plain for display */
  keyPrefix:  text("key_prefix").notNull(),
  /** SHA-256 hex digest of the full key — used for constant-time verification */
  keyHash:    text("key_hash").notNull().unique(),
  /** Allowed operations, e.g. ["ewr:push", "wrsc:intake"] */
  scopes:     text("scopes").array().notNull().default([]),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt:  timestamp("expires_at",  { withTimezone: true }),
  enabled:    boolean("enabled").notNull().default(true),
  createdAt:  timestamp("created_at",  { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp("updated_at",  { withTimezone: true }).notNull().defaultNow(),
});

export const insertIntegrationCredentialSchema = createInsertSchema(
  integrationCredentialsTable,
).omit({ id: true, keyHash: true, keyPrefix: true, createdAt: true, updatedAt: true });

export type InsertIntegrationCredential = z.infer<typeof insertIntegrationCredentialSchema>;
export type IntegrationCredential = typeof integrationCredentialsTable.$inferSelect;
