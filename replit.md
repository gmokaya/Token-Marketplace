# TokenHarvest — WRS Marketplace

East Africa's electronic warehouse receipt (eWR) trading platform for agricultural commodities: live auctions, forward contracts, spot trading, and warehouse financing.

## Run & Operate

Workflows are managed by Replit. The three services start automatically:
- **`artifacts/api-server: API Server`** — Express API on port 8080 (`/api`)
- **`artifacts/wrs-marketplace: web`** — React/Vite frontend on port 26227 (`/`)
- **`artifacts/mockup-sandbox: Component Preview Server`** — Design canvas on port 8081 (`/__mockup`)

One-off commands:
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

Required env (runtime-managed by Replit — do not set manually):
- `DATABASE_URL` — Postgres connection string
- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — Replit-managed Clerk auth

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
