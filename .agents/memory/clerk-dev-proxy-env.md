---
name: Clerk proxy modes
description: Distinguish Replit-managed and external Clerk proxy configuration
---

For Replit-managed Clerk, local Vite workflows must omit `VITE_CLERK_PROXY_URL` because the proxy is production-only. For this project’s external Clerk account, the clients must not pass a proxy URL and the API server must not mount the Replit-managed proxy middleware in any environment.

**Why:** A managed proxy path mixed with an external Clerk key can send Clerk requests to the wrong FAPI transport. In development, the same path also reaches protected API routing and returns 401, causing the Clerk runtime overlay.

**How to apply:** When using managed Clerk, keep canonical `proxyUrl` wiring and unset the proxy variable only in dev scripts. When using an external Clerk account, omit the client `proxyUrl` prop and the server proxy mount; keep the external publishable and secret keys in workspace secrets.