# Tea Factory → Tea Marketplace API Integration

**Base path:** `/api` (all endpoints below are relative to this prefix)  
**Authentication:** Clerk session cookie (web) or Bearer token (mobile). Every endpoint that mutates state requires a valid Clerk session.  
**Content-Type:** `application/json` for all requests and responses.

---

## Table of Contents

1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Mandate System](#mandate-system)
4. [Lot Lifecycle](#lot-lifecycle)
5. [Session Lifecycle](#session-lifecycle)
6. [Endpoints — Lots](#endpoints--lots)
7. [Endpoints — Auction Sessions](#endpoints--auction-sessions)
8. [Endpoints — Bidding & Settlement](#endpoints--bidding--settlement)
9. [Endpoints — Dispatch Documents](#endpoints--dispatch-documents)
10. [Auction Mechanics](#auction-mechanics)
11. [Settlement & Prompt Date](#settlement--prompt-date)
12. [Real-Time Events (SSE)](#real-time-events-sse)
13. [Background Worker](#background-worker)
14. [Database Schema](#database-schema)
15. [Fee Structure](#fee-structure)
16. [Error Reference](#error-reference)

---

## Overview

The Tea Factory integration connects tea producers and their mandate-holding brokers to the Tea Marketplace auction and spot-market system. The flow is:

```
Tea Producer (owner)
  └─ grants mandate to Broker (ENABLER)
       └─ Broker creates Tea Lots linked to producer's eWR
            └─ Broker compiles Lots into an Auction Session
                 └─ Buyers (OFF_TAKER) place bids in real time
                      └─ Worker closes lots → SOLD or RESERVE_NOT_MET
                           └─ Admin confirms payment → Delivery Order issued
```

Each tea lot is backed by a **Tea Electronic Warehouse Receipt (eWR)** of `commodityType = "TEA"`. When a lot is sold, the eWR ownership is atomically transferred to the winning buyer and its state is set to `SETTLED`.

---

## User Roles

| Tier | Who | Capabilities |
|------|-----|-------------|
| `ENABLER` | Tea broker | Create lots, create & start auction sessions, take-out / accept-below-reserve |
| `OFF_TAKER` | Tea buyer | Place bids, view settlement details for lots they won |
| `ADMIN` | Platform operator | All broker actions + confirm payment settlement |
| *(owner)* | Tea producer | View and update their own lots; attach dispatch docs |

Role is stored on the `users` table as `tier`. The system resolves the caller's role from their Clerk session via `getAuth(req)`.

---

## Mandate System

Before a broker can catalogue a tea lot, the producer (eWR owner) must grant them an active **broker mandate** for commodity type `"TEA"`.

A mandate is active when:
- `revoked = false`
- `validFrom` has passed (or is null)
- `validTo` has not yet passed (or is null)

If `commissionRateOverride` is set on the mandate, it overrides the `commissionRate` the broker specifies at lot-creation time.

> **Without an active mandate, `POST /tea/lots` returns `403`.**

---

## Lot Lifecycle

```
DRAFT
  │  (PATCH updates metadata, triggers CATALOGUED)
  ▼
CATALOGUED
  │  (POST /dispatch with PRE_AUCTION_DISPATCH)
  ▼
DISPATCHED
  │  (session created, session started)
  ▼
LIVE  ──── auctionEndAt expires ──┬──► SOLD           (reserve met)
                                  └──► RESERVE_NOT_MET (reserve not met)
                                            │
                                    ┌───────┴────────┐
                                    ▼                ▼
                                WITHDRAWN       (accept-below-reserve)
                                                     │
                                                     ▼
                                                   SOLD
```

Lots can only be edited (`PATCH`) while in `DRAFT` or `CATALOGUED` status.

---

## Session Lifecycle

```
SCHEDULED
  │  (POST /tea/auctions/:id/start)
  ▼
LIVE  ──── worker closes last lot ──► CLOSED
```

A session holds an ordered catalogue of lot IDs. The worker advances through them automatically, one at a time, after each lot closes.

---

## Endpoints — Lots

### `POST /tea/lots`

Create a new tea lot catalogue entry. Requires an active mandate from the eWR owner to the calling broker.

**Auth:** Required. Caller must have `tier = ENABLER`.

**Request body:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `ewrId` | integer | ✓ | Must be a TEA eWR; active mandate must exist from its owner to you |
| `grade` | string | ✓ | e.g. `"BOP"`, `"BOPF"`, `"PF"`, `"D"` |
| `gradeMark` | string | ✓ | Estate mark, e.g. `"NKT"` |
| `giOrigin` | string | ✓ | Geographic Indication, e.g. `"Nyeri-ABK"` |
| `grossWeightKg` | number | ✓ | Total weight including packaging |
| `netWeightKg` | number | ✓ | Tea weight only |
| `tareWeightKg` | number | ✓ | Packaging/container weight |
| `packageType` | string | ✓ | e.g. `"sack"`, `"chest"` |
| `packingWeightKg` | number | — | Per-package weight |
| `tasterRemarks` | string | — | Cupping/tasting notes |
| `certifications` | string[] | — | e.g. `["ORGANIC", "FAIRTRADE", "RAINFOREST_ALLIANCE"]` |
| `storageStatus` | string | — | e.g. `"IN_STORE"`, `"DISPATCHED"` |
| `listingType` | `"AUCTION"` \| `"FIXED_PRICE"` | — | Default: `"AUCTION"` |
| `catalogueType` | `"WITH_VALUATION"` \| `"WITHOUT_VALUATION"` | — | Default: `"WITHOUT_VALUATION"` |
| `reservePriceUsd` | number | ✓ if `AUCTION` | Minimum sale price |
| `brokerValuationUsd` | number | — | Broker's indicative valuation |
| `fixedPricePerKgUsd` | number | ✓ if `FIXED_PRICE` | Price per kg for spot listing |
| `commissionRate` | number | — | 0–1 fraction, default `0.01` (1%). Overridden by mandate if set. |
| `tickTiers` | TickTier[] | — | See [Tick Tiers](#tick-tiers). Default: `[]` (falls back to 1.5%) |
| `antiSnipeConfig` | AntiSnipeConfig | — | See [Anti-Snipe](#anti-snipe). Default: `{windowSecs:180, extensionSecs:180, maxExtensionSecs:1800}` |
| `bidSecurityPct` | number | — | 0–1 fraction, default `0.10` (10%) |

**Response:** `201 Created` — the created `TeaLot` record (status: `DRAFT`).

---

### `GET /tea/lots`

List tea lots with optional filters.

**Auth:** Not required (public endpoint).

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `grade` | string | Exact grade match |
| `giOrigin` | string | Exact GI origin match |
| `certification` | string | Lot must include this certification |
| `listingType` | `AUCTION` \| `FIXED_PRICE` | Filter by listing type |
| `status` | string | Filter by lot status |
| `brokerId` | integer | Filter by broker user ID |
| `ownerId` | integer | Filter by producer user ID |

**Response:** `200 OK` — array of `TeaLot` records.

---

### `GET /tea/lots/:lotId`

Retrieve full lot detail, enriched with owner name, broker name, and linked eWR summary.

**Auth:** Not required.

**Response:** `200 OK`

```json
{
  "id": 42,
  "ewrId": 7,
  "ownerId": 3,
  "brokerId": 5,
  "ownerName": "Nyeri Tea Factory",
  "brokerName": "East Africa Brokers Ltd",
  "grade": "BOP",
  "gradeMark": "NKT",
  "giOrigin": "Nyeri-ABK",
  "grossWeightKg": "510.000",
  "netWeightKg": "500.000",
  "tareWeightKg": "10.000",
  "packageType": "sack",
  "certifications": ["RAINFOREST_ALLIANCE"],
  "listingType": "AUCTION",
  "reservePriceUsd": "2800.00",
  "commissionRate": "0.0100",
  "tickTiers": [{"upToUsd": 3000, "incrementPct": 1.5}, {"above": true, "incrementPct": 1.0}],
  "antiSnipeConfig": {"windowSecs": 180, "extensionSecs": 180, "maxExtensionSecs": 1800},
  "bidSecurityPct": "0.1000",
  "status": "CATALOGUED",
  "sessionId": null,
  "auctionStartAt": null,
  "auctionEndAt": null,
  "totalExtensionSecs": 0,
  "ewr": {
    "ewrsReceiptId": "KE-NBI-2024-007",
    "commodityType": "TEA",
    "weightMt": "0.500",
    "harvestSeason": "2024-Q1",
    "state": "MARKET_LISTED",
    "teaProcessingType": "CTC",
    "teaLeafGrade": "BOP",
    "teaInvoiceSerial": "INV-2024-007"
  }
}
```

---

### `PATCH /tea/lots/:lotId`

Update a lot's metadata. Only allowed in `DRAFT` or `CATALOGUED` status. Callable by the mandate broker or the eWR owner.

**Auth:** Required. Caller must be the lot's broker or owner.

**Request body:** Any subset of the `createTeaLotSchema` fields (excluding `ewrId`). Same validation rules apply — if `listingType` is `AUCTION`, a `reservePriceUsd` must exist; if `FIXED_PRICE`, a `fixedPricePerKgUsd` must exist.

**Side effect:** If the lot is `DRAFT` and any field is updated, status automatically advances to `CATALOGUED` and `publishedAt` is set.

**Response:** `200 OK` — updated `TeaLot` record.

---

## Endpoints — Auction Sessions

### `POST /tea/auctions`

Create a new auction session and assign lots to it in catalogue order.

**Auth:** Required. Caller must have `tier = ENABLER` or `ADMIN`.

**Request body:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `auctionDate` | string | ✓ | `YYYY-MM-DD` format |
| `lotIds` | integer[] | ✓ | Ordered list of lot IDs. All must be in `CATALOGUED` or `DISPATCHED` status. ENABLER callers must own all lots as mandate broker. |

**Response:** `201 Created`

```json
{
  "id": 12,
  "createdByBrokerId": 5,
  "auctionDate": "2024-03-15",
  "catalogueOrder": [42, 43, 44],
  "currentLotId": null,
  "status": "SCHEDULED",
  "createdAt": "2024-03-14T10:00:00Z",
  "updatedAt": "2024-03-14T10:00:00Z"
}
```

---

### `GET /tea/auctions/:sessionId`

Retrieve session detail including all lots in catalogue order, enriched with live bidding data.

**Auth:** Required. Accessible by: ADMIN, the creating broker, any lot owner/broker within the session, or any bidder who has placed a bid in the session.

**Response:** `200 OK`

```json
{
  "id": 12,
  "status": "LIVE",
  "auctionDate": "2024-03-15",
  "currentLotId": 43,
  "brokerName": "East Africa Brokers Ltd",
  "lots": [
    {
      "id": 42,
      "status": "SOLD",
      "currentHighBidUsd": 3100.00,
      "bidCount": 7,
      "secsRemaining": null,
      "minNextBidUsd": null
    },
    {
      "id": 43,
      "status": "LIVE",
      "currentHighBidUsd": 2950.00,
      "bidCount": 3,
      "secsRemaining": 312.4,
      "minNextBidUsd": 2994.25
    },
    {
      "id": 44,
      "status": "CATALOGUED",
      "currentHighBidUsd": null,
      "bidCount": 0,
      "secsRemaining": null,
      "minNextBidUsd": null
    }
  ]
}
```

---

### `POST /tea/auctions/:sessionId/start`

Start a `SCHEDULED` session. Moves the first lot to `LIVE` status and sets its countdown timer. Broadcasts a `tea_lot_live` SSE event.

**Auth:** Required. Caller must be the creating broker or ADMIN.

**Request body:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `durationMins` | integer | — | Per-lot duration in minutes. Must be 1–120. Default: `7`. |

**Response:** `200 OK`

```json
{
  "sessionId": 12,
  "currentLotId": 42,
  "auctionEndAt": "2024-03-15T09:07:00Z"
}
```

---

## Endpoints — Bidding & Settlement

### `POST /tea/lots/:lotId/bids`

Place a bid on a `LIVE` lot. Enforces tick-tier minimum increments, anti-snipe extension, and bid security holds.

**Auth:** Required. Caller must have `tier = OFF_TAKER`. The lot owner cannot bid on their own lot.

**Request body:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `amountUsd` | number | ✓ | Must meet or exceed the tick-tier minimum (`minNextBidUsd` from GET session) |

**Behaviour:**
- Previous winning bidder's hold is released; new bidder's hold is created for `amountUsd × bidSecurityPct`.
- If the bid arrives within `antiSnipeConfig.windowSecs` of `auctionEndAt`, the timer is extended by `antiSnipeConfig.extensionSecs` (capped by `maxExtensionSecs`).
- Runs inside a `SERIALIZABLE` transaction with `SELECT … FOR UPDATE` on the lot row to prevent race conditions.

**Response:** `201 Created`

```json
{
  "bid": {
    "id": 99,
    "lotId": 43,
    "sessionId": 12,
    "bidderId": 8,
    "amountUsd": 2950.00,
    "isWinning": true,
    "placedAt": "2024-03-15T09:04:12Z"
  },
  "antiSnipeTriggered": false,
  "newEndAt": null,
  "bidSecurityHeldUsd": 295.00
}
```

**Error responses:**

| Code | Condition |
|------|-----------|
| `400` | Lot is not `LIVE`, auction has ended, or bid is below the minimum |
| `400` | Response includes `minBidUsd` field when below-minimum |
| `403` | Caller is not `OFF_TAKER`, or is the lot owner |

---

### `POST /tea/lots/:lotId/take-out`

Broker withdraws a lot that closed with `RESERVE_NOT_MET`. Transitions the lot to `WITHDRAWN` and releases all remaining bid-security holds.

**Auth:** Required. Caller must be the mandate broker or ADMIN.

**No request body required.**

**Response:** `200 OK` — updated `TeaLot` record with `status: "WITHDRAWN"`.

---

### `POST /tea/lots/:lotId/accept-below-reserve`

Broker accepts the current winning bid even though it did not meet the reserve price. Transitions the lot to `SOLD`, transfers eWR ownership, and creates a settlement record.

**Auth:** Required. Caller must be the mandate broker or ADMIN.

**No request body required.**

**Response:** `200 OK`

```json
{
  "lotId": 43,
  "status": "SOLD",
  "acceptedBelowReserve": true,
  "grossAmountUsd": 2700.00,
  "promptDate": "2024-03-29"
}
```

---

### `POST /tea/lots/:lotId/settle`

Admin confirms that payment has been received for a `SOLD` lot. Sets `paymentStatus` to `PAID`, marks the delivery order as `ISSUABLE`, and releases the winning bidder's bid-security hold.

**Auth:** Required. Caller must have `tier = ADMIN`.

**No request body required.**

**Response:** `200 OK` — updated `TeaLotSettlement` record.

---

### `GET /tea/lots/:lotId/settlement`

Retrieve the settlement record for a sold lot, including financial breakdown and prompt date.

**Auth:** Required. Accessible by: ADMIN, the lot owner (producer), the lot's broker, or the winning buyer.

**Response:** `200 OK`

```json
{
  "id": 55,
  "lotId": 43,
  "sessionId": 12,
  "winningBidId": 99,
  "buyerId": 8,
  "buyerName": "Nairobi Tea Buyers Co.",
  "grossAmountUsd": "2950.00",
  "platformFeeUsd": "14.75",
  "brokerCommissionUsd": "29.50",
  "netProducerAmountUsd": "2905.75",
  "promptDate": "2024-03-29",
  "paymentStatus": "PENDING",
  "deliveryOrderStatus": "NOT_ISSUABLE",
  "acceptedBelowReserve": 0
}
```

---

## Endpoints — Dispatch Documents

### `POST /tea/lots/:lotId/dispatch`

Attach a dispatch document to a lot. Callable by the mandate broker or lot owner.

**Auth:** Required.

**Request body:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `docType` | string | ✓ | One of `PRE_AUCTION_DISPATCH`, `WEIGHMENT_REPORT`, `DELIVERY_ORDER` |
| `docData` | object | — | Flexible JSONB payload (see below). Default: `{}` |

**`docData` payloads by type:**

| `docType` | Expected `docData` fields |
|-----------|--------------------------|
| `PRE_AUCTION_DISPATCH` | `{ dispatchDate, warehouseCode, truckId, … }` |
| `WEIGHMENT_REPORT` | `{ netWeightKg, grossWeightKg, weighedBy, weighedAt, … }` |
| `DELIVERY_ORDER` | `{ buyerId, issuedAt, dueDate, instructions, … }` — only allowed when lot status is `SOLD` |

**Side effect:** Submitting a `PRE_AUCTION_DISPATCH` document on a `CATALOGUED` lot automatically advances it to `DISPATCHED`.

**Response:** `201 Created` — the created `TeaDispatchDoc` record.

---

### `GET /tea/lots/:lotId/dispatch`

List all dispatch documents attached to a lot, including the submitter's name.

**Auth:** Not required.

**Response:** `200 OK` — array of documents:

```json
[
  {
    "id": 11,
    "lotId": 43,
    "docType": "PRE_AUCTION_DISPATCH",
    "submittedBy": 5,
    "submitterName": "East Africa Brokers Ltd",
    "docData": { "dispatchDate": "2024-03-13", "warehouseCode": "NBI-WH-04" },
    "createdAt": "2024-03-13T14:22:00Z"
  }
]
```

---

## Auction Mechanics

### Tick Tiers

Tick tiers define the minimum bid increment as a percentage of the current high bid. They are configured per lot and evaluated from first to last.

**Structure:**

```json
[
  { "upToUsd": 1000, "incrementPct": 2.0 },
  { "upToUsd": 3000, "incrementPct": 1.5 },
  { "above": true,  "incrementPct": 1.0 }
]
```

**Resolution:** Walk the tiers in order. The first tier where `currentHigh ≤ upToUsd` (or `above: true`) applies. Minimum next bid = `currentHigh × (1 + incrementPct / 100)`, rounded to 2 decimal places.

**Fallback:** If `tickTiers` is empty, a flat 1.5% increment is used.

**Example** with the tiers above and current high of $2,950:
- $2,950 ≤ $3,000 → 1.5% tier applies
- `minNextBid = 2950 × 1.015 = $2,994.25`

---

### Anti-Snipe

Prevents last-second bid sniping by extending the auction timer when a bid arrives near the end.

**Configuration (per lot, `antiSnipeConfig`):**

| Field | Default | Description |
|-------|---------|-------------|
| `windowSecs` | 180 | If a bid arrives within this many seconds of `auctionEndAt`, the timer is extended |
| `extensionSecs` | 180 | Number of seconds added to `auctionEndAt` per triggered extension |
| `maxExtensionSecs` | 1800 | Total cap on all extensions (30 minutes). Once reached, no further extensions occur. |

`totalExtensionSecs` on the lot tracks cumulative extension and is reset to `0` when a lot goes `LIVE`.

---

## Settlement & Prompt Date

When a lot closes as `SOLD`, the system automatically:

1. Creates a `TeaLotSettlement` record with the financial breakdown.
2. Transfers eWR ownership to the buyer (`ewrs.ownerId` → buyer, `ewrs.state` → `SETTLED`).
3. Computes the **Prompt Date** — the payment deadline.

**Fee breakdown (on gross bid amount):**

| Item | Rate | Example ($2,950 gross) |
|------|------|------------------------|
| Platform fee | 0.5% | $14.75 |
| Broker commission | configured per lot (default 1%) | $29.50 |
| **Net to producer** | remainder | **$2,905.75** |

**Prompt Date** = trade date + **10 Kenyan working days**, skipping weekends and the following public holidays:

| Holiday | Date |
|---------|------|
| New Year's Day | 1 Jan |
| Labour Day | 1 May |
| Madaraka Day | 1 Jun |
| Huduma Day | 10 Oct |
| Mashujaa Day | 20 Oct |
| Jamhuri Day | 12 Dec |
| Christmas Day | 25 Dec |
| Boxing Day | 26 Dec |
| Good Friday | Easter − 2 days |
| Easter Monday | Easter + 1 day |

If payment is not confirmed by the Prompt Date, the background worker marks the settlement `DEFAULTED`, forfeits the buyer's bid-security hold, and deducts **15 reputation points** from the buyer's account.

---

## Real-Time Events (SSE)

The Tea Marketplace subscribes to `GET /api/auctions/stream?sessionId=:id` (shared with the WRS auction stream). Events are delivered as Server-Sent Events with the following shapes:

| Event type | Trigger | Payload |
|------------|---------|---------|
| `tea_lot_live` | Session started or next lot promoted | `{ sessionId, lotId, status:"LIVE", commodity:"TEA", auctionEndAt }` |
| `bid` | Bid placed | `{ lotId, sessionId, commodity:"TEA", bid:{id, amountUsd, bidderId, placedAt}, antiSnipeTriggered, newEndAt, bidSecurityHeldUsd }` |
| `closed` | Lot sold | `{ lotId, status:"SOLD", commodity:"TEA", sessionId, winningBidId, grossAmountUsd, promptDate }` |
| `reserve_not_met` | Lot closed below reserve | `{ lotId, status:"RESERVE_NOT_MET", commodity:"TEA", sessionId }` |
| `session_closed` | All lots in session complete | `{ sessionId, status:"CLOSED", commodity:"TEA" }` |

Events are also published to PostgreSQL pub/sub (`pg_notify`) on the `auction_events` channel, enabling multi-instance fan-out.

> **Note:** Bidder identity in the Tea Marketplace UI is anonymised (displayed as "Buyer A", "Buyer B", etc.) even though `bidderId` is present in the raw SSE payload.

---

## Background Worker

**File:** `artifacts/api-server/src/lib/tea-auction-worker.ts`

Runs on a **10-second polling interval**. Uses `pg_try_advisory_lock(3)` so only one server instance drives transitions at a time (the others skip their tick if the lock is held).

**Phase 1 — Close expired lots:**  
Finds all lots with `status = 'LIVE'` and `auctionEndAt ≤ now`. For each:
- **Reserve met** → `SOLD`: creates settlement record, transfers eWR ownership, releases non-winner holds.
- **Reserve not met** → `RESERVE_NOT_MET`: releases non-winner holds, keeps winner's hold in case broker accepts below reserve.
- After closing, advances the session to the next catalogue lot (sets it `LIVE` for 7 minutes), or marks the session `CLOSED` if all lots are done.

**Phase 2 — Forfeit defaulted bid security:**  
Finds settlements with `paymentStatus = 'PENDING'` and `promptDate < today`. For each:
- Sets hold status to `FORFEITED`.
- Sets settlement `paymentStatus` to `DEFAULTED`.
- Deducts 15 reputation points from the buyer.

---

## Database Schema

### `tea_lots`

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `ewr_id` | integer FK → `ewrs.id` | Must be a TEA eWR |
| `owner_id` | integer FK → `users.id` | Tea producer |
| `broker_id` | integer FK → `users.id` | Mandate broker |
| `grade` | text | e.g. `"BOP"`, `"BOPF"`, `"PF"` |
| `grade_mark` | text | Estate mark, e.g. `"NKT"` |
| `gi_origin` | text | Geographic Indication |
| `gross_weight_kg` | numeric(12,3) | |
| `net_weight_kg` | numeric(12,3) | |
| `tare_weight_kg` | numeric(12,3) | |
| `package_type` | text | |
| `packing_weight_kg` | numeric(10,3) | Per-package weight, optional |
| `taster_remarks` | text | Optional cupping notes |
| `certifications` | jsonb | String array, e.g. `["ORGANIC"]` |
| `storage_status` | text | Optional |
| `listing_type` | enum | `AUCTION` \| `FIXED_PRICE` |
| `catalogue_type` | enum | `WITH_VALUATION` \| `WITHOUT_VALUATION` |
| `reserve_price_usd` | numeric(14,2) | Required for AUCTION |
| `broker_valuation_usd` | numeric(14,2) | Optional |
| `fixed_price_per_kg_usd` | numeric(10,4) | Required for FIXED_PRICE |
| `commission_rate` | numeric(5,4) | Default `0.0100` (1%) |
| `tick_tiers` | jsonb | Array of `TickTier` objects |
| `anti_snipe_config` | jsonb | `{windowSecs, extensionSecs, maxExtensionSecs}` |
| `bid_security_pct` | numeric(5,4) | Default `0.1000` (10%) |
| `session_id` | integer | Set when assigned to a session |
| `auction_start_at` | timestamptz | When this lot went LIVE |
| `auction_end_at` | timestamptz | Current deadline (extended by anti-snipe) |
| `total_extension_secs` | integer | Cumulative anti-snipe extension |
| `status` | enum | `DRAFT` \| `CATALOGUED` \| `DISPATCHED` \| `LIVE` \| `SOLD` \| `UNSOLD` \| `WITHDRAWN` \| `RESERVE_NOT_MET` |
| `published_at` | timestamptz | Set when lot moves from DRAFT → CATALOGUED |
| `created_at` / `updated_at` | timestamptz | |

### `tea_auction_sessions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `created_by_broker_id` | integer FK → `users.id` | |
| `auction_date` | date | Planned date `YYYY-MM-DD` |
| `catalogue_order` | jsonb | Ordered integer array of lot IDs |
| `current_lot_id` | integer | Lot currently being auctioned (no FK to avoid circular dep) |
| `status` | enum | `SCHEDULED` \| `LIVE` \| `CLOSED` \| `COMPLETED` |
| `created_at` / `updated_at` | timestamptz | |

### `tea_lot_bids`

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `lot_id` | integer FK → `tea_lots.id` | |
| `session_id` | integer FK → `tea_auction_sessions.id` | |
| `bidder_id` | integer FK → `users.id` | |
| `amount_usd` | numeric(14,2) | |
| `is_winning` | boolean | `true` for the current high bid only |
| `placed_at` | timestamptz | |

### `tea_lot_settlements`

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `lot_id` | integer FK → `tea_lots.id` | Unique — one settlement per lot |
| `session_id` | integer FK → `tea_auction_sessions.id` | |
| `winning_bid_id` | integer FK → `tea_lot_bids.id` | |
| `buyer_id` | integer FK → `users.id` | |
| `gross_amount_usd` | numeric(14,2) | |
| `platform_fee_usd` | numeric(14,2) | 0.5% of gross |
| `broker_commission_usd` | numeric(14,2) | `commissionRate` × gross |
| `net_producer_amount_usd` | numeric(14,2) | gross − platform fee − commission |
| `prompt_date` | date | Payment deadline (trade date + 10 Kenyan working days) |
| `payment_status` | enum | `PENDING` \| `PAID` \| `DEFAULTED` |
| `delivery_order_status` | enum | `NOT_ISSUABLE` \| `ISSUABLE` \| `ISSUED` |
| `accepted_below_reserve` | integer | `1` if broker accepted below reserve; `0` otherwise |
| `created_at` / `updated_at` | timestamptz | |

### `tea_dispatch_docs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `lot_id` | integer FK → `tea_lots.id` | |
| `doc_type` | enum | `PRE_AUCTION_DISPATCH` \| `WEIGHMENT_REPORT` \| `DELIVERY_ORDER` |
| `submitted_by` | integer FK → `users.id` | |
| `doc_data` | jsonb | Flexible payload; shape depends on `doc_type` |
| `created_at` | timestamptz | |

---

## Fee Structure

| Fee | Rate | Recipient |
|-----|------|-----------|
| Platform fee | **0.5%** of gross bid | TokenHarvest platform |
| Broker commission | **1%** default (overridable by mandate or lot) | Mandate broker |
| Bid security hold | **10%** default (configurable per lot) | Held from buyer; released on payment or forfeited on default |

---

## Error Reference

All errors return JSON with an `"error"` string. Validation failures additionally include an `"issues"` array (Zod format).

| HTTP Code | Common causes |
|-----------|--------------|
| `400` | Invalid input, wrong lot status for the operation, bid below minimum, `durationMins` out of range |
| `401` | No Clerk session cookie / token |
| `403` | Wrong role (e.g. OFF_TAKER trying to create a lot), no active mandate, bidding on own lot |
| `404` | Lot, session, eWR, or user not found |
| `500` | Unexpected server error (details logged server-side) |

When a bid is below the minimum, the `400` response includes an additional `"minBidUsd"` field:

```json
{
  "error": "Bid must be at least $2994.25 (minimum increment above current high of $2950.00)",
  "minBidUsd": 2994.25
}
```
