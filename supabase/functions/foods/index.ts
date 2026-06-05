// MacroFactor — OpenFoodFacts proxy (public read-only proxy to public OFF data).
// verify_jwt is disabled because this only relays public OpenFoodFacts data and
// performs no authenticated DB operations. Handles CORS for the PWA.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OFF = "https://world.openfoodfacts.org";
const UA = "MacroFactor-PWA/1.0 (https://mf-nutrition-fo-agenturs-projects.vercel.app)";
const FIELDS =
  "code,product_name,product_name_de,generic_name,brands,quantity," +
  "serving_quantity,serving_size,nutriments,image_front_small_url,image_url";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function n(v: unknown): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function round1(v: number | null): number | null {
  return v == null ? null : Math.round(v * 10) / 10;
}

function normalize(p: any) {
  const nt = p?.nutriments || {};
  const kcal = n(nt["energy-kcal_100g"]) ?? n(nt["energy-kcal"]) ??
    (n(nt["energy_100g"]) != null ? Math.round((n(nt["energy_100g"]) as number) / 4.184) : null);
  const name = (p.product_name_de || p.product_name || p.generic_name || "").trim();
  const brand = (p.brands || "").split(",")[0]?.trim() || null;
  return {
    barcode: p.code || null,
    name: name || brand || "Unbekanntes Produkt",
    brand,
    quantity: p.quantity || null,
    serving_g: n(p.serving_quantity),
    serving_label: p.serving_size || null,
    kcal: kcal != null ? Math.round(kcal) : 0,
    protein_g: round1(n(nt.proteins_100g)) ?? 0,
    carbs_g: round1(n(nt.carbohydrates_100g)) ?? 0,
    fat_g: round1(n(nt.fat_100g)) ?? 0,
    fiber_g: round1(n(nt.fiber_100g)),
    sugar_g: round1(n(nt.sugars_100g)),
    sat_fat_g: round1(n(nt["saturated-fat_100g"])),
    sodium_mg: nt.sodium_100g != null ? Math.round((n(nt.sodium_100g) as number) * 1000) : null,
    image: p.image_front_small_url || p.image_url || null,
  };
}

async function offFetch(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error("OFF " + res.status);
  return res.json();
}

async function search(q: string) {
  const url = `${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=30&fields=${FIELDS}`;
  const data = await offFetch(url);
  const results = (data.products || [])
    .map(normalize)
    .filter((f: any) => f.name && f.name !== "Unbekanntes Produkt" && f.kcal > 0);
  return results;
}

async function barcode(code: string) {
  const url = `${OFF}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`;
  const data = await offFetch(url);
  if (data.status === 1 && data.product) return normalize({ ...data.product, code });
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    let q = "", code = "";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      q = (body.q || "").trim();
      code = (body.barcode || "").toString().trim();
    } else {
      const u = new URL(req.url);
      q = (u.searchParams.get("q") || "").trim();
      code = (u.searchParams.get("barcode") || "").trim();
    }

    if (code) {
      const product = await barcode(code);
      return json({ product });
    }
    if (q) {
      const results = await search(q);
      return json({ results });
    }
    return json({ error: "Provide 'q' or 'barcode'." }, 400);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 502);
  }
});
