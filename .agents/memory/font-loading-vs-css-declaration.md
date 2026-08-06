---
name: Font declared in CSS but not loaded
description: A --app-font-* CSS token silently falls back unless index.html actually loads that font
---

Declaring `--app-font-sans: 'Jost'` (or any web font) in `index.css` / theme tokens does NOT load the font. The font must also be pulled in via a `<link>` in that artifact's `index.html` (or an `@import`). For uploaded Futura files, inspect font metadata before choosing a filename: `Futura_Light_font_*` may be a condensed cut (`Futura LtCn BT`), while `futura_light_bt_*` is the non-condensed light cut (`Futura Lt BT`).

**Why:** A tea-marketplace artifact declared Jost in CSS (matching WRS) but its `index.html` only loaded Inter from Google Fonts, so all text silently fell back to the browser default sans-serif — looked "wrong" with no error anywhere.

**How to apply:** When matching one artifact's typography to another, check BOTH the CSS `--app-font-*` tokens AND the `index.html` Google Fonts `<link>`. They must agree. When cloning styling across artifacts, copy the font `<link>` too, not just the CSS.
