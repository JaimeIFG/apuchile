// APUchile — Extractor ONDAC completo
// Ejecutar con: node extraer_ondac_final.mjs

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// ── CONFIGURACIÓN ─────────────────────────────────────────
const API_KEY = "TU_API_KEY_AQUI";
const PDF_NAME = "onda prueba.pdf";
const OUTPUT_DIR = "./ondac_paginas";
const RESULT_FILE = "./ondac_completo.json";

// Páginas a procesar
const SECCIONES = [
  { nombre: "apus",       inicio: 43, fin: 79  },
  { nombre: "materiales", inicio: 84, fin: 150 },
];

const client = new Anthropic({ apiKey: API_KEY });

// ── RASTERIZAR PÁGINAS ────────────────────────────────────
function rasterizarPagina(pdfPath, pagina, outputPath) {
  try {
    execSync(
      `pdftoppm -jpeg -r 150 -f ${pagina} -l ${pagina} "${pdfPath}" "${outputPath}"`,
      { stdio: "pipe" }
    );
    const dir = path.dirname(outputPath);
    const base = path.basename(outputPath);
    const archivos = fs.readdirSync(dir).filter(f => f.startsWith(base) && f.endsWith(".jpg"));
    if (archivos.length > 0) {
      const src = path.join(dir, archivos[0]);
      fs.renameSync(src, outputPath + ".jpg");
      return outputPath + ".jpg";
    }
  } catch (e) {
    console.log(`  Error rasterizando página ${pagina}: ${e.message}`);
  }
  return null;
}

// ── EXTRAER CON IA ────────────────────────────────────────
async function extraerPagina(imgPath, tipo) {
  const imgData = fs.readFileSync(imgPath);
  const b64 = imgData.toString("base64");

  const prompt = tipo === "apus"
    ? `Esta página del Manual ONDAC Chile muestra una tabla de Análisis de Precios Unitarios.
Extrae TODOS los items visibles. Cada item tiene código, descripción completa, unidad y precio en pesos chilenos.
Responde SOLO con JSON válido, sin texto adicional:
{"items": [{"codigo": "00101", "descripcion": "texto completo", "unidad": "m3", "precio": 3109, "tipo": "apu"}]}
Si la página no tiene tabla de datos responde: {"items": []}`
    : `Esta página del Manual ONDAC Chile muestra precios de materiales de construcción.
Extrae TODOS los materiales visibles con código de clasificación, descripción completa, unidad y precio en pesos chilenos.
Responde SOLO con JSON válido, sin texto adicional:
{"items": [{"codigo": "CB-001", "descripcion": "descripción completa", "unidad": "unid", "precio": 2850, "tipo": "material"}]}
Si la página no tiene tabla de datos responde: {"items": []}`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
          { type: "text", text: prompt }
        ]
      }]
    });

    let text = response.content[0].text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    }
    return JSON.parse(text);
  } catch (e) {
    console.log(`  Error en IA: ${e.message}`);
    return { items: [] };
  }
}

// ── MAIN ──────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  APUchile — Extractor ONDAC 2017");
  console.log("═══════════════════════════════════════════\n");

  // Verificar PDF
  if (!fs.existsSync(PDF_NAME)) {
    console.log(`❌ ERROR: No se encontró el PDF: ${PDF_NAME}`);
    console.log("   Asegúrate de que el PDF esté en la misma carpeta que este script");
    process.exit(1);
  }

  console.log(`✓ PDF encontrado: ${PDF_NAME}`);

  // Crear carpeta de salida
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

  // Verificar pdftoppm
  let tienePdftoppm = true;
  try { execSync("pdftoppm -v", { stdio: "pipe" }); }
  catch (e) { tienePdftoppm = false; }

  if (!tienePdftoppm) {
    console.log("⚠️  pdftoppm no está instalado. Instalando Poppler...");
    try {
      execSync("winget install -e --id freedesktop.Poppler", { stdio: "inherit" });
      console.log("✓ Poppler instalado. Cierra y vuelve a abrir la terminal, luego ejecuta el script de nuevo.");
    } catch (e) {
      console.log("   Descarga Poppler desde: https://github.com/oschwartz10612/poppler-windows/releases");
      console.log("   Extrae en C:\\poppler y agrega C:\\poppler\\Library\\bin al PATH de Windows");
    }
    process.exit(0);
  }

  console.log("✓ pdftoppm disponible\n");

  const todosLosItems = [];
  let totalAPUs = 0;
  let totalMateriales = 0;

  for (const seccion of SECCIONES) {
    console.log(`\n📄 Procesando sección: ${seccion.nombre}`);
    console.log(`   Páginas ${seccion.inicio} a ${seccion.fin}`);
    console.log("─".repeat(45));

    for (let pg = seccion.inicio; pg <= seccion.fin; pg++) {
      const imgBase = path.join(OUTPUT_DIR, `${seccion.nombre}_${String(pg).padStart(3, "0")}`);
      const imgPath = imgBase + ".jpg";

      if (!fs.existsSync(imgPath)) {
        process.stdout.write(`  Página ${pg}... rasterizando... `);
        rasterizarPagina(PDF_NAME, pg, imgBase);
        if (!fs.existsSync(imgPath)) {
          console.log("sin imagen, saltando");
          continue;
        }
      } else {
        process.stdout.write(`  Página ${pg}... `);
      }

      process.stdout.write("extrayendo con IA... ");
      const resultado = await extraerPagina(imgPath, seccion.nombre);
      const items = resultado.items ?? [];

      fs.writeFileSync(
        path.join(OUTPUT_DIR, `resultado_${String(pg).padStart(3, "0")}.json`),
        JSON.stringify(resultado, null, 2)
      );

      todosLosItems.push(...items);
      if (seccion.nombre === "apus") totalAPUs += items.length;
      else totalMateriales += items.length;

      console.log(`${items.length} items ✓`);

      await new Promise(r => setTimeout(r, 600));
    }
  }

  const resultado_final = {
    meta: {
      fuente: "ONDAC-2017",
      fecha_extraccion: new Date().toISOString(),
      total_apus: totalAPUs,
      total_materiales: totalMateriales,
      total_items: todosLosItems.length,
    },
    items: todosLosItems
  };

  fs.writeFileSync(RESULT_FILE, JSON.stringify(resultado_final, null, 2));

  console.log("\n═══════════════════════════════════════════");
  console.log("  ✅ Extracción completada");
  console.log(`  APUs extraídos:       ${totalAPUs}`);
  console.log(`  Materiales extraídos: ${totalMateriales}`);
  console.log(`  Total items:          ${todosLosItems.length}`);
  console.log(`  Archivo guardado:     ${RESULT_FILE}`);
  console.log("═══════════════════════════════════════════");
}

main().catch(console.error);
