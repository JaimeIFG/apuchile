import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function generarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
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
    const { email, rol, empresa_id, empresa_nombre, invitado_por_nombre } = await req.json();

    if (!email || !rol || !empresa_id)
      return Response.json({ error: "Faltan parámetros" }, { status: 400 });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return Response.json({ error: "Email inválido" }, { status: 400 });

    // Verificar autenticación
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return Response.json({ error: "No autorizado" }, { status: 401 });

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

    // Verificar que el invitador es admin o creador de la empresa
    const { data: empresa } = await supabase
      .from("empresas").select("created_by").eq("id", empresa_id).single();
    const esCreador = empresa?.created_by === user.id;
    if (!esCreador) {
      const { data: miembro } = await supabase
        .from("empresa_miembros")
        .select("rol").eq("empresa_id", empresa_id).eq("user_id", user.id).single();
      if (!miembro || miembro.rol !== "admin")
        return Response.json({ error: "Sin permiso para invitar miembros" }, { status: 403 });
    }

    // Verificar que no sea ya miembro
    const { data: miembros } = await supabase
      .from("empresa_miembros").select("email").eq("empresa_id", empresa_id);
    if ((miembros || []).some(m => m.email === email))
      return Response.json({ error: "Este usuario ya es miembro de la empresa" }, { status: 400 });

    // Invalidar invitaciones previas
    await supabase.from("empresa_invitaciones")
      .update({ usado: true })
      .eq("empresa_id", empresa_id).eq("email", email).eq("usado", false);

    // Crear nueva invitación (válida 10 minutos)
    const codigo = generarCodigo();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase.from("empresa_invitaciones").insert({
      empresa_id, email, codigo, rol, empresa_nombre, invitado_por_nombre, expires_at,
    });
    if (insertErr)
      return Response.json({ error: "Error al crear invitación: " + insertErr.message }, { status: 500 });

    const rolLabel = { admin: "Administrador", editor: "Editor", visor: "Visor" }[rol] || rol;

    const { error: emailErr } = await resend.emails.send({
      from: "APUdesk <onboarding@resend.dev>",
      to: [email],
      subject: `${invitado_por_nombre || "Un usuario"} te invita a unirte a "${empresa_nombre}" en APUdesk`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:32px 20px;">
          <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.06);">
            <div style="text-align:center;margin-bottom:28px;">
              <div style="background:linear-gradient(135deg,#4338ca,#6366f1);border-radius:12px;display:inline-block;padding:10px 20px;">
                <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">APUdesk</span>
              </div>
            </div>
            <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;text-align:center;">Invitación a empresa</h2>
            <p style="color:#64748b;text-align:center;margin:0 0 24px;font-size:14px;line-height:1.6;">
              <strong style="color:#1e293b;">${invitado_por_nombre || "Un usuario"}</strong> te ha invitado a unirte a la empresa
              <strong style="color:#6366f1;">"${empresa_nombre}"</strong>
              con el rol de <strong>${rolLabel}</strong>.
            </p>
            <div style="background:#eef2ff;border:2px solid #6366f1;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <p style="color:#4338ca;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">
                Tu código de acceso
              </p>
              <p style="font-size:42px;font-weight:900;color:#6366f1;letter-spacing:10px;margin:0;font-family:monospace;">
                ${codigo}
              </p>
              <p style="color:#64748b;font-size:12px;margin:10px 0 0;">⏱️ Válido por 10 minutos</p>
            </div>
            <p style="color:#64748b;font-size:13px;text-align:center;line-height:1.6;margin:0 0 20px;">
              Ingresa a <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://apudesk.vercel.app"}" style="color:#6366f1;font-weight:700;">APUdesk</a>,
              ve a tu dashboard y haz clic en <strong>"Unirse a empresa"</strong> para ingresar el código.
            </p>
            <div style="border-top:1px solid #e2e8f0;padding-top:16px;text-align:center;">
              <p style="color:#94a3b8;font-size:11px;margin:0;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
            </div>
          </div>
        </div>
      `,
    });

    if (emailErr) {
      console.error("Resend error:", emailErr);
      return Response.json({ ok: true, emailEnviado: false, codigo, warning: "No se pudo enviar el email" });
    }

    return Response.json({ ok: true, emailEnviado: true, codigo });
  } catch (err) {
    console.error("Error invitar empresa:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
