---
name: Structured onboarding commodities
description: Compatibility rule for marketplace onboarding commodity and sub-type data.
---

Each marketplace's onboarding shows only its primary commodity: Grain, Coffee, or Tea. Grain requires one or more grain sub-types; Coffee and Tea use their market-specific origin catalogs instead of the generic sub-type field. Keep the legacy flat commodity fields as compatibility mirrors rather than making them the source of truth.

**Why:** The marketplaces have independent onboarding experiences, but one user can participate in several markets. The shared structured selection array must accumulate unique primary-market entries without one market erasing another, while older profiles and consumers may still rely on flat strings.

**How to apply:** Filter the visible Step 2 controls to the active market, preserve hidden selections from other markets, and validate only the active market's detailed catalog fields. Normalize old flat names when loading and derive legacy strings when saving.