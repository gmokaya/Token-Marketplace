import { Router } from "express";
import { getAuth } from "@clerk/express";
import { createHmac, randomBytes } from "crypto";
import { db } from "@workspace/db";
import { ewrsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Registry HMAC secret must be supplied via env in production; the dev fallback
// only applies outside production so we never ship a well-known default secret.
function loadWrscSecret(): string {
  const v = process.env.WRSC_SECRET;
  if (v && v.length > 0) return v;
  if (process.env.NODE_ENV === "production") throw new Error("[wrsc] WRSC_SECRET must be set in production");
  return "wrsc-dev-registry-secret-2025";
}
const WRSC_SECRET = loadWrscSecret();
const AVOCADO_SHELF_DAYS = 30;

const GRAIN_LIMITS = {
  MAIZE: { maxMoisturePct: 13.5, standard: "EAS 2:2013" },
  RICE:  { maxMoisturePct: 14.0, standard: "EAS 128:2013" },
};
const GRAIN_SHARED = { maxForeignMatterPct: 1.0, maxBrokenGrainsPct: 2.0, maxInsectDamagedPct: 1.0 };

function generateReceiptId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `WRSC-CR-${date}-${rand}`;
}

function generateSignature(payload: object): string {
  return createHmac("sha256", WRSC_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");
}

function grainPoolId(wc: string, ct: string, grade: string, moist: number): string {
  return `${wc}_${ct}_${grade}_${moist.toFixed(2)}`;
}

// ── Intake schemas (no ewrsReceiptId/wrscSignature — generated server-side) ──
const base = z.object({
  warehouseCode: z.string().min(1),
  grade: z.string().min(1),
  weightMt: z.number().positive(),
  harvestSeason: z.string().min(1),
  estimatedValueUsd: z.number().positive().optional(),
  producerClerkId: z.string().optional(),
});

const grainBase = base.extend({
  moisturePct: z.number().positive(),
  foreignMatterPct: z.number().min(0),
  brokenGrainsPct: z.number().min(0),
  insectDamagedGrainsPct: z.number().min(0),
});

const wrscIntakeSchema = z.discriminatedUnion("commodityType", [
  grainBase.extend({ commodityType: z.literal("MAIZE") }),
  grainBase.extend({ commodityType: z.literal("RICE") }),
  base.extend({
    commodityType: z.literal("COFFEE"),
    coffeeBeanSize: z.enum(["AA", "AB", "PB", "C"]),
    coffeeCuppingScore: z.number().min(1).max(10),
    moisturePct: z.number().positive().optional(),
  }),
  base.extend({
    commodityType: z.literal("TEA"),
    teaProcessingType: z.enum(["CTC", "ORTHODOX"]),
    teaLeafGrade: z.enum(["BOP", "BOPF", "D1", "PF"]),
    teaInvoiceSerial: z.string().min(1),
  }),
  base.extend({
    commodityType: z.literal("AVOCADO"),
    avocadoVariety: z.enum(["HASS", "FUERTE"]),
    avocadoSizingCode: z.number().int().min(10).max(30),
    avocadoColdChainCompliant: z.boolean(),
  }),
]);

// GET /wrsc/producers — list PRODUCER users for ENABLER dropdown
router.get("/wrsc/producers", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [caller] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!caller) return res.status(404).json({ error: "User not found" });
  if (caller.tier !== "ENABLER") return res.status(403).json({ error: "Only Enablers may list producers" });

  const producers = await db
    .select({ id: usersTable.id, clerkId: usersTable.clerkId, name: usersTable.name, company: usersTable.company })
    .from(usersTable)
    .where(eq(usersTable.tier, "PRODUCER"));

  return res.json(producers);
});

// POST /wrsc/intake — WRSC Central Registry simulation
// Generates ewrsReceiptId + HMAC signature, validates grading, inserts eWR,
// returns the full 5-step pipeline audit trail.
router.post("/wrsc/intake", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [caller] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!caller) return res.status(404).json({ error: "User not found" });
  if (caller.tier !== "PRODUCER" && caller.tier !== "ENABLER") {
    return res.status(403).json({ error: "Only Producers and Enablers may submit eWR intake" });
  }

  const parsed = wrscIntakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const body = parsed.data;
  const now = new Date();

  // ── Resolve producer owner ────────────────────────────────────────────────────
  let owner = caller;
  if (caller.tier === "ENABLER") {
    if (!body.producerClerkId) return res.status(400).json({ error: "Enablers must specify producerClerkId" });
    const [prod] = await db.select().from(usersTable).where(eq(usersTable.clerkId, body.producerClerkId)).limit(1);
    if (!prod || prod.tier !== "PRODUCER") return res.status(404).json({ error: "Producer not found" });
    owner = prod;
  }

  // ── Pipeline timestamps ──────────────────────────────────────────────────────
  const t1 = now;
  const t2 = new Date(t1.getTime() + 420);
  const t3 = new Date(t2.getTime() + 780);
  const t4 = new Date(t3.getTime() + 560);
  const t5 = new Date(t4.getTime() + 180);

  // ── Commodity-specific validation ────────────────────────────────────────────
  let insertRow: Record<string, unknown> = {};

  if (body.commodityType === "MAIZE" || body.commodityType === "RICE") {
    const limits = GRAIN_LIMITS[body.commodityType];
    const violations: string[] = [];
    if (body.moisturePct > limits.maxMoisturePct)
      violations.push(`Moisture ${body.moisturePct}% exceeds ${limits.standard} limit of ${limits.maxMoisturePct}%`);
    if (body.foreignMatterPct > GRAIN_SHARED.maxForeignMatterPct)
      violations.push(`Foreign matter ${body.foreignMatterPct}% exceeds limit of ${GRAIN_SHARED.maxForeignMatterPct}%`);
    if (body.brokenGrainsPct > GRAIN_SHARED.maxBrokenGrainsPct)
      violations.push(`Broken grains ${body.brokenGrainsPct}% exceeds limit of ${GRAIN_SHARED.maxBrokenGrainsPct}%`);
    if (body.insectDamagedGrainsPct > GRAIN_SHARED.maxInsectDamagedPct)
      violations.push(`Insect damaged ${body.insectDamagedGrainsPct}% exceeds limit of ${GRAIN_SHARED.maxInsectDamagedPct}%`);
    if (violations.length > 0)
      return res.status(422).json({ error: "Grading standards not met — intake rejected", standard: limits.standard, violations });

    insertRow = {
      commodityType: body.commodityType,
      warehouseCode: body.warehouseCode,
      grade: body.grade,
      weightMt: String(body.weightMt),
      harvestSeason: body.harvestSeason,
      batchType: "FUNGIBLE" as const,
      moisturePct: String(body.moisturePct),
      foreignMatterPct: String(body.foreignMatterPct),
      brokenGrainsPct: String(body.brokenGrainsPct),
      insectDamagedGrainsPct: String(body.insectDamagedGrainsPct),
      estimatedValueUsd: body.estimatedValueUsd != null ? String(body.estimatedValueUsd) : undefined,
      poolGroupId: grainPoolId(body.warehouseCode, body.commodityType, body.grade, body.moisturePct),
    };
  } else if (body.commodityType === "COFFEE") {
    insertRow = {
      commodityType: "COFFEE" as const,
      warehouseCode: body.warehouseCode,
      grade: body.grade,
      weightMt: String(body.weightMt),
      harvestSeason: body.harvestSeason,
      batchType: "SEMI_FUNGIBLE" as const,
      coffeeBeanSize: body.coffeeBeanSize,
      coffeeCuppingScore: String(body.coffeeCuppingScore),
      moisturePct: body.moisturePct != null ? String(body.moisturePct) : undefined,
      estimatedValueUsd: body.estimatedValueUsd != null ? String(body.estimatedValueUsd) : undefined,
    };
  } else if (body.commodityType === "TEA") {
    insertRow = {
      commodityType: "TEA" as const,
      warehouseCode: body.warehouseCode,
      grade: body.grade,
      weightMt: String(body.weightMt),
      harvestSeason: body.harvestSeason,
      batchType: "NON_FUNGIBLE" as const,
      teaProcessingType: body.teaProcessingType,
      teaLeafGrade: body.teaLeafGrade,
      teaInvoiceSerial: body.teaInvoiceSerial,
      estimatedValueUsd: body.estimatedValueUsd != null ? String(body.estimatedValueUsd) : undefined,
    };
  } else {
    if (!body.avocadoColdChainCompliant) {
      return res.status(422).json({
        error: "Avocado intake rejected",
        violations: ["Cold-chain compliance certification is mandatory (EAS 19:2017)"],
      });
    }
    insertRow = {
      commodityType: "AVOCADO" as const,
      warehouseCode: body.warehouseCode,
      grade: body.grade,
      weightMt: String(body.weightMt),
      harvestSeason: body.harvestSeason,
      batchType: "TIME_DECAYING" as const,
      avocadoVariety: body.avocadoVariety,
      avocadoSizingCode: body.avocadoSizingCode,
      avocadoColdChainCompliant: body.avocadoColdChainCompliant,
      avocadoDegradationCoefficient: "1.0000",
      estimatedValueUsd: body.estimatedValueUsd != null ? String(body.estimatedValueUsd) : undefined,
      expiryAt: new Date(now.getTime() + AVOCADO_SHELF_DAYS * 86400 * 1000),
    };
  }

  // ── Step 3: WRSC-CR mints receipt ────────────────────────────────────────────
  const ewrsReceiptId = generateReceiptId();
  const wrscSignature = generateSignature({
    ewrsReceiptId,
    ownerId: owner.id,
    commodityType: body.commodityType,
    weightMt: body.weightMt,
    warehouseCode: body.warehouseCode,
    issuedAt: t3.toISOString(),
  });

  // ── Step 4: Platform sync — insert eWR ───────────────────────────────────────
  const [ewr] = await db.insert(ewrsTable).values({
    ...insertRow,
    ewrsReceiptId,
    wrscSignature,
    ownerId: owner.id,
    state: "INGESTED" as const,
  } as typeof ewrsTable.$inferInsert).returning();

  const registryConfirmation = {
    receiptId: ewrsReceiptId,
    signature: `${wrscSignature.slice(0, 16)}...${wrscSignature.slice(-8)}`,
    issuedAt: t3.toISOString(),
    registrar: "WRSC Central Registry",
    registrarCode: "WRSC-KE-001",
    status: "VERIFIED" as const,
    ownerName: owner.name,
    ownerCompany: owner.company ?? null,
  };

  const pipelineSteps = [
    {
      step: 1,
      label: "Physical Intake & Inspection",
      description: "Producer delivered lot to WRSC-certified warehouse. Quality parameters verified via calibrated moisture meters and optical sorting machinery.",
      completedAt: t1.toISOString(),
    },
    {
      step: 2,
      label: "Local Operator Logging",
      description: "Warehouse operator input grading variables into the localized WMS client interface.",
      completedAt: t2.toISOString(),
    },
    {
      step: 3,
      label: "WRSC Central Registry Transmission",
      description: `Signed JSON payload transmitted to eWRS-CR API. Digital signature validated. Receipt ${ewrsReceiptId} generated.`,
      completedAt: t3.toISOString(),
    },
    {
      step: 4,
      label: "Platform Synchronization",
      description: `Marketplace webhook received. e-WR data payload populated into the verified asset ledger of ${owner.name}.`,
      completedAt: t4.toISOString(),
    },
    {
      step: 5,
      label: "Operational Market Routing",
      description: "Asset holder may now dispatch asset to the Spot Marketplace, Live Auction, or Forward Contract Engine.",
      completedAt: t5.toISOString(),
    },
  ];

  return res.status(201).json({ registryConfirmation, ewr, pipelineSteps });
});

export default router;
