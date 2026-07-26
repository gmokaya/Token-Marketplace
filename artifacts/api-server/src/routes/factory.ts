/**
 * Factory Operations Portal — Service-to-Service API
 *
 * POST /factory/ewrs  — factory portal pushes a tea eWR when a batch leaves the factory.
 *                       Auth: X-Api-Key header must match FACTORY_API_KEY env var.
 *
 * The factory identifies the tea owner by their registered factory mark
 * (producer_profiles.factory_marks). If the mark is not found, the factory
 * must first ensure the producer has registered on the marketplace.
 */

import { Router } from "express";
import { db } from "@workspace/db";
import { ewrsTable, producerProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const FACTORY_API_KEY = process.env.FACTORY_API_KEY;

export const FACTORY_API_CONFIGURED = Boolean(FACTORY_API_KEY);

function requireFactoryKey(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
) {
  if (!FACTORY_API_KEY) {
    res.status(503).json({
      error: "Factory integration is not configured. Set FACTORY_API_KEY to enable it.",
    });
    return;
  }
  const provided = req.headers["x-api-key"];
  if (!provided || provided !== FACTORY_API_KEY) {
    res.status(401).json({ error: "Invalid or missing X-Api-Key header." });
    return;
  }
  next();
}

const factoryEwrSchema = z.object({
  /** Factory mark registered on the producer's marketplace profile */
  factoryMark: z.string().min(1),

  // Standard eWR identification
  ewrsReceiptId: z.string().min(1),
  wrscSignature: z.string().min(1),
  warehouseCode: z.string().min(1),
  grade: z.string().min(1),
  weightMt: z.number().positive(),
  harvestSeason: z.string().min(1),

  // Tea-specific grading (mandatory for TEA commodity)
  teaProcessingType: z.enum(["CTC", "ORTHODOX"]),
  teaLeafGrade: z.enum(["BOP", "BOPF", "D1", "PF"]),
  teaInvoiceSerial: z.string().min(1),

  estimatedValueUsd: z.number().positive().optional(),
});

// ── POST /factory/ewrs ─────────────────────────────────────────────────────────
router.post("/factory/ewrs", requireFactoryKey, async (req, res) => {
  const parsed = factoryEwrSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const body = parsed.data;

  // Look up the producer by factory mark (exact match on producer_profiles.factory_marks)
  const [profile] = await db
    .select({ userId: producerProfilesTable.userId })
    .from(producerProfilesTable)
    .where(eq(producerProfilesTable.factoryMarks, body.factoryMark))
    .limit(1);

  if (!profile) {
    return res.status(404).json({
      error: `No producer found with factory mark "${body.factoryMark}". Ensure the producer has registered on the marketplace and set their factory mark in their profile.`,
    });
  }

  // Idempotency — reject duplicate receipt IDs
  const [existing] = await db
    .select({ id: ewrsTable.id })
    .from(ewrsTable)
    .where(eq(ewrsTable.ewrsReceiptId, body.ewrsReceiptId))
    .limit(1);

  if (existing) {
    return res.status(409).json({
      error: "An eWR with this receipt ID already exists.",
      existingId: existing.id,
    });
  }

  const [created] = await db
    .insert(ewrsTable)
    .values({
      ewrsReceiptId: body.ewrsReceiptId,
      wrscSignature: body.wrscSignature,
      warehouseCode: body.warehouseCode,
      commodityType: "TEA",
      batchType: "NON_FUNGIBLE",
      grade: body.grade,
      weightMt: String(body.weightMt),
      harvestSeason: body.harvestSeason,
      teaProcessingType: body.teaProcessingType,
      teaLeafGrade: body.teaLeafGrade,
      teaInvoiceSerial: body.teaInvoiceSerial,
      estimatedValueUsd: body.estimatedValueUsd != null ? String(body.estimatedValueUsd) : undefined,
      ownerId: profile.userId,
      state: "INGESTED",
    })
    .returning();

  return res.status(201).json(created);
});

export default router;
