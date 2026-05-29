import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  settlementsTable,
  loansTable,
  ordersTable,
  auditLogTable,
  usersTable,
} from "@workspace/db";
import { eq, and, gte, sql, ilike, or } from "drizzle-orm";

const router = Router();

router.get("/admin/earnings", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!["ENABLER", "FINANCIER"].includes(user.tier)) return res.status(403).json({ error: "Admin access required" });

  const { period = "30d" } = req.query as { period?: string };

  const now = new Date();
  let since: Date | null = null;
  if (period === "7d") since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (period === "30d") since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  else if (period === "90d") since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Settlement platform fees are the canonical source for platform fee revenue.
  // Interest earned = rBankUsd - principalUsd for completed bank-leg disbursements.
  const sQuery = db.select({
    totalPlatformFees: sql<number>`COALESCE(SUM(CAST(${settlementsTable.fPlatformUsd} AS NUMERIC)), 0)`,
    totalBankRepayments: sql<number>`COALESCE(SUM(CASE WHEN ${settlementsTable.bankLegStatus} = 'DISBURSED' THEN CAST(${settlementsTable.rBankUsd} AS NUMERIC) ELSE 0 END), 0)`,
    interestEarned: sql<number>`COALESCE(SUM(CASE WHEN ${settlementsTable.bankLegStatus} = 'DISBURSED' AND ${settlementsTable.loanId} IS NOT NULL THEN GREATEST(CAST(${settlementsTable.rBankUsd} AS NUMERIC) - CAST(${loansTable.principalUsd} AS NUMERIC), 0) ELSE 0 END), 0)`,
    settlementCount: sql<number>`COUNT(*)`,
    completedCount: sql<number>`COUNT(CASE WHEN ${settlementsTable.completedAt} IS NOT NULL THEN 1 END)`,
  }).from(settlementsTable).leftJoin(loansTable, eq(settlementsTable.loanId, loansTable.id));

  // Escrow fees are collected at order creation (separate from settlement platform fees).
  // Settled order count tracks fully completed spot trades.
  const oQuery = db.select({
    totalEscrowFees: sql<number>`COALESCE(SUM(CAST(${ordersTable.escrowFeeUsd} AS NUMERIC)), 0)`,
    settledCount: sql<number>`COUNT(CASE WHEN ${ordersTable.status} = 'SETTLED' THEN 1 END)`,
  }).from(ordersTable);

  const [sStats] = since
    ? await sQuery.where(gte(settlementsTable.createdAt, since))
    : await sQuery;

  const [oStats] = since
    ? await oQuery.where(gte(ordersTable.createdAt, since))
    : await oQuery;

  const totalBankRepayments = Number(sStats?.totalBankRepayments ?? 0);
  const interestEarned = Number(sStats?.interestEarned ?? 0);
  // Facilitation fee = 0.5% of interest earned (not of total repayment principal+interest)
  const financingFacilitationFees = interestEarned * 0.005;

  return res.json({
    period,
    totalPlatformFeesUsd: Number(sStats?.totalPlatformFees ?? 0),
    totalEscrowFeesUsd: Number(oStats?.totalEscrowFees ?? 0),
    financingFacilitationFeesUsd: parseFloat(financingFacilitationFees.toFixed(2)),
    interestEarnedUsd: parseFloat(interestEarned.toFixed(2)),
    totalBankRepaymentsUsd: totalBankRepayments,
    settlementCount: Number(sStats?.settlementCount ?? 0),
    completedSettlementCount: Number(sStats?.completedCount ?? 0),
    settledOrderCount: Number(oStats?.settledCount ?? 0),
  });
});

router.get("/audit", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!["ENABLER", "FINANCIER"].includes(user.tier)) return res.status(403).json({ error: "Admin access required" });

  const { entityType, entityId, limit = "50" } = req.query as { entityType?: string; entityId?: string; limit?: string };

  const conditions = [];
  if (entityType) conditions.push(eq(auditLogTable.entityType, entityType));
  if (entityId) conditions.push(eq(auditLogTable.entityId, parseInt(entityId)));

  const entries = await db.select({
    log: auditLogTable,
    actorName: usersTable.name,
  }).from(auditLogTable)
    .leftJoin(usersTable, eq(auditLogTable.actorId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${auditLogTable.createdAt} DESC`)
    .limit(Math.min(parseInt(limit) || 50, 200));

  return res.json(entries.map(e => ({ ...e.log, actorName: e.actorName ?? null })));
});

/* ── GET /admin/users — list all users (ENABLER/FINANCIER only) ── */
router.get("/admin/users", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!me || !["ENABLER", "FINANCIER"].includes(me.tier))
    return res.status(403).json({ error: "Admin access required" });

  const { tier, search } = req.query as { tier?: string; search?: string };

  const conditions = [];
  if (tier) conditions.push(eq(usersTable.tier, tier as any));
  if (search) {
    conditions.push(
      or(
        ilike(usersTable.name, `%${search}%`),
        ilike(usersTable.email, `%${search}%`),
        ilike(usersTable.company ?? "", `%${search}%`)
      )
    );
  }

  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      company: usersTable.company,
      tier: usersTable.tier,
      kybStatus: usersTable.kybStatus,
      reputationScore: usersTable.reputationScore,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${usersTable.createdAt} DESC`);

  return res.json(users);
});

/* ── PATCH /admin/users/:id — update tier / kybStatus ── */
router.patch("/admin/users/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [me] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!me || !["ENABLER", "FINANCIER"].includes(me.tier))
    return res.status(403).json({ error: "Admin access required" });

  const targetId = parseInt(req.params.id);
  if (isNaN(targetId)) return res.status(400).json({ error: "Invalid user ID" });

  const { tier, kybStatus } = req.body as { tier?: string; kybStatus?: string };

  const VALID_TIERS = ["PRODUCER", "OFF_TAKER", "ENABLER", "FINANCIER"];
  const VALID_KYB   = ["PENDING", "APPROVED", "REJECTED"];

  const updateData: Partial<typeof usersTable.$inferInsert> = {};
  if (tier !== undefined) {
    if (!VALID_TIERS.includes(tier)) return res.status(400).json({ error: "Invalid tier" });
    updateData.tier = tier as any;
  }
  if (kybStatus !== undefined) {
    if (!VALID_KYB.includes(kybStatus)) return res.status(400).json({ error: "Invalid kybStatus" });
    updateData.kybStatus = kybStatus as any;
  }

  if (Object.keys(updateData).length === 0)
    return res.status(400).json({ error: "Nothing to update" });

  const [updated] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, targetId))
    .returning();

  if (!updated) return res.status(404).json({ error: "User not found" });
  return res.json(updated);
});

export default router;
