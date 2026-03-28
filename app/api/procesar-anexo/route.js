import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ONDAC_APUS } from "../../ondac_data_nuevo.js";

// Normalizar texto: minúsculas, sin tildes, sin puntuación
function normalizar(txt) {
  return (txt || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Similitud por palabras compartidas (Jaccard simplificado)
function similitud(textoDoc, descAPU) {
  const wordsDoc = new Set(normalizar(textoDoc).split(" ").filter(w => w.length > 3));
  const wordsAPU = normalizar(descAPU).split(" ").filter(w => w.length > 3);
  if (wordsAPU.length === 0) return 0;
  const matches = wordsAPU.filter(w => wordsDoc.has(w)).length;
  return Math.round((matches / wordsAPU.length) * 100);
}

async function extraerTexto(buffer, ext) {
  if (ext === "pdf") {
    try {
      const { extractText } = await import("unpdf");
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
      const resultado = Array.isArray(text) ? text.join("\n") : (text || "");
      return resultado.trim();
    } catch {
      return "";
    }
  }
  if (ext === "xlsx" || ext === "xls") {
    const XLSX = (await import("xlsx")).default;
    const wb = XLSX.read(Buffer.from(buffer));
    let texto = "";
    wb.SheetNames.forEach(name => {
      texto += XLSX.utils.sheet_to_csv(wb.Sheets[name]) + "\n";
    });
    return texto.trim();
  }
  return "";
}

export async function POST(request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { storagePath, tipo } = await request.json();
    if (!storagePath || !tipo) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    if (tipo === "plano") return NextResponse.json({ partidas: [] });

    // 1. Descargar archivo desde Supabase Storage
    const { data: fileData, error: dlErr } = await supabaseAdmin.storage
      .from("anexos")
      .download(storagePath);

    if (dlErr || !fileData) {
      return NextResponse.json({ error: "No se pudo descargar el archivo: " + dlErr?.message }, { status: 500 });
    }

    const ext = storagePath.split(".").pop().toLowerCase();
    const buffer = await fileData.arrayBuffer();

    // 2. Extraer texto
    const texto = await extraerTexto(buffer, ext);
    if (!texto) {
      return NextResponse.json({
        error: ext === "pdf"
          ? "No se pudo extraer texto del PDF. Si es un PDF escaneado, guárdalo como tipo Plano."
          : "Formato no compatible"
      }, { status: 400 });
    }

    // 3. Matching local contra ONDAC
    const umbral = tipo === "presupuesto" ? 40 : 35;
    const resultados = [];

    for (const apu of ONDAC_APUS) {
      const desc = apu.desc || apu.descripcion || "";
      const score = similitud(texto, desc);
      if (score >= umbral) {
        // Buscar cantidad en el texto si es presupuesto
        let cantidad = null;
        if (tipo === "presupuesto") {
          const palabrasClave = normalizar(desc).split(" ").filter(w => w.length > 4);
          for (const palabra of palabrasClave) {
            const regex = new RegExp(palabra + "[^\\n]*?([\\d]+[.,][\\d]+|[\\d]+)", "i");
            const match = texto.match(regex);
            if (match) { cantidad = parseFloat(match[1].replace(",", ".")); break; }
          }
        }
        resultados.push({
          codigo: apu.codigo,
          desc,
          unidad: apu.unidad,
          cantidad,
          similitud: score,
          texto_original: "",
          apu,
        });
      }
    }

    // Ordenar por similitud descendente y limitar a 30
    resultados.sort((a, b) => b.similitud - a.similitud);
    const partidas = resultados.slice(0, 30);

    return NextResponse.json({ partidas, metodo: "local" });
  } catch (err) {
    console.error("Error procesando anexo:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
