/**
 * First-party TokenHarvest Marketplace Provider API.
 *
 * This is the provider contract used by the publishing adapter. It is mounted
 * before Clerk auth and uses a dedicated Bearer token so it can be deployed as
 * a separate service later without changing the caller-facing publish routes.
 */
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { db, marketplaceProviderListingsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();
const PROVIDER_PREFIX = "/provider/marketplace/v1";
const LOCAL_PROVIDER_KEY = "mk_test_tokenharvest_local_dev";

const listingPayloadSchema = z.object({
  idempotencyKey: z.string().min(8).max(200),
  accountId: z.string().min(1).max(100),
  factoryId: z.number().int().positive().optional(),
  brokerId: z.number().int().positive().optional(),
  lotId: z.number().int().positive(),
  ewrId: z.number().int().positive().optional(),
  commodityType: z.enum(["COFFEE", "TEA"]),
  lot: z.record(z.unknown()),
});

function configuredProviderKey(): string | null {
  if (process.env.MARKETPLACE_PROVIDER_API_KEY) {
    return process.env.MARKETPLACE_PROVIDER_API_KEY;
  }
  return process.env.NODE_ENV === "production" ? null : LOCAL_PROVIDER_KEY;
}

function authenticateProvider(req: { headers: Record<string, string | string[] | undefined> }) {
  const configured = configuredProviderKey();
  const authorization = req.headers.authorization;
  const token =
    typeof authorization === "string" && authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;
  return Boolean(configured && token && token === configured);
}

function publicListing(row: typeof marketplaceProviderListingsTable.$inferSelect) {
  return {
    id: row.id,
    externalListingId: row.externalListingId,
    idempotencyKey: row.idempotencyKey,
    accountId: row.accountId,
    factoryId: row.factoryId,
    brokerId: row.brokerId,
    lotId: row.lotId,
    ewrId: row.ewrId,
    commodityType: row.commodityType,
    status: row.status,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.use(PROVIDER_PREFIX, (req: Request, res: Response, next: NextFunction): void => {
  if (!configuredProviderKey()) {
    res.status(503).json({
      error:
        "Marketplace provider is not configured. Set MARKETPLACE_PROVIDER_API_KEY.",
    });
    return;
  }
  if (!authenticateProvider(req)) {
    res.status(401).json({
      error: "Invalid or missing marketplace provider Bearer token",
    });
    return;
  }
  next();
});

router.get(`${PROVIDER_PREFIX}/health`, (_req, res) => {
  res.json({
    provider: "tokenharvest",
    version: "v1",
    environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
    status: "ok",
  });
});

router.get(`${PROVIDER_PREFIX}/openapi.json`, (_req, res) => {
  res.json({
    openapi: "3.0.3",
    info: {
      title: "TokenHarvest Marketplace Provider API",
      version: "1.0.0",
      description:
        "First-party provider API for publishing Coffee and Tea lots.",
    },
    servers: [{ url: "/api/provider/marketplace/v1" }],
    security: [{ bearerAuth: [] }],
    paths: {
      "/listings": {
        post: {
          summary: "Publish a Coffee or Tea lot",
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "201": { description: "Created" }, "200": { description: "Already published" } },
        },
      },
      "/listings/{externalListingId}": {
        get: { summary: "Get publication status" },
        delete: { summary: "Unpublish a listing" },
      },
      "/listings/{externalListingId}/retry": {
        post: { summary: "Retry a failed publication" },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
      },
    },
  });
});

router.post(`${PROVIDER_PREFIX}/listings`, async (req, res) => {
  const parsed = listingPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues,
    });
  }

  const body = parsed.data;
  const externalListingId = `TH-${body.commodityType}-LOT-${body.lotId}`;
  const [existing] = await db
    .select()
    .from(marketplaceProviderListingsTable)
    .where(eq(marketplaceProviderListingsTable.idempotencyKey, body.idempotencyKey))
    .limit(1);

  if (existing) {
    return res.status(200).json({
      ...publicListing(existing),
      externalListingId,
      idempotentReplay: true,
    });
  }

  const [sameLot] = await db
    .select()
    .from(marketplaceProviderListingsTable)
    .where(
      and(
        eq(marketplaceProviderListingsTable.accountId, body.accountId),
        eq(marketplaceProviderListingsTable.lotId, body.lotId),
      ),
    )
    .limit(1);

  if (sameLot) {
    return res.status(200).json({
      ...publicListing(sameLot),
      idempotentReplay: true,
    });
  }

  const [created] = await db
    .insert(marketplaceProviderListingsTable)
    .values({
      externalListingId,
      idempotencyKey: body.idempotencyKey,
      accountId: body.accountId,
      factoryId: body.factoryId ?? null,
      brokerId: body.brokerId ?? null,
      lotId: body.lotId,
      ewrId: body.ewrId ?? null,
      commodityType: body.commodityType,
      payload: body.lot,
      status: "live",
    })
    .onConflictDoNothing({
      target: marketplaceProviderListingsTable.idempotencyKey,
    })
    .returning();

  if (!created) {
    const [replayed] = await db
      .select()
      .from(marketplaceProviderListingsTable)
      .where(eq(marketplaceProviderListingsTable.idempotencyKey, body.idempotencyKey))
      .limit(1);
    return res.status(200).json({
      ...publicListing(replayed),
      idempotentReplay: true,
    });
  }

  return res.status(201).json({
    ...publicListing(created),
    idempotentReplay: false,
  });
});

router.get(
  `${PROVIDER_PREFIX}/listings/:externalListingId`,
  async (req, res) => {
    const [listing] = await db
      .select()
      .from(marketplaceProviderListingsTable)
      .where(
        eq(
          marketplaceProviderListingsTable.externalListingId,
          req.params.externalListingId,
        ),
      )
      .limit(1);

    if (!listing) {
      return res.status(404).json({ error: "External listing not found" });
    }
    return res.json(publicListing(listing));
  },
);

router.post(
  `${PROVIDER_PREFIX}/listings/:externalListingId/retry`,
  async (req, res) => {
    const [listing] = await db
      .select()
      .from(marketplaceProviderListingsTable)
      .where(
        eq(
          marketplaceProviderListingsTable.externalListingId,
          req.params.externalListingId,
        ),
      )
      .limit(1);

    if (!listing) {
      return res.status(404).json({ error: "External listing not found" });
    }
    if (listing.status !== "failed") {
      return res.status(409).json({
        error: `Listing is not in failed state (current: ${listing.status})`,
        listing: publicListing(listing),
      });
    }

    const [updated] = await db
      .update(marketplaceProviderListingsTable)
      .set({ status: "live", lastError: null, updatedAt: new Date() })
      .where(eq(marketplaceProviderListingsTable.id, listing.id))
      .returning();
    return res.json(publicListing(updated));
  },
);

router.delete(
  `${PROVIDER_PREFIX}/listings/:externalListingId`,
  async (req, res) => {
    const [listing] = await db
      .select()
      .from(marketplaceProviderListingsTable)
      .where(
        eq(
          marketplaceProviderListingsTable.externalListingId,
          req.params.externalListingId,
        ),
      )
      .limit(1);

    if (!listing) {
      return res.status(404).json({ error: "External listing not found" });
    }

    const [updated] = await db
      .update(marketplaceProviderListingsTable)
      .set({ status: "unpublished", updatedAt: new Date() })
      .where(eq(marketplaceProviderListingsTable.id, listing.id))
      .returning();
    return res.json(publicListing(updated));
  },
);

export default router;