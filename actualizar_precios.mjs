/**
 * Actualización masiva de precios de materiales desde Sodimac.
 * Uso: node actualizar_precios.mjs [--limite 50] [--solo-sin-precio]
 */

import { readFileSync, writeFileSync } from "fs";
import { setTimeout as sleep } from "timers/promises";

const args = process.argv.slice(2);
const LIMITE = args.includes("--limite") ? Number(args[args.indexOf("--limite") + 1]) : 999999;
const SOLO_SIN_PRECIO = args.includes("--solo-sin-precio");
const DELAY_MS = 900;

async function buscarSodimac(query) {
  const url = `https://www.sodimac.cl/sodimac-cl/search?Ntt=${encodeURIComponent(query)}&No=0&Nrpp=5`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html",
        "Accept-Language": "es-CL,es;q=0.9",
        "Cookie": "zona=13",
        "Referer": "https://www.sodimac.cl/",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const m = text.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) return null;
    const json = JSON.parse(m[1]);
    const results = json.props?.pageProps?.searchProps?.searchData?.results || [];
    for (const r of results) {
      const precio =
        r.prices?.find(p => p.type === "NORMAL")?.priceWithoutFormatting ||
        r.prices?.[0]?.priceWithoutFormatting;
      if (precio && precio > 100) {
        return { nombre: r.displayName, precio: Number(precio), sku: r.skuId };
      }
    }
    return null;
  } catch { return null; }
}

// Cargar materiales
const content = readFileSync("./app/data/materiales_precios.js", "utf8");
const fn = new Function(content.replace("export const", "const") + "; return MATERIALES_BASE;");
const materiales = fn();

const aActualizar = (SOLO_SIN_PRECIO
  ? materiales.filter(m => !m.precio_actual_rm)
  : materiales
).slice(0, LIMITE);

console.log(`Actualizando ${aActualizar.length} materiales en Sodimac...`);
console.log("─".repeat(60));

let ok = 0, fallos = 0;
const mapa = Object.fromEntries(materiales.map(m => [m.id, { ...m }]));

for (let i = 0; i < aActualizar.length; i++) {
  const mat = aActualizar[i];
  const pct = String(Math.round((i / aActualizar.length) * 100)).padStart(3);
  process.stdout.write(`\r[${pct}%] ${i+1}/${aActualizar.length}  ${mat.desc.slice(0,50).padEnd(50)}`);

  const resultado = await buscarSodimac(mat.busqueda_sodimac || mat.desc);

  if (resultado) {
    mapa[mat.id].precio_actual_rm = resultado.precio;
    mapa[mat.id].nombre_sodimac = resultado.nombre;
    mapa[mat.id].sku_sodimac = resultado.sku;
    mapa[mat.id].actualizado = new Date().toISOString().slice(0, 10);
    ok++;
  } else {
    fallos++;
  }

  await sleep(DELAY_MS);
}

console.log(`\n\nResultados: ${ok} con precio / ${fallos} sin coincidencia`);

const listaFinal = Object.values(mapa).sort((a, b) => b.apariciones - a.apariciones);
const out = `// Base de materiales ONDAC — precios Sodimac actualizados ${new Date().toISOString().slice(0, 10)}
// ${ok}/${aActualizar.length} materiales con precio de mercado (precio base RM)
// El ajuste regional se aplica en cliente con FACTOR_ZONA_CLIENTE
export const MATERIALES_BASE = ${JSON.stringify(listaFinal, null, 2)};
`;
writeFileSync("./app/data/materiales_precios.js", out);
console.log("✓ Guardado app/data/materiales_precios.js");
