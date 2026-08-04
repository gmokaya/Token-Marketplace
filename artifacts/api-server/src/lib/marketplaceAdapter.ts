/**
 * MarketplaceAdapter — interface + stub implementation.
 *
 * Separates the "push a listing to an external marketplace" concern from
 * route logic so the real HTTP integration can be swapped in without
 * touching route handlers.
 *
 * The stub records outbox events by writing listing_publications rows
 * to status=pending and then immediately simulating a successful external
 * push, returning a synthetic external ID. Replace `StubMarketplaceAdapter`
 * with a real HTTP client when the external marketplace API is available.
 */

export interface MarketplaceListingPayload {
  lotId:             number;
  grade:             string;
  gradeMark:         string;
  giOrigin:          string;
  netWeightKg:       string;
  listingType:       string;
  reservePriceUsd?:  string | null;
  fixedPricePerKgUsd?: string | null;
  certifications:    string[];
  tasterRemarks?:    string | null;
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

/**
 * Stub implementation — simulates a successful external push.
 *
 * Behaviour:
 *  - Always returns success: true with a deterministic synthetic ID.
 *  - Replace this with a real HTTP adapter once the external API is live.
 */
export class StubMarketplaceAdapter implements MarketplaceAdapter {
  async publishListing(
    payload: MarketplaceListingPayload,
  ): Promise<MarketplaceAdapterResult> {
    // TODO: POST to external marketplace API and parse response
    const externalListingId = `TH-LOT-${payload.lotId}-STUB`;
    return { success: true, externalListingId };
  }

  async unpublishListing(
    _externalListingId: string,
  ): Promise<MarketplaceAdapterResult> {
    // TODO: DELETE / deactivate on external marketplace API
    return { success: true };
  }
}

export const marketplaceAdapter: MarketplaceAdapter = new StubMarketplaceAdapter();
