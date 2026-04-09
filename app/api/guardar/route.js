import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Endpoint usado por sendBeacon al cerrar la pestaña
export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body?.datos) return NextResponse.json({ ok: false }, { status: 400 });
  const metaUpdate = body.meta ? { meta: body.meta } : {};

  // Verificar autenticación con el anon key (respeta RLS)
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  // Verificar que el usuario es dueño o colaborador con permiso de editar
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: proyecto } = await supabaseAdmin
    .from("proyectos")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!proyecto) return NextResponse.json({ ok: false, error: "Proyecto no encontrado" }, { status: 404 });

  const esOwner = proyecto.user_id === user.id;

  if (!esOwner) {
    const { data: colab } = await supabaseAdmin
      .from("proyecto_colaboradores")
      .select("rol")
      .eq("proyecto_id", id)
      .eq("user_id", user.id)
      .single();

    const rolesPermitidos = ["editar", "administrar"];
    if (!colab || !rolesPermitidos.includes(colab.rol)) {
      return NextResponse.json({ ok: false, error: "Sin permiso para guardar" }, { status: 403 });
    }
  }

  const { error } = await supabaseAdmin
    .from("proyectos")
    .update({ datos: body.datos, ...metaUpdate })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
