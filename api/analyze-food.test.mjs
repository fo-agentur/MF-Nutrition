import test from 'node:test';
import assert from 'node:assert/strict';

import api from './analyze-food.js';

const {
  allowedModel,
  extractJsonObject,
  normalizeFood,
  normalizeRecipe,
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
    },
  );
});

test('normalizeRecipe returns recipe totals with item count', () => {
  assert.deepEqual(
    normalizeRecipe({ name: 'Protein pancakes', items: 4, kcal: 520, protein: 34, fat: 18, carb: 54 }),
    { name: 'Protein pancakes', items: 4, energy: 520, protein: 34, fat: 18, carb: 54 },
  );
});

test('validImageDataUrl accepts image data URLs and rejects oversized or non-images', () => {
  assert.equal(validImageDataUrl('data:image/jpeg;base64,abcd'), true);
  assert.equal(validImageDataUrl('data:text/plain;base64,abcd'), false);
  assert.equal(validImageDataUrl('data:image/jpeg;base64,' + 'a'.repeat(6_000_000)), false);
});
