---
name: Clerk redirects for non-root (sub-path) artifacts
description: Multi-artifact Clerk apps at a sub-path (e.g. /tea/) send users to the root app after sign-in unless redirects are set
---

When an artifact is served at a non-root base path (e.g. `/tea/`) and shares a Clerk tenant with the root artifact, after sign-in Clerk falls back to `/` — which serves the OTHER (root) app, not this one. Users authenticate then land on the wrong application.

**Why:** ClerkProvider with no `signInFallbackRedirectUrl` defaults to origin root `/`. A protected-route `<Redirect to="/sign-in" />` also carries no `redirect_url`, so Clerk has no destination within the sub-path app.

**How to apply:** For any sub-path artifact:
1. On `ClerkProvider`, set `signInFallbackRedirectUrl={`${basePath}/`}` and `signUpFallbackRedirectUrl={`${basePath}/`}`.
2. In the protected-route gate, redirect imperatively with the full URL: `redirectToSignIn({ redirectUrl: window.location.href })` so users return to the exact page after auth.
Root artifacts (basePath = "") don't hit this because `/` already is their app.
