/**
 * Tea Shipment routes
 *
 * GET    /tea/shipments              — list my shipments
 * POST   /tea/shipments              — create shipment
 * GET    /tea/shipments/:id          — detail
 * PATCH  /tea/shipments/:id          — update shipment fields
 * POST   /tea/shipments/:id/milestones — append a milestone event
 * POST   /tea/shipments/:id/docs       — attach an export document
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
});

const milestoneSchema = z.object({
  date:      z.string(),
  event:     z.string().min(1),
  location:  z.string().optional(),
  notes:     z.string().optional(),
});

const docSchema = z.object({
  docType:    z.string().min(1), // "Bill of Lading", "Certificate of Origin", etc.
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

// GET /tea/shipments
router.get("/tea/shipments", async (req, res): Promise<void> => {
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

// POST /tea/shipments
router.post("/tea/shipments", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const parsed = createShipmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const { etd, eta, ...rest } = parsed.data;
  const [shipment] = await db
    .insert(teaShipmentsTable)
    .values({
      ...rest,
      ownerId: user.id,
      etd: etd ? new Date(etd) : undefined,
      eta: eta ? new Date(eta) : undefined,
    })
    .returning();

  res.status(201).json(shipment);
});

// GET /tea/shipments/:id
router.get("/tea/shipments/:id", async (req, res): Promise<void> => {
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

// PATCH /tea/shipments/:id
router.patch("/tea/shipments/:id", async (req, res): Promise<void> => {
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

  const { etd, eta, ...rest } = parsed.data;
  const [updated] = await db
    .update(teaShipmentsTable)
    .set({
      ...rest,
      etd: etd ? new Date(etd) : undefined,
      eta: eta ? new Date(eta) : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(teaShipmentsTable.id, id), eq(teaShipmentsTable.ownerId, user.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Shipment not found" }); return; }
  res.json(updated);
});

// POST /tea/shipments/:id/milestones — append milestone to JSONB array
router.post("/tea/shipments/:id/milestones", async (req, res): Promise<void> => {
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

// POST /tea/shipments/:id/docs — attach export document
router.post("/tea/shipments/:id/docs", async (req, res): Promise<void> => {
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
