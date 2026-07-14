import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIngredient, toItem, mergeShopping, ingredientsFromPlan, formatQty } from './shopping.js';

test('parseIngredient: Menge + Einheit + Name', () => {
  assert.deepEqual(parseIngredient('300 g Schweinsleber'), { name: 'Schweinsleber', qty: 300, unit: 'g' });
  assert.deepEqual(parseIngredient('300g Kartoffeln'), { name: 'Kartoffeln', qty: 300, unit: 'g' });
  assert.deepEqual(parseIngredient('1 EL Öl'), { name: 'Öl', qty: 1, unit: 'EL' });
  assert.deepEqual(parseIngredient('2 TL Paprikapulver'), { name: 'Paprikapulver', qty: 2, unit: 'TL' });
  assert.deepEqual(parseIngredient('150 ml Milch'), { name: 'Milch', qty: 150, unit: 'ml' });
});

test('parseIngredient: kg/l werden auf g/ml normalisiert', () => {
  assert.deepEqual(parseIngredient('1 kg Kartoffeln'), { name: 'Kartoffeln', qty: 1000, unit: 'g' });
  assert.deepEqual(parseIngredient('0,5 l Gemüsebrühe'), { name: 'Gemüsebrühe', qty: 500, unit: 'ml' });
});

test('parseIngredient: Stückzahlen ohne Einheit', () => {
  assert.deepEqual(parseIngredient('2 Eier'), { name: 'Eier', qty: 2, unit: 'Stück' });
  assert.deepEqual(parseIngredient('2 große Zwiebeln'), { name: 'große Zwiebeln', qty: 2, unit: 'Stück' });
});

test('parseIngredient: Brüche', () => {
  assert.deepEqual(parseIngredient('½ Zwiebel'), { name: 'Zwiebel', qty: 0.5, unit: 'Stück' });
  assert.deepEqual(parseIngredient('1/2 TL Salz'), { name: 'Salz', qty: 0.5, unit: 'TL' });
});

test('parseIngredient: Aufzählungszeichen und Ohne-Menge-Zeilen', () => {
  assert.deepEqual(parseIngredient('- 60 g Haferflocken'), { name: 'Haferflocken', qty: 60, unit: 'g' });
  assert.deepEqual(parseIngredient('Salz & Pfeffer'), { name: 'Salz & Pfeffer', qty: 0, unit: '' });
  assert.equal(parseIngredient('   '), null);
});

test('toItem: Objekte aus der KI-Antwort', () => {
  assert.deepEqual(toItem({ name: 'Skyr', qty: '250', unit: 'g' }), { name: 'Skyr', qty: 250, unit: 'g' });
  assert.deepEqual(toItem({ name: 'Reis', qty: 1, unit: 'kg' }), { name: 'Reis', qty: 1000, unit: 'g' });
  assert.equal(toItem({ qty: 3 }), null);
  assert.deepEqual(toItem('2 Eier'), { name: 'Eier', qty: 2, unit: 'Stück' });
});

test('mergeShopping: gleiche Zutat + Einheit wird addiert und wieder offen', () => {
  const list = [{ id: 'a', name: 'Kartoffeln', qty: 500, unit: 'g', done: true }];
  const merged = mergeShopping(list, [{ name: 'kartoffeln', qty: 1, unit: 'kg' }, '2 Eier']);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].qty, 1500);
  assert.equal(merged[0].done, false);
  assert.equal(merged[1].name, 'Eier');
  assert.equal(merged[1].done, false);
  // Original bleibt unangetastet
  assert.equal(list[0].qty, 500);
  assert.equal(list[0].done, true);
});

test('mergeShopping: gleiche Zutat mit anderer Einheit bleibt getrennt', () => {
  const merged = mergeShopping([], [{ name: 'Öl', qty: 1, unit: 'EL' }, { name: 'Öl', qty: 100, unit: 'ml' }]);
  assert.equal(merged.length, 2);
});

test('ingredientsFromPlan: Planner-Items → Einkaufszeilen', () => {
  const items = [
    { food: { name: 'Hähnchenbrust', unit: 'g' }, qty: 200 },
    { food: { name: 'Banane', unit: 'Stück' }, qty: 2 },
  ];
  assert.deepEqual(ingredientsFromPlan(items), [
    { name: 'Hähnchenbrust', qty: 200, unit: 'g' },
    { name: 'Banane', qty: 2, unit: 'Stück' },
  ]);
});

test('ingredientsFromPlan: Rezept im Plan wird in Zutaten × Portionen aufgelöst', () => {
  const recipes = [{
    id: 'r2', name: 'Hähnchen Reis Bowl',
    ingredients: [
      { name: 'Hähnchenbrust', qty: 180, unit: 'g' },
      { name: 'Sojasauce', qty: 1, unit: 'EL' },
      { name: 'Majoran', qty: 0, unit: '' },
    ],
  }];
  const items = [
    { food: { id: 'recipe-r2', name: 'Hähnchen Reis Bowl', unit: 'Portion', isRecipe: true }, qty: 2 },
    { food: { name: 'Haferflocken', unit: 'g' }, qty: 100 },
  ];
  assert.deepEqual(ingredientsFromPlan(items, recipes), [
    { name: 'Hähnchenbrust', qty: 360, unit: 'g' },
    { name: 'Sojasauce', qty: 2, unit: 'EL' },
    { name: 'Majoran', qty: 0, unit: '' },
    { name: 'Haferflocken', qty: 100, unit: 'g' },
  ]);
});

test('ingredientsFromPlan: Rezept ohne Zutatenliste fällt auf Portions-Zeile zurück', () => {
  const items = [{ food: { id: 'recipe-rx', name: 'Altes Rezept', unit: 'Portion', isRecipe: true }, qty: 2 }];
  assert.deepEqual(ingredientsFromPlan(items, [{ id: 'rx', name: 'Altes Rezept' }]), [
    { name: 'Altes Rezept', qty: 2, unit: 'Stück' },
  ]);
});

test('formatQty: Mengen lesbar, ohne Menge leer', () => {
  assert.equal(formatQty({ qty: 300, unit: 'g' }), '300 g');
  assert.equal(formatQty({ qty: 0.5, unit: 'TL' }), '0,5 TL');
  assert.equal(formatQty({ qty: 2, unit: 'Stück' }), '2 Stück');
  assert.equal(formatQty({ qty: 0, unit: '' }), '');
});
