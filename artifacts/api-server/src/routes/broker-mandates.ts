/**
 * Broker Mandate routes
 *
 * POST   /broker-mandates        — owner grants a mandate to a broker
 * GET    /broker-mandates/my     — broker's active mandates (as broker)
 * GET    /broker-mandates/given  — owner's granted mandates (as owner)
 * DELETE /broker-mandates/:id    — owner revokes a mandate
 */

import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { brokerMandatesTable, usersTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// ── Zod schema ─────────────────────────────────────────────────────────────────

const createMandateSchema = z.object({
  brokerId: z.number().int().positive(),
  commodityType: z.enum(["MAIZE", "RICE", "COFFEE", "TEA", "AVOCADO"]),
  permissions: z.array(z.string()).default(["list", "accept_bids", "negotiate", "set_reserve"]),
  commissionRateOverride: z.number().min(0).max(1).optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
});

// ── Helper ─────────────────────────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);
  return user ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /broker-mandates  — owner grants a mandate
// ─────────────────────────────────────────────────────────────────────────────
router.post("/broker-mandates", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Only producers and cooperatives (owners) can grant mandates
  if (!["PRODUCER", "COOPERATIVE"].includes(user.tier)) {
    return res.status(403).json({
      error: "Only PRODUCER or COOPERATIVE accounts can grant broker mandates",
    });
  }

  const parsed = createMandateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const body = parsed.data;

  // Verify the target broker exists and is an ENABLER
  const [broker] = await db
    .select({ id: usersTable.id, tier: usersTable.tier, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, body.brokerId))
    .limit(1);

  if (!broker) return res.status(404).json({ error: "Broker user not found" });
  if (broker.tier !== "ENABLER") {
    return res.status(400).json({
      error: "Target user is not an ENABLER (broker). Mandates can only be granted to ENABLER-tier accounts.",
    });
  }

  // Check for an existing active mandate (avoid duplicates)
  // Active = not revoked, validFrom has passed, and validTo has not yet passed (or is open-ended)
  const now = new Date();
  const existing = await db
    .select()
    .from(brokerMandatesTable)
    .where(
      and(
        eq(brokerMandatesTable.ownerId, user.id),
        eq(brokerMandatesTable.brokerId, body.brokerId),
        eq(brokerMandatesTable.commodityType, body.commodityType),
        eq(brokerMandatesTable.revoked, false),
      )
    );

  const activeExisting = existing.find((m) => {
    const from = m.validFrom ? new Date(m.validFrom) : null;
    const to = m.validTo ? new Date(m.validTo) : null;
    return (from === null || from <= now) && (to === null || to > now);
  });

  if (activeExisting) {
    return res.status(409).json({
      error: "An active mandate already exists for this broker and commodity. Revoke it before creating a new one.",
      existingMandateId: activeExisting.id,
    });
  }

  const [mandate] = await db
    .insert(brokerMandatesTable)
    .values({
      ownerId: user.id,
      brokerId: body.brokerId,
      commodityType: body.commodityType,
      permissions: body.permissions,
      commissionRateOverride:
        body.commissionRateOverride != null ? String(body.commissionRateOverride) : undefined,
      validFrom: body.validFrom ? new Date(body.validFrom) : now,
      validTo: body.validTo ? new Date(body.validTo) : undefined,
      revoked: false,
    })
    .returning();

  // Enrich response with broker name
  return res.status(201).json({ ...mandate, brokerName: broker.name });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /broker-mandates/my  — broker sees mandates granted to them
// ─────────────────────────────────────────────────────────────────────────────
router.get("/broker-mandates/my", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const mandates = await db
    .select({
      id: brokerMandatesTable.id,
      ownerId: brokerMandatesTable.ownerId,
      ownerName: usersTable.name,
      brokerId: brokerMandatesTable.brokerId,
      commodityType: brokerMandatesTable.commodityType,
      permissions: brokerMandatesTable.permissions,
      commissionRateOverride: brokerMandatesTable.commissionRateOverride,
      validFrom: brokerMandatesTable.validFrom,
      validTo: brokerMandatesTable.validTo,
      revoked: brokerMandatesTable.revoked,
      revokedAt: brokerMandatesTable.revokedAt,
      createdAt: brokerMandatesTable.createdAt,
    })
    .from(brokerMandatesTable)
    .leftJoin(usersTable, eq(brokerMandatesTable.ownerId, usersTable.id))
    .where(eq(brokerMandatesTable.brokerId, user.id));

  return res.json(mandates);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /broker-mandates/given  — owner sees mandates they have granted
// ─────────────────────────────────────────────────────────────────────────────
router.get("/broker-mandates/given", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const mandates = await db
    .select({
      id: brokerMandatesTable.id,
      ownerId: brokerMandatesTable.ownerId,
      brokerId: brokerMandatesTable.brokerId,
      brokerName: usersTable.name,
      commodityType: brokerMandatesTable.commodityType,
      permissions: brokerMandatesTable.permissions,
      commissionRateOverride: brokerMandatesTable.commissionRateOverride,
      validFrom: brokerMandatesTable.validFrom,
      validTo: brokerMandatesTable.validTo,
      revoked: brokerMandatesTable.revoked,
      revokedAt: brokerMandatesTable.revokedAt,
      createdAt: brokerMandatesTable.createdAt,
    })
    .from(brokerMandatesTable)
    .leftJoin(usersTable, eq(brokerMandatesTable.brokerId, usersTable.id))
    .where(eq(brokerMandatesTable.ownerId, user.id));

  return res.json(mandates);
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /broker-mandates/:id  — owner revokes a mandate
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/broker-mandates/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const mandateId = parseInt(req.params.id);
  if (isNaN(mandateId)) return res.status(400).json({ error: "Invalid mandate ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [mandate] = await db
    .select()
    .from(brokerMandatesTable)
    .where(eq(brokerMandatesTable.id, mandateId))
    .limit(1);

  if (!mandate) return res.status(404).json({ error: "Mandate not found" });

  // Only the owner can revoke
  if (mandate.ownerId !== user.id) {
    return res.status(403).json({ error: "Only the mandate owner can revoke it" });
  }

  if (mandate.revoked) {
    return res.status(400).json({ error: "Mandate is already revoked" });
  }

  const [revoked] = await db
    .update(brokerMandatesTable)
    .set({ revoked: true, revokedAt: new Date() })
    .where(eq(brokerMandatesTable.id, mandateId))
    .returning();

  return res.json(revoked);
});

export default router;
