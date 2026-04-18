import { NextResponse } from "next/server";
import { requireAuth } from "../_auth";
import { rateLimit } from "../../lib/rateLimit";
import { rateLimitResponse, jsonError } from "../../lib/apiHelpers";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req) {
  const rl = rateLimit(req, "ia");
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  // Verificar autenticación
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("JSON inválido", 400);
  const { partidas } = body;
  if (!Array.isArray(partidas)) return jsonError("Partidas inválidas", 400);
  if (!partidas.length) return NextResponse.json({ predecessors: {} });

  // ── Si hay clave API, usar Claude ────────────────────────────────────────
  if (ANTHROPIC_API_KEY) {
    try {
      const lista = partidas
        .map(p => `ID:${p.id} | Código:${p.codigo} | Familia:${p.familia||"-"} | Desc:${(p.desc||p.descripcion||"").substring(0,80)}`)
        .join("\n");

      const prompt = `Eres experto en programación de obras de construcción en Chile usando CPM (Critical Path Method) y normas ONDAC.

Lista de partidas del proyecto:
${lista}

Sugiere las dependencias Finish-to-Start mínimas y técnicamente necesarias entre ellas.
Sigue la secuencia constructiva estándar chilena:
demolición → movimiento tierras → estructuras → cubierta → instalaciones rough (agua/electricidad/gas) → ventanas/puertas → revestimientos muros/cielos → pavimentos → pintura → artefactos/mobiliario → urbanización.

Reglas:
- Solo incluye dependencias técnicamente obligatorias
- Minimiza al máximo el número de dependencias (no conectes todo con todo)
- Las partidas que pueden ejecutarse en paralelo NO necesitan dependencia
- Instalaciones rough van ANTES de revestimientos y tabiques
- Ventanas y puertas van ANTES de revestimientos

Responde ÚNICAMENTE con JSON:
{"ID_sucesor": ["ID_predecesor1", "ID_predecesor2"], ...}
Solo incluye actividades que tienen predecesoras. Sin texto adicional.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      const text = data.content?.[0]?.text || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      let predecessors = {};
      try { predecessors = jsonMatch ? JSON.parse(jsonMatch[0]) : {}; } catch {}
      return NextResponse.json({ predecessors, source: "ia" });
    } catch (err) {
      // Si falla la IA, caer en reglas
      console.error("Anthropic error, falling back to rules:", err.message);
    }
  }

  // ── Fallback: reglas de construcción chilena ─────────────────────────────
  return NextResponse.json({
    predecessors: {},
    source: "no_key", // el cliente calculará las reglas localmente
  });
}
