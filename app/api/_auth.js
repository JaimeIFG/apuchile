/**
 * Helper compartido para verificar autenticación en API routes.
 * Retorna { user } si el token es válido, o lanza Response 401.
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function requireAuth(request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return { user: null, errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  return { user, errorResponse: null };
}
