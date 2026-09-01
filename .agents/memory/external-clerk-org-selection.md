---
name: External Clerk organization selection
description: Why TokenHarvest's external Clerk development instance must not force organization selection.
---

TokenHarvest does not use Clerk Organizations. Keep forced organization selection disabled in the external Clerk instance.

**Why:** When enabled, newly authenticated users are diverted to the `choose-organization` task and never reach the marketplace onboarding redirect, even though the Clerk keys and session handshake are otherwise valid.

**How to apply:** If authentication reaches a Clerk organization task instead of the requested marketplace route, inspect the external instance's organization settings before changing app authentication code.