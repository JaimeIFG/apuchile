import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // Cargar pdfjs en el servidor (sin worker)
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";

    const pdf = await pdfjsLib.getDocument({ data: buffer, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Reconstruir líneas agrupando items por posición Y
      const items = content.items;
      const lines = {};
      for (const item of items) {
        const y = Math.round(item.transform[5]);
        if (!lines[y]) lines[y] = [];
        lines[y].push({ x: item.transform[4], text: item.str });
      }
      // Ordenar por Y descendente (de arriba hacia abajo) y X ascendente
      const sortedYs = Object.keys(lines).map(Number).sort((a, b) => b - a);
      for (const y of sortedYs) {
        const lineItems = lines[y].sort((a, b) => a.x - b.x);
        fullText += lineItems.map(i => i.text).join(" ") + "\n";
      }
    }

    // Parsear el texto
    const items = parseBudgetText(fullText);
    const costoDirecto = items.reduce((s, i) => s + (i.valor_total || 0), 0);

    return NextResponse.json({
      items,
      totales: { costo_directo: costoDirecto },
    });
  } catch (e) {
    console.error("Error procesando presupuesto:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function parseBudgetText(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const items = [];
  let currentSection = "";
  let orden = 0;

  // Regex para detectar secciones (solo texto en mayúsculas, sin números al inicio)
  const sectionRe = /^(?![0-9])([A-ZÁÉÍÓÚÑÜ\s]{5,})$/;
  // Regex para detectar items con numero, descripcion, unidad, cantidad, valor_unitario, valor_total
  const itemRe = /^(\d+[\d.]*)\s+(.+?)\s+(un|m2|m3|ml|kg|l|m|gl|km|h|jor|pcs|set|ha|lts|kl|ton|pt)\s+([\d.,]+)\s+\$?\s*([\d.,]+)\s+\$?\s*([\d.,]+)/i;

  for (const line of lines) {
    // Detectar sección
    if (sectionRe.test(line) && !line.includes("$") && line.length < 80) {
      currentSection = line;
      continue;
    }

    // Detectar item presupuestario
    const m = line.match(itemRe);
    if (m) {
      const parseNum = s => parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
      orden++;
      items.push({
        item: m[1],
        seccion: currentSection || "General",
        partida: m[2].trim(),
        unidad: m[3].toLowerCase(),
        cantidad: parseNum(m[4]),
        valor_unitario: parseNum(m[5]),
        valor_total: parseNum(m[6]),
        orden,
      });
    }
  }

  return items;
}
