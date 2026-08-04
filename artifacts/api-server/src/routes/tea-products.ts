/**
 * Tea Products / PIM routes
 *
 * GET    /tea/products            — list my products
 * POST   /tea/products            — create product
 * GET    /tea/products/:id        — product detail (+ passport view)
 * PATCH  /tea/products/:id        — update product
 * DELETE /tea/products/:id        — archive product
 * GET    /tea/passports/:passportId — public passport view (by stable UUID)
 */

import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { teaProductsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// ── Validation ────────────────────────────────────────────────────────────────

const createProductSchema = z.object({
  name:             z.string().min(1),
  grade:            z.string().min(1),
  region:           z.string().min(1),
  altitude:         z.string().optional(),
  cultivar:         z.string().optional(),
  harvestDate:      z.string().optional(),
  processingMethod: z.string().optional(),
  tastingNotes:     z.string().optional(),
  packageType:      z.string().optional(),
  batchInfo:        z.string().optional(),
  availableQuantityKg: z.number().positive().optional(),
  certifications:   z.array(z.string()).default([]),
  traceabilityEvents: z.array(z.object({
    date:       z.string(),
    event:      z.string(),
    location:   z.string().optional(),
    verifiedBy: z.string().optional(),
    notes:      z.string().optional(),
  })).default([]),
  esgData:          z.record(z.unknown()).default({}),
  factoryName:      z.string().optional(),
  originCountry:    z.string().default("Kenya"),
  originRegion:     z.string().optional(),
  status:           z.enum(["draft", "active", "archived"]).default("draft"),
});

const updateProductSchema = createProductSchema.partial();

// ── Helper ────────────────────────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user ?? null;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /tea/products — list caller's products
router.get("/tea/products", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const products = await db
    .select()
    .from(teaProductsTable)
    .where(eq(teaProductsTable.ownerId, user.id))
    .orderBy(desc(teaProductsTable.createdAt));

  res.json(products);
});

// POST /tea/products — create product
router.post("/tea/products", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const { availableQuantityKg, ...rest } = parsed.data;
  const [product] = await db
    .insert(teaProductsTable)
    .values({
      ...rest,
      ownerId: user.id,
      ...(availableQuantityKg != null ? { availableQuantityKg: String(availableQuantityKg) } : {}),
    })
    .returning();

  res.status(201).json(product);
});

// GET /tea/products/:id — detail
router.get("/tea/products/:id", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [product] = await db
    .select()
    .from(teaProductsTable)
    .where(eq(teaProductsTable.id, id));

  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(product);
});

// PATCH /tea/products/:id — update (owner only)
router.patch("/tea/products/:id", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const [existing] = await db
    .select()
    .from(teaProductsTable)
    .where(and(eq(teaProductsTable.id, id), eq(teaProductsTable.ownerId, user.id)));

  if (!existing) { res.status(404).json({ error: "Product not found or access denied" }); return; }

  const { availableQuantityKg: updQty, ...restUpdate } = parsed.data;
  const [updated] = await db
    .update(teaProductsTable)
    .set({
      ...restUpdate,
      updatedAt: new Date(),
      ...(updQty != null ? { availableQuantityKg: String(updQty) } : {}),
    })
    .where(eq(teaProductsTable.id, id))
    .returning();

  res.json(updated);
});

// DELETE /tea/products/:id — archive
router.delete("/tea/products/:id", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [existing] = await db
    .select()
    .from(teaProductsTable)
    .where(and(eq(teaProductsTable.id, id), eq(teaProductsTable.ownerId, user.id)));

  if (!existing) { res.status(404).json({ error: "Product not found or access denied" }); return; }

  const [archived] = await db
    .update(teaProductsTable)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(teaProductsTable.id, id))
    .returning();

  res.json(archived);
});

// GET /tea/passports/:passportId — public passport by stable UUID
router.get("/tea/passports/:passportId", async (req, res): Promise<void> => {
  const { passportId } = req.params;

  const [product] = await db
    .select()
    .from(teaProductsTable)
    .where(eq(teaProductsTable.passportId, passportId));

  if (!product || product.status === "archived") {
    res.status(404).json({ error: "Passport not found" });
    return;
  }

  // Return only buyer-safe fields — no internal IDs, no finance data
  const { ownerId, ...publicData } = product;
  res.json(publicData);
});

export default router;
