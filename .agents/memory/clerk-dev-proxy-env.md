---
name: Clerk development proxy environment
description: Replit-managed Clerk proxy behavior in local Vite development
---

Local Vite workflows must omit `VITE_CLERK_PROXY_URL` from the dev process. Replit-managed Clerk may expose the production-only proxy path in the workflow environment even though the API server disables proxying in development.

**Why:** If the frontend receives the production proxy path during development, Clerk requests `/api/__clerk` locally; the development API server passes that request into protected API routing and returns 401, causing the Clerk runtime overlay.

**How to apply:** Keep the canonical `proxyUrl={import.meta.env.VITE_CLERK_PROXY_URL}` client wiring, but unset `VITE_CLERK_PROXY_URL` in each web artifact's development script. Production builds should retain the managed proxy value.