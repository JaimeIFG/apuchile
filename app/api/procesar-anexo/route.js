import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../_auth";
import { rateLimit } from "../../lib/rateLimit";
import { isSafeStoragePath, rateLimitResponse } from "../../lib/apiHelpers";
import { MAX_FILE_SIZE, LIMITS } from "../../lib/config";
import ONDAC_APUS from "../../ondac_data_nuevo.json";

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
  // Rate limit
  const rl = rateLimit(request, "procesar");
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  // Verificar autenticación
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });

    const { storagePath, tipo } = body;
    if (!storagePath || !tipo) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    if (!["presupuesto", "eett", "plano"].includes(tipo)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    if (tipo === "plano") return NextResponse.json({ partidas: [] });

    // Validación robusta: anti-traversal + alfanumérico + extensión permitida
    if (!isSafeStoragePath(storagePath, [".pdf", ".xlsx", ".xls"])) {
      return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
    }

    // Verificar que el path pertenece al usuario autenticado (formato: userId/...)
    const pathOwner = storagePath.split("/")[0];
    if (pathOwner !== user.id) {
      return NextResponse.json({ error: "Sin permiso para acceder a este archivo" }, { status: 403 });
    }

    // 1. Descargar archivo desde Supabase Storage
    const { data: fileData, error: dlErr } = await supabaseAdmin.storage
      .from("anexos")
      .download(storagePath);

    if (dlErr || !fileData) {
      return NextResponse.json({ error: "No se pudo descargar el archivo" }, { status: 500 });
    }

    // Validar tamaño antes de procesar (DoS guard)
    if (fileData.size && fileData.size > MAX_FILE_SIZE.anexo) {
      return NextResponse.json(
        { error: `El archivo supera el máximo de ${Math.round(MAX_FILE_SIZE.anexo / 1024 / 1024)} MB` },
        { status: 413 }
      );
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

    // Ordenar por similitud descendente y limitar al tope configurado
    resultados.sort((a, b) => b.similitud - a.similitud);
    const partidas = resultados.slice(0, LIMITS.maxPartidasIA);

    return NextResponse.json({ partidas, metodo: "local" });
  } catch (err) {
    console.error("Error procesando anexo:", err);
    return NextResponse.json({ error: "Error al procesar el archivo" }, { status: 500 });
  }
}
