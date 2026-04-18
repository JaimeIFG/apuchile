// Rate limiter simple en memoria.
// Nota: en despliegues serverless multi-instancia (Vercel) esto es aproximado
// —cada instancia mantiene su propio contador—. Para protección estricta
// usar un store compartido (Upstash Redis / Vercel KV). Esta implementación
// ya reduce mucho el ataque desde una IP contra la misma instancia.

import { RATE_LIMIT } from "./config";

const buckets = new Map(); // key -> [timestamps]

/**
 * @param {Request} req
 * @param {keyof typeof RATE_LIMIT} bucketName
 * @param {string} [extraKey] identificador adicional (userId, email...)
 * @returns {{ok:true} | {ok:false, retryAfter:number}}
 */
export function rateLimit(req, bucketName = "default", extraKey = "") {
  const cfg = RATE_LIMIT[bucketName] || RATE_LIMIT.default;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const key = `${bucketName}:${ip}:${extraKey}`;
  const now = Date.now();
  const windowStart = now - cfg.windowMs;

  let arr = buckets.get(key) || [];
  arr = arr.filter((t) => t > windowStart);

  if (arr.length >= cfg.max) {
    const retryAfter = Math.ceil((arr[0] + cfg.windowMs - now) / 1000);
    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  }

  arr.push(now);
  buckets.set(key, arr);

  // Limpieza periódica (evita fuga en procesos largos)
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      const filtered = v.filter((t) => t > now - 5 * 60_000);
      if (filtered.length === 0) buckets.delete(k);
      else buckets.set(k, filtered);
    }
  }

  return { ok: true };
}
