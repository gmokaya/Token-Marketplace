import { Router } from "express";
import { getAuth } from "@clerk/express";
import { randomUUID, createHash, createHmac } from "crypto";
import { db } from "@workspace/db";
import {
  usersTable,
  ewrsTable,
  cooperativeProfilesTable,
  coopMembersTable,
  intakeLogsTable,
  macroLotsTable,
  digitalReleaseTokensTable,
  auditLogTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { auditEntry } from "../lib/audit";

// Mirror of wrsc.ts — must use the same secret so cooperative-issued receipts
// pass the same signature validation as WMS intake receipts.
function loadWrscSecret(): string {
  const v = process.env.WRSC_SECRET;
  if (v && v.length > 0) return v;
  if (process.env.NODE_ENV === "production") throw new Error("[wrsc] WRSC_SECRET must be set in production");
  return "wrsc-dev-registry-secret-2025";
}
const WRSC_SECRET = loadWrscSecret();

function wrscSign(payload: object): string {
  return createHmac("sha256", WRSC_SECRET).update(JSON.stringify(payload)).digest("hex");
}

const router = Router();

function sha256str(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 12).toUpperCase();
}

function makeMemberRef(nationalId: string, cooperativeId: number): string {
  return `MEMBER_REF_${sha256str(`${cooperativeId}:${nationalId}`)}`;
}

async function requireCoop(clerkId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });
  if (user.tier !== "COOPERATIVE") throw Object.assign(new Error("COOPERATIVE tier required"), { statusCode: 403 });
  return user;
}

// ── Profile ───────────────────────────────────────────────────────────────────

router.get("/cooperatives/me/profile", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await requireCoop(clerkId);
    const [profile] = await db.select().from(cooperativeProfilesTable)
      .where(eq(cooperativeProfilesTable.userId, user.id)).limit(1);
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    return res.json(profile);
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

router.put("/cooperatives/me/profile", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await requireCoop(clerkId);
    const {
      entityName, registrationNumber, licenceNumber, kraPin, officeAddress,
      gpsLatitude, gpsLongitude, adminFirstName, adminLastName, adminNationalId,
      adminPhone, adminEmail, bankName, bankBranch, bankSwiftCode, bankAccountNumber,
      mobileMoneyPaybill,
    } = req.body;
    if (!entityName || !registrationNumber) {
      return res.status(400).json({ error: "entityName and registrationNumber are required" });
    }
    const [existing] = await db.select({ id: cooperativeProfilesTable.id })
      .from(cooperativeProfilesTable).where(eq(cooperativeProfilesTable.userId, user.id)).limit(1);
    let profile;
    if (existing) {
      [profile] = await db.update(cooperativeProfilesTable)
        .set({ entityName, registrationNumber, licenceNumber, kraPin, officeAddress, gpsLatitude, gpsLongitude, adminFirstName, adminLastName, adminNationalId, adminPhone, adminEmail, bankName, bankBranch, bankSwiftCode, bankAccountNumber, mobileMoneyPaybill, updatedAt: new Date() })
        .where(eq(cooperativeProfilesTable.userId, user.id)).returning();
    } else {
      [profile] = await db.insert(cooperativeProfilesTable).values({
        userId: user.id, entityName, registrationNumber, licenceNumber, kraPin, officeAddress, gpsLatitude, gpsLongitude, adminFirstName, adminLastName, adminNationalId, adminPhone, adminEmail, bankName, bankBranch, bankSwiftCode, bankAccountNumber, mobileMoneyPaybill,
      }).returning();
    }
    return res.json(profile);
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

// ── Members ───────────────────────────────────────────────────────────────────

router.get("/cooperatives/me/members", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await requireCoop(clerkId);
    const members = await db.select().from(coopMembersTable)
      .where(eq(coopMembersTable.cooperativeId, user.id));
    return res.json(members);
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

router.post("/cooperatives/me/members", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await requireCoop(clerkId);
    const { fullName, nationalId, farmLocation, gender, acreageMt } = req.body as {
      fullName: string;
      nationalId: string;
      farmLocation?: string;
      gender?: string;
      acreageMt?: number;
    };
    if (!fullName || !nationalId) {
      return res.status(400).json({ error: "fullName and nationalId are required" });
    }
    const memberRef = makeMemberRef(nationalId, user.id);
    const [existing] = await db.select({ id: coopMembersTable.id })
      .from(coopMembersTable).where(eq(coopMembersTable.memberRef, memberRef)).limit(1);
    if (existing) return res.status(409).json({ error: "Member with this national ID already exists", memberRef });
    const [member] = await db.insert(coopMembersTable).values({
      cooperativeId: user.id, memberRef, fullName, nationalId, farmLocation, gender,
      acreageMt: acreageMt != null ? String(acreageMt) : null,
    }).returning();
    return res.status(201).json(member);
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

// ── Intake Logs ───────────────────────────────────────────────────────────────

router.get("/cooperatives/me/intake", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await requireCoop(clerkId);
    const logs = await db.select().from(intakeLogsTable)
      .where(eq(intakeLogsTable.cooperativeId, user.id));
    return res.json(logs);
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

router.post("/cooperatives/me/intake", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await requireCoop(clerkId);
    const { memberRef, commodityType, weightMt, moisturePct, grade, macroLotId, intakeAt } = req.body as {
      memberRef: string;
      commodityType: string;
      weightMt: number;
      moisturePct?: number;
      grade: string;
      macroLotId?: number;
      intakeAt?: string;
    };
    if (!memberRef || !commodityType || !weightMt || !grade) {
      return res.status(400).json({ error: "memberRef, commodityType, weightMt, grade are required" });
    }
    const [memberExists] = await db.select({ id: coopMembersTable.id })
      .from(coopMembersTable)
      .where(and(eq(coopMembersTable.memberRef, memberRef), eq(coopMembersTable.cooperativeId, user.id)))
      .limit(1);
    if (!memberExists) return res.status(404).json({ error: "Member ref not found in this cooperative" });

    const [log] = await db.insert(intakeLogsTable).values({
      cooperativeId: user.id,
      memberRef,
      commodityType: commodityType as typeof intakeLogsTable.$inferInsert["commodityType"],
      weightMt: String(weightMt),
      moisturePct: moisturePct != null ? String(moisturePct) : null,
      grade,
      macroLotId: macroLotId ?? null,
      intakeAt: intakeAt ? new Date(intakeAt) : new Date(),
    }).returning();

    if (macroLotId) {
      await db.update(macroLotsTable)
        .set({ totalWeightMt: sql`${macroLotsTable.totalWeightMt} + ${String(weightMt)}`, updatedAt: new Date() })
        .where(and(eq(macroLotsTable.id, macroLotId), eq(macroLotsTable.cooperativeId, user.id)));
    }
    return res.status(201).json(log);
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

// ── Macro Lots ────────────────────────────────────────────────────────────────

router.get("/cooperatives/me/macro-lots", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await requireCoop(clerkId);
    const lots = await db.select().from(macroLotsTable)
      .where(eq(macroLotsTable.cooperativeId, user.id));
    return res.json(lots);
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

router.post("/cooperatives/me/macro-lots", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await requireCoop(clerkId);
    const { commodityType, grade, warehouseCode, harvestSeason } = req.body as {
      commodityType: string;
      grade: string;
      warehouseCode?: string;
      harvestSeason?: string;
    };
    if (!commodityType || !grade) {
      return res.status(400).json({ error: "commodityType and grade are required" });
    }
    const [lot] = await db.insert(macroLotsTable).values({
      cooperativeId: user.id,
      commodityType: commodityType as typeof macroLotsTable.$inferInsert["commodityType"],
      grade,
      warehouseCode: warehouseCode ?? null,
      harvestSeason: harvestSeason ?? null,
    }).returning();
    return res.status(201).json(lot);
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

router.post("/cooperatives/me/macro-lots/:lotId/finalise", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await requireCoop(clerkId);
    const lotId = parseInt(req.params.lotId);
    if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });
    const [lot] = await db.select().from(macroLotsTable)
      .where(and(eq(macroLotsTable.id, lotId), eq(macroLotsTable.cooperativeId, user.id))).limit(1);
    if (!lot) return res.status(404).json({ error: "Macro lot not found" });
    if (lot.status !== "OPEN") return res.status(400).json({ error: "Only OPEN lots can be finalised" });
    const [updated] = await db.update(macroLotsTable)
      .set({ status: "FINALISED", updatedAt: new Date() })
      .where(eq(macroLotsTable.id, lotId)).returning();
    return res.json(updated);
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

router.post("/cooperatives/me/macro-lots/:lotId/request-ewr", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await requireCoop(clerkId);
    const lotId = parseInt(req.params.lotId);
    if (isNaN(lotId)) return res.status(400).json({ error: "Invalid lot ID" });
    const [lot] = await db.select().from(macroLotsTable)
      .where(and(eq(macroLotsTable.id, lotId), eq(macroLotsTable.cooperativeId, user.id))).limit(1);
    if (!lot) return res.status(404).json({ error: "Macro lot not found" });
    if (lot.status !== "FINALISED") return res.status(400).json({ error: "Lot must be FINALISED before requesting eWR" });

    const { warehouseCode, harvestSeason } = req.body as { warehouseCode: string; harvestSeason: string };
    if (!warehouseCode || !harvestSeason) {
      return res.status(400).json({ error: "warehouseCode and harvestSeason are required" });
    }

    const ewrsReceiptId = `COOP-${lotId}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const wrscSignature = wrscSign({
      ewrsReceiptId,
      cooperativeId: user.id,
      weightMt: lot.totalWeightMt,
      commodityType: lot.commodityType,
      grade: lot.grade,
    });

    const [ewr] = await db.insert(ewrsTable).values({
      ewrsReceiptId,
      wrscSignature,
      warehouseCode,
      commodityType: lot.commodityType,
      batchType: "FUNGIBLE",
      grade: lot.grade,
      weightMt: lot.totalWeightMt,
      harvestSeason,
      state: "INGESTED",
      ownerId: user.id,
    }).returning();

    const [updated] = await db.update(macroLotsTable)
      .set({ status: "EWR_ISSUED", ewrId: ewr.id, warehouseCode, harvestSeason, updatedAt: new Date() })
      .where(eq(macroLotsTable.id, lotId)).returning();

    await db.insert(auditLogTable).values(
      auditEntry("EWR", ewr.id, "COOP_EWR_ISSUED", user.id,
        { ewrId: ewr.id, cooperativeId: user.id, macroLotId: lotId, ewrsReceiptId },
        { warehouseCode, harvestSeason, weightMt: lot.totalWeightMt }
      )
    );
    return res.status(201).json({ ...updated, ewr });
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

// ── Release Tokens ────────────────────────────────────────────────────────────

router.get("/cooperatives/me/release-tokens", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  const tokens = await db.select().from(digitalReleaseTokensTable)
    .where(eq(digitalReleaseTokensTable.buyerId, user.id));
  return res.json(tokens);
});

// ── eWR Split ─────────────────────────────────────────────────────────────────

router.post("/ewrs/:ewrId/split", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await requireCoop(clerkId);
    const ewrId = parseInt(req.params.ewrId);
    if (isNaN(ewrId)) return res.status(400).json({ error: "Invalid eWR ID" });
    const [parent] = await db.select().from(ewrsTable).where(eq(ewrsTable.id, ewrId)).limit(1);
    if (!parent) return res.status(404).json({ error: "eWR not found" });
    if (parent.ownerId !== user.id) return res.status(403).json({ error: "You do not own this eWR" });
    if (!["INGESTED", "ENCUMBERED"].includes(parent.state)) {
      return res.status(400).json({ error: "Only INGESTED or ENCUMBERED eWRs can be split" });
    }

    const { weightMtA, weightMtB } = req.body as { weightMtA: number; weightMtB: number };
    if (!weightMtA || !weightMtB || weightMtA <= 0 || weightMtB <= 0) {
      return res.status(400).json({ error: "weightMtA and weightMtB must be positive" });
    }
    const totalWeight = parseFloat(parent.weightMt);
    const tolerance = 0.001;
    if (Math.abs(weightMtA + weightMtB - totalWeight) > tolerance) {
      return res.status(400).json({ error: `Split weights must sum to ${totalWeight} MT` });
    }

    await db.update(ewrsTable).set({ state: "EXTINGUISHED" }).where(eq(ewrsTable.id, ewrId));

    const makeChildId = (suffix: string) => `${parent.ewrsReceiptId}-${suffix}`;
    const [ewrA] = await db.insert(ewrsTable).values({
      ewrsReceiptId: makeChildId("A"),
      wrscSignature: wrscSign({ parentReceiptId: parent.ewrsReceiptId, split: "A", weightMt: weightMtA }),
      warehouseCode: parent.warehouseCode,
      commodityType: parent.commodityType,
      batchType: parent.batchType,
      grade: parent.grade,
      weightMt: String(weightMtA),
      harvestSeason: parent.harvestSeason,
      state: "INGESTED",
      ownerId: user.id,
      poolGroupId: parent.poolGroupId,
    }).returning();

    const [ewrB] = await db.insert(ewrsTable).values({
      ewrsReceiptId: makeChildId("B"),
      wrscSignature: wrscSign({ parentReceiptId: parent.ewrsReceiptId, split: "B", weightMt: weightMtB }),
      warehouseCode: parent.warehouseCode,
      commodityType: parent.commodityType,
      batchType: parent.batchType,
      grade: parent.grade,
      weightMt: String(weightMtB),
      harvestSeason: parent.harvestSeason,
      state: "INGESTED",
      ownerId: user.id,
      poolGroupId: parent.poolGroupId,
    }).returning();

    await db.insert(auditLogTable).values(
      auditEntry("EWR", ewrId, "EWR_SPLIT", user.id,
        { parentEwrId: ewrId, ewrAId: ewrA.id, ewrBId: ewrB.id, weightMtA, weightMtB },
        { parentEwrsReceiptId: parent.ewrsReceiptId }
      )
    );
    return res.status(201).json({ ewrA, ewrB });
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

// ── eWR Retire ────────────────────────────────────────────────────────────────

router.post("/ewrs/:ewrId/retire", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await requireCoop(clerkId);
    const ewrId = parseInt(req.params.ewrId);
    if (isNaN(ewrId)) return res.status(400).json({ error: "Invalid eWR ID" });
    const [ewr] = await db.select().from(ewrsTable).where(eq(ewrsTable.id, ewrId)).limit(1);
    if (!ewr) return res.status(404).json({ error: "eWR not found" });
    if (ewr.ownerId !== user.id) return res.status(403).json({ error: "You do not own this eWR" });
    if (ewr.isLienActive) return res.status(400).json({ error: "Cannot retire eWR with active lien" });
    if (ewr.state === "EXTINGUISHED") return res.status(400).json({ error: "eWR already extinguished" });

    const [retired] = await db.update(ewrsTable)
      .set({ state: "EXTINGUISHED" })
      .where(eq(ewrsTable.id, ewrId)).returning();

    await db.insert(auditLogTable).values(
      auditEntry("EWR", ewrId, "EWR_RETIRED", user.id,
        { ewrId, cooperativeId: user.id, retiredAt: new Date().toISOString() },
        { warehouseCode: ewr.warehouseCode, weightMt: ewr.weightMt }
      )
    );
    return res.json(retired);
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

// ── eWR Transfer (cooperative → any registered user) ─────────────────────────

router.post("/ewrs/:ewrId/transfer", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const user = await requireCoop(clerkId);
    const ewrId = parseInt(req.params.ewrId);
    if (isNaN(ewrId)) return res.status(400).json({ error: "Invalid eWR ID" });

    const [ewr] = await db.select().from(ewrsTable).where(eq(ewrsTable.id, ewrId)).limit(1);
    if (!ewr) return res.status(404).json({ error: "eWR not found" });
    if (ewr.ownerId !== user.id) return res.status(403).json({ error: "You do not own this eWR" });
    if (ewr.isLienActive) return res.status(400).json({ error: "Cannot transfer eWR with active lien" });
    if (!["INGESTED", "ENCUMBERED"].includes(ewr.state)) {
      return res.status(400).json({ error: "Only INGESTED or ENCUMBERED eWRs can be transferred" });
    }

    const { toUserId } = req.body as { toUserId: number };
    if (!toUserId || isNaN(toUserId)) return res.status(400).json({ error: "toUserId is required" });
    if (toUserId === user.id) return res.status(400).json({ error: "Cannot transfer to yourself" });

    const [recipient] = await db.select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable).where(eq(usersTable.id, toUserId)).limit(1);
    if (!recipient) return res.status(404).json({ error: "Recipient user not found" });

    const [updated] = await db.update(ewrsTable)
      .set({ ownerId: toUserId })
      .where(eq(ewrsTable.id, ewrId))
      .returning();

    await db.insert(auditLogTable).values(
      auditEntry("EWR", ewrId, "EWR_TRANSFERRED", user.id,
        { ewrId, fromUserId: user.id, toUserId, recipientName: recipient.name },
        { warehouseCode: ewr.warehouseCode, weightMt: ewr.weightMt }
      )
    );
    return res.json(updated);
  } catch (err: any) {
    return res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

export default router;
