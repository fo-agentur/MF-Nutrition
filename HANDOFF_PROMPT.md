# MacroFactor – Developer Handoff Prompt

You are a senior React Native / Expo developer. You are given a design system and interactive HTML prototype for the **MacroFactor** nutrition tracking app (brand identity by Pentagram). Your job is to turn this into a fully functional production app.

---

## What you have

The zip contains:

| Path | What |
|---|---|
| `README.md` | Full brand context, content fundamentals, visual foundations, iconography |
| `colors_and_type.css` | All design tokens — colors, type scale, spacing, radii (use these as the source of truth) |
| `SKILL.md` | Agent skill manifest |
| `ui_kits/app/` | Full interactive HTML prototype (open `index.html` in a browser to explore the app) |
| `ui_kits/app/store.jsx` | App state model (Context + Reducer + data structures) — port this logic directly |
| `ui_kits/app/screens-*.jsx` | All screens as React components — visual source of truth |
| `ui_kits/app/kit.css` | All component styles — map these to StyleSheet / NativeWind |
| `preview/` | Design-system token cards (colors, type, spacing, components) |

---

## Design tokens to port (from `colors_and_type.css`)

```
Background:   #181818
Surface-1:    #1E1E20   Surface-2: #252528   Surface-3: #2C2C30
Macro colors: Energy #4A78F0 · Protein #EF6A45 · Fat #F2BE3F · Carbs #57B36E
Accent white / Purple #9B7FE8 / Teal #2BA89F
Radii: sm 10 · md 16 · lg 22 · xl 28 · pill 999
Font: Archivo Expanded (display/titles, weight 800, uppercase) + Archivo (body)
      → substitute with MacroSans when available
```

---

## Screens to build (all shown in the prototype)

1. **Onboarding** — name, goal (lose/maintain/gain), stats (weight, height, activity) → calculated macro targets
2. **Dashboard** — 3 swipeable slides: Energy Balance (30-day bar chart + expenditure line + equation), Daily Nutrition (ring gauge + macro bars), Weekly Nutrition (7-col × 4-bar chart). Scrollable sections: Insights & Analytics, Habits (dot grids), Body Metrics, Nutrition (4 cards), General (Steps), More
3. **Food Log** — date strip, macro strip, timeline with dark pill time-labels, macro-badge row per hour, food entry cards
4. **Add Food (sheet)** — Scan / Search / AI / Quick Add / Library tabs; Favorites, Picks, Latest; food detail with macro donut + quantity stepper + time picker → log action updates live totals
5. **Strategy** — small nav title, CHECK IN circle, Coached Program 4×7 macro grid, Weight Goal card (stats + action pills), Goal History
6. **More / Settings** — profile, General (Account/Subscription/Integrations/Units), Feature Settings, Tools (Recipes, Metrics)
7. **Subpages** — Insights charts, Metrics/Weight entry (numpad), Recipes (list + create), Account, Subscription, Integrations, Units

---

## State model (port from `store.jsx`)

- `targets` — `{ energy, protein, fat, carb }` daily goals
- `days` — map of date → `{ entries: FoodEntry[] }`
- `weights` — `{ date, value }[]`
- `recipes` — `Recipe[]`
- Actions: `LOG_FOOD`, `DELETE_ENTRY`, `ADD_WEIGHT`, `SET_TARGETS`, `ADD_RECIPE`, `SET_DATE`
- Persist to AsyncStorage; reset via settings

`scaleFood(food, qty)` — scales macro values to arbitrary quantity.

---

## Key interactions (all working in prototype — use as spec)

- Tapping a food opens **Food Detail sheet** (macro donut, quantity stepper, time picker) → "Log Food" button dispatches `LOG_FOOD` and updates all screens live
- Dashboard slides are swipeable (tapping dots also works)
- Bottom nav: Dashboard · Food Log · FAB (opens Shortcuts sheet) · Strategy · More
- All sheets are bottom drawers with drag handle + scrim dismiss
- Toast appears after every log action ("Reis gekocht geloggt")
- Check-In adjusts targets and shows confirmation

---

## Tech stack suggestion

- **React Native + Expo** (SDK 51+)
- **NativeWind** (Tailwind for RN) or plain StyleSheet
- **React Navigation** (stack + tab navigator)
- **Zustand** or React Context (port the existing reducer)
- **AsyncStorage** for persistence
- **Reanimated 2** for sheet/swipe animations
- **react-native-svg** for charts

---

## Instructions

1. Read `README.md` first for brand context.
2. Open `ui_kits/app/index.html` in a browser — this is the full interactive spec.
3. Port `store.jsx` state logic first (data model + actions).
4. Build screens bottom-up: primitives → components → screens.
5. Match the prototype visually — use the exact token values above.
6. For icons: the prototype uses Lucide as a placeholder. The real app has 450+ custom filled icons. Use `@lucide/react-native` as a drop-in until real assets are available.
7. For fonts: load Archivo / Archivo Expanded from Google Fonts or Expo Google Fonts. Swap for MacroSans when files are available.
8. Charts (bar, ring, line) — build with `react-native-svg` matching the SVG in the prototype.

**Flag any assumption you make. When in doubt, match the prototype exactly.**
