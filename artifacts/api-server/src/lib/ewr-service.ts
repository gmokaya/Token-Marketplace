/**
 * Shared WRSC eWR service layer.
 * Both wrsc.ts (PRODUCER intake) and cooperatives.ts (cooperative issuance)
 * must use these functions to ensure consistent HMAC signing, state
 * transitions, and audit trails across all eWR lifecycle operations.
 */
import { createHmac, randomBytes } from "crypto";
import { db } from "@workspace/db";
import { ewrsTable, auditLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { auditEntry } from "./audit";

function getWrscSecret(): string {
  const v = process.env.WRSC_SECRET;
  if (v && v.length > 0) return v;
  if (process.env.NODE_ENV === "production") throw new Error("[wrsc] WRSC_SECRET must be set in production");
  return "wrsc-dev-registry-secret-2025";
}

/**
 * WRSC HMAC-SHA256 signature.  All eWR issuance — whether via PRODUCER
 * WMS intake or cooperative macro-lot request — must be signed with this
 * function so signatures can be verified with the same WRSC_SECRET.
 */
export function signEwr(payload: object): string {
  return createHmac("sha256", getWrscSecret()).update(JSON.stringify(payload)).digest("hex");
}

/** Generates a WRSC-format receipt ID (e.g. WRSC-CR-20260530-A1B2C3D4). */
export function generateEwrReceiptId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `WRSC-CR-${date}-${rand}`;
}

/**
 * Cancel a parent eWR and re-issue two child receipts.
 * Mirrors the WRSC cancel/re-issue flow: parent is EXTINGUISHED and two new
 * INGESTED receipts are inserted with fresh HMAC signatures.
 */
export async function splitEwrInWrsc(params: {
  parentEwrId: number;
  ownerId: number;
  weightMtA: number;
  weightMtB: number;
  actorId: number;
}): Promise<{ ewrA: typeof ewrsTable.$inferSelect; ewrB: typeof ewrsTable.$inferSelect }> {
  const { parentEwrId, ownerId, weightMtA, weightMtB, actorId } = params;

  const [parent] = await db.select().from(ewrsTable).where(eq(ewrsTable.id, parentEwrId)).limit(1);
  if (!parent) throw Object.assign(new Error("eWR not found"), { statusCode: 404 });

  await db.update(ewrsTable).set({ state: "EXTINGUISHED" }).where(eq(ewrsTable.id, parentEwrId));

  const makeChildReceiptId = (suffix: string) => `${parent.ewrsReceiptId}-${suffix}`;

  const [ewrA] = await db.insert(ewrsTable).values({
    ewrsReceiptId: makeChildReceiptId("A"),
    wrscSignature: signEwr({ parentReceiptId: parent.ewrsReceiptId, split: "A", weightMt: weightMtA }),
    warehouseCode: parent.warehouseCode,
    commodityType: parent.commodityType,
    batchType: parent.batchType,
    grade: parent.grade,
    weightMt: String(weightMtA),
    harvestSeason: parent.harvestSeason,
    state: "INGESTED",
    ownerId,
    poolGroupId: parent.poolGroupId,
    moisturePct: parent.moisturePct,
    estimatedValueUsd: null,
  }).returning();

  const [ewrB] = await db.insert(ewrsTable).values({
    ewrsReceiptId: makeChildReceiptId("B"),
    wrscSignature: signEwr({ parentReceiptId: parent.ewrsReceiptId, split: "B", weightMt: weightMtB }),
    warehouseCode: parent.warehouseCode,
    commodityType: parent.commodityType,
    batchType: parent.batchType,
    grade: parent.grade,
    weightMt: String(weightMtB),
    harvestSeason: parent.harvestSeason,
    state: "INGESTED",
    ownerId,
    poolGroupId: parent.poolGroupId,
    moisturePct: parent.moisturePct,
    estimatedValueUsd: null,
  }).returning();

  await db.insert(auditLogTable).values(
    auditEntry("EWR", parentEwrId, "EWR_SPLIT", actorId,
      { parentEwrId, ewrAId: ewrA.id, ewrBId: ewrB.id, weightMtA, weightMtB },
      { parentEwrsReceiptId: parent.ewrsReceiptId }
    )
  );

  return { ewrA, ewrB };
}

/**
 * Retire (extinguish) an eWR for physical withdrawal.
 * Mirrors the WRSC retire flow: receipt state transitions to EXTINGUISHED
 * and the event is recorded in the audit log.
 */
export async function retireEwrInWrsc(params: {
  ewrId: number;
  actorId: number;
}): Promise<typeof ewrsTable.$inferSelect> {
  const { ewrId, actorId } = params;

  const [ewr] = await db.select().from(ewrsTable).where(eq(ewrsTable.id, ewrId)).limit(1);
  if (!ewr) throw Object.assign(new Error("eWR not found"), { statusCode: 404 });

  const [retired] = await db.update(ewrsTable)
    .set({ state: "EXTINGUISHED" })
    .where(eq(ewrsTable.id, ewrId))
    .returning();

  await db.insert(auditLogTable).values(
    auditEntry("EWR", ewrId, "EWR_RETIRED", actorId,
      { ewrId, actorId, retiredAt: new Date().toISOString() },
      { warehouseCode: ewr.warehouseCode, weightMt: ewr.weightMt }
    )
  );

  return retired;
}
