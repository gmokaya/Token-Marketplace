import { db } from "@workspace/db";
import {
  usersTable,
  ewrsTable,
  spotListingsTable,
  auctionsTable,
  auctionBidsTable,
  forwardContractsTable,
  contractEventsTable,
  financingRequestsTable,
  loansTable,
  settlementsTable,
  auditLogTable,
  cooperativeProfilesTable,
  coopMembersTable,
  intakeLogsTable,
  macroLotsTable,
  digitalReleaseTokensTable,
} from "@workspace/db";
import { eq, ne } from "drizzle-orm";

async function cleanup() {
  console.log("Cleaning up all seed data, keeping only admin...");

  // Delete all transactional/linked data first (foreign key order)
  await db.delete(auditLogTable);
  await db.delete(digitalReleaseTokensTable);
  await db.delete(settlementsTable);
  await db.delete(loansTable);
  await db.delete(financingRequestsTable);
  await db.delete(contractEventsTable);
  await db.delete(forwardContractsTable);
  await db.delete(auctionBidsTable);
  await db.delete(auctionsTable);
  await db.delete(spotListingsTable);
  await db.delete(macroLotsTable);
  await db.delete(intakeLogsTable);
  await db.delete(coopMembersTable);
  await db.delete(cooperativeProfilesTable);
  await db.delete(ewrsTable);

  // Delete all non-admin users
  await db.delete(usersTable).where(ne(usersTable.tier, "ADMIN"));

  const [admin] = await db.select().from(usersTable).where(eq(usersTable.tier, "ADMIN"));
  console.log("Cleanup complete. Remaining user:", admin?.name, admin?.email);
  process.exit(0);
}

cleanup().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
