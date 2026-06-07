import assert from 'node:assert/strict';
import test from 'node:test';

import { estimateLocalMealFromText, normalizeAiTextForMatch } from './ai-estimator.js';

const mf = { purple: '#9B7FE8' };
const foodDb = [
  { id: 'eggs', name: 'Eier', per: 1, unit: 'Stück', energy: 78, protein: 6, fat: 5, carb: 1 },
  { id: 'yogurt', name: 'Skyr Natur', per: 100, unit: 'g', energy: 63, protein: 11, fat: 0, carb: 4 },
  { id: 'banana', name: 'Banane', per: 1, unit: 'Stück', energy: 105, protein: 1, fat: 0, carb: 27 },
  { id: 'chicken', name: 'Hähnchenbrust gegrillt', per: 100, unit: 'g', energy: 165, protein: 31, fat: 4, carb: 0 },
  { id: 'rice', name: 'Reis gekocht', per: 100, unit: 'g', energy: 130, protein: 3, fat: 0, carb: 28 },
];

const deps = { foodDb, mf };

test('normalizeAiTextForMatch folds common German food spelling variants', () => {
  assert.equal(normalizeAiTextForMatch('Hähnchen mit Süßkartoffel'), 'hahnchen mit susskartoffel');
});

test('estimateLocalMealFromText combines piece counts and default gram portions', () => {
  const food = estimateLocalMealFromText('2 Eier mit Toast', deps);
  assert.equal(food.per, 180);
  assert.equal(food.unit, 'g');
  assert.equal(food.brand, 'AI Portion Estimate - 180g');
  assert.equal(food.energy, 316);
  assert.equal(food.protein, 18);
  assert.equal(food.fat, 12);
  assert.equal(food.carb, 32);
});

test('estimateLocalMealFromText estimates a common bowl in grams', () => {
  const food = estimateLocalMealFromText('Skyr mit Banane', deps);
  assert.equal(food.per, 370);
  assert.equal(food.brand, 'AI Portion Estimate - 370g');
  assert.equal(food.energy, 263);
  assert.equal(food.protein, 29);
  assert.equal(food.carb, 37);
});

test('estimateLocalMealFromText keeps explicit grams attached to the correct ingredient', () => {
  const food = estimateLocalMealFromText('200g chicken mit 150g rice', deps);
  assert.equal(food.per, 350);
  assert.equal(food.energy, 525);
  assert.equal(food.protein, 67);
  assert.equal(food.fat, 8);
  assert.equal(food.carb, 42);
});

test('estimateLocalMealFromText does not steal a following ingredient gram value', () => {
  const food = estimateLocalMealFromText('chicken mit 150g rice', deps);
  assert.equal(food.per, 330);
  assert.equal(food.energy, 492);
  assert.equal(food.protein, 61);
  assert.equal(food.carb, 42);
});
