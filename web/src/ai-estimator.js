function normalizeAiTextForMatch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findAiTerm(source, terms) {
  for (const term of terms) {
    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
    const match = source.match(re);
    if (match) return { index: match.index, term };
  }
  return null;
}

function numberNear(source, index, term, unitRe) {
  const before = source.slice(Math.max(0, index - 24), index);
  const after = source.slice(index, Math.min(source.length, index + 34));
  const beforeMatch = before.match(new RegExp(`(\\d+(?:[\\.,]\\d+)?)\\s*(?:${unitRe})\\s*$`, 'i'));
  if (beforeMatch) return Number(beforeMatch[1].replace(',', '.'));
  const afterMatch = after.match(new RegExp(`^${escapeRegExp(term)}\\s*(?:-|:)?\\s*(\\d+(?:[\\.,]\\d+)?)\\s*(?:${unitRe})\\b`, 'i'));
  return afterMatch ? Number(afterMatch[1].replace(',', '.')) : null;
}

function countBeforeTerm(source, index) {
  const before = source.slice(Math.max(0, index - 18), index);
  const match = before.match(/(\d+(?:[\.,]\d+)?)\s*(?:x\s*)?$/i);
  return match ? Number(match[1].replace(',', '.')) : null;
}

function titleFromAiText(raw, fallback) {
  const cleaned = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/g, '');
  if (!cleaned) return fallback;
  return cleaned.slice(0, 1).toUpperCase() + cleaned.slice(1, 80);
}

const DEFAULT_PORTIONS = [
  { terms: ['skyr', 'joghurt', 'yogurt', 'quark'], foodId: 'yogurt', grams: 250 },
  { terms: ['banane', 'banana'], foodId: 'banana', count: 1, gramsPerUnit: 120 },
  { terms: ['honig', 'honey'], food: { name: 'Honig', per: 15, unit: 'g', energy: 46, protein: 0, fat: 0, carb: 12 }, grams: 15 },
  { terms: ['ei', 'eier', 'egg', 'eggs'], foodId: 'eggs', count: 2, gramsPerUnit: 60 },
  { terms: ['toast', 'brot', 'bread'], food: { name: 'Toast', per: 60, unit: 'g', energy: 160, protein: 6, fat: 2, carb: 30 }, grams: 60 },
  { terms: ['hahnchen', 'haehnchen', 'chicken', 'huhn', 'pute'], foodId: 'chicken', grams: 180 },
  { terms: ['reis', 'rice'], foodId: 'rice', grams: 220 },
  { terms: ['nudeln', 'pasta', 'spaghetti'], food: { name: 'Pasta gekocht', per: 100, unit: 'g', energy: 158, protein: 6, fat: 1, carb: 31 }, grams: 220 },
  { terms: ['kartoffel', 'kartoffeln', 'potato', 'potatoes'], food: { name: 'Kartoffeln', per: 100, unit: 'g', energy: 77, protein: 2, fat: 0, carb: 17 }, grams: 250 },
  { terms: ['pommes', 'fries'], food: { name: 'Pommes', per: 150, unit: 'g', energy: 470, protein: 5, fat: 22, carb: 61 }, grams: 150 },
  { terms: ['haferflocken', 'oats', 'oatmeal'], foodId: 'oats', grams: 60 },
  { terms: ['lachs', 'salmon', 'fish', 'fisch'], foodId: 'salmon', grams: 160 },
  { terms: ['rind', 'steak', 'beef'], food: { name: 'Steak', per: 100, unit: 'g', energy: 220, protein: 26, fat: 12, carb: 0 }, grams: 180 },
  { terms: ['mandeln', 'almond', 'almonds', 'nusse', 'nuts'], foodId: 'almond', grams: 30 },
  { terms: ['apfel', 'apple'], foodId: 'apple', count: 1, gramsPerUnit: 180 },
  { terms: ['salat', 'salad'], food: { name: 'Salat', per: 100, unit: 'g', energy: 22, protein: 2, fat: 0, carb: 4 }, grams: 120 },
  { terms: ['gemuese', 'vegetables', 'veggies'], food: { name: 'Gemüse', per: 100, unit: 'g', energy: 35, protein: 2, fat: 0, carb: 7 }, grams: 150 },
  { terms: ['kaese', 'cheese'], food: { name: 'Käse', per: 30, unit: 'g', energy: 120, protein: 7, fat: 10, carb: 1 }, grams: 30 },
  { terms: ['olivenol', 'olive oil', 'oel', 'oil'], food: { name: 'Olivenöl', per: 10, unit: 'g', energy: 90, protein: 0, fat: 10, carb: 0 }, grams: 10 },
  { terms: ['butter'], food: { name: 'Butter', per: 10, unit: 'g', energy: 72, protein: 0, fat: 8, carb: 0 }, grams: 10 },
  { terms: ['milch', 'milk'], food: { name: 'Milch', per: 250, unit: 'ml', energy: 120, protein: 8, fat: 4, carb: 12 }, grams: 250 },
  { terms: ['whey', 'proteinpulver', 'protein powder'], food: { name: 'Protein Powder', per: 30, unit: 'g', energy: 115, protein: 23, fat: 2, carb: 2 }, grams: 30 },
];

function estimateLocalMealFromText(raw, deps = {}) {
  const source = normalizeAiTextForMatch(raw);
  if (!source.trim()) return null;

  const foodDb = deps.foodDb || [];
  const scaleFood = deps.scaleFood || ((food, qty) => {
    const f = qty / food.per;
    return {
      energy: Math.round(food.energy * f),
      protein: Math.round(food.protein * f),
      fat: Math.round(food.fat * f),
      carb: Math.round(food.carb * f),
    };
  });
  const mf = deps.mf || { purple: '#9B7FE8' };
  const portions = deps.portions || DEFAULT_PORTIONS;

  const parts = [];
  portions.forEach(d => {
    const hit = findAiTerm(source, d.terms);
    if (!hit) return;
    const dbFood = d.foodId ? foodDb.find(f => f.id === d.foodId) : null;
    const food = dbFood || { ...d.food, icon: 'utensils', color: mf.purple };
    if (!food) return;

    const explicitGrams = numberNear(source, hit.index, hit.term, 'g|gram|grams|gramm|ml');
    const count = countBeforeTerm(source, hit.index) || d.count || 1;
    const grams = explicitGrams || Math.round((d.gramsPerUnit || d.grams || food.per || 100) * count);
    const qty = food.unit === 'g' || food.unit === 'ml'
      ? grams
      : explicitGrams && d.gramsPerUnit
        ? Math.max(1, explicitGrams / d.gramsPerUnit)
        : count;
    const macros = scaleFood(food, qty);
    parts.push({
      name: food.name.split(' By ')[0],
      grams,
      ...macros,
    });
  });

  if (!parts.length) return null;
  const totals = parts.reduce((sum, part) => ({
    grams: sum.grams + part.grams,
    energy: sum.energy + part.energy,
    protein: sum.protein + part.protein,
    fat: sum.fat + part.fat,
    carb: sum.carb + part.carb,
  }), { grams: 0, energy: 0, protein: 0, fat: 0, carb: 0 });
  const grams = Math.max(1, Math.round(totals.grams));
  const fallbackName = parts.length === 1 ? parts[0].name : parts.map(p => p.name).slice(0, 3).join(' + ');
  return {
    id: 'ai-local-' + Date.now(),
    name: titleFromAiText(raw, fallbackName),
    brand: `AI Portion Estimate - ${grams}g`,
    icon: 'sparkles',
    color: mf.purple,
    per: grams,
    unit: 'g',
    energy: totals.energy,
    protein: totals.protein,
    fat: totals.fat,
    carb: totals.carb,
    fav: false,
  };
}

export { DEFAULT_PORTIONS, estimateLocalMealFromText, normalizeAiTextForMatch };
