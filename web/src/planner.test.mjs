import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recipeToFood, loggedHabitFoods, plannerCandidates, remainingTargets,
  planTotals, energyCap, fitsBudget, buildPlan, bestPlan, adjustPortions,
  aiProposePlan, planHours, planChecks, scorePlan, nowTargets, mealsLeftFor, priceOf,
} from './planner.js';

const DB = [
  { id: 'chicken', name: 'Hähnchenbrust gegrillt', per: 100, unit: 'g', energy: 165, protein: 31, fat: 4, carb: 0, fav: false },
  { id: 'rice', name: 'Reis gekocht', per: 100, unit: 'g', energy: 130, protein: 3, fat: 0, carb: 28, fav: false },
  { id: 'yogurt', name: 'Skyr Natur', per: 100, unit: 'g', energy: 63, protein: 11, fat: 0, carb: 4, fav: false },
  { id: 'banana', name: 'Banane', per: 1, unit: 'Stück', energy: 105, protein: 1, fat: 0, carb: 27, fav: true },
  { id: 'almond', name: 'Mandeln', per: 30, unit: 'g', energy: 173, protein: 6, fat: 15, carb: 6, fav: false },
  { id: 'oats', name: 'Haferflocken', per: 100, unit: 'g', energy: 372, protein: 13, fat: 7, carb: 60, fav: false },
];

const REST = { energy: 1200, protein: 90, fat: 35, carb: 120 };

test('recipeToFood maps totals to a 1-Portion food', () => {
  const f = recipeToFood({ id: 'r1', name: 'Bowl', items: 4, energy: 560, protein: 48, fat: 12, carb: 62 });
  assert.equal(f.per, 1);
  assert.equal(f.unit, 'Portion');
  assert.equal(f.energy, 560);
  assert.ok(f.id.startsWith('recipe-'));
});

test('loggedHabitFoods groups by name, prefers frequent, skips quick/day entries', () => {
  const days = {
    '2026-07-01': { entries: [
      { id: '1', foodId: 'x', name: 'Wrap', unit: 'g', qty: 200, energy: 500, protein: 30, fat: 15, carb: 50, time: '12:00' },
      { id: '2', foodId: 'quick', name: 'Quick Add', unit: 'serving', qty: 1, energy: 300, protein: 10, fat: 5, carb: 40, time: '13:00' },
    ] },
    '2026-07-02': { entries: [
      { id: '3', foodId: 'x', name: 'Wrap', unit: 'g', qty: 250, energy: 625, protein: 38, fat: 19, carb: 63, time: '12:00' },
      { id: '4', foodId: 'demo', name: 'Nutrition Day', unit: 'day', qty: 1, energy: 2800, protein: 150, fat: 90, carb: 300, time: '14:00' },
    ] },
  };
  const habits = loggedHabitFoods(days);
  assert.equal(habits.length, 1);
  assert.equal(habits[0].name, 'Wrap');
  assert.equal(habits[0].habitCount, 2);
  assert.equal(habits[0].per, 250); // letzte Portion als typische Portion
  assert.equal(habits[0].energy, 625);
});

test('plannerCandidates dedupes by name, recipes first', () => {
  const state = {
    recipes: [{ id: 'r1', name: 'Hähnchen Reis Bowl', items: 5, energy: 560, protein: 48, fat: 12, carb: 62 }],
    days: {},
  };
  const cands = plannerCandidates(state, { foodDb: DB, customFoods: [{ id: 'c1', name: 'Banane', per: 1, unit: 'Stück', energy: 100, protein: 1, fat: 0, carb: 25 }] });
  assert.equal(cands[0].source, 'recipe');
  const bananas = cands.filter(c => c.name.toLowerCase() === 'banane');
  assert.equal(bananas.length, 1);
  assert.equal(bananas[0].source, 'custom'); // custom kommt vor FOOD_DB
});

test('remainingTargets: rest subtracts, day mode returns full targets', () => {
  const targets = { energy: 2200, protein: 169, fat: 84, carb: 281 };
  const totals = { energy: 800, protein: 40, fat: 30, carb: 90 };
  assert.deepEqual(remainingTargets(targets, totals, 'rest'), { energy: 1400, protein: 129, fat: 54, carb: 191 });
  assert.deepEqual(remainingTargets(targets, totals, 'day'), targets);
});

test('buildPlan respects the hard energy cap (+3%)', () => {
  const { items, totals } = buildPlan(DB, REST, { seed: 7 });
  assert.ok(items.length >= 2, 'plan should contain meals');
  assert.ok(totals.energy <= energyCap(REST), `energy ${totals.energy} <= cap ${energyCap(REST)}`);
  assert.ok(fitsBudget(totals, REST));
});

test('buildPlan reaches the protein goal when the pool allows it', () => {
  const { totals } = buildPlan(DB, REST, { seed: 3 });
  assert.ok(totals.protein >= REST.protein * 0.97, `protein ${totals.protein} ~>= ${REST.protein}`);
});

test('buildPlan computes item macros itself via scaling', () => {
  const { items } = buildPlan(DB, REST, { seed: 1 });
  for (const it of items) {
    const expected = Math.round(it.food.energy * (it.qty / it.food.per));
    assert.equal(it.macros.energy, expected, `${it.food.name} macro must equal scaled value`);
  }
});

test('bestPlan closes the protein gap that a single greedy run leaves open', () => {
  // Ein kalorienreiches, protein-armes Rezept lockt den ersten Greedy-Pick an;
  // bestPlan muss die protein-dichtere Kombination finden.
  const pool = [
    { id: 'bowl', name: 'Hähnchen Reis Bowl', per: 1, unit: 'Portion', energy: 560, protein: 48, fat: 12, carb: 62 },
    ...DB,
    { id: 'pro35', name: 'Pro 35 Erdbeere', per: 1, unit: 'Flasche', energy: 217, protein: 35, fat: 2, carb: 19 },
    { id: 'eggs', name: 'Eier', per: 1, unit: 'Stück', energy: 78, protein: 6, fat: 5, carb: 1 },
  ];
  const rest = { energy: 1225, protein: 151, fat: 50, carb: 130 };
  const single = buildPlan(pool, rest, { seed: 1 });
  const multi = bestPlan(pool, rest, { seed: 1 });
  assert.ok(multi.totals.energy <= energyCap(rest));
  assert.ok(scorePlan(multi.totals, rest) <= scorePlan(single.totals, rest), 'bestPlan darf nie schlechter sein');
  assert.ok(multi.totals.protein >= rest.protein * 0.95,
    `protein ${multi.totals.protein} should be close to ${rest.protein}`);
});

test('buildPlan returns empty plan when almost nothing is left', () => {
  const { items } = buildPlan(DB, { energy: 40, protein: 5, fat: 2, carb: 5 }, {});
  assert.equal(items.length, 0);
});

test('reroll with exclude yields a different lead item', () => {
  const a = buildPlan(DB, REST, { seed: 1 });
  const exclude = new Set(a.items.map(it => it.food.name.toLowerCase()));
  const b = buildPlan(DB, REST, { seed: 2, exclude });
  const overlap = b.items.filter(it => exclude.has(it.food.name.toLowerCase()));
  assert.equal(overlap.length, 0, 'excluded foods must not reappear');
});

test('adjustPortions shrinks an over-budget plan back under the cap', () => {
  const items = [
    { food: DB[5], qty: 300, macros: { energy: 1116, protein: 39, fat: 21, carb: 180 } },
    { food: DB[0], qty: 200, macros: { energy: 330, protein: 62, fat: 8, carb: 0 } },
  ];
  const rest = { energy: 1000, protein: 80, fat: 30, carb: 100 };
  adjustPortions(items, rest);
  assert.ok(planTotals(items).energy <= energyCap(rest));
});

test('aiProposePlan uses AI ids/qty but computes macros in code and enforces the cap', async () => {
  const fakeApi = async () => ({ plan: { meals: [
    { id: 'chicken', qty: 999 },     // absurd große Portion → wird geklemmt/justiert
    { id: 'rice', qty: 200 },
    { id: 'unknown-food', qty: 100 } // unbekannte Id → ignoriert
  ] } });
  const { items, totals } = await aiProposePlan(DB, REST, { analyze: fakeApi });
  assert.ok(items.every(it => it.food.id !== 'unknown-food'));
  for (const it of items) {
    const expected = Math.round(it.food.energy * (it.qty / it.food.per));
    assert.equal(it.macros.energy, expected);
  }
  assert.ok(totals.energy <= energyCap(REST), `AI plan energy ${totals.energy} <= ${energyCap(REST)}`);
});

test('aiProposePlan throws on empty AI answer (caller falls back to greedy)', async () => {
  await assert.rejects(() => aiProposePlan(DB, REST, { analyze: async () => ({ plan: { meals: [] } }) }));
});

test('planHours: rest mode starts now, day mode uses meal slots', () => {
  assert.deepEqual(planHours(3, 'day', 9), [8, 12, 16]);
  assert.deepEqual(planHours(2, 'rest', 14), [14, 16]);
  assert.deepEqual(planHours(2, 'rest', 23), [21, 23].map(h => Math.min(22, h)));
});

test('planChecks flags energy over cap and protein misses', () => {
  const rest = { energy: 1000, protein: 100, fat: 30, carb: 100 };
  const ok = planChecks({ energy: 1010, protein: 99, fat: 32, carb: 95 }, rest);
  assert.equal(ok.energy, true);
  assert.equal(ok.protein, true);
  const bad = planChecks({ energy: 1200, protein: 60, fat: 70, carb: 200 }, rest);
  assert.equal(bad.energy, false);
  assert.equal(bad.protein, false);
});

/* ---- „Jetzt"-Modus, Quelle, Budget ------------------------ */

const MARKET = [
  { id: 'mkt-skyr',   name: 'Skyr Becher',       per: 1, unit: 'Becher',  energy: 284, protein: 50, fat: 1,  carb: 18, price: 1.19, fav: false },
  { id: 'mkt-wrap',   name: 'Hähnchen-Wrap',     per: 1, unit: 'Stück',   energy: 420, protein: 24, fat: 14, carb: 46, price: 2.99, fav: false },
  { id: 'mkt-salat',  name: 'Fertigsalat',       per: 1, unit: 'Packung', energy: 320, protein: 28, fat: 14, carb: 20, price: 3.49, fav: false },
  { id: 'mkt-banane', name: 'Banane',            per: 1, unit: 'Stück',   energy: 105, protein: 1,  fat: 0,  carb: 27, price: 0.29, fav: false },
];

test('mealsLeftFor: Uhrzeit-Slots (Annahme 4/3/2/1)', () => {
  assert.equal(mealsLeftFor(8), 4);
  assert.equal(mealsLeftFor(11), 3);
  assert.equal(mealsLeftFor(15), 2);
  assert.equal(mealsLeftFor(19), 1);
});

test('nowTargets: skaliert den Rest auf die nächste Mahlzeit und deckelt am Rest', () => {
  const rest = { energy: 2000, protein: 160, fat: 70, carb: 220 };
  const morgens = nowTargets(rest, 8);       // 1/4
  assert.equal(morgens.energy, 500);
  assert.equal(morgens.protein, 40);
  const abends = nowTargets(rest, 20);       // 1/1 → voller Rest
  assert.equal(abends.energy, 2000);
  // Untergrenzen greifen, aber nie über den Rest hinaus
  const wenig = nowTargets({ energy: 180, protein: 12, fat: 10, carb: 20 }, 8);
  assert.equal(wenig.energy, 180);
  assert.equal(wenig.protein, 12);
});

test('plannerCandidates: source market/cook filtert den Pool', () => {
  const state = { recipes: [{ id: 'r1', name: 'Bowl', items: 3, energy: 500, protein: 40, fat: 15, carb: 50 }], days: {} };
  const market = plannerCandidates(state, { foodDb: DB, marketDb: MARKET, source: 'market' });
  assert.ok(market.length === MARKET.length);
  assert.ok(market.every(c => c.source === 'market' && c.price > 0));
  const cook = plannerCandidates(state, { foodDb: DB, marketDb: MARKET, source: 'cook' });
  assert.equal(cook.length, 1);
  assert.equal(cook[0].source, 'recipe');
  assert.ok(cook[0].isRecipe);
});

test('priceOf und planTotals.price: Code rechnet Preise', () => {
  assert.equal(priceOf(MARKET[0], 2), 2.38);
  assert.equal(priceOf({ name: 'Reis', per: 100, unit: 'g' }, 200), 0);
  const items = [
    { food: MARKET[0], qty: 2, macros: { energy: 568, protein: 100, fat: 2, carb: 36 } },
    { food: MARKET[3], qty: 1, macros: { energy: 105, protein: 1, fat: 0, carb: 27 } },
  ];
  assert.equal(planTotals(items).price, 2.67);
});

test('buildPlan/bestPlan: Budget ist eine harte Grenze', () => {
  const rest = { energy: 900, protein: 70, fat: 25, carb: 90 };
  for (const seed of [1, 7, 42]) {
    const plan = bestPlan(MARKET, rest, { maxItems: 3, seed, budget: 5 });
    assert.ok(plan.items.length > 0, 'Budget-Plan darf nicht leer sein');
    assert.ok(plan.totals.price <= 5 + 1e-9, `Preis ${plan.totals.price} über Budget`);
    assert.ok(plan.totals.energy <= energyCap(rest));
  }
});

test('planHours: now-Modus loggt alles auf die aktuelle Stunde', () => {
  assert.deepEqual(planHours(2, 'now', 10), [10, 10]);
  assert.deepEqual(planHours(1, 'now', 23), [22]);
});
