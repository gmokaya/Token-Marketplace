---
name: Cross-artifact shared styles
description: Reliable layout and theme styling for components imported directly across marketplace artifacts
---

Critical layout, positioning, width, color, and responsive rules in source files imported directly from another artifact should live in an explicitly imported shared stylesheet rather than relying only on generated utility classes. This includes dynamic class maps, not just media queries.

**Why:** Separate marketplace builds can emit different utility-class sets for the same cross-artifact component. Missing dynamic classes can make a sidebar lose its background and width, make fixed notifications lose their position, or make a grid render differently, despite importing the same component.

**How to apply:** When Grain-owned components are consumed by Coffee or Tea, verify every consumer build visually. Put parity-critical layout and theme rules in CSS imported by the shared component, and use stable semantic class names instead of runtime-selected utility strings for cross-artifact styling.