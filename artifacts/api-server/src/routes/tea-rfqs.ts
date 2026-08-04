/**
 * Tea RFQ (Request for Quotation) routes
 *
 * GET    /tea/rfqs                       — list RFQs where I am owner
 * POST   /tea/rfqs                       — create internal RFQ (buyer POV)
 * POST   /tea/rfqs/inbound               — inbound webhook from external Marketplace
 * GET    /tea/rfqs/:rfqId                — RFQ detail + messages + quotations
 * POST   /tea/rfqs/:rfqId/messages       — send a message
 * POST   /tea/rfqs/:rfqId/quotations     — factory submits a quotation
 * PATCH  /tea/rfqs/:rfqId/status         — update RFQ status
 * PATCH  /tea/rfqs/:rfqId/quotations/:qId/status — accept/reject quotation
 */

import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  teaRfqsTable, teaRfqMessagesTable, teaQuotationsTable,
  usersTable, teaLotsTable,
} from "@workspace/db";
import { eq, and, desc, or } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// ── Validation ────────────────────────────────────────────────────────────────

const createRfqSchema = z.object({
  lotId:                    z.number().int().positive().optional(),
  buyerCompany:             z.string().optional(),
  buyerEmail:               z.string().email().optional(),
  requestedQuantityKg:      z.number().positive().optional(),
  requestedPriceUsdPerKg:   z.number().positive().optional(),
  message:                  z.string().optional(),
  preferredIncoterms:       z.string().optional(),
  requestedShipmentDate:    z.string().optional(),
});

const inboundRfqSchema = z.object({
  eventId:            z.string(),
  eventType:          z.string(),
  occurredAt:         z.string(),
  source:             z.string(),
  correlation: z.object({
    externalListingId: z.string(),
    listingId:         z.string().optional(),
  }),
  data: z.object({
    externalRfqId:          z.string(),
    buyerCompany:           z.string().optional(),
    requestedQuantityKg:    z.number().optional(),
    requestedPriceUsdPerKg: z.number().optional(),
    message:                z.string().optional(),
  }),
});

const messageSchema = z.object({
  content:     z.string().min(1),
  senderRole:  z.enum(["factory", "buyer"]).default("factory"),
  attachments: z.array(z.object({ fileName: z.string(), fileUrl: z.string() })).default([]),
});

const quotationSchema = z.object({
  offerPriceUsdPerKg: z.number().positive(),
  offerQuantityKg:    z.number().positive(),
  incoterms:          z.string().optional(),
  leadTimeDays:       z.number().int().positive().optional(),
  validUntil:         z.string().optional(),
  notes:              z.string().optional(),
  commercialPitch:    z.string().optional(),
});

// ── Helper ────────────────────────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user ?? null;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /tea/rfqs — list RFQs where I am owner
router.get("/tea/rfqs", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const rfqs = await db
    .select()
    .from(teaRfqsTable)
    .where(or(
      eq(teaRfqsTable.ownerId, user.id),
      eq(teaRfqsTable.buyerId, user.id),
    ))
    .orderBy(desc(teaRfqsTable.createdAt));

  res.json(rfqs);
});

// POST /tea/rfqs — create internal RFQ
router.post("/tea/rfqs", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const parsed = createRfqSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  // If lotId given, find the lot owner
  let ownerId: number | null = null;
  if (parsed.data.lotId) {
    const [lot] = await db.select().from(teaLotsTable).where(eq(teaLotsTable.id, parsed.data.lotId));
    if (lot) ownerId = lot.ownerId;
  }

  const [rfq] = await db
    .insert(teaRfqsTable)
    .values({
      ...parsed.data,
      buyerId: user.id,
      ownerId: ownerId ?? undefined,
      requestedQuantityKg:    parsed.data.requestedQuantityKg?.toString(),
      requestedPriceUsdPerKg: parsed.data.requestedPriceUsdPerKg?.toString(),
    })
    .returning();

  res.status(201).json(rfq);
});

// POST /tea/rfqs/inbound — webhook from external Marketplace (no user auth, event-driven)
router.post("/tea/rfqs/inbound", async (req, res): Promise<void> => {
  // TODO: verify webhook signature from Marketplace
  const parsed = inboundRfqSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid event payload", details: parsed.error.flatten() });
    return;
  }

  const { eventId, data, correlation } = parsed.data;

  // Deduplicate by eventId
  const [existing] = await db
    .select({ id: teaRfqsTable.id })
    .from(teaRfqsTable)
    .where(eq(teaRfqsTable.eventId, eventId));

  if (existing) {
    res.json({ deduplicated: true, rfqId: existing.id });
    return;
  }

  const lotId = correlation.listingId ? parseInt(correlation.listingId, 10) : null;

  const [rfq] = await db
    .insert(teaRfqsTable)
    .values({
      lotId:                  lotId ?? undefined,
      buyerCompany:           data.buyerCompany,
      externalRfqId:          data.externalRfqId,
      externalListingId:      correlation.externalListingId,
      eventId,
      requestedQuantityKg:    data.requestedQuantityKg?.toString(),
      requestedPriceUsdPerKg: data.requestedPriceUsdPerKg?.toString(),
      message:                data.message,
      status:                 "open",
    })
    .returning();

  res.status(201).json(rfq);
});

// GET /tea/rfqs/:rfqId — detail with messages and quotations
router.get("/tea/rfqs/:rfqId", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const rfqId = parseInt(req.params.rfqId, 10);
  if (isNaN(rfqId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [rfq] = await db
    .select()
    .from(teaRfqsTable)
    .where(and(
      eq(teaRfqsTable.id, rfqId),
      or(eq(teaRfqsTable.ownerId, user.id), eq(teaRfqsTable.buyerId, user.id)),
    ));

  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }

  const [messages, quotations] = await Promise.all([
    db.select().from(teaRfqMessagesTable).where(eq(teaRfqMessagesTable.rfqId, rfqId)).orderBy(teaRfqMessagesTable.createdAt),
    db.select().from(teaQuotationsTable).where(eq(teaQuotationsTable.rfqId, rfqId)).orderBy(desc(teaQuotationsTable.createdAt)),
  ]);

  res.json({ ...rfq, messages, quotations });
});

// POST /tea/rfqs/:rfqId/messages — send message
router.post("/tea/rfqs/:rfqId/messages", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const rfqId = parseInt(req.params.rfqId, 10);
  if (isNaN(rfqId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const [msg] = await db
    .insert(teaRfqMessagesTable)
    .values({ rfqId, senderId: user.id, ...parsed.data })
    .returning();

  res.status(201).json(msg);
});

// POST /tea/rfqs/:rfqId/quotations — factory submits quotation
router.post("/tea/rfqs/:rfqId/quotations", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const rfqId = parseInt(req.params.rfqId, 10);
  if (isNaN(rfqId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = quotationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const [quotation] = await db
    .insert(teaQuotationsTable)
    .values({
      rfqId,
      quotedByUserId: user.id,
      offerPriceUsdPerKg: parsed.data.offerPriceUsdPerKg.toString(),
      offerQuantityKg:    parsed.data.offerQuantityKg.toString(),
      incoterms:          parsed.data.incoterms,
      leadTimeDays:       parsed.data.leadTimeDays,
      validUntil:         parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined,
      notes:              parsed.data.notes,
      commercialPitch:    parsed.data.commercialPitch,
    })
    .returning();

  // Move RFQ to "quoted" if still open
  await db
    .update(teaRfqsTable)
    .set({ status: "quoted", updatedAt: new Date() })
    .where(and(eq(teaRfqsTable.id, rfqId), eq(teaRfqsTable.status, "open")));

  res.status(201).json(quotation);
});

// PATCH /tea/rfqs/:rfqId/status — update RFQ status
router.patch("/tea/rfqs/:rfqId/status", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const rfqId = parseInt(req.params.rfqId, 10);
  if (isNaN(rfqId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { status } = z.object({ status: z.enum(["open","quoted","negotiating","accepted","rejected","expired","converted"]) }).parse(req.body);

  const [updated] = await db
    .update(teaRfqsTable)
    .set({ status, updatedAt: new Date() })
    .where(and(
      eq(teaRfqsTable.id, rfqId),
      or(eq(teaRfqsTable.ownerId, user.id), eq(teaRfqsTable.buyerId, user.id)),
    ))
    .returning();

  if (!updated) { res.status(404).json({ error: "RFQ not found" }); return; }
  res.json(updated);
});

// PATCH /tea/rfqs/:rfqId/quotations/:qId/status — accept/reject quotation
router.patch("/tea/rfqs/:rfqId/quotations/:qId/status", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const qId = parseInt(req.params.qId, 10);
  if (isNaN(qId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { status } = z.object({ status: z.enum(["accepted","rejected","expired","superseded"]) }).parse(req.body);

  const [updated] = await db
    .update(teaQuotationsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(teaQuotationsTable.id, qId))
    .returning();

  if (!updated) { res.status(404).json({ error: "Quotation not found" }); return; }
  res.json(updated);
});

export default router;
