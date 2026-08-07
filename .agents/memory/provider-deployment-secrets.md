---
name: Provider deployment secrets
description: Production provider credentials only affect the published deployment serving the provider URL.
---

The provider API can report “not configured” even when the Replit Secret exists if the external URL is not serving the current published deployment. Development workflows and workspace secret existence do not prove that a live custom domain has the production secret.

**Why:** A live request to the custom provider domain returned 503 while the local API accepted the configured key; deployment metadata showed no active published deployment.

**How to apply:** Before confirming an external integration, verify the published deployment is active, the custom domain points to it, and then test the live health endpoint with the configured credential.