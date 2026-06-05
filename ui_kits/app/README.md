# MacroFactor — App UI Kit

A high-fidelity, interactive recreation of the MacroFactor mobile app (dark theme).
Cosmetic prototype — not production code. Icons substituted with **Lucide**.

## Run
Open `index.html`. The phone frame boots on **Food Log**. Use the bottom nav to
move between **Dashboard · Food Log · Strategy · More**, tap the white **＋ FAB**
to open the **Shortcuts** sheet, or tap the persistent **search bar** to open the
**Add / Log** sheet.

## Screens
- **Dashboard** — weekly nutrition bar chart (4 macros × 7 days), Consumed/Remaining
  toggle, Insights & Analytics (Expenditure + Weight Trend mini-charts).
- **Food Log** — Today nav, weekly date strip, daily macro progress, time-of-day
  timeline with a logged food entry.
- **Strategy** — goal/program pills, big white **CHECK IN** button, Coached Program.
- **More** — profile, General + Feature Settings list groups.
- **Add sheet** — Scan/Search/AI/Quick Add/Library tabs; Favorites, Picks, Latest.
- **Shortcuts sheet** — Search/Barcode/AI/Weight + Recipes/Quick Add/Photos/Metrics.

## Files
| File | Contents |
|---|---|
| `index.html` | Entry — loads React, Babel, Lucide, all scripts. |
| `components.jsx` | Primitives: `Icon`, `StatusBar`, `BottomNav`, `SearchBar`, `Segmented`, `MacroStat`, `SectionHead`, `ScreenTitle`; `MF` colors + `MACROS` data. |
| `screens-main.jsx` | `DashboardScreen`, `FoodLogScreen` (+ charts, date strip, food entry). |
| `screens-more.jsx` | `StrategyScreen`, `MoreScreen`, `ShortcutsSheet`, `AddSheet`, `Sheet`. |
| `app.jsx` | `App` shell — phone frame, tab state, sheet state. |
| `kit.css` | All kit styles (tokens come from `../../colors_and_type.css`). |

## Notes / fidelity caveats
- **Icons are Lucide** (stroke-based) standing in for MacroFactor's 450+ custom,
  mostly-filled glyphs — read as approximations.
- **Type is Archivo / Archivo Expanded** substituting custom **MacroSans**.
- Charts are illustrative SVG/CSS, not live data.
- Built from screenshots + the Pentagram case study (no codebase/Figma provided),
  so component internals are cosmetic, not the real implementation.
