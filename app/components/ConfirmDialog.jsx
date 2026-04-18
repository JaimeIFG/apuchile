"use client";
import { useEffect, useRef } from "react";

/**
 * Modal de confirmación accesible.
 * - ESC cierra
 * - Focus atrapado en los botones
 * - Overlay click = cancelar
 *
 * Props:
 *   open, titulo, mensaje, confirmarTexto, cancelarTexto,
 *   onConfirm, onCancel, variante ('danger' | 'default'), cargando
 */
export default function ConfirmDialog({
  open,
  titulo = "¿Confirmar acción?",
  mensaje = "",
  confirmarTexto = "Confirmar",
  cancelarTexto = "Cancelar",
  onConfirm,
  onCancel,
  variante = "default",
  cargando = false,
  children,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && !cargando) onCancel?.(); };
    document.addEventListener("keydown", onKey);
    // Focus inicial en el botón cancelar para prevenir ejecutar acciones destructivas con Enter
    const t = setTimeout(() => confirmRef.current?.focus?.(), 50);
    return () => { document.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [open, onCancel, cargando]);

  if (!open) return null;

  const btnConfirmCls = variante === "danger"
    ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-400"
    : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-400";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => { if (e.target === e.currentTarget && !cargando) onCancel?.(); }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 id="confirm-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          {titulo}
        </h3>
        {mensaje && <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{mensaje}</p>}
        {children}
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={cargando}
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {cancelarTexto}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={cargando}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 focus:outline-none focus:ring-2 ${btnConfirmCls}`}
          >
            {cargando ? "Procesando…" : confirmarTexto}
          </button>
        </div>
      </div>
    </div>
  );
}
