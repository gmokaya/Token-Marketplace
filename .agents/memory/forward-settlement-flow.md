---
name: Forward contract → settlement engine flow
description: How forward maturity hands off to the split settlement engine, and why maturity must NOT touch the eWR
---

## Rule
Forward maturity (both the manual `/forwards/:contractId/complete` handler and the
background `startForwardMaturityWorker`) must only mark the contract `MATURED` and
release the performance bonds. It must NOT write the eWR state. The split settlement
engine (`POST /settlements`, `entityType: FORWARD`) is the **single** authority that
finalizes the trade: it disburses the legs and, on all-legs-complete, transfers title
to the buyer (`ENCUMBERED → INGESTED`) and clears the lien.

**Why:** The DB state-transition trigger (`lib/db/src/migrate.ts`) makes `SETTLED` a
**terminal** state. If maturity sets the eWR to `SETTLED`, the later settlement-engine
update to `INGESTED` raises `eWR is in final SETTLED state and cannot be transitioned`,
so the whole settlement transaction fails. Maturity setting `SETTLED` also bypasses the
required multi-leg split (bank / platform / producer).

**How to apply:** `deriveEntityValue` for FORWARD requires `contractStatus === "MATURED"`.
Leave the eWR `ENCUMBERED` at maturity; the engine handles ENCUMBERED→INGESTED.

## Forward encumbrance vs. financing lien (same `isLienActive` flag)
Buyer co-sign sets `isLienActive = true` as the forward's own performance encumbrance —
this is NOT necessarily a financing loan. The settlement lien check looks up an ACTIVE
financing loan when `isLienActive`; for `entityType === "FORWARD"` it must NOT 409-block
when no loan is found — instead proceed with `rBank = 0` (no bank leg). If a financing
loan IS active on the eWR it is matched and repaid via the bank leg as normal. For
ORDER/AUCTION, lien-active with no active loan stays a hard 409 (genuinely anomalous,
since their checkout paths don't set `isLienActive`).
