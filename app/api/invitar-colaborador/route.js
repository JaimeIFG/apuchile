import { Resend } from "resend";
import {
  jsonOk, jsonError, handleUnexpected, rateLimitResponse,
  isEmail, isUuid, isRol, generarCodigoInvitacion,
  getUserFromRequest, getAdminClient,
} from "../../lib/apiHelpers";
import { rateLimit } from "../../lib/rateLimit";
import { MAX_COLABORADORES_POR_PROYECTO, INVITACION_TTL_MIN, INVITACION_TTL_MS } from "../../lib/config";

export async function POST(req) {
  // Rate limit por IP (anti-spam/brute-force).
  const rl = rateLimit(req, "invitar");
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  try {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("JSON inválido", 400);

    const { email, rol, proyecto_id, proyecto_nombre, invitado_por_nombre } = body;

    // Validaciones estrictas
    if (!email || !rol || !proyecto_id) return jsonError("Faltan parámetros", 400);
    if (!isEmail(email)) return jsonError("Email inválido", 400);
    if (!isRol(rol)) return jsonError("Rol inválido", 400);
    if (!isUuid(proyecto_id)) return jsonError("Proyecto inválido", 400);
    if (proyecto_nombre && (typeof proyecto_nombre !== "string" || proyecto_nombre.length > 200))
      return jsonError("Nombre de proyecto inválido", 400);

    // Autenticación
    const caller = await getUserFromRequest(req);
    if (!caller?.userId) return jsonError("No autorizado", 401);

    const supabase = getAdminClient();

    // Permiso: dueño o administrador del proyecto
    const { data: proyecto } = await supabase
      .from("proyectos").select("user_id").eq("id", proyecto_id).single();
    const esOwner = proyecto?.user_id === caller.userId;
    if (!esOwner) {
      const { data: colab } = await supabase
        .from("proyecto_colaboradores")
        .select("rol").eq("proyecto_id", proyecto_id).eq("user_id", caller.userId).single();
      if (!colab || colab.rol !== "administrar") {
        return jsonError("Sin permiso para invitar colaboradores", 403);
      }
    }

    // Chequear colaboradores existentes
    const { data: colabs } = await supabase
      .from("proyecto_colaboradores").select("id, email").eq("proyecto_id", proyecto_id);

    if ((colabs || []).some(c => c.email === email)) {
      return jsonError("Este usuario ya es colaborador del proyecto", 400);
    }
    if ((colabs?.length || 0) >= MAX_COLABORADORES_POR_PROYECTO) {
      return jsonError(`El proyecto ya tiene el máximo de ${MAX_COLABORADORES_POR_PROYECTO} colaboradores`, 400);
    }

    // Invalidar invitaciones previas al mismo email
    await supabase
      .from("proyecto_invitaciones")
      .update({ usado: true })
      .eq("proyecto_id", proyecto_id).eq("email", email).eq("usado", false);

    // Generar código criptográficamente aleatorio (16 chars → >10^24 combinaciones)
    const codigo = generarCodigoInvitacion();
    const expires_at = new Date(Date.now() + INVITACION_TTL_MS).toISOString();

    const { error: insertError } = await supabase
      .from("proyecto_invitaciones")
      .insert({
        proyecto_id, email, codigo, rol, proyecto_nombre, invitado_por_nombre,
        expires_at, invited_by: caller.userId,
      });
    if (insertError) {
      console.error("[invitar] insert:", insertError);
      return jsonError("No se pudo crear la invitación", 500);
    }

    // Enviar email (no bloquear si falla)
    let emailEnviado = false;
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const rolLabel = { visualizar: "visualizar", editar: "editar", administrar: "administrar" }[rol] || rol;
      const { error: emailError } = await resend.emails.send({
        from: "APUdesk <onboarding@resend.dev>",
        to: [email],
        subject: `${invitado_por_nombre || "Un usuario"} te invita a colaborar en "${proyecto_nombre}"`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; padding: 32px 20px;">
          <div style="background: #fff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
            <div style="text-align: center; margin-bottom: 28px;">
              <div style="background: linear-gradient(135deg,#4338ca,#6366f1); border-radius: 12px; display: inline-block; padding: 10px 20px;">
                <span style="color: #fff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">APUdesk</span>
              </div>
            </div>
            <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 8px; text-align: center;">Invitación a colaborar</h2>
            <p style="color: #64748b; text-align: center; margin: 0 0 24px; font-size: 14px; line-height: 1.6;">
              <strong style="color: #1e293b;">${invitado_por_nombre || "Un usuario"}</strong> te ha invitado a colaborar en el proyecto
              <strong style="color: #6366f1;">"${proyecto_nombre}"</strong> con rol de <strong>${rolLabel}</strong>.
            </p>
            <div style="background: #eef2ff; border: 2px solid #6366f1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="color: #4338ca; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px;">Tu código de acceso</p>
              <p style="font-size: 28px; font-weight: 900; color: #6366f1; letter-spacing: 4px; margin: 0; font-family: monospace; word-break: break-all;">${codigo}</p>
              <p style="color: #64748b; font-size: 12px; margin: 10px 0 0;">⏱️ Válido por ${INVITACION_TTL_MIN} minutos</p>
            </div>
            <p style="color: #64748b; font-size: 13px; text-align: center; line-height: 1.6; margin: 0 0 20px;">
              Ingresa a <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://apudesk.vercel.app"}" style="color: #6366f1; font-weight: 700;">APUdesk</a>,
              ve a tu dashboard y haz clic en <strong>"Unirse a proyecto"</strong> para ingresar el código.
            </p>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
            </div>
          </div>
        </div>`,
      });
      emailEnviado = !emailError;
      if (emailError) console.error("[invitar] resend:", emailError);
    } catch (e) {
      console.error("[invitar] resend throw:", e);
    }

    // No devolvemos el código al cliente si el email se envió correctamente
    // (así un colaborador 'administrar' no puede extraer códigos para otros).
    // Si falla el email, permitimos al owner/caller copiarlo.
    return jsonOk({ emailEnviado, ...(emailEnviado ? {} : { codigo }) });
  } catch (err) {
    return handleUnexpected(err, "invitar-colaborador");
  }
}
