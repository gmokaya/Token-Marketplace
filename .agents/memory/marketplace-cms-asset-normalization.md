---
name: Marketplace CMS asset normalization
description: Protects commodity marketplace links and imagery when persisted homepage CMS data is stale
---

Known commodity cards on the public homepage must be normalized at render time, not trusted directly from persisted CMS data. Saved CMS records may contain old generic sign-in links or uploaded storage URLs even after the corresponding marketplace artifacts and local photos have changed.

**Why:** The root homepage's persisted market-card data overrode the intended local defaults in production, causing commodity cards to open the generic sign-in page and display unrelated/stale photos.

**How to apply:** Keep canonical commodity-to-artifact destinations and local asset paths in the public homepage renderer. Use CMS data for editable copy and unknown commodities, but let canonical mappings win for known Coffee, Tea, and Grain commodities.