import { pgTable, serial, integer, timestamp, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const coopMembersTable = pgTable("coop_members", {
  id: serial("id").primaryKey(),
  cooperativeId: integer("cooperative_id").notNull().references(() => usersTable.id),
  memberRef: text("member_ref").notNull().unique(),
  fullName: text("full_name").notNull(),
  nationalId: text("national_id").notNull(),
  farmLocation: text("farm_location"),
  gender: text("gender"),
  acreageMt: numeric("acreage_mt", { precision: 10, scale: 3 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCoopMemberSchema = createInsertSchema(coopMembersTable)
  .omit({ id: true, createdAt: true });
export type InsertCoopMember = z.infer<typeof insertCoopMemberSchema>;
export type CoopMember = typeof coopMembersTable.$inferSelect;
