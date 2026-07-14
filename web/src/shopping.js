/* ============================================================
   Einkaufsliste — Zutaten-Parser und Mengen-Zusammenführung.

   Gleiche Regel wie beim Planner: die KI (oder eine Rezeptseite)
   liefert höchstens Zutaten-TEXT — Mengen normalisieren, addieren
   und zusammenführen macht ausschließlich dieser Code.
   ============================================================ */

/* Einheiten-Normalisierung: kg→g und l→ml, damit "500 g" und
   "1 kg" derselben Zutat zusammenlaufen. Zähl-Einheiten werden
   auf eine kanonische Schreibweise gezogen. */
const UNIT_ALIASES = {
  g: 'g', gramm: 'g', gr: 'g',
  kg: 'kg', kilo: 'kg', kilogramm: 'kg',
  ml: 'ml', milliliter: 'ml',
  l: 'l', liter: 'l',
  el: 'EL', esslöffel: 'EL', essloeffel: 'EL', tbsp: 'EL',
  tl: 'TL', teelöffel: 'TL', teeloeffel: 'TL', tsp: 'TL',
  stk: 'Stück', stück: 'Stück', stueck: 'Stück', piece: 'Stück', pieces: 'Stück', x: 'Stück',
  prise: 'Prise', prisen: 'Prise',
  bund: 'Bund',
  dose: 'Dose', dosen: 'Dose', can: 'Dose',
  packung: 'Packung', packungen: 'Packung', pck: 'Packung', pkg: 'Packung',
  becher: 'Becher',
  tasse: 'Tasse', tassen: 'Tasse', cup: 'Tasse', cups: 'Tasse',
  zehe: 'Zehe', zehen: 'Zehe',
  scheibe: 'Scheibe', scheiben: 'Scheibe',
  portion: 'Portion', portionen: 'Portion', serving: 'Portion',
};

const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

function normUnit(raw) {
  const key = String(raw || '').trim().toLowerCase().replace(/\.$/, '');
  return UNIT_ALIASES[key] || String(raw || '').trim();
}

function parseQty(raw) {
  const s = String(raw || '').trim();
  if (FRACTIONS[s] != null) return FRACTIONS[s];
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/* "300 g Schweinsleber", "300g Kartoffeln", "2 Eier", "1 EL Öl",
   "½ Zwiebel", "1/2 TL Salz", "- 60 g Haferflocken", "Salz & Pfeffer" */
function parseIngredient(line) {
  let s = String(line || '')
    .replace(/^[-*•·–—]+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;

  // Bruch VOR ganzer Zahl, sonst matcht "1/2" nur als "1"
  const qtyPart = '(\\d+\\s*/\\s*\\d+|\\d+(?:[.,]\\d+)?|[½¼¾⅓⅔])';
  const unitPart = '([a-zA-ZäöüÄÖÜß]+\\.?)';

  // Menge + Einheit + Name ("300 g Schweinsleber", "1 EL Öl")
  let m = s.match(new RegExp(`^${qtyPart}\\s*${unitPart}\\s+(.+)$`));
  if (m) {
    const unit = normUnit(m[2]);
    const known = Object.values(UNIT_ALIASES).includes(unit);
    if (known) return finalize(parseQty(m[1]), unit, m[3]);
    // "2 Eier": das zweite Token war schon der Name
    return finalize(parseQty(m[1]), 'Stück', `${m[2]} ${m[3]}`.trim());
  }

  // Menge + Name ohne Einheit ("2 Eier", "½ Zwiebel")
  m = s.match(new RegExp(`^${qtyPart}\\s+(.+)$`));
  if (m) return finalize(parseQty(m[1]), 'Stück', m[2]);

  // Nur Menge+Einheit am Ende ("Haferflocken 60 g")
  m = s.match(new RegExp(`^(.+?)\\s+${qtyPart}\\s*${unitPart}$`));
  if (m && Object.values(UNIT_ALIASES).includes(normUnit(m[3]))) {
    return finalize(parseQty(m[2]), normUnit(m[3]), m[1]);
  }

  // Keine Menge erkennbar ("Salz & Pfeffer")
  return finalize(0, '', s);
}

function finalize(qty, unit, name) {
  const cleanName = String(name || '').replace(/^[,.:;]+|[,.:;]+$/g, '').trim().slice(0, 60);
  if (!cleanName) return null;
  let q = Math.max(0, qty);
  let u = unit;
  if (u === 'kg') { q *= 1000; u = 'g'; }
  if (u === 'l') { q *= 1000; u = 'ml'; }
  q = Math.round(q * 100) / 100;
  return { name: cleanName, qty: q, unit: q ? u : u || '' };
}

/* Beliebige Zutaten-Eingabe (String oder {name,qty,unit}) auf das
   Listenformat ziehen — für KI-Antworten UND JSON-LD-Strings. */
function toItem(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') return parseIngredient(raw);
  const name = String(raw.name || raw.item || '').trim();
  if (!name) return null;
  const qty = Math.max(0, Number(String(raw.qty ?? raw.amount ?? 0).replace(',', '.')) || 0);
  return finalize(qty, normUnit(raw.unit || ''), name);
}

function itemKey(it) {
  return it.name.toLowerCase() + '|' + (it.unit || '');
}

/* Neue Einträge in die bestehende Liste mergen: gleiche Zutat mit
   gleicher Einheit wird addiert und wieder als "offen" markiert. */
function mergeShopping(list, adds) {
  const out = list.map(it => ({ ...it }));
  const index = new Map(out.map((it, i) => [itemKey(it), i]));
  for (const raw of adds || []) {
    const it = toItem(raw);
    if (!it) continue;
    const i = index.get(itemKey(it));
    if (i != null) {
      out[i].qty = Math.round((out[i].qty + it.qty) * 100) / 100;
      out[i].done = false;
    } else {
      index.set(itemKey(it), out.length);
      out.push({ id: 's' + Date.now() + '-' + out.length, done: false, ...it });
    }
  }
  return out;
}

/* Tagesplan → Einkaufsliste: Planner-Items sind {food, qty}.
   Rezepte im Plan (isRecipe, qty = Portionen) werden in ihre echten
   Zutaten × Portionen aufgelöst — das ist, was man einkaufen muss. */
function ingredientsFromPlan(items, recipes = []) {
  const out = [];
  for (const { food, qty } of items || []) {
    const rid = food && food.isRecipe ? String(food.id || '').replace(/^recipe-/, '') : '';
    const recipe = rid ? (recipes || []).find(r => r.id === rid) : null;
    if (recipe && recipe.ingredients && recipe.ingredients.length) {
      const portions = Math.max(1, qty || 1);
      for (const ing of recipe.ingredients) {
        out.push({
          name: ing.name,
          qty: Math.round((ing.qty || 0) * portions * 100) / 100,
          unit: ing.unit || '',
        });
      }
    } else {
      out.push({
        name: food.name,
        qty,
        unit: food.unit === 'g' || food.unit === 'ml' ? food.unit : 'Stück',
      });
    }
  }
  return out;
}

function formatQty(it) {
  if (!it.qty) return '';
  const n = Number.isInteger(it.qty) ? it.qty : String(it.qty).replace('.', ',');
  return it.unit ? `${n} ${it.unit}` : String(n);
}

const shopping = { parseIngredient, toItem, mergeShopping, ingredientsFromPlan, formatQty, normUnit };

if (typeof window !== 'undefined') Object.assign(window, { shopping });

export { parseIngredient, toItem, mergeShopping, ingredientsFromPlan, formatQty, normUnit };
