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
    for (const merge of (sheet["!merges"] || [])) {
      const { s, e } = merge;
      const origin = sheet[XLSX.utils.encode_cell(s)];
      if (!origin) continue;
      for (let r = s.r; r <= e.r; r++) {
        for (let c = s.c; c <= e.c; c++) {
          if (r === s.r && c === s.c) continue;
          const addr = XLSX.utils.encode_cell({ r, c });
          if (!sheet[addr]) sheet[addr] = { ...origin };
        }
      }
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const str  = v => v != null ? String(v).trim() : "";
    const parseNum = v => {
      if (v == null) return null;
      if (typeof v === "number") return isFinite(v) ? v : null;
      const s = String(v).replace(/\$/g,"").replace(/\s/g,"")
        .replace(/\.(?=\d{3})/g,"").replace(",",".").trim();
      const n = parseFloat(s);
      return isNaN(n) ? null : n;
    };
    const parseDate = v => {
      if (!v) return null;
      if (typeof v === "number") {
        try {
          const d = XLSX.SSF.parse_date_code(v);
          if (d) return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
        } catch(e) {}
      }
      if (typeof v === "string") {
        const m = v.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (m) {
          const y = m[3].length === 2 ? "20"+m[3] : m[3];
          return `${y}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
        }
      }
      return null;
    };

    // ── 1. Extraer metadata del encabezado ──────────────────────────────────
    let numeroEP = null, obraNombre = null, contratista = null, fecha = null;
    let headerRow = -1; // fila con columnas ITEM, DESCRIPCION, etc.

    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const row = rows[i];
      if (!row) continue;
      const joined = row.map(c => str(c).toUpperCase()).join("|");

      // N° EP — buscar "N°X" o "N° X" en las primeras filas
      if (!numeroEP) {
        for (const cell of row) {
          const s = str(cell);
          const m = s.match(/N[°º]?\s*(\d+)/i);
          if (m && parseInt(m[1]) < 100) { numeroEP = m[1]; break; }
        }
      }

      // Nombre obra — buscar fila con "OBRA" y tomar el valor siguiente
      if (!obraNombre && joined.includes("OBRA") && !joined.includes("OBRAS")) {
        for (let j = 0; j < row.length; j++) {
          if (str(row[j]).toUpperCase() === "OBRA" || str(row[j]).toUpperCase() === ":") continue;
          const val = str(row[j]);
          if (val.length > 5 && !val.match(/^[\:\-]/)) { obraNombre = val; break; }
        }
      }

      // Fecha
      if (!fecha) {
        for (const c of row) {
          const d = parseDate(c);
          if (d && d > "2000-01-01") { fecha = d; break; }
        }
      }

      // Fila de encabezados de tabla (ITEM + DESCRIPCION + alguna columna de avance)
      if (joined.includes("ITEM") && (joined.includes("DESCRIPCI") || joined.includes("PARTIDA"))) {
        headerRow = i;
        break;
      }
    }

    // ── 2. Mapear columnas desde la fila de encabezado ─────────────────────
    const colMap = { item:0, desc:1, unidad:4, cant:5, vUnit:6, vTotal:7, avPct:8, avMonto:9 };

    if (headerRow >= 0) {
      const hRow = rows[headerRow];
      hRow.forEach((h, i) => {
        const s = str(h).toUpperCase();
        if (s === "ITEM" || s.startsWith("ITEM")) colMap.item = i;
        if (s.includes("DESCRIPC") || s.includes("PARTIDA")) colMap.desc = i;
        if (s.includes("UNID")) colMap.unidad = i;
        if (s.match(/^CANT/) && !s.includes("TOTAL")) colMap.cant = i;
        if (s.includes("V. UNIT") || s.includes("VALOR UNIT") || s.includes("PRECIO UNIT")) colMap.vUnit = i;
        if (s.includes("V. TOTAL") || s.includes("VALOR TOTAL") || s === "TOTAL") colMap.vTotal = i;
        if (s.includes("AVANCE") && s.includes("%")) colMap.avPct = i;
        if (s.includes("AVANCE") && s.includes("$")) colMap.avMonto = i;
        if ((s.includes("AVANCE") || s.includes("MONTO")) && !s.includes("%")) colMap.avMonto = colMap.avMonto ?? i;
      });
    }

    // ── 3. Parsear partidas ─────────────────────────────────────────────────
    const partidas = [];
    let totalEP = null, totalProyecto = null, porcentajeAvance = null;
    let contratistaRows = [];
    const dataStart = headerRow >= 0 ? headerRow + 1 : 9;

    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      // Buscar contratista en filas finales (nombre propio después de totales)
      const allText = row.map(c => str(c)).filter(Boolean).join(" ");
      if (i > rows.length - 15 && allText.length > 3 && allText.length < 60
          && !allText.match(/total|iva|gasto|utilidad|porcentaje|firma|rut/i)) {
        contratistaRows.push(allText);
      }

      const itemVal  = str(row[colMap.item]);
      const descVal  = str(row[colMap.desc]) || str(row[1]) || str(row[2]);
      const descFull = descVal;

      // Detectar filas de totales/resumen
      const descUp = descFull.toUpperCase();
      if (descUp.includes("TOTAL ESTADO DE PAGO") || descUp.includes("TOTAL EP")) {
        const v = parseNum(row[colMap.avMonto]) ?? parseNum(row[colMap.vTotal]);
        if (v) totalEP = v;
        continue;
      }
      if (descUp.includes("TOTAL PROYECTO") || descUp.includes("TOTAL OBRA")) {
        const v = parseNum(row[colMap.vTotal]) ?? parseNum(row[colMap.avMonto]);
        if (v) totalProyecto = v;
        continue;
      }
      if (descUp.includes("PORCENTAJE") && descUp.includes("AVANCE")) {
        // Buscar un número entre 0 y 1 o entre 0 y 100 en la fila
        for (const cell of row) {
          const n = parseNum(cell);
          if (n != null && n > 0 && n <= 1) { porcentajeAvance = Math.round(n*10000)/100; break; }
          if (n != null && n > 1 && n <= 100) { porcentajeAvance = Math.round(n*100)/100; break; }
        }
        continue;
      }
      if (descUp.match(/^(sub\s*total|total\s*obras|g\.?g\.?|gastos\s*gen|utilidad|iva|costo\s*neto|equipamiento)/)) {
        // Capturar subtotales pero no agregar como partida
        if (descUp.includes("TOTAL") && !totalEP) {
          const v = parseNum(row[colMap.avMonto]);
          if (v && v > 0) totalEP = v;
        }
        continue;
      }

      if (!descFull && !itemVal) continue;

      const vTotal   = parseNum(row[colMap.vTotal]);
      const avPct    = parseNum(row[colMap.avPct]);
      const avMonto  = parseNum(row[colMap.avMonto]);

      // Requiere al menos un valor numérico para ser partida real
      if (!vTotal && !avMonto && !parseNum(row[colMap.cant])) continue;
      if (!descFull) continue;

      // Si avance % es 1, significa 100%
      const avancePct = avPct != null ? (avPct <= 1 ? Math.round(avPct*10000)/100 : Math.round(avPct*100)/100) : null;

      partidas.push({
        item:          itemVal,
        partida:       descFull,
        unidad:        str(row[colMap.unidad]).toLowerCase(),
        cantidad:      parseNum(row[colMap.cant]),
        precio_unitario: parseNum(row[colMap.vUnit]),
        monto_contrato:  vTotal,
        avance_pct:    avancePct,
        monto_actual:  avMonto && avMonto > 0 ? avMonto : null,
      });
    }

    // Contratista: tomar la primera línea con nombre propio
    if (contratistaRows.length > 0) contratista = contratistaRows[0];

    // Calcular total EP desde partidas si no se encontró
    if (!totalEP) totalEP = partidas.reduce((s,p)=>s+(p.monto_actual||0),0) || null;

    // Calcular porcentaje si tenemos totalEP y totalProyecto
    if (!porcentajeAvance && totalEP && totalProyecto) {
      porcentajeAvance = Math.round((totalEP/totalProyecto)*10000)/100;
    }

    // Nombre sugerido
    const nombreSugerido = numeroEP
      ? `Estado de Pago N°${numeroEP}${obraNombre ? " — "+obraNombre : ""}`
      : obraNombre || "";

    return NextResponse.json({
      meta: { numeroEP, obraNombre, contratista, fecha, monto: totalEP,
              totalProyecto, porcentajeAvance, nombreSugerido },
      partidas,
      total: totalEP,
    });
  } catch (e) {
    console.error("Error procesando EP Excel:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
