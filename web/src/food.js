/* ============================================================
   Food database access — OpenFoodFacts via Supabase Edge
   Function (primary) with a direct-OFF fallback.
   Returns foods in the app's shape (macros per 100 g).
   ============================================================ */
import { supabase } from './supabaseClient.js';

const OFF = 'https://world.openfoodfacts.org';
const OFF_FIELDS =
  'code,product_name,product_name_de,generic_name,brands,quantity,' +
  'serving_quantity,serving_size,nutriments,image_front_small_url,image_url';

/* icon/colour heuristic so OFF foods get a sensible icon */
const ICON_RULES = [
  [/müsli|cereal|granola|knusper|porridge/i, 'utensils', '#2BA89F'],
  [/banane|banana/i, 'banana', '#F2BE3F'],
  [/ei(er)?\b|egg/i, 'egg', '#E9D08A'],
  [/reis|rice/i, 'wheat', '#D8C28A'],
  [/hafer|oat/i, 'wheat', '#D8C28A'],
  [/brot|bread|toast|semmel|weckerl/i, 'sandwich', '#E0A45A'],
  [/skyr|joghurt|yogurt|milch|milk|quark|topfen|whey|protein/i, 'milk', '#EDEDED'],
  [/hähnchen|huhn|chicken|pute|fleisch|wurst|schinken|ham/i, 'drumstick', '#E0A45A'],
  [/lachs|fisch|salmon|fish|thunfisch|tuna/i, 'fish', '#EF8E6A'],
  [/apfel|apple|frucht|fruit|beere|berry|himbeer|erdbeer/i, 'apple', '#57B36E'],
  [/mandel|nuss|nut|almond|erdnuss|peanut/i, 'nut', '#C99B6E'],
  [/kaffee|coffee|tee|tea/i, 'coffee', '#B98A5E'],
  [/schoko|chocolate|candy|riegel|bar|süß|keks|cookie/i, 'candy', '#9B6B45'],
  [/wasser|water|saft|juice|cola|limo|drink|getränk/i, 'cup-soda', '#4A78F0'],
  [/kartoffel|potato|pommes|chips/i, 'utensils', '#E0A45A'],
];
function iconFor(name = '') { for (const [re, i] of ICON_RULES) if (re.test(name)) return i; return 'utensils'; }
function colorFor(name = '') { for (const [re, , c] of ICON_RULES) if (re.test(name)) return c; return '#2BA89F'; }

function slug(s = '') { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }

const CUSTOM_KEY = 'mf_custom_foods_v1';

function normalizeCustomFood(food = {}) {
  const name = String(food.name || '').trim() || 'Custom Food';
  const brand = String(food.brand || '').trim();
  const num = v => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  };
  const per = Number(food.per);
  return {
    id: food.id || 'custom-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now()),
    name,
    brand,
    icon: food.icon || iconFor(name + ' ' + brand),
    color: food.color || colorFor(name + ' ' + brand),
    per: Number.isFinite(per) && per > 0 ? per : 100,
    unit: String(food.unit || 'g').trim() || 'g',
    energy: num(food.energy),
    protein: num(food.protein),
    fat: num(food.fat),
    carb: num(food.carb),
    fav: !!food.fav,
    custom: true,
  };
}

function getCustomFoods() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
    return Array.isArray(saved) ? saved.map(normalizeCustomFood) : [];
  } catch (e) {
    return [];
  }
}

function writeCustomFoods(foods) {
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(foods.map(normalizeCustomFood))); } catch (e) {}
}

function customMatches(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return getCustomFoods();
  return getCustomFoods().filter(f =>
    f.name.toLowerCase().includes(q) ||
    (f.brand || '').toLowerCase().includes(q)
  );
}

/* OFF-normalized object -> app food shape (per 100 g) */
function toFood(p) {
  const name = p.name || 'Produkt';
  return {
    id: 'off-' + (p.barcode || slug(name) || Math.random().toString(16).slice(2)),
    name,
    brand: p.brand || (p.barcode ? 'OpenFoodFacts' : ''),
    icon: iconFor(name + ' ' + (p.brand || '')),
    color: colorFor(name + ' ' + (p.brand || '')),
    per: 100,
    unit: 'g',
    energy: Math.round(p.kcal || 0),
    protein: Math.round(p.protein_g || 0),
    fat: Math.round(p.fat_g || 0),
    carb: Math.round(p.carbs_g || 0),
    fav: false,
    barcode: p.barcode || null,
    image: p.image || null,
  };
}

async function viaFunction(payload) {
  const { data, error } = await supabase.functions.invoke('foods', { body: payload });
  if (error) throw error;
  if (data && data.error) throw new Error(data.error);
  return data;
}

/* ---- public API ---- */
async function searchFoods(q) {
  const query = (q || '').trim();
  if (query.length < 2) return [];
  const custom = customMatches(query);
  try {
    const data = await viaFunction({ q: query });
    if (data && Array.isArray(data.results)) return [...custom, ...data.results.map(toFood)];
  } catch (e) { /* fall through to direct */ }
  // direct OFF fallback
  try {
    const url = `${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=30&fields=${OFF_FIELDS}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const j = await res.json();
    return [...custom, ...(j.products || []).map(normalizeRaw).filter(f => f.kcal > 0 && f.name).map(toFood)];
  } catch (e) { return custom; }
}

async function lookupBarcode(code) {
  const c = (code || '').toString().trim();
  if (!c) return null;
  try {
    const data = await viaFunction({ barcode: c });
    if (data && data.product) return toFood(data.product);
    if (data && data.product === null) return null;
  } catch (e) { /* fall through */ }
  try {
    const url = `${OFF}/api/v2/product/${encodeURIComponent(c)}.json?fields=${OFF_FIELDS}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const j = await res.json();
    if (j.status === 1 && j.product) return toFood(normalizeRaw({ ...j.product, code: c }));
    return null;
  } catch (e) { return null; }
}

/* normalize a raw OFF product (used only by the direct fallback) */
function normalizeRaw(p) {
  const nt = p.nutriments || {};
  const num = v => { const x = Number(v); return Number.isFinite(x) ? x : null; };
  const kcal = num(nt['energy-kcal_100g']) ?? num(nt['energy-kcal']) ?? 0;
  const name = (p.product_name_de || p.product_name || p.generic_name || '').trim();
  return {
    barcode: p.code || null,
    name,
    brand: (p.brands || '').split(',')[0]?.trim() || null,
    serving_g: num(p.serving_quantity),
    serving_label: p.serving_size || null,
    kcal: Math.round(kcal),
    protein_g: num(nt.proteins_100g) ?? 0,
    carbs_g: num(nt.carbohydrates_100g) ?? 0,
    fat_g: num(nt.fat_100g) ?? 0,
    image: p.image_front_small_url || p.image_url || null,
  };
}

/* best-effort: remember a used OFF food in the user's foods catalogue */
async function cacheFood(food) {
  if (!food || !food.barcode) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: existing } = await supabase.from('foods').select('id').eq('barcode', food.barcode).limit(1);
    if (existing && existing.length) return;
    await supabase.from('foods').insert({
      source: 'off', barcode: food.barcode, name: food.name, brand: food.brand || null,
      serving_g: 100, kcal: food.energy, protein_g: food.protein, carbs_g: food.carb, fat_g: food.fat,
      created_by: user.id,
    });
  } catch (e) { /* non-critical */ }
}

async function saveCustomFood(food) {
  const item = normalizeCustomFood(food);
  const foods = getCustomFoods().filter(f => f.id !== item.id);
  writeCustomFoods([item, ...foods].slice(0, 100));

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('foods').insert({
        source: 'custom',
        barcode: null,
        name: item.name,
        brand: item.brand || null,
        serving_g: item.unit === 'g' ? item.per : null,
        kcal: item.energy,
        protein_g: item.protein,
        carbs_g: item.carb,
        fat_g: item.fat,
        created_by: user.id,
      });
    }
  } catch (e) { /* local save already succeeded */ }

  return item;
}

Object.assign(window, { searchFoods, lookupBarcode, cacheFood, saveCustomFood, getCustomFoods });
export { searchFoods, lookupBarcode, cacheFood, saveCustomFood, getCustomFoods };
