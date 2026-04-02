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

    // Expandir celdas combinadas (merged) — copiar el valor al resto de las filas del rango
    const merges = sheet["!merges"] || [];
    for (const merge of merges) {
      const { s, e } = merge; // s=start, e=end (row/col, 0-indexed)
      const originAddr = XLSX.utils.encode_cell(s);
      const originCell = sheet[originAddr];
      if (!originCell) continue;
      for (let r = s.r; r <= e.r; r++) {
        for (let c = s.c; c <= e.c; c++) {
          if (r === s.r && c === s.c) continue; // ya existe
          const addr = XLSX.utils.encode_cell({ r, c });
          if (!sheet[addr]) {
            sheet[addr] = { ...originCell };
          }
        }
      }
    }

    // Convertir a array de arrays (raw), ya con merged cells expandidas
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const items = [];
    let currentSection = "General";
    let orden = 0;

    // Detectar fila de encabezados buscando "ITEM" y "PARTIDA"
    let headerRow = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      if (!row) continue;
      const joined = row.map(c => String(c || "").toUpperCase()).join("|");
      if (joined.includes("ITEM") && joined.includes("PARTIDA")) {
        headerRow = i;
        break;
      }
    }

    const dataStart = headerRow >= 0 ? headerRow + 1 : 10;

    const parseNum = v => {
      if (v == null) return null;
      if (typeof v === "number") return isFinite(v) ? v : null;
      const s = String(v).replace(/\$/g, "").replace(/\s/g, "")
        .replace(/\.(?=\d{3})/g, "").replace(",", ".").trim();
      const n = parseFloat(s);
      return isNaN(n) ? null : n;
    };

    // Columnas: A=item, B=partida, C=unidad, D=cantidad, E=valor_serviu, F=valor_unitario, G=valor_total
    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const colA = row[0]; // ITEM
      const colB = row[1]; // PARTIDA
      const colC = row[2]; // UNIDAD
      const colD = row[3]; // CANTIDAD
      const colE = row[4]; // VALOR SERVIU / MERCADO
      const colF = row[5]; // VALOR UNITARIO
      const colG = row[6]; // VALOR TOTAL

      const itemStr = colA != null ? String(colA).trim() : "";
      const partida = colB != null ? String(colB).trim() : "";

      // Saltar filas vacías o filas de totales/subtotales
      if (!partida && !itemStr) continue;
      if (/^(sub\s*total|total|costo\s*directo|gastos\s*generales|utilidad|iva|costo\s*neto)/i.test(partida)) continue;

      // Detectar encabezado de sección principal (ej: "1.0", "2.0")
      const isSectionMain = /^\d+\.0$/.test(itemStr);
      // Sin unidad ni cantidades ni valores → es encabezado/subtítulo
      const noValues = !colC && !parseNum(colD) && !parseNum(colF) && !parseNum(colG);

      if (isSectionMain || (noValues && partida.length > 2)) {
        if (partida) currentSection = partida;
        continue;
      }

      // Si no tiene unidad ni valores y la partida parece subtítulo, es sub-sección
      if (!colC && noValues && partida) {
        currentSection = partida;
        continue;
      }

      // Necesita al menos unidad o algún valor para ser una partida real
      if (!colC && !parseNum(colD) && !parseNum(colE) && !parseNum(colF) && !parseNum(colG)) continue;

      const cantidad      = parseNum(colD);
      const valorServiu   = parseNum(colE);
      const valorUnitario = parseNum(colF) ?? valorServiu; // fallback a precio SERVIU
      const valorTotal    = parseNum(colG) ??
        (cantidad != null && valorUnitario != null ? cantidad * valorUnitario : 0);

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

    const costoDirecto = items.reduce((s, i) => s + (i.valor_total || 0), 0);
    return NextResponse.json({ items, totales: { costo_directo: costoDirecto } });
  } catch (e) {
    console.error("Error procesando Excel:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
