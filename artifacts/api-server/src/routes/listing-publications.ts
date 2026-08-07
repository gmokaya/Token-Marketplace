/**
 * Listing Publications routes
 *
 * GET  /listing-publications          — list publication records scoped to caller's lots
 *                                       (filter: lotId, factoryId — both ownership-checked)
 * POST /tea/lots/:id/publish          — atomically upsert → pending (serialised via
 *                                       ON CONFLICT … WHERE NOT IN pending/live), then
 *                                       call the MarketplaceAdapter; only the winner can settle
 * POST /tea/lots/:id/publish/retry    — reset failed → pending and re-run the adapter
 *
 * Concurrency model
 * ─────────────────
 * A unique DB index on (listing_id, marketplace_name) prevents duplicate rows.
 * The INSERT … ON CONFLICT DO UPDATE uses setWhere to only transition from a
 * non-in-flight state (NOT IN 'pending'/'live'), so if two publish requests race,
 * only ONE succeeds in setting status=pending; the other gets an empty RETURNING
 * and returns 409. The adapter call happens after the upsert, so only the winner
 * proceeds. The settlement UPDATE also guards `WHERE status = 'pending'` so a
 * stale in-flight callback cannot overwrite a newer result.
 */

import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  listingPublicationsTable,
  teaLotsTable,
  ewrsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, or, sql } from "drizzle-orm";
import { marketplaceAdapter } from "../lib/marketplaceAdapter";
import { isPublicationConstraintReady } from "../lib/publication-constraint";

const router = Router();

// ── Helper ────────────────────────────────────────────────────────────────────
async function resolveUser(clerkId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);
  return user ?? null;
}

// ── Shared adapter call — settles publication to live or failed ───────────────
// Guards on `status = 'pending'` so a stale/raced caller cannot overwrite
// a newer result that was already written by the winning concurrent request.
async function callAdapterAndSettle(
  pubId: number,
  lot: typeof teaLotsTable.$inferSelect,
  commodityType: "COFFEE" | "TEA" = "TEA",
): Promise<typeof listingPublicationsTable.$inferSelect | null> {
  try {
    const [ewr] = await db
      .select({
        id: ewrsTable.id,
        warehouseCode: ewrsTable.warehouseCode,
      })
      .from(ewrsTable)
      .where(eq(ewrsTable.id, lot.ewrId))
      .limit(1);

    // For coffee lots, unpack coffee-specific metadata from tasterRemarks JSON
    let coffeeFields: {
      cuppingRemarks?: string | null;
      processingMethod?: string | null;
      varietal?: string | null;
      altitude?: number | null;
    } = {};
    if (commodityType === "COFFEE" && lot.tasterRemarks) {
      try {
        const parsed = JSON.parse(lot.tasterRemarks);
        coffeeFields = {
          cuppingRemarks:   parsed.cuppingRemarks ?? null,
          processingMethod: parsed.processingMethod ?? null,
          varietal:         parsed.varietal ?? null,
          altitude:         parsed.altitude ?? null,
        };
      } catch {
        coffeeFields = { cuppingRemarks: lot.tasterRemarks };
      }
    }

    const result = await marketplaceAdapter.publishListing({
      lotId:              lot.id,
      ewrId:               ewr?.id,
      commodityType,
      ownerId:             lot.ownerId,
      brokerId:             lot.brokerId,
      warehouseCode:       ewr?.warehouseCode,
      grade:              lot.grade,
      gradeMark:          lot.gradeMark,
      giOrigin:           lot.giOrigin,
      netWeightKg:        lot.netWeightKg,
      listingType:        lot.listingType,
      reservePriceUsd:    lot.reservePriceUsd,
      fixedPricePerKgUsd: lot.fixedPricePerKgUsd,
      certifications:     (lot.certifications as string[]) ?? [],
      // TEA: keep tasterRemarks as-is; COFFEE: use unpacked fields
      tasterRemarks:      commodityType === "TEA" ? lot.tasterRemarks : null,
      ...coffeeFields,
    });

    if (result.success) {
      const [updated] = await db
        .update(listingPublicationsTable)
        .set({
          status:            "live",
          externalListingId: result.externalListingId ?? null,
          lastSuccessAt:     new Date(),
          lastError:         null,
          updatedAt:         new Date(),
        })
        // Only settle if still pending — prevents stale settler overwriting a newer result
        .where(and(
          eq(listingPublicationsTable.id, pubId),
          eq(listingPublicationsTable.status, "pending"),
        ))
        .returning();
      return updated ?? null;
    } else {
      const [updated] = await db
        .update(listingPublicationsTable)
        .set({
          status:    "failed",
          lastError: result.error ?? "Unknown adapter error",
          updatedAt: new Date(),
        })
        .where(and(
          eq(listingPublicationsTable.id, pubId),
          eq(listingPublicationsTable.status, "pending"),
        ))
        .returning();
      return updated ?? null;
    }
  } catch (err: any) {
    const [updated] = await db
      .update(listingPublicationsTable)
      .set({
        status:    "failed",
        lastError: err?.message ?? "Unexpected error calling marketplace adapter",
        updatedAt: new Date(),
      })
      .where(and(
        eq(listingPublicationsTable.id, pubId),
        eq(listingPublicationsTable.status, "pending"),
      ))
      .returning();
    return updated ?? null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /listing-publications
// Query params:
//   lotId      — filter by tea lot (caller must own/broker the lot)
//   factoryId  — filter by publisher (caller must be that user)
//
// Always scoped to lots where the authenticated caller is owner OR broker.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/listing-publications", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const caller = await resolveUser(clerkId);
  if (!caller) return res.status(404).json({ error: "User not found" });

  const { lotId, factoryId } = req.query as {
    lotId?: string;
    factoryId?: string;
  };

  // factoryId filter must match caller — prevents cross-user enumeration
  if (factoryId) {
    const id = parseInt(factoryId);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid factoryId" });
    if (id !== caller.id) {
      return res.status(403).json({ error: "You may only query publication records for your own account" });
    }
  }

  // If a lotId filter is supplied, verify caller owns/brokers that lot
  if (lotId) {
    const id = parseInt(lotId);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid lotId" });

    const [lot] = await db
      .select({ ownerId: teaLotsTable.ownerId, brokerId: teaLotsTable.brokerId })
      .from(teaLotsTable)
      .where(eq(teaLotsTable.id, id))
      .limit(1);

    if (!lot) return res.status(404).json({ error: "Tea lot not found" });
    if (lot.ownerId !== caller.id && lot.brokerId !== caller.id) {
      return res.status(403).json({ error: "You do not have access to this lot's publication records" });
    }
  }

  // Query scoped to lots where caller is owner OR broker
  const rows = await db
    .select({ pub: listingPublicationsTable })
    .from(listingPublicationsTable)
    .innerJoin(teaLotsTable, eq(teaLotsTable.id, listingPublicationsTable.listingId))
    .where(
      and(
        or(
          eq(teaLotsTable.ownerId, caller.id),
          eq(teaLotsTable.brokerId, caller.id),
        ),
        ...(lotId ? [eq(listingPublicationsTable.listingId, parseInt(lotId))] : []),
      )
    )
    .orderBy(listingPublicationsTable.createdAt);

  return res.json(rows.map((r) => r.pub));
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /tea/lots/:id/publish
//
// Concurrency-safe via ON CONFLICT DO UPDATE … setWhere:
//   • Only transitions to pending when status is NOT already pending or live.
//   • If RETURNING is empty, another request already won the race → 409.
//   • Settlement guard (WHERE status='pending') prevents a stale caller
//     from overwriting the result written by the winning concurrent request.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/tea/lots/:id/publish", async (req, res) => {
  if (!isPublicationConstraintReady()) {
    return res.status(503).json({
      error: "Marketplace publication is temporarily unavailable. The server is still initializing its database constraints. Please retry in a moment.",
    });
  }

  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const lotId = parseInt(req.params.id);
  if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [lot] = await db
    .select()
    .from(teaLotsTable)
    .where(eq(teaLotsTable.id, lotId))
    .limit(1);

  if (!lot) return res.status(404).json({ error: "Tea lot not found" });

  if (lot.ownerId !== user.id && lot.brokerId !== user.id) {
    return res.status(403).json({ error: "Only the lot owner or mandate broker can publish this lot" });
  }

  const nonPublishableStatuses = ["DRAFT", "SOLD", "UNSOLD", "WITHDRAWN", "RESERVE_NOT_MET"];
  if (nonPublishableStatuses.includes(lot.status)) {
    return res.status(409).json({
      error: `Lot in status ${lot.status} cannot be published. Catalogue the lot first.`,
    });
  }

  const now = new Date();

  // Atomic upsert → pending.
  // setWhere ensures the update only fires when the existing row is NOT already
  // in-flight (pending) or already live. If another concurrent request already
  // claimed the row, RETURNING returns empty and we return 409.
  const [publication] = await db
    .insert(listingPublicationsTable)
    .values({
      listingId:       lotId,
      factoryId:       user.id,
      marketplaceName: "tokenharvest",
      status:          "pending",
      lastAttemptAt:   now,
    })
    .onConflictDoUpdate({
      target: [listingPublicationsTable.listingId, listingPublicationsTable.marketplaceName],
      set: {
        status:        "pending",
        factoryId:     user.id,
        lastAttemptAt: now,
        lastError:     null,
        updatedAt:     now,
      },
      // Only proceed if the existing row is not already in-flight or live
      setWhere: sql`${listingPublicationsTable.status} NOT IN ('pending', 'live')`,
    })
    .returning();

  if (!publication) {
    // Another concurrent request owns this attempt — return the current state
    const [current] = await db
      .select()
      .from(listingPublicationsTable)
      .where(
        and(
          eq(listingPublicationsTable.listingId, lotId),
          eq(listingPublicationsTable.marketplaceName, "tokenharvest"),
        )
      )
      .limit(1);
    return res.status(409).json({
      error: current?.status === "live"
        ? "Lot is already live on the marketplace."
        : "A publication attempt is already in progress for this lot.",
      publication: current ?? null,
    });
  }

  const isNewRecord = publication.createdAt.getTime() === publication.updatedAt.getTime();
  const settled = await callAdapterAndSettle(publication.id, lot);

  // If settled is null the row was claimed by another concurrent settler —
  // return the row as-is (it already has the winning outcome)
  if (!settled) {
    const [current] = await db
      .select()
      .from(listingPublicationsTable)
      .where(eq(listingPublicationsTable.id, publication.id))
      .limit(1);
    return res.status(200).json(current);
  }

  return res.status(isNewRecord ? 201 : 200).json(settled);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /tea/lots/:id/publish/retry  — retry a failed publication
// ─────────────────────────────────────────────────────────────────────────────
router.post("/tea/lots/:id/publish/retry", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const lotId = parseInt(req.params.id);
  if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [lot] = await db
    .select()
    .from(teaLotsTable)
    .where(eq(teaLotsTable.id, lotId))
    .limit(1);

  if (!lot) return res.status(404).json({ error: "Tea lot not found" });

  if (lot.ownerId !== user.id && lot.brokerId !== user.id) {
    return res.status(403).json({ error: "Only the lot owner or mandate broker can retry publication" });
  }

  // Only allow retry from failed state — guard on status='failed' so concurrent
  // retries can't both proceed (one returns 409, one proceeds)
  const [pending] = await db
    .update(listingPublicationsTable)
    .set({
      status:        "pending",
      lastAttemptAt: new Date(),
      lastError:     null,
      updatedAt:     new Date(),
    })
    .where(
      and(
        eq(listingPublicationsTable.listingId, lotId),
        eq(listingPublicationsTable.marketplaceName, "tokenharvest"),
        eq(listingPublicationsTable.status, "failed"),
      )
    )
    .returning();

  if (!pending) {
    // Either no record exists, or it's not in failed state
    const [existing] = await db
      .select()
      .from(listingPublicationsTable)
      .where(
        and(
          eq(listingPublicationsTable.listingId, lotId),
          eq(listingPublicationsTable.marketplaceName, "tokenharvest"),
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "No publication record found. Use POST /tea/lots/:id/publish first." });
    }
    return res.status(409).json({
      error: `Publication is not in failed state (current: ${existing.status}). Retry is only available for failed publications.`,
      publication: existing,
    });
  }

  const settled = await callAdapterAndSettle(pending.id, lot, "TEA");
  return res.json(settled ?? pending);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /coffee/lots/:id/publish
// Mirrors the tea publish route but passes commodityType="COFFEE" to the adapter
// so the provider issues the correct TH-COFFEE-LOT-{id} external listing ID.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/coffee/lots/:id/publish", async (req, res) => {
  if (!isPublicationConstraintReady()) {
    return res.status(503).json({
      error: "Marketplace publication is temporarily unavailable. The server is still initializing its database constraints. Please retry in a moment.",
    });
  }

  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const lotId = parseInt(req.params.id);
  if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [lot] = await db
    .select()
    .from(teaLotsTable)
    .where(eq(teaLotsTable.id, lotId))
    .limit(1);

  if (!lot) return res.status(404).json({ error: "Coffee lot not found" });

  if (lot.ownerId !== user.id && lot.brokerId !== user.id) {
    return res.status(403).json({ error: "Only the lot owner or mandate broker can publish this lot" });
  }

  const nonPublishableStatuses = ["DRAFT", "SOLD", "UNSOLD", "WITHDRAWN", "RESERVE_NOT_MET"];
  if (nonPublishableStatuses.includes(lot.status)) {
    return res.status(409).json({
      error: `Lot in status ${lot.status} cannot be published. Catalogue the lot first.`,
    });
  }

  const now = new Date();

  const [publication] = await db
    .insert(listingPublicationsTable)
    .values({
      listingId:       lotId,
      factoryId:       user.id,
      marketplaceName: "tokenharvest",
      status:          "pending",
      lastAttemptAt:   now,
    })
    .onConflictDoUpdate({
      target: [listingPublicationsTable.listingId, listingPublicationsTable.marketplaceName],
      set: {
        status:        "pending",
        factoryId:     user.id,
        lastAttemptAt: now,
        lastError:     null,
        updatedAt:     now,
      },
      setWhere: sql`${listingPublicationsTable.status} NOT IN ('pending', 'live')`,
    })
    .returning();

  if (!publication) {
    const [current] = await db
      .select()
      .from(listingPublicationsTable)
      .where(
        and(
          eq(listingPublicationsTable.listingId, lotId),
          eq(listingPublicationsTable.marketplaceName, "tokenharvest"),
        )
      )
      .limit(1);
    return res.status(409).json({
      error: current?.status === "live"
        ? "Lot is already live on the marketplace."
        : "A publication attempt is already in progress for this lot.",
      publication: current ?? null,
    });
  }

  const isNewRecord = publication.createdAt.getTime() === publication.updatedAt.getTime();
  const settled = await callAdapterAndSettle(publication.id, lot, "COFFEE");

  if (!settled) {
    const [current] = await db
      .select()
      .from(listingPublicationsTable)
      .where(eq(listingPublicationsTable.id, publication.id))
      .limit(1);
    return res.status(200).json(current);
  }

  return res.status(isNewRecord ? 201 : 200).json(settled);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /coffee/lots/:id/publish/retry  — retry a failed coffee publication
// ─────────────────────────────────────────────────────────────────────────────
router.post("/coffee/lots/:id/publish/retry", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const lotId = parseInt(req.params.id);
  if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [lot] = await db
    .select()
    .from(teaLotsTable)
    .where(eq(teaLotsTable.id, lotId))
    .limit(1);

  if (!lot) return res.status(404).json({ error: "Coffee lot not found" });

  if (lot.ownerId !== user.id && lot.brokerId !== user.id) {
    return res.status(403).json({ error: "Only the lot owner or mandate broker can retry publication" });
  }

  const [pending] = await db
    .update(listingPublicationsTable)
    .set({
      status:        "pending",
      lastAttemptAt: new Date(),
      lastError:     null,
      updatedAt:     new Date(),
    })
    .where(
      and(
        eq(listingPublicationsTable.listingId, lotId),
        eq(listingPublicationsTable.marketplaceName, "tokenharvest"),
        eq(listingPublicationsTable.status, "failed"),
      )
    )
    .returning();

  if (!pending) {
    const [existing] = await db
      .select()
      .from(listingPublicationsTable)
      .where(
        and(
          eq(listingPublicationsTable.listingId, lotId),
          eq(listingPublicationsTable.marketplaceName, "tokenharvest"),
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "No publication record found. Use POST /coffee/lots/:id/publish first." });
    }
    return res.status(409).json({
      error: `Publication is not in failed state (current: ${existing.status}). Retry is only available for failed publications.`,
      publication: existing,
    });
  }

  const settled = await callAdapterAndSettle(pending.id, lot, "COFFEE");
  return res.json(settled ?? pending);
});

export default router;
