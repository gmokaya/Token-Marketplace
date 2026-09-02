---
name: Artifact build environment
description: Environment variables needed when manually building managed Vite artifacts outside their workflows.
---

Manual builds of managed artifact frontends may require both `PORT` and `BASE_PATH`, even when their normal workflow injects those values automatically.

**Why:** The mockup preview build failed until both runtime values were supplied; the frontend builds themselves were otherwise healthy.

**How to apply:** When validating an artifact outside its managed workflow, inspect its Vite config and mirror the workflow-provided port and mounted path before treating a missing-variable error as an application failure.