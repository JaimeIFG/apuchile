// Helpers comunes para rutas API.
// - Respuestas estandarizadas (NextResponse.json).
// - Sanitización de errores: nunca exponer err.message al cliente en prod.
// - Validaciones de input (email, uuid, región, rol, path seguro).

import { NextResponse } from "next/server";
import { REGIONES, ROLES_COLABORADOR, CODIGO_INVITACION_CHARS, CODIGO_INVITACION_LEN } from "./config";
import { createClient } from "@supabase/supabase-js";

// ---------- Respuestas ----------
export function jsonOk(body = {}, init = {}) {
  return NextResponse.json({ ok: true, ...body }, init);
}

export function jsonError(message, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/**
 * Sanitiza un error y responde.
 * - En desarrollo incluye el mensaje real para debug.
 * - En producción devuelve un mensaje genérico + id correlación.
 */
export function handleUnexpected(err, label = "api") {
  const id = Math.random().toString(36).slice(2, 10);
  // siempre logear internamente
  console.error(`[${label}:${id}]`, err);
  const isDev = process.env.NODE_ENV !== "production";
  return jsonError(
    isDev ? `Error interno (${label}): ${err?.message || "desconocido"}` : "Error interno del servidor",
    500,
    { ref: id }
  );
}

export function rateLimitResponse(retryAfter) {
  return NextResponse.json(
    { ok: false, error: "Demasiadas solicitudes. Intenta más tarde." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

// ---------- Validadores ----------
// Email: RFC 5322-lite razonable. No permite espacios, requiere dominio con TLD.
// Límite de longitud práctica para evitar ReDoS.
const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,24}$/;
export function isEmail(v) {
  if (typeof v !== "string") return false;
  if (v.length > 254 || v.length < 5) return false;
  return EMAIL_RE.test(v);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === "string" && UUID_RE.test(v);

export const isRol = (v) => ROLES_COLABORADOR.includes(v);
export const isRegion = (v) => REGIONES.includes(v);

/**
 * Valida que un path de Supabase Storage sea seguro.
 * - Previene traversal (.., //, / inicial).
 * - Rechaza encoding sospechoso.
 * - Exige extensión permitida si se indica.
 */
export function isSafeStoragePath(path, allowedExt = null) {
  if (typeof path !== "string") return false;
  if (path.length === 0 || path.length > 512) return false;
  // Rechazar encodings comunes de traversal
  const lower = path.toLowerCase();
  const sospechoso = ["..", "//", "\\", "%2e%2e", "%2f%2f", "%5c", "\0", "\r", "\n"];
  for (const s of sospechoso) if (lower.includes(s)) return false;
  if (path.startsWith("/")) return false;
  // Solo alfanumérico, _, -, ., /
  if (!/^[A-Za-z0-9._\-/]+$/.test(path)) return false;
  if (allowedExt) {
    const ok = allowedExt.some((e) => lower.endsWith(e.toLowerCase()));
    if (!ok) return false;
  }
  return true;
}

// ---------- Código de invitación criptográficamente aleatorio ----------
export function generarCodigoInvitacion() {
  // Usa crypto si está disponible (edge/node). Fallback a Math.random para dev.
  const chars = CODIGO_INVITACION_CHARS;
  const len = CODIGO_INVITACION_LEN;
  let out = "";
  try {
    const bytes = new Uint8Array(len);
    (globalThis.crypto || require("crypto").webcrypto).getRandomValues(bytes);
    for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
    return out;
  } catch {
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }
}

// ---------- Auth helpers ----------
/**
 * Extrae y verifica el user desde el header Authorization: Bearer <token>.
 * Retorna { userId, email } o null.
 */
export async function getUserFromRequest(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return null;
    return { userId: user.id, email: user.email || null };
  } catch {
    return null;
  }
}

export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Valida y devuelve tamaño de archivo permitido.
 */
export function assertFileSize(file, maxBytes, label = "archivo") {
  if (!file) return `No se recibió ${label}`;
  const size = file.size ?? file.byteLength ?? 0;
  if (size <= 0) return `${label} vacío`;
  if (size > maxBytes) return `${label} supera el tamaño máximo (${Math.round(maxBytes / 1024 / 1024)} MB)`;
  return null;
}
