import { NextResponse } from "next/server";
import { rateLimit } from "../../lib/rateLimit";
import { rateLimitResponse, handleUnexpected, jsonError } from "../../lib/apiHelpers";
import { LIMITS } from "../../lib/config";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req) {
  const rl = rateLimit(req, "ia");
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  try {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("JSON inválido", 400);

    const { partidas, familias } = body;
    if (!Array.isArray(familias) || !familias.length) {
      return jsonError("Sin familias", 400);
    }
    if (!Array.isArray(partidas)) {
      return jsonError("Partidas inválidas", 400);
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: "Sin créditos API. Las especificaciones base están disponibles sin IA.",
      });
    }

    const resumen = partidas
      .slice(0, LIMITS.maxPartidasIA)
      .map(p => `${p.codigo} | ${p.familia || "-"} | ${(p.descripcion || "").substring(0, 60)}`)
      .join("\n");

    const prompt = `Eres un especialista en construcción chilena. Se necesitan Especificaciones Técnicas (EE.TT.) para un proyecto con las siguientes partidas ONDAC:

${resumen}

Familias que necesitan especificaciones mejoradas: ${familias.join(", ")}

Para cada familia, mejora o genera especificaciones técnicas según la normativa chilena vigente (NCh, OGUC, MINVU, SERVIU).
Incluye:
- descripcion: texto formal de 3-5 oraciones describiendo el alcance
- materiales: materiales, marcas aceptadas, calidades mínimas según norma
- ejecucion: procedimiento de ejecución paso a paso
- medicion_pago: unidad de medida y criterios de pago

Responde ÚNICAMENTE con JSON en este formato exacto:
{
  "FAMILIA": {
    "descripcion": "...",
    "materiales": "...",
    "ejecucion": "...",
    "medicion_pago": "..."
  },
  ...
}
Solo incluye las familias solicitadas. Sin texto adicional.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("[mejorar-eett] Anthropic status:", res.status);
      return jsonError("La IA no pudo generar las especificaciones", 502);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let mejoras = {};
    if (jsonMatch) {
      try { mejoras = JSON.parse(jsonMatch[0]); } catch { mejoras = {}; }
    }
    return NextResponse.json({ mejoras, source: "ia" });
  } catch (err) {
    return handleUnexpected(err, "mejorar-eett");
  }
}
