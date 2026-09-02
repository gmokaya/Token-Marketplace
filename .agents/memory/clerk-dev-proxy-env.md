---
name: Managed Clerk proxy wiring
description: Preserve the canonical host-aware Clerk setup across development and production
---

This project uses Replit-managed Clerk. Development intentionally has no proxy URL, while production receives a platform-provided proxy URL that must remain available to the Vite build. Use host-derived publishable keys on both client and server, pass the proxy env to the client unconditionally, and mount the canonical proxy middleware before body parsers.

**Why:** Removing the production proxy env made published clients load Clerk from the direct custom hostname, which failed before React could render and left every market page blank.

**How to apply:** Keep the proxy env empty only in dev commands; never unset it in production builds. Re-sync all Clerk wiring with the current managed-Clerk templates instead of hand-rolling proxy behavior.