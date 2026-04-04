import { NextResponse } from "next/server";

// ── Zonas y factores regionales ──────────────────────────────────────────────
// Factor sobre precio base Sodimac (RM = 1.0)
// Incluye flete estimado + diferencial de mercado local
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

// ── Scraper Sodimac ───────────────────────────────────────────────────────────
async function buscarSodimac(query) {
  const url = `https://www.sodimac.cl/sodimac-cl/search?Ntt=${encodeURIComponent(query)}&No=0&Nrpp=5`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "text/html",
      "Accept-Language": "es-CL,es;q=0.9",
      "Cookie": "zona=13",
      "Referer": "https://www.sodimac.cl/",
    },
    signal: AbortSignal.timeout(12000),
    next: { revalidate: 86400 }, // cache 24h
  });
  if (!res.ok) return null;

  const text = await res.text();

  // Sodimac embebe todos los datos en __NEXT_DATA__
  const m = text.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;

  let json;
  try { json = JSON.parse(m[1]); } catch { return null; }

  const results = json.props?.pageProps?.searchProps?.searchData?.results || [];
  if (!results.length) return null;

  // Tomar el primer resultado con precio válido
  for (const r of results) {
    const precio =
      r.prices?.find(p => p.type === "NORMAL")?.priceWithoutFormatting ||
      r.prices?.find(p => p.type === "INTERNET")?.priceWithoutFormatting ||
      r.prices?.[0]?.priceWithoutFormatting;
    if (precio && precio > 100) {
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

async function buscarConstrumart(query) {
  const url = `https://www.construmart.cl/catalogsearch/result/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
        "Accept-Language": "es-CL,es;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const text = await res.text();

    // Magento: JSON-LD de producto
    const bloques = [...text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const [, raw] of bloques) {
      try {
        const json = JSON.parse(raw);
        if (json["@type"] === "Product" && json.offers?.price) {
          const precio = Number(json.offers.price);
          if (precio > 100) return { nombre: json.name, precio, fuente: "Construmart" };
        }
      } catch {}
    }
    // Fallback: og:price
    const og = text.match(/property="og:price:amount"\s+content="([\d.]+)"/);
    if (og) return { nombre: query, precio: Number(og[1]), fuente: "Construmart" };
  } catch {}
  return null;
}

// ── GET /api/precios-materiales?q=cemento+polpaico&region=Los+Lagos ───────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const region = searchParams.get("region") || "Región Metropolitana";

  if (!query) {
    return NextResponse.json({ error: "Falta parámetro q" }, { status: 400 });
  }

  const zonaInfo = ZONAS_CL[region] || ZONAS_CL["Región Metropolitana"];

  try {
    const [r1, r2] = await Promise.allSettled([
      buscarSodimac(query),
      buscarConstrumart(query),
    ]);

    const fuentes = [r1, r2]
      .filter(r => r.status === "fulfilled" && r.value)
      .map(r => r.value);

    if (!fuentes.length) {
      return NextResponse.json({ encontrado: false, query, region });
    }

    const precioRM = Math.round(
      fuentes.reduce((s, r) => s + r.precio, 0) / fuentes.length
    );
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/precios-materiales — actualización masiva ───────────────────────
// Body: { materiales: [{desc, busqueda_sodimac?, ...}], region: string }
export async function POST(request) {
  const { materiales = [], region = "Región Metropolitana" } = await request.json();

  if (!materiales.length) {
    return NextResponse.json({ error: "Se requiere array de materiales" }, { status: 400 });
  }

  const zonaInfo = ZONAS_CL[region] || ZONAS_CL["Región Metropolitana"];
  const resultados = [];

  // Lotes de 5 con pausa para no sobrecargar Sodimac
  const LOTE = 5;
  for (let i = 0; i < materiales.length; i += LOTE) {
    const lote = materiales.slice(i, i + LOTE);
    const res = await Promise.allSettled(
      lote.map(async (mat) => {
        const query = mat.busqueda_sodimac || mat.desc;
        const sodimac = await buscarSodimac(query);
        if (!sodimac) return { ...mat, encontrado: false };
        const precioZona = Math.round(sodimac.precio * zonaInfo.factor);
        return {
          ...mat,
          encontrado: true,
          precio_actual_rm: sodimac.precio,
          precio_actual_zona: precioZona,
          nombre_sodimac: sodimac.nombre,
          url_sodimac: sodimac.url,
          factor_zona: zonaInfo.factor,
          region,
          actualizado: new Date().toISOString().slice(0, 10),
        };
      })
    );
    res.forEach(r => {
      if (r.status === "fulfilled") resultados.push(r.value);
    });
    if (i + LOTE < materiales.length) {
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
}
