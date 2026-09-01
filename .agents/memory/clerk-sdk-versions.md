---
name: Clerk SDK version matrix
description: Compatible @clerk/react and @clerk/shared versions for this project; v5.54.0 is broken
---

## The Rule
Use `@clerk/react@^6` in web artifacts. Do NOT add a global `@clerk/shared` pnpm override.

**Why:** `@clerk/react@5.54.0` (v5.x) imports `loadClerkUiScript` (camelCase Ui) from `@clerk/shared`, but v3.x+ use `loadClerkUIScript` (uppercase UI). The package is effectively broken. `@clerk/react@6.x` uses `@clerk/shared@^4` consistently.

**How to apply:**
- Web artifacts: install `@clerk/react@latest @clerk/themes@latest` — they pull shared@4 naturally.
- Do NOT add `"@clerk/shared": "^4.14.0"` to root `pnpm.overrides`.

`publishableKeyFromHost` is still exported from `@clerk/react/internal` in v6 (re-exported from `@clerk/shared/keys`) — canonical App.tsx code works unchanged.
