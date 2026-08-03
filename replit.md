# TokenHarvest — WRS Marketplace

East Africa's electronic warehouse receipt (eWR) trading platform for agricultural commodities: live auctions, forward contracts, spot trading, and warehouse financing.

## Run & Operate

Workflows are managed by Replit. The three services start automatically:
- **`artifacts/api-server: API Server`** — Express API on port 8080 (`/api`)
- **`artifacts/wrs-marketplace: web`** — WRS Marketplace React/Vite frontend on port 26227 (`/`)
- **`artifacts/tea-marketplace: web`** — Tea Marketplace React/Vite frontend on port 25073 (`/tea/`)
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

## Setup status

Completed on import (2026-07-23):
- `pnpm install` — all workspace dependencies installed
- `pnpm --filter @workspace/db run push` — DB schema pushed to Replit PostgreSQL
- Clerk auth provisioned via Replit-managed Clerk (`setupClerkWhitelabelAuth`); keys auto-set as secrets (`CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`)
- All four workflows started and verified healthy

## Gotchas

- `.replit` modules must stay on `nodejs-24` — the project targets Node 24 (TypeScript 5.9, ESM, top-level await). Do not downgrade to nodejs-20.
- `pnpm --filter @workspace/db run push` must be re-run after any schema change in `lib/db/src/schema.ts` (dev only; production schema is managed by Replit Publish).
- The Clerk dev key warning ("loaded with development keys") in the browser console is expected and intentional in development.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
