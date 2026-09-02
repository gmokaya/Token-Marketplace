# Market Failure Isolation: Operations and Architecture

## Purpose and current topology

The marketplace is deployed as independently built frontend artifacts plus one
API artifact with independently managed runtime services. The services are:

| Market / surface | Artifact | Routed base path |
| --- | --- | --- |
| TokenHarvest public site | `tokenharvest-website` | `/` |
| Grain market | `wrs-marketplace` | `/grain/` |
| Coffee marketplace | `coffee-marketplace` | `/coffee/` |
| Tea marketplace | `tea-marketplace` | `/tea/` |
| Component/design preview | `mockup-sandbox` | `/__mockup` |
| Compatibility gateway/core | `api-server` / `API Server` | `/api` |
| Grain API runtime | `api-server` / `Grain API` | `/api/v1/grain` |
| Coffee API runtime | `api-server` / `Coffee API` | `/api/v1/coffee` |
| Tea API runtime | `api-server` / `Tea API` | `/api/v1/tea` |
| Core workers | `api-server` / `Core Workers` | `/api/internal/workers/core` |
| Grain workers | `api-server` / `Grain Workers` | `/api/internal/workers/grain` |
| Coffee workers | `api-server` / `Coffee Workers` | `/api/internal/workers/coffee` |
| Tea workers | `api-server` / `Tea Workers` | `/api/internal/workers/tea` |
| Database bootstrap | `api-server` / `Database Bootstrap` | `/api/internal/bootstrap` |

Each web artifact is a static production build with an SPA rewrite beneath its
own path. Consequently, an unavailable coffee build should not require
rebuilding, deploying, or serving the tea or grain builds. The design preview
is not a production market dependency.

There is **one public API contract and one shared database**, not a separate
database per market. The versioned market paths are separate processes with
strict specialized route-family ownership. Each active market runtime also
serves the shared data and identity routes needed by its own client, so the
compatibility gateway is not in the active marketplace request path.
PostgreSQL remains the unavoidable shared failure domain.

## Runtime profiles, not separate APIs

Use deployment/runtime profiles to isolate capacity and operational ownership
without presenting different public APIs:

1. **Web/static profile:** build and serve each frontend artifact independently.
   Cache static assets aggressively and preserve the configured base path.
2. **Gateway/core profile:** runs shared data, identity, integrations, legacy
   compatibility routes, SSE streams, and public endpoints at `/api`.
3. **Market profiles:** independently run each market client's complete
   operational API surface beneath its versioned base path. A market runtime
   rejects the other markets' specialized route families.
4. **Worker profiles:** Core, Grain, Coffee, and Tea workers run as separate
   processes with separate pool budgets, restart boundaries, and health-only
   HTTP ingress.
5. **Database Bootstrap profile:** one dedicated service applies schema
   constraints and admin bootstrap work. Request and worker processes perform
   read-only readiness verification and never execute startup DDL.

The API and worker profiles use the same compiled implementation with different
environment-owned responsibilities. Request processes set
`API_WORKER_GROUPS=""`; four worker services own the corresponding worker
groups. Database Bootstrap is the sole startup DDL owner.

## Service paths and blast-radius rules

Keep the existing paths stable:

* `/` — public site
* `/grain/`, `/coffee/`, `/tea/` — independent market SPAs
* `/api/...` — shared API
* `/api/v1/grain/...`, `/api/v1/coffee/...`, `/api/v1/tea/...` — isolated
  market-owned route families
* `/api/internal/workers/{core,grain,coffee,tea}/readyz` — worker readiness
* `/api/internal/bootstrap/readyz` — database bootstrap readiness
* `*/healthz`, `*/livez`, `*/readyz` — compatibility, liveness, and readiness

At the edge, route and deploy static sites independently from `/api`. A
frontend outage should be remediated by rolling back only its static artifact.
Each active market client sends its complete API surface to its corresponding
versioned runtime; the `/api` gateway remains for legacy compatibility. A
market API rollback therefore does not replace the other market runtimes.

The active runtime topology is:

```text
Grain SPA  ---> Grain API ----+
Coffee SPA ---> Coffee API ---+---> PostgreSQL (authority)
Tea SPA    ---> Tea API ------+
Legacy clients -> Gateway ----+
                              +---> Core/Grain/Coffee/Tea workers
                              +---> Database Bootstrap (DDL owner)
                              +---> transient event fan-out
```

The event fan-out line is PostgreSQL `LISTEN/NOTIFY` today. It is not Redis,
Kafka, RabbitMQ, SQS, or any other external queue.

## Worker ownership and correctness

The isolated worker services start these background activities after startup:

| Responsibility | Current behavior / ownership |
| --- | --- |
| Order expiry | Periodic in-process sweep; uses a per-process running guard and atomic conditional row transitions. |
| General auction expiry | Periodic sweep with PostgreSQL advisory-lock leader election (stable lock key `7369621`). |
| Tea auction/session close and bid-security defaults | Ten-second sweep with PostgreSQL advisory-lock leader election (key `3`); important transitions use serializable, retryable transactions. |
| Avocado degradation | Daily in-process sweep. |
| Forward-contract maturity | Periodic in-process sweep with conditional state transitions. |
| Daily market-close snapshots | Runs immediately and then every minute. |
| Auction SSE cross-instance fan-out | PostgreSQL `LISTEN auction_events`; reconnects every three seconds after loss. |

Only one logical owner should advance a time-based state machine at a time.
For the two lock-protected workers, PostgreSQL advisory locks provide that
leadership across replicas. Other workers rely on idempotent/conditional writes
or local guards; therefore adding API replicas increases database polling and
requires observing duplicate-attempt and query load.

The worker service may use more than one replica only where the job's database
claim, advisory lock, or idempotency guarantees have been verified. HTTP
profiles contain no scheduler ownership and can be restarted independently.

Workers must write their business result first, commit it, and only then emit
a notification. Notifications are hints for live clients; they are never the
record of a sale, bid, expiry, settlement, or ownership transfer.

## PostgreSQL is the source of truth

PostgreSQL stores the authoritative market state, constraints, transactions,
and worker coordination. Specific constraints:

* Every mutating API/worker action must be safe to retry. Use database
  transactions, row locks, conditional updates, unique constraints, and
  serializable transactions where an aggregate/state-machine decision needs
  them.
* Do not use an in-memory timer, SSE event, or `NOTIFY` payload as proof that
  a transaction occurred. Clients reconnecting after an event gap must
  refetch canonical state from the API.
* API startup currently attempts general database constraints and the
  publication uniqueness constraint. Failure to apply general constraints is
  logged and startup continues; publication setup failure blocks publication
  operations until corrected. Operate migrations/DDL explicitly before a
  multi-replica rollout rather than depending on this startup behavior.
* The API needs a working `DATABASE_URL`; the pub/sub listener also creates a
  dedicated PostgreSQL client, and notifications use a small pool (maximum
  two connections). Include these in connection budgeting.
* Restore, failover, and rollback plans must preserve transaction ordering and
  schema compatibility. Do not restore a database snapshot independently of
  application versions that interpret its state transitions.

## Capacity planning and scaling signals

Scale static artifacts on request rate, bandwidth, cache hit rate, build
availability, and route-specific 4xx/5xx rates. They should not consume API
or database connection capacity for ordinary asset delivery.

Scale API ingress on sustained CPU, memory, request latency (p50/p95/p99),
in-flight requests, error rate, connection count, and SSE connection count.
SSE streams are long lived; account for file descriptors, heap, proxy idle
timeouts, and sockets separately from short HTTP requests. The API configures
a 65-second keep-alive timeout and a 66-second headers timeout, intended to
exceed a typical 60-second upstream idle timeout.

Database statements and outbound providers have bounded execution times. Do
not add a response-only request timer: unless its cancellation signal is
propagated through every transaction and provider call, a mutation could commit
after the caller receives a retryable timeout response.

Scale workers based on sweep duration versus interval, overdue-row backlog,
oldest overdue item, transaction retry/conflict rate, and successful
state-transition rate. Adding worker replicas is not automatically useful:
lock-protected jobs have one active leader, while non-lock-protected sweeps
can add polling pressure.

PostgreSQL is normally the first shared capacity limit. Alert on connection
utilization, connection wait time, CPU, disk free space/IO latency, lock waits
and deadlocks, slow queries, replication/failover health, transaction error
rate, and table/index growth. Reserve connections for administrative access
and migrations; cap application pool sizes so autoscaled API replicas cannot
exhaust PostgreSQL.

For auction fan-out, alert on listener status and reconnect duration. The
configured degradation threshold defaults to 30 seconds
(`PUBSUB_DEGRADED_THRESHOLD_MS`). Events sent during a listener gap can be
lost, so the recovery behavior is deliberately a client reconnect/refetch
hint, not event replay.

## Health, readiness, and shutdown

`GET <service-base>/healthz` preserves the compatibility response and pub/sub
subscriber state. Every service also exposes:

* **`/livez`:** process can accept HTTP; dependency degradation does not make
  the process dead.
* **`/readyz`:** verifies PostgreSQL, required publication constraints,
  pub/sub connectivity, and the process draining state. It returns HTTP 503
  until ready and is the configured startup health path for every service.
* **Worker readiness:** is independently addressable for Core, Grain, Coffee,
  and Tea, so one worker process can be removed or restarted without changing
  the others.
* **Degraded:** keep reads and safe writes available where possible, while
  explicitly exposing loss of live event fan-out or a market-specific
  dependency.

On `SIGTERM` or `SIGINT`, each process becomes not-ready, stops accepting new
connections, stops its workers, cancels pub/sub reconnects, awaits in-flight
worker ticks, allows short requests a three-second window, destroys lingering
sockets (including SSE), then drains the database pool. A 15-second force-exit
guard prevents an indefinite drain. Clients must handle SSE disconnects and
refetch/reconnect.

## Failure exercises

Run these against a non-production environment first. Replace placeholders
with the deployed base URL and use approved credentials; do not deliberately
kill production database sessions.

```sh
# Confirm the response shape and capture status before/after an exercise.
curl -i "$BASE_URL/api/healthz"

# Confirm independent static routes remain separately reachable.
for path in / /grain/ /coffee/ /tea/; do
  curl -fsS -o /dev/null -w "%{http_code} $path\n" "$BASE_URL$path"
done
```

Exercise concepts:

1. **Frontend isolation:** deploy a deliberately invalid build only in a
   disposable environment for one market, then verify the other three static
   paths and `/api/healthz` remain reachable. Roll back that one artifact.
2. **API isolation:** block or scale down API ingress in staging. Verify static
   shells still load, API-backed views show an explicit unavailable state, and
   no market claims stale UI data is authoritative.
3. **PostgreSQL interruption:** use controlled network/database fault tooling.
   Verify API readiness fails, writes return clear
   failures rather than partial success, workers retry safely after recovery,
   and state is reconciled from PostgreSQL.
4. **Pub/sub interruption:** terminate the dedicated listener connection in
   staging (or inject a network fault). Verify health becomes degraded,
   reconnect occurs, clients receive/refetch after the reconnect hint, and
   canonical auction data is correct despite missed notifications.
5. **Leader contention:** run two worker/API replicas around auction end or
   tea lot close. Verify only one advisory-lock holder performs the transition
   and that conditional updates prevent duplicate settlement.
6. **Termination:** send `SIGTERM` to a staging instance while making a short
   request and holding an SSE connection. Verify traffic drains, the SSE
   client reconnects, the pool drains, and the process exits within its grace
   period.
7. **Backlog/catch-up:** create overdue test orders/contracts/lots. Measure
   completion time, database load, retries, and final state invariants rather
   than only whether the interval fires.

## Deployment and rollback order

1. Back up/verify PostgreSQL recovery posture and inspect migration and
   constraint compatibility.
2. Apply backward-compatible schema/index/constraint changes once, before
   deploying code that requires them. Verify publication constraint readiness
   where publication writes are involved.
3. Deploy static frontend artifacts independently; validate their base paths
   and API configuration. A static rollback is isolated to that artifact.
4. Deploy API instances with readiness gating and rolling drain. Keep old and
   new API versions compatible with the database during the overlap.
5. Deploy worker code compatible with the schema, verify each worker readiness
   path and leader/claim behavior, then deploy request services with
   `API_WORKER_GROUPS=""`.
6. Validate health, database capacity, listener state, SSE reconnect behavior,
   and worker progress after rollout.

Rollback in reverse dependency order: stop/drain new worker ownership first,
roll back API only to a database-compatible version, then roll back the
affected static artifact if needed. Do not roll back a destructive database
migration merely because an application rollback is requested; use a tested
forward-fix or an explicitly rehearsed database recovery plan.

## Queue/topic contract and external-queue migration

The only current cross-instance event mechanism is PostgreSQL
`LISTEN/NOTIFY` on topic/channel **`auction_events`**. The current payload
envelope is:

```ts
type AuctionEvent =
  | { type: "bid"; auctionId: number; data: unknown }
  | { type: "closed"; auctionId: number; data: unknown };
```

Tea session notifications reuse that envelope (including `tea_lot_live` data
under `type: "bid"`). Consumers must treat `data` as event-specific and
version it before relying on fields. Events may be duplicated at the client
level, may be missed during listener reconnection, and have no durable replay
or acknowledgement. They must not initiate an irreversible business mutation;
they prompt UI fan-out and canonical refetch.

There is currently **no external Redis instance, message broker, or external
queue implemented**. Do not document one as an operational dependency or
configure production runbooks as though it exists.

If durable external delivery is later required, migrate with a transactional
outbox in PostgreSQL: commit the business mutation and an outbox row in the
same transaction; relay that row to a named, versioned topic; use durable
consumer offsets/idempotency keys; preserve ordering only for a declared
partition key (for example `auctionId`); and retain a replay/dead-letter
policy. During a transition, dual-publish only with consumer deduplication and
clear cutover metrics. PostgreSQL remains authoritative; the external queue
becomes delivery infrastructure, never the source of market state.