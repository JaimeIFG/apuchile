import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Endpoint usado por sendBeacon al cerrar la pestaña
export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body?.datos) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  await supabase
    .from("proyectos")
    .update({ datos: body.datos, updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
