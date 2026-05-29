import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, withTxRetry } from "@workspace/db";
import {
  financingRequestsTable,
  loansTable,
  ewrsTable,
  usersTable,
  auditLogTable,
} from "@workspace/db";
import { eq, and, inArray, ne } from "drizzle-orm";
import { createHash } from "crypto";

const router = Router();
const L_MAX_RATE = 0.60;
const DEFAULT_INTEREST_RATE = 0.12;

function sha256(payload: object): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function enrichRequest(req: typeof financingRequestsTable.$inferSelect) {
  const [ewr] = await db.select().from(ewrsTable).where(eq(ewrsTable.id, req.ewrId)).limit(1);
  const [requester] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.requesterId)).limit(1);
  const lender = req.lenderId
    ? (await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.lenderId)).limit(1))[0] ?? null
    : null;
  return {
    ...req,
    requesterName: requester?.name ?? null,
    lenderName: lender?.name ?? null,
    commodityType: ewr?.commodityType ?? null,
    grade: ewr?.grade ?? null,
    weightMt: ewr?.weightMt ?? null,
    warehouseCode: ewr?.warehouseCode ?? null,
    estimatedValueUsd: ewr?.estimatedValueUsd ?? null,
  };
}

router.get("/financing/eligible-ewrs", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!["PRODUCER", "FINANCIER", "ENABLER"].includes(user.tier)) return res.status(403).json({ error: "Forbidden" });

  const conditions = [eq(ewrsTable.state, "INGESTED"), eq(ewrsTable.isLienActive, false)];
  if (user.tier === "PRODUCER") conditions.push(eq(ewrsTable.ownerId, user.id));

  const ewrs = await db.select().from(ewrsTable).where(and(...conditions));

  const result = ewrs.map(e => ({
    ...e,
    lMaxUsd: e.estimatedValueUsd ? (parseFloat(e.estimatedValueUsd) * L_MAX_RATE).toFixed(2) : null,
    advanceRate: L_MAX_RATE,
    annualInterestRate: DEFAULT_INTEREST_RATE,
  }));

  return res.json(result);
});

router.get("/financing/loan-book", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!["FINANCIER", "ENABLER"].includes(user.tier)) return res.status(403).json({ error: "Financier or Enabler role required" });

  const rows = await db
    .select({ loan: loansTable, request: financingRequestsTable })
    .from(loansTable)
    .innerJoin(financingRequestsTable, eq(loansTable.financingRequestId, financingRequestsTable.id))
    .where(eq(loansTable.lienStatus, "ACTIVE"));

  const enriched = await Promise.all(rows.map(async ({ loan, request }) => {
    const [ewr] = await db.select().from(ewrsTable).where(eq(ewrsTable.id, request.ewrId)).limit(1);
    const [requester] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, request.requesterId)).limit(1);

    const now = new Date();
    const daysElapsed = Math.floor((now.getTime() - loan.startDate.getTime()) / (24 * 60 * 60 * 1000));
    const accruedInterest = parseFloat(loan.principalUsd) * parseFloat(loan.interestRate) * daysElapsed / 365;

    return {
      ...loan,
      ewrId: request.ewrId,
      requesterId: request.requesterId,
      requesterName: requester?.name ?? null,
      commodityType: ewr?.commodityType ?? null,
      grade: ewr?.grade ?? null,
      weightMt: ewr?.weightMt ?? null,
      warehouseCode: ewr?.warehouseCode ?? null,
      daysElapsed,
      accruedInterestUsd: accruedInterest.toFixed(2),
      totalRepayableUsd: (parseFloat(loan.outstandingBalanceUsd) + accruedInterest).toFixed(2),
    };
  }));

  return res.json(enriched);
});

router.get("/financing", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!["PRODUCER", "FINANCIER", "ENABLER"].includes(user.tier)) return res.status(403).json({ error: "Forbidden" });

  const { status, requesterId } = req.query as { status?: string; requesterId?: string };

  const conditions = [];
  if (status) conditions.push(eq(financingRequestsTable.status, status as typeof financingRequestsTable.$inferSelect["status"]));
  if (user.tier === "PRODUCER") {
    // Producers are always scoped to their own requests regardless of query params
    conditions.push(eq(financingRequestsTable.requesterId, user.id));
  } else if (requesterId) {
    conditions.push(eq(financingRequestsTable.requesterId, parseInt(requesterId)));
  }

  const requests = await db.select().from(financingRequestsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const enriched = await Promise.all(requests.map(enrichRequest));
  return res.json(enriched);
});

router.post("/financing", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "PRODUCER") return res.status(403).json({ error: "Only producers can request financing" });

  const { ewrId, notes } = req.body as { ewrId: number; notes?: string };
  if (!ewrId) return res.status(400).json({ error: "ewrId is required" });

  const [ewr] = await db.select().from(ewrsTable).where(eq(ewrsTable.id, ewrId)).limit(1);
  if (!ewr) return res.status(404).json({ error: "eWR not found" });
  if (ewr.ownerId !== user.id) return res.status(403).json({ error: "You do not own this eWR" });
  if (ewr.state !== "INGESTED") return res.status(400).json({ error: "Only INGESTED eWRs are eligible for financing" });
  if (ewr.isLienActive) return res.status(400).json({ error: "eWR already has an active lien" });
  if (!ewr.estimatedValueUsd) return res.status(400).json({ error: "eWR must have an estimated value" });

  const [existingRequest] = await db.select()
    .from(financingRequestsTable)
    .where(and(
      eq(financingRequestsTable.ewrId, ewrId),
      inArray(financingRequestsTable.status, ["PENDING", "APPROVED", "DISBURSED"])
    ))
    .limit(1);
  if (existingRequest) {
    return res.status(409).json({ error: "An active or pending financing request already exists for this eWR" });
  }

  const marketValueUsd = parseFloat(ewr.estimatedValueUsd);
  const lMaxUsd = marketValueUsd * L_MAX_RATE;

  const request = await withTxRetry(() => db.transaction(async (tx) => {
    const [created] = await tx.insert(financingRequestsTable).values({
      ewrId,
      requesterId: user.id,
      marketValueUsd: String(marketValueUsd),
      lMaxUsd: String(lMaxUsd),
      interestRate: String(DEFAULT_INTEREST_RATE),
      notes,
    }).returning();

    await tx.insert(auditLogTable).values({
      entityType: "FINANCING_REQUEST",
      entityId: created.id,
      action: "FINANCING_REQUESTED",
      actorId: user.id,
      payloadHash: sha256({ requestId: created.id, ewrId, marketValueUsd, lMaxUsd }),
      metadata: JSON.stringify({ ewrId, marketValueUsd, lMaxUsd, interestRate: DEFAULT_INTEREST_RATE }),
    });

    return created;
  }));

  return res.status(201).json({
    ...request,
    requesterName: user.name,
    lenderName: null,
    commodityType: ewr.commodityType,
    grade: ewr.grade,
    weightMt: ewr.weightMt,
    warehouseCode: ewr.warehouseCode,
    estimatedValueUsd: ewr.estimatedValueUsd,
  });
});

router.get("/financing/:requestId", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const requestId = parseInt(req.params.requestId);
  if (isNaN(requestId)) return res.status(400).json({ error: "Invalid request ID" });

  const [request] = await db.select().from(financingRequestsTable).where(eq(financingRequestsTable.id, requestId)).limit(1);
  if (!request) return res.status(404).json({ error: "Financing request not found" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!["PRODUCER", "FINANCIER", "ENABLER"].includes(user.tier)) return res.status(403).json({ error: "Forbidden" });

  if (user.tier === "PRODUCER" && request.requesterId !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const enriched = await enrichRequest(request);

  const loan = ["DISBURSED", "REPAID", "APPROVED"].includes(request.status)
    ? (await db.select().from(loansTable).where(eq(loansTable.financingRequestId, request.id)).limit(1))[0] ?? null
    : null;

  return res.json({ ...enriched, loan });
});

router.patch("/financing/:requestId/approve", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const requestId = parseInt(req.params.requestId);
  if (isNaN(requestId)) return res.status(400).json({ error: "Invalid request ID" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "FINANCIER") return res.status(403).json({ error: "Only Financier accounts can approve financing requests" });

  try {
    const updated = await withTxRetry(() => db.transaction(async (tx) => {
      const [request] = await tx.select().from(financingRequestsTable)
        .where(eq(financingRequestsTable.id, requestId)).limit(1).for("update");

      if (!request) throw Object.assign(new Error("Financing request not found"), { statusCode: 404 });
      if (request.status !== "PENDING") throw Object.assign(new Error("Request is not in PENDING status"), { statusCode: 400 });

      const [ewr] = await tx.select().from(ewrsTable)
        .where(eq(ewrsTable.id, request.ewrId)).limit(1).for("update");
      if (!ewr) throw Object.assign(new Error("Collateral eWR not found"), { statusCode: 404 });
      if (ewr.isLienActive) throw Object.assign(new Error("eWR already has an active lien from another request"), { statusCode: 409 });
      if (ewr.state !== "INGESTED") throw Object.assign(new Error("eWR is no longer eligible (state is not INGESTED)"), { statusCode: 409 });

      const [conflicting] = await tx.select()
        .from(financingRequestsTable)
        .where(and(
          eq(financingRequestsTable.ewrId, request.ewrId),
          inArray(financingRequestsTable.status, ["APPROVED", "DISBURSED"]),
          ne(financingRequestsTable.id, requestId)
        ))
        .limit(1);
      if (conflicting) throw Object.assign(new Error("Another financing request for this eWR is already approved or active"), { statusCode: 409 });

      const now = new Date();
      const [result] = await tx.update(financingRequestsTable)
        .set({ status: "APPROVED", lenderId: user.id, approvedAt: now })
        .where(eq(financingRequestsTable.id, requestId))
        .returning();

      await tx.update(ewrsTable)
        .set({ state: "ENCUMBERED", isLienActive: true, lienHolderId: user.id })
        .where(eq(ewrsTable.id, request.ewrId));

      await tx.insert(loansTable).values({
        financingRequestId: requestId,
        principalUsd: request.lMaxUsd,
        interestRate: request.interestRate,
        startDate: now,
        outstandingBalanceUsd: request.lMaxUsd,
        lienStatus: "ACTIVE",
      });

      await tx.insert(auditLogTable).values({
        entityType: "FINANCING_REQUEST",
        entityId: requestId,
        action: "FINANCING_APPROVED",
        actorId: user.id,
        payloadHash: sha256({ requestId, lenderId: user.id, ewrId: request.ewrId, lMaxUsd: request.lMaxUsd }),
        metadata: JSON.stringify({ lenderId: user.id, principal: request.lMaxUsd, interestRate: request.interestRate }),
      });

      // Blueprint §5.1 Step 3 — Registry Encumbrance Locking
      // Simulate automated call to eWRS-CR /v1/registry/encumber
      await tx.insert(auditLogTable).values({
        entityType: "FINANCING_REQUEST",
        entityId: requestId,
        action: "WRSC_LIEN_LOCK_TRANSMITTED",
        actorId: user.id,
        payloadHash: sha256({ requestId, ewrId: request.ewrId, action: "LIEN_LOCK", lienHolderId: user.id }),
        metadata: JSON.stringify({
          registryEndpoint: "eWRS-CR /v1/registry/encumber",
          ewrId: request.ewrId,
          newStatus: "STATUS_ENCUMBERED",
          lienHolderId: user.id,
          responseCode: "200-OK",
          timestamp: now.toISOString(),
        }),
      });

      return result;
    }));

    return res.json(updated);
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    if (statusCode < 500) return res.status(statusCode).json({ error: err.message });
    throw err;
  }
});

router.patch("/financing/:requestId/disburse", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const requestId = parseInt(req.params.requestId);
  if (isNaN(requestId)) return res.status(400).json({ error: "Invalid request ID" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "FINANCIER") return res.status(403).json({ error: "Only Financier accounts can disburse financing" });

  try {
    const updated = await withTxRetry(() => db.transaction(async (tx) => {
      const [request] = await tx.select().from(financingRequestsTable)
        .where(eq(financingRequestsTable.id, requestId)).limit(1).for("update");

      if (!request) throw Object.assign(new Error("Financing request not found"), { statusCode: 404 });
      if (request.status !== "APPROVED") throw Object.assign(new Error("Request is not in APPROVED status — only APPROVED requests can be disbursed"), { statusCode: 400 });

      const now = new Date();
      const transferRef = sha256({ requestId, disbursedAt: now.toISOString(), principal: request.lMaxUsd });
      const bankTransferRef = `TXN-${transferRef.slice(0, 12).toUpperCase()}`;

      const [result] = await tx.update(financingRequestsTable)
        .set({ status: "DISBURSED", disbursedAt: now })
        .where(eq(financingRequestsTable.id, requestId))
        .returning();

      // Blueprint §5.1 Step 2 — Bank Capital Ingress
      // Simulate partner bank API transferring L_max to farmer's mobile money wallet
      await tx.insert(auditLogTable).values({
        entityType: "FINANCING_REQUEST",
        entityId: requestId,
        action: "FINANCING_DISBURSED",
        actorId: user.id,
        payloadHash: transferRef,
        metadata: JSON.stringify({
          principalUsd: request.lMaxUsd,
          bankTransferRef,
          channel: "MOBILE_MONEY",
          recipientId: request.requesterId,
          disbursedAt: now.toISOString(),
        }),
      });

      // Blueprint §5.1 Step 3 — Confirm bank capital ingress with eWRS-CR registry
      await tx.insert(auditLogTable).values({
        entityType: "FINANCING_REQUEST",
        entityId: requestId,
        action: "WRSC_BANK_INGRESS_CONFIRMED",
        actorId: user.id,
        payloadHash: sha256({ requestId, action: "BANK_INGRESS_CONFIRM", ewrId: request.ewrId }),
        metadata: JSON.stringify({
          registryEndpoint: "eWRS-CR /v1/lien/capital-ingress",
          ewrId: request.ewrId,
          bankTransferRef,
          lMaxUsd: request.lMaxUsd,
          responseCode: "200-OK",
          timestamp: now.toISOString(),
        }),
      });

      return result;
    }));

    return res.json(updated);
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    if (statusCode < 500) return res.status(statusCode).json({ error: err.message });
    throw err;
  }
});

router.patch("/financing/:requestId/reject", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const requestId = parseInt(req.params.requestId);
  if (isNaN(requestId)) return res.status(400).json({ error: "Invalid request ID" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "FINANCIER") return res.status(403).json({ error: "Only Financier accounts can reject financing requests" });

  try {
    const updated = await withTxRetry(() => db.transaction(async (tx) => {
      const [request] = await tx.select().from(financingRequestsTable)
        .where(eq(financingRequestsTable.id, requestId)).limit(1).for("update");

      if (!request) throw Object.assign(new Error("Financing request not found"), { statusCode: 404 });
      if (request.status !== "PENDING") throw Object.assign(new Error("Request is not in PENDING status"), { statusCode: 400 });

      const [result] = await tx.update(financingRequestsTable)
        .set({ status: "REJECTED", lenderId: user.id })
        .where(eq(financingRequestsTable.id, requestId))
        .returning();

      await tx.insert(auditLogTable).values({
        entityType: "FINANCING_REQUEST",
        entityId: requestId,
        action: "FINANCING_REJECTED",
        actorId: user.id,
        payloadHash: sha256({ requestId, lenderId: user.id, ewrId: request.ewrId }),
        metadata: JSON.stringify({ lenderId: user.id }),
      });

      return result;
    }));

    return res.json(updated);
  } catch (err: any) {
    const statusCode = err.statusCode ?? 500;
    if (statusCode < 500) return res.status(statusCode).json({ error: err.message });
    throw err;
  }
});

export default router;
