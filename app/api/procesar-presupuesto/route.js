import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const pdfData = await pdfParse(buffer);

    const fullText = pdfData.text;

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
