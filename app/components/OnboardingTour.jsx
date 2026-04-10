"use client";
import { useState, useEffect } from "react";

const PASOS = [
  {
    id: "bienvenida",
    paso: 1,
    titulo: "¡Bienvenido a tu proyecto!",
    descripcion: "APUdesk te guía paso a paso para construir presupuestos precisos, rápidos y profesionales. Este tour te mostrará las secciones clave en menos de un minuto.",
    icono: "🎉",
    tab: null,
  },
  {
    id: "config",
    paso: 2,
    titulo: "Configura tu proyecto",
    descripcion: "En la pestaña Config ⚙️ puedes definir la zona geográfica, IVA, Gastos Generales, Utilidad y los valores de mano de obra. También puedes subir el logo de tu empresa y tu firma digitalizada para el PDF.",
    icono: "⚙️",
    tab: "config",
  },
  {
    id: "biblioteca",
    paso: 3,
    titulo: "Agrega partidas desde la Biblioteca",
    descripcion: "En Biblioteca 📚 encontrarás miles de APUs organizados por familia. Búscalos por nombre o código, ajusta la cantidad y agrégalos a tu presupuesto con un clic.",
    icono: "📚",
    tab: "biblioteca",
  },
  {
    id: "resumen",
    paso: 4,
    titulo: "Revisa tu Presupuesto",
    descripcion: "En Presupuesto 📋 verás todas las partidas agrupadas por capítulo. Puedes editar cantidades, reorganizar con arrastrar y soltar, y ver el costo directo actualizado en tiempo real.",
    icono: "📋",
    tab: "resumen",
  },
  {
    id: "gantt",
    paso: 5,
    titulo: "Planifica con el Gantt",
    descripcion: "La pestaña Gantt 📅 te permite asignar plazos a cada partida y generar una carta Gantt automática. Ideal para incluir en tu propuesta técnica.",
    icono: "📅",
    tab: "gantt",
  },
  {
    id: "export",
    paso: 6,
    titulo: "Exporta tu presupuesto",
    descripcion: "Cuando esté listo, usa el botón «Exportar PDF» para generar un informe profesional con logo, totales, pie de firma y desglose por capítulo. También puedes exportar a JSON.",
    icono: "📄",
    tab: null,
  },
];

const STORAGE_KEY = "apudesk_onboarding_visto";

export default function OnboardingTour({ onCambiarTab }) {
  const [visible, setVisible] = useState(false);
  const [paso, setPaso] = useState(0);
  const [noMostrar, setNoMostrar] = useState(false);

  useEffect(() => {
    const visto = localStorage.getItem(STORAGE_KEY);
    if (!visto) setVisible(true);
  }, []);

  const cerrar = () => {
    if (noMostrar) localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const siguiente = () => {
    const next = paso + 1;
    if (next >= PASOS.length) { cerrar(); return; }
    setPaso(next);
    const tabDestino = PASOS[next].tab;
    if (tabDestino && onCambiarTab) onCambiarTab(tabDestino);
  };

  const anterior = () => {
    const prev = paso - 1;
    if (prev < 0) return;
    setPaso(prev);
    const tabDestino = PASOS[prev].tab;
    if (tabDestino && onCambiarTab) onCambiarTab(tabDestino);
  };

  if (!visible) return null;

  const actual = PASOS[paso];
  const esPrimero = paso === 0;
  const esUltimo = paso === PASOS.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] pointer-events-auto"
        style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)" }}
        onClick={cerrar}
        aria-hidden
      />

      {/* Panel central */}
      <div
        className="fixed z-[201] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full pointer-events-auto"
        style={{ maxWidth: 460 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Paso ${actual.paso} de ${PASOS.length}: ${actual.titulo}`}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="mx-4 rounded-2xl overflow-hidden"
          style={{
            background: "#ffffff",
            boxShadow: "0 32px 80px rgba(0,0,0,0.22), 0 8px 24px rgba(99,102,241,0.15)",
            border: "1px solid rgba(99,102,241,0.15)",
          }}
        >
          {/* Barra de progreso */}
          <div className="flex gap-1 px-5 pt-5">
            {PASOS.map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: i <= paso ? "#6366f1" : "#e2e8f0" }}
              />
            ))}
          </div>

          {/* Contenido */}
          <div className="px-6 pt-5 pb-4">
            {/* Icono */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
              style={{ background: "linear-gradient(135deg,#eef2ff,#ede9fe)" }}
            >
              {actual.icono}
            </div>

            {/* Paso badge */}
            <div className="text-xs font-semibold mb-1" style={{ color: "#6366f1" }}>
              Paso {actual.paso} de {PASOS.length}
            </div>

            {/* Título */}
            <h2 className="text-lg font-bold mb-2" style={{ color: "#0f172a" }}>
              {actual.titulo}
            </h2>

            {/* Descripción */}
            <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>
              {actual.descripcion}
            </p>
          </div>

          {/* Footer */}
          <div
            className="px-6 pb-5 pt-2 flex items-center justify-between gap-3"
            style={{ borderTop: "1px solid #f1f5f9" }}
          >
            {/* No mostrar */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={noMostrar}
                onChange={e => setNoMostrar(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
              />
              <span className="text-xs" style={{ color: "#94a3b8" }}>No mostrar nuevamente</span>
            </label>

            {/* Botones */}
            <div className="flex items-center gap-2">
              {!esPrimero && (
                <button
                  onClick={anterior}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: "#f1f5f9", color: "#475569" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
                  onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}
                >
                  Anterior
                </button>
              )}
              {esPrimero && (
                <button
                  onClick={cerrar}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: "#f1f5f9", color: "#94a3b8" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
                  onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}
                >
                  Saltar
                </button>
              )}
              <button
                onClick={siguiente}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                {esUltimo ? "¡Empezar!" : "Siguiente →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
