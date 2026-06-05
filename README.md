# MacroFactor — Design System

A recreation of the **MacroFactor** mobile app's visual language, rebuilt as a
reusable design system for prototyping and brand-accurate mockups.

> ⚠️ **Recreation, not official assets.** This system was reconstructed from the
> user's own in-app screenshots (`uploads/`) plus the public Pentagram case study.
> No MacroFactor codebase or Figma file was provided, so component structure is a
> high-fidelity *cosmetic* recreation, not the production source.

---

## What is MacroFactor?

MacroFactor is a **science-based nutrition & fitness app** — a macro/calorie
tracker built for people who want to get serious about their bodies (lose weight,
gain muscle, build habits). Built by scientists, coaches, and engineers, it turns
adaptive algorithms into practical coaching. Its promise: *knowledge creates
clarity, and clarity creates progress.*

In 2026 **Pentagram** (partner Natasha Jen) designed a new brand identity around
the idea of **"Inspired Science"** — rigorous yet empathetic. Key pillars:

- **MacroSans** — a custom *variable* typeface, "architectural in structure yet
  fluid in application," with a wide range of weights **and widths**. Built by
  Reset Type Studio.
- **The dynamic "M"** — a logo mark that stretches, sprints, jumps and spins,
  translating the algorithm's intelligence into visual rhythm.
- **450+ custom icons** — redrawn as "instruments… visual units of measurement,"
  since food logging is the ritual heart of the product.
- **In-app illustrations** marking milestones (playful scenarios — Mars, orbit,
  alien abduction — rewarding progress with personality).
- **Mission:** *Empower Every Body.* **Vision:** *The whole MF World.*

### Core product surface
A single **iOS/Android mobile app** (dark theme). Primary screens seen in the
provided screenshots:

| Screen | Purpose |
|---|---|
| **Dashboard** | Weekly nutrition bars (Consumed / Remaining), Insights & Analytics (Expenditure, Weight Trend). |
| **Food Log** | Vertical time-of-day timeline; logged food entries with macro breakdown; date strip with daily macro progress. |
| **Add / Log sheet** | Scan · Search · AI · Quick Add · Library; Favorites, "11 AM Picks," Latest. |
| **Strategy** | Goal & program management; big white "CHECK IN" button; Coached Program bars. |
| **Shortcuts** | Quick-access circular buttons (Search, Barcode, AI, Weight) + list (Recipes, Quick Add, Photos, Metrics). |
| **More / Settings** | Profile, General (Account, Subscription, Integrations, Units), Feature Settings. |

---

## Sources

- **Pentagram case study:** https://www.pentagram.com/work/macrofactor
- **User screenshots:** `uploads/WhatsApp Image 2026-06-02 at 11.19.4*.jpeg`
  (Dashboard, Food Log, Add sheet, Strategy, Shortcuts, More)
- No codebase / Figma provided.

---

## CONTENT FUNDAMENTALS

How MacroFactor writes copy:

- **Voice: confident, direct, motivating.** Short imperative labels. The brand
  line is *"knowledge creates clarity, clarity creates progress"* — copy reflects
  that economy. No fluff, no hand-holding.
- **Casing is a deliberate device.** Screen titles are **ALL-CAPS** in the wide
  display face (`DASHBOARD`, `STRATEGY`, `MORE`, `CHECK IN`). Section headers use
  **Title Case** (`Weekly Nutrition`, `Insights & Analytics`, `In Progress`).
  Body/labels are sentence or title case (`Search for a food`, `New Goal`).
- **Eyebrows** above titles are all-caps, tracked-out, secondary-gray
  (`DIENSTAG, 2. JUNI`).
- **Second person, lightly.** Microcopy speaks to the user warmly but sparingly —
  `it's time` under CHECK IN; placeholder `Search for a food`. Not chatty.
- **Data-first language.** Numbers lead. Macros are abbreviated to single letters
  with values: `447 / 2505`, `10P 15F 64C`, `168 P`, `Last 7 Days`. Energy shown
  with a 🔥 flame glyph.
- **No emoji as decoration.** The only pictographs are functional macro/letter
  badges and the flame for energy. Personality lives in illustrations & icons,
  not emoji.
- **Localized.** Screenshots are mixed German/English (`DIENSTAG`, `26. Mai – Now`,
  `Knusper Müsli Schoko By Spar`) — the app fully localizes; date/section labels
  follow device locale while feature names stay English.

**Examples:** `WEEKLY NUTRITION` · `Consumed / Remaining` · `Expenditure — Last 7
Days` · `New Goal · Edit Goal · New Program` · `CHECK IN / it's time` · `Member
Since 6. Januar 2026` · `11 AM Picks` · `Log Foods`.

---

## VISUAL FOUNDATIONS

**Overall vibe.** Serious, instrument-like, athletic. A near-black cockpit where
crisp white type and four saturated macro colors do all the talking. Feels like
precision lab equipment, not a lifestyle app.

- **Color.** Pure-black canvas (`#000`), with dark-gray raised cards
  (`#161618`→`#1E1E20`). Text is white / gray / dim-gray three-step. The
  **signature is the four-macro palette** — Energy **blue**, Protein **coral**,
  Fat **gold**, Carbs **green** — used with total consistency on bars, dots, and
  badges. Secondary data-viz: **purple** (weight trend), **teal** (food-entry
  icon), orange (expenditure). Color is reserved for *data*; chrome stays
  monochrome.
- **Type.** One variable family doing everything via weight + width. Wide/extended
  **black** caps for screen titles; bold normal-width for section heads; regular
  for body. Heavy use of **tabular numerals** so changing numbers don't jitter.
- **Spacing.** Generous, calm. 4pt base; big vertical gaps between sections;
  comfortable card padding (~16–20px). Content breathes against the black.
- **Backgrounds.** Flat solid darks. **No gradients, no textures, no photos** in
  chrome. Depth comes only from subtle surface-lightness steps and the occasional
  drop shadow on sheets/FAB. (Editorial/marketing uses crisp food & motion
  photography — not present in-app chrome.)
- **Corner radii.** Everything is soft-cornered: cards ~22px, buttons/search ~16px,
  sheets ~28px, chips ~10–12px. Circular elements are fully round (FAB, shortcut
  buttons, avatar, date ovals).
- **Cards.** Solid dark fill, *no border*, no visible shadow when inline (depth via
  fill contrast only). Bottom sheets get a top drag-handle and a soft upward
  shadow.
- **Buttons & controls.** Pill-shaped. Selected/primary = **solid white pill with
  black text**; unselected = dark-gray pill with white text (e.g. the
  `Consumed / Remaining` segmented control). The central **FAB is a solid white
  circle with a black `+`**. Secondary action buttons are dark pills with an icon
  + label (`New Goal`, `Edit Goal`).
- **Progress.** Thin rounded macro bars on a faint same-hue track; tall thin
  vertical bars in the weekly chart with a white target tick.
- **Borders / hairlines.** Almost none. List rows separated by ~8% white
  hairlines inside cards. Active date oval gets a colored (blue) outline ring.
- **Shadows.** Minimal. Sheets + FAB only. No inner shadows, no glow.
- **Transparency / blur.** Sheets and the persistent bottom search bar sit on a
  slightly translucent dark; subtle scrim behind modal sheets. Used sparingly.
- **Iconography.** Bold, friendly, mostly **filled** white glyphs (apple, fork &
  knife, flame, rocket, chef hat, camera, ruler). See ICONOGRAPHY below.
- **Motion.** Implied, restrained: the brand "M" stretches/sprints in marketing;
  in-app, expect quick eases, sheet slide-ups, and tab cross-fades. No bounce, no
  decorative looping.
- **Hover/press.** Touch-first. Press = subtle dim / fill darken; selected state =
  swap to solid white. Active tab = white icon+label vs. gray inactive, with a
  small notification dot/badge where relevant.
- **Imagery color.** When present (editorial), food photography is clean, crisp,
  vibrant & celebratory; workout photography emphasizes bodies in motion. Neutral
  to warm, never grainy or washed.

---

## ICONOGRAPHY

MacroFactor ships **450+ custom-drawn icons** — bold, rounded, mostly **filled**
white glyphs, treated as "instruments / visual units of measurement." They are
core to the brand (food logging is the product's ritual heart). Observed icons:
hamburger menu, chevrons, **flame** (energy), **apple** (Food Log tab),
**fork & knife** (food entry — rendered in teal), **barcode**, **sparkles** (AI),
**chat/weight bubble**, **chef hat** (Recipes), **rocket** (Quick Add),
**camera+** (Photos), **tape-measure** (Metrics), **dashboard grid**, **3-dot
cluster** (Strategy/More), **pencil** (edit), **refresh** (Integrations / New
Program), **tag** (Subscription), **ruler** (Units), **face** (Account), **+**.

- **No icon font / SVG sprite available** (proprietary, not provided). For this
  recreation, icons are substituted with **[Lucide](https://lucide.dev)** via CDN
  — a clean, geometric, consistent open set — **FLAGGED as a substitution.** The
  real set is heavier/filled; Lucide is stroke-based, so recreated screens read as
  *approximations* of the custom icons.
- **Emoji:** not used as UI decoration. Only the **🔥 flame** appears as an energy
  marker (and a turkey illustration as a food/favorite thumbnail).
- **Macro badges** act as iconography: single-letter chips `P` `F` `C` and the
  flame for energy, each in its macro color.
- See `assets/` for the recreated MF monogram mark.

---

## Index — what's in this folder

| File / folder | What |
|---|---|
| `README.md` | This document. |
| `colors_and_type.css` | All design tokens — colors, type, radii, spacing, semantic classes. |
| `SKILL.md` | Agent-Skills manifest for downloadable use. |
| `assets/` | Recreated MF monogram / logo marks. |
| `fonts/` | (Type loaded from Google Fonts CDN — Archivo / Archivo Expanded.) |
| `preview/` | Design-system cards (swatches, type specimens, components). |
| `ui_kits/app/` | The mobile-app UI kit — `index.html` interactive demo + JSX components. |

**Font substitution flagged:** MacroSans (custom, proprietary) → **Archivo +
Archivo Expanded** (variable grotesque w/ weight + width axes). If you have the
real MacroSans/​woff2 files, drop them in `fonts/` and update `colors_and_type.css`.
