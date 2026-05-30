---
name: Financing eligibility & pre-Clerk API surface
description: What makes an e-WR financeable, and how the pre-auth ewr-api/wrsc registry surface must be secured
---

# Financing eligibility

An e-WR is financeable when it is **unencumbered** (no active lien) and the holder
still owns it — concretely `state IN (INGESTED, MARKET_LISTED)` AND
`isLienActive === false`. It is NOT limited to INGESTED.

**Why:** the product requirement is advances against *any unencumbered* receipt; a
listed-for-spot-sale receipt (MARKET_LISTED) is still owned and unpledged, so it must
qualify. States committed to a pending sale/settlement (AUCTION_ACTIVE, FORWARD_BOUND,
LOCK_TRADING), already SETTLED, or already ENCUMBERED are excluded to preserve lien
safety. On approval the receipt transitions to ENCUMBERED; the settlement engine repays
the lien from sale proceeds, so a financed-then-listed receipt is consistent.

**How to apply:** gate on the `FINANCEABLE_STATES` constant in financing.ts (eligible
list query, POST /financing, and the approval transaction must all use it). Keep the
`isLienActive` and duplicate-request conflict checks alongside it.

# Pre-Clerk registry API surface (ewr-api, wrsc)

`ewr-api` routes are mounted in `routes/index.ts` **before** the global Clerk
`requireAuth` because they carry their own OAuth2-JWT / HMAC auth. That makes them a
pre-auth attack surface, so they must never run in production with well-known default
secrets.

**Rule:**
- `ewr-api` exports `EWR_API_SECURELY_CONFIGURED`. In production it is only mounted when
  `WRSC_SECRET`, `EWR_JWT_SECRET`, and `EWR_OAUTH_CLIENTS` are all set via env; otherwise
  index.ts leaves it unmounted (logs a warning) — disable rather than expose, and never
  crash the whole server for a demo subsystem.
- Demo OAuth clients (visible in the EwrApi playground page) are dev-only fallbacks and
  must never be the source of truth in production (`EWR_OAUTH_CLIENTS` JSON overrides).
- `wrsc` uses the same `WRSC_SECRET` HMAC and fails fast (throws at boot) in production
  if unset — it's a core integration whose signatures would be invalid anyway without
  the real secret, so a hard error surfaces the misconfig.

**Why:** a reviewer flagged that default fallback secrets + pre-Clerk mounting allowed
token minting / privileged mutations if env hardening was absent.

**How to apply:** any new pre-auth route group needs the same gated-mount treatment;
production deploys must set WRSC_SECRET, EWR_JWT_SECRET, EWR_OAUTH_CLIENTS.
