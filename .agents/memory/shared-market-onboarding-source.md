---
name: Independent market surfaces
description: Independence rules for Grain, Coffee, and Tea marketplace page implementations
---

Each marketplace artifact should own its authenticated shell, navigation, market workspace, and responsive styles. Keep the brand system consistent through local copies of the typography hierarchy, spacing scale, geometry, and market-specific palette; do not make Coffee or Tea authenticated pages depend on Grain page implementations.

**Why:** A shared Grain implementation can make a consumer render the wrong market copy or inherit stale layout behavior, and changes in one market become difficult to verify independently.

**How to apply:** When adding or changing a marketplace page, edit that artifact's own page/component and CSS files. Reuse the visual language, not the Grain artifact's runtime/source modules. Keep onboarding parity work separate from authenticated market-shell work.