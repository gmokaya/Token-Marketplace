---
name: TS project references rebuild
description: Monorepo lib packages (lib/db, lib/api-client-react) need tsc -p tsconfig.json run after adding new exports, or downstream packages won't see the new types.
---

## Rule
After adding new exports to any `composite: true` library package (e.g. `lib/db`, `lib/api-client-react`), run `npx tsc -p tsconfig.json` inside that package directory before typechecking downstream packages.

**Why:** These packages use `composite: true` + `emitDeclarationOnly: true` — they emit `.d.ts` files to `dist/`. TypeScript project references read from `dist/`, not `src/`. Without a rebuild, the new exports simply don't appear in the declaration files, causing TS2305 errors downstream even though the source is correct.

**How to apply:** Any time you add exports to `lib/db/src/schema/index.ts` or codegen adds hooks to `lib/api-client-react`, run the tsc build in that package before running `tsc --noEmit` in api-server or wrs-marketplace.
