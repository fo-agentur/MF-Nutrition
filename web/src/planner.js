/* ============================================================
   Tagesplaner — Vorschlags-Engine.

   Kernregel: die KI schlägt höchstens (Kandidaten-Id, Portion)
   vor — ALLE Nährwerte rechnet dieser Code selbst (scaleFood
   über den Kandidaten-Pool). Ohne KI/API liefert der Greedy-
   Solver allein vollständige Pläne.

   Constraints: Σ energy ≤ Rest-Energie (+3 % Toleranz, hart),
   Ziel Σ protein ≥ Rest-Protein, danach Fett/Carb-Distanz
   minimieren.
   ============================================================ */

const ENERGY_TOLERANCE = 1.03;

/* Portion sizes a candidate may be tried at (relative to its
   typical portion). Count units get whole multiples only. */
const MASS_FACTORS = [0.5, 0.75, 1, 1.25, 1.5];
const COUNT_FACTORS = [1, 2];

function isMass(food) { return food.unit === 'g' || food.unit === 'ml'; }
function roundQty(food, qty) {
  if (!isMass(food)) return Math.max(1, Math.round(qty));
  return Math.max(5, Math.round(qty / 5) * 5);
}

function scaleFoodLocal(food, qty) {
  const f = qty / (food.per || 1);
  return {
    energy: Math.round((food.energy || 0) * f),
    protein: Math.round((food.protein || 0) * f),
    fat: Math.round((food.fat || 0) * f),
    carb: Math.round((food.carb || 0) * f),
  };
}

/* ---- Kandidaten-Pool ------------------------------------- */

function recipeToFood(recipe) {
  return {
    id: 'recipe-' + recipe.id,
    name: recipe.name,
    brand: recipe.items ? `Rezept · ${recipe.items} Zutaten` : 'Rezept',
    icon: recipe.icon || 'chef-hat',
    color: recipe.color || '#6E9A94',
    per: 1,
    unit: 'Portion',
    energy: Math.round(recipe.energy || 0),
    protein: Math.round(recipe.protein || 0),
    fat: Math.round(recipe.fat || 0),
    carb: Math.round(recipe.carb || 0),
    fav: false,
    isRecipe: true,
  };
}

/* Häufig geloggte Foods aus state.days — echte Gewohnheiten.
   Gruppiert nach Name+Einheit, nimmt die letzte Portion als
   typische Portion. Quick Adds / Demo-Tageseinträge fliegen raus. */
function loggedHabitFoods(days, { limit = 14 } = {}) {
  const groups = new Map();
  Object.keys(days || {}).sort().forEach(dateKey => {
    (((days || {})[dateKey] || {}).entries || []).forEach(e => {
      if (!e || !e.name) return;
      if (e.unit === 'day') return;                    // Demo-Aggregat
      if (e.foodId === 'quick') return;                // Quick Add ohne Gericht
      if (!(Number(e.energy) > 0)) return;
      const key = `${String(e.name).toLowerCase()}|${e.unit || ''}`;
      const g = groups.get(key) || { count: 0, e: null, lastDate: '' };
      g.count += 1;
      if (dateKey >= g.lastDate) { g.e = e; g.lastDate = dateKey; }
      groups.set(key, g);
    });
  });
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate))
    .slice(0, limit)
    .map(({ e, count }) => ({
      id: 'habit-' + (e.foodId || e.id || e.name),
      name: e.name,
      brand: count > 1 ? `${count}× geloggt` : 'Zuletzt geloggt',
      icon: e.icon || 'utensils',
      color: e.color || '#6E9A94',
      per: Number(e.qty) > 0 ? Number(e.qty) : 1,
      unit: e.unit || 'serving',
      energy: Math.round(e.energy || 0),
      protein: Math.round(e.protein || 0),
      fat: Math.round(e.fat || 0),
      carb: Math.round(e.carb || 0),
      fav: false,
      habitCount: count,
    }));
}

/* Pool: Rezepte > Gewohnheiten > Custom Foods > FOOD_DB (Favoriten zuerst).
   Dedupe über den Namen; erste Quelle gewinnt.
   source-Filter: 'any' (alles), 'market' (nur Supermarkt-Fertigkram mit
   Preisen — nichts zu kochen), 'cook' (nur Rezepte). */
function plannerCandidates(state, { foodDb = [], customFoods = [], marketDb = [], source = 'any' } = {}) {
  const out = [];
  const seen = new Set();
  const push = (food, src) => {
    if (!food || !food.name || !(food.energy > 0)) return;
    const key = String(food.name).toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...food, source: src });
  };
  if (source === 'market') {
    (marketDb || []).forEach(f => push(f, 'market'));
    return out;
  }
  if (source === 'cook') {
    (state.recipes || []).forEach(r => push(recipeToFood(r), 'recipe'));
    return out;
  }
  (state.recipes || []).forEach(r => push(recipeToFood(r), 'recipe'));
  loggedHabitFoods(state.days).forEach(f => push(f, 'habit'));
  (customFoods || []).forEach(f => push(f, 'custom'));
  [...foodDb].sort((a, b) => (b.fav === true) - (a.fav === true)).forEach(f => push(f, 'db'));
  return out;
}

/* ---- Rest-Ziel -------------------------------------------- */

/* mode 'rest' (Default): Tagesziel − bereits gegessen.
   mode 'day': kompletter Tag (volle Tagesziele). */
function remainingTargets(dayTargets, totals, mode = 'rest') {
  if (mode === 'day') return { ...dayTargets };
  return {
    energy: dayTargets.energy - totals.energy,
    protein: dayTargets.protein - totals.protein,
    fat: dayTargets.fat - totals.fat,
    carb: dayTargets.carb - totals.carb,
  };
}

/* „Jetzt"-Modus: wie groß darf die NÄCHSTE Mahlzeit sein?
   ANNAHME: grobe Mahlzeiten-Slots nach Uhrzeit — vor 10 Uhr sind noch
   4 Essenszeiten übrig, bis 14 Uhr 3, bis 17 Uhr 2, danach 1. Der
   Anteil wird auf den tatsächlichen Rest gedeckelt: nie mehr planen,
   als heute noch offen ist. */
function mealsLeftFor(hour) {
  if (hour < 10) return 4;
  if (hour < 14) return 3;
  if (hour < 17) return 2;
  return 1;
}
function nowTargets(rest, hour = new Date().getHours()) {
  const share = 1 / Math.max(1, mealsLeftFor(hour));
  const part = k => Math.round(Math.max(0, rest[k]) * share);
  const t = { energy: part('energy'), protein: part('protein'), fat: part('fat'), carb: part('carb') };
  // Untergrenze, damit früh am Tag eine echte Mahlzeit rauskommt —
  // aber nie über den Rest hinaus.
  t.energy = Math.min(Math.max(0, rest.energy), Math.max(t.energy, 250));
  t.protein = Math.min(Math.max(0, rest.protein), Math.max(t.protein, 20));
  return t;
}

/* ---- Bewertung -------------------------------------------- */

/* Preis einer Portion: price gilt pro Packung (Count-Units) bzw. pro
   `per`-Menge (Mass-Units). Nur Code rechnet Preise — Kandidaten ohne
   price-Feld kosten 0 und tauchen in keiner Summe auf. */
function priceOf(food, qty) {
  if (!food || !(food.price > 0)) return 0;
  const units = isMass(food) ? qty / (food.per || 1) : qty;
  return food.price * units;
}

function planTotals(items) {
  const t = items.reduce((acc, it) => ({
    energy: acc.energy + it.macros.energy,
    protein: acc.protein + it.macros.protein,
    fat: acc.fat + it.macros.fat,
    carb: acc.carb + it.macros.carb,
    price: acc.price + priceOf(it.food, it.qty),
  }), { energy: 0, protein: 0, fat: 0, carb: 0, price: 0 });
  t.price = Math.round(t.price * 100) / 100;
  return t;
}

function energyCap(rest) { return Math.round(Math.max(0, rest.energy) * ENERGY_TOLERANCE); }

/* Kleiner = besser. Harte kcal-Grenze wird VOR dem Score geprüft
   (fitsBudget) — der Score bestraft nur weiche Ziele:
   Protein-Lücke dominiert, dann ungefüllte Energie, dann F/C-Distanz.
   proteinWeight ist justierbar, damit bestPlan() mehrere Strategien
   fahren kann (Standard-Gewichtung bewertet den Endvergleich). */
function scorePlan(totals, rest, proteinWeight = 14) {
  const proteinGap = Math.max(0, rest.protein - totals.protein);
  const energyGap = Math.max(0, rest.energy - totals.energy);
  const fatDist = Math.abs(totals.fat - Math.max(0, rest.fat));
  const carbDist = Math.abs(totals.carb - Math.max(0, rest.carb));
  return proteinGap * proteinWeight + energyGap * 1 + fatDist * 2.5 + carbDist * 1.2;
}

function fitsBudget(totals, rest) { return totals.energy <= energyCap(rest); }

/* ---- Greedy-Solver ---------------------------------------- */

function portionOptions(food) {
  const base = food.per || 1;
  const factors = isMass(food) ? MASS_FACTORS : COUNT_FACTORS;
  const qtys = new Set(factors.map(f => roundQty(food, base * f)));
  return [...qtys];
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Greedy-Knapsack: füge wiederholt die (Food, Portion)-Kombi hinzu,
   die den Score am stärksten senkt, ohne die kcal-Grenze zu reißen.
   `seed` randomisiert Tie-Breaks für „Neu würfeln";
   `exclude` (Set von Namen, lowercase) sperrt zuletzt gezeigte Items. */
function buildPlan(candidates, rest, { maxItems = 4, seed = 1, exclude, proteinWeight = 14, budget = 0 } = {}) {
  const rng = mulberry32(Math.floor(seed) || 1);
  const banned = exclude instanceof Set ? exclude : new Set(exclude || []);
  const pool = candidates.filter(c => c.energy > 0 && !banned.has(String(c.name).toLowerCase()));
  const items = [];

  if (rest.energy <= 60) return { items, totals: planTotals(items) };

  while (items.length < maxItems) {
    const current = planTotals(items);
    const currentScore = scorePlan(current, rest, proteinWeight);
    let best = null;
    for (const cand of pool) {
      if (items.some(it => it.food.id === cand.id)) continue;
      for (const qty of portionOptions(cand)) {
        const macros = scaleFoodLocal(cand, qty);
        if (macros.energy <= 0) continue;
        const totals = {
          energy: current.energy + macros.energy,
          protein: current.protein + macros.protein,
          fat: current.fat + macros.fat,
          carb: current.carb + macros.carb,
        };
        if (!fitsBudget(totals, rest)) continue;
        // Budget ist eine HARTE Grenze (nur relevant, wenn Kandidaten Preise haben)
        if (budget > 0 && current.price + priceOf(cand, qty) > budget + 1e-9) continue;
        const score = scorePlan(totals, rest, proteinWeight) + rng() * 1e-4; // seeded tie-break
        if (score < currentScore - 1 && (!best || score < best.score)) {
          best = { food: cand, qty, macros, score };
        }
      }
    }
    if (!best) break;
    items.push({ food: best.food, qty: best.qty, macros: best.macros });
  }

  adjustPortions(items, rest);
  return { items, totals: planTotals(items) };
}

/* Protein-Dichte-Strategie: erst die protein-dichtesten Kandidaten
   (g Protein pro kcal) einsammeln, bis das Protein-Ziel steht, dann das
   restliche kcal-Budget mit dem Standard-Greedy auffüllen. Findet die
   Kombis, die der Score-Greedy verpasst, wenn ein kalorienreicher
   Groß-Pick das Budget frisst. */
function densityPlan(candidates, rest, { maxItems = 4, exclude, budget = 0 } = {}) {
  const banned = exclude instanceof Set ? exclude : new Set(exclude || []);
  const pool = candidates.filter(c => c.energy > 0 && !banned.has(String(c.name).toLowerCase()));
  const dense = [...pool]
    .filter(c => c.protein > 0)
    .sort((a, b) => b.protein / Math.max(1, b.energy) - a.protein / Math.max(1, a.energy));
  const items = [];

  if (rest.energy <= 60) return { items, totals: planTotals(items) };

  for (const cand of dense) {
    if (items.length >= maxItems) break;
    const current = planTotals(items);
    if (current.protein >= rest.protein) break;
    for (const qty of portionOptions(cand).sort((a, b) => b - a)) {
      const macros = scaleFoodLocal(cand, qty);
      const totals = {
        energy: current.energy + macros.energy,
        protein: current.protein + macros.protein,
        fat: current.fat + macros.fat,
        carb: current.carb + macros.carb,
      };
      if (!fitsBudget(totals, rest)) continue;
      if (budget > 0 && current.price + priceOf(cand, qty) > budget + 1e-9) continue;
      items.push({ food: cand, qty, macros });
      break;
    }
  }

  // Restbudget mit dem Standard-Greedy auffüllen (F/C-Distanz, Energie).
  const used = new Set(items.map(it => String(it.food.name).toLowerCase()));
  const sub = planTotals(items);
  const restLeft = {
    energy: rest.energy - sub.energy,
    protein: Math.max(0, rest.protein - sub.protein),
    fat: Math.max(0, rest.fat - sub.fat),
    carb: Math.max(0, rest.carb - sub.carb),
  };
  if (items.length < maxItems && restLeft.energy > 60) {
    const spent = planTotals(items).price;
    const filler = buildPlan(pool, restLeft, {
      maxItems: maxItems - items.length,
      exclude: new Set([...banned, ...used]),
      budget: budget > 0 ? Math.max(0, budget - spent) : 0,
    });
    items.push(...filler.items);
  }

  adjustPortions(items, rest);
  return { items, totals: planTotals(items) };
}

/* Greedy ist anfällig dafür, dass ein früher Groß-Pick das Budget frisst
   und die Protein-Lücke offen bleibt. Deshalb mehrere Strategien fahren
   (Standard, protein-first, mehr/kleinere Items, Protein-Dichte) und den
   Plan behalten, der nach der STANDARD-Gewichtung am besten abschneidet. */
function bestPlan(candidates, rest, { maxItems = 4, seed = 1, exclude, budget = 0 } = {}) {
  const plans = [
    buildPlan(candidates, rest, { maxItems, seed, exclude, proteinWeight: 14, budget }),
    buildPlan(candidates, rest, { maxItems, seed: seed + 1, exclude, proteinWeight: 45, budget }),
    buildPlan(candidates, rest, { maxItems: maxItems + 1, seed: seed + 2, exclude, proteinWeight: 26, budget }),
    densityPlan(candidates, rest, { maxItems, exclude, budget }),
  ];
  let best = null;
  for (const plan of plans) {
    if (!plan.items.length) continue;
    const score = scorePlan(plan.totals, rest);
    if (!best || score < best.score - 1e-9
      || (Math.abs(score - best.score) <= 1e-9 && plan.items.length < best.plan.items.length)) {
      best = { plan, score };
    }
  }
  return best ? best.plan : { items: [], totals: planTotals([]) };
}

/* Feinschliff nach Auswahl (auch für KI-Pläne): Mass-Portionen in
   5-g-Schritten nachziehen, bis Protein sitzt bzw. die kcal-Grenze
   eingehalten ist. Mutiert die Items (qty + macros). */
function adjustPortions(items, rest) {
  const cap = energyCap(rest);
  const recompute = it => { it.macros = scaleFoodLocal(it.food, it.qty); };

  // 1) Über der harten Grenze? Größtes Mass-Item schrittweise verkleinern.
  let guard = 400;
  while (planTotals(items).energy > cap && guard-- > 0) {
    const shrinkable = items
      .filter(it => isMass(it.food) ? it.qty > 30 : it.qty > 1)
      .sort((a, b) => b.macros.energy - a.macros.energy)[0];
    if (!shrinkable) break;
    shrinkable.qty = isMass(shrinkable.food)
      ? Math.max(30, shrinkable.qty - 25)
      : shrinkable.qty - 1;
    recompute(shrinkable);
  }

  // 2) Protein-Lücke mit dem protein-dichtesten Mass-Item schließen,
  //    solange Budget übrig ist (max +60 % über der gewählten Portion).
  guard = 400;
  while (guard-- > 0) {
    const totals = planTotals(items);
    if (totals.protein >= rest.protein) break;
    const grower = items
      .filter(it => isMass(it.food) && it.food.protein > 0)
      .filter(it => it.qty < (it.baseQty || it.qty) * 1.6 + 60)
      .sort((a, b) =>
        (b.food.protein / Math.max(1, b.food.energy)) - (a.food.protein / Math.max(1, a.food.energy)))[0];
    if (!grower) break;
    const nextQty = grower.qty + 5;
    const nextMacros = scaleFoodLocal(grower.food, nextQty);
    const delta = nextMacros.energy - grower.macros.energy;
    if (totals.energy + delta > cap) break;
    grower.baseQty = grower.baseQty || grower.qty;
    grower.qty = nextQty;
    recompute(grower);
  }
}

/* ---- KI-Vorschlag (nur Auswahl, nie Nährwerte) ------------- */

/* Kompakte Kandidatenliste für den Prompt. */
function candidatePromptLines(candidates, max = 36) {
  return candidates.slice(0, max).map(c => {
    const portion = isMass(c) ? `${c.per} ${c.unit}` : `1 ${c.unit}`;
    return `${c.id} | ${c.name} | Portion ${portion} | ${c.energy} kcal P${c.protein} F${c.fat} C${c.carb}`;
  });
}

/* Fragt die KI nach (id, qty)-Paaren aus dem Pool; der Rückweg läuft
   IMMER durch Code: id→Kandidat, qty geklemmt, Makros via scaleFood,
   kcal/Protein via adjustPortions justiert. Wirft bei Nichterreichbarkeit —
   der Aufrufer fällt auf buildPlan zurück. */
async function aiProposePlan(candidates, rest, { mode = 'rest', avoid = [], analyze } = {}) {
  const api = analyze || (typeof window !== 'undefined' && window.analyzeFoodViaApi);
  if (!api) throw new Error('AI nicht verfügbar');
  const payload = {
    goal: {
      kcal_max: energyCap(rest),
      protein_min: Math.max(0, rest.protein),
      fat_target: Math.max(0, rest.fat),
      carb_target: Math.max(0, rest.carb),
    },
    mode: mode === 'day' ? 'plan whole day (3-4 meals)'
      : mode === 'now' ? 'single next meal right now (1-2 items)'
        : 'fill rest of day (1-3 meals)',
    avoid,
    candidates: candidatePromptLines(candidates),
  };
  const data = await api({ task: 'plan', text: JSON.stringify(payload) });
  const meals = (data && data.plan && Array.isArray(data.plan.meals)) ? data.plan.meals : [];
  const byId = new Map(candidates.map(c => [String(c.id), c]));
  const items = [];
  for (const m of meals) {
    const food = byId.get(String(m && m.id));
    if (!food || items.some(it => it.food.id === food.id)) continue;
    let qty = Number(m.qty);
    if (!Number.isFinite(qty) || qty <= 0) qty = food.per || 1;
    qty = isMass(food)
      ? Math.min(800, Math.max(20, roundQty(food, qty)))
      : Math.min(4, Math.max(1, Math.round(qty)));
    items.push({ food, qty, macros: scaleFoodLocal(food, qty) });
    if (items.length >= 4) break;
  }
  if (!items.length) throw new Error('AI-Plan leer');

  // Code bewertet & justiert den KI-Vorschlag gegen das Rest-Ziel.
  while (planTotals(items).energy > energyCap(rest) && items.length > 1) {
    items.sort((a, b) => a.macros.protein / Math.max(1, a.macros.energy) - b.macros.protein / Math.max(1, b.macros.energy));
    items.shift();
  }
  adjustPortions(items, rest);
  const totals = planTotals(items);
  if (!fitsBudget(totals, rest)) throw new Error('AI-Plan über Budget');
  return { items, totals };
}

/* ---- Uhrzeiten fürs Loggen -------------------------------- */
function planHours(count, mode, nowHour) {
  const now = Number.isFinite(nowHour) ? nowHour : new Date().getHours();
  if (mode === 'now') {
    // Eine Mahlzeit für jetzt — alles auf die aktuelle Stunde.
    const h = Math.min(22, Math.max(6, now));
    return Array.from({ length: count }, () => h);
  }
  if (mode === 'day') {
    const slots = [8, 12, 16, 19];
    return Array.from({ length: count }, (_, i) => slots[Math.min(i, slots.length - 1)]);
  }
  const start = Math.min(21, Math.max(7, now));
  return Array.from({ length: count }, (_, i) => Math.min(22, start + i * 2));
}

/* ---- Ampel für die Summenzeile ----------------------------- */
function planChecks(totals, rest) {
  return {
    energy: totals.energy <= energyCap(rest),
    protein: totals.protein >= Math.max(0, rest.protein) * 0.97,
    fat: Math.abs(totals.fat - Math.max(0, rest.fat)) <= Math.max(10, Math.max(0, rest.fat) * 0.2),
    carb: Math.abs(totals.carb - Math.max(0, rest.carb)) <= Math.max(15, Math.max(0, rest.carb) * 0.2),
  };
}

const planner = {
  recipeToFood, loggedHabitFoods, plannerCandidates, remainingTargets, nowTargets, mealsLeftFor,
  planTotals, priceOf, scorePlan, fitsBudget, energyCap, buildPlan, bestPlan, adjustPortions,
  aiProposePlan, planHours, planChecks,
};

if (typeof window !== 'undefined') Object.assign(window, { planner });

export {
  recipeToFood, loggedHabitFoods, plannerCandidates, remainingTargets, nowTargets, mealsLeftFor,
  planTotals, priceOf, scorePlan, fitsBudget, energyCap, buildPlan, bestPlan, adjustPortions,
  aiProposePlan, planHours, planChecks,
};
