const DEFAULT_MODEL = 'openrouter/free';
// Strongest free vision models to TRY first (ids may rotate on OpenRouter —
// any failure falls back to the verified chain below within the same request).
const CANDIDATE_VISION_MODELS = [
  'qwen/qwen2.5-vl-72b-instruct:free',
  'meta-llama/llama-4-maverick:free',
  'google/gemma-4-31b-it:free',
];
// Verified free, vision-capable OpenRouter models (verified Jun 2026), tried in order.
// `openrouter/free` is the auto-router fallback that picks any available free model.
const FREE_VISION_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'openrouter/free',
];
// Default when the request carries the user's OWN OpenRouter key: the user
// pays per call, so pick strong paid vision quality — the free chain stays
// right behind it in the same request in case the key has no credit.
const BYOK_MODEL = 'google/gemini-2.5-flash';
const MAX_IMAGE_CHARS = 5_500_000;

function number(value) {
  const n = Number(String(value ?? '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)?.[0] ?? value);
  return Math.max(0, Math.round(Number.isFinite(n) ? n : 0));
}

function text(value, fallback = '') {
  return String(value ?? fallback).replace(/\s+/g, ' ').trim();
}

function allowedModel(model) {
  const cleaned = text(model);
  if (!cleaned) return DEFAULT_MODEL;
  if (cleaned === DEFAULT_MODEL || cleaned.endsWith(':free')) return cleaned;
  return DEFAULT_MODEL;
}

// The app can send the user's own OpenRouter key as a header ("Eigener Key"
// under Mehr → Integrationen). It is stored only on the device, used for this
// one upstream call, and never persisted or logged here. Only plausible keys
// are accepted so junk can't reach the Authorization header.
function clientKey(req) {
  const k = text(req && req.headers && req.headers['x-openrouter-key']);
  return /^sk-or-[\w-]{16,220}$/.test(k) ? k : '';
}

// Build an ordered fallback list of models. The server-side OPENROUTER_MODEL env
// var is trusted and may name any (also paid) model — set it to e.g.
// "google/gemini-2.5-flash" for far better food/portion recognition than the
// free tier. When the request runs on the user's own key, the paid BYOK
// default leads instead (their key, their spend). A caller-supplied model is
// only honored if it is free (clients must not be able to run up costs on the
// server key). The curated free vision list follows so a single model outage
// or rate-limit doesn't break logging. OpenRouter walks this list until one
// responds and rejects requests with more than 3 models, so cap the chain there.
function modelChain(clientModel, hasUserKey) {
  const chain = [];
  const envModel = text(process.env.OPENROUTER_MODEL);
  if (envModel) chain.push(envModel);
  else if (hasUserKey) chain.push(BYOK_MODEL);
  const preferred = text(clientModel);
  if (preferred && (preferred === 'openrouter/free' || preferred.endsWith(':free')) && !chain.includes(preferred)) chain.push(preferred);
  for (const m of CANDIDATE_VISION_MODELS) if (!chain.includes(m)) chain.push(m);
  return chain.slice(0, 3);
}

// Last-resort chain of ids that are known-good; used when the candidate chain
// fails as a whole (e.g. a rotated/retired model id makes the request invalid).
function fallbackChain() {
  return FREE_VISION_MODELS.slice(0, 3);
}

function validImageDataUrl(value) {
  if (!value) return true;
  const s = String(value);
  return s.length <= MAX_IMAGE_CHARS && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(s);
}

function extractJsonObject(raw) {
  const cleaned = String(raw || '').replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object returned');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeFood(json, task = 'meal') {
  const isLabel = task === 'label';
  const visualGramServing =
    json.estimated_grams ??
    json.estimated_g ??
    json.portion_g ??
    json.portion_grams;
  const explicitGramServing =
    visualGramServing ??
    json.serving_g ??
    json.grams ??
    json.qty_g;
  const serving = number(explicitGramServing ?? json.per ?? json.serving ?? 1) || 1;
  const unit = explicitGramServing != null
    ? 'g'
    : (text(json.unit, serving ? 'g' : 'serving').slice(0, 12) || 'g');
  const confidenceRaw = text(json.confidence).toLowerCase();
  const confidence = ['low', 'medium', 'high'].includes(confidenceRaw) ? confidenceRaw : null;
  const items = Array.isArray(json.items)
    ? json.items
        .slice(0, 5)
        .map((it) => ({ name: text(it && it.name).slice(0, 40), grams: number(it && it.grams) }))
        .filter((it) => it.name)
    : [];
  return {
    name: text(json.name ?? json.meal ?? json.product, isLabel ? 'Scanned Label' : 'AI Meal').slice(0, 80),
    brand: text(json.brand, isLabel ? 'Nutrition Label' : visualGramServing != null ? 'AI Portion Estimate' : 'AI Estimate').slice(0, 80),
    per: serving,
    unit,
    energy: number(json.energy ?? json.kcal ?? json.calories),
    protein: number(json.protein ?? json.protein_g),
    fat: number(json.fat ?? json.fat_g),
    carb: number(json.carb ?? json.carbs ?? json.carbs_g ?? json.carbohydrates),
    fiber: number(json.fiber ?? json.fiber_g ?? json.fibre),
    sugar: number(json.sugar ?? json.sugar_g),
    confidence,
    servingLabel: text(json.serving_label ?? json.servingLabel).slice(0, 30),
    items,
  };
}

function normalizeRecipe(json) {
  const ingredients = Array.isArray(json.ingredients)
    ? json.ingredients
        .slice(0, 30)
        .map((it) => ({
          name: text(it && it.name).slice(0, 60),
          qty: Math.max(0, Number(String((it && (it.qty ?? it.amount)) ?? 0).replace(',', '.')) || 0),
          unit: text(it && it.unit).slice(0, 12),
        }))
        .filter((it) => it.name)
    : [];
  const steps = Array.isArray(json.steps)
    ? json.steps
        .filter((s) => typeof s === 'string')
        .map((s) => s.trim().slice(0, 300))
        .filter(Boolean)
        .slice(0, 15)
    : [];
  return {
    name: text(json.name ?? json.recipe, 'Imported Recipe').slice(0, 80),
    items: Math.max(1, ingredients.length || number(json.items ?? 1)),
    energy: number(json.energy ?? json.kcal ?? json.calories),
    protein: number(json.protein ?? json.protein_g),
    fat: number(json.fat ?? json.fat_g),
    carb: number(json.carb ?? json.carbs ?? json.carbs_g ?? json.carbohydrates),
    ingredients,
    steps,
  };
}

/* Day-planner proposals: the model only PICKS candidate ids and portion
   quantities — it never returns nutrition numbers. The client recomputes
   all macros from its own candidate pool and re-balances portions. */
function normalizePlan(json) {
  const raw = Array.isArray(json.meals) ? json.meals : Array.isArray(json.plan) ? json.plan : [];
  const meals = raw
    .slice(0, 6)
    .map((m) => ({
      id: text(m && (m.id ?? m.candidate ?? m.food)).slice(0, 80),
      qty: Math.max(0, Number(m && (m.qty ?? m.quantity ?? m.grams)) || 0),
    }))
    .filter((m) => m.id && m.qty > 0);
  return { meals };
}

function promptFor(task, userText) {
  const base = [
    'Return only a compact JSON object.',
    'Use kcal for energy and grams for protein, fat, carb.',
    'Use integer values. Do not include markdown.',
  ].join(' ');

  if (task === 'label') {
    return [
      'Read the nutrition label or product package in the image/text.',
      'Return keys: name, brand, serving_g, unit, energy, protein, fat, carb.',
      'Prefer values per serving when visible; otherwise use per 100g.',
      base,
      `Context: ${userText || 'photo only'}`,
    ].join(' ');
  }

  if (task === 'recipe') {
    return [
      'Extract the recipe from this URL/text content.',
      'Return keys: name, energy, protein, fat, carb (nutrition totals),',
      'ingredients (array of {"name","qty","unit"} — unit one of g, ml, EL, TL, Stück, Prise, Dose, Packung, Bund; qty 0 if unknown),',
      'and steps (array of short German cooking instructions in order, max 12).',
      'Keep ingredient names in German where the source is German.',
      'If only per-serving data is available, return that serving.',
      base,
      `Context: ${userText}`,
    ].join(' ');
  }

  if (task === 'plan') {
    return [
      'You are a meal planner for a macro tracking app.',
      'The context JSON contains: goal (kcal_max hard limit, protein_min, fat_target, carb_target),',
      'mode, avoid (dish names to skip), and candidates',
      '(lines of "id | name | portion | macros per portion").',
      'Pick 2-4 items ONLY from the candidate list that together make realistic meals for the rest of the day:',
      'stay under kcal_max, reach protein_min first, prefer dishes over single ingredients, vary the picks.',
      'qty semantics: for candidates whose portion is in g or ml, qty = grams/ml; otherwise qty = number of portions.',
      'Return ONLY JSON: {"meals":[{"id":"<candidate id>","qty":<number>}]}.',
      'Do NOT invent ids. Do NOT return any nutrition numbers or totals.',
      `Context: ${userText}`,
    ].join(' ');
  }

  return [
    'You are a nutrition estimation engine for a food tracking app.',
    'Identify the food or meal from the image and/or text, then estimate the edible portion size in grams YOURSELF',
    'using visual cues: plate (~26 cm) or bowl size, cutlery, hands, packaging, typical serving sizes.',
    'Never ask the user for the amount — always commit to one realistic best estimate.',
    'If the user states an amount, convert it to grams. If a nutrition label is visible, read it.',
    'Return keys:',
    'name (short dish name in German, e.g. "Hähnchen mit Reis und Gemüse"),',
    'estimated_grams (integer, total edible portion),',
    'energy (kcal for the WHOLE portion), protein, carb, fat (grams for the WHOLE portion),',
    'fiber, sugar (grams for the whole portion, best estimate),',
    'confidence ("low", "medium" or "high" — how certain identification AND portion size are),',
    'serving_label (short German label when the portion is countable, e.g. "6 Scheiben", "2 Eier", "1 Teller", else ""),',
    'items (array of the main components as {"name": string, "grams": integer}, max 5, [] if a single food).',
    'Typical cooked portions for sanity: rice/pasta side 150-250g, meat 120-220g, full restaurant plate 350-550g.',
    base,
    `Context: ${userText || 'photo only'}`,
  ].join(' ');
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function requestChat({ models, content, apiKey }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://mf-nutrition.vercel.app',
      'X-Title': 'MF Nutrition PWA',
    },
    body: JSON.stringify({
      // Send an ordered free-model fallback list. response_format is intentionally
      // omitted: several free vision models reject json_object mode outright, which
      // was the main cause of "photo analysis sometimes does nothing". The prompt
      // demands raw JSON and extractJsonObject() strips any markdown fences.
      models,
      messages: [{ role: 'user', content }],
      temperature: 0.1,
      max_tokens: 900,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error?.message || `OpenRouter request failed (${response.status})`);
    err.statusCode = response.status;
    throw err;
  }
  return extractJsonObject(data.choices?.[0]?.message?.content || '');
}

async function callOpenRouter({ task, text: userText, imageData, model, userKey }) {
  // Der mitgeschickte eigene Key gewinnt: bewusste Entscheidung des Nutzers,
  // und die Abrechnung landet genau auf dem Account, den er gewählt hat.
  const apiKey = userKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const err = new Error('Kein KI-Key konfiguriert. Eigenen OpenRouter-Key unter Mehr → Integrationen hinterlegen.');
    err.statusCode = 500;
    throw err;
  }

  const content = [{ type: 'text', text: promptFor(task, userText) }];
  if (imageData) content.push({ type: 'image_url', image_url: { url: imageData } });

  // Strong candidates first; if the whole request fails (retired model id,
  // rate limit across the chain, …) retry once with the verified chain.
  const primary = modelChain(model, !!userKey);
  const fallback = fallbackChain();
  try {
    return await requestChat({ models: primary, content, apiKey });
  } catch (err) {
    if (JSON.stringify(primary) === JSON.stringify(fallback)) throw err;
    return requestChat({ models: fallback, content, apiKey });
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await readBody(req);
    const task = ['meal', 'label', 'recipe', 'plan'].includes(body.task) ? body.task : 'meal';
    const userText = text(body.text).slice(0, task === 'recipe' ? 16_000 : task === 'plan' ? 8_000 : 2_000);
    const imageData = body.imageData ? String(body.imageData) : '';

    if (!userText && !imageData) return res.status(400).json({ error: 'Text or image is required' });
    if (!validImageDataUrl(imageData)) return res.status(400).json({ error: 'Image must be a PNG, JPEG, WebP, or GIF data URL under 5.5MB' });

    const json = await callOpenRouter({ task, text: userText, imageData, model: body.model, userKey: clientKey(req) });
    const payload = task === 'recipe'
      ? { recipe: normalizeRecipe(json), raw: json }
      : task === 'plan'
        ? { plan: normalizePlan(json), raw: json }
        : { food: normalizeFood(json, task), raw: json };
    return res.status(200).json(payload);
  } catch (error) {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    return res.status(status).json({ error: error.message || 'Analysis failed' });
  }
}

module.exports = {
  BYOK_MODEL,
  DEFAULT_MODEL,
  allowedModel,
  callOpenRouter,
  clientKey,
  extractJsonObject,
  handler,
  modelChain,
  normalizeFood,
  normalizeRecipe,
  normalizePlan,
  promptFor,
  validImageDataUrl,
};
module.exports.default = handler;
