# Tea Producer Portal — Marketplace Integration Guide

**Scope:** How a producer pushes tea lot listings to the TokenHarvest marketplace, either by listing directly or through a licensed broker (ENABLER). Covers the mandate system, lot lifecycle, auction session mechanics, and settlement.

**Base URL (development):** `https://$REPLIT_DEV_DOMAIN/api`  
**Base URL (production):** see deployment configuration  
**Authentication:** All endpoints require a valid Clerk session token in the `Authorization: Bearer <token>` header (handled automatically when called from within the portal UI).

---

## Table of Contents

1. [User Tiers](#1-user-tiers)
2. [eWR — the source of truth](#2-ewr--the-source-of-truth)
3. [Path A — Direct Listing (Producer Self-Lists)](#3-path-a--direct-listing-producer-self-lists)
4. [Path B — Broker-Mediated Listing](#4-path-b--broker-mediated-listing)
   - [4.1 Broker Mandate Lifecycle](#41-broker-mandate-lifecycle)
   - [4.2 Broker Discovers eWRs](#42-broker-discovers-ewrs)
   - [4.3 Broker Creates a Lot](#43-broker-creates-a-lot)
5. [Lot Lifecycle & Status Machine](#5-lot-lifecycle--status-machine)
6. [Dispatch Documents](#6-dispatch-documents)
7. [Auction Session Flow](#7-auction-session-flow)
   - [7.1 Create a Session (Admin)](#71-create-a-session-admin)
   - [7.2 Broker Submits Lots](#72-broker-submits-lots)
   - [7.3 Admin Starts the Session](#73-admin-starts-the-session)
   - [7.4 Live Bidding](#74-live-bidding)
   - [7.5 Lot Closure & Anti-Snipe](#75-lot-closure--anti-snipe)
8. [Post-Auction Decisions](#8-post-auction-decisions)
9. [Settlement](#9-settlement)
10. [API Reference — Mandates](#10-api-reference--mandates)
11. [API Reference — Tea Lots](#11-api-reference--tea-lots)
12. [API Reference — Auction Sessions](#12-api-reference--auction-sessions)
13. [Business Rules Cheat-Sheet](#13-business-rules-cheat-sheet)
14. [Error Codes](#14-error-codes)

---

## 1. User Tiers

| Tier | Portal role | Can grant mandate | Can receive mandate | Can create lots | Can bid |
|---|---|---|---|---|---|
| `PRODUCER` | Tea Producer Portal | ✓ | — | ✓ (own eWRs only, direct) | — |
| `COOPERATIVE` | (same) | ✓ | — | — | — |
| `ENABLER` | Broker portal | — | ✓ | ✓ (mandate required) | — |
| `OFF_TAKER` | Buyer portal | — | — | — | ✓ |
| `ADMIN` | Exchange admin | — | — | — | — |

---

## 2. eWR — the source of truth

Every tea lot must be backed by an **Electronic Warehouse Receipt (eWR)**. The factory integration API pushes eWRs to the platform; the portal does not create them. An eWR transitions through these states:

```
INGESTED → MARKET_LISTED → SETTLED
```

| State | Meaning |
|---|---|
| `INGESTED` | Receipt is available for listing; no active lot against it |
| `MARKET_LISTED` | An active (non-WITHDRAWN) lot has been created against this eWR |
| `SETTLED` | The lot has been sold and the eWR ownership has been transferred to the buyer |

**Only `INGESTED` eWRs can be used to create a new lot.** Creating a lot automatically advances the eWR from `INGESTED` to `MARKET_LISTED`. If the lot is later withdrawn, the eWR reverts so it can be re-listed.

---

## 3. Path A — Direct Listing (Producer Self-Lists)

A producer who has at least one `INGESTED` TEA eWR can create a lot themselves, bypassing a broker entirely.

### Flow

```
Producer                              API
   │                                   │
   │  POST /tea/lots                   │
   │  { ewrId, listingType, price… }  ──▶  Verify eWR is INGESTED + owned by caller
   │                                   │   Set brokerId = ownerId (self-agent)
   │                                   │   Set commissionRate = 0
   │                                   │   Advance eWR: INGESTED → MARKET_LISTED
   │  ◀── 201 { lot, status: "DRAFT" } │
```

**UI entry point:** Producer Portal → Sidebar → **List Direct** → `/producer/lots/new`

### Request

```http
POST /api/tea/lots
Content-Type: application/json

{
  "ewrId": 42,
  "grade": "BOP",
  "gradeMark": "NKT",
  "giOrigin": "Kenya",
  "grossWeightKg": 2000,
  "netWeightKg": 1950,
  "tareWeightKg": 50,
  "packageType": "Paper Sack",
  "listingType": "FIXED_PRICE",
  "fixedPricePerKgUsd": 3.20,
  "tasterRemarks": "Bright, brisk, good colour"
}
```

For auction listings replace `listingType` / `fixedPricePerKgUsd` with:
```json
{
  "listingType": "AUCTION",
  "reservePriceUsd": 2.80
}
```

### Response

```json
{
  "id": 17,
  "ewrId": 42,
  "ownerId": 5,
  "brokerId": 5,
  "grade": "BOP",
  "gradeMark": "NKT",
  "giOrigin": "Kenya",
  "grossWeightKg": "2000",
  "netWeightKg": "1950",
  "tareWeightKg": "50",
  "packageType": "Paper Sack",
  "listingType": "FIXED_PRICE",
  "fixedPricePerKgUsd": "3.20",
  "commissionRate": "0",
  "status": "DRAFT",
  "createdAt": "2026-08-04T08:00:00.000Z"
}
```

> **Note:** `brokerId === ownerId` and `commissionRate = "0"` are the canonical markers of a direct listing. The API enforces `commissionRate = 0` permanently — even a PATCH cannot change it for direct lots.

---

## 4. Path B — Broker-Mediated Listing

A **PRODUCER** grants an **ENABLER**-tier broker a mandate. The broker can then catalogue lots from the producer's eWRs, set valuations, and submit them to auction sessions.

### 4.1 Broker Mandate Lifecycle

#### Grant a mandate

Only `PRODUCER` or `COOPERATIVE` accounts can grant mandates.

```http
POST /api/broker-mandates
Content-Type: application/json

{
  "brokerId": 12,
  "commodityType": "TEA",
  "permissions": ["list", "accept_bids", "negotiate", "set_reserve"],
  "commissionRateOverride": 0.015,
  "validFrom": "2026-08-01T00:00:00.000Z",
  "validTo": "2026-12-31T23:59:59.000Z"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `brokerId` | integer | ✓ | Internal user ID of the ENABLER-tier broker |
| `commodityType` | enum | ✓ | `"TEA"` for tea mandates |
| `permissions` | string[] | — | Defaults to `["list","accept_bids","negotiate","set_reserve"]` |
| `commissionRateOverride` | float 0–1 | — | Overrides the lot's `commissionRate`; e.g. `0.015` = 1.5 %. If omitted the broker sets it per lot (default 1 %) |
| `validFrom` | ISO 8601 | — | Defaults to `now()` |
| `validTo` | ISO 8601 | — | Omit for an open-ended mandate |

**Constraints:**
- The target user must have `tier = "ENABLER"`. Granting to any other tier returns `400`.
- Only one active mandate is allowed per broker + commodity combination. Attempting a duplicate returns `409` with the existing mandate ID. Revoke the old one first.

**Response `201`:**
```json
{
  "id": 3,
  "ownerId": 5,
  "brokerId": 12,
  "brokerName": "Nairobi Tea Brokers Ltd",
  "commodityType": "TEA",
  "permissions": ["list", "accept_bids", "negotiate", "set_reserve"],
  "commissionRateOverride": "0.0150",
  "validFrom": "2026-08-01T00:00:00+00:00",
  "validTo": "2026-12-31T23:59:59+00:00",
  "revoked": false,
  "createdAt": "2026-08-04T08:00:00+00:00"
}
```

#### Producer views their granted mandates

```http
GET /api/broker-mandates/given
```

Returns all mandates granted by the calling producer, including `revoked` ones. The UI shows this list at **Producer Portal → Mandates Given**.

#### Broker views their received mandates

```http
GET /api/broker-mandates/my
```

Returns all mandates where the calling user is the broker. Each record includes `ownerName` for display.

#### Revoke a mandate

Only the mandate owner (producer) can revoke.

```http
DELETE /api/broker-mandates/3
```

Sets `revoked = true`, `revokedAt = now()`. A revoked mandate is immediately excluded from the broker's active eWR pool (`/ewrs/broker-available`) and any subsequent `POST /tea/lots` against that producer's eWRs will fail with `403`.

**Revocation does not cancel lots already created under the mandate.** Lots already in `CATALOGUED`, `DISPATCHED`, or `LIVE` status continue normally. If you need to stop an in-flight lot, withdraw it separately via the broker lot management UI.

---

### 4.2 Broker Discovers eWRs

Once at least one mandate is active, the broker can see all `INGESTED` TEA eWRs from their mandate holders:

```http
GET /api/ewrs/broker-available
```

Only returns eWRs where:
- The eWR owner has an **active** (not revoked, within `validFrom`/`validTo`) TEA mandate with the calling broker
- `commodityType = "TEA"`
- `state = "INGESTED"` (not already listed or settled)

**UI:** This feeds the eWR selector on the broker's **Create Tea Lot** form (`/broker/lots/new`). The selector shows receipt ID, grade, weight, warehouse, and producer name.

---

### 4.3 Broker Creates a Lot

```http
POST /api/tea/lots
Content-Type: application/json

{
  "ewrId": 42,
  "grade": "BOPF",
  "gradeMark": "MKT",
  "giOrigin": "Kenya",
  "grossWeightKg": 1800,
  "netWeightKg": 1750,
  "tareWeightKg": 50,
  "packageType": "Paper Sack",
  "listingType": "AUCTION",
  "catalogueType": "WITH_VALUATION",
  "reservePriceUsd": 3.00,
  "brokerValuationUsd": 3.40,
  "commissionRate": 0.015,
  "tasterRemarks": "Clean, well-made",
  "tickTiers": [
    { "upToUsd": 5.00, "incrementPct": 0.02 },
    { "above": true,  "incrementPct": 0.01 }
  ],
  "antiSnipeConfig": {
    "windowSecs": 180,
    "extensionSecs": 180,
    "maxExtensionSecs": 1800
  },
  "bidSecurityPct": 0.1
}
```

**Broker-specific fields not available to direct producers:**

| Field | Notes |
|---|---|
| `catalogueType` | `"WITH_VALUATION"` or `"WITHOUT_VALUATION"` |
| `brokerValuationUsd` | Broker's assessed value per kg |
| `commissionRate` | Overridden by `mandate.commissionRateOverride` if set |
| `tickTiers` | Bid increment schedule (see §7.4) |
| `antiSnipeConfig` | Anti-snipe extension rules (see §7.5) |
| `bidSecurityPct` | Fraction of bid amount held as security (default 0.10) |

**Server validation for broker lots:**
1. eWR must be `INGESTED` and `commodityType = "TEA"`
2. No existing non-WITHDRAWN lot against the same eWR (returns `409`)
3. An active TEA mandate must exist from the eWR's owner to the calling broker (returns `403` otherwise)
4. Commission rate: `mandate.commissionRateOverride` takes precedence; `commissionRate` in the body is fallback

---

## 5. Lot Lifecycle & Status Machine

```
DRAFT
  │
  │  PATCH /tea/lots/:id  (any update triggers DRAFT → CATALOGUED)
  ▼
CATALOGUED
  │
  │  POST /tea/lots/:id/dispatch  (docType: PRE_AUCTION_DISPATCH)
  ▼
DISPATCHED ──────────────────────────────────┐
  │                                           │ (both CATALOGUED and DISPATCHED
  │  POST /tea/auctions/:id/lots              │  can be submitted to a session)
  ▼                                           │
(assigned to session; status unchanged) ◀────┘
  │
  │  Admin: POST /tea/auctions/:id/start  → first lot goes LIVE
  ▼
LIVE
  │
  │  Auction timer expires
  ├──[reserve met]──────────────────▶ SOLD
  │
  └──[no bid or bid < reserve]──────▶ RESERVE_NOT_MET
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                    Broker: take-out       Broker: accept-below-reserve
                              │                     │
                              ▼                     ▼
                          WITHDRAWN               SOLD
```

| Status | Who can modify | Notes |
|---|---|---|
| `DRAFT` | Broker or owner | Any PATCH transitions to `CATALOGUED` |
| `CATALOGUED` | Broker or owner | Editable; submittable to auction sessions |
| `DISPATCHED` | — | Set automatically when `PRE_AUCTION_DISPATCH` doc is attached to a `CATALOGUED` lot |
| `LIVE` | — | Auction is running; no metadata edits allowed |
| `SOLD` | Admin (settlement) | Lot sold; settlement record created |
| `RESERVE_NOT_MET` | Broker or admin | Broker decides: take-out or accept below reserve |
| `WITHDRAWN` | — | Terminal; eWR returns to `INGESTED` for re-listing |

---

## 6. Dispatch Documents

Before submission to an auction session, the broker may (optionally) attach a pre-auction dispatch form to advance the lot from `CATALOGUED` to `DISPATCHED`. Both statuses are eligible for session submission.

```http
POST /api/tea/lots/17/dispatch
Content-Type: application/json

{
  "docType": "PRE_AUCTION_DISPATCH",
  "docData": {
    "vehicleRegNo": "KCA 123X",
    "driverName": "John Kamau",
    "departureDate": "2026-08-05",
    "dispatchWarehouse": "WRSC-NRB-001"
  }
}
```

| `docType` | Allowed when | Effect |
|---|---|---|
| `PRE_AUCTION_DISPATCH` | Lot is `CATALOGUED` | Advances lot → `DISPATCHED` |
| `WEIGHMENT_REPORT` | Any pre-LIVE status | No status change; records weighment |
| `DELIVERY_ORDER` | Lot is `SOLD` | No status change; records issuable delivery order |

Retrieve all documents for a lot:
```http
GET /api/tea/lots/17/dispatch
```

---

## 7. Auction Session Flow

### 7.1 Create a Session (Admin)

Only `ADMIN` accounts can create auction sessions.

```http
POST /api/tea/auctions
Content-Type: application/json

{ "auctionDate": "2026-08-10" }
```

Response `201`:
```json
{
  "id": 7,
  "auctionDate": "2026-08-10",
  "status": "SCHEDULED",
  "catalogueOrder": [],
  "currentLotId": null,
  "createdAt": "2026-08-04T09:00:00+00:00"
}
```

### 7.2 Broker Submits Lots

Only `ENABLER` (broker) accounts can submit lots to a session. The session must be `SCHEDULED`.

```http
POST /api/tea/auctions/7/lots
Content-Type: application/json

{ "lotIds": [17, 18, 22] }
```

**Validation rules:**
- All lot IDs must exist
- All lots must have status `CATALOGUED` or `DISPATCHED`
- The calling broker must be the `brokerId` on each lot (brokers can only submit their own mandate lots)
- Lots already assigned to a **different** session are rejected with `400` (conflict)
- Lots already in this session are silently de-duplicated (idempotent)

The `catalogueOrder` array on the session records the order in which lots will be auctioned. Each additional call appends to the existing order.

**UI:** Broker Portal → Sidebar → **Auction Sessions** → expand a SCHEDULED session → check lots → **Submit**.

### 7.3 Admin Starts the Session

```http
POST /api/tea/auctions/7/start
Content-Type: application/json

{ "durationMins": 7 }
```

| Field | Default | Range | Notes |
|---|---|---|---|
| `durationMins` | 7 | 1–120 | Per-lot auction duration in minutes |

Starting a session:
1. Sets session `status → LIVE`
2. Sets `currentLotId` to the first lot in `catalogueOrder`
3. Sets that lot's `status → LIVE`, records `auctionStartAt` and `auctionEndAt`
4. Broadcasts a `tea_lot_live` SSE event to all connected clients

The auction engine then automatically progresses through lots (each lot runs for `durationMins`). When a lot closes, the next lot in `catalogueOrder` goes `LIVE`.

### 7.4 Live Bidding

Only `OFF_TAKER` tier accounts can bid. Owners cannot bid on their own lots.

```http
POST /api/tea/lots/17/bids
Content-Type: application/json

{ "amountUsd": 3.20 }
```

**Tick tiers — minimum bid increment:**

```json
"tickTiers": [
  { "upToUsd": 5.00, "incrementPct": 0.02 },
  { "above": true,  "incrementPct": 0.01 }
]
```

| Current high bid | Minimum next bid |
|---|---|
| < USD 5.00 | current × 1.02 |
| ≥ USD 5.00 | current × 1.01 |
| No bids yet | `reservePriceUsd` |

If `tickTiers` is empty, any bid above the current high is accepted.

**Bid security hold:** On each successful bid, `bidSecurityPct × amountUsd` (default 10 %) is recorded as a `HELD` bid-security hold against the bidder. When a bidder is outbid, their previous hold is immediately released. Only the winning bid's hold remains `HELD` at lot close, and is released on settlement confirmation.

**Response `201`:**
```json
{
  "bid": {
    "id": 44,
    "lotId": 17,
    "bidderId": 9,
    "amountUsd": 3.20,
    "isWinning": true,
    "placedAt": "2026-08-10T10:03:15+00:00"
  },
  "antiSnipeTriggered": false,
  "newEndAt": null,
  "bidSecurityHeldUsd": 0.32
}
```

### 7.5 Lot Closure & Anti-Snipe

Anti-snipe configuration (set per lot at creation):

```json
"antiSnipeConfig": {
  "windowSecs": 180,
  "extensionSecs": 180,
  "maxExtensionSecs": 1800
}
```

| Parameter | Default | Meaning |
|---|---|---|
| `windowSecs` | 180 | If a bid arrives within this many seconds of `auctionEndAt`, trigger an extension |
| `extensionSecs` | 180 | How many seconds to add to `auctionEndAt` |
| `maxExtensionSecs` | 1800 | Total extension cap across all anti-snipe triggers for this lot |

When triggered, `antiSnipeTriggered: true` and the updated `newEndAt` are included in the bid response and broadcast via SSE.

---

## 8. Post-Auction Decisions

When a lot's auction clock reaches zero, the engine determines the outcome:

**Reserve met** → lot status = `SOLD` automatically (settlement record created).

**Reserve not met (no bids, or all bids below reserve)** → lot status = `RESERVE_NOT_MET`. The mandate broker (or ADMIN) then has two options:

### Take out (withdraw)

The broker decides the tea should not sell at the offered price and withdraws the lot.

```http
POST /api/tea/lots/17/take-out
```

- Lot → `WITHDRAWN`
- All remaining `HELD` bid-security holds released
- The underlying eWR **does not** revert automatically (remains `MARKET_LISTED`). To re-list you must create a new lot once any cleanup is complete.

### Accept below reserve

The broker accepts the highest bid even though it is below the reserve price.

```http
POST /api/tea/lots/17/accept-below-reserve
```

This creates a settlement record identical to a normal sale:
- Lot → `SOLD`
- Settlement record created with `acceptedBelowReserve = 1`
- eWR ownership transferred to buyer
- eWR state → `SETTLED`
- Fee breakdown calculated (see §9)

---

## 9. Settlement

After a lot is sold (either at reserve or below), the exchange admin confirms payment receipt.

```http
POST /api/tea/lots/17/settle
```

**Effect:**
- `paymentStatus: PENDING → PAID`
- `deliveryOrderStatus: NOT_ISSUABLE → ISSUABLE`
- Winning bidder's bid-security hold released

**View settlement detail:**

```http
GET /api/tea/lots/17/settlement
```

Accessible to: ADMIN, lot owner (producer), lot broker, and the winning buyer.

**Response:**
```json
{
  "lotId": 17,
  "sessionId": 7,
  "winningBidId": 44,
  "buyerId": 9,
  "buyerName": "East Africa Tea Imports Ltd",
  "grossAmountUsd": "3.20",
  "platformFeeUsd": "0.02",
  "brokerCommissionUsd": "0.05",
  "netProducerAmountUsd": "3.13",
  "promptDate": "2026-08-17",
  "paymentStatus": "PAID",
  "deliveryOrderStatus": "ISSUABLE",
  "acceptedBelowReserve": 0
}
```

**Fee calculation:**

| Component | Rate | Calculation |
|---|---|---|
| Platform fee | 0.5 % | `grossAmount × 0.005` |
| Broker commission | varies | `grossAmount × commissionRate` |
| Net to producer | — | `grossAmount − platformFee − brokerCommission` |

For direct listings, `commissionRate = 0`, so the producer receives `grossAmount − platformFee`.

**Prompt date:** automatically calculated as the next available prompt date following the auction date (T + settlement window). Returned in `YYYY-MM-DD` format.

After settlement the broker may issue a Delivery Order:

```http
POST /api/tea/lots/17/dispatch
Content-Type: application/json

{
  "docType": "DELIVERY_ORDER",
  "docData": {
    "issuedTo": "East Africa Tea Imports Ltd",
    "collectionPoint": "WRSC-NRB-001",
    "validUntil": "2026-08-24"
  }
}
```

---

## 10. API Reference — Mandates

| Method | Path | Actor | Description |
|---|---|---|---|
| `POST` | `/broker-mandates` | PRODUCER / COOPERATIVE | Grant a mandate to a broker |
| `GET` | `/broker-mandates/given` | PRODUCER / COOPERATIVE | List mandates I have granted |
| `GET` | `/broker-mandates/my` | ENABLER | List mandates granted to me |
| `DELETE` | `/broker-mandates/:id` | PRODUCER (owner only) | Revoke a mandate |

### Mandate object

```typescript
{
  id: number;
  ownerId: number;
  ownerName?: string;        // included in /my
  brokerId: number;
  brokerName?: string;       // included in /given and POST response
  commodityType: "TEA" | "MAIZE" | "RICE" | "COFFEE" | "AVOCADO";
  permissions: string[];     // ["list","accept_bids","negotiate","set_reserve"]
  commissionRateOverride: string | null;  // numeric string, e.g. "0.0150"
  validFrom: string;         // ISO 8601 with timezone
  validTo: string | null;    // null = open-ended
  revoked: boolean;
  revokedAt: string | null;
  createdAt: string;
}
```

---

## 11. API Reference — Tea Lots

| Method | Path | Actor | Description |
|---|---|---|---|
| `POST` | `/tea/lots` | PRODUCER or ENABLER | Create a lot (direct or broker) |
| `GET` | `/tea/lots` | Any authenticated | List lots (filterable) |
| `GET` | `/tea/lots/:id` | Any authenticated | Full lot detail |
| `PATCH` | `/tea/lots/:id` | Broker or owner | Update DRAFT/CATALOGUED lot |
| `POST` | `/tea/lots/:id/dispatch` | Broker or owner | Attach a dispatch document |
| `GET` | `/tea/lots/:id/dispatch` | Any authenticated | Retrieve dispatch documents |
| `POST` | `/tea/lots/:id/bids` | OFF_TAKER | Place a bid on a LIVE lot |
| `POST` | `/tea/lots/:id/take-out` | Broker or ADMIN | Withdraw a RESERVE_NOT_MET lot |
| `POST` | `/tea/lots/:id/accept-below-reserve` | Broker or ADMIN | Sell below reserve |
| `POST` | `/tea/lots/:id/settle` | ADMIN | Confirm payment, enable delivery order |
| `GET` | `/tea/lots/:id/settlement` | ADMIN, owner, broker, buyer | Settlement detail |

### GET /tea/lots query parameters

| Parameter | Type | Example |
|---|---|---|
| `grade` | string | `BOPF` |
| `giOrigin` | string | `Kenya` |
| `listingType` | `AUCTION` \| `FIXED_PRICE` | `AUCTION` |
| `status` | lot status enum | `CATALOGUED` |
| `brokerId` | integer | `12` |
| `ownerId` | integer | `5` |
| `certification` | string | `Rainforest Alliance` |

### GET /ewrs/broker-available

Only for `ENABLER` tier. Returns `INGESTED` TEA eWRs owned by active mandate holders.

```http
GET /api/ewrs/broker-available
```

---

## 12. API Reference — Auction Sessions

| Method | Path | Actor | Description |
|---|---|---|---|
| `POST` | `/tea/auctions` | ADMIN | Create a SCHEDULED session |
| `GET` | `/tea/auctions` | Any authenticated | List sessions (`?status=SCHEDULED\|LIVE\|CLOSED`) |
| `GET` | `/tea/auctions/:id` | Permitted users | Session detail + ordered lot list with live bid data |
| `POST` | `/tea/auctions/:id/lots` | ENABLER or ADMIN | Submit lots to a SCHEDULED session |
| `POST` | `/tea/auctions/:id/start` | ADMIN | Start the session; first lot goes LIVE |

### Session statuses

| Status | Meaning |
|---|---|
| `SCHEDULED` | Accepting lot submissions; not yet started |
| `LIVE` | Auction is running |
| `CLOSED` | All lots have been auctioned |

---

## 13. Business Rules Cheat-Sheet

| Rule | Detail |
|---|---|
| **One active mandate per broker + commodity** | 409 on duplicate; revoke the existing one first |
| **Mandate scope** | A TEA mandate only covers TEA eWRs (validated by `commodityType = "TEA"`) |
| **Revocation is immediate** | Revoked mandates no longer appear in `/ewrs/broker-available` and block new lot creation; existing lots are unaffected |
| **One active lot per eWR** | Any non-WITHDRAWN lot blocks re-listing the same eWR (409) |
| **DRAFT auto-transitions on first PATCH** | The first successful `PATCH /tea/lots/:id` sets `status → CATALOGUED` and records `publishedAt` |
| **Commission lock on direct lots** | `commissionRate` is permanently locked at `0` for direct (self-agent) listings; PATCH cannot change it |
| **Commission source priority** | `mandate.commissionRateOverride` > `commissionRate` in request body > default 1 % |
| **Broker can only submit their own lots** | Session lot submission checks `lot.brokerId === caller.id` |
| **Lots must be CATALOGUED or DISPATCHED** | to be submitted to a session |
| **Only OFF_TAKER can bid** | PRODUCER, ENABLER, and ADMIN accounts cannot place bids |
| **Owner cannot bid on own lot** | Returns 403 |
| **Bid must meet tick floor** | Minimum = `calcMinBid(currentHigh, tickTiers)` or `reservePriceUsd` if no bids |
| **Bid security hold** | `bidSecurityPct × amountUsd` (default 10 %); outbid holds released immediately |
| **Anti-snipe** | Default: 3-minute window, 3-minute extension, 30-minute total cap |
| **Settlement is ADMIN-only** | Only ADMIN can call `POST /tea/lots/:id/settle` |
| **eWR ownership transfer on sale** | On SOLD (at reserve or accept-below-reserve), `ewr.ownerId → buyer.id`, `ewr.state → SETTLED` |
| **Delivery Order gated on SOLD** | `POST /tea/lots/:id/dispatch` with `docType: DELIVERY_ORDER` rejected unless lot is `SOLD` |

---

## 14. Error Codes

| HTTP | `error` | Cause |
|---|---|---|
| `400` | `"eWR is not available for listing. Current state: X"` | eWR not `INGESTED` |
| `400` | `"reservePriceUsd is required for AUCTION lots"` | Missing reserve on auction lot |
| `400` | `"durationMins must be a whole number between 1 and 120"` | Invalid session start duration |
| `400` | `"Lot cannot be updated in status X"` | PATCH on LIVE/SOLD/WITHDRAWN lot |
| `400` | `"Cannot add lots to a session with status X"` | Session not SCHEDULED |
| `400` | `"Bid must be at least $X"` | Below tick floor; response includes `minBidUsd` |
| `400` | `"Lot must be in RESERVE_NOT_MET status"` | Take-out or accept-below-reserve on wrong status |
| `400` | `"Payment is already X"` | Settlement already confirmed |
| `400` | `"Delivery Orders can only be issued for SOLD lots"` | Delivery order precondition |
| `400` | `"Mandate is already revoked"` | Double-revoke attempt |
| `403` | `"No active TEA mandate from the eWR owner"` | Broker has no valid mandate for the eWR's owner |
| `403` | `"Producers can only create lots from eWRs they own"` | PRODUCER tried to list another owner's eWR |
| `403` | `"Only the mandate broker or owner can update this lot"` | Third-party PATCH attempt |
| `403` | `"You can only submit lots where you are the mandate broker"` | Broker submitted another broker's lot |
| `403` | `"Owner cannot bid on their own lot"` | Self-bid attempt |
| `403` | `"Only the mandate owner can revoke it"` | Broker tried to revoke their own mandate |
| `403` | `"Only PRODUCER or COOPERATIVE accounts can grant broker mandates"` | Wrong tier granting mandate |
| `403` | `"Target user is not an ENABLER"` | Mandate granted to non-broker |
| `409` | `"An active mandate already exists for this broker and commodity"` | Duplicate active mandate; includes `existingMandateId` |
| `409` | `"An active lot (ID: X, status: Y) already exists for this eWR"` | Duplicate lot for same eWR |
