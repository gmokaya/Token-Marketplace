---
name: Structured onboarding commodities
description: Compatibility rule for marketplace onboarding commodity and sub-type data.
---

Onboarding commodity choices are structured pairs with a required sub-type for Coffee, Tea, and Grain, and a null sub-type for all other commodities. Keep the legacy flat commodity fields as compatibility mirrors rather than making them the source of truth.

**Why:** Producers, traders, and buyers share one cascading selector, and flattening the choice loses varietal information while older profiles and consumers may still rely on the original string fields.

**How to apply:** New onboarding behavior should read and write structured selections. When loading an old profile or draft, normalize flat commodity names into structured pairs; when saving, derive legacy strings from those pairs.