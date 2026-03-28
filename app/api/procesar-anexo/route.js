import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ONDAC_APUS } from "../../ondac_data_nuevo.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Lista compacta de APUs para el prompt (codigo + descripcion + unidad)
const APU_LISTA = ONDAC_APUS.map(a => `${a.codigo}|${a.desc || a.descripcion}|${a.unidad}`).join("\n");

export async function POST(request) {
  try {
    const { texto, tipo } = await request.json();
    if (!texto || !tipo) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    const promptPorTipo = {
      presupuesto: `Eres un experto en construcción chileno. Se te entrega un texto extraído de un presupuesto o cubicación de obra.
Tu tarea es identificar las partidas de obra y cruzarlas con la base de datos ONDAC 2017.

BASE DE DATOS ONDAC (formato: CODIGO|DESCRIPCION|UNIDAD):
${APU_LISTA}

TEXTO DEL DOCUMENTO:
${texto.slice(0, 12000)}

Devuelve SOLO un JSON válido con este formato exacto, sin texto adicional:
{
  "partidas": [
    {
      "codigo": "código ONDAC exacto",
      "desc": "descripción ONDAC",
      "unidad": "unidad",
      "cantidad": número o null si no aparece,
      "similitud": porcentaje 0-100,
      "texto_original": "texto del documento que originó esta coincidencia"
    }
  ]
}
Solo incluye coincidencias con similitud >= 60. Máximo 30 partidas.`,

      especificacion: `Eres un experto en construcción chileno. Se te entrega un texto de especificaciones técnicas de obra.
Tu tarea es identificar qué trabajos/partidas se mencionan y cruzarlos con la base de datos ONDAC 2017.

BASE DE DATOS ONDAC (formato: CODIGO|DESCRIPCION|UNIDAD):
${APU_LISTA}

TEXTO DEL DOCUMENTO:
${texto.slice(0, 12000)}

Devuelve SOLO un JSON válido con este formato exacto, sin texto adicional:
{
  "partidas": [
    {
      "codigo": "código ONDAC exacto",
      "desc": "descripción ONDAC",
      "unidad": "unidad",
      "cantidad": null,
      "similitud": porcentaje 0-100,
      "texto_original": "texto del documento que originó esta coincidencia"
    }
  ]
}
Solo incluye coincidencias con similitud >= 55. Máximo 30 partidas.`,
    };

    const prompt = promptPorTipo[tipo];
    if (!prompt) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0]?.text || "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "No se pudo parsear la respuesta" }, { status: 500 });

    const result = JSON.parse(jsonMatch[0]);

    // Adjuntar el objeto APU completo de ONDAC a cada partida encontrada
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
