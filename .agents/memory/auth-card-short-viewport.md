---
name: Auth card short viewport behavior
description: Responsive centering guidance for the shared marketplace sign-in and create-account cards
---

Short desktop viewports need their own auth-card treatment: a grid item whose intrinsic height exceeds the available row can remain visually low or clip at the page base even when the grid uses align-items:center. Center the compact form column against the available auth region and apply a bounded scale for short heights; keep mobile in natural document flow. Both sign-in and sign-up cards must use natural content height in this compact mode, and a top:50% anchor must include translateY(-50%) for true centering.

**Why:** The create-account form is substantially taller than the sign-in form, and the carousel plus header/footer reduce the usable vertical area on short laptop viewports.

**How to apply:** Preserve generous vertical padding at normal sizes, then use a desktop-only max-height breakpoint for explicit centering and compact scaling. Do not carry that scaling into the mobile breakpoint.