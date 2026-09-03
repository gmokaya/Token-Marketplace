---
name: Generated API contract alignment
description: How to keep backend request fields and generated TypeScript clients synchronized
---

When a backend route supports a request field that the generated client does not expose, update the OpenAPI source and regenerate the clients instead of suppressing the mismatch with a cast or removing the field from the UI.

**Why:** The OpenAPI document is the source of truth for both runtime validation clients and TypeScript request types. A one-sided fix either hides a real contract drift or drops user input before it reaches the API.

**How to apply:** Update `lib/api-spec/openapi.yaml`, run the API codegen command, rebuild the referenced libraries, and then run the artifact typechecks.