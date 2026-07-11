/* ============================================================
   MacroFactor PWA — App State Store (Supabase-backed)
   Keeps the exact same state shape the screens expect, but
   hydrates from / persists to Supabase instead of localStorage.
   ============================================================ */

import { supabase } from './supabaseClient.js';

const MF = {
  energy:  '#E3A83D', protein: '#C4674C', fat: '#B3A05F',
  carb:    '#7C9E85', purple:  '#8E93AC', teal: '#6E9A94',
};

/* Macro meta (order matters for rendering) */
const MACRO_META = [
  { key: 'energy',  letter: 'E',  unit: 'E', color: MF.energy,  goalKey: 'energy'  },
  { key: 'protein', letter: 'P',  unit: 'P', color: MF.protein, goalKey: 'protein' },
  { key: 'fat',     letter: 'F',  unit: 'F', color: MF.fat,     goalKey: 'fat'     },
  { key: 'carb',    letter: 'C',  unit: 'C', color: MF.carb,    goalKey: 'carb'    },
];

/* Local food library (used by the Add sheet for search/favorites/picks).
   Logged entries are persisted to Supabase food_logs regardless. */
const FOOD_DB = [
  { id: 'muesli',  name: 'Knusper Müsli Schoko By Spar', brand: 'Spar',  icon: 'utensils',   color: MF.teal,    per: 100, unit: 'g',       energy: 447, protein: 10, fat: 15, carb: 64, fav: false },
  /* Portion = 1 Flasche (350 ml); Makros gelten pro Flasche. per>1 mit
     Zähl-Einheit ließ den Stepper in 350er-Schritten springen („350 serving"). */
  { id: 'pro35',   name: 'Pro 35 Erdbeere By Nöm',       brand: 'Nöm · 350 ml', icon: 'milk',  color: '#C08552',  per: 1,   unit: 'Flasche', energy: 217, protein: 35, fat: 2,  carb: 19, fav: false },
  { id: 'burrito', name: 'Bomben Borito',                brand: 'Eigen', icon: 'drumstick',  color: '#B58F63',  per: 1,   unit: 'serving', energy: 620, protein: 38, fat: 22, carb: 58, fav: true  },
  { id: 'banana',  name: 'Banane',                       brand: 'Frisch',icon: 'banana',     color: '#C7AC5F',  per: 1,   unit: 'Stück',   energy: 105, protein: 1,  fat: 0,  carb: 27, fav: true  },
  { id: 'chicken', name: 'Hähnchenbrust gegrillt',       brand: 'Frisch',icon: 'drumstick',  color: '#B58F63',  per: 100, unit: 'g',       energy: 165, protein: 31, fat: 4,  carb: 0,  fav: false },
  { id: 'rice',    name: 'Reis gekocht',                 brand: 'Basis', icon: 'wheat',      color: '#B0A47E',  per: 100, unit: 'g',       energy: 130, protein: 3,  fat: 0,  carb: 28, fav: false },
  { id: 'eggs',    name: 'Eier',                         brand: 'Frisch',icon: 'egg',        color: '#BFB284',  per: 1,   unit: 'Stück',   energy: 78,  protein: 6,  fat: 5,  carb: 1,  fav: false },
  { id: 'yogurt',  name: 'Skyr Natur',                   brand: 'Milbona',icon: 'milk',      color: '#C9C7BE',  per: 100, unit: 'g',       energy: 63,  protein: 11, fat: 0,  carb: 4,  fav: false },
  { id: 'oats',    name: 'Haferflocken',                 brand: 'Kölln', icon: 'wheat',      color: '#B0A47E',  per: 100, unit: 'g',       energy: 372, protein: 13, fat: 7,  carb: 60, fav: false },
  { id: 'almond',  name: 'Mandeln',                      brand: 'Snack', icon: 'nut',        color: '#AE9070',  per: 30,  unit: 'g',       energy: 173, protein: 6,  fat: 15, carb: 6,  fav: false },
  { id: 'apple',   name: 'Apfel',                        brand: 'Frisch',icon: 'apple',      color: '#7C9E85',  per: 1,   unit: 'Stück',   energy: 95,  protein: 0,  fat: 0,  carb: 25, fav: false },
  { id: 'salmon',  name: 'Lachsfilet',                   brand: 'Frisch',icon: 'fish',       color: '#C08268',  per: 100, unit: 'g',       energy: 208, protein: 20, fat: 13, carb: 0,  fav: false },
  { id: 'coffee',  name: 'Kaffee mit Milch',             brand: 'Basis', icon: 'coffee',     color: '#A3865F',  per: 1,   unit: 'Tasse',   energy: 42,  protein: 2,  fat: 2,  carb: 4,  fav: false },
  { id: 'choc',    name: 'Zartbitterschokolade',         brand: 'Lindt', icon: 'candy',      color: '#96755A',  per: 30,  unit: 'g',       energy: 160, protein: 2,  fat: 11, carb: 13, fav: false },
];

const RECIPES_SEED = [
  { id: 'r1', name: 'Protein Overnight Oats', items: 4, energy: 412, protein: 32, fat: 9,  carb: 52, icon: 'wheat',  color: '#B0A47E' },
  { id: 'r2', name: 'Hähnchen Reis Bowl',     items: 5, energy: 560, protein: 48, fat: 12, carb: 62, icon: 'drumstick', color: '#B58F63' },
  { id: 'r3', name: 'Skyr Beeren Bowl',       items: 3, energy: 240, protein: 22, fat: 3,  carb: 30, icon: 'milk',   color: '#C9C7BE' },
];

const DEFAULT_TARGETS = { energy: 2565, protein: 169, fat: 84, carb: 281 };
const PROGRAM_KEY = 'mf_program_v1';
const UNITS_KEY = 'mf_units_v1';
const GOAL_HISTORY_KEY = 'mf_goal_history_v1';
const DEFAULT_PROGRAM = {
  mode: 'coached',
  macroStyle: 'balanced',
  caloriePattern: 'weekdayWeekend',
};
const DEFAULT_UNITS = { weight: 'kg' };
const KG_TO_LB = 2.2046226218;

/* ---- date helpers --------------------------------------- */
const pad = n => String(n).padStart(2, '0');
const localISO = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const TODAY = localISO();

/* ---- icon / colour heuristic for DB-loaded foods -------- */
const ICON_RULES = [
  [/müsli|cereal|granola|knusper/i, 'utensils', '#6E9A94'],
  [/banane|banana/i,                'banana',   '#C7AC5F'],
  [/ei(er)?\b|egg/i,                'egg',      '#BFB284'],
  [/reis|rice/i,                    'wheat',    '#B0A47E'],
  [/hafer|oat/i,                    'wheat',    '#B0A47E'],
  [/skyr|joghurt|yogurt|milch|milk|quark|pro \d/i, 'milk', '#C9C7BE'],
  [/hähnchen|huhn|chicken|pute/i,   'drumstick','#B58F63'],
  [/lachs|fisch|salmon|fish/i,      'fish',     '#C08268'],
  [/apfel|apple/i,                  'apple',    '#7C9E85'],
  [/mandel|nuss|nut|almond/i,       'nut',      '#AE9070'],
  [/kaffee|coffee/i,                'coffee',   '#A3865F'],
  [/schoko|chocolate|candy|süß/i,   'candy',    '#96755A'],
  [/kartoffel|potato|pommes/i,      'utensils', '#B58F63'],
  [/empanada|borito|burrito|wrap/i, 'drumstick','#B58F63'],
];
function iconForName(name = '') {
  for (const [re, icon] of ICON_RULES) if (re.test(name)) return icon;
  return 'utensils';
}
function colorForName(name = '') {
  for (const [re, , color] of ICON_RULES) if (re.test(name)) return color;
  return MF.teal;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = v => typeof v === 'string' && UUID_RE.test(v);
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : 'e' + Date.now() + Math.random().toString(16).slice(2));

function hhmmFromTs(ts) {
  if (!ts) return '12:00';
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function tsFor(loggedOn, time) {
  // interpret loggedOn + HH:MM in local time, store as ISO
  const t = /^\d{1,2}:\d{2}$/.test(time || '') ? time : '12:00';
  return new Date(`${loggedOn}T${t.padStart(5, '0')}:00`).toISOString();
}
function mealForTime(time) {
  const h = parseInt((time || '12').split(':')[0], 10);
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}
function initials(s = '') {
  const t = String(s).trim();
  if (!t) return 'MF';
  const parts = t.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}
const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function fmtMemberSince(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.getDate() + '. ' + MONTHS_DE[d.getMonth()] + ' ' + d.getFullYear();
}

/* ---- row <-> entry mapping ------------------------------ */
function rowToEntry(r) {
  const ui = (r.micros && r.micros._ui) || {};
  return {
    id: r.id,
    foodId: ui.foodId || r.food_id || 'db',
    name: r.name,
    time: ui.time || hhmmFromTs(r.created_at),
    qty: ui.qty != null ? ui.qty : (r.qty_g != null ? Number(r.qty_g) : 1),
    unit: ui.unit || (r.qty_g != null ? 'g' : 'serving'),
    icon: ui.icon || iconForName(r.name),
    color: ui.color || colorForName(r.name),
    energy: Math.round(Number(r.kcal) || 0),
    protein: Math.round(Number(r.protein_g) || 0),
    fat: Math.round(Number(r.fat_g) || 0),
    carb: Math.round(Number(r.carbs_g) || 0),
  };
}
function entryToRow(entry, userId, loggedOn) {
  return {
    id: isUuid(entry.id) ? entry.id : newId(),
    user_id: userId,
    logged_on: loggedOn,
    meal: mealForTime(entry.time),
    food_id: isUuid(entry.foodId) ? entry.foodId : null,
    name: entry.name,
    qty_g: typeof entry.qty === 'number' && entry.unit === 'g' ? entry.qty : null,
    kcal: entry.energy, protein_g: entry.protein, carbs_g: entry.carb, fat_g: entry.fat,
    source: entry.foodId === 'quick' ? 'manual' : 'search',
    created_at: tsFor(loggedOn, entry.time),
    micros: { _ui: { time: entry.time, unit: entry.unit, icon: entry.icon, color: entry.color, foodId: entry.foodId, qty: entry.qty } },
  };
}

/* ---- recipes (local only; no nutrition recipes table) --- */
const RECIPES_KEY = 'mf_recipes_v1';
function loadRecipesLocal() {
  try { const s = localStorage.getItem(RECIPES_KEY); if (s) return JSON.parse(s); } catch (e) {}
  return RECIPES_SEED;
}
function saveRecipesLocal(recipes) {
  try { localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes)); } catch (e) {}
}
function loadProgramLocal() {
  try {
    const s = localStorage.getItem(PROGRAM_KEY);
    if (s) return { ...DEFAULT_PROGRAM, ...JSON.parse(s) };
  } catch (e) {}
  return { ...DEFAULT_PROGRAM };
}
function saveProgramLocal(program) {
  try { localStorage.setItem(PROGRAM_KEY, JSON.stringify({ ...DEFAULT_PROGRAM, ...program })); } catch (e) {}
}
function loadUnitsLocal() {
  try {
    const s = localStorage.getItem(UNITS_KEY);
    if (s) return { ...DEFAULT_UNITS, ...JSON.parse(s) };
  } catch (e) {}
  return { ...DEFAULT_UNITS };
}
function saveUnitsLocal(units) {
  try { localStorage.setItem(UNITS_KEY, JSON.stringify({ ...DEFAULT_UNITS, ...units })); } catch (e) {}
}
function loadGoalHistoryLocal() {
  try {
    const s = localStorage.getItem(GOAL_HISTORY_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {}
  return [];
}
function saveGoalHistoryLocal(history) {
  try { localStorage.setItem(GOAL_HISTORY_KEY, JSON.stringify((history || []).slice(0, 6))); } catch (e) {}
}

/* ---- skeleton (loading / error fallback) ---------------- */
function skeletonState() {
  return {
    onboarded: true,
    profile: { name: '', initials: 'MF', memberSince: fmtMemberSince() },
    goal: { type: 'gain', targetWeight: 75, rateKgPerWeek: 0.21 },
    goalHistory: loadGoalHistoryLocal(),
    program: loadProgramLocal(),
    units: loadUnitsLocal(),
    targets: { ...DEFAULT_TARGETS },
    selectedDate: TODAY,
    days: {},
    weights: [],
    recipes: RECIPES_SEED,
  };
}
function defaultState() { return skeletonState(); }

function isDevDemoMode() {
  return Boolean(import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo'));
}

function demoNutritionEntry(key, totals, i) {
  return {
    id: `demo-${key}`,
    foodId: `demo-day-${i}`,
    name: 'Nutrition Day',
    time: '14:00',
    qty: 1,
    unit: 'day',
    icon: 'utensils',
    color: MF.teal,
    energy: totals.energy,
    protein: totals.protein,
    fat: totals.fat,
    carb: totals.carb,
  };
}

function demoState() {
  const base = skeletonState();
  const keys = dateRangeBack(TODAY, 7);
  const weekTotals = [
    { energy: 2825, protein: 160, fat: 95,  carb: 318 },
    { energy: 2120, protein: 78,  fat: 24,  carb: 176 },
    { energy: 2805, protein: 146, fat: 87,  carb: 296 },
    { energy: 3180, protein: 170, fat: 124, carb: 332 },
    { energy: 2820, protein: 150, fat: 88,  carb: 298 },
    { energy: 3717, protein: 152, fat: 208, carb: 312 },
    { energy: 1480, protein: 18,  fat: 18,  carb: 126 },
  ];
  const days = {};
  keys.forEach((key, i) => {
    days[key] = { entries: [demoNutritionEntry(key, weekTotals[i], i)] };
  });
  return {
    ...base,
    profile: { name: 'MF Demo', initials: 'MF', memberSince: fmtMemberSince() },
    targets: { energy: 2821, protein: 169, fat: 96, carb: 319 },
    selectedDate: keys[5] || TODAY,
    days,
    weights: keys.map((date, i) => ({ date, value: 78.4 + i * 0.02, bf: null })),
  };
}

/* ---- load everything for a user ------------------------- */
async function loadState(user) {
  const uid = user.id;
  const [profRes, logsRes, weightsRes, progRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
    supabase.from('food_logs').select('*').eq('user_id', uid),
    supabase.from('weight_logs').select('*').eq('user_id', uid).order('logged_on', { ascending: true }),
    supabase.from('nutrition_programs').select('*').eq('user_id', uid).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  let prof = profRes.data;
  if (!prof && !profRes.error) {
    const display = (user.email || '').split('@')[0] || 'Me';
    const ins = await supabase.from('profiles').insert({ id: uid, display_name: display }).select('*').maybeSingle();
    prof = ins.data || { id: uid, display_name: display, onboarding_completed: false };
  }
  const program = progRes.data;

  let targets;
  if (prof && prof.target_kcal != null) {
    targets = { energy: prof.target_kcal, protein: prof.target_protein_g ?? DEFAULT_TARGETS.protein,
                fat: prof.target_fat_g ?? DEFAULT_TARGETS.fat, carb: prof.target_carbs_g ?? DEFAULT_TARGETS.carb };
  } else if (program && program.kcal_target != null) {
    targets = { energy: program.kcal_target, protein: program.protein_g ?? DEFAULT_TARGETS.protein,
                fat: program.fat_g ?? DEFAULT_TARGETS.fat, carb: program.carbs_g ?? DEFAULT_TARGETS.carb };
  } else {
    targets = { ...DEFAULT_TARGETS };
  }

  const days = {};
  for (const r of logsRes.data || []) {
    const k = r.logged_on;
    (days[k] || (days[k] = { entries: [] })).entries.push(rowToEntry(r));
  }
  Object.values(days).forEach(d => d.entries.sort((a, b) => a.time.localeCompare(b.time)));

  const weights = (weightsRes.data || []).map(w => ({
    date: w.logged_on, value: Number(w.weight_kg),
    bf: w.body_fat_pct != null ? Number(w.body_fat_pct) : null,
  }));

  const profile = {
    name: (prof && prof.display_name) || (user.email || '').split('@')[0] || 'Me',
    initials: initials((prof && prof.display_name) || user.email),
    memberSince: fmtMemberSince(prof && prof.created_at),
  };

  return {
    onboarded: prof ? prof.onboarding_completed !== false : true,
    profile, targets,
    goalHistory: loadGoalHistoryLocal(),
    program: loadProgramLocal(),
    units: loadUnitsLocal(),
    // Always open on today (like MacroFactor). Jumping to the last logged day made
    // the dashboard's current-week chart look empty/inconsistent whenever the last
    // entry wasn't in the current week.
    selectedDate: TODAY,
    days, weights,
    recipes: loadRecipesLocal(),
  };
}

/* ---- pure reducer (local state) ------------------------- */
function reducer(state, action) {
  switch (action.type) {
    case 'ONBOARD': {
      const goalHistory = action.goal && state.goal
        ? [{ ...state.goal, endedOn: TODAY }, ...(state.goalHistory || [])].slice(0, 6)
        : (state.goalHistory || []);
      return { ...state, onboarded: true,
        profile: { ...state.profile, ...action.profile },
        goal: action.goal || state.goal,
        goalHistory,
        program: action.program || state.program,
        units: action.units || state.units,
        targets: action.targets || state.targets };
    }
    case 'SET_DATE': return { ...state, selectedDate: action.date };
    case 'LOG_FOOD': {
      const d = action.date || state.selectedDate;
      const day = state.days[d] || { entries: [] };
      const entry = { ...action.entry };
      const entries = [...day.entries, entry].sort((a, b) => a.time.localeCompare(b.time));
      return { ...state, days: { ...state.days, [d]: { entries } } };
    }
    case 'DELETE_ENTRY': {
      const d = action.date || state.selectedDate;
      const day = state.days[d] || { entries: [] };
      return { ...state, days: { ...state.days,
        [d]: { entries: day.entries.filter(e => e.id !== action.id) } } };
    }
    case 'ADD_WEIGHT': {
      const others = state.weights.filter(w => w.date !== action.date);
      return { ...state, weights: [...others, { date: action.date, value: action.value, bf: action.bf ?? null }]
        .sort((a, b) => a.date.localeCompare(b.date)) };
    }
    case 'SET_TARGETS': return { ...state, targets: { ...state.targets, ...action.targets } };
    case 'SET_PROGRAM': return { ...state, program: { ...DEFAULT_PROGRAM, ...state.program, ...action.program } };
    case 'SET_UNITS': return { ...state, units: { ...DEFAULT_UNITS, ...state.units, ...action.units } };
    case 'REOPEN_PREVIOUS_GOAL': {
      const [previous, ...rest] = state.goalHistory || [];
      if (!previous) return state;
      return { ...state, goal: previous, goalHistory: rest };
    }
    case 'ADD_RECIPE': return { ...state, recipes: [action.recipe, ...state.recipes] };
    default: return state;
  }
}

/* ---- persistence side-effects --------------------------- */
async function persist(action, prev, next, uid) {
  if (action.type === 'ADD_RECIPE') saveRecipesLocal(next.recipes);
  if (action.type === 'SET_PROGRAM') saveProgramLocal(next.program);
  if (action.type === 'SET_UNITS') saveUnitsLocal(next.units);
  if (action.type === 'ONBOARD') saveProgramLocal(next.program);
  if (action.type === 'ONBOARD') saveUnitsLocal(next.units);
  if (action.type === 'ONBOARD' || action.type === 'REOPEN_PREVIOUS_GOAL') saveGoalHistoryLocal(next.goalHistory);
  if (!uid) return;
  try {
    switch (action.type) {
      case 'LOG_FOOD': {
        const d = action.date || prev.selectedDate;
        const row = entryToRow(action.entry, uid, d);
        action.entry.id = row.id; // keep local id in sync (already set before reduce)
        await supabase.from('food_logs').insert(row);
        break;
      }
      case 'DELETE_ENTRY':
        await supabase.from('food_logs').delete().eq('id', action.id).eq('user_id', uid);
        break;
      case 'ADD_WEIGHT':
        await supabase.from('weight_logs').delete().eq('user_id', uid).eq('logged_on', action.date);
        await supabase.from('weight_logs').insert({
          user_id: uid, logged_on: action.date, weight_kg: action.value,
          body_fat_pct: action.bf ?? null, source: 'manual',
        });
        break;
      case 'SET_TARGETS':
        await supabase.from('profiles').upsert({
          id: uid, target_kcal: next.targets.energy, target_protein_g: next.targets.protein,
          target_fat_g: next.targets.fat, target_carbs_g: next.targets.carb,
        });
        break;
      case 'ONBOARD':
        await supabase.from('profiles').upsert({
          id: uid,
          display_name: next.profile.name,
          target_kcal: next.targets.energy, target_protein_g: next.targets.protein,
          target_fat_g: next.targets.fat, target_carbs_g: next.targets.carb,
          onboarding_completed: true,
        });
        break;
      case 'ADD_RECIPE':
        saveRecipesLocal(next.recipes);
        break;
      default: break;
    }
  } catch (e) {
    console.error('[supabase persist failed]', action.type, e);
  }
}

/* ---- Context + provider --------------------------------- */
const AppCtx = React.createContext(null);

function AppProvider({ children }) {
  const [state, setState] = React.useState(null); // null => loading
  const userRef = React.useRef(null);
  const stateRef = React.useRef(null);
  stateRef.current = state;

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (isDevDemoMode()) {
        if (alive) setState(demoState());
        return;
      }
      const { data } = await supabase.auth.getUser();
      const user = data && data.user;
      userRef.current = user;
      if (!user) { if (alive) setState(skeletonState()); return; }
      try {
        const s = await loadState(user);
        if (alive) setState(s);
      } catch (e) {
        console.error('[loadState failed]', e);
        if (alive) setState(skeletonState());
      }
    })();
    return () => { alive = false; };
  }, []);

  const dispatch = React.useCallback((action) => {
    if (action.type === 'RESET') {
      if (isDevDemoMode()) {
        setState(demoState());
        return;
      }
      const user = userRef.current;
      if (user) loadState(user).then(s => setState(s)).catch(() => setState(skeletonState()));
      return;
    }
    if (action.type === 'LOG_FOOD' && action.entry && !action.entry.id) {
      action.entry.id = newId();
    }
    const prev = stateRef.current;
    const next = reducer(prev, action);
    stateRef.current = next;
    setState(next);
    persist(action, prev, next, userRef.current && userRef.current.id);
  }, []);

  if (state === null) {
    return (
      <div className="mf-loading">
        <div className="mf-loading-mark">MF</div>
      </div>
    );
  }
  return <AppCtx.Provider value={{ state, dispatch }}>{children}</AppCtx.Provider>;
}

function useApp() { return React.useContext(AppCtx); }

/* ---- Selectors / helpers -------------------------------- */
function dayTotals(state, date) {
  const day = state.days[date || state.selectedDate] || { entries: [] };
  return day.entries.reduce((t, e) => ({
    energy: t.energy + e.energy, protein: t.protein + e.protein,
    fat: t.fat + e.fat, carb: t.carb + e.carb,
  }), { energy: 0, protein: 0, fat: 0, carb: 0 });
}

function scaleFood(food, qty) {
  const f = qty / food.per;
  return {
    energy: Math.round(food.energy * f), protein: Math.round(food.protein * f),
    fat: Math.round(food.fat * f), carb: Math.round(food.carb * f),
  };
}

function latestWeight(state) {
  return state.weights.length ? state.weights[state.weights.length - 1].value : null;
}
function weightUnit(state) {
  return (state.units && state.units.weight === 'lb') ? 'lb' : 'kg';
}
function weightDisplayValue(state, kg, decimals = 1) {
  if (kg == null || kg === '–' || kg === '-') return '–';
  const value = Number(kg);
  if (!Number.isFinite(value)) return '–';
  const shown = weightUnit(state) === 'lb' ? value * KG_TO_LB : value;
  return Number(shown.toFixed(decimals));
}
function weightDisplayText(state, kg, decimals = 1) {
  const v = weightDisplayValue(state, kg, decimals);
  return v === '–' ? v : v.toFixed ? v.toFixed(decimals) : String(v);
}
function weightInputToKg(state, value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return weightUnit(state) === 'lb' ? Number((n / KG_TO_LB).toFixed(2)) : n;
}

function addDaysISO(key, days) {
  const d = new Date((key || TODAY) + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return localISO(d);
}

function dateRangeBack(endKey = TODAY, count = 7) {
  return Array.from({ length: count }, (_, i) => addDaysISO(endKey, i - count + 1));
}

function roundToFive(v) {
  return Math.round(v / 5) * 5;
}

function nutritionLoggedOn(state, key) {
  const entries = ((state.days[key] || {}).entries) || [];
  return entries.some(e => Number(e.energy) > 0 || Number(e.protein) > 0 || Number(e.fat) > 0 || Number(e.carb) > 0);
}

function latestLoggedNutritionDate(days, fallback = TODAY) {
  const dates = Object.keys(days || {})
    .filter(k => k <= fallback)
    .filter(k => (((days[k] || {}).entries) || []).some(e =>
      Number(e.energy) > 0 || Number(e.protein) > 0 || Number(e.fat) > 0 || Number(e.carb) > 0
    ))
    .sort();
  return dates[dates.length - 1] || fallback;
}

function recentNutritionDays(state, endKey = TODAY, count = 7) {
  return dateRangeBack(endKey, count).filter(k => nutritionLoggedOn(state, k));
}

function latestWeightDate(state) {
  return state.weights.length ? state.weights[state.weights.length - 1].date : null;
}

function hasRecentWeight(state, endKey = TODAY, count = 7) {
  const keys = new Set(dateRangeBack(endKey, count));
  return state.weights.some(w => keys.has(w.date));
}

function weightValueOn(state, key) {
  const hit = state.weights.find(w => w.date === key);
  return hit ? hit.value : null;
}

function interpolatedWeightSeries(weights, keys) {
  const sorted = [...(weights || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return [];
  return keys.map(key => {
    const exact = sorted.find(w => w.date === key);
    if (exact) return exact.value;
    const before = [...sorted].reverse().find(w => w.date < key);
    const after = sorted.find(w => w.date > key);
    if (!before && !after) return null;
    if (!before) return after.value;
    if (!after) return before.value;
    const start = new Date(before.date + 'T00:00:00');
    const end = new Date(after.date + 'T00:00:00');
    const cur = new Date(key + 'T00:00:00');
    const span = Math.max(1, (end - start) / 86400000);
    const t = (cur - start) / 86400000 / span;
    return before.value + (after.value - before.value) * t;
  }).filter(v => Number.isFinite(v));
}

function trendWeights(state, endKey = TODAY, count = 21) {
  const raw = interpolatedWeightSeries(state.weights, dateRangeBack(endKey, count));
  if (!raw.length) return [];
  const alpha = 0.28;
  const trend = [];
  raw.forEach((v, i) => {
    trend.push(i === 0 ? v : trend[i - 1] * (1 - alpha) + v * alpha);
  });
  return trend.map(v => Math.round(v * 10) / 10);
}

function currentTrendWeight(state, endKey = TODAY) {
  const vals = trendWeights(state, endKey, 21);
  return vals.length ? vals[vals.length - 1] : latestWeight(state);
}

function estimateExpenditure(state, endKey = TODAY, count = 21) {
  const keys = dateRangeBack(endKey, count);
  const nutritionKeys = keys.filter(k => nutritionLoggedOn(state, k));
  const trend = trendWeights(state, endKey, count);
  if (nutritionKeys.length < 4 || trend.length < 2) return null;

  const kcal = nutritionKeys.reduce((sum, k) => sum + dayTotals(state, k).energy, 0) / nutritionKeys.length;
  const days = Math.max(1, trend.length - 1);
  const kgPerDay = (trend[trend.length - 1] - trend[0]) / days;
  return Math.round(kcal - kgPerDay * 7700);
}

function checkInReadiness(state, endKey = TODAY) {
  const nutritionDays = recentNutritionDays(state, endKey, 7);
  const recentWeight = hasRecentWeight(state, endKey, 7);
  return {
    nutritionDays: nutritionDays.length,
    nutritionKeys: nutritionDays,
    hasRecentWeight: recentWeight,
    latestWeightDate: latestWeightDate(state),
    latestWeight: latestWeight(state),
    ready: nutritionDays.length >= 4 && recentWeight,
  };
}

/* ---- Program → per-day target propagation ----------------
   Single source of truth for the Strategy program math. The weekly sum is
   preserved: patternEnergy distributes targets.energy across the week
   (weekday/weekend or fasting days), styleTargets derives the macro split.
   Every screen that shows a day's goal should use targetsForDate(). */
function patternEnergy(base, pattern, dayIndex) {
  if (pattern === 'fasting') {
    const low = roundToFive(base * 0.65);
    const high = roundToFive((base * 7 - low * 2) / 5);
    return dayIndex === 1 || dayIndex === 4 ? low : high;
  }
  if (pattern === 'weekdayWeekend') {
    const weekend = roundToFive(base * 1.10);
    const weekday = roundToFive((base * 7 - weekend * 2) / 5);
    return dayIndex >= 5 ? weekend : weekday;
  }
  return base; // sameDaily
}
function styleTargets(baseTargets, style, energy) {
  const protein = Math.max(1, Math.round(baseTargets.protein));
  if (style === 'keto') {
    const carb = 30;
    const fat = Math.max(35, Math.round((energy - protein * 4 - carb * 4) / 9));
    return { energy, protein, fat, carb };
  }
  const fatPct = style === 'lowCarb' ? 0.36 : style === 'carbFocused' ? 0.20 : 0.27;
  const fat = Math.max(35, Math.round((energy * fatPct) / 9));
  const carb = Math.max(0, Math.round((energy - protein * 4 - fat * 9) / 4));
  return { energy, protein, fat, carb };
}
function programDayTargets(baseTargets, program, dayIndex) {
  const p = { ...DEFAULT_PROGRAM, ...(program || {}) };
  const energy = patternEnergy(baseTargets.energy, p.caloriePattern, dayIndex);
  // Keep the user's own macro split whenever this day runs on the base
  // energy with the balanced style — only derive a split when the program
  // actually shifts the day.
  if (energy === baseTargets.energy && p.macroStyle === 'balanced') return { ...baseTargets };
  return styleTargets(baseTargets, p.macroStyle, energy);
}
function programColsFor(targets, program) {
  return Array.from({ length: 7 }).map((_, i) => programDayTargets(targets, program, i));
}
function targetsForDate(state, dateKey) {
  const key = dateKey || state.selectedDate || TODAY;
  const dow = (new Date(key + 'T00:00:00').getDay() + 6) % 7; // 0=Mon … 6=Sun
  return programDayTargets(state.targets, state.program, dow);
}

function macroTargetsFromEnergy(energy, currentTargets = DEFAULT_TARGETS) {
  const protein = Math.max(1, Math.round(currentTargets.protein || DEFAULT_TARGETS.protein));
  const fat = Math.max(35, Math.round((energy * 0.27) / 9));
  const carb = Math.max(0, Math.round((energy - protein * 4 - fat * 9) / 4));
  return { energy, protein, fat, carb };
}

function computeCheckInRecommendation(state, endKey = TODAY) {
  const readiness = checkInReadiness(state, endKey);
  const expenditure = estimateExpenditure(state, endKey, 21);
  const trend = currentTrendWeight(state, endKey);
  const goal = state.goal || { type: 'gain', rateKgPerWeek: 0.21 };
  const rate = Math.abs(goal.rateKgPerWeek ?? 0.21);
  const goalDelta = goal.type === 'lose' ? -(rate * 7700 / 7)
    : goal.type === 'gain' ? (rate * 7700 / 7)
    : 0;

  if (!readiness.ready || !expenditure) {
    return {
      ready: false,
      readiness,
      expenditure,
      trend,
      targets: { ...state.targets },
      deltaEnergy: 0,
      reason: !readiness.hasRecentWeight
        ? 'Logge zuerst ein aktuelles Gewicht, damit der Check-In deinen Trend aktualisieren kann.'
        : readiness.nutritionDays < 4
          ? 'Es wurden weniger als 4 Nutrition-Tage in den letzten 7 Tagen geloggt. MacroFactor hält Updates dann an.'
          : 'Es gibt noch nicht genug Trenddaten für eine sinnvolle Zielanpassung.',
    };
  }

  const desired = roundToFive(expenditure + goalDelta);
  const prev = state.targets.energy;
  const limited = Math.max(prev - 150, Math.min(prev + 150, desired));
  const energy = roundToFive(limited);
  return {
    ready: true,
    readiness,
    expenditure,
    trend,
    targets: macroTargetsFromEnergy(energy, state.targets),
    deltaEnergy: energy - prev,
    desiredEnergy: desired,
    reason: 'Empfehlung aus Gewichtstrend, geloggter Energiezufuhr und Zielrate.',
  };
}

Object.assign(window, {
  MF, MACRO_META, FOOD_DB, RECIPES_SEED, TODAY,
  DEFAULT_PROGRAM,
  AppProvider, useApp, dayTotals, scaleFood, latestWeight, defaultState,
  addDaysISO, dateRangeBack, nutritionLoggedOn, latestLoggedNutritionDate, recentNutritionDays,
  latestWeightDate, hasRecentWeight, weightValueOn, weightUnit,
  weightDisplayValue, weightDisplayText, weightInputToKg, trendWeights,
  currentTrendWeight, estimateExpenditure, checkInReadiness,
  computeCheckInRecommendation,
  patternEnergy, styleTargets, programDayTargets, programColsFor, targetsForDate,
});
