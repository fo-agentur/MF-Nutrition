---
name: macrofactor-design
description: Use this skill to generate well-branded interfaces and assets for MacroFactor (the science-based nutrition & fitness app, brand identity by Pentagram), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

Key files:
- `README.md` — product context, content fundamentals, visual foundations, iconography.
- `colors_and_type.css` — all design tokens (macro colors, surfaces, type, radii, spacing).
- `preview/` — design-system cards (swatches, type specimens, components).
- `ui_kits/app/` — interactive mobile-app UI kit (`index.html` + JSX components).
- `assets/` — recreated MF monogram mark.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets
out and create static HTML files for the user to view. If working on production code,
copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to
build or design, ask some questions, and act as an expert designer who outputs HTML
artifacts _or_ production code, depending on the need.

Substitutions to flag when used: **MacroSans** (custom, proprietary) → Archivo /
Archivo Expanded; the **450+ custom icons** → Lucide.
