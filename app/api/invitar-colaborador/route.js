import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { email, rol, proyecto_id, proyecto_nombre, invitado_por_nombre } = await req.json();

    if (!email || !rol || !proyecto_id) {
      return Response.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return Response.json({ error: "Email inválido" }, { status: 400 });

    // Verificar autenticación
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    let callerId = null;
    if (token) {
      const supabaseAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user } } = await supabaseAuth.auth.getUser();
      callerId = user?.id || null;
    }
    if (!callerId) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que el que invita es dueño o administrador del proyecto
    const { data: proyecto } = await supabase
      .from("proyectos")
      .select("user_id")
      .eq("id", proyecto_id)
      .single();

    const esOwner = proyecto?.user_id === callerId;
    if (!esOwner) {
      const { data: colab } = await supabase
        .from("proyecto_colaboradores")
        .select("rol")
        .eq("proyecto_id", proyecto_id)
        .eq("user_id", callerId)
        .single();
      if (!colab || colab.rol !== "administrar") {
        return Response.json({ error: "Sin permiso para invitar colaboradores" }, { status: 403 });
      }
    }

    // Verificar que no tenga ya 3 colaboradores (incluyendo dueño = 2 colaboradores más)
    // Verificar también si ya es colaborador
    const { data: colabs } = await supabase
      .from("proyecto_colaboradores")
      .select("id, email")
      .eq("proyecto_id", proyecto_id);

    if ((colabs || []).some(c => c.email === email)) {
      return Response.json({ error: "Este usuario ya es colaborador del proyecto" }, { status: 400 });
    }

    if ((colabs?.length || 0) >= 2) {
      return Response.json({ error: "El proyecto ya tiene el máximo de 2 colaboradores (3 usuarios en total)" }, { status: 400 });
    }

    // Invalidar invitaciones previas al mismo email para este proyecto
    await supabase
      .from("proyecto_invitaciones")
      .update({ usado: true })
      .eq("proyecto_id", proyecto_id)
      .eq("email", email)
      .eq("usado", false);

    // Generar código de 8 caracteres válido por 5 minutos
    const codigo = generarCodigo();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Guardar nueva invitación
    const { error: insertError } = await supabase
      .from("proyecto_invitaciones")
      .insert({
        proyecto_id,
        email,
        codigo,
        rol,
        proyecto_nombre,
        invitado_por_nombre,
        expires_at,
      });

    if (insertError) {
      return Response.json({ error: "Error al crear invitación: " + insertError.message }, { status: 500 });
    }

    // Enviar email con Resend
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

            <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 8px; text-align: center;">
              Invitación a colaborar
            </h2>
            <p style="color: #64748b; text-align: center; margin: 0 0 24px; font-size: 14px; line-height: 1.6;">
              <strong style="color: #1e293b;">${invitado_por_nombre || "Un usuario"}</strong> te ha invitado a colaborar en el proyecto
              <strong style="color: #6366f1;">"${proyecto_nombre}"</strong>
              con rol de <strong>${rolLabel}</strong>.
            </p>

            <div style="background: #eef2ff; border: 2px solid #6366f1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="color: #4338ca; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px;">
                Tu código de acceso
              </p>
              <p style="font-size: 42px; font-weight: 900; color: #6366f1; letter-spacing: 10px; margin: 0; font-family: monospace;">
                ${codigo}
              </p>
              <p style="color: #64748b; font-size: 12px; margin: 10px 0 0;">
                ⏱️ Válido por 5 minutos
              </p>
            </div>

            <p style="color: #64748b; font-size: 13px; text-align: center; line-height: 1.6; margin: 0 0 20px;">
              Ingresa a <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://apudesk.vercel.app"}" style="color: #6366f1; font-weight: 700;">APUdesk</a>,
              ve a tu dashboard y haz clic en <strong>"Unirse a proyecto"</strong> para ingresar el código.
            </p>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                Si no esperabas esta invitación, puedes ignorar este correo.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("Error Resend:", emailError);
      return Response.json({ ok: true, emailEnviado: false, codigo, warning: "No se pudo enviar el email" });
    }

    return Response.json({ ok: true, emailEnviado: true, codigo });
  } catch (err) {
    console.error("Error invitar colaborador:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
