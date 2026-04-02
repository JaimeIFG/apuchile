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

    // Convertir a array de arrays (raw)
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

    // Columnas esperadas: A=item, B=partida, C=unidad, D=cantidad, E=valor_serviu, F=valor_unitario, G=valor_total
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

      if (!partida) continue;

      // Detectar encabezado de sección: item tipo "1.0" o sin unidad/cantidad/valores
      const isSectionHeader =
        /^\d+\.0$/.test(itemStr) ||
        (!colC && !colD && !colF && !colG && partida.length > 2);

      if (isSectionHeader) {
        currentSection = partida;
        continue;
      }

      // Sub-encabezado sin unidad ni cantidades
      if (!colC && !colD && !colF) {
        if (partida.length > 2) currentSection = partida;
        continue;
      }

      const parseNum = v => {
        if (v == null) return null;
        if (typeof v === "number") return isFinite(v) ? v : null;
        const s = String(v).replace(/\$/g, "").replace(/\./g, "").replace(",", ".").trim();
        const n = parseFloat(s);
        return isNaN(n) ? null : n;
      };

      const cantidad      = parseNum(colD);
      const valorServiu   = parseNum(colE);
      // Si no hay valor unitario ingresado, usar SERVIU como referencia
      const valorUnitario = parseNum(colF) ?? valorServiu;
      const valorTotal    = parseNum(colG) ??
        (cantidad != null && valorUnitario != null ? cantidad * valorUnitario : 0);

      orden++;
      items.push({
        item:           itemStr || String(orden),
        seccion:        currentSection,
        partida:        partida,
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
