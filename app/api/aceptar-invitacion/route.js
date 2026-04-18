import {
  jsonOk, jsonError, handleUnexpected, rateLimitResponse,
  isEmail, getUserFromRequest, getAdminClient,
} from "../../lib/apiHelpers";
import { rateLimit } from "../../lib/rateLimit";
import { MAX_COLABORADORES_POR_PROYECTO } from "../../lib/config";

export async function POST(req) {
  // Rate limit estricto: previene brute force del código.
  const rl = rateLimit(req, "aceptar");
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  try {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("JSON inválido", 400);

    const { codigo, email } = body;
    if (!codigo || !email) return jsonError("Faltan parámetros", 400);
    if (typeof codigo !== "string" || codigo.length < 6 || codigo.length > 32) {
      return jsonError("Código inválido", 400);
    }
    if (!isEmail(email)) return jsonError("Email inválido", 400);

    // Autenticación: usamos el user_id del token, nunca del body
    const caller = await getUserFromRequest(req);
    if (!caller?.userId) return jsonError("No autorizado", 401);

    // Extra: el email del token debe coincidir con el email de la invitación
    if (caller.email && caller.email.toLowerCase() !== email.toLowerCase()) {
      return jsonError("La invitación no corresponde a este usuario", 403);
    }

    // Rate limit adicional por email (contra distribuidos por IPs)
    const rl2 = rateLimit(req, "aceptar", email.toLowerCase());
    if (!rl2.ok) return rateLimitResponse(rl2.retryAfter);

    const supabase = getAdminClient();

    // Buscar invitación válida
    const { data: inv, error: invError } = await supabase
      .from("proyecto_invitaciones")
      .select("*")
      .eq("codigo", codigo)
      .eq("email", email)
      .eq("usado", false)
      .maybeSingle();

    if (invError) {
      console.error("[aceptar] select:", invError);
      return jsonError("No se pudo validar el código", 500);
    }
    if (!inv) return jsonError("Código inválido o no encontrado", 404);

    if (new Date(inv.expires_at) < new Date()) {
      return jsonError("El código ha expirado. Pide una nueva invitación.", 410);
    }

    // Ya es colaborador
    const { data: yaColab } = await supabase
      .from("proyecto_colaboradores")
      .select("id").eq("proyecto_id", inv.proyecto_id).eq("user_id", caller.userId).maybeSingle();
    if (yaColab) {
      await supabase.from("proyecto_invitaciones").update({ usado: true }).eq("id", inv.id);
      return jsonOk({ proyecto_id: inv.proyecto_id, ya_colaborador: true });
    }

    // Límite de colaboradores
    const { data: colabs } = await supabase
      .from("proyecto_colaboradores").select("id").eq("proyecto_id", inv.proyecto_id);
    if ((colabs?.length || 0) >= MAX_COLABORADORES_POR_PROYECTO) {
      return jsonError("El proyecto ya tiene el máximo de colaboradores", 400);
    }

    // Insertar
    const { error: colabError } = await supabase
      .from("proyecto_colaboradores")
      .insert({
        proyecto_id: inv.proyecto_id,
        user_id: caller.userId,
        email,
        rol: inv.rol,
        invited_by: inv.invited_by,
      });
    if (colabError) {
      console.error("[aceptar] insert colab:", colabError);
      return jsonError("No se pudo agregar al proyecto", 500);
    }

    await supabase.from("proyecto_invitaciones").update({ usado: true }).eq("id", inv.id);

    return jsonOk({
      proyecto_id: inv.proyecto_id,
      proyecto_nombre: inv.proyecto_nombre,
      rol: inv.rol,
    });
  } catch (err) {
    return handleUnexpected(err, "aceptar-invitacion");
  }
}
