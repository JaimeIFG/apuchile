import { NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req) {
  const { partidas, familias } = await req.json();
  if (!familias?.length) return NextResponse.json({ error: "Sin familias" }, { status: 400 });

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Sin créditos API. Las especificaciones base están disponibles sin IA." });
  }

  try {
    // Preparar contexto de partidas para el prompt
    const resumen = partidas
      .slice(0, 40)
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

    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const mejoras = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return NextResponse.json({ mejoras, source: "ia" });
  } catch (err) {
    console.error("Error mejorar-eett:", err.message);
    return NextResponse.json({ error: "Error al llamar a la IA: " + err.message }, { status: 500 });
  }
}
