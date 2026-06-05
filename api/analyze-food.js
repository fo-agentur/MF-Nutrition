const DEFAULT_MODEL = 'openrouter/free';
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
  const serving = number(json.serving_g ?? json.grams ?? json.per ?? json.serving ?? 1) || 1;
  return {
    name: text(json.name ?? json.meal ?? json.product, isLabel ? 'Scanned Label' : 'AI Meal').slice(0, 80),
    brand: text(json.brand, isLabel ? 'Nutrition Label' : 'AI Estimate').slice(0, 80),
    per: serving,
    unit: text(json.unit, serving ? 'g' : 'serving').slice(0, 12) || 'g',
    energy: number(json.energy ?? json.kcal ?? json.calories),
    protein: number(json.protein ?? json.protein_g),
    fat: number(json.fat ?? json.fat_g),
    carb: number(json.carb ?? json.carbs ?? json.carbs_g ?? json.carbohydrates),
  };
}

function normalizeRecipe(json) {
  return {
    name: text(json.name ?? json.recipe, 'Imported Recipe').slice(0, 80),
    items: Math.max(1, number(json.items ?? json.ingredients ?? 1)),
    energy: number(json.energy ?? json.kcal ?? json.calories),
    protein: number(json.protein ?? json.protein_g),
    fat: number(json.fat ?? json.fat_g),
    carb: number(json.carb ?? json.carbs ?? json.carbs_g ?? json.carbohydrates),
  };
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
      'Extract recipe nutrition totals from this URL/text content.',
      'Return keys: name, items, energy, protein, fat, carb.',
      'If only per-serving data is available, return that serving.',
      base,
      `Context: ${userText}`,
    ].join(' ');
  }

  return [
    'Estimate nutrition for this food or meal from the text and/or image.',
    'Return keys: name, serving_g, unit, energy, protein, fat, carb.',
    'If a nutrition label is visible, read it; otherwise estimate realistically.',
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

async function callOpenRouter({ task, text: userText, imageData, model }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENROUTER_API_KEY is not configured');
    err.statusCode = 500;
    throw err;
  }

  const content = [{ type: 'text', text: promptFor(task, userText) }];
  if (imageData) content.push({ type: 'image_url', image_url: { url: imageData } });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://mf-nutrition.vercel.app',
      'X-Title': 'MF Nutrition PWA',
    },
    body: JSON.stringify({
      model: allowedModel(model || process.env.OPENROUTER_MODEL),
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 600,
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

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await readBody(req);
    const task = ['meal', 'label', 'recipe'].includes(body.task) ? body.task : 'meal';
    const userText = text(body.text).slice(0, task === 'recipe' ? 16_000 : 2_000);
    const imageData = body.imageData ? String(body.imageData) : '';

    if (!userText && !imageData) return res.status(400).json({ error: 'Text or image is required' });
    if (!validImageDataUrl(imageData)) return res.status(400).json({ error: 'Image must be a PNG, JPEG, WebP, or GIF data URL under 5.5MB' });

    const json = await callOpenRouter({ task, text: userText, imageData, model: body.model });
    const payload = task === 'recipe'
      ? { recipe: normalizeRecipe(json), raw: json }
      : { food: normalizeFood(json, task), raw: json };
    return res.status(200).json(payload);
  } catch (error) {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    return res.status(status).json({ error: error.message || 'Analysis failed' });
  }
}

module.exports = {
  DEFAULT_MODEL,
  allowedModel,
  callOpenRouter,
  extractJsonObject,
  handler,
  normalizeFood,
  normalizeRecipe,
  validImageDataUrl,
};
module.exports.default = handler;
