---
name: Transaction retry under high concurrency
description: Why and how DB write transactions must be retried, and where the shared helper lives
---

# Transaction retry for high concurrency

`lib/db` exports `withTxRetry(fn)` — wraps a `db.transaction(...)` call and retries
when Postgres aborts it with serialization_failure (`40001`) or deadlock_detected
(`40P01`), using bounded exponential backoff + jitter.

**Rule:** every money/inventory write transaction in `artifacts/api-server/src/routes`
should be wrapped: `await withTxRetry(() => db.transaction(async (tx) => { ... }))`.
SERIALIZABLE transactions (bids, spot orders, forward co-sign) WILL abort under load —
retry is the only correct response. Lock-heavy (`FOR UPDATE`) paths (settlements,
financing) can deadlock, so they are wrapped too.

**Why:** without retry, normal concurrency turns into spurious HTTP 500s the moment
two clients touch the same row — exactly the "thousands of simultaneous transactions"
failure mode.

**How to apply:**
- Only wrap the `db.transaction(...)` closure itself. Keep non-transactional side
  effects (e.g. `publishAuctionEvent`, response enrichment, SSE writes) OUTSIDE the
  retried closure so they never run twice.
- Side effects inside the closure must be DB-only (inserts/updates/audit-log rows) so
  a replay is safe.

## Related server hardening (api-server)
- `app.ts`: helmet (CSP off — it's an API), compression, `express.json({limit:"1mb"})`,
  `express-rate-limit` (skip requests whose path ends `/stream` or Accept includes
  `text/event-stream` — SSE streams are long-lived single requests), `trust proxy`,
  centralized error handler. SSE auction routes are `/auctions/stream` and
  `/auctions/:auctionId/stream`.
- `index.ts`: graceful SIGTERM/SIGINT shutdown tracks open sockets, gives in-flight
  requests ~3s, then destroys lingering sockets (SSE) so `server.close` completes and
  `pool.end()` drains the pool before exit.
- Pool is bounded/env-tunable (`DB_POOL_MAX`, `DB_POOL_*_TIMEOUT_MS`) with a
  `pool.on("error")` handler so dropped idle clients don't crash the process.
