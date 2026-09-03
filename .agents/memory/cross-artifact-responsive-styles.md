---
name: Cross-artifact responsive styles
description: Reliable responsive styling for components imported directly across marketplace artifacts
---

Critical responsive layout rules in source files imported directly from another artifact should live in an explicitly imported shared stylesheet rather than relying only on generated utility classes.

**Why:** Separate marketplace builds can emit different utility-class sets for the same cross-artifact component. This caused one consumer to render a two-column desktop grid while another correctly rendered four columns, despite importing the same component.

**How to apply:** When Grain-owned components are consumed by Coffee or Tea, verify every consumer build visually. Put parity-critical responsive rules in CSS imported by the shared component so each bundle receives the same media queries.