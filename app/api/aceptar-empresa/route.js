import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { codigo, email } = await req.json();
    if (!codigo || !email)
      return Response.json({ error: "Faltan parámetros" }, { status: 400 });

    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return Response.json({ error: "No autorizado" }, { status: 401 });

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

    // Buscar invitación válida
    const { data: inv, error: invErr } = await supabase
      .from("empresa_invitaciones")
      .select("*")
      .eq("codigo", codigo.trim().toUpperCase())
      .eq("email", email)
      .eq("usado", false)
      .single();

    if (invErr || !inv)
      return Response.json({ error: "Código inválido o no encontrado" }, { status: 400 });

    if (new Date(inv.expires_at) < new Date())
      return Response.json({ error: "El código ha expirado. Solicita una nueva invitación." }, { status: 400 });

    // Verificar que no sea ya miembro
    const { data: existing } = await supabase
      .from("empresa_miembros")
      .select("id")
      .eq("empresa_id", inv.empresa_id)
      .eq("user_id", user.id)
      .single();

    if (existing)
      return Response.json({ error: "Ya eres miembro de esta empresa" }, { status: 400 });

    // Agregar como miembro
    const { error: insertErr } = await supabase.from("empresa_miembros").insert({
      empresa_id: inv.empresa_id,
      user_id: user.id,
      email: user.email,
      rol: inv.rol,
      invited_by: null,
    });
    if (insertErr)
      return Response.json({ error: "Error al unirse: " + insertErr.message }, { status: 500 });

    // Marcar invitación como usada
    await supabase.from("empresa_invitaciones").update({ usado: true }).eq("id", inv.id);

    return Response.json({
      ok: true,
      empresa_id: inv.empresa_id,
      empresa_nombre: inv.empresa_nombre,
      rol: inv.rol,
    });
  } catch (err) {
    console.error("Error aceptar empresa:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
