---
name: Shared market onboarding source
description: Cross-artifact reuse rules for the Grain-based onboarding experience
---

Use the Grain onboarding page and components as the source of truth for Coffee and Tea. Pass market-specific values as props or modifier classes instead of duplicating the wrapper markup.

**Why:** Each market is a separate Vite artifact. The consuming artifact resolves its `@` alias locally, and local stylesheet ordering can otherwise override the shared onboarding geometry.

**How to apply:** Use file-relative imports inside shared pages when they must be consumed by another artifact, and import the shared onboarding stylesheet explicitly after the artifact's local `index.css` in each entry point.