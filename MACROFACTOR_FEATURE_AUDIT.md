# MacroFactor Feature Audit

Date: 2026-06-03

## Sources

- MacroFactor feature breakdown: https://macrofactor.com/macrofactor/
- Food logging workflows: https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor
- AI food logging: https://help.macrofactorapp.com/en/articles/258-ai-food-logging
- Weight trend: https://help.macrofactorapp.com/dashboard/weight_trend
- Expenditure: https://help.macrofactorapp.com/en/articles/20-expenditure
- Weight logging frequency: https://help.macrofactorapp.com/en/articles/109-how-frequently-do-i-need-to-log-my-weight-for-the-expenditure-algorithm-and-weekly-coaching-updates
- Nutrition logging frequency: https://help.macrofactorapp.com/en/articles/110-how-frequently-do-i-need-to-log-my-nutrition-for-the-expenditure-algorithm-and-weekly-coaching-updates
- Check-ins and coaching modules: https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules
- OpenRouter image inputs: https://openrouter.ai/docs/guides/overview/multimodal/image-understanding

## Current Coverage

Implemented or partially implemented:

- Dashboard tabs: Dashboard, Food Log, Strategy, More.
- Weekly Nutrition, Energy Balance, Daily Nutrition dashboard slides.
- Food log timeline with date strip, hourly add buttons, edit/delete entries.
- Food log copy/paste for individual foods, hourly meal blocks, and full days.
- Smart History in the add sheet with time-of-day suggestions, frequent foods, and latest logged foods.
- Food search via OpenFoodFacts/Supabase Edge fallback.
- Barcode scanning via camera and barcode lookup.
- Nutrition label scanner with OpenRouter image analysis, manual label-text parsing fallback, local custom-food save, and normal food-detail logging.
- Quick Add for calories and macros.
- Custom food creation with serving size, unit, calories, macros, local reuse, and best-effort Supabase catalog save.
- Recipes list, basic recipe creation, and URL/text recipe importer with JSON-LD extraction, OpenRouter parsing, and local text fallback.
- AI food logging sheet with OpenRouter key/model, text input, photo upload, and local fallback.
- Speech-to-text meal description in the AI food logging sheet via browser SpeechRecognition.
- Weight entry sheet with explicit log date.
- Scale Weight, Weight Trend, Weigh-In, Food Logging, Expenditure, Steps, Visual Body Fat detail screens.
- Check-in readiness modules for nutrition logging, weigh-in, and expenditure.
- Basic trend weight interpolation and expenditure-derived target recommendation.
- Strategy program controls for coached/collaborative/manual modes, balanced/low-carb/keto/carb-focused macros, same-day/weekend/fasting calorie patterns, and goal ETA.
- More/settings pages for account, subscription, integrations, units.
- Weight unit preferences persist locally and convert Weight Sheet input plus Dashboard/Strategy/Check-In/Weight displays between kg and lb.
- Dashboard customization for primary focus.

Major gaps still open:

- Pixel-perfect Dashboard/Food Log/Strategy/More matching still needs screenshot-by-screenshot refinement.
- Smart History is local/history-based; MacroFactor's full proprietary ranking is approximated, not cloned.
- Program modes/styles are implemented in Strategy with a 7-day plan; global per-day target propagation across every chart/logging view is still simplified.
- Goal ETA is implemented; richer goal insight cards are still simplified.
- Check-in modules are simplified and need more MacroFactor-like module types.
- Expenditure algorithm is a simplified approximation, not a full clone.
- Integrations are placeholders only.
- Unit preferences now cover body weight input and key weight displays; food serving-unit conversion remains simplified.

## Review 2026-06-09 (sizing, iOS, AI, Strategy)

Fixed this session:
- iOS PWA: removed the fragile `screen.height` viewport hack and contradictory
  height vars; shell now fills the real viewport via `position:fixed/inset:0` only,
  so no body-coloured strip/gap appears below the bottom nav (needs on-device confirm).
- Dashboard compacted (title 40→33px, weekly chart heights/fonts/spacing reduced) to
  match the reference density; the selected-day outline no longer overshoots into a
  long hanging loop below the day label.
- AI logging reliability: `/api/analyze-food` now sends an ordered free vision-model
  fallback list (gemma-4-31b / gemma-4-26b / nemotron-nano-vl / openrouter free
  router) and drops `response_format:json_object` (several free models reject it — the
  real cause of "photo sometimes does nothing").
- Food detail quantity is now an editable field with a sensible step (5/10/25 g·ml
  instead of one whole serving), so AI gram estimates can be fine-tuned.
- Strategy program chart redrawn as calorie-proportional stacked bars + macro legend.

Still the biggest functional gaps vs real MacroFactor (ranked):
1. **Dynamic Expenditure (TDEE)** — MF's core algorithm derives adaptive expenditure
   from the weight-trend + intake history. Ours is still hardcoded sample data
   (`ENERGY_30D`/`EXPEND_30D` in screens-dashboard.jsx). Compute from `weight_logs` +
   `food_logs`.
2. **Adaptive weekly check-in** — the modules/UI exist, but target recommendations are
   simplified, not derived from measured progress vs goal rate.
3. **Trend-weight smoothing** — MF shows an exponentially-weighted trend line distinct
   from scale weight; ours interpolates simply.
4. **Per-day target propagation** — weekday/weekend/fasting calorie patterns live in
   Strategy but don't flow into the dashboard/food-log targets for the selected day.
5. **Env/secret gap (NOT code):** Vercel project `mf-nutrition-7pwf` has no
   `OPENROUTER_API_KEY` set, so server-side AI can't run regardless of model choice.
6. Micros (fiber/sugar/sat-fat) and richer goal insight cards remain out of scope.
