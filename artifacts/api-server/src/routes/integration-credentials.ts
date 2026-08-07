/**
 * Integration Credentials API
 *
 * Credential management (CRUD) — requires Clerk auth.
 * Integration push endpoints (eWR + WRSC intake) — accept X-Api-Key instead of Clerk.
 */
import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  integrationCredentialsTable,
  usersTable,
  ewrsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { generateApiKey, hashKey, hashesMatch } from "../lib/api-key";

const router = Router();

// ── Helper: resolve user from API key ─────────────────────────────────────────
export async function resolveApiKeyUser(rawKey: string) {
  if (!rawKey || !rawKey.startsWith("sk_")) return null;
  const hash = hashKey(rawKey);

  const [cred] = await db
    .select({
      id:        integrationCredentialsTable.id,
      userId:    integrationCredentialsTable.userId,
      enabled:   integrationCredentialsTable.enabled,
      expiresAt: integrationCredentialsTable.expiresAt,
      scopes:    integrationCredentialsTable.scopes,
    })
    .from(integrationCredentialsTable)
    .where(eq(integrationCredentialsTable.keyHash, hash))
    .limit(1);

  if (!cred || !cred.enabled) return null;
  if (cred.expiresAt && new Date() > cred.expiresAt) return null;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, cred.userId))
    .limit(1);

  if (!user) return null;

  // Fire-and-forget last-used update
  db.update(integrationCredentialsTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(integrationCredentialsTable.id, cred.id))
    .catch(() => {});

  return { cred, user };
}

// ── POST /integrations/credentials ────────────────────────────────────────────
const createSchema = z.object({
  name:     z.string().min(1).max(100),
  scopes:   z.array(z.enum(["ewr:push", "wrsc:intake", "mandates:confirm"])).min(1),
  expiresAt: z.string().datetime().optional(),
});

router.post("/integrations/credentials", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [caller] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!caller) return res.status(404).json({ error: "User not found" });
  if (!["PRODUCER", "ENABLER", "ADMIN"].includes(caller.tier)) {
    return res.status(403).json({ error: "Only Producers, Enablers, and Admins may manage integration credentials" });
  }

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });

  const { key, prefix, hash } = generateApiKey();

  const [created] = await db
    .insert(integrationCredentialsTable)
    .values({
      userId:    caller.id,
      name:      parsed.data.name,
      keyPrefix: prefix,
      keyHash:   hash,
      scopes:    parsed.data.scopes,
      enabled:   true,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    })
    .returning();

  // Return the plaintext key ONCE — it is never stored and cannot be retrieved again
  return res.status(201).json({
    id:        created.id,
    name:      created.name,
    keyPrefix: created.keyPrefix,
    scopes:    created.scopes,
    expiresAt: created.expiresAt,
    createdAt: created.createdAt,
    // ⚠️ Only present in the creation response
    key,
  });
});

// ── GET /integrations/credentials ─────────────────────────────────────────────
router.get("/integrations/credentials", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [caller] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!caller) return res.status(404).json({ error: "User not found" });

  const creds = await db
    .select({
      id:         integrationCredentialsTable.id,
      name:       integrationCredentialsTable.name,
      keyPrefix:  integrationCredentialsTable.keyPrefix,
      scopes:     integrationCredentialsTable.scopes,
      enabled:    integrationCredentialsTable.enabled,
      lastUsedAt: integrationCredentialsTable.lastUsedAt,
      expiresAt:  integrationCredentialsTable.expiresAt,
      createdAt:  integrationCredentialsTable.createdAt,
    })
    .from(integrationCredentialsTable)
    .where(eq(integrationCredentialsTable.userId, caller.id))
    .orderBy(integrationCredentialsTable.createdAt);

  return res.json(creds);
});

// ── DELETE /integrations/credentials/:id — revoke ─────────────────────────────
router.delete("/integrations/credentials/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [caller] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!caller) return res.status(404).json({ error: "User not found" });

  const credId = parseInt(req.params.id, 10);
  if (isNaN(credId)) return res.status(400).json({ error: "Invalid credential id" });

  const [cred] = await db
    .select({ id: integrationCredentialsTable.id, userId: integrationCredentialsTable.userId })
    .from(integrationCredentialsTable)
    .where(eq(integrationCredentialsTable.id, credId))
    .limit(1);

  if (!cred) return res.status(404).json({ error: "Credential not found" });
  if (cred.userId !== caller.id && caller.tier !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  await db
    .update(integrationCredentialsTable)
    .set({ enabled: false, updatedAt: new Date() })
    .where(eq(integrationCredentialsTable.id, credId));

  return res.json({ revoked: true });
});

// ── PATCH /integrations/credentials/:id — toggle enabled ──────────────────────
router.patch("/integrations/credentials/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [caller] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!caller) return res.status(404).json({ error: "User not found" });

  const credId = parseInt(req.params.id, 10);
  if (isNaN(credId)) return res.status(400).json({ error: "Invalid credential id" });

  const parsed = z.object({ enabled: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "enabled (boolean) required" });

  const [cred] = await db
    .select({ userId: integrationCredentialsTable.userId })
    .from(integrationCredentialsTable)
    .where(eq(integrationCredentialsTable.id, credId))
    .limit(1);

  if (!cred) return res.status(404).json({ error: "Credential not found" });
  if (cred.userId !== caller.id && caller.tier !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const [updated] = await db
    .update(integrationCredentialsTable)
    .set({ enabled: parsed.data.enabled, updatedAt: new Date() })
    .where(eq(integrationCredentialsTable.id, credId))
    .returning({
      id:        integrationCredentialsTable.id,
      enabled:   integrationCredentialsTable.enabled,
      updatedAt: integrationCredentialsTable.updatedAt,
    });

  return res.json(updated);
});

export default router;
