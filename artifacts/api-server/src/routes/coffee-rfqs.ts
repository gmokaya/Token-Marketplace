/**
 * Coffee RFQ (Request for Quotation) routes
 *
 * GET    /coffee/rfqs                       — list RFQs where I am owner/buyer
 * POST   /coffee/rfqs                       — create internal RFQ (buyer POV)
 * GET    /coffee/rfqs/:rfqId                — RFQ detail + messages + quotations
 * POST   /coffee/rfqs/:rfqId/messages       — send a message
 * POST   /coffee/rfqs/:rfqId/quotations     — factory submits a quotation
 * PATCH  /coffee/rfqs/:rfqId/status         — update RFQ status
 * PATCH  /coffee/rfqs/:rfqId/quotations/:qId/status — accept/reject quotation
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
  // Coffee-specific RFQ fields
  preferredProcessingMethod: z.string().optional(),
  preferredVarietal:         z.string().optional(),
  targetCuppingScore:        z.number().min(0).max(100).optional(),
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
  // Coffee-specific quotation fields
  cuppingScore:       z.number().min(0).max(100).optional(),
  processingMethod:   z.string().optional(),
  varietal:           z.string().optional(),
});

// ── Helper ────────────────────────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user ?? null;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /coffee/rfqs
router.get("/coffee/rfqs", async (req, res): Promise<void> => {
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

// POST /coffee/rfqs
router.post("/coffee/rfqs", async (req, res): Promise<void> => {
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

  const { preferredProcessingMethod, preferredVarietal, targetCuppingScore, ...rest } = parsed.data;

  // Pack coffee-specific fields into message context
  const coffeeContext = [
    preferredProcessingMethod && `Processing: ${preferredProcessingMethod}`,
    preferredVarietal && `Varietal: ${preferredVarietal}`,
    targetCuppingScore != null && `Target cupping score: ${targetCuppingScore}`,
  ].filter(Boolean).join("; ");

  const finalMessage = coffeeContext
    ? `${rest.message || ""}\n\n[Coffee Preferences] ${coffeeContext}`.trim()
    : rest.message;

  const [rfq] = await db
    .insert(teaRfqsTable)
    .values({
      ...rest,
      message: finalMessage,
      buyerId: user.id,
      ownerId: ownerId ?? undefined,
      requestedQuantityKg:    parsed.data.requestedQuantityKg?.toString(),
      requestedPriceUsdPerKg: parsed.data.requestedPriceUsdPerKg?.toString(),
    })
    .returning();

  res.status(201).json(rfq);
});

// GET /coffee/rfqs/:rfqId
router.get("/coffee/rfqs/:rfqId", async (req, res): Promise<void> => {
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

// POST /coffee/rfqs/:rfqId/messages
router.post("/coffee/rfqs/:rfqId/messages", async (req, res): Promise<void> => {
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

// POST /coffee/rfqs/:rfqId/quotations
router.post("/coffee/rfqs/:rfqId/quotations", async (req, res): Promise<void> => {
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

  const { cuppingScore, processingMethod, varietal, ...rest } = parsed.data;

  // Append coffee-specific details to notes
  const coffeeNotes = [
    cuppingScore != null && `Cupping score: ${cuppingScore}`,
    processingMethod && `Processing: ${processingMethod}`,
    varietal && `Varietal: ${varietal}`,
  ].filter(Boolean).join("; ");

  const finalNotes = coffeeNotes
    ? `${rest.notes || ""}\n\n[Coffee Details] ${coffeeNotes}`.trim()
    : rest.notes;

  const [quotation] = await db
    .insert(teaQuotationsTable)
    .values({
      rfqId,
      quotedByUserId: user.id,
      offerPriceUsdPerKg: rest.offerPriceUsdPerKg.toString(),
      offerQuantityKg:    rest.offerQuantityKg.toString(),
      incoterms:          rest.incoterms,
      leadTimeDays:       rest.leadTimeDays,
      validUntil:         rest.validUntil ? new Date(rest.validUntil) : undefined,
      notes:              finalNotes,
      commercialPitch:    rest.commercialPitch,
    })
    .returning();

  // Move RFQ to "quoted" if still open
  await db
    .update(teaRfqsTable)
    .set({ status: "quoted", updatedAt: new Date() })
    .where(and(eq(teaRfqsTable.id, rfqId), eq(teaRfqsTable.status, "open")));

  res.status(201).json(quotation);
});

// PATCH /coffee/rfqs/:rfqId/status
router.patch("/coffee/rfqs/:rfqId/status", async (req, res): Promise<void> => {
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

// PATCH /coffee/rfqs/:rfqId/quotations/:qId/status
router.patch("/coffee/rfqs/:rfqId/quotations/:qId/status", async (req, res): Promise<void> => {
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
