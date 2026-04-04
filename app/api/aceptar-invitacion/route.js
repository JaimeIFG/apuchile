import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { codigo, user_id, email } = await req.json();

    if (!codigo || !user_id || !email) {
      return Response.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // Buscar la invitación
    const { data: inv, error: invError } = await supabase
      .from("proyecto_invitaciones")
      .select("*")
      .eq("codigo", codigo)
      .eq("email", email)
      .eq("usado", false)
      .single();

    if (invError || !inv) {
      return Response.json({ error: "Código inválido o no encontrado" }, { status: 404 });
    }

    // Verificar expiración
    if (new Date(inv.expires_at) < new Date()) {
      return Response.json({ error: "El código ha expirado. Pide una nueva invitación." }, { status: 410 });
    }

    // Verificar que no esté ya como colaborador
    const { data: yaColab } = await supabase
      .from("proyecto_colaboradores")
      .select("id")
      .eq("proyecto_id", inv.proyecto_id)
      .eq("user_id", user_id)
      .single();

    if (yaColab) {
      // Marcar invitación como usada y retornar proyecto
      await supabase.from("proyecto_invitaciones").update({ usado: true }).eq("id", inv.id);
      return Response.json({ ok: true, proyecto_id: inv.proyecto_id, ya_colaborador: true });
    }

    // Verificar límite de 2 colaboradores
    const { data: colabs } = await supabase
      .from("proyecto_colaboradores")
      .select("id")
      .eq("proyecto_id", inv.proyecto_id);

    if ((colabs?.length || 0) >= 2) {
      return Response.json({ error: "El proyecto ya tiene el máximo de colaboradores" }, { status: 400 });
    }

    // Agregar como colaborador
    const { error: colabError } = await supabase
      .from("proyecto_colaboradores")
      .insert({
        proyecto_id: inv.proyecto_id,
        user_id,
        email,
        rol: inv.rol,
        invited_by: inv.invited_by,
      });

    if (colabError) {
      return Response.json({ error: "Error al agregar colaborador: " + colabError.message }, { status: 500 });
    }

    // Marcar invitación como usada
    await supabase.from("proyecto_invitaciones").update({ usado: true }).eq("id", inv.id);

    return Response.json({
      ok: true,
      proyecto_id: inv.proyecto_id,
      proyecto_nombre: inv.proyecto_nombre,
      rol: inv.rol,
    });
  } catch (err) {
    console.error("Error aceptar invitación:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
