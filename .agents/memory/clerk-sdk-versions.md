---
name: Clerk SDK version matrix
description: Compatible @clerk/react and @clerk/shared versions for this project; v5.54.0 is broken
---

## The Rule
Use `@clerk/react@^6` (currently 6.7.2) paired with `@clerk/shared@^4.14.0`. A workspace-root pnpm override forces the correct shared version for all packages.

**Why:** `@clerk/react@5.54.0` (the only v5.x on npm) imports `loadClerkUiScript` (camelCase Ui) from `@clerk/shared`, but neither the latest v3.x (`3.47.7`) nor v4.x (`4.14.0`) export that name — they use `loadClerkUIScript` (uppercase UI). The package is effectively a broken release. `@clerk/react@6.x` uses `@clerk/shared@^4.14.0` which is consistent.

**How to apply:** In workspace root `package.json`:
```json
"pnpm": { "overrides": { "@clerk/shared": "^4.14.0" } }
```
Then install `@clerk/react@latest @clerk/themes@latest` in the frontend artifact.

`publishableKeyFromHost` is still exported from `@clerk/react/internal` in v6 (re-exported from `@clerk/shared/keys`) — canonical App.tsx code works unchanged.
