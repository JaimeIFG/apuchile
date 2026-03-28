import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { ONDAC_APUS } from "../../ondac_data_nuevo.js";

// Lista compacta de APUs para el prompt
const APU_LISTA = ONDAC_APUS.map(a => `${a.codigo}|${a.desc || a.descripcion}|${a.unidad}`).join("\n");

async function extraerTextoExcel(buffer) {
  const XLSX = (await import("xlsx")).default;
  const wb = XLSX.read(Buffer.from(buffer));
  let texto = "";
  wb.SheetNames.forEach(name => {
    texto += XLSX.utils.sheet_to_csv(wb.Sheets[name]) + "\n";
  });
  return texto;
}

export async function POST(request) {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
    const esPresupuesto = tipo === "presupuesto";

    const promptBase = `Eres un experto en construcción chileno. Analiza este documento (${esPresupuesto ? "presupuesto o cubicación de obra" : "especificaciones técnicas"}) e identifica las partidas de obra, cruzándolas con la base de datos ONDAC 2017.

BASE DE DATOS ONDAC (formato: CODIGO|DESCRIPCION|UNIDAD):
${APU_LISTA}

Devuelve SOLO un JSON válido con este formato, sin texto adicional:
{
  "partidas": [
    {
      "codigo": "código ONDAC exacto",
      "desc": "descripción ONDAC",
      "unidad": "unidad",
      "cantidad": ${esPresupuesto ? "número si aparece en el documento, si no null" : "null"},
      "similitud": número entre 0 y 100,
      "texto_original": "fragmento del documento que originó esta coincidencia"
    }
  ]
}
Solo incluye coincidencias con similitud >= ${esPresupuesto ? "60" : "55"}. Máximo 30 partidas.`;

    let message;

    if (ext === "pdf") {
      // Enviar PDF directamente a Claude (soporta PDFs escaneados y digitales)
      const base64 = Buffer.from(buffer).toString("base64");
      message = await client.beta.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        betas: ["pdfs-2024-09-25"],
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            { type: "text", text: promptBase },
          ],
        }],
      });
    } else if (ext === "xlsx" || ext === "xls") {
      // Excel: extraer texto y enviar como texto
      const texto = await extraerTextoExcel(buffer);
      if (!texto.trim()) return NextResponse.json({ error: "No se pudo extraer texto del Excel" }, { status: 400 });
      message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        messages: [{ role: "user", content: promptBase + "\n\nCONTENIDO DEL EXCEL:\n" + texto.slice(0, 14000) }],
      });
    } else {
      return NextResponse.json({ error: "Formato no compatible" }, { status: 400 });
    }

    const responseText = message.content[0]?.text || "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "No se pudo parsear respuesta de IA" }, { status: 500 });

    const result = JSON.parse(jsonMatch[0]);
    const partidas = (result.partidas || []).map(p => {
      const apu = ONDAC_APUS.find(a => a.codigo === p.codigo);
      return { ...p, apu: apu || null };
    }).filter(p => p.apu);

    return NextResponse.json({ partidas });
  } catch (err) {
    console.error("Error procesando anexo:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
