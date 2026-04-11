"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/**
 * SpotlightTour — tour con efecto spotlight (foco sobre el elemento)
 *
 * Props:
 *   pasos: [{ titulo, descripcion, icono, targetId, posPanel }]
 *     targetId: id del elemento HTML a iluminar (null = centro de pantalla)
 *     posPanel: "top"|"bottom"|"left"|"right"|"center" (default "bottom")
 *   storageKey: clave localStorage para "no mostrar nuevamente"
 *   onFin: callback al terminar
 */
export default function SpotlightTour({ pasos, storageKey, onFin }) {
  const [visible, setVisible] = useState(false);
  const [paso, setPaso]       = useState(0);
  const [noMostrar, setNoMostrar] = useState(false);
  const [rect, setRect]       = useState(null); // BoundingRect del target
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const panelRef = useRef(null);

  // Mostrar solo si no se vio antes
  useEffect(() => {
    const visto = localStorage.getItem(storageKey);
    if (!visto) setVisible(true);
  }, [storageKey]);

  // Calcular posición del spotlight y del panel
  const calcular = useCallback(() => {
    const actual = pasos[paso];
    if (!actual) return;

    let r = null;
    if (actual.targetId) {
      const el = document.getElementById(actual.targetId);
      if (el) {
        const b = el.getBoundingClientRect();
        const pad = 10;
        r = {
          x: b.left - pad,
          y: b.top - pad,
          w: b.width + pad * 2,
          h: b.height + pad * 2,
          cx: b.left + b.width / 2,
          cy: b.top + b.height / 2,
        };
      }
    }

    setRect(r);

    // Calcular posición del panel
    if (!panelRef.current) return;
    const pw = panelRef.current.offsetWidth  || 360;
    const ph = panelRef.current.offsetHeight || 220;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 16;

    let top, left;

    if (!r) {
      // Centro de pantalla
      top  = vh / 2 - ph / 2;
      left = vw / 2 - pw / 2;
    } else {
      const pos = actual.posPanel || "bottom";
      if (pos === "bottom") {
        top  = Math.min(r.y + r.h + margin, vh - ph - margin);
        left = Math.max(margin, Math.min(r.cx - pw / 2, vw - pw - margin));
      } else if (pos === "top") {
        top  = Math.max(margin, r.y - ph - margin);
        left = Math.max(margin, Math.min(r.cx - pw / 2, vw - pw - margin));
      } else if (pos === "right") {
        top  = Math.max(margin, Math.min(r.cy - ph / 2, vh - ph - margin));
        left = Math.min(r.x + r.w + margin, vw - pw - margin);
      } else if (pos === "left") {
        top  = Math.max(margin, Math.min(r.cy - ph / 2, vh - ph - margin));
        left = Math.max(margin, r.x - pw - margin);
      } else {
        top  = vh / 2 - ph / 2;
        left = vw / 2 - pw / 2;
      }
    }

    setPanelPos({ top: Math.round(top), left: Math.round(left) });
  }, [paso, pasos]);

  useEffect(() => {
    if (!visible) return;
    // Pequeño delay para que el DOM esté listo
    const t = setTimeout(() => {
      calcular();
    }, 80);
    const onResize = () => calcular();
    window.addEventListener("resize", onResize);
    return () => { clearTimeout(t); window.removeEventListener("resize", onResize); };
  }, [visible, paso, calcular]);

  const cerrar = () => {
    if (noMostrar) localStorage.setItem(storageKey, "1");
    setVisible(false);
    onFin?.();
  };

  const siguiente = () => {
    if (paso + 1 >= pasos.length) { cerrar(); return; }
    setPaso(p => p + 1);
  };

  const anterior = () => {
    if (paso - 1 < 0) return;
    setPaso(p => p - 1);
  };

  if (!visible) return null;

  const actual  = pasos[paso];
  const total   = pasos.length;
  const vw = typeof window !== "undefined" ? window.innerWidth  : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // SVG spotlight path: rectángulo con agujero en el target
  let svgPath = `M0,0 H${vw} V${vh} H0 Z`;
  if (rect) {
    const r  = 16; // border-radius del agujero
    const { x, y, w, h } = rect;
    // Recorte redondeado (usando arc)
    svgPath =
      `M0,0 H${vw} V${vh} H0 Z ` +
      `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} ` +
      `V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} ` +
      `H${x + r} Q${x},${y + h} ${x},${y + h - r} ` +
      `V${y + r} Q${x},${y} ${x + r},${y} Z`;
  }

  return (
    <>
      {/* Overlay SVG con agujero */}
      <svg
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9000, width: vw, height: vh }}
        aria-hidden
      >
        <defs>
          <filter id="spotlight-blur">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        <path
          d={svgPath}
          fill="rgba(15,23,42,0.62)"
          fillRule="evenodd"
          style={{ transition: "d 0.35s cubic-bezier(0.4,0,0.2,1)" }}
        />
        {/* Brillo sutil alrededor del spotlight */}
        {rect && (
          <rect
            x={rect.x - 2} y={rect.y - 2}
            width={rect.w + 4} height={rect.h + 4}
            rx={18} ry={18}
            fill="none"
            stroke="rgba(99,102,241,0.55)"
            strokeWidth="2"
            style={{ filter: "drop-shadow(0 0 8px rgba(99,102,241,0.6))" }}
          />
        )}
      </svg>

      {/* Panel flotante */}
      <div
        ref={panelRef}
        className="fixed pointer-events-auto"
        style={{
          zIndex: 9001,
          top: panelPos.top,
          left: panelPos.left,
          width: 360,
          transition: "top 0.35s cubic-bezier(0.4,0,0.2,1), left 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Paso ${paso + 1} de ${total}: ${actual.titulo}`}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "#ffffff",
            boxShadow: "0 24px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(99,102,241,0.2)",
            border: "1px solid rgba(99,102,241,0.2)",
          }}
        >
          {/* Barra de progreso */}
          <div className="flex gap-1 px-5 pt-4">
            {pasos.map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: i <= paso ? "#6366f1" : "#e2e8f0" }}
              />
            ))}
          </div>

          {/* Contenido */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: "linear-gradient(135deg,#eef2ff,#ede9fe)" }}
              >
                {actual.icono}
              </div>
              <div>
                <div className="text-[10px] font-semibold mb-0.5" style={{ color: "#6366f1" }}>
                  Paso {paso + 1} de {total}
                </div>
                <h3 className="text-[15px] font-bold leading-snug" style={{ color: "#0f172a" }}>
                  {actual.titulo}
                </h3>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed mt-3" style={{ color: "#475569" }}>
              {actual.descripcion}
            </p>
          </div>

          {/* Footer */}
          <div
            className="px-5 pb-4 pt-2 flex items-center justify-between gap-2"
            style={{ borderTop: "1px solid #f1f5f9" }}
          >
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={noMostrar}
                onChange={e => setNoMostrar(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
              />
              <span className="text-[11px]" style={{ color: "#94a3b8" }}>No mostrar de nuevo</span>
            </label>

            <div className="flex items-center gap-2">
              {paso === 0 ? (
                <button
                  onClick={cerrar}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: "#f1f5f9", color: "#94a3b8" }}
                >
                  Saltar
                </button>
              ) : (
                <button
                  onClick={anterior}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: "#f1f5f9", color: "#475569" }}
                >
                  ← Atrás
                </button>
              )}
              <button
                onClick={siguiente}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                {paso + 1 === total ? "¡Listo! 🎉" : "Siguiente →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
