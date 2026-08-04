/**
 * Tea ESG Report routes
 *
 * GET    /tea/esg              — list my ESG reports
 * POST   /tea/esg              — create report
 * GET    /tea/esg/:id          — detail
 * PATCH  /tea/esg/:id          — update
 */

import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { teaEsgReportsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// ── Validation ────────────────────────────────────────────────────────────────

const certSchema = z.object({
  name:           z.string(),
  issuingBody:    z.string().optional(),
  validFrom:      z.string().optional(),
  validTo:        z.string().optional(),
  certificateUrl: z.string().optional(),
});

const createEsgSchema = z.object({
  productId:          z.number().int().positive().optional(),
  reportingPeriod:    z.string().min(1),

  // Environmental
  energyKwhTotal:     z.number().optional(),
  energyKwhPerKg:     z.number().optional(),
  waterM3Total:       z.number().optional(),
  waterM3PerKg:       z.number().optional(),
  co2KgTotal:         z.number().optional(),
  co2KgPerKg:         z.number().optional(),
  wasteKgTotal:       z.number().optional(),
  wasteRecycledPct:   z.number().min(0).max(100).optional(),
  renewableEnergyPct: z.number().min(0).max(100).optional(),

  // Social
  totalWorkers:            z.number().int().optional(),
  femaleWorkersPct:        z.number().min(0).max(100).optional(),
  averageWageUsd:          z.number().optional(),
  minimumWageCompliancePct: z.number().min(0).max(100).optional(),
  safetyIncidents:         z.number().int().optional(),
  trainingHrsPerWorker:    z.number().optional(),
  childLaborPolicy:        z.string().optional(),
  communityInvestmentUsd:  z.number().optional(),

  // Governance
  certifications:       z.array(certSchema).default([]),
  auditDate:            z.string().optional(),
  auditorName:          z.string().optional(),
  auditReportUrl:       z.string().optional(),

  additionalIndicators: z.record(z.unknown()).default({}),
  notes:                z.string().optional(),
});

// ── Helper ────────────────────────────────────────────────────────────────────

async function resolveUser(clerkId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user ?? null;
}

function toStr(v: number | undefined): string | undefined {
  return v !== undefined ? String(v) : undefined;
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get("/tea/esg", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const reports = await db
    .select()
    .from(teaEsgReportsTable)
    .where(eq(teaEsgReportsTable.ownerId, user.id))
    .orderBy(desc(teaEsgReportsTable.createdAt));

  res.json(reports);
});

router.post("/tea/esg", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const parsed = createEsgSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const { auditDate, energyKwhTotal, energyKwhPerKg, waterM3Total, waterM3PerKg,
          co2KgTotal, co2KgPerKg, wasteKgTotal, wasteRecycledPct, renewableEnergyPct,
          femaleWorkersPct, averageWageUsd, minimumWageCompliancePct, trainingHrsPerWorker,
          communityInvestmentUsd, ...rest } = parsed.data;

  const [report] = await db
    .insert(teaEsgReportsTable)
    .values({
      ...rest,
      ownerId: user.id,
      auditDate: auditDate ? new Date(auditDate) : undefined,
      energyKwhTotal:     toStr(energyKwhTotal),
      energyKwhPerKg:     toStr(energyKwhPerKg),
      waterM3Total:       toStr(waterM3Total),
      waterM3PerKg:       toStr(waterM3PerKg),
      co2KgTotal:         toStr(co2KgTotal),
      co2KgPerKg:         toStr(co2KgPerKg),
      wasteKgTotal:       toStr(wasteKgTotal),
      wasteRecycledPct:   toStr(wasteRecycledPct),
      renewableEnergyPct: toStr(renewableEnergyPct),
      femaleWorkersPct:   toStr(femaleWorkersPct),
      averageWageUsd:     toStr(averageWageUsd),
      minimumWageCompliancePct: toStr(minimumWageCompliancePct),
      trainingHrsPerWorker: toStr(trainingHrsPerWorker),
      communityInvestmentUsd: toStr(communityInvestmentUsd),
    })
    .returning();

  res.status(201).json(report);
});

router.get("/tea/esg/:id", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [report] = await db
    .select()
    .from(teaEsgReportsTable)
    .where(and(eq(teaEsgReportsTable.id, id), eq(teaEsgReportsTable.ownerId, user.id)));

  if (!report) { res.status(404).json({ error: "Report not found" }); return; }
  res.json(report);
});

router.patch("/tea/esg/:id", async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await resolveUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = createEsgSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const { auditDate, energyKwhTotal, energyKwhPerKg, waterM3Total, waterM3PerKg,
          co2KgTotal, co2KgPerKg, wasteKgTotal, wasteRecycledPct, renewableEnergyPct,
          femaleWorkersPct, averageWageUsd, minimumWageCompliancePct, trainingHrsPerWorker,
          communityInvestmentUsd, ...rest } = parsed.data;

  const [updated] = await db
    .update(teaEsgReportsTable)
    .set({
      ...rest,
      auditDate: auditDate ? new Date(auditDate) : undefined,
      energyKwhTotal:     toStr(energyKwhTotal),
      energyKwhPerKg:     toStr(energyKwhPerKg),
      waterM3Total:       toStr(waterM3Total),
      waterM3PerKg:       toStr(waterM3PerKg),
      co2KgTotal:         toStr(co2KgTotal),
      co2KgPerKg:         toStr(co2KgPerKg),
      wasteKgTotal:       toStr(wasteKgTotal),
      wasteRecycledPct:   toStr(wasteRecycledPct),
      renewableEnergyPct: toStr(renewableEnergyPct),
      femaleWorkersPct:   toStr(femaleWorkersPct),
      averageWageUsd:     toStr(averageWageUsd),
      minimumWageCompliancePct: toStr(minimumWageCompliancePct),
      trainingHrsPerWorker: toStr(trainingHrsPerWorker),
      communityInvestmentUsd: toStr(communityInvestmentUsd),
      updatedAt: new Date(),
    })
    .where(and(eq(teaEsgReportsTable.id, id), eq(teaEsgReportsTable.ownerId, user.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Report not found" }); return; }
  res.json(updated);
});

export default router;
