# TokenHarvest Platform — API Reference

> **Version:** 0.1.0  
> **Base path:** `/api`  
> **Spec source:** `lib/api-spec/openapi.yaml`

Both the **WRS Marketplace** (`/`) and the **Tea Producer Portal** (`/tea`) are served through the same shared API server. All authenticated endpoints use **Clerk** session tokens — the same Clerk instance powers both frontends.

---

## Contents

1. [Base URL & Routing](#1-base-url--routing)
2. [Authentication](#2-authentication)
3. [User Roles](#3-user-roles)
4. [Users](#4-users)
5. [Electronic Warehouse Receipts (eWRs)](#5-electronic-warehouse-receipts-ewrs)
6. [Tea Lots](#6-tea-lots)
7. [Tea Auction Sessions](#7-tea-auction-sessions)
8. [Dispatch Documents](#8-dispatch-documents)
9. [Broker Mandates](#9-broker-mandates)
10. [Settlements](#10-settlements)
11. [Spot Market Listings & Orders](#11-spot-market-listings--orders)
12. [Market Statistics](#12-market-statistics)
13. [Warehouse Profiles](#13-warehouse-profiles)
14. [Public Assets](#14-public-assets)
15. [Error Format](#15-error-format)
16. [Connecting the Two Portals — Integration Guide](#16-connecting-the-two-portals--integration-guide)

---

## 1. Base URL & Routing

| Environment | API base |
|---|---|
| Development (Replit preview) | `https://<replit-dev-domain>/api` |
| Production (deployed) | `https://<your-domain>/api` |

From within either frontend, all API calls are made using **relative URLs** — do not hardcode a host.

**WRS Marketplace** uses:
```js
const API = import.meta.env.VITE_API_URL ?? "";
fetch(`${API}/api/...`)
```

**Tea Producer Portal** uses Vite's built-in `BASE_URL`:
```js
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
fetch(`${BASE}/api/...`)
```

Both resolve to the same API server through the Replit shared proxy.

---

## 2. Authentication

All non-public endpoints require a valid **Clerk session**. The session is transmitted automatically via HTTP cookie when requests include `credentials: "include"`.

```js
const res = await fetch("/api/tea/lots", {
  credentials: "include",
});
```

If you need to send the token explicitly (e.g. from a native client or server-to-server), fetch the token from Clerk and include it as a Bearer header:

```js
import { useAuth } from "@clerk/react";

const { getToken } = useAuth();
const token = await getToken();

const res = await fetch("/api/tea/lots", {
  headers: { Authorization: `Bearer ${token}` },
});
```

**Public endpoints** (no auth required):

| Method | Path | Notes |
|---|---|---|
| GET | `/api/healthz` | Health check |
| GET | `/api/content/:key` | CMS page content |
| POST | `/api/contact` | Contact form submission |
| GET | `/api/storage/public-objects/*` | Public uploaded assets |

---

## 3. User Roles

Every registered user has a `tier` that controls what they can do.

| Tier | Description |
|---|---|
| `PRODUCER` | Tea/commodity farmer. Creates eWRs, grants mandates, creates lots. |
| `COOPERATIVE` | Groups producers. Can split, retire, and transfer eWRs. |
| `ENABLER` | Licensed broker. Catalogues lots, submits to auctions, holds mandates. |
| `OFF_TAKER` | Buyer. Bids in auctions and purchases on the spot market. |
| `FINANCIER` | Lender. Approves, disburses, and rejects financing requests. |
| `ADMIN` | Platform operator. Full access including admin endpoints. |

KYB status (`PENDING` → `VERIFIED` → `REJECTED`) gates access to trading operations.

---

## 4. Users

### Get current user

```
GET /api/users/me
```

Returns the authenticated user's platform profile.

**Response `200`**
```jsonc
{
  "id": 42,
  "clerkId": "user_abc123",
  "name": "Jane Wanjiku",
  "email": "jane@teafarm.co.ke",
  "tier": "PRODUCER",           // PRODUCER | OFF_TAKER | ENABLER | FINANCIER | COOPERATIVE | ADMIN
  "reputationScore": 87,
  "kybStatus": "VERIFIED",      // PENDING | VERIFIED | REJECTED
  "company": "Wanjiku Tea Ltd",
  "createdAt": "2025-01-15T09:00:00Z"
}
```

### Update current user

```
PATCH /api/users/me
```

**Request body**
```jsonc
{
  "name": "Jane Wanjiku",       // optional
  "company": "Wanjiku Tea Ltd", // optional
  "tier": "PRODUCER"            // optional — usually set by admin
}
```

### List brokers

```
GET /api/users/brokers
```

Returns all ENABLER-tier users. Used when a producer needs to choose a broker to grant a mandate to.

**Response `200`** — `User[]`

---

## 5. Electronic Warehouse Receipts (eWRs)

An eWR is the digital title to a commodity lot stored in a licensed warehouse. Tea eWRs have additional grading fields (`teaProcessingType`, `teaLeafGrade`, `teaInvoiceSerial`).

### eWR states

```
INGESTED → MARKET_LISTED → AUCTION_ACTIVE → SETTLED → EXTINGUISHED
                        ↘ FORWARD_BOUND
                        ↘ ENCUMBERED (financing lien active)
                        ↘ LOCK_TRADING
```

Only `INGESTED` and `MARKET_LISTED` eWRs with no active lien are eligible for new tea lots.

### Get my portfolio

```
GET /api/ewrs/my-portfolio
```

**Response `200`**
```jsonc
{
  "ewrs": [ /* Ewr[] */ ],
  "totalValueUsd": 48000,
  "byState": [
    { "state": "INGESTED", "count": 3 },
    { "state": "MARKET_LISTED", "count": 2 }
  ],
  "byCommodity": [
    { "commodityType": "TEA", "count": 5, "totalWeightMt": 12.4 }
  ]
}
```

### List eWRs

```
GET /api/ewrs
```

Returns all eWRs visible to the authenticated user.

### Get eWR detail

```
GET /api/ewrs/:ewrId
```

**Response `200` — `Ewr`**
```jsonc
{
  "id": 101,
  "ewrsReceiptId": "WRSC-2025-TEA-00892",
  "wrscSignature": "sig_...",
  "warehouseCode": "NRB-001",
  "commodityType": "TEA",
  "batchType": "NON_FUNGIBLE",
  "grade": "Grade 1",
  "weightMt": 5.2,
  "harvestSeason": "2025A",
  "isLienActive": false,
  "lienHolderId": null,
  "state": "INGESTED",
  "ownerId": 42,
  "ownerName": "Jane Wanjiku",
  "issuedAt": "2025-03-01T08:00:00Z",
  "estimatedValueUsd": 18200,
  // Tea-specific fields
  "teaProcessingType": "CTC",     // CTC | ORTHODOX
  "teaLeafGrade": "BOP",          // BOP | BOPF | D1 | PF
  "teaInvoiceSerial": "INV-2025-0042"
}
```

### Submit an eWR (intake)

```
POST /api/ewrs
```

Roles: `PRODUCER`, `ENABLER` (with mandate). Validates commodity-specific grading fields.

**Request body**
```jsonc
{
  "ewrsReceiptId": "WRSC-2025-TEA-00892",
  "wrscSignature": "sig_...",
  "warehouseCode": "NRB-001",
  "commodityType": "TEA",
  "grade": "Grade 1",
  "weightMt": 5.2,
  "harvestSeason": "2025A",
  "estimatedValueUsd": 18200,       // optional
  // Tea-specific (required for TEA commodity):
  "teaProcessingType": "CTC",       // CTC | ORTHODOX
  "teaLeafGrade": "BOP",            // BOP | BOPF | D1 | PF
  "teaInvoiceSerial": "INV-2025-0042"
}
```

### eWR operations

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/ewrs/:ewrId/split` | COOPERATIVE | Split into two child receipts |
| `POST` | `/api/ewrs/:ewrId/transfer` | COOPERATIVE | Transfer ownership (`{ toUserId }`) |
| `POST` | `/api/ewrs/:ewrId/retire` | Any owner | Extinguish for physical withdrawal |

---

## 6. Tea Lots

A tea lot is a catalogued offer linked to a single eWR. Lots move through the auction lifecycle independently.

### Lot states

```
DRAFT → CATALOGUED → DISPATCHED → LIVE → SOLD
                                       → UNSOLD
                   → WITHDRAWN
                   → RESERVE_NOT_MET
```

### List lots

```
GET /api/tea/lots
```

Optional query params: `?ownerId=42` to filter by owner (used in producer dashboard).

**Response `200`** — `TeaLot[]`

### Get lot detail

```
GET /api/tea/lots/:lotId
```

**Response `200` — `TeaLotDetail`** (extends `TeaLot` with `ownerName`, `brokerName`, and nested `ewr` summary)

### Create a tea lot

```
POST /api/tea/lots
```

Roles: Broker with active mandate, or ADMIN.

**Request body**
```jsonc
{
  // Required
  "ewrId": 101,
  "grade": "Grade 1",
  "gradeMark": "BP1",
  "giOrigin": "Kericho",
  "grossWeightKg": 5400,
  "netWeightKg": 5200,
  "tareWeightKg": 200,
  "packageType": "Sack",

  // Optional
  "packingWeightKg": 25,
  "tasterRemarks": "Bright, brisk liquor with floral notes",
  "certifications": ["Rainforest Alliance", "UTZ"],
  "storageStatus": "IN_STORAGE",

  // Pricing
  "listingType": "AUCTION",          // AUCTION | FIXED_PRICE
  "catalogueType": "WITH_VALUATION", // WITH_VALUATION | WITHOUT_VALUATION
  "reservePriceUsd": 8500,           // Required for AUCTION
  "brokerValuationUsd": 9200,        // Optional broker estimate
  "fixedPricePerKgUsd": 1.75,        // Required for FIXED_PRICE

  // Auction mechanics (defaults shown)
  "commissionRate": 0.01,            // 1%
  "bidSecurityPct": 0.10,            // 10% bid deposit
  "tickTiers": [
    { "upToUsd": 5000, "incrementPct": 0.02 },
    { "above": true,   "incrementPct": 0.01 }
  ],
  "antiSnipeConfig": {
    "windowSecs": 180,               // trigger if bid in last 3 min
    "extensionSecs": 180,            // extend by 3 min per late bid
    "maxExtensionSecs": 1800         // cap at 30 min total extension
  }
}
```

### Update a lot

```
PATCH /api/tea/lots/:lotId
```

All fields are optional; only supplied fields are updated. Same shape as create (omit `ewrId`).

### Withdraw a lot

```
POST /api/tea/lots/:lotId/take-out
```

Moves lot to `WITHDRAWN`. Only allowed before `LIVE`.

### Accept below reserve

```
POST /api/tea/lots/:lotId/accept-below-reserve
```

Moves lot from `RESERVE_NOT_MET` → `SOLD` at the highest bid received.

### Settle a lot

```
POST /api/tea/lots/:lotId/settle
```

Finalises the trade. Triggers payment settlement split.

### Get lot settlement

```
GET /api/tea/lots/:lotId/settlement
```

**Response `200` — `TeaLotSettlement`**

---

## 7. Tea Auction Sessions

An auction session groups multiple catalogued lots into a scheduled multi-lot auction.

### Session states

```
SCHEDULED → LIVE → COMPLETED
```

### List sessions

```
GET /api/tea/auctions
```

**Response `200`** — `TeaAuctionSession[]`

### Get session detail

```
GET /api/tea/auctions/:sessionId
```

Returns the session with its ordered lot list, current bids, and per-lot countdown timers.

**Response `200`** — `TeaAuctionSessionDetail`

### Create a session

```
POST /api/tea/auctions
```

Roles: Broker or ADMIN.

**Request body**
```jsonc
{
  "name": "Mombasa Week 12 — 2025",
  "scheduledAt": "2025-03-25T09:00:00Z"
}
```

### Add lots to a session

```
POST /api/tea/auctions/:sessionId/lots
```

Roles: Mandate broker for the lots, or ADMIN.

**Request body**
```jsonc
{ "lotIds": [45, 46, 47] }
```

**Response `200`** — Updated `TeaAuctionSession`

### Start a session

```
POST /api/tea/auctions/:sessionId/start
```

Roles: ADMIN. Moves session from `SCHEDULED` → `LIVE` and opens bidding on all lots.

### Place a bid

```
POST /api/tea/lots/:lotId/bids
```

Roles: `OFF_TAKER`.

**Request body**
```jsonc
{
  "amountUsd": 9100
}
```

**Response `201` — `TeaLotBidResult`**
```jsonc
{
  "accepted": true,
  "bid": {
    "id": 88,
    "lotId": 45,
    "bidderId": 77,
    "amountUsd": 9100,
    "placedAt": "2025-03-25T09:14:32Z"
  },
  "newEndAt": "2025-03-25T09:17:32Z"  // present when anti-snipe extended the timer
}
```

---

## 8. Dispatch Documents

Three document types are attached to a lot during the dispatch lifecycle.

| `docType` | When attached |
|---|---|
| `PRE_AUCTION_DISPATCH` | Before auction — confirms lot dispatched from warehouse |
| `WEIGHMENT_REPORT` | Weighbridge certificate |
| `DELIVERY_ORDER` | Post-sale delivery instruction to buyer |

### Get dispatch documents

```
GET /api/tea/lots/:lotId/dispatch
```

**Response `200`** — `TeaDispatchDoc[]`

### Attach a dispatch document

```
POST /api/tea/lots/:lotId/dispatch
```

Roles: Mandate broker for the lot, or owner.

**Request body**
```jsonc
{
  "docType": "PRE_AUCTION_DISPATCH",
  "docData": {
    // Freeform JSON — store whatever fields you need,
    // e.g. vehicle registration, driver name, dispatch date
    "vehicleReg": "KDA 123X",
    "dispatchDate": "2025-03-24",
    "driverName": "Peter Otieno"
  }
}
```

---

## 9. Broker Mandates

A producer or cooperative grants a mandate to a licensed broker (`ENABLER` tier) to act on their behalf for a specific commodity.

### Grant a mandate

```
POST /api/broker-mandates
```

Roles: `PRODUCER`, `COOPERATIVE`.

**Request body**
```jsonc
{
  "brokerId": 15,                          // User ID of the ENABLER
  "commodityType": "TEA",                  // MAIZE | RICE | COFFEE | TEA | AVOCADO
  "permissions": ["list", "accept_bids", "negotiate", "set_reserve"], // default
  "commissionRateOverride": 0.008,         // optional — overrides lot-level rate
  "validFrom": "2025-03-01T00:00:00Z",
  "validTo": "2025-12-31T23:59:59Z"        // optional — null means open-ended
}
```

**Response `201` — `BrokerMandate`**

### Revoke a mandate

```
DELETE /api/broker-mandates/:mandateId
```

### List mandates received (broker view)

```
GET /api/broker-mandates/my
```

### List mandates granted (owner view)

```
GET /api/broker-mandates/given
```

---

## 10. Settlements

Settlements split trade proceeds across multiple payees (seller, broker commission, platform fee).

### Initiate settlement

```
POST /api/settlements
```

**Request body**
```jsonc
{
  "sourceType": "AUCTION",   // AUCTION | ORDER | FORWARD | TEA_AUCTION
  "sourceId": 88,            // ID of the source trade record
  "legs": [
    { "recipientId": 42, "amountUsd": 8200, "role": "SELLER" },
    { "recipientId": 15, "amountUsd": 450,  "role": "BROKER_COMMISSION" },
    { "recipientId": 1,  "amountUsd": 82,   "role": "PLATFORM_FEE" }
  ]
}
```

### Get settlement detail

```
GET /api/settlements/:settlementId
```

### Confirm disbursement

```
POST /api/settlements/:settlementId/disburse
```

**Request body**
```jsonc
{ "legId": 7, "confirmedBy": "finance-system" }
```

---

## 11. Spot Market Listings & Orders

The WRS Marketplace spot market operates independently of tea auctions and supports all commodity types.

### Browse listings

```
GET /api/listings
```

**Response `200`** — `SpotListing[]` (includes commodity, grade, weight, price, warehouse)

### Create a listing

```
POST /api/listings
```

Roles: `PRODUCER`.

**Request body**
```jsonc
{
  "ewrId": 101,
  "pricePerMt": 3500,
  "currency": "USD"
}
```

### Get listing detail

```
GET /api/listings/:listingId
```

**Response `200` — `SpotListingDetail`** (listing + full eWR object)

### Cancel a listing

```
DELETE /api/listings/:listingId
```

Roles: Listing seller only.

### Create an order (buy)

```
POST /api/orders
```

Roles: `OFF_TAKER`.

**Request body**
```jsonc
{ "listingId": 55 }
```

Locks the listing for settlement. Order expires if not settled within the platform window.

---

## 12. Market Statistics

Used by the WRS Marketplace landing page and dashboards. All stats endpoints require auth.

### Market summary

```
GET /api/stats/market-summary
```

```jsonc
{
  "totalActiveListings": 24,
  "totalEwrsIngested": 312,
  "totalEwrs": 418,
  "totalSettledToday": 7,
  "totalVolumeUsd": 1480000,
  "avgPricePerMt": 3250
}
```

### Commodity breakdown

```
GET /api/stats/commodity-breakdown
```

```jsonc
[
  { "commodityType": "TEA",   "activeListings": 11, "totalEwrs": 182, "totalWeightMt": 420.5, "avgPricePerMt": 3100 },
  { "commodityType": "COFFEE","activeListings": 6,  "totalEwrs": 74,  "totalWeightMt": 88.2,  "avgPricePerMt": 4850 }
]
```

### Recent activity feed

```
GET /api/stats/recent-activity
```

Returns a chronological feed of platform events:

```jsonc
[
  {
    "id": 501,
    "type": "ORDER_SETTLED",       // LISTING_CREATED | ORDER_EXECUTED | ORDER_SETTLED | EWR_INGESTED | EWR_ENCUMBERED
    "description": "2.5 MT TEA settled at KES 8,750/MT",
    "commodityType": "TEA",
    "valueUsd": 1094,
    "createdAt": "2025-03-25T11:22:00Z"
  }
]
```

### Price trends

```
GET /api/stats/price-trends
```

Returns commodity price trends derived from auction clearing prices. Shape: `PriceTrendItem[]`

### Warehouse distribution

```
GET /api/stats/warehouse-distribution
```

```jsonc
[{ "warehouseCode": "NRB-001", "ewrCount": 42, "totalWeightMt": 98.3 }]
```

### Top bidders

```
GET /api/stats/top-bidders
```

Returns ranked leaderboard of most active buyers. Shape: `TopBidder[]`

---

## 13. Warehouse Profiles

```
GET /api/warehouse-profiles/:warehouseCode
```

**Response `200` — `WarehouseProfile`**
```jsonc
{
  "operatorName": "Nairobi Central Warehouse Co.",
  "wrscLicenseNumber": "WRSC-NRB-2024-001",
  "facilityType": "Cold Storage",
  "capacityMt": "5000",
  "warehouseInChargeName": "Samuel Kamau",
  "warehouseInChargePhone": "+254 700 000 000",
  "warehouseInChargeEmail": "samuel@nairobiwhse.co.ke",
  "handlesTea": "yes",
  "insurerName": "UAP Insurance"
}
```

`warehouseCode` is the WRSC-issued code stored on each eWR. The tea lot response includes the full `warehouseProfile` object inline when available.

---

## 14. Public Assets

Uploaded assets (logos, images, documents) stored in Replit Object Storage are served at:

```
GET /api/storage/public-objects/:filePath
```

No authentication required. Used for partner logos, hero images, and other public content.

Private uploaded objects:

```
GET /api/storage/objects/:objectPath
```

---

## 15. Error Format

All error responses use a consistent envelope:

```jsonc
{
  "error": "Human-readable description of what went wrong"
}
```

| Status | Meaning |
|---|---|
| `400` | Validation error — malformed request body |
| `401` | Missing or invalid Clerk session |
| `403` | Authenticated but insufficient role/permissions |
| `404` | Resource not found |
| `409` | Conflict (e.g. bid below minimum increment, lot already in session) |
| `500` | Internal server error |

---

## 16. Connecting the Two Portals — Integration Guide

Both portals share the same Clerk instance and API server. Here is the typical data flow for a tea trade end-to-end:

```
PRODUCER (WRS Marketplace)
  │
  ├─ Submits eWR via POST /api/ewrs
  │    └─ commodityType: "TEA", teaProcessingType, teaLeafGrade, teaInvoiceSerial
  │
  ├─ Grants broker mandate via POST /api/broker-mandates
  │    └─ brokerId: <ENABLER user ID>, commodityType: "TEA"
  │
BROKER (Tea Producer Portal)
  │
  ├─ Reads mandate via GET /api/broker-mandates/my
  │
  ├─ Creates tea lot via POST /api/tea/lots
  │    └─ ewrId: <producer's eWR ID>
  │
  ├─ Attaches dispatch doc via POST /api/tea/lots/:id/dispatch
  │
  ├─ Creates or joins auction session via POST /api/tea/auctions
  │    └─ POST /api/tea/auctions/:sessionId/lots  { lotIds: [...] }
  │
ADMIN (Tea Producer Portal)
  │
  ├─ Starts session via POST /api/tea/auctions/:sessionId/start
  │
OFF_TAKER (Tea Producer Portal)
  │
  ├─ Browses live session via GET /api/tea/auctions/:sessionId
  ├─ Places bids via POST /api/tea/lots/:lotId/bids
  │
ADMIN / BROKER
  │
  ├─ Settles lot via POST /api/tea/lots/:lotId/settle
  └─ Splits proceeds via POST /api/settlements
```

### Making authenticated cross-portal links

To link a user from the WRS Marketplace landing page into their Tea Portal dashboard, pass through the same Clerk session — no re-login is needed since both apps share the same `VITE_CLERK_PUBLISHABLE_KEY`.

```tsx
// In WRS Marketplace — deep-link to Tea Portal
<a href="/tea/producer/dashboard">Go to Tea Dashboard →</a>
```

The user's Clerk session cookie is scoped to the root domain and is valid for both paths.

### Fetching cross-portal data

The WRS Marketplace can display tea-specific market data without any session issues:

```ts
// On the WRS Marketplace landing page stats block
const summary = await fetch("/api/stats/market-summary", {
  credentials: "include",
}).then(r => r.json());

const teaStats = await fetch("/api/stats/commodity-breakdown", {
  credentials: "include",
}).then(r => r.json());

const teaRow = teaStats.find(s => s.commodityType === "TEA");
```

### Polling vs. SSE for live auction state

For live bid updates in the Tea Portal, prefer **SSE** over polling:

```ts
// Subscribe to a specific lot's auction updates
const es = new EventSource("/api/auctions/stream");
es.onmessage = (e) => {
  const event = JSON.parse(e.data);
  // { type: "BID_PLACED", auctionId, currentBidUsd, endsAt }
};
```

---

*Generated from `lib/api-spec/openapi.yaml` · TokenHarvest Platform v0.1.0*
