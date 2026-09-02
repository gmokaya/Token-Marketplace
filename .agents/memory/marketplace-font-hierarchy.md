---
name: Marketplace font hierarchy
description: Shared TokenHarvest typography uses three local font families with distinct responsibilities
---

Use the shared three-font hierarchy across the website and every marketplace: Simplo for headings and display text, Belleza for TokenHarvest logos/wordmarks, and PT Sans for body copy and general UI. Load only the local font files required by those families; do not reintroduce unrelated web fonts.

**Why:** The product needs consistent body typography without losing the established display and brand treatments.

**How to apply:** Keep PT Sans as the body/default theme font, use Simplo in heading selectors, and scope Belleza to logo/wordmark selectors. Keep external font imports and preloads out of the artifact HTML.