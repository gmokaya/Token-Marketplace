/**
 * §3.1 API Data Payload Ingestion Specification
 * External eWRS API Compatibility Layer (CSM Technologies contract)
 *
 * Exposes two groups of endpoints:
 *  - POST /webhooks/registry-sync   — HMAC-verified webhook, no Clerk auth
 *  - /ewr/**                        — OAuth2 JWT auth (client_credentials)
 *
 * These routes MUST be mounted BEFORE the global Clerk requireAuth middleware.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { db } from "@workspace/db";
import {
  ewrsTable,
  usersTable,
  financingRequestsTable,
  loansTable,
  spotListingsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

const isProd = process.env.NODE_ENV === "production";

// This router is mounted BEFORE the global Clerk auth (it carries its own OAuth2/HMAC
// auth), so it must never run in production with well-known default secrets. In
// production it is only mounted when every secret is explicitly configured via env
// (see EWR_API_SECURELY_CONFIGURED + index.ts); otherwise it is left unmounted so the
// weak-auth surface is never exposed. The dev fallbacks below exist only so the local
// demo and the EwrApi playground page work out of the box outside production.
export const EWR_API_SECURELY_CONFIGURED =
  !isProd ||
  Boolean(
    process.env.WRSC_SECRET &&
    process.env.EWR_JWT_SECRET &&
    process.env.EWR_OAUTH_CLIENTS
  );

const WRSC_SECRET = process.env.WRSC_SECRET || "wrsc-dev-registry-secret-2025";
const EWR_JWT_SECRET = process.env.EWR_JWT_SECRET || "ewr-jwt-secret-2025";

// ── OAuth2 client registry ────────────────────────────────────────────────────
type OAuthClient = { secret: string; name: string; scope: string[] };

// Demo clients for the local EwrApi playground only. These credentials are
// intentionally visible in the demo UI and are NEVER used in production.
const DEV_OAUTH_CLIENTS: Record<string, OAuthClient> = {
  "fi-agrifinance-01": { secret: "fi-secret-2025", name: "AgriFinance Bank Kenya", scope: ["read", "write"] },
  "wo-nakuru-01": { secret: "wo-secret-2025", name: "Nakuru Warehouse Services Ltd", scope: ["read", "write"] },
  "komex-platform-01": { secret: "komex-secret-2025", name: "KOMEX Trading Platform", scope: ["read", "write"] },
  "fi-equity-02": { secret: "equity-secret-2025", name: "Equity Agrovet Finance", scope: ["read", "write"] },
};

// In production the client registry MUST come from env EWR_OAUTH_CLIENTS — a JSON
// object of { clientId: { secret, name, scope } }. No hardcoded secrets reach prod.
function loadOAuthClients(): Record<string, OAuthClient> {
  const raw = process.env.EWR_OAUTH_CLIENTS;
  if (raw) {
    try {
      return JSON.parse(raw) as Record<string, OAuthClient>;
    } catch {
      throw new Error("[ewr-api] EWR_OAUTH_CLIENTS must be valid JSON");
    }
  }
  return DEV_OAUTH_CLIENTS;
}

const OAUTH_CLIENTS: Record<string, OAuthClient> = loadOAuthClients();

// ── Minimal HS256 JWT (no external library needed) ────────────────────────────

function b64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}

function signJwt(payload: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", EWR_JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [h, b, s] = parts;
    const expected = createHmac("sha256", EWR_JWT_SECRET)
      .update(`${h}.${b}`)
      .digest("base64url");
    if (s !== expected) return null;
    const payload = JSON.parse(
      Buffer.from(b, "base64url").toString("utf8")
    ) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Auth middleware: eWR OAuth2 JWT only ──────────────────────────────────────
function requireEwrToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Bearer token required" });
    return;
  }
  const payload = verifyJwt(auth.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
    return;
  }
  (req as Request & { ewrClient: unknown }).ewrClient = payload;
  next();
}

// ── Format eWR as standardized issuance response ──────────────────────────────
function formatIssuance(
  ewr: typeof ewrsTable.$inferSelect,
  owner: typeof usersTable.$inferSelect | undefined
): Record<string, unknown> {
  return {
    issuanceWhId: ewr.id,
    warehouseReceiptNumber: ewr.ewrsReceiptId,
    warehouseCode: ewr.warehouseCode,
    issuanceDate: ewr.issuedAt,
    expiryDate: ewr.expiryAt ?? null,
    commodityDetail: {
      commodityType: ewr.commodityType,
      grade: ewr.grade,
      quantityInMt: parseFloat(ewr.weightMt),
      moistureContent: ewr.moisturePct ? parseFloat(ewr.moisturePct) : null,
      harvestSeason: ewr.harvestSeason,
      batchType: ewr.batchType,
    },
    encumbranceStatus: {
      isLienActive: ewr.isLienActive ?? false,
      lienHolderId: ewr.lienHolderId ?? null,
    },
    depositorDetails: owner
      ? {
          internalId: owner.id,
          nameOfDepositor: owner.name,
          emailAddress: owner.email,
          company: (owner as Record<string, unknown>).company ?? null,
          typeOfDepositor: (owner as Record<string, unknown>).company
            ? "Entity"
            : "Individual",
        }
      : null,
    state: ewr.state,
    estimatedValueUsd: ewr.estimatedValueUsd
      ? parseFloat(ewr.estimatedValueUsd)
      : null,
    wrscSignature: ewr.wrscSignature,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1.  OAuth2 Token Endpoint  (no auth — self-service)
//     POST /ewr/oauth2/token
// ─────────────────────────────────────────────────────────────────────────────
router.post("/ewr/oauth2/token", (req: Request, res: Response): void => {
  const {
    grant_type,
    client_id,
    client_secret,
  } = req.body as Record<string, string>;

  if (grant_type !== "client_credentials") {
    res.status(400).json({ error: "unsupported_grant_type" });
    return;
  }
  if (!client_id || !client_secret) {
    res.status(400).json({ error: "invalid_request", message: "client_id and client_secret required" });
    return;
  }
  const client = OAUTH_CLIENTS[client_id];
  if (!client || client.secret !== client_secret) {
    res.status(401).json({ error: "invalid_client", message: "Unknown or invalid client credentials" });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 1800; // 30 minutes
  const token = signJwt({
    sub: client_id,
    aud: client_id,
    nbf: now,
    scope: client.scope,
    iss: "WRS-MARKETPLACE",
    exp: now + expiresIn,
    iat: now,
    jti: randomUUID(),
    clientName: client.name,
  });

  res.json({
    access_token: token,
    token_type: "bearer",
    expires_in: expiresIn,
    scope: client.scope.join(" "),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2.  Registry-Sync Webhook  (HMAC-only — no Clerk, no OAuth2 JWT)
//     POST /webhooks/registry-sync
//     Accepts §3.1 standardised JSON from the WRSC Central Registry
// ─────────────────────────────────────────────────────────────────────────────
router.post("/webhooks/registry-sync", async (req: Request, res: Response): Promise<void> => {
  // WRSC-CR HMAC is MANDATORY: this is a pre-Clerk route that mutates core asset
  // registry data, so an unsigned/invalid request must always be rejected.
  const signature = req.headers["x-wrsc-signature"];
  if (typeof signature !== "string" || signature.length === 0) {
    res.status(401).json({ error: "Missing webhook signature" });
    return;
  }
  const expected = createHmac("sha256", WRSC_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex");
  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const {
    ewrs_receipt_id,
    wrsc_registry_signature,
    warehouse_code,
    commodity_metadata,
    encumbrance_status,
    depositor_id,
    depositor_email,
  } = req.body as {
    ewrs_receipt_id?: string;
    wrsc_registry_signature?: string;
    warehouse_code?: string;
    commodity_metadata?: {
      type?: string;
      grade?: string;
      measured_weight_mt?: number;
      moisture_content_pct?: number;
      harvest_season?: string;
    };
    encumbrance_status?: { is_lien_active?: boolean; lien_holder_id?: number | null };
    depositor_id?: number;
    depositor_email?: string;
  };

  if (!ewrs_receipt_id || !wrsc_registry_signature || !warehouse_code || !commodity_metadata) {
    res.status(400).json({
      error: "Missing required fields",
      required: [
        "ewrs_receipt_id",
        "wrsc_registry_signature",
        "warehouse_code",
        "commodity_metadata",
      ],
    });
    return;
  }

  // If the receipt already exists → update encumbrance, return updated record
  const [existing] = await db
    .select()
    .from(ewrsTable)
    .where(eq(ewrsTable.ewrsReceiptId, ewrs_receipt_id))
    .limit(1);

  if (existing) {
    if (encumbrance_status !== undefined) {
      await db
        .update(ewrsTable)
        .set({
          isLienActive: encumbrance_status.is_lien_active ?? false,
          lienHolderId: encumbrance_status.lien_holder_id ?? null,
        })
        .where(eq(ewrsTable.ewrsReceiptId, ewrs_receipt_id));
    }
    const [updated] = await db
      .select()
      .from(ewrsTable)
      .where(eq(ewrsTable.ewrsReceiptId, ewrs_receipt_id))
      .limit(1);
    res.json({ status: "updated", ewrsReceiptId: ewrs_receipt_id, ewr: updated });
    return;
  }

  // Resolve owner
  let ownerId: number | null = depositor_id ?? null;
  if (!ownerId && depositor_email) {
    const [u] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, depositor_email))
      .limit(1);
    if (u) ownerId = u.id;
  }
  if (!ownerId) {
    res.status(400).json({
      error: "Cannot resolve owner: provide depositor_id or depositor_email",
    });
    return;
  }

  const [owner] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, ownerId))
    .limit(1);
  if (!owner) {
    res.status(404).json({ error: "Depositor not found" });
    return;
  }

  // Map §3.1 payload → internal eWR schema
  const rawType = (commodity_metadata.type ?? "MAIZE").toUpperCase();
  const commodityType = (
    ["MAIZE", "RICE", "COFFEE", "TEA", "AVOCADO"].includes(rawType)
      ? rawType
      : "MAIZE"
  ) as "MAIZE" | "RICE" | "COFFEE" | "TEA" | "AVOCADO";

  const isFungible = commodityType === "MAIZE" || commodityType === "RICE";
  const isTimeDecay = commodityType === "AVOCADO";
  const batchType = isTimeDecay
    ? ("TIME_DECAYING" as const)
    : isFungible
    ? ("FUNGIBLE" as const)
    : ("SEMI_FUNGIBLE" as const);

  const [created] = await db
    .insert(ewrsTable)
    .values({
      ewrsReceiptId: ewrs_receipt_id,
      wrscSignature: wrsc_registry_signature,
      warehouseCode: warehouse_code,
      commodityType,
      batchType,
      grade: commodity_metadata.grade ?? "Grade A",
      weightMt: String(commodity_metadata.measured_weight_mt ?? 0),
      harvestSeason: commodity_metadata.harvest_season ?? "UNKNOWN",
      moisturePct:
        commodity_metadata.moisture_content_pct != null
          ? String(commodity_metadata.moisture_content_pct)
          : undefined,
      isLienActive: encumbrance_status?.is_lien_active ?? false,
      lienHolderId: encumbrance_status?.lien_holder_id ?? null,
      ownerId,
      state: "INGESTED",
    })
    .returning();

  res.status(201).json({
    status: "created",
    ewrsReceiptId: ewrs_receipt_id,
    internalId: created.id,
    ewr: created,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.  Master Data Endpoints  (static reference data)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/ewr/master/depositor-types", requireEwrToken, (_req, res) => {
  res.json([
    { depositorTypeId: "1", depositorType: "Entity" },
    { depositorTypeId: "2", depositorType: "Individual" },
  ]);
});

router.get("/ewr/master/entity-types", requireEwrToken, (_req, res) => {
  res.json([
    { typeOfEntityId: "1", typeOfEntityName: "Cooperative" },
    { typeOfEntityId: "2", typeOfEntityName: "Partnership" },
    { typeOfEntityId: "3", typeOfEntityName: "Private Limited Company" },
    { typeOfEntityId: "4", typeOfEntityName: "Sole Proprietor" },
  ]);
});

router.get("/ewr/master/commodity-types", requireEwrToken, (_req, res) => {
  res.json({
    status: 200,
    message: "Success",
    result: [
      { commodityTypeId: "CT001", commodityTypeName: "Agricultural — Cereals" },
      { commodityTypeId: "CT002", commodityTypeName: "Horticultural" },
      { commodityTypeId: "CT003", commodityTypeName: "Beverage Crops" },
    ],
  });
});

router.get("/ewr/master/commodity-names", requireEwrToken, (_req, res) => {
  res.json({
    status: 200,
    message: "Success",
    result: [
      { commodityId: "CMD001", commodityName: "Maize", commodityTypeId: "CT001" },
      { commodityId: "CMD002", commodityName: "Rice", commodityTypeId: "CT001" },
      { commodityId: "CMD003", commodityName: "Coffee (Arabica)", commodityTypeId: "CT003" },
      { commodityId: "CMD004", commodityName: "Tea (CTC)", commodityTypeId: "CT003" },
      { commodityId: "CMD005", commodityName: "Avocado (Hass)", commodityTypeId: "CT002" },
    ],
  });
});

router.get("/ewr/master/counties", requireEwrToken, (_req, res) => {
  res.json([
    { countyId: "CNT001", countyName: "Nairobi" },
    { countyId: "CNT002", countyName: "Mombasa" },
    { countyId: "CNT003", countyName: "Nakuru" },
    { countyId: "CNT004", countyName: "Kisumu" },
    { countyId: "CNT005", countyName: "Uasin Gishu (Eldoret)" },
    { countyId: "CNT006", countyName: "Nyeri" },
    { countyId: "CNT007", countyName: "Meru" },
    { countyId: "CNT008", countyName: "Kiambu (Thika)" },
    { countyId: "CNT009", countyName: "Murang'a" },
    { countyId: "CNT010", countyName: "Laikipia" },
  ]);
});

router.get("/ewr/master/seasons", requireEwrToken, (_req, res) => {
  const year = new Date().getFullYear();
  const seasons: { seasonId: string; seasonName: string }[] = [];
  for (let y = year; y >= year - 3; y--) {
    seasons.push({
      seasonId: `${y}S1`,
      seasonName: `${y} Season 1 — Long Rains (Mar–Jul)`,
    });
    seasons.push({
      seasonId: `${y}S2`,
      seasonName: `${y} Season 2 — Short Rains (Oct–Dec)`,
    });
  }
  res.json({ status: 200, message: "Success", result: seasons });
});

router.get("/ewr/master/charge-headers", requireEwrToken, (_req, res) => {
  res.json({
    status: 200,
    message: "Success",
    result: [
      { chargeHeaderId: "CH001", chargeHeaderName: "Storage Charges", ratePerMtPerMonth: 250, currency: "KES" },
      { chargeHeaderId: "CH002", chargeHeaderName: "Inspection / Grading Fee", flatRateKes: 1500, currency: "KES" },
      { chargeHeaderId: "CH003", chargeHeaderName: "Handling Charges", ratePerMtKes: 120, currency: "KES" },
      { chargeHeaderId: "CH004", chargeHeaderName: "Insurance Premium", ratePercent: 0.5 },
      { chargeHeaderId: "CH005", chargeHeaderName: "Registration Fee", flatRateKes: 2000, currency: "KES" },
      { chargeHeaderId: "CH006", chargeHeaderName: "Warehouse Levy", ratePercent: 1.5 },
    ],
  });
});

router.get("/ewr/master/unit-types", requireEwrToken, (_req, res) => {
  res.json([
    { unitTypeId: "UT001", unitTypeName: "Metric Ton (MT)" },
    { unitTypeId: "UT002", unitTypeName: "Kilogram (KG)" },
    { unitTypeId: "UT003", unitTypeName: "90 kg Bag" },
    { unitTypeId: "UT004", unitTypeName: "50 kg Bag" },
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4.  Warehouse Operator APIs
// ─────────────────────────────────────────────────────────────────────────────

// GET /ewr/warehouse/depositors
router.get(
  "/ewr/warehouse/depositors",
  requireEwrToken,
  async (_req, res): Promise<void> => {
    const depositors = await db
      .select({
        depositorId: usersTable.id,
        applicationId: usersTable.clerkId,
        nameOfDepositor: usersTable.name,
        emailAddress: usersTable.email,
      })
      .from(usersTable)
      .where(eq(usersTable.tier, "PRODUCER"));
    res.json({ status: 200, message: "Success", result: depositors });
  }
);

// GET /ewr/warehouse/depositor/by-email/:email
router.get(
  "/ewr/warehouse/depositor/by-email/:email",
  requireEwrToken,
  async (req, res): Promise<void> => {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.email, req.params["email"] as string),
          eq(usersTable.tier, "PRODUCER")
        )
      )
      .limit(1);
    if (!user) {
      res.status(404).json({ error: "Depositor not found" });
      return;
    }
    res.json({
      depositorId: user.id,
      applicationId: user.clerkId,
      nameOfDepositor: user.name,
      emailAddress: user.email,
      typeOfDepositor: (user as Record<string, unknown>).company ? "Entity" : "Individual",
    });
  }
);

// GET /ewr/warehouse/issuance/:id  (by internal DB id)
router.get(
  "/ewr/warehouse/issuance/:id",
  requireEwrToken,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid issuance ID" });
      return;
    }
    const [ewr] = await db
      .select()
      .from(ewrsTable)
      .where(eq(ewrsTable.id, id))
      .limit(1);
    if (!ewr) {
      res.status(404).json({ error: "Issuance not found" });
      return;
    }
    const [owner] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, ewr.ownerId))
      .limit(1);
    res.json(formatIssuance(ewr, owner));
  }
);

// GET /ewr/getIssuanceDetailsById  (FI doc §4.6 — lookup by receipt number)
router.get(
  "/ewr/getIssuanceDetailsById",
  requireEwrToken,
  async (req, res): Promise<void> => {
    const receiptNo = (req.query["wareHouseReciptNo"] ??
      (req.body as Record<string, unknown>)?.wareHouseReciptNo) as
      | string
      | undefined;
    if (!receiptNo) {
      res.status(400).json({ error: "wareHouseReciptNo required" });
      return;
    }
    const [ewr] = await db
      .select()
      .from(ewrsTable)
      .where(eq(ewrsTable.ewrsReceiptId, receiptNo))
      .limit(1);
    if (!ewr) {
      res.status(404).json({ error: "Warehouse receipt not found" });
      return;
    }
    const [owner] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, ewr.ownerId))
      .limit(1);
    res.json(formatIssuance(ewr, owner));
  }
);

// POST /ewr/warehouse/register-receipt  (create new eWR from §3.1 format)
router.post(
  "/ewr/warehouse/register-receipt",
  requireEwrToken,
  async (req, res): Promise<void> => {
    const {
      ewrs_receipt_id,
      wrsc_registry_signature,
      warehouse_code,
      commodity_metadata,
      encumbrance_status,
      depositor_id,
      depositor_email,
    } = req.body as {
      ewrs_receipt_id?: string;
      wrsc_registry_signature?: string;
      warehouse_code?: string;
      commodity_metadata?: {
        type?: string;
        grade?: string;
        measured_weight_mt?: number;
        moisture_content_pct?: number;
        harvest_season?: string;
      };
      encumbrance_status?: { is_lien_active?: boolean; lien_holder_id?: number | null };
      depositor_id?: number;
      depositor_email?: string;
    };

    if (!ewrs_receipt_id || !wrsc_registry_signature || !warehouse_code || !commodity_metadata) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["ewrs_receipt_id", "wrsc_registry_signature", "warehouse_code", "commodity_metadata"],
      });
      return;
    }

    // Duplicate check
    const [dup] = await db
      .select({ id: ewrsTable.id })
      .from(ewrsTable)
      .where(eq(ewrsTable.ewrsReceiptId, ewrs_receipt_id))
      .limit(1);
    if (dup) {
      res.status(409).json({ error: "Receipt already registered", internalId: dup.id });
      return;
    }

    // Resolve owner
    let ownerId: number | null = depositor_id ?? null;
    if (!ownerId && depositor_email) {
      const [u] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, depositor_email))
        .limit(1);
      if (u) ownerId = u.id;
    }
    if (!ownerId) {
      res.status(400).json({ error: "Cannot resolve depositor: provide depositor_id or depositor_email" });
      return;
    }

    const rawType = (commodity_metadata.type ?? "MAIZE").toUpperCase();
    const commodityType = (
      ["MAIZE", "RICE", "COFFEE", "TEA", "AVOCADO"].includes(rawType)
        ? rawType
        : "MAIZE"
    ) as "MAIZE" | "RICE" | "COFFEE" | "TEA" | "AVOCADO";

    const isFungible = commodityType === "MAIZE" || commodityType === "RICE";
    const isTimeDecay = commodityType === "AVOCADO";
    const batchType = isTimeDecay
      ? ("TIME_DECAYING" as const)
      : isFungible
      ? ("FUNGIBLE" as const)
      : ("SEMI_FUNGIBLE" as const);

    const [created] = await db
      .insert(ewrsTable)
      .values({
        ewrsReceiptId: ewrs_receipt_id,
        wrscSignature: wrsc_registry_signature,
        warehouseCode: warehouse_code,
        commodityType,
        batchType,
        grade: commodity_metadata.grade ?? "Grade A",
        weightMt: String(commodity_metadata.measured_weight_mt ?? 0),
        harvestSeason: commodity_metadata.harvest_season ?? "UNKNOWN",
        moisturePct:
          commodity_metadata.moisture_content_pct != null
            ? String(commodity_metadata.moisture_content_pct)
            : undefined,
        isLienActive: encumbrance_status?.is_lien_active ?? false,
        lienHolderId: encumbrance_status?.lien_holder_id ?? null,
        ownerId,
        state: "INGESTED",
      })
      .returning();

    res.status(201).json({
      status: "success",
      message: "Warehouse receipt registered successfully",
      internalId: created.id,
      ewrsReceiptId: ewrs_receipt_id,
      ewr: created,
    });
  }
);

// GET /ewr/warehouse/market-data  (commodity spot prices aggregated from listings)
router.get(
  "/ewr/warehouse/market-data",
  requireEwrToken,
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        commodityType: ewrsTable.commodityType,
        grade: ewrsTable.grade,
        pricePerMt: spotListingsTable.pricePerMt,
        updatedAt: spotListingsTable.createdAt,
      })
      .from(spotListingsTable)
      .innerJoin(ewrsTable, eq(spotListingsTable.ewrId, ewrsTable.id))
      .orderBy(desc(spotListingsTable.createdAt))
      .limit(200);

    // Aggregate to the latest price per commodity+grade pair
    const priceMap: Record<
      string,
      { commodityType: string; grade: string; pricePerMt: number; updatedAt: Date }
    > = {};
    for (const row of rows) {
      const key = `${row.commodityType}_${row.grade}`;
      if (!priceMap[key]) {
        priceMap[key] = {
          commodityType: row.commodityType,
          grade: row.grade,
          pricePerMt: parseFloat(row.pricePerMt),
          updatedAt: row.updatedAt,
        };
      }
    }

    res.json({
      status: 200,
      message: "Success",
      result: Object.values(priceMap),
    });
  }
);

// GET /ewr/warehouse/listing-price/:receiptId
router.get(
  "/ewr/warehouse/listing-price/:receiptId",
  requireEwrToken,
  async (req, res): Promise<void> => {
    const [ewr] = await db
      .select()
      .from(ewrsTable)
      .where(eq(ewrsTable.ewrsReceiptId, req.params["receiptId"] as string))
      .limit(1);
    if (!ewr) {
      res.status(404).json({ error: "Receipt not found" });
      return;
    }
    const [listing] = await db
      .select()
      .from(spotListingsTable)
      .where(eq(spotListingsTable.ewrId, ewr.id))
      .limit(1);
    if (!listing) {
      res.status(404).json({ error: "No active listing for this receipt" });
      return;
    }
    const pricePerMt = parseFloat(listing.pricePerMt);
    const weightMt = parseFloat(ewr.weightMt);
    res.json({
      warehouseReceiptNumber: req.params.receiptId,
      pricePerMt,
      weightMt,
      totalValue: +(pricePerMt * weightMt).toFixed(2),
      currency: "USD",
      listedAt: listing.createdAt,
    });
  }
);

// POST /ewr/warehouse/pledge  (apply lien on a receipt — WO-initiated)
router.post(
  "/ewr/warehouse/pledge",
  requireEwrToken,
  async (req, res): Promise<void> => {
    const {
      financialInstitutionId,
      issueId,
      proposedLoanAmount,
    } = req.body as {
      financialInstitutionId?: string | number;
      issueId?: number;
      proposedLoanAmount?: number;
    };

    if (!issueId || !proposedLoanAmount || !financialInstitutionId) {
      res.status(400).json({
        error: "financialInstitutionId, issueId, and proposedLoanAmount are required",
      });
      return;
    }

    const [ewr] = await db
      .select()
      .from(ewrsTable)
      .where(eq(ewrsTable.id, issueId))
      .limit(1);
    if (!ewr) {
      res.status(404).json({ error: "Warehouse receipt not found" });
      return;
    }
    if (ewr.isLienActive) {
      res.status(409).json({ error: "Receipt is already pledged" });
      return;
    }
    if (ewr.state !== "INGESTED" && ewr.state !== "MARKET_LISTED") {
      res.status(409).json({ error: `Cannot pledge receipt in state: ${ewr.state}` });
      return;
    }

    // Resolve lien holder from our platform's FINANCIER users
    const financiers = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.tier, "FINANCIER"));
    const idx = Math.max(0, parseInt(String(financialInstitutionId), 10) - 1);
    const fi = financiers[idx] ?? financiers[0];

    if (fi) {
      await db
        .update(ewrsTable)
        .set({
          isLienActive: true,
          lienHolderId: fi.id,
          state: "ENCUMBERED",
        })
        .where(eq(ewrsTable.id, issueId));
    }

    res.json({
      status: "success",
      message: "Pledging applied successfully",
      pledgeId: `PLEDGE-${issueId}-${Date.now()}`,
      lienHolder: fi ? { id: fi.id, name: fi.name } : null,
    });
  }
);

// POST /ewr/warehouse/loan-sanction  (WO approves or rejects a loan)
router.post(
  "/ewr/warehouse/loan-sanction",
  requireEwrToken,
  async (req, res): Promise<void> => {
    const { financialLoanId, sanctionStatus, rejectionReason } = req.body as {
      financialLoanId?: number;
      sanctionStatus?: "SANCTIONED" | "REJECTED";
      rejectionReason?: string;
    };

    if (!financialLoanId) {
      res.status(400).json({ error: "financialLoanId required" });
      return;
    }

    const [loan] = await db
      .select()
      .from(loansTable)
      .where(eq(loansTable.id, financialLoanId))
      .limit(1);

    if (loan) {
      const newStatus =
        sanctionStatus === "REJECTED" ? ("DEFAULTED" as const) : ("ACTIVE" as const);
      await db
        .update(loansTable)
        .set({ lienStatus: newStatus })
        .where(eq(loansTable.id, loan.id));
    }

    res.json({
      status: "success",
      message:
        sanctionStatus === "REJECTED" ? "Loan rejected" : "Loan sanctioned",
      loanStatus: sanctionStatus ?? "SANCTIONED",
      rejectionReason: rejectionReason ?? null,
    });
  }
);

// POST /ewr/warehouse/transfer  (transfer receipt to a new depositor)
router.post(
  "/ewr/warehouse/transfer",
  requireEwrToken,
  async (req, res): Promise<void> => {
    const { warehouseReceiptNumber, newDepositorId, newDepositorEmail } =
      req.body as {
        warehouseReceiptNumber?: string;
        newDepositorId?: number;
        newDepositorEmail?: string;
      };

    if (!warehouseReceiptNumber) {
      res.status(400).json({ error: "warehouseReceiptNumber required" });
      return;
    }

    const [ewr] = await db
      .select()
      .from(ewrsTable)
      .where(eq(ewrsTable.ewrsReceiptId, warehouseReceiptNumber))
      .limit(1);
    if (!ewr) {
      res.status(404).json({ error: "Receipt not found" });
      return;
    }
    if (ewr.isLienActive) {
      res.status(409).json({ error: "Cannot transfer a pledged (encumbered) receipt" });
      return;
    }

    let newOwner: typeof usersTable.$inferSelect | undefined;
    if (newDepositorId) {
      [newOwner] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, newDepositorId))
        .limit(1);
    } else if (newDepositorEmail) {
      [newOwner] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, newDepositorEmail))
        .limit(1);
    }
    if (!newOwner) {
      res.status(404).json({ error: "New depositor not found" });
      return;
    }

    await db
      .update(ewrsTable)
      .set({ ownerId: newOwner.id })
      .where(eq(ewrsTable.ewrsReceiptId, warehouseReceiptNumber));

    res.json({
      status: "success",
      message: "Receipt transferred successfully",
      warehouseReceiptNumber,
      newOwner: {
        id: newOwner.id,
        name: newOwner.name,
        email: newOwner.email,
      },
      transferredAt: new Date().toISOString(),
    });
  }
);

// POST /ewr/warehouse/retire  (retire / settle a warehouse receipt)
router.post(
  "/ewr/warehouse/retire",
  requireEwrToken,
  async (req, res): Promise<void> => {
    const { warehouseReceiptNumber, retirementReason } = req.body as {
      warehouseReceiptNumber?: string;
      retirementReason?: string;
    };

    if (!warehouseReceiptNumber) {
      res.status(400).json({ error: "warehouseReceiptNumber required" });
      return;
    }

    const [ewr] = await db
      .select()
      .from(ewrsTable)
      .where(eq(ewrsTable.ewrsReceiptId, warehouseReceiptNumber))
      .limit(1);
    if (!ewr) {
      res.status(404).json({ error: "Receipt not found" });
      return;
    }
    if (ewr.state === "SETTLED") {
      res.status(409).json({ error: "Receipt is already retired" });
      return;
    }

    await db
      .update(ewrsTable)
      .set({ state: "SETTLED" })
      .where(eq(ewrsTable.ewrsReceiptId, warehouseReceiptNumber));

    res.json({
      status: "success",
      message: "Warehouse receipt retired successfully",
      warehouseReceiptNumber,
      retirementReason: retirementReason ?? null,
      retiredAt: new Date().toISOString(),
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 5.  Financial Institution APIs
// ─────────────────────────────────────────────────────────────────────────────

// GET /ewr/finance/institutions
router.get(
  "/ewr/finance/institutions",
  requireEwrToken,
  async (_req, res): Promise<void> => {
    const fis = await db
      .select({
        internalId: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .where(eq(usersTable.tier, "FINANCIER"));

    res.json(
      fis.map((fi, i) => ({
        financialInstitutionId: String(i + 1),
        financialInstitutionName: fi.name,
        email: fi.email,
        internalId: fi.internalId,
      }))
    );
  }
);

// POST /ewr/finance/pledge  (FI-initiated pledge — mirrors WO pledge)
router.post(
  "/ewr/finance/pledge",
  requireEwrToken,
  async (req, res): Promise<void> => {
    const { financialInstitutionId, issueId, proposedLoanAmount } = req.body as {
      financialInstitutionId?: string | number;
      issueId?: number;
      proposedLoanAmount?: number;
    };

    if (!issueId || !proposedLoanAmount || !financialInstitutionId) {
      res.status(400).json({
        error: "financialInstitutionId, issueId, and proposedLoanAmount required",
      });
      return;
    }

    const [ewr] = await db
      .select()
      .from(ewrsTable)
      .where(eq(ewrsTable.id, issueId))
      .limit(1);
    if (!ewr) {
      res.status(404).json({ error: "Receipt not found" });
      return;
    }
    if (ewr.isLienActive) {
      res.status(409).json({ error: "Already pledged" });
      return;
    }

    const financiers = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.tier, "FINANCIER"));
    const idx = Math.max(0, parseInt(String(financialInstitutionId), 10) - 1);
    const fi = financiers[idx] ?? financiers[0];

    if (fi) {
      await db
        .update(ewrsTable)
        .set({ isLienActive: true, lienHolderId: fi.id, state: "ENCUMBERED" })
        .where(eq(ewrsTable.id, issueId));
    }

    res.json({
      status: "success",
      message: "Pledging applied successfully",
      lienHolder: fi ? { id: fi.id, name: fi.name } : null,
    });
  }
);

// GET /ewr/finance/loan-details  (FI doc §4.4)
router.get(
  "/ewr/finance/loan-details",
  requireEwrToken,
  async (req, res): Promise<void> => {
    const receiptNo = (req.query["wareHouseReciptNo"] ??
      (req.body as Record<string, unknown>)?.wareHouseReciptNo) as
      | string
      | undefined;
    if (!receiptNo) {
      res.status(400).json({ error: "wareHouseReciptNo required" });
      return;
    }

    const [ewr] = await db
      .select()
      .from(ewrsTable)
      .where(eq(ewrsTable.ewrsReceiptId, receiptNo))
      .limit(1);
    if (!ewr) {
      res.status(404).json({ error: "Receipt not found" });
      return;
    }

    const [financing] = await db
      .select()
      .from(financingRequestsTable)
      .where(eq(financingRequestsTable.ewrId, ewr.id))
      .limit(1);
    if (!financing) {
      res.status(404).json({ error: "No financing found for this receipt" });
      return;
    }

    const [loan] = await db
      .select()
      .from(loansTable)
      .where(eq(loansTable.financingRequestId, financing.id))
      .limit(1);

    const durationMonths =
      loan && loan.repaidAt
        ? Math.round(
            (new Date(loan.repaidAt).getTime() -
              new Date(loan.startDate).getTime()) /
              (30 * 24 * 60 * 60 * 1000)
          )
        : null;

    res.json({
      financialInstitution: ewr.lienHolderId,
      dateOfPledging: financing.disbursedAt ?? financing.approvedAt ?? financing.createdAt,
      proposedLoanAmount: parseFloat(financing.lMaxUsd),
      proposedDateOfLoanClearance: loan?.repaidAt ?? null,
      durationOfLoan: durationMonths,
      loanStatus: loan ? loan.lienStatus : "PENDING",
      interestRate: loan ? parseFloat(loan.interestRate) * 100 : parseFloat(financing.interestRate) * 100,
    });
  }
);

// GET /ewr/finance/sanction-details  (FI doc §4.5)
router.get(
  "/ewr/finance/sanction-details",
  requireEwrToken,
  async (req, res): Promise<void> => {
    const receiptNo = (req.query["wareHouseReciptNo"] ??
      (req.body as Record<string, unknown>)?.wareHouseReciptNo) as
      | string
      | undefined;
    if (!receiptNo) {
      res.status(400).json({ error: "wareHouseReciptNo required" });
      return;
    }

    const [ewr] = await db
      .select()
      .from(ewrsTable)
      .where(eq(ewrsTable.ewrsReceiptId, receiptNo))
      .limit(1);
    if (!ewr) {
      res.status(404).json({ error: "Receipt not found" });
      return;
    }

    const [financing] = await db
      .select()
      .from(financingRequestsTable)
      .where(eq(financingRequestsTable.ewrId, ewr.id))
      .limit(1);
    if (!financing) {
      res.status(404).json({ error: "No financing found" });
      return;
    }

    const [loan] = await db
      .select()
      .from(loansTable)
      .where(eq(loansTable.financingRequestId, financing.id))
      .limit(1);
    if (!loan) {
      res.status(404).json({ error: "No loan record found" });
      return;
    }

    const durationMonths =
      loan.repaidAt
        ? Math.round(
            (new Date(loan.repaidAt).getTime() -
              new Date(loan.startDate).getTime()) /
              (30 * 24 * 60 * 60 * 1000)
          )
        : null;

    res.json({
      sanctionedLoanAmount: parseFloat(loan.principalUsd),
      approvedDateOfLoanClearance: loan.repaidAt ?? null,
      approvedDurationOfLoan: durationMonths,
      interestRate: parseFloat(loan.interestRate) * 100,
      loanStatus:
        loan.lienStatus === "ACTIVE"
          ? "SANCTIONED"
          : loan.lienStatus === "REPAID"
          ? "REPAID"
          : "REJECTED",
      rejectionReason: null,
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 6.  KOMEX Trading Platform API
//     POST /ewr/komex/submit
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/ewr/komex/submit",
  requireEwrToken,
  async (req, res): Promise<void> => {
    const {
      issuanceWhId,
      warehouseReceiptNumber,
      depositorName,
      operationalCost = 0,
      councilCharge = 0,
      pledgedAmount = 0,
      pledgedStatus = "No",
      retirementStatus = "No",
    } = req.body as {
      issuanceWhId?: number;
      warehouseReceiptNumber?: string;
      depositorName?: string;
      operationalCost?: number;
      councilCharge?: number;
      pledgedAmount?: number;
      pledgedStatus?: "Yes" | "No";
      retirementStatus?: "Yes" | "No";
    };

    if (!issuanceWhId && !warehouseReceiptNumber) {
      res.status(400).json({
        error: "issuanceWhId or warehouseReceiptNumber required",
      });
      return;
    }

    // Resolve eWR
    let ewr: typeof ewrsTable.$inferSelect | undefined;
    if (issuanceWhId) {
      [ewr] = await db
        .select()
        .from(ewrsTable)
        .where(eq(ewrsTable.id, issuanceWhId))
        .limit(1);
    } else if (warehouseReceiptNumber) {
      [ewr] = await db
        .select()
        .from(ewrsTable)
        .where(eq(ewrsTable.ewrsReceiptId, warehouseReceiptNumber))
        .limit(1);
    }
    if (!ewr) {
      res.status(404).json({ error: "Receipt not found" });
      return;
    }

    const [owner] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, ewr.ownerId))
      .limit(1);

    // Determine trade amount from active spot listing or estimated value
    const [listing] = await db
      .select()
      .from(spotListingsTable)
      .where(eq(spotListingsTable.ewrId, ewr.id))
      .limit(1);

    const weightMt = parseFloat(ewr.weightMt);
    const pricePerMt = listing ? parseFloat(listing.pricePerMt) : 0;
    const tradeAmount =
      listing
        ? +(weightMt * pricePerMt).toFixed(2)
        : ewr.estimatedValueUsd
        ? parseFloat(ewr.estimatedValueUsd)
        : 0;

    // Disbursement breakdown
    const disbToWO = parseFloat(String(operationalCost));
    const disbToCouncil = parseFloat(String(councilCharge));
    const disbToFI =
      pledgedStatus === "Yes" ? parseFloat(String(pledgedAmount)) : 0;
    const disbToDepositor = +(
      Math.max(0, tradeAmount - disbToWO - disbToCouncil - disbToFI)
    ).toFixed(2);

    // Apply retirement if requested
    if (retirementStatus === "Yes") {
      await db
        .update(ewrsTable)
        .set({
          state: "SETTLED",
          ...(pledgedStatus === "Yes" && ewr.isLienActive
            ? { isLienActive: false, lienHolderId: null }
            : {}),
        })
        .where(eq(ewrsTable.id, ewr.id));
    }

    res.json({
      tradeStatus: "Yes",
      tradeAmount: String(tradeAmount.toFixed(2)),
      splittingRequired: "No",
      splittingRatio: "",
      splittedReceipt: "",
      newDepositor: {
        typeOfDepositor: (owner as Record<string, unknown>)?.company
          ? "Entity"
          : "Individual",
        nameOfDepositor: owner?.name ?? depositorName ?? "Unknown",
        emailAddress: owner?.email ?? null,
        nationality: "Kenyan",
      },
      disbursementBreakdown: {
        disbursementToWarehouseOperator: disbToWO,
        disbursementToCouncil: disbToCouncil,
        disbursementToDepositor: disbToDepositor,
        disbursementToFinancialInstitution: disbToFI,
        totalDisbursed: +(disbToWO + disbToCouncil + disbToDepositor + disbToFI).toFixed(2),
      },
      receiptStatus: retirementStatus === "Yes" ? "RETIRED" : ewr.state,
      processedAt: new Date().toISOString(),
    });
  }
);

export default router;
