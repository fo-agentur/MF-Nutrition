import test from 'node:test';
import assert from 'node:assert/strict';

import api from './analyze-food.js';

const {
  BYOK_MODEL,
  allowedModel,
  callOpenRouter,
  clientKey,
  extractJsonObject,
  modelChain,
  normalizeFood,
  normalizeRecipe,
  promptFor,
  validImageDataUrl,
} = api;

test('allowedModel only accepts the free router or explicit free variants', () => {
  assert.equal(allowedModel('openrouter/free'), 'openrouter/free');
  assert.equal(allowedModel('google/gemini-2.0-flash-exp:free'), 'google/gemini-2.0-flash-exp:free');
  assert.equal(allowedModel('anthropic/claude-sonnet-4'), 'openrouter/free');
  assert.equal(allowedModel(''), 'openrouter/free');
});

test('extractJsonObject tolerates fenced model output', () => {
  assert.deepEqual(
    extractJsonObject('```json\n{"name":"Skyr","energy":180}\n```'),
    { name: 'Skyr', energy: 180 },
  );
});

test('normalizeFood maps common macro aliases to app food shape', () => {
  assert.deepEqual(
    normalizeFood({
      meal: 'Chicken rice bowl',
      grams: 420,
      calories: 690,
      protein_g: 51.4,
      fat_g: 18.2,
      carbs_g: 73.8,
    }, 'meal'),
    {
      name: 'Chicken rice bowl',
      brand: 'AI Estimate',
      per: 420,
      unit: 'g',
      energy: 690,
      protein: 51,
      fat: 18,
      carb: 74,
      fiber: 0,
      sugar: 0,
      confidence: null,
      servingLabel: '',
      items: [],
    },
  );
});

test('normalizeFood prefers explicit visual portion gram estimates', () => {
  assert.deepEqual(
    normalizeFood({
      name: 'Restaurant pasta bowl',
      estimated_grams: 385,
      unit: 'serving',
      kcal: 740,
      protein: 28,
      fat: 24,
      carbs: 92,
    }, 'meal'),
    {
      name: 'Restaurant pasta bowl',
      brand: 'AI Portion Estimate',
      per: 385,
      unit: 'g',
      energy: 740,
      protein: 28,
      fat: 24,
      carb: 92,
      fiber: 0,
      sugar: 0,
      confidence: null,
      servingLabel: '',
      items: [],
    },
  );
});

test('normalizeFood passes through confidence, fiber/sugar and component items', () => {
  const food = normalizeFood({
    name: 'Hähnchen mit Reis und Gemüse',
    estimated_grams: 450,
    energy: 620,
    protein: 45,
    carb: 70,
    fat: 15,
    fiber: 6.4,
    sugar: 8,
    confidence: 'HIGH',
    items: [
      { name: 'Hähnchenbrust', grams: 160 },
      { name: 'Reis gekocht', grams: 200 },
      { name: 'Gemüse', grams: 90 },
      { name: '', grams: 10 },
    ],
  }, 'meal');
  assert.equal(food.per, 450);
  assert.equal(food.confidence, 'high');
  assert.equal(food.fiber, 6);
  assert.equal(food.sugar, 8);
  assert.deepEqual(food.items, [
    { name: 'Hähnchenbrust', grams: 160 },
    { name: 'Reis gekocht', grams: 200 },
    { name: 'Gemüse', grams: 90 },
  ]);
  assert.equal(normalizeFood({ name: 'X', confidence: 'sehr sicher' }).confidence, null);
});

test('meal prompt demands a committed estimate with confidence and items', () => {
  const prompt = promptFor('meal', 'photo only');
  assert.match(prompt, /Never ask the user/i);
  assert.match(prompt, /confidence/i);
  assert.match(prompt, /items/i);
  assert.match(prompt, /fiber/i);
});

test('meal prompt asks the model to estimate the visible portion in grams', () => {
  const prompt = promptFor('meal', 'photo only');
  assert.match(prompt, /estimate/i);
  assert.match(prompt, /portion/i);
  assert.match(prompt, /grams/i);
  assert.match(prompt, /estimated_grams/i);
});

test('normalizeRecipe returns recipe totals with item count', () => {
  assert.deepEqual(
    normalizeRecipe({ name: 'Protein pancakes', items: 4, kcal: 520, protein: 34, fat: 18, carb: 54 }),
    { name: 'Protein pancakes', items: 4, energy: 520, protein: 34, fat: 18, carb: 54, ingredients: [], steps: [] },
  );
});

test('normalizeRecipe carries ingredients and steps through, cleaned and capped', () => {
  const out = normalizeRecipe({
    name: 'Schweinsleber mit Kartoffeln',
    energy: 640, protein: 45, fat: 22, carb: 58,
    ingredients: [
      { name: 'Schweinsleber', qty: '300', unit: 'g' },
      { name: 'Kartoffeln', qty: 400, unit: 'g' },
      { name: 'Zwiebel', qty: '1,5', unit: 'Stück' },
      { name: '', qty: 10, unit: 'g' },          // ohne Name → raus
      { name: 'Salz', unit: '' },                 // ohne Menge → qty 0
    ],
    steps: ['Kartoffeln kochen.', '', 'Leber kurz scharf anbraten.', 42],
  });
  assert.equal(out.items, 4);
  assert.deepEqual(out.ingredients, [
    { name: 'Schweinsleber', qty: 300, unit: 'g' },
    { name: 'Kartoffeln', qty: 400, unit: 'g' },
    { name: 'Zwiebel', qty: 1.5, unit: 'Stück' },
    { name: 'Salz', qty: 0, unit: '' },
  ]);
  assert.deepEqual(out.steps, ['Kartoffeln kochen.', 'Leber kurz scharf anbraten.']);
});

test('recipe prompt asks for ingredients with units and German steps', () => {
  const prompt = promptFor('recipe', 'https://example.com/rezept');
  assert.match(prompt, /ingredients/);
  assert.match(prompt, /steps/);
  assert.match(prompt, /German/);
});

test('validImageDataUrl accepts image data URLs and rejects oversized or non-images', () => {
  assert.equal(validImageDataUrl('data:image/jpeg;base64,abcd'), true);
  assert.equal(validImageDataUrl('data:text/plain;base64,abcd'), false);
  assert.equal(validImageDataUrl('data:image/jpeg;base64,' + 'a'.repeat(6_000_000)), false);
});

const USER_KEY = 'sk-or-v1-' + 'a'.repeat(48);

test('clientKey only accepts plausible OpenRouter keys from the header', () => {
  const req = k => ({ headers: { 'x-openrouter-key': k } });
  assert.equal(clientKey(req(USER_KEY)), USER_KEY);
  assert.equal(clientKey(req('  ' + USER_KEY + '  ')), USER_KEY);
  assert.equal(clientKey(req('nicht-mein-key')), '');
  assert.equal(clientKey(req('sk-or-kurz')), '');
  assert.equal(clientKey(req('sk-or-' + 'a'.repeat(300))), '');
  assert.equal(clientKey(req('')), '');
  assert.equal(clientKey({}), '');
  assert.equal(clientKey(undefined), '');
});

test('modelChain leads with the paid BYOK model only when the user brings a key', () => {
  const envModel = process.env.OPENROUTER_MODEL;
  delete process.env.OPENROUTER_MODEL;
  try {
    assert.equal(modelChain('', true)[0], BYOK_MODEL);
    assert.equal(modelChain('', true).length, 3);
    assert.notEqual(modelChain('', false)[0], BYOK_MODEL);
    // Ein explizit gesetztes Server-Modell bleibt auch mit User-Key vorn.
    process.env.OPENROUTER_MODEL = 'google/gemini-3-pro';
    assert.deepEqual(modelChain('', true)[0], 'google/gemini-3-pro');
    assert.ok(!modelChain('', true).includes(BYOK_MODEL));
  } finally {
    if (envModel === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = envModel;
  }
});

test('callOpenRouter bills the user key (not the server key) and upgrades the model', async () => {
  const realFetch = global.fetch;
  const envKey = process.env.OPENROUTER_API_KEY;
  const envModel = process.env.OPENROUTER_MODEL;
  process.env.OPENROUTER_API_KEY = 'sk-or-v1-server-key';
  delete process.env.OPENROUTER_MODEL;
  let seenAuth = '';
  let seenModels = null;
  global.fetch = async (url, opts) => {
    seenAuth = opts.headers.Authorization;
    seenModels = JSON.parse(opts.body).models;
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"name":"Apfel","energy":52}' } }] }),
    };
  };
  try {
    const json = await callOpenRouter({ task: 'meal', text: '1 Apfel', imageData: '', model: '', userKey: USER_KEY });
    assert.equal(seenAuth, `Bearer ${USER_KEY}`);
    assert.equal(seenModels[0], BYOK_MODEL);
    assert.equal(json.name, 'Apfel');

    // Ohne User-Key: Server-Key + reine Free-Kette wie bisher.
    await callOpenRouter({ task: 'meal', text: '1 Apfel', imageData: '', model: '' });
    assert.equal(seenAuth, 'Bearer sk-or-v1-server-key');
    assert.ok(!seenModels.includes(BYOK_MODEL));
  } finally {
    global.fetch = realFetch;
    if (envKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = envKey;
    if (envModel === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = envModel;
  }
});
