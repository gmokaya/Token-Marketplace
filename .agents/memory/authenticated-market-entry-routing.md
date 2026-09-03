---
name: Authenticated marketplace entry
description: The routing and caching invariant for signed-in marketplace users
---

Resolve the signed-in user's profile and onboarding state before choosing the authenticated landing route. A completed non-admin account goes directly to its market; a new account goes to onboarding; admins retain the dashboard entry. Authenticated profile reads must return fresh JSON, not conditional-cache-only responses.

**Why:** Sending every signed-in account through onboarding creates a visible wizard flash, and a `304` response has no body for the client to hydrate, which can make a completed profile appear missing.

**How to apply:** Keep auth-provider fallback redirects pointed at the app entry gate, let the gate decide the destination from server state, and disable caching/ETag behavior for user-scoped profile reads.