"use client";

/**
 * Indicador discreto de estado de guardado.
 * Se usa en esquinas/headers para que el usuario sepa si sus cambios
 * están sincronizados con el servidor.
 *
 * Estado:
 *   - 'saving'  → ⏳ Guardando…
 *   - 'saved'   → ✓ Guardado
 *   - 'error'   → ⚠ No se pudo guardar
 *   - 'offline' → 🔌 Sin conexión — los cambios se guardarán al volver
 *   - 'idle'    → invisible
 */
export default function SaveIndicator({ estado = "idle", ultimoGuardado = null, className = "" }) {
  if (estado === "idle") return null;

  const styles = {
    saving:  { bg: "bg-indigo-50 dark:bg-indigo-900/30", fg: "text-indigo-700 dark:text-indigo-300", icon: "⏳", label: "Guardando…" },
    saved:   { bg: "bg-emerald-50 dark:bg-emerald-900/30", fg: "text-emerald-700 dark:text-emerald-300", icon: "✓", label: "Guardado" },
    error:   { bg: "bg-rose-50 dark:bg-rose-900/30", fg: "text-rose-700 dark:text-rose-300", icon: "⚠", label: "Error al guardar" },
    offline: { bg: "bg-amber-50 dark:bg-amber-900/30", fg: "text-amber-700 dark:text-amber-300", icon: "🔌", label: "Sin conexión — cambios pendientes" },
  }[estado] || null;

  if (!styles) return null;

  const hora = estado === "saved" && ultimoGuardado
    ? new Date(ultimoGuardado).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles.bg} ${styles.fg} ${className}`}
    >
      <span aria-hidden="true">{styles.icon}</span>
      <span>{styles.label}{hora ? ` · ${hora}` : ""}</span>
    </div>
  );
}
