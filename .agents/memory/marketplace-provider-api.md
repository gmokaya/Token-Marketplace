---
name: First-party marketplace provider API
description: TokenHarvest owns the external marketplace contract used for lot publication.
---

TokenHarvest's marketplace provider is a first-party HTTP API. The publishing adapter must call the provider contract rather than generate local synthetic listing IDs. The provider owns external listing IDs and idempotency state separately from the caller-side publication queue.

**Why:** There is no third-party marketplace account or API contract; the producer portal needs a concrete provider interface that can run locally now and be deployed separately later.

**How to apply:** Keep the provider base URL and Bearer credential configurable. Publish must be idempotent, return a stable external listing ID, support status lookup and unpublish, and require an explicit provider key in production.