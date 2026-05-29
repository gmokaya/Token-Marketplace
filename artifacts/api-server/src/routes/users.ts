import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/users/me", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json(user);
});

router.patch("/users/me", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const { name, company, tier } = req.body as { name?: string; company?: string; tier?: string };

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);

  if (!existing) {
    if (!name || !tier) return res.status(400).json({ error: "name and tier are required for new users" });
    const [created] = await db.insert(usersTable).values({
      clerkId,
      name,
      email: req.body.email ?? `${clerkId}@placeholder.wrs`,
      tier: tier as "PRODUCER" | "OFF_TAKER" | "ENABLER" | "FINANCIER",
      company: company ?? null,
    }).returning();
    return res.json(created);
  }

  const updateData: Partial<typeof usersTable.$inferInsert> = {};
  if (name !== undefined) updateData.name = name;
  if (company !== undefined) updateData.company = company;
  if (tier !== undefined) {
    return res.status(403).json({ error: "Tier cannot be changed after initial registration" });
  }

  const [updated] = await db.update(usersTable).set(updateData).where(eq(usersTable.clerkId, clerkId)).returning();
  return res.json(updated);
});

router.get("/users/:userId", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      company: usersTable.company,
      tier: usersTable.tier,
      reputationScore: usersTable.reputationScore,
      kybStatus: usersTable.kybStatus,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json(user);
});

export default router;
