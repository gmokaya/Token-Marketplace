---
name: Clerk proxy modes
description: Distinguish Replit-managed and external Clerk proxy configuration
---

For Replit-managed Clerk, local Vite workflows must omit `VITE_CLERK_PROXY_URL` because the proxy is production-only. For this project’s external Clerk account, clients must use the raw external publishable key, must not pass a proxy URL, and the API server must not mount the Replit-managed proxy middleware.

**Why:** `publishableKeyFromHost` keeps a development fallback key but replaces a live external key with a key derived from the Replit host. That sends Clerk JS to the wrong domain. A managed proxy path mixed with an external key causes the same class of failure.

**How to apply:** For managed Clerk, retain host-derived key and proxy wiring, unsetting the proxy only in dev scripts. For external Clerk, pass the raw `VITE_CLERK_PUBLISHABLE_KEY`, pass the raw server publishable key, omit proxy props and mounts, and keep all credentials in workspace secrets.