import { NextResponse } from "next/server";
import { requireAuth } from "../_auth";
import { rateLimit } from "../../lib/rateLimit";
import { rateLimitResponse, handleUnexpected, jsonError } from "../../lib/apiHelpers";
import { TIMEOUT_MS, LIMITS } from "../../lib/config";

// ── Zonas y factores regionales ──────────────────────────────────────────────
// Factor sobre precio base Sodimac (RM = 1.0). Incluye flete estimado + diferencial local.
export const ZONAS_CL = {
  "Arica y Parinacota":   { zona: "15", factor: 1.22 },
  "Tarapacá":             { zona: "1",  factor: 1.18 },
  "Antofagasta":          { zona: "2",  factor: 1.15 },
  "Atacama":              { zona: "3",  factor: 1.12 },
  "Coquimbo":             { zona: "4",  factor: 1.08 },
  "Valparaíso":           { zona: "5",  factor: 1.04 },
  "Región Metropolitana": { zona: "13", factor: 1.00 },
  "O'Higgins":            { zona: "6",  factor: 1.03 },
  "Maule":                { zona: "7",  factor: 1.05 },
  "Ñuble":                { zona: "16", factor: 1.07 },
  "Biobío":               { zona: "8",  factor: 1.06 },
  "La Araucanía":         { zona: "9",  factor: 1.10 },
  "Los Ríos":             { zona: "14", factor: 1.12 },
  "Los Lagos":            { zona: "10", factor: 1.15 },
  "Aysén":                { zona: "11", factor: 1.28 },
  "Magallanes":           { zona: "12", factor: 1.30 },
};

// Headers comunes para scraping
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-CL,es;q=0.9",
};

/**
 * Fetch genérico para scraping con timeout y headers de navegador.
 * Retorna el HTML o null si hay error.
 */
async function fetchHtml(url, extraHeaders = {}) {
  try {
    const res = await fetch(url, {
      headers: { ...BROWSER_HEADERS, ...extraHeaders },
      signal: AbortSignal.timeout(TIMEOUT_MS.scraping),
      next: { revalidate: 86400 }, // cache 24h
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ── Parsers de tiendas ────────────────────────────────────────────────────────

/** Parsea HTML de Sodimac y extrae un producto con precio. */
function parseSodimac(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  let json;
  try { json = JSON.parse(m[1]); } catch { return null; }
  const results = json.props?.pageProps?.searchProps?.searchData?.results || [];
  for (const r of results) {
    const precio =
      r.prices?.find(p => p.type === "NORMAL")?.priceWithoutFormatting ||
      r.prices?.find(p => p.type === "INTERNET")?.priceWithoutFormatting ||
      r.prices?.[0]?.priceWithoutFormatting;
    if (precio && Number(precio) > 100) {
      return {
        nombre: r.displayName,
        precio: Number(precio),
        sku: r.skuId,
        fuente: "Sodimac",
        url: `https://www.sodimac.cl/sodimac-cl/product/${r.productId}`,
      };
    }
  }
  return null;
}

/** Parsea HTML de Construmart (Magento + JSON-LD). */
function parseConstrumart(html, query) {
  const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const [, raw] of bloques) {
    try {
      const json = JSON.parse(raw);
      if (json["@type"] === "Product" && json.offers?.price) {
        const precio = Number(json.offers.price);
        if (precio > 100) return { nombre: json.name, precio, fuente: "Construmart" };
      }
    } catch {}
  }
  const og = html.match(/property="og:price:amount"\s+content="([\d.]+)"/);
  if (og) return { nombre: query, precio: Number(og[1]), fuente: "Construmart" };
  return null;
}

// Configuración declarativa de fuentes: un solo lugar para agregar una nueva tienda.
const FUENTES = [
  {
    nombre: "Sodimac",
    url: (q) => `https://www.sodimac.cl/sodimac-cl/search?Ntt=${encodeURIComponent(q)}&No=0&Nrpp=5`,
    headers: { "Cookie": "zona=13", "Referer": "https://www.sodimac.cl/" },
    parse: parseSodimac,
  },
  {
    nombre: "Construmart",
    url: (q) => `https://www.construmart.cl/catalogsearch/result/?q=${encodeURIComponent(q)}`,
    headers: {},
    parse: (html, q) => parseConstrumart(html, q),
  },
];

async function buscarEnFuente(fuente, query) {
  const html = await fetchHtml(fuente.url(query), fuente.headers);
  if (!html) return null;
  try { return fuente.parse(html, query); } catch { return null; }
}

async function buscarTodas(query) {
  const results = await Promise.allSettled(FUENTES.map(f => buscarEnFuente(f, query)));
  return results.filter(r => r.status === "fulfilled" && r.value).map(r => r.value);
}

// ── GET /api/precios-materiales?q=cemento+polpaico&region=Los+Lagos ───────────
export async function GET(request) {
  const rl = rateLimit(request, "precios");
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();
    const region = searchParams.get("region") || "Región Metropolitana";

    if (!query || query.length > 200) return jsonError("Parámetro q inválido", 400);
    if (!ZONAS_CL[region]) return jsonError("Región inválida", 400);

    const zonaInfo = ZONAS_CL[region];
    const fuentes = await buscarTodas(query);

    if (!fuentes.length) {
      return NextResponse.json({ encontrado: false, query, region });
    }

    const precioRM = Math.round(fuentes.reduce((s, r) => s + r.precio, 0) / fuentes.length);
    const precioZona = Math.round(precioRM * zonaInfo.factor);

    return NextResponse.json({
      encontrado: true,
      query,
      region,
      factor_zona: zonaInfo.factor,
      precio_rm: precioRM,
      precio_zona: precioZona,
      fuentes,
      actualizado: new Date().toISOString().slice(0, 10),
    });
  } catch (err) {
    return handleUnexpected(err, "precios-materiales:GET");
  }
}

// ── POST /api/precios-materiales — actualización masiva ───────────────────────
export async function POST(request) {
  const rl = rateLimit(request, "precios");
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return jsonError("JSON inválido", 400);

    const { materiales = [], region = "Región Metropolitana" } = body;
    if (!Array.isArray(materiales) || !materiales.length) {
      return jsonError("Se requiere array de materiales", 400);
    }
    if (!ZONAS_CL[region]) return jsonError("Región inválida", 400);

    const materialesLimitados = materiales.slice(0, LIMITS.maxMaterialesIA);
    const zonaInfo = ZONAS_CL[region];
    const resultados = [];

    // Lotes de 5 con pausa para no sobrecargar Sodimac
    const LOTE = 5;
    const sodimac = FUENTES[0]; // precio base desde Sodimac (más completo)
    for (let i = 0; i < materialesLimitados.length; i += LOTE) {
      const lote = materialesLimitados.slice(i, i + LOTE);
      const res = await Promise.allSettled(
        lote.map(async (mat) => {
          const query = mat.busqueda_sodimac || mat.desc;
          if (!query) return { ...mat, encontrado: false };
          const hit = await buscarEnFuente(sodimac, query);
          if (!hit) return { ...mat, encontrado: false };
          const precioZona = Math.round(hit.precio * zonaInfo.factor);
          return {
            ...mat,
            encontrado: true,
            precio_actual_rm: hit.precio,
            precio_actual_zona: precioZona,
            nombre_sodimac: hit.nombre,
            url_sodimac: hit.url,
            factor_zona: zonaInfo.factor,
            region,
            actualizado: new Date().toISOString().slice(0, 10),
          };
        })
      );
      res.forEach(r => { if (r.status === "fulfilled") resultados.push(r.value); });
      if (i + LOTE < materialesLimitados.length) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    return NextResponse.json({
      total: resultados.length,
      encontrados: resultados.filter(r => r.encontrado).length,
      region,
      factor_zona: zonaInfo.factor,
      resultados,
    });
  } catch (err) {
    return handleUnexpected(err, "precios-materiales:POST");
  }
}
