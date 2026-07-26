/**
 * Tea Lot Catalogue & Dispatch Document routes
 *
 * POST   /tea/lots               — broker creates a catalogue entry (mandate required)
 * GET    /tea/lots               — filterable list (grade, giOrigin, certification, listingType)
 * GET    /tea/lots/:id           — full lot detail
 * PATCH  /tea/lots/:id          — broker updates a pre-auction lot
 * POST   /tea/lots/:id/dispatch  — attach a dispatch document
 * GET    /tea/lots/:id/dispatch  — retrieve dispatch documents for a lot
 */

import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  teaLotsTable,
  brokerMandatesTable,
  teaDispatchDocsTable,
  usersTable,
  ewrsTable,
  warehouseProfilesTable,
} from "@workspace/db";
import { eq, and, SQL, or, ne } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// ── Zod validation schemas ────────────────────────────────────────────────────

const tickTierSchema = z.array(
  z.object({
    upToUsd: z.number().positive().optional(),
    above: z.boolean().optional(),
    incrementPct: z.number().positive(),
  })
);

const antiSnipeConfigSchema = z.object({
  windowSecs: z.number().int().positive().default(180),
  extensionSecs: z.number().int().positive().default(180),
  maxExtensionSecs: z.number().int().positive().default(1800),
});

const createTeaLotSchema = z.object({
  ewrId: z.number().int().positive(),
  grade: z.string().min(1),
  gradeMark: z.string().min(1),
  giOrigin: z.string().min(1),
  grossWeightKg: z.number().positive(),
  netWeightKg: z.number().positive(),
  tareWeightKg: z.number().nonnegative(),
  packageType: z.string().min(1),
  packingWeightKg: z.number().positive().optional(),
  tasterRemarks: z.string().optional(),
  certifications: z.array(z.string()).default([]),
  storageStatus: z.string().optional(),
  listingType: z.enum(["AUCTION", "FIXED_PRICE"]).default("AUCTION"),
  catalogueType: z.enum(["WITH_VALUATION", "WITHOUT_VALUATION"]).default("WITHOUT_VALUATION"),
  reservePriceUsd: z.number().positive().optional(),
  brokerValuationUsd: z.number().positive().optional(),
  fixedPricePerKgUsd: z.number().positive().optional(),
  commissionRate: z.number().min(0).max(1).default(0.01),
  tickTiers: tickTierSchema.default([]),
  antiSnipeConfig: antiSnipeConfigSchema.optional(),
  bidSecurityPct: z.number().min(0).max(1).default(0.1),
});

const updateTeaLotSchema = createTeaLotSchema
  .omit({ ewrId: true })
  .partial();

const dispatchDocSchema = z.object({
  docType: z.enum(["PRE_AUCTION_DISPATCH", "WEIGHMENT_REPORT", "DELIVERY_ORDER"]),
  docData: z.record(z.unknown()).default({}),
});

// ── Helper: look up current user ──────────────────────────────────────────────
async function resolveUser(clerkId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);
  return user ?? null;
}

// ── Helper: check for an active mandate ──────────────────────────────────────
// Active = not revoked, validFrom has passed, and validTo has not yet passed (or is open-ended)
async function getActiveMandate(brokerId: number, ownerId: number) {
  const now = new Date();
  const mandates = await db
    .select()
    .from(brokerMandatesTable)
    .where(
      and(
        eq(brokerMandatesTable.brokerId, brokerId),
        eq(brokerMandatesTable.ownerId, ownerId),
        eq(brokerMandatesTable.commodityType, "TEA"),
        eq(brokerMandatesTable.revoked, false),
      )
    );

  // Evaluate validFrom / validTo in JS to avoid dialect-specific timestamp comparisons
  const active = mandates.find((m) => {
    const from = m.validFrom ? new Date(m.validFrom) : null;
    const to = m.validTo ? new Date(m.validTo) : null;
    return (from === null || from <= now) && (to === null || to > now);
  });

  return active ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /tea/lots  — broker (ENABLER) or producer (PRODUCER) creates a lot
//   • ENABLER: mandate from eWR owner required; commission from mandate
//   • PRODUCER: must own the eWR; no mandate; commission = 0; direct listing
// ─────────────────────────────────────────────────────────────────────────────
router.post("/tea/lots", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const user = await resolveUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "ENABLER" && user.tier !== "PRODUCER") {
    return res.status(403).json({ error: "Only brokers (ENABLER) or producers (PRODUCER) can create tea lots" });
  }

  const parsed = createTeaLotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const body = parsed.data;

  // Verify the eWR exists and is a TEA eWR
  const [ewr] = await db
    .select()
    .from(ewrsTable)
    .where(eq(ewrsTable.id, body.ewrId))
    .limit(1);

  if (!ewr) return res.status(404).json({ error: "eWR not found" });
  if (ewr.commodityType !== "TEA") {
    return res.status(400).json({ error: "eWR is not a TEA commodity" });
  }

  // Ensure the eWR is in INGESTED state (available for listing)
  if (ewr.state !== "INGESTED") {
    return res.status(409).json({
      error: `eWR is not available for listing. Current state: ${ewr.state}. Only INGESTED eWRs can be used to create a new lot.`,
    });
  }

  // Guard against duplicate lots from the same eWR (any non-WITHDRAWN lot blocks re-listing)
  const [existingLot] = await db
    .select({ id: teaLotsTable.id, status: teaLotsTable.status })
    .from(teaLotsTable)
    .where(
      and(
        eq(teaLotsTable.ewrId, body.ewrId),
        ne(teaLotsTable.status, "WITHDRAWN"),
      )
    )
    .limit(1);

  if (existingLot) {
    return res.status(409).json({
      error: `An active lot (ID: ${existingLot.id}, status: ${existingLot.status}) already exists for this eWR. Withdraw the existing lot before creating a new one.`,
    });
  }

  // ── Role-specific authorisation ─────────────────────────────────────────
  let effectiveBrokerId: number;
  let commissionRate: number;

  if (user.tier === "PRODUCER") {
    // Producer must own the eWR; they act as their own agent (direct listing)
    if (ewr.ownerId !== user.id) {
      return res.status(403).json({ error: "Producers can only create lots from eWRs they own." });
    }
    effectiveBrokerId = user.id; // self-agent for direct listings
    commissionRate = 0;          // no brokerage commission on direct sales
  } else {
    // ENABLER — verify active mandate from eWR owner to this broker
    const mandate = await getActiveMandate(user.id, ewr.ownerId);
    if (!mandate) {
      return res.status(403).json({
        error: "No active TEA mandate from the eWR owner. The owner must grant a mandate before you can catalogue this lot.",
      });
    }
    effectiveBrokerId = user.id;
    commissionRate = mandate.commissionRateOverride
      ? parseFloat(mandate.commissionRateOverride)
      : body.commissionRate;
  }

  // Validate listing-type specific requirements
  if (body.listingType === "AUCTION" && !body.reservePriceUsd) {
    return res.status(400).json({ error: "reservePriceUsd is required for AUCTION lots" });
  }
  if (body.listingType === "FIXED_PRICE" && !body.fixedPricePerKgUsd) {
    return res.status(400).json({ error: "fixedPricePerKgUsd is required for FIXED_PRICE lots" });
  }

  const [lot] = await db
    .insert(teaLotsTable)
    .values({
      ewrId: body.ewrId,
      ownerId: ewr.ownerId,
      brokerId: effectiveBrokerId,
      grade: body.grade,
      gradeMark: body.gradeMark,
      giOrigin: body.giOrigin,
      grossWeightKg: String(body.grossWeightKg),
      netWeightKg: String(body.netWeightKg),
      tareWeightKg: String(body.tareWeightKg),
      packageType: body.packageType,
      packingWeightKg: body.packingWeightKg != null ? String(body.packingWeightKg) : undefined,
      tasterRemarks: body.tasterRemarks,
      certifications: body.certifications,
      storageStatus: body.storageStatus,
      listingType: body.listingType,
      catalogueType: body.catalogueType,
      reservePriceUsd: body.reservePriceUsd != null ? String(body.reservePriceUsd) : undefined,
      brokerValuationUsd: body.brokerValuationUsd != null ? String(body.brokerValuationUsd) : undefined,
      fixedPricePerKgUsd: body.fixedPricePerKgUsd != null ? String(body.fixedPricePerKgUsd) : undefined,
      commissionRate: String(commissionRate),
      tickTiers: body.tickTiers,
      antiSnipeConfig: body.antiSnipeConfig ?? { windowSecs: 180, extensionSecs: 180, maxExtensionSecs: 1800 },
      bidSecurityPct: String(body.bidSecurityPct),
      status: "DRAFT",
    })
    .returning();

  // Advance the eWR state from INGESTED → MARKET_LISTED now that it has an active lot
  await db
    .update(ewrsTable)
    .set({ state: "MARKET_LISTED", updatedAt: new Date() })
    .where(eq(ewrsTable.id, ewr.id));

  return res.status(201).json(lot);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /tea/lots  — filterable list
// ─────────────────────────────────────────────────────────────────────────────
router.get("/tea/lots", async (req, res) => {
  const { grade, giOrigin, certification, listingType, status, brokerId, ownerId } = req.query as {
    grade?: string;
    giOrigin?: string;
    certification?: string;
    listingType?: string;
    status?: string;
    brokerId?: string;
    ownerId?: string;
  };

  const conditions: SQL[] = [];
  if (grade) conditions.push(eq(teaLotsTable.grade, grade));
  if (giOrigin) conditions.push(eq(teaLotsTable.giOrigin, giOrigin));
  if (listingType)
    conditions.push(
      eq(
        teaLotsTable.listingType,
        listingType as typeof teaLotsTable.$inferSelect["listingType"]
      )
    );
  if (status)
    conditions.push(
      eq(
        teaLotsTable.status,
        status as typeof teaLotsTable.$inferSelect["status"]
      )
    );
  if (brokerId) conditions.push(eq(teaLotsTable.brokerId, parseInt(brokerId)));
  if (ownerId) conditions.push(eq(teaLotsTable.ownerId, parseInt(ownerId)));

  const rawLots = await db
    .select({
      lot: teaLotsTable,
      warehouseCode: ewrsTable.warehouseCode,
    })
    .from(teaLotsTable)
    .leftJoin(ewrsTable, eq(ewrsTable.id, teaLotsTable.ewrId))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  let lots = rawLots.map(({ lot, warehouseCode }) => ({
    ...lot,
    warehouseCode: warehouseCode ?? null,
  }));

  // Filter by certification (JSONB array contains check — done in JS to avoid dialect issues)
  if (certification) {
    lots = lots.filter((lot) => {
      const certs = lot.certifications as string[] | null;
      return Array.isArray(certs) && certs.includes(certification);
    });
  }

  return res.json(lots);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /tea/lots/:id  — full lot detail
// ─────────────────────────────────────────────────────────────────────────────
router.get("/tea/lots/:id", async (req, res) => {
  const lotId = parseInt(req.params.id);
  if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });

  const [lot] = await db
    .select()
    .from(teaLotsTable)
    .where(eq(teaLotsTable.id, lotId))
    .limit(1);

  if (!lot) return res.status(404).json({ error: "Tea lot not found" });

  // Enrich with owner and broker names
  const [owner] = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, lot.ownerId))
    .limit(1);

  const [broker] = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, lot.brokerId))
    .limit(1);

  const [ewr] = await db
    .select({
      ewrsReceiptId:     ewrsTable.ewrsReceiptId,
      commodityType:     ewrsTable.commodityType,
      weightMt:          ewrsTable.weightMt,
      harvestSeason:     ewrsTable.harvestSeason,
      state:             ewrsTable.state,
      teaProcessingType: ewrsTable.teaProcessingType,
      teaLeafGrade:      ewrsTable.teaLeafGrade,
      teaInvoiceSerial:  ewrsTable.teaInvoiceSerial,
      warehouseCode:     ewrsTable.warehouseCode,
    })
    .from(ewrsTable)
    .where(eq(ewrsTable.id, lot.ewrId))
    .limit(1);

  // Best-effort: look up a warehouse profile registered with this WRSC license/code
  const [warehouseProfile] = ewr?.warehouseCode
    ? await db
        .select({
          operatorName:            warehouseProfilesTable.operatorName,
          wrscLicenseNumber:       warehouseProfilesTable.wrscLicenseNumber,
          facilityType:            warehouseProfilesTable.facilityType,
          capacityMt:              warehouseProfilesTable.capacityMt,
          warehouseInChargeName:   warehouseProfilesTable.warehouseInChargeName,
          warehouseInChargePhone:  warehouseProfilesTable.warehouseInChargePhone,
          warehouseInChargeEmail:  warehouseProfilesTable.warehouseInChargeEmail,
          handlesTea:              warehouseProfilesTable.handlesTea,
          insurerName:             warehouseProfilesTable.insurerName,
        })
        .from(warehouseProfilesTable)
        .where(eq(warehouseProfilesTable.wrscLicenseNumber, ewr.warehouseCode))
        .limit(1)
    : [null];

  return res.json({
    ...lot,
    warehouseCode: ewr?.warehouseCode ?? null,
    ownerName:  owner?.name  ?? null,
    brokerName: broker?.name ?? null,
    ewr: ewr ?? null,
    warehouseProfile: warehouseProfile ?? null,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /tea/lots/:id  — broker updates a pre-auction lot
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/tea/lots/:id", async (req, res) => {
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

  // Only the mandate-holding broker or owner may update
  if (lot.brokerId !== user.id && lot.ownerId !== user.id) {
    return res.status(403).json({ error: "Only the mandate broker or owner can update this lot" });
  }

  // Only allow updates when lot is DRAFT or CATALOGUED
  if (!["DRAFT", "CATALOGUED"].includes(lot.status)) {
    return res.status(400).json({
      error: `Lot cannot be updated in status ${lot.status}. Only DRAFT or CATALOGUED lots may be modified.`,
    });
  }

  const parsed = updateTeaLotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const body = parsed.data;

  // Re-enforce listing-type conditional pricing invariant when either side changes
  const effectiveListingType = body.listingType ?? lot.listingType;
  const effectiveReserve = body.reservePriceUsd ?? (lot.reservePriceUsd ? parseFloat(lot.reservePriceUsd) : undefined);
  const effectiveFixed = body.fixedPricePerKgUsd ?? (lot.fixedPricePerKgUsd ? parseFloat(lot.fixedPricePerKgUsd) : undefined);

  if (effectiveListingType === "AUCTION" && !effectiveReserve) {
    return res.status(400).json({ error: "reservePriceUsd is required for AUCTION lots" });
  }
  if (effectiveListingType === "FIXED_PRICE" && !effectiveFixed) {
    return res.status(400).json({ error: "fixedPricePerKgUsd is required for FIXED_PRICE lots" });
  }

  // Detect direct (producer self-listed) lots: brokerId === ownerId
  const isDirectListing = lot.brokerId === lot.ownerId;

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body.grade !== undefined) updates.grade = body.grade;
  if (body.gradeMark !== undefined) updates.gradeMark = body.gradeMark;
  if (body.giOrigin !== undefined) updates.giOrigin = body.giOrigin;
  if (body.grossWeightKg !== undefined) updates.grossWeightKg = String(body.grossWeightKg);
  if (body.netWeightKg !== undefined) updates.netWeightKg = String(body.netWeightKg);
  if (body.tareWeightKg !== undefined) updates.tareWeightKg = String(body.tareWeightKg);
  if (body.packageType !== undefined) updates.packageType = body.packageType;
  if (body.packingWeightKg !== undefined) updates.packingWeightKg = String(body.packingWeightKg);
  if (body.tasterRemarks !== undefined) updates.tasterRemarks = body.tasterRemarks;
  if (body.certifications !== undefined) updates.certifications = body.certifications;
  if (body.storageStatus !== undefined) updates.storageStatus = body.storageStatus;
  if (body.listingType !== undefined) updates.listingType = body.listingType;
  if (body.catalogueType !== undefined) updates.catalogueType = body.catalogueType;
  if (body.reservePriceUsd !== undefined) updates.reservePriceUsd = String(body.reservePriceUsd);
  if (body.brokerValuationUsd !== undefined) updates.brokerValuationUsd = String(body.brokerValuationUsd);
  if (body.fixedPricePerKgUsd !== undefined) updates.fixedPricePerKgUsd = String(body.fixedPricePerKgUsd);
  // Lock commissionRate at 0 for direct (self-agent) listings; honour broker changes otherwise
  if (isDirectListing) {
    updates.commissionRate = "0";
  } else if (body.commissionRate !== undefined) {
    updates.commissionRate = String(body.commissionRate);
  }
  if (body.tickTiers !== undefined) updates.tickTiers = body.tickTiers;
  if (body.antiSnipeConfig !== undefined) updates.antiSnipeConfig = body.antiSnipeConfig;
  if (body.bidSecurityPct !== undefined) updates.bidSecurityPct = String(body.bidSecurityPct);

  // Status transition: DRAFT → CATALOGUED if not yet
  if (lot.status === "DRAFT" && Object.keys(updates).length > 1) {
    updates.status = "CATALOGUED";
    updates.publishedAt = new Date();
  }

  const [updated] = await db
    .update(teaLotsTable)
    .set(updates as any)
    .where(eq(teaLotsTable.id, lotId))
    .returning();

  return res.json(updated);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /tea/lots/:id/dispatch  — attach a dispatch document
// ─────────────────────────────────────────────────────────────────────────────
router.post("/tea/lots/:id/dispatch", async (req, res) => {
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

  // Only the mandate broker or owner may attach docs
  if (lot.brokerId !== user.id && lot.ownerId !== user.id) {
    return res.status(403).json({ error: "Only the mandate broker or owner can attach dispatch documents" });
  }

  const parsed = dispatchDocSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const body = parsed.data;

  // Delivery Orders can only be issued after the lot is SOLD
  if (body.docType === "DELIVERY_ORDER" && lot.status !== "SOLD") {
    return res.status(400).json({ error: "Delivery Orders can only be issued for SOLD lots" });
  }

  const [doc] = await db
    .insert(teaDispatchDocsTable)
    .values({
      lotId,
      docType: body.docType,
      submittedBy: user.id,
      docData: body.docData,
    })
    .returning();

  // If this is a pre-auction dispatch form, advance lot to DISPATCHED
  if (body.docType === "PRE_AUCTION_DISPATCH" && lot.status === "CATALOGUED") {
    await db
      .update(teaLotsTable)
      .set({ status: "DISPATCHED", updatedAt: new Date() })
      .where(eq(teaLotsTable.id, lotId));
  }

  return res.status(201).json(doc);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /tea/lots/:id/dispatch  — retrieve dispatch documents
// ─────────────────────────────────────────────────────────────────────────────
router.get("/tea/lots/:id/dispatch", async (req, res) => {
  const lotId = parseInt(req.params.id);
  if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });

  const [lot] = await db
    .select({ id: teaLotsTable.id })
    .from(teaLotsTable)
    .where(eq(teaLotsTable.id, lotId))
    .limit(1);

  if (!lot) return res.status(404).json({ error: "Tea lot not found" });

  const docs = await db
    .select({
      id: teaDispatchDocsTable.id,
      lotId: teaDispatchDocsTable.lotId,
      docType: teaDispatchDocsTable.docType,
      submittedBy: teaDispatchDocsTable.submittedBy,
      submitterName: usersTable.name,
      docData: teaDispatchDocsTable.docData,
      createdAt: teaDispatchDocsTable.createdAt,
    })
    .from(teaDispatchDocsTable)
    .leftJoin(usersTable, eq(teaDispatchDocsTable.submittedBy, usersTable.id))
    .where(eq(teaDispatchDocsTable.lotId, lotId));

  return res.json(docs);
});

export default router;
