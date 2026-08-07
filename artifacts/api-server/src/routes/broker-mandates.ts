/**
 * Broker Mandate routes
 *
 * POST   /broker-mandates              — owner grants a mandate to a broker
 * GET    /broker-mandates/my           — broker's mandates (as broker)
 * GET    /broker-mandates/given        — owner's granted mandates (as owner)
 * DELETE /broker-mandates/:id          — owner revokes a mandate
 *
 * POST   /broker-mandates/request      — broker creates a shareable mandate-request token
 * GET    /broker-mandates/requests     — broker views their pending/past mandate requests
 * POST   /broker-mandates/confirm      — producer confirms a mandate request via API key
 * DELETE /broker-mandates/requests/:id — broker cancels a pending mandate request
 */

import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, withTxRetry } from "@workspace/db";
import { brokerMandatesTable, usersTable, mandateRequestsTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";

const router = Router();

// ── Zod schemas ─────────────────────────────────────────────────────────────────

const createMandateSchema = z.object({
  brokerId: z.number().int().positive(),
  commodityType: z.enum(["MAIZE", "RICE", "COFFEE", "TEA", "AVOCADO"]),
  permissions: z.array(z.string()).default(["list", "accept_bids", "negotiate", "set_reserve"]),
  commissionRateOverride: z.number().min(0).max(1).optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
});

const createRequestSchema = z.object({
  commodityType: z.enum(["MAIZE", "RICE", "COFFEE", "TEA", "AVOCADO"]),
  note: z.string().max(500).optional(),
  /** How many days before the token expires (default 7, max 30) */
  expiryDays: z.number().int().min(1).max(30).default(7),
});

const confirmRequestSchema = z.object({
  token: z.string().min(1),
  permissions: z
    .array(z.string())
    .default(["list", "accept_bids", "negotiate", "set_reserve"]),
  commissionRateOverride: z.number().min(0).max(1).optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
});

// ── Helpers ─────────────────────────────────────────────────────────────────────

async function resolveUserByClerkId(clerkId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);
  return user ?? null;
}

/**
 * Resolve the current caller from either Clerk session or API key.
 * The __apiKeyUser is set by apiKeyPreAuth middleware in routes/index.ts.
 */
function resolveCurrentUser(req: any) {
  if (req.__apiKeyUser?.user) return req.__apiKeyUser.user;
  return null; // caller must use getAuth(req) for Clerk
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /broker-mandates  — owner grants a mandate directly (existing flow)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/broker-mandates", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const user = await resolveUserByClerkId(clerkId);
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

  const user = await resolveUserByClerkId(clerkId);
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

  const user = await resolveUserByClerkId(clerkId);
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

  const user = await resolveUserByClerkId(clerkId);
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /broker-mandates/request
// Broker generates a mandate-request token to share with a producer.
// Auth: Clerk session (broker must be ENABLER tier)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/broker-mandates/request", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const user = await resolveUserByClerkId(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.tier !== "ENABLER") {
    return res.status(403).json({
      error: "Only ENABLER-tier (broker) accounts can create mandate requests",
    });
  }

  const parsed = createRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const { commodityType, note, expiryDays } = parsed.data;
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const [request] = await db
    .insert(mandateRequestsTable)
    .values({
      brokerId: user.id,
      commodityType,
      token,
      status: "PENDING",
      expiresAt,
      note: note ?? null,
    })
    .returning();

  return res.status(201).json({
    ...request,
    brokerName: user.name,
    /**
     * Producers call:
     *   POST /api/broker-mandates/confirm
     *   X-Api-Key: <their API key>
     *   { "token": "<token>" }
     */
    confirmInstructions: {
      endpoint: "POST /api/broker-mandates/confirm",
      authHeader: "X-Api-Key: <your API key>",
      body: { token },
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /broker-mandates/requests
// Broker lists their mandate requests (all statuses, newest first).
// Auth: Clerk session
// ─────────────────────────────────────────────────────────────────────────────
router.get("/broker-mandates/requests", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const user = await resolveUserByClerkId(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const requests = await db
    .select()
    .from(mandateRequestsTable)
    .where(eq(mandateRequestsTable.brokerId, user.id))
    .orderBy(mandateRequestsTable.createdAt);

  // Mark expired pending requests
  const now = new Date();
  const enriched = requests.map((r) => ({
    ...r,
    status:
      r.status === "PENDING" && new Date(r.expiresAt) < now ? "EXPIRED" : r.status,
  }));

  return res.json(enriched.reverse());
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /broker-mandates/confirm
// Producer confirms a mandate request using the token shared by the broker.
//
// Auth: Clerk session OR API key with the "mandates:confirm" scope.
// API-key callers that lack the scope are rejected with 403.
//
// Concurrency safety: the confirmation is fully atomic. The mandate_requests
// row is transitioned from PENDING → CONFIRMED with a conditional UPDATE inside
// a transaction. If the row was already claimed by a concurrent request the
// UPDATE returns no rows and the transaction aborts — no duplicate mandate
// can be created and no orphaned mandate_request row can exist.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/broker-mandates/confirm", async (req, res) => {
  // ── Resolve caller ──────────────────────────────────────────────────────────
  // API key takes priority over Clerk session.
  const apiKeyCtx = (req as any).__apiKeyUser as
    | { cred: { scopes: string[] }; user: typeof usersTable.$inferSelect }
    | undefined;

  let caller: typeof usersTable.$inferSelect | null = null;

  if (apiKeyCtx) {
    // Enforce the dedicated mandate-confirm scope
    if (!apiKeyCtx.cred.scopes.includes("mandates:confirm")) {
      return res.status(403).json({
        error:
          "This API key does not have the 'mandates:confirm' scope. " +
          "Create or update your integration credential to include it.",
      });
    }
    caller = apiKeyCtx.user;
  } else {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
    caller = await resolveUserByClerkId(clerkId);
  }

  if (!caller) return res.status(404).json({ error: "User not found" });

  if (!["PRODUCER", "COOPERATIVE"].includes(caller.tier)) {
    return res.status(403).json({
      error: "Only PRODUCER or COOPERATIVE accounts can confirm mandate requests",
    });
  }

  const parsed = confirmRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const { token, permissions, commissionRateOverride, validFrom, validTo } = parsed.data;

  // ── Pre-flight: look up the request (outside the transaction for a fast early exit) ──
  const [mandateReq] = await db
    .select()
    .from(mandateRequestsTable)
    .where(eq(mandateRequestsTable.token, token))
    .limit(1);

  if (!mandateReq) {
    return res.status(404).json({
      error: "Mandate request not found. Check the token and try again.",
    });
  }
  if (mandateReq.status === "CANCELLED") {
    return res.status(409).json({
      error: "This mandate request has been cancelled by the broker.",
    });
  }
  if (mandateReq.status === "CONFIRMED") {
    return res.status(409).json({
      error: "This mandate request has already been confirmed.",
    });
  }
  if (new Date(mandateReq.expiresAt) < new Date()) {
    return res.status(410).json({
      error: "This mandate request has expired. Ask the broker to generate a new one.",
    });
  }

  // ── Atomic confirmation transaction ─────────────────────────────────────────
  // Uses withTxRetry to handle transient serialization/deadlock errors.
  // Inside the transaction we:
  //   1. Claim the request with a conditional UPDATE (PENDING + not expired only).
  //      If the UPDATE touches 0 rows, another concurrent caller won the race —
  //      we abort with a sentinel error.
  //   2. Enforce duplicate-mandate invariant.
  //   3. Insert the mandate.
  //   4. Back-patch confirmedMandateId onto the request row.
  //
  // Steps 1-4 are all-or-nothing. No partial state can escape the transaction.

  const ALREADY_CLAIMED = "MANDATE_REQUEST_ALREADY_CLAIMED";
  const DUPLICATE_MANDATE = "MANDATE_DUPLICATE_ACTIVE";

  const callerSnapshot = caller; // stable capture for the closure

  let txResult: {
    mandate: typeof brokerMandatesTable.$inferSelect;
    brokerId: number;
  };

  try {
    txResult = await withTxRetry(() =>
      db.transaction(async (tx) => {
        // Serializable isolation prevents two concurrent confirmations for
        // different tokens covering the same (owner, broker, commodity) from
        // both passing the duplicate-mandate check and both inserting.
        // PostgreSQL aborts one with 40001; withTxRetry retries it, and on
        // retry the surviving mandate is found → DUPLICATE_MANDATE is thrown.
        await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

        const now = new Date();

        // Step 1: Atomically claim the pending request.
        const [claimed] = await tx
          .update(mandateRequestsTable)
          .set({ status: "CONFIRMED", confirmedAt: now })
          .where(
            and(
              eq(mandateRequestsTable.token, token),
              eq(mandateRequestsTable.status, "PENDING"),
              gt(mandateRequestsTable.expiresAt, now),
            )
          )
          .returning();

        if (!claimed) {
          // Another concurrent request already confirmed/expired this token.
          throw new Error(ALREADY_CLAIMED);
        }

        // Step 2: Enforce no duplicate active mandate for this owner+broker+commodity.
        const existing = await tx
          .select()
          .from(brokerMandatesTable)
          .where(
            and(
              eq(brokerMandatesTable.ownerId, callerSnapshot.id),
              eq(brokerMandatesTable.brokerId, claimed.brokerId),
              eq(brokerMandatesTable.commodityType, claimed.commodityType),
              eq(brokerMandatesTable.revoked, false),
            )
          );

        const hasActive = existing.some((m) => {
          const from = m.validFrom ? new Date(m.validFrom) : null;
          const to = m.validTo ? new Date(m.validTo) : null;
          return (from === null || from <= now) && (to === null || to > now);
        });

        if (hasActive) {
          throw new Error(DUPLICATE_MANDATE);
        }

        // Step 3: Insert the mandate.
        const [mandate] = await tx
          .insert(brokerMandatesTable)
          .values({
            ownerId: callerSnapshot.id,
            brokerId: claimed.brokerId,
            commodityType: claimed.commodityType,
            permissions,
            commissionRateOverride:
              commissionRateOverride != null ? String(commissionRateOverride) : undefined,
            validFrom: validFrom ? new Date(validFrom) : now,
            validTo: validTo ? new Date(validTo) : undefined,
            revoked: false,
          })
          .returning();

        // Step 4: Back-patch the confirmedMandateId.
        await tx
          .update(mandateRequestsTable)
          .set({ confirmedMandateId: mandate.id })
          .where(eq(mandateRequestsTable.id, claimed.id));

        return { mandate, brokerId: claimed.brokerId };
      })
    );
  } catch (err: any) {
    if (err?.message === ALREADY_CLAIMED) {
      return res.status(409).json({
        error: "This mandate request has already been confirmed or expired (concurrent request).",
      });
    }
    if (err?.message === DUPLICATE_MANDATE) {
      return res.status(409).json({
        error: "An active mandate already exists between you and this broker for this commodity.",
      });
    }
    throw err; // re-throw unexpected errors
  }

  // Enrich response with broker name (outside transaction — read-only).
  const [broker] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, txResult.brokerId))
    .limit(1);

  return res.status(201).json({
    ...txResult.mandate,
    brokerName: broker?.name ?? null,
    ownerName: callerSnapshot.name,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /broker-mandates/requests/:id
// Broker cancels a pending mandate request.
//
// Concurrency safety: the UPDATE is conditional on status = 'PENDING'. If a
// producer confirmed the request between our pre-flight read and this UPDATE,
// the UPDATE touches 0 rows and we return 409 instead of overwriting the
// CONFIRMED status with CANCELLED.
// Auth: Clerk session
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/broker-mandates/requests/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const requestId = parseInt(req.params.id, 10);
  if (isNaN(requestId)) return res.status(400).json({ error: "Invalid request ID" });

  const user = await resolveUserByClerkId(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Pre-flight: verify ownership and surface a clear error for non-existent/unowned requests.
  const [mandateReq] = await db
    .select()
    .from(mandateRequestsTable)
    .where(eq(mandateRequestsTable.id, requestId))
    .limit(1);

  if (!mandateReq) return res.status(404).json({ error: "Mandate request not found" });
  if (mandateReq.brokerId !== user.id) {
    return res.status(403).json({ error: "Only the broker who created this request can cancel it" });
  }

  // Atomic conditional UPDATE: only transitions PENDING → CANCELLED.
  // If a producer confirmed the request concurrently, this UPDATE touches 0
  // rows (status is no longer PENDING) and we return 409.
  const [cancelled] = await db
    .update(mandateRequestsTable)
    .set({ status: "CANCELLED" })
    .where(
      and(
        eq(mandateRequestsTable.id, requestId),
        eq(mandateRequestsTable.status, "PENDING"),
      )
    )
    .returning();

  if (!cancelled) {
    // Re-fetch to report the actual current status.
    const [current] = await db
      .select({ status: mandateRequestsTable.status })
      .from(mandateRequestsTable)
      .where(eq(mandateRequestsTable.id, requestId))
      .limit(1);
    return res.status(409).json({
      error: `Cannot cancel: request is already '${current?.status ?? "unknown"}'.`,
    });
  }

  return res.json(cancelled);
});

export default router;
