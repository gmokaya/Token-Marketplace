/**
 * Coffee Shipment routes
 *
 * GET    /coffee/shipments              — list my shipments
 * POST   /coffee/shipments              — create shipment
 * GET    /coffee/shipments/:id          — detail
 * PATCH  /coffee/shipments/:id          — update shipment fields
 * POST   /coffee/shipments/:id/milestones — append a milestone event
 * POST   /coffee/shipments/:id/docs       — attach an export document
 */

import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { teaShipmentsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// ── Validation ────────────────────────────────────────────────────────────────

const createShipmentSchema = z.object({
  lotId:           z.number().int().positive().optional(),
  rfqId:           z.number().int().positive().optional(),
  shipmentRef:     z.string().min(1),
  blNumber:        z.string().optional(),
  containerNumber: z.string().optional(),
  vesselName:      z.string().optional(),
  voyageNumber:    z.string().optional(),
  shippingLine:    z.string().optional(),
  portOfLoading:   z.string().optional(),
  portOfDischarge: z.string().optional(),
  destinationPort: z.string().optional(),
  incoterms:       z.string().optional(),
  buyerCompany:    z.string().optional(),
  buyerCountry:    z.string().optional(),
  etd:             z.string().optional(),
  eta:             z.string().optional(),
  notes:           z.string().optional(),
  // Coffee-specific shipment fields
  coffeeGrade:          z.string().optional(), // AA, AB, PB, C
  cuppingScore:         z.number().min(0).max(100).optional(),
  processingMethod:     z.string().optional(),
  phytosanitaryCertNo:  z.string().optional(),
  gcaContractRef:       z.string().optional(), // Green Coffee Association contract
});

const milestoneSchema = z.object({
  date:      z.string(),
  event:     z.string().min(1),
  location:  z.string().optional(),
  notes:     z.string().optional(),
});

const docSchema = z.object({
  docType:    z.string().min(1), // "Bill of Lading", "Phytosanitary Certificate", "ICO Certificate of Origin", etc.
  docName:    z.string().min(1),
  fileUrl:    z.string().optional(),
  issuedAt:   z.string().optional(),
  issuedBy:   z.string().optional(),
  expiryDate: z.string().optional(),
});

// ── Helper ────────────────────────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user ?? null;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /coffee/shipments
router.get("/coffee/shipments", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const shipments = await db
    .select()
    .from(teaShipmentsTable)
    .where(eq(teaShipmentsTable.ownerId, user.id))
    .orderBy(desc(teaShipmentsTable.createdAt));

  res.json(shipments);
});

// POST /coffee/shipments
router.post("/coffee/shipments", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const parsed = createShipmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const { etd, eta, coffeeGrade, cuppingScore, processingMethod, phytosanitaryCertNo, gcaContractRef, ...rest } = parsed.data;

  // Pack coffee-specific fields into notes
  const coffeeDetails = [
    coffeeGrade && `Grade: ${coffeeGrade}`,
    cuppingScore != null && `Cupping Score: ${cuppingScore}`,
    processingMethod && `Processing: ${processingMethod}`,
    phytosanitaryCertNo && `Phytosanitary Cert#: ${phytosanitaryCertNo}`,
    gcaContractRef && `GCA Contract: ${gcaContractRef}`,
  ].filter(Boolean).join("; ");

  const finalNotes = coffeeDetails
    ? `${rest.notes || ""}\n\n[Coffee Details] ${coffeeDetails}`.trim()
    : rest.notes;

  const [shipment] = await db
    .insert(teaShipmentsTable)
    .values({
      ...rest,
      notes: finalNotes,
      ownerId: user.id,
      etd: etd ? new Date(etd) : undefined,
      eta: eta ? new Date(eta) : undefined,
    })
    .returning();

  res.status(201).json(shipment);
});

// GET /coffee/shipments/:id
router.get("/coffee/shipments/:id", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [shipment] = await db
    .select()
    .from(teaShipmentsTable)
    .where(and(eq(teaShipmentsTable.id, id), eq(teaShipmentsTable.ownerId, user.id)));

  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }
  res.json(shipment);
});

// PATCH /coffee/shipments/:id
router.patch("/coffee/shipments/:id", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = createShipmentSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const { etd, eta, coffeeGrade, cuppingScore, processingMethod, phytosanitaryCertNo, gcaContractRef, ...rest } = parsed.data;

  const coffeeDetails = [
    coffeeGrade && `Grade: ${coffeeGrade}`,
    cuppingScore != null && `Cupping Score: ${cuppingScore}`,
    processingMethod && `Processing: ${processingMethod}`,
    phytosanitaryCertNo && `Phytosanitary Cert#: ${phytosanitaryCertNo}`,
    gcaContractRef && `GCA Contract: ${gcaContractRef}`,
  ].filter(Boolean).join("; ");

  const finalNotes = coffeeDetails
    ? `${rest.notes || ""}\n\n[Coffee Details] ${coffeeDetails}`.trim()
    : rest.notes;

  const [updated] = await db
    .update(teaShipmentsTable)
    .set({
      ...rest,
      ...(finalNotes !== undefined ? { notes: finalNotes } : {}),
      etd: etd ? new Date(etd) : undefined,
      eta: eta ? new Date(eta) : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(teaShipmentsTable.id, id), eq(teaShipmentsTable.ownerId, user.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Shipment not found" }); return; }
  res.json(updated);
});

// POST /coffee/shipments/:id/milestones
router.post("/coffee/shipments/:id/milestones", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = milestoneSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const [existing] = await db
    .select()
    .from(teaShipmentsTable)
    .where(and(eq(teaShipmentsTable.id, id), eq(teaShipmentsTable.ownerId, user.id)));

  if (!existing) { res.status(404).json({ error: "Shipment not found" }); return; }

  const milestones = [...(existing.milestones as any[] ?? []), { ...parsed.data, recordedAt: new Date().toISOString() }];
  const [updated] = await db
    .update(teaShipmentsTable)
    .set({ milestones, updatedAt: new Date() })
    .where(eq(teaShipmentsTable.id, id))
    .returning();

  res.status(201).json(updated);
});

// POST /coffee/shipments/:id/docs
router.post("/coffee/shipments/:id/docs", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = docSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const [existing] = await db
    .select()
    .from(teaShipmentsTable)
    .where(and(eq(teaShipmentsTable.id, id), eq(teaShipmentsTable.ownerId, user.id)));

  if (!existing) { res.status(404).json({ error: "Shipment not found" }); return; }

  const exportDocs = [...(existing.exportDocs as any[] ?? []), { ...parsed.data, attachedAt: new Date().toISOString() }];
  const [updated] = await db
    .update(teaShipmentsTable)
    .set({ exportDocs, updatedAt: new Date() })
    .where(eq(teaShipmentsTable.id, id))
    .returning();

  res.status(201).json(updated);
});

export default router;
