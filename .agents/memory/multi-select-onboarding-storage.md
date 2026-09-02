---
name: Multi-select onboarding storage
description: Compatibility strategy for multi-select market onboarding fields
---

Store multi-select onboarding values as JSON arrays in the existing text columns rather than changing the database column type. Normalize both JSON arrays and legacy plain-text single values at API input and frontend load boundaries.

**Why:** The existing schema is already deployed with text columns, while selections can contain punctuation such as slashes. JSON preserves exact option values and avoids a disruptive migration.

**How to apply:** Validate every selected value server-side, require at least one where the market flow requires it, and keep legacy string reads compatible during the transition.