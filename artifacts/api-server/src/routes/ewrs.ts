import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  ewrsTable,
  usersTable,
  spotListingsTable,
  financingRequestsTable,
  loansTable,
} from "@workspace/db";
import { eq, and, inArray, ne, SQL } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// ── Commodity-specific grading limits (EAS standards) ────────────────────────
const GRAIN_LIMITS = {
  MAIZE: { maxMoisturePct: 13.5, standard: "EAS 2:2013" },
  RICE:  { maxMoisturePct: 14.0, standard: "EAS 128:2013" },
};
const GRAIN_SHARED_LIMITS = { maxForeignMatterPct: 1.0, maxBrokenGrainsPct: 2.0, maxInsectDamagedGrainsPct: 1.0 };

const AVOCADO_SHELF_DAYS = 30;
const AVOCADO_DAILY_DEGRADATION = 1 / AVOCADO_SHELF_DAYS;

// Derives the canonical poolGroupId for fungible grain lots
function grainPoolId(warehouseCode: string, commodityType: string, grade: string, moisturePct: string | number) {
  return `${warehouseCode}_${commodityType}_${grade}_${parseFloat(String(moisturePct)).toFixed(2)}`;
}

// ── Intake validation schemas ────────────────────────────────────────────────
const baseSchema = z.object({
  ewrsReceiptId: z.string().min(1),
  wrscSignature: z.string().min(1),
  warehouseCode: z.string().min(1),
  grade: z.string().min(1),
  weightMt: z.number().positive(),
  harvestSeason: z.string().min(1),
  estimatedValueUsd: z.number().positive().optional(),
});

const maizeRiceSchema = baseSchema.extend({
  commodityType: z.enum(["MAIZE", "RICE"]),
  moisturePct: z.number().positive(),
  foreignMatterPct: z.number().min(0),
  brokenGrainsPct: z.number().min(0),
  insectDamagedGrainsPct: z.number().min(0),
});

const coffeeSchema = baseSchema.extend({
  commodityType: z.literal("COFFEE"),
  coffeeBeanSize: z.enum(["AA", "AB", "PB", "C"]),
  coffeeCuppingScore: z.number().min(1).max(10),
  moisturePct: z.number().positive().optional(),
});

const teaSchema = baseSchema.extend({
  commodityType: z.literal("TEA"),
  teaProcessingType: z.enum(["CTC", "ORTHODOX"]),
  teaLeafGrade: z.enum(["BOP", "BOPF", "D1", "PF"]),
  teaInvoiceSerial: z.string().min(1),
});

const avocadoSchema = baseSchema.extend({
  commodityType: z.literal("AVOCADO"),
  avocadoVariety: z.enum(["HASS", "FUERTE"]),
  avocadoSizingCode: z.number().int().min(10).max(30),
  avocadoColdChainCompliant: z.boolean(),
});

const createEwrSchema = z.discriminatedUnion("commodityType", [
  maizeRiceSchema.extend({ commodityType: z.literal("MAIZE") }),
  maizeRiceSchema.extend({ commodityType: z.literal("RICE") }),
  coffeeSchema,
  teaSchema,
  avocadoSchema,
]);

// ── POST /ewrs — Intake with per-commodity grading validation ────────────────
router.post("/ewrs", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "PRODUCER" && user.tier !== "ENABLER") {
    return res.status(403).json({ error: "Only Producers and Enablers may submit eWR intake" });
  }

  const parsed = createEwrSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const body = parsed.data;
  const now = new Date();

  // ── Commodity-specific validation + row construction ────────────────────
  let insertRow: Parameters<typeof db.insert>[0] extends (table: typeof ewrsTable) => { values: (v: infer V) => unknown } ? V : any;

  if (body.commodityType === "MAIZE" || body.commodityType === "RICE") {
    const limits = GRAIN_LIMITS[body.commodityType as keyof typeof GRAIN_LIMITS];
    const errors: string[] = [];
    if (body.moisturePct > limits.maxMoisturePct)
      errors.push(`Moisture ${body.moisturePct}% exceeds ${limits.standard} limit of ${limits.maxMoisturePct}%`);
    if (body.foreignMatterPct > GRAIN_SHARED_LIMITS.maxForeignMatterPct)
      errors.push(`Foreign matter ${body.foreignMatterPct}% exceeds limit of ${GRAIN_SHARED_LIMITS.maxForeignMatterPct}%`);
    if (body.brokenGrainsPct > GRAIN_SHARED_LIMITS.maxBrokenGrainsPct)
      errors.push(`Broken grains ${body.brokenGrainsPct}% exceeds limit of ${GRAIN_SHARED_LIMITS.maxBrokenGrainsPct}%`);
    if (body.insectDamagedGrainsPct > GRAIN_SHARED_LIMITS.maxInsectDamagedGrainsPct)
      errors.push(`Insect damaged grains ${body.insectDamagedGrainsPct}% exceeds limit of ${GRAIN_SHARED_LIMITS.maxInsectDamagedGrainsPct}%`);
    if (errors.length > 0)
      return res.status(422).json({ error: "Grading standards not met — intake rejected", standard: limits.standard, violations: errors });

    insertRow = {
      ...body,
      batchType: "FUNGIBLE" as const,
      weightMt: String(body.weightMt),
      moisturePct: String(body.moisturePct),
      foreignMatterPct: String(body.foreignMatterPct),
      brokenGrainsPct: String(body.brokenGrainsPct),
      insectDamagedGrainsPct: String(body.insectDamagedGrainsPct),
      estimatedValueUsd: body.estimatedValueUsd != null ? String(body.estimatedValueUsd) : undefined,
      poolGroupId: grainPoolId(body.warehouseCode, body.commodityType, body.grade, body.moisturePct),
      ownerId: user.id,
      state: "INGESTED" as const,
    };
  } else if (body.commodityType === "COFFEE") {
    insertRow = {
      ...body,
      batchType: "SEMI_FUNGIBLE" as const,
      weightMt: String(body.weightMt),
      moisturePct: body.moisturePct != null ? String(body.moisturePct) : undefined,
      coffeeCuppingScore: String(body.coffeeCuppingScore),
      estimatedValueUsd: body.estimatedValueUsd != null ? String(body.estimatedValueUsd) : undefined,
      ownerId: user.id,
      state: "INGESTED" as const,
    };
  } else if (body.commodityType === "TEA") {
    insertRow = {
      ...body,
      batchType: "NON_FUNGIBLE" as const,
      weightMt: String(body.weightMt),
      estimatedValueUsd: body.estimatedValueUsd != null ? String(body.estimatedValueUsd) : undefined,
      ownerId: user.id,
      state: "INGESTED" as const,
    };
  } else {
    // AVOCADO
    if (!body.avocadoColdChainCompliant) {
      return res.status(422).json({
        error: "Avocado intake rejected",
        violations: ["Cold-chain compliance certification is mandatory (EAS 19:2017)"],
      });
    }
    const expiryAt = new Date(now.getTime() + AVOCADO_SHELF_DAYS * 24 * 60 * 60 * 1000);
    insertRow = {
      ...body,
      batchType: "TIME_DECAYING" as const,
      weightMt: String(body.weightMt),
      avocadoSizingCode: body.avocadoSizingCode,
      avocadoDegradationCoefficient: "1.0000",
      estimatedValueUsd: body.estimatedValueUsd != null ? String(body.estimatedValueUsd) : undefined,
      expiryAt,
      ownerId: user.id,
      state: "INGESTED" as const,
    };
  }

  const [created] = await db.insert(ewrsTable).values(insertRow).returning();
  return res.status(201).json(created);
});

router.get("/ewrs/my-portfolio", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const ewrs = await db
    .select({
      id: ewrsTable.id,
      ewrsReceiptId: ewrsTable.ewrsReceiptId,
      wrscSignature: ewrsTable.wrscSignature,
      warehouseCode: ewrsTable.warehouseCode,
      commodityType: ewrsTable.commodityType,
      batchType: ewrsTable.batchType,
      grade: ewrsTable.grade,
      weightMt: ewrsTable.weightMt,
      harvestSeason: ewrsTable.harvestSeason,
      isLienActive: ewrsTable.isLienActive,
      lienHolderId: ewrsTable.lienHolderId,
      state: ewrsTable.state,
      ownerId: ewrsTable.ownerId,
      ownerName: usersTable.name,
      expiryAt: ewrsTable.expiryAt,
      issuedAt: ewrsTable.issuedAt,
      estimatedValueUsd: ewrsTable.estimatedValueUsd,
      // grain
      moisturePct: ewrsTable.moisturePct,
      foreignMatterPct: ewrsTable.foreignMatterPct,
      brokenGrainsPct: ewrsTable.brokenGrainsPct,
      insectDamagedGrainsPct: ewrsTable.insectDamagedGrainsPct,
      // coffee
      coffeeBeanSize: ewrsTable.coffeeBeanSize,
      coffeeCuppingScore: ewrsTable.coffeeCuppingScore,
      // tea
      teaProcessingType: ewrsTable.teaProcessingType,
      teaLeafGrade: ewrsTable.teaLeafGrade,
      teaInvoiceSerial: ewrsTable.teaInvoiceSerial,
      // avocado
      avocadoVariety: ewrsTable.avocadoVariety,
      avocadoSizingCode: ewrsTable.avocadoSizingCode,
      avocadoColdChainCompliant: ewrsTable.avocadoColdChainCompliant,
      avocadoDegradationCoefficient: ewrsTable.avocadoDegradationCoefficient,
      // pooling
      poolGroupId: ewrsTable.poolGroupId,
    })
    .from(ewrsTable)
    .leftJoin(usersTable, eq(ewrsTable.ownerId, usersTable.id))
    .where(eq(ewrsTable.ownerId, user.id));

  const lienedEwrIds = ewrs.filter(e => e.isLienActive).map(e => e.id);
  const loanByEwrId = new Map<number, string>();

  if (lienedEwrIds.length > 0) {
    const loanRows = await db
      .select({
        ewrId: financingRequestsTable.ewrId,
        outstandingBalanceUsd: loansTable.outstandingBalanceUsd,
      })
      .from(loansTable)
      .innerJoin(financingRequestsTable, eq(loansTable.financingRequestId, financingRequestsTable.id))
      .where(
        and(
          inArray(financingRequestsTable.ewrId, lienedEwrIds),
          eq(loansTable.lienStatus, "ACTIVE")
        )
      );
    for (const row of loanRows) {
      loanByEwrId.set(row.ewrId, row.outstandingBalanceUsd);
    }
  }

  const ewrsWithLoan = ewrs.map(e => ({
    ...e,
    lienLoanOutstandingUsd: loanByEwrId.has(e.id) ? parseFloat(loanByEwrId.get(e.id)!) : null,
  }));

  const totalValueUsd = ewrs.reduce((sum, e) => sum + parseFloat(e.estimatedValueUsd ?? "0"), 0);

  const byStateMap = new Map<string, number>();
  const byCommodityMap = new Map<string, { count: number; totalWeightMt: number }>();

  for (const ewr of ewrs) {
    byStateMap.set(ewr.state, (byStateMap.get(ewr.state) ?? 0) + 1);
    const existing = byCommodityMap.get(ewr.commodityType) ?? { count: 0, totalWeightMt: 0 };
    byCommodityMap.set(ewr.commodityType, {
      count: existing.count + 1,
      totalWeightMt: existing.totalWeightMt + parseFloat(ewr.weightMt ?? "0"),
    });
  }

  return res.json({
    ewrs: ewrsWithLoan,
    totalValueUsd,
    byState: Array.from(byStateMap.entries()).map(([state, count]) => ({ state, count })),
    byCommodity: Array.from(byCommodityMap.entries()).map(([commodityType, data]) => ({ commodityType, ...data })),
  });
});

router.get("/ewrs", async (req, res) => {
  const { ownerId, state, commodityType } = req.query as {
    ownerId?: string;
    state?: string;
    commodityType?: string;
  };

  const conditions: SQL[] = [];
  if (ownerId) conditions.push(eq(ewrsTable.ownerId, parseInt(ownerId)));
  if (state) conditions.push(eq(ewrsTable.state, state as typeof ewrsTable.$inferSelect["state"]));
  if (commodityType) conditions.push(eq(ewrsTable.commodityType, commodityType as typeof ewrsTable.$inferSelect["commodityType"]));

  const ewrs = await db
    .select({
      id: ewrsTable.id,
      ewrsReceiptId: ewrsTable.ewrsReceiptId,
      wrscSignature: ewrsTable.wrscSignature,
      warehouseCode: ewrsTable.warehouseCode,
      commodityType: ewrsTable.commodityType,
      batchType: ewrsTable.batchType,
      grade: ewrsTable.grade,
      weightMt: ewrsTable.weightMt,
      harvestSeason: ewrsTable.harvestSeason,
      isLienActive: ewrsTable.isLienActive,
      lienHolderId: ewrsTable.lienHolderId,
      state: ewrsTable.state,
      ownerId: ewrsTable.ownerId,
      ownerName: usersTable.name,
      expiryAt: ewrsTable.expiryAt,
      issuedAt: ewrsTable.issuedAt,
      estimatedValueUsd: ewrsTable.estimatedValueUsd,
      moisturePct: ewrsTable.moisturePct,
      foreignMatterPct: ewrsTable.foreignMatterPct,
      brokenGrainsPct: ewrsTable.brokenGrainsPct,
      insectDamagedGrainsPct: ewrsTable.insectDamagedGrainsPct,
      coffeeBeanSize: ewrsTable.coffeeBeanSize,
      coffeeCuppingScore: ewrsTable.coffeeCuppingScore,
      teaProcessingType: ewrsTable.teaProcessingType,
      teaLeafGrade: ewrsTable.teaLeafGrade,
      teaInvoiceSerial: ewrsTable.teaInvoiceSerial,
      avocadoVariety: ewrsTable.avocadoVariety,
      avocadoSizingCode: ewrsTable.avocadoSizingCode,
      avocadoColdChainCompliant: ewrsTable.avocadoColdChainCompliant,
      avocadoDegradationCoefficient: ewrsTable.avocadoDegradationCoefficient,
      poolGroupId: ewrsTable.poolGroupId,
    })
    .from(ewrsTable)
    .leftJoin(usersTable, eq(ewrsTable.ownerId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return res.json(ewrs);
});

router.get("/ewrs/:ewrId", async (req, res) => {
  const ewrId = parseInt(req.params.ewrId);
  if (isNaN(ewrId)) return res.status(400).json({ error: "Invalid eWR ID" });

  const [ewr] = await db
    .select({
      id: ewrsTable.id,
      ewrsReceiptId: ewrsTable.ewrsReceiptId,
      wrscSignature: ewrsTable.wrscSignature,
      warehouseCode: ewrsTable.warehouseCode,
      commodityType: ewrsTable.commodityType,
      batchType: ewrsTable.batchType,
      grade: ewrsTable.grade,
      weightMt: ewrsTable.weightMt,
      harvestSeason: ewrsTable.harvestSeason,
      isLienActive: ewrsTable.isLienActive,
      lienHolderId: ewrsTable.lienHolderId,
      state: ewrsTable.state,
      ownerId: ewrsTable.ownerId,
      ownerName: usersTable.name,
      expiryAt: ewrsTable.expiryAt,
      issuedAt: ewrsTable.issuedAt,
      estimatedValueUsd: ewrsTable.estimatedValueUsd,
      moisturePct: ewrsTable.moisturePct,
      foreignMatterPct: ewrsTable.foreignMatterPct,
      brokenGrainsPct: ewrsTable.brokenGrainsPct,
      insectDamagedGrainsPct: ewrsTable.insectDamagedGrainsPct,
      coffeeBeanSize: ewrsTable.coffeeBeanSize,
      coffeeCuppingScore: ewrsTable.coffeeCuppingScore,
      teaProcessingType: ewrsTable.teaProcessingType,
      teaLeafGrade: ewrsTable.teaLeafGrade,
      teaInvoiceSerial: ewrsTable.teaInvoiceSerial,
      avocadoVariety: ewrsTable.avocadoVariety,
      avocadoSizingCode: ewrsTable.avocadoSizingCode,
      avocadoColdChainCompliant: ewrsTable.avocadoColdChainCompliant,
      avocadoDegradationCoefficient: ewrsTable.avocadoDegradationCoefficient,
      poolGroupId: ewrsTable.poolGroupId,
    })
    .from(ewrsTable)
    .leftJoin(usersTable, eq(ewrsTable.ownerId, usersTable.id))
    .where(eq(ewrsTable.id, ewrId))
    .limit(1);

  if (!ewr) return res.status(404).json({ error: "eWR not found" });
  return res.json(ewr);
});

// ── Avocado degradation worker — runs daily ──────────────────────────────────
export function startAvocadoDegradationWorker() {
  const RUN_EVERY_MS = 24 * 60 * 60 * 1000; // 24 hours
  setInterval(async () => {
    try {
      const avocadoEwrs = await db
        .select({ id: ewrsTable.id, avocadoDegradationCoefficient: ewrsTable.avocadoDegradationCoefficient })
        .from(ewrsTable)
        .where(and(
          eq(ewrsTable.commodityType, "AVOCADO"),
          ne(ewrsTable.state, "SETTLED"),
        ));

      for (const ewr of avocadoEwrs) {
        const current = parseFloat(ewr.avocadoDegradationCoefficient ?? "1");
        const next = Math.max(0, current - AVOCADO_DAILY_DEGRADATION);
        await db.update(ewrsTable)
          .set({ avocadoDegradationCoefficient: next.toFixed(4) })
          .where(eq(ewrsTable.id, ewr.id));
      }
      if (avocadoEwrs.length > 0)
        console.log(`[DegradationWorker] Updated ${avocadoEwrs.length} avocado eWR(s)`);
    } catch (err) {
      console.error("[DegradationWorker] Error:", err);
    }
  }, RUN_EVERY_MS);
}

export default router;
