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

    // Expandir celdas combinadas
    const merges = sheet["!merges"] || [];
    for (const merge of merges) {
      const { s, e } = merge;
      const originCell = sheet[XLSX.utils.encode_cell(s)];
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

    const parseNum = v => {
      if (v == null) return null;
      if (typeof v === "number") return isFinite(v) ? v : null;
      const s = String(v).replace(/\$/g,"").replace(/\s/g,"").replace(/\.(?=\d{3})/g,"").replace(",",".").trim();
      const n = parseFloat(s);
      return isNaN(n) ? null : n;
    };

    const parseDate = v => {
      if (!v) return null;
      if (typeof v === "number") {
        // Excel serial date
        const d = XLSX.SSF.parse_date_code(v);
        if (d) return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
      }
      if (typeof v === "string") {
        const m = v.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (m) {
          const y = m[3].length === 2 ? "20" + m[3] : m[3];
          return `${y}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
        }
      }
      return null;
    };

    // Extraer metadata del encabezado (primeras 20 filas)
    let numeroEP = null, fecha = null, monto = null, obra = null, contratista = null;
    let headerEndRow = 0;

    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const row = rows[i];
      if (!row) continue;
      const flat = row.map(c => String(c || "").trim());
      const joined = flat.join("|").toUpperCase();

      if (!numeroEP && joined.match(/N[°º]?\s*(ESTADO\s*DE\s*PAGO|EP)/)) {
        // Buscar el valor numérico en la misma fila
        for (let j = 0; j < row.length; j++) {
          const n = parseNum(row[j]);
          if (n && n > 0 && n < 1000) { numeroEP = String(Math.round(n)); break; }
        }
      }
      if (!fecha) {
        for (const c of row) {
          const d = parseDate(c);
          if (d) { fecha = d; break; }
        }
      }
      if (!obra && joined.includes("OBRA")) {
        const idx = flat.findIndex(s => s.toUpperCase().includes("OBRA"));
        if (idx >= 0 && flat[idx+1]) obra = flat[idx+1];
      }
      if (!contratista && (joined.includes("CONTRATISTA") || joined.includes("EMPRESA"))) {
        const idx = flat.findIndex(s => /CONTRATISTA|EMPRESA/i.test(s));
        if (idx >= 0 && flat[idx+1]) contratista = flat[idx+1];
      }

      // Detectar fila de encabezados de la tabla de partidas
      if (joined.match(/ITEM|PARTIDA|DESCRIPCI[OÓ]N/) && joined.match(/CANT|PRECIO|MONTO|VALOR/)) {
        headerEndRow = i;
        break;
      }
    }

    // Parsear tabla de partidas desde headerEndRow
    const partidas = [];
    let totalMonto = 0;

    if (headerEndRow > 0) {
      const headerRow = rows[headerEndRow];
      // Identificar columnas por nombre
      const colIdx = {};
      headerRow.forEach((h, i) => {
        const s = String(h || "").toUpperCase().trim();
        if (/^ITEM$|^N[°º]/.test(s)) colIdx.item = colIdx.item ?? i;
        if (/PARTIDA|DESCRIPCI/.test(s)) colIdx.partida = colIdx.partida ?? i;
        if (/UNIDAD/.test(s)) colIdx.unidad = colIdx.unidad ?? i;
        if (/CANT.*CONT/.test(s)) colIdx.cant_contrato = i;
        if (/CANT.*ANT/.test(s)) colIdx.cant_anterior = i;
        if (/CANT.*ACT/.test(s)) colIdx.cant_actual = i;
        if (/PRECIO|VALOR\s*UNIT/.test(s)) colIdx.precio_unitario = colIdx.precio_unitario ?? i;
        if (/MONTO.*ANT/.test(s)) colIdx.monto_anterior = i;
        if (/MONTO.*ACT|PARCIAL.*ACT/.test(s)) colIdx.monto_actual = i;
        if (/^MONTO$|TOTAL/.test(s) && !colIdx.monto_actual) colIdx.monto_actual = i;
      });

      // Si no se encontraron columnas específicas, usar posición fija
      if (colIdx.item === undefined) colIdx.item = 0;
      if (colIdx.partida === undefined) colIdx.partida = 1;
      if (colIdx.unidad === undefined) colIdx.unidad = 2;
      if (colIdx.precio_unitario === undefined) colIdx.precio_unitario = headerRow.length - 2;
      if (colIdx.monto_actual === undefined) colIdx.monto_actual = headerRow.length - 1;

      for (let i = headerEndRow + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;

        const itemVal = row[colIdx.item];
        const partidaVal = row[colIdx.partida];
        if (!partidaVal && !itemVal) continue;

        const itemStr = itemVal != null ? String(itemVal).trim() : "";
        const partidaStr = partidaVal != null ? String(partidaVal).trim() : "";

        // Saltar filas de totales
        if (/^(total|sub\s*total|costo|iva|neto)/i.test(partidaStr)) {
          const t = parseNum(row[colIdx.monto_actual]);
          if (t && !monto) monto = t;
          continue;
        }
        if (!partidaStr && !itemStr) continue;

        const cantContrato   = colIdx.cant_contrato !== undefined ? parseNum(row[colIdx.cant_contrato]) : null;
        const cantAnterior   = colIdx.cant_anterior !== undefined ? parseNum(row[colIdx.cant_anterior]) : null;
        const cantActual     = colIdx.cant_actual   !== undefined ? parseNum(row[colIdx.cant_actual])   : null;
        const precioUnit     = parseNum(row[colIdx.precio_unitario]);
        const montoAnterior  = colIdx.monto_anterior !== undefined ? parseNum(row[colIdx.monto_anterior]) : null;
        const montoActual    = parseNum(row[colIdx.monto_actual]);

        if (!precioUnit && !montoActual && !cantContrato) continue;

        totalMonto += montoActual || 0;

        partidas.push({
          item:           itemStr,
          partida:        partidaStr || `Partida ${itemStr}`,
          unidad:         colIdx.unidad !== undefined ? String(row[colIdx.unidad] || "").trim().toLowerCase() : "",
          cant_contrato:  cantContrato,
          cant_anterior:  cantAnterior,
          cant_actual:    cantActual,
          precio_unitario: precioUnit,
          monto_anterior: montoAnterior,
          monto_actual:   montoActual,
        });
      }
    }

    if (!monto && totalMonto > 0) monto = totalMonto;

    return NextResponse.json({
      meta: { numeroEP, fecha, obra, contratista, monto },
      partidas,
      total: monto || totalMonto,
    });
  } catch (e) {
    console.error("Error procesando EP Excel:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
