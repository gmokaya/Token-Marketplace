---
name: Seed script execution
description: How to run the api-server seed.ts from the workspace root
---

## The Rule
Run from the **workspace root**, not from inside the artifact directory.

**Why:** The api-server uses esbuild (no tsx), so tsx is not available in its local `node_modules/.bin`. Install tsx at workspace root (`pnpm add -D tsx -w`) and invoke it from the root.

**How to apply:**
```bash
node_modules/.bin/tsx --tsconfig artifacts/api-server/tsconfig.json artifacts/api-server/src/seed.ts
```
Running from inside `artifacts/api-server/` causes a doubled path error (`artifacts/api-server/artifacts/api-server/tsconfig.json`).
