/* ============================================================
   MacroFactor UI Kit — App State Store
   Context + reducer, sample data, localStorage persistence.
   Logging food / weight updates totals live across screens.
   ============================================================ */

const MF = {
  energy:  '#4A78F0', protein: '#EF6A45', fat: '#F2BE3F',
  carb:    '#57B36E', purple:  '#9B7FE8', teal: '#2BA89F',
};

/* Macro meta (order matters for rendering) */
const MACRO_META = [
  { key: 'energy',  letter: '🔥', unit: '',  color: MF.energy,  goalKey: 'energy'  },
  { key: 'protein', letter: 'P',  unit: 'P', color: MF.protein, goalKey: 'protein' },
  { key: 'fat',     letter: 'F',  unit: 'F', color: MF.fat,     goalKey: 'fat'     },
  { key: 'carb',    letter: 'C',  unit: 'C', color: MF.carb,    goalKey: 'carb'    },
];

/* Food database — values are PER the food's base serving (per/unit). */
const FOOD_DB = [
  { id: 'muesli',  name: 'Knusper Müsli Schoko By Spar', brand: 'Spar',  icon: 'utensils',   color: MF.teal,    per: 100, unit: 'g',       energy: 447, protein: 10, fat: 15, carb: 64, fav: false },
  { id: 'pro35',   name: 'Pro 35 Erdbeere By Nöm',       brand: 'Nöm',   icon: 'milk',       color: '#E8761E',  per: 350, unit: 'serving', energy: 217, protein: 35, fat: 2,  carb: 19, fav: false },
  { id: 'burrito', name: 'Bomben Borito',                brand: 'Eigen', icon: 'drumstick',  color: '#E0A45A',  per: 1,   unit: 'serving', energy: 620, protein: 38, fat: 22, carb: 58, fav: true  },
  { id: 'banana',  name: 'Banane',                       brand: 'Frisch',icon: 'banana',     color: '#F2BE3F',  per: 1,   unit: 'Stück',   energy: 105, protein: 1,  fat: 0,  carb: 27, fav: true  },
  { id: 'chicken', name: 'Hähnchenbrust gegrillt',       brand: 'Frisch',icon: 'drumstick',  color: '#E0A45A',  per: 100, unit: 'g',       energy: 165, protein: 31, fat: 4,  carb: 0,  fav: false },
  { id: 'rice',    name: 'Reis gekocht',                 brand: 'Basis', icon: 'wheat',      color: '#D8C28A',  per: 100, unit: 'g',       energy: 130, protein: 3,  fat: 0,  carb: 28, fav: false },
  { id: 'eggs',    name: 'Eier',                         brand: 'Frisch',icon: 'egg',        color: '#E9D08A',  per: 1,   unit: 'Stück',   energy: 78,  protein: 6,  fat: 5,  carb: 1,  fav: false },
  { id: 'yogurt',  name: 'Skyr Natur',                   brand: 'Milbona',icon: 'milk',      color: '#EDEDED',  per: 100, unit: 'g',       energy: 63,  protein: 11, fat: 0,  carb: 4,  fav: false },
  { id: 'oats',    name: 'Haferflocken',                 brand: 'Kölln', icon: 'wheat',      color: '#D8C28A',  per: 100, unit: 'g',       energy: 372, protein: 13, fat: 7,  carb: 60, fav: false },
  { id: 'almond',  name: 'Mandeln',                      brand: 'Snack', icon: 'nut',        color: '#C99B6E',  per: 30,  unit: 'g',       energy: 173, protein: 6,  fat: 15, carb: 6,  fav: false },
  { id: 'apple',   name: 'Apfel',                        brand: 'Frisch',icon: 'apple',      color: '#57B36E',  per: 1,   unit: 'Stück',   energy: 95,  protein: 0,  fat: 0,  carb: 25, fav: false },
  { id: 'salmon',  name: 'Lachsfilet',                   brand: 'Frisch',icon: 'fish',       color: '#EF8E6A',  per: 100, unit: 'g',       energy: 208, protein: 20, fat: 13, carb: 0,  fav: false },
  { id: 'coffee',  name: 'Kaffee mit Milch',             brand: 'Basis', icon: 'coffee',     color: '#B98A5E',  per: 1,   unit: 'Tasse',   energy: 42,  protein: 2,  fat: 2,  carb: 4,  fav: false },
  { id: 'choc',    name: 'Zartbitterschokolade',         brand: 'Lindt', icon: 'candy',      color: '#9B6B45',  per: 30,  unit: 'g',       energy: 160, protein: 2,  fat: 11, carb: 13, fav: false },
];

const RECIPES_SEED = [
  { id: 'r1', name: 'Protein Overnight Oats', items: 4, energy: 412, protein: 32, fat: 9,  carb: 52, icon: 'wheat',  color: '#D8C28A' },
  { id: 'r2', name: 'Hähnchen Reis Bowl',     items: 5, energy: 560, protein: 48, fat: 12, carb: 62, icon: 'drumstick', color: '#E0A45A' },
  { id: 'r3', name: 'Skyr Beeren Bowl',       items: 3, energy: 240, protein: 22, fat: 3,  carb: 30, icon: 'milk',   color: '#EDEDED' },
];

/* Default day key = "today" in the screenshots: Tue 2 June. */
const TODAY = '2026-06-02';

function defaultState() {
  return {
    onboarded: true,
    profile: { name: 'floriflei07', initials: 'FL', memberSince: '6. Januar 2026' },
    targets: { energy: 2505, protein: 168, fat: 82, carb: 271 },
    selectedDate: TODAY,
    days: {
      [TODAY]: { entries: [
        { id: 'e1', foodId: 'muesli', name: 'Knusper Müsli Schoko By Spar', time: '06:01',
          qty: 100, unit: 'g', icon: 'utensils', color: MF.teal,
          energy: 447, protein: 10, fat: 15, carb: 64 },
      ] },
    },
    weights: [
      { date: '2026-05-27', value: 78.4 }, { date: '2026-05-28', value: 78.4 },
      { date: '2026-05-29', value: 78.3 }, { date: '2026-05-30', value: 77.9 },
      { date: '2026-05-31', value: 77.7 }, { date: '2026-06-01', value: 77.7 },
      { date: '2026-06-02', value: 77.6 },
    ],
    recipes: RECIPES_SEED,
  };
}

/* ---- Reducer -------------------------------------------- */
function reducer(state, action) {
  switch (action.type) {
    case 'RESET': return defaultState();
    case 'ONBOARD':
      return { ...state, onboarded: true,
        profile: { ...state.profile, ...action.profile },
        targets: action.targets || state.targets };
    case 'SET_DATE': return { ...state, selectedDate: action.date };
    case 'LOG_FOOD': {
      const d = action.date || state.selectedDate;
      const day = state.days[d] || { entries: [] };
      const entry = { id: 'e' + Date.now(), ...action.entry };
      return { ...state, days: { ...state.days, [d]: { entries: [...day.entries, entry] } } };
    }
    case 'DELETE_ENTRY': {
      const d = action.date || state.selectedDate;
      const day = state.days[d] || { entries: [] };
      return { ...state, days: { ...state.days,
        [d]: { entries: day.entries.filter(e => e.id !== action.id) } } };
    }
    case 'ADD_WEIGHT': {
      const others = state.weights.filter(w => w.date !== action.date);
      return { ...state, weights: [...others, { date: action.date, value: action.value }]
        .sort((a, b) => a.date.localeCompare(b.date)) };
    }
    case 'SET_TARGETS': return { ...state, targets: { ...state.targets, ...action.targets } };
    case 'ADD_RECIPE': return { ...state, recipes: [action.recipe, ...state.recipes] };
    default: return state;
  }
}

/* ---- Context + hook ------------------------------------- */
const AppCtx = React.createContext(null);
const LS_KEY = 'mf_app_state_v1';

function AppProvider({ children }) {
  const [state, dispatch] = React.useReducer(reducer, null, () => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return { ...defaultState(), ...JSON.parse(saved) };
    } catch (e) {}
    return defaultState();
  });
  React.useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }, [state]);
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

/* Scale a food's macros to an arbitrary quantity. */
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

Object.assign(window, {
  MF, MACRO_META, FOOD_DB, RECIPES_SEED, TODAY,
  AppProvider, useApp, dayTotals, scaleFood, latestWeight, defaultState,
});
