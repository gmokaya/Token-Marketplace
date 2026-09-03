---
name: Generated query options
description: Constraint when passing custom TanStack Query options to generated API hooks
---

Generated API hooks in this workspace require the matching generated query key inside `query` options, even for simple `enabled` or polling settings.

**Why:** The generated hook option type marks `queryKey` as required, so omitting it fails the artifact typecheck.

**How to apply:** Import the endpoint's `get...QueryKey` helper from the generated client and include `queryKey: get...QueryKey(params)` whenever passing a custom `query` object.