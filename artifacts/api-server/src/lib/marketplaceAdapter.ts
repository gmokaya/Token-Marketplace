/**
 * MarketplaceAdapter — HTTP client for the first-party TokenHarvest provider API.
 *
 * The provider API is intentionally a separate HTTP contract even though the
 * development provider runs in this API process by default. Setting
 * MARKETPLACE_PROVIDER_URL points the adapter at a separately deployed
 * provider without changing the publishing routes.
 */

import { createHash } from "node:crypto";

export interface MarketplaceListingPayload {
  lotId:             number;
  ewrId?:            number;
  commodityType:     "COFFEE" | "TEA";
  ownerId?:           number;
  brokerId?:          number;
  warehouseCode?:     string | null;
  grade:             string;
  gradeMark:         string;
  giOrigin:          string;
  netWeightKg:       string;
  listingType:       string;
  reservePriceUsd?:  string | null;
  fixedPricePerKgUsd?: string | null;
  certifications:    string[];
  tasterRemarks?:    string | null;
  processingMethod?:  string | null;
  varietal?:          string | null;
  altitude?:          number | null;
  cuppingRemarks?:    string | null;
  coffeeBeanSize?:    string | null;
  coffeeCuppingScore?: string | null;
}

export interface MarketplaceAdapterResult {
  success:            boolean;
  externalListingId?: string;
  error?:             string;
}

export interface MarketplaceAdapter {
  /**
   * Push a lot's catalogue data to the external marketplace.
   * Returns the external listing ID on success.
   */
  publishListing(payload: MarketplaceListingPayload): Promise<MarketplaceAdapterResult>;

  /**
   * Remove a previously published listing from the external marketplace.
   */
  unpublishListing(externalListingId: string): Promise<MarketplaceAdapterResult>;
}

const LOCAL_PROVIDER_KEY = "mk_test_tokenharvest_local_dev";

function providerApiKey(): string | null {
  if (process.env.MARKETPLACE_PROVIDER_API_KEY) {
    return process.env.MARKETPLACE_PROVIDER_API_KEY;
  }
  return process.env.NODE_ENV === "production" ? null : LOCAL_PROVIDER_KEY;
}

function providerBaseUrl(): string {
  if (process.env.MARKETPLACE_PROVIDER_URL) {
    return process.env.MARKETPLACE_PROVIDER_URL.replace(/\/+$/, "");
  }
  const port = process.env.PORT ?? "8080";
  return `http://127.0.0.1:${port}/api/provider/marketplace/v1`;
}

async function providerRequest(
  path: string,
  init: RequestInit = {},
): Promise<MarketplaceAdapterResult> {
  const apiKey = providerApiKey();
  if (!apiKey) {
    return {
      success: false,
      error: "Marketplace provider is not configured. Set MARKETPLACE_PROVIDER_API_KEY and MARKETPLACE_PROVIDER_URL.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${providerBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        ...(init.headers ?? {}),
      },
    });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      return {
        success: false,
        error: typeof body.error === "string"
          ? body.error
          : `Marketplace provider returned HTTP ${response.status}`,
      };
    }
    return {
      success: true,
      externalListingId: typeof body.externalListingId === "string"
        ? body.externalListingId
        : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error && error.name === "AbortError"
        ? "Marketplace provider request timed out after 10 seconds"
        : error instanceof Error
          ? error.message
          : "Marketplace provider request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export class HttpMarketplaceAdapter implements MarketplaceAdapter {
  async publishListing(
    payload: MarketplaceListingPayload,
  ): Promise<MarketplaceAdapterResult> {
    const idempotencyKey = createHash("sha256")
      .update(`tokenharvest:${payload.commodityType}:${payload.lotId}`)
      .digest("hex");

    return providerRequest("/listings", {
      method: "POST",
      headers: {
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        idempotencyKey,
        accountId: process.env.MARKETPLACE_ACCOUNT_ID ?? "tokenharvest",
        factoryId: payload.ownerId,
        brokerId: payload.brokerId,
        lotId: payload.lotId,
        ewrId: payload.ewrId,
        commodityType: payload.commodityType,
        lot: payload,
      }),
    });
  }

  async unpublishListing(
    externalListingId: string,
  ): Promise<MarketplaceAdapterResult> {
    return providerRequest(`/listings/${encodeURIComponent(externalListingId)}`, {
      method: "DELETE",
    });
  }
}

export const marketplaceAdapter: MarketplaceAdapter = new HttpMarketplaceAdapter();
