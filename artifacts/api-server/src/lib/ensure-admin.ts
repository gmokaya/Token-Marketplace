import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function ensureAdminUser() {
  const email = "gnyakundi@trevitagroup.com";
  const clerkId = "admin_trevitagroup_001";

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) {
    console.log("[ensure-admin] Super admin already exists:", email);
    return;
  }

  const [admin] = await db
    .insert(usersTable)
    .values({
      clerkId,
      name: "George Nyakundi",
      email,
      tier: "ADMIN",
      reputationScore: 100,
      kybStatus: "VERIFIED",
      company: "Trevita Group",
    })
    .returning();

  console.log("[ensure-admin] Super admin created:", admin.name, admin.email);
}
