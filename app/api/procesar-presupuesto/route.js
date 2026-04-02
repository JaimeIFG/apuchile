import { NextResponse } from "next/server";

// Polyfills requeridos por pdfjs en Node.js
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init) {
      this.a=1;this.b=0;this.c=0;this.d=1;this.e=0;this.f=0;
      if(Array.isArray(init)&&init.length>=6){
        [this.a,this.b,this.c,this.d,this.e,this.f]=init;
      }
    }
    transformPoint(p){return{x:this.a*p.x+this.c*p.y+this.e,y:this.b*p.x+this.d*p.y+this.f};}
    multiply(){return this;}
  };
}
if (typeof globalThis.Path2D === "undefined") {
  globalThis.Path2D = class Path2D {};
}
if (typeof globalThis.ImageData === "undefined") {
  globalThis.ImageData = class ImageData {
    constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);}
  };
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";

    const pdf = await pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
    }).promise;

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
