import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "gnyakundi@trevitagroup.com";

const router = Router();

router.get("/users/me", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (user) return res.json(user);

  try {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    const primaryEmail =
      clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)
      ?? clerkUser.emailAddresses[0];
    const email = primaryEmail?.emailAddress.trim().toLowerCase();
    const primaryPhone =
      clerkUser.phoneNumbers.find((phone) => phone.id === clerkUser.primaryPhoneNumberId)
      ?? clerkUser.phoneNumbers[0];
    const phone = primaryPhone?.phoneNumber;
    const hasVerifiedEmail = Boolean(email && primaryEmail?.verification?.status === "verified");
    const hasVerifiedPhone = Boolean(phone && primaryPhone?.verification?.status === "verified");

    if (!hasVerifiedEmail && !hasVerifiedPhone) {
      return res.status(403).json({ error: "A verified email address or phone number is required" });
    }

    // Preserve previously assigned roles when the same verified Clerk identity
    // receives a new Clerk user ID (for example, after moving between instances).
    const existingByEmail = hasVerifiedEmail
      ? (await db.select().from(usersTable).where(eq(usersTable.email, email!)).limit(1))[0]
      : undefined;

    if (existingByEmail) {
      const [linked] = await db
        .update(usersTable)
        .set({ clerkId })
        .where(eq(usersTable.id, existingByEmail.id))
        .returning();
      return res.json(linked);
    }

    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim()
      || clerkUser.username
      || (hasVerifiedEmail ? email!.split("@")[0] : null)
      || phone
      || "Marketplace member";
    const accountEmail = hasVerifiedEmail ? email! : `${clerkId}@phone.tokenharvest.local`;

    const [created] = await db
      .insert(usersTable)
      .values({
        clerkId,
        name,
        email: accountEmail,
        phone: phone ?? null,
        tier: email === ADMIN_EMAIL ? "ADMIN" : "OFF_TAKER",
      })
      .returning();

    return res.status(201).json(created);
  } catch (error) {
    req.log?.error({ err: error, clerkId }, "Could not provision signed-in user");
    return res.status(500).json({ error: "Could not provision user account" });
  }
});

router.patch("/users/me", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const { name, company, tier, phone, nationalId } = req.body as {
    name?: string; company?: string; tier?: string; phone?: string; nationalId?: string;
  };

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);

  if (!existing) {
    if (!name || !tier) return res.status(400).json({ error: "name and tier are required for new users" });
    const [created] = await db.insert(usersTable).values({
      clerkId,
      name,
      email: req.body.email ?? `${clerkId}@placeholder.wrs`,
      tier: tier as "PRODUCER" | "OFF_TAKER" | "ENABLER" | "FINANCIER" | "COOPERATIVE" | "ADMIN",
      company: company ?? null,
      phone: phone ?? null,
      nationalId: nationalId ?? null,
    }).returning();
    return res.json(created);
  }

  const updateData: Partial<typeof usersTable.$inferInsert> = {};
  if (name !== undefined) updateData.name = name;
  if (company !== undefined) updateData.company = company;
  if (phone !== undefined) updateData.phone = phone;
  if (nationalId !== undefined) updateData.nationalId = nationalId;
  if (tier !== undefined) {
    return res.status(403).json({ error: "Tier cannot be changed after initial registration" });
  }

  const [updated] = await db.update(usersTable).set(updateData).where(eq(usersTable.clerkId, clerkId)).returning();
  return res.json(updated);
});

// ── GET /users/brokers — list all ENABLER-tier users for mandate picker ────────
router.get("/users/brokers", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const brokers = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      company: usersTable.company,
      tier: usersTable.tier,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.tier, "ENABLER"));

  return res.json(brokers);
});

router.get("/users/:userId", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

  const [user] = await db
    .select({
      id: usersTable.id,
      clerkId: usersTable.clerkId,
      name: usersTable.name,
      email: usersTable.email,
      company: usersTable.company,
      tier: usersTable.tier,
      reputationScore: usersTable.reputationScore,
      kybStatus: usersTable.kybStatus,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json(user);
});

export default router;
