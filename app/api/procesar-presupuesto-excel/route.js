import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Expandir celdas combinadas (merged)
    const merges = sheet["!merges"] || [];
    for (const merge of merges) {
      const { s, e } = merge;
      const originAddr = XLSX.utils.encode_cell(s);
      const originCell = sheet[originAddr];
      if (!originCell) continue;
      for (let r = s.r; r <= e.r; r++) {
        for (let c = s.c; c <= e.c; c++) {
          if (r === s.r && c === s.c) continue;
          const addr = XLSX.utils.encode_cell({ r, c });
          if (!sheet[addr]) sheet[addr] = { ...originCell };
        }
      }
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    // ── Detectar fila de encabezados ─────────────────────────────────────────
    let headerRow = -1;
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      const row = rows[i];
      if (!row) continue;
      const joined = row.map(c => String(c || "").toUpperCase()).join("|");
      // Acepta combinaciones comunes de encabezados
      if (
        (joined.includes("ITEM") || joined.includes("N°") || joined.includes("N\u00ba")) &&
        (joined.includes("PARTIDA") || joined.includes("DESCRIPCI"))
      ) {
        headerRow = i;
        break;
      }
      // Fallback: solo PARTIDA o DESCRIPCION
      if (joined.includes("PARTIDA") || joined.includes("DESCRIPCI")) {
        headerRow = i;
        break;
      }
    }

    // ── Mapear columnas por nombre (detección dinámica) ───────────────────────
    let colIdx = { item: -1, partida: -1, unidad: -1, cantidad: -1, valorUnitario: -1, valorTotal: -1 };

    if (headerRow >= 0) {
      const headers = rows[headerRow].map(c => String(c || "").toUpperCase().replace(/\s+/g, " ").trim());
      headers.forEach((h, i) => {
        if (colIdx.item < 0 && /^(N[°º\.]|ITEM|ÍT|IT)/.test(h)) colIdx.item = i;
        if (colIdx.partida < 0 && /(PARTIDA|DESCRIPCI|DETALLE|NOMBRE)/.test(h)) colIdx.partida = i;
        if (colIdx.unidad < 0 && /^(UNID|UN[. ]|UND)/.test(h)) colIdx.unidad = i;
        if (colIdx.cantidad < 0 && /^(CANT|CAD|CUBICACI)/.test(h)) colIdx.cantidad = i;
        if (colIdx.valorUnitario < 0 && /(VALOR\s*UNIT|PRECIO\s*UNIT|V\.?\s*UNIT|P\.?\s*UNIT|VU|PU)/.test(h)) colIdx.valorUnitario = i;
        if (colIdx.valorTotal < 0 && /(TOTAL|VALOR\s*TOT|MONTO\s*TOT|V\.?\s*TOTAL|IMPORTE)/.test(h)) colIdx.valorTotal = i;
      });
    }

    // Fallback posicional si no se detectaron columnas
    if (colIdx.item < 0)          colIdx.item = 0;
    if (colIdx.partida < 0)       colIdx.partida = 1;
    if (colIdx.unidad < 0)        colIdx.unidad = 2;
    if (colIdx.cantidad < 0)      colIdx.cantidad = 3;
    if (colIdx.valorUnitario < 0) colIdx.valorUnitario = 5;
    if (colIdx.valorTotal < 0)    colIdx.valorTotal = 6;

    const dataStart = headerRow >= 0 ? headerRow + 1 : 8;

    const parseNum = v => {
      if (v == null) return null;
      if (typeof v === "number") return isFinite(v) ? v : null;
      const s = String(v).replace(/\$/g, "").replace(/\s/g, "")
        .replace(/\.(?=\d{3})/g, "").replace(",", ".").trim();
      const n = parseFloat(s);
      return isNaN(n) || !isFinite(n) ? null : n;
    };

    const items = [];
    let currentSection = "General";
    let orden = 0;

    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const colA    = row[colIdx.item];
      const colB    = row[colIdx.partida];
      const colC    = row[colIdx.unidad];
      const colD    = row[colIdx.cantidad];
      const colF    = row[colIdx.valorUnitario];
      const colG    = row[colIdx.valorTotal];

      const itemStr = colA != null ? String(colA).trim() : "";
      const partida = colB != null ? String(colB).trim() : "";

      if (!partida && !itemStr) continue;
      if (/^(sub\s*total|total|costo\s*directo|gastos\s*generales|utilidad|iva|costo\s*neto)/i.test(partida)) continue;

      // Detectar encabezado de sección (ej: "1.0", "2.0" o línea sin valores)
      const isSectionMain = /^\d+\.0$/.test(itemStr);
      const noValues = !colC && !parseNum(colD) && !parseNum(colF) && !parseNum(colG);

      if (isSectionMain || (noValues && partida.length > 2)) {
        if (partida) currentSection = partida;
        continue;
      }
      if (!colC && noValues && partida) {
        currentSection = partida;
        continue;
      }
      if (!colC && !parseNum(colD) && !parseNum(colF) && !parseNum(colG)) continue;

      const cantidad      = parseNum(colD);
      const valorUnitario = parseNum(colF);
      const valorTotal    = parseNum(colG) ??
        (cantidad != null && valorUnitario != null ? cantidad * valorUnitario : null) ?? 0;

      orden++;
      items.push({
        item:           itemStr || String(orden),
        seccion:        currentSection,
        partida:        partida || `Partida ${itemStr}`,
        unidad:         colC ? String(colC).trim().toLowerCase() : "",
        cantidad:       cantidad,
        valor_unitario: valorUnitario,
        valor_total:    valorTotal ?? 0,
        orden,
      });
    }

    if (items.length === 0) {
      return NextResponse.json({
        error: "No se encontraron partidas. Verifica que el archivo tenga columnas de Partida/Descripción y valores.",
      }, { status: 400 });
    }

    const costoDirecto = items.reduce((s, i) => s + (i.valor_total || 0), 0);
    return NextResponse.json({ items, totales: { costo_directo: costoDirecto } });
  } catch (e) {
    console.error("Error procesando Excel presupuesto:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
