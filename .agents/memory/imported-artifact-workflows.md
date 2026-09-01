---
name: Imported artifact workflow fallback
description: How to run imported artifact directories when their manifests are not registered as managed artifacts.
---

Imported artifact manifests may exist on disk while the artifact catalog and managed workflow list are empty. In that state, configure fallback workflows using the existing proxy port mapping rather than inventing new ports.

**Why:** A subpath Vite server was healthy locally but the workflow manager terminated it because the generic root health wait did not match the mounted path; using a different local port also produced a proxied 502.

**How to apply:** First try the manifest-owned workflow. If it is absent and the artifact catalog is empty, use the existing `.replit` port mapping, preserve `BASE_PATH`, and omit a root-only health wait for subpath apps. Verify both local and proxied routes.