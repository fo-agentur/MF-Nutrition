import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recipeToFood, loggedHabitFoods, plannerCandidates, remainingTargets,
  planTotals, energyCap, fitsBudget, buildPlan, bestPlan, adjustPortions,
  aiProposePlan, planHours, planChecks, scorePlan,
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
