"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Duración de cada pantalla en ms ──────────────────────────────────────────
const SLIDE_DURATION = 4000;

// ── Pantalla 1: Dashboard ─────────────────────────────────────────────────────
function ScreenDashboard() {
  const proyectos = [
    { nombre: "Edificio Las Acacias", region: "Metropolitana", partidas: 42, total: "$142.8M", pct: 78, color: "#6366f1" },
    { nombre: "Conjunto Habitacional Porvenir", region: "Magallanes", partidas: 31, total: "$89.4M", pct: 45, color: "#8b5cf6" },
    { nombre: "Mejoramiento Vial Ruta 5", region: "Biobío", partidas: 18, total: "$34.1M", pct: 92, color: "#10b981" },
  ];
  return (
    <div className="p-5 space-y-3" style={{ background: "#f8fafc", minHeight: 320 }}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Proyectos activos", value: "3", color: "#6366f1" },
          { label: "Costo total", value: "$266M", color: "#8b5cf6" },
          { label: "Partidas totales", value: "91", color: "#10b981" },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="rounded-xl p-3 bg-white" style={{ border: "1px solid #e2e8f0" }}>
            <p className="text-[10px] mb-1" style={{ color: "#94a3b8" }}>{s.label}</p>
            <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
          </motion.div>
        ))}
      </div>
      {/* Lista proyectos */}
      <div className="space-y-2">
        {proyectos.map((p, i) => (
          <motion.div key={p.nombre}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
            className="bg-white rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ border: "1px solid #e2e8f0" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: p.color + "18" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={p.color} strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "#0f172a" }}>{p.nombre}</p>
              <p className="text-[10px]" style={{ color: "#94a3b8" }}>{p.region} · {p.partidas} partidas</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold" style={{ color: p.color }}>{p.total}</p>
              <div className="flex items-center gap-1 justify-end mt-1">
                <div className="w-16 h-1 rounded-full" style={{ background: "#e2e8f0" }}>
                  <motion.div className="h-full rounded-full" style={{ background: p.color }}
                    initial={{ width: 0 }} animate={{ width: `${p.pct}%` }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.8, ease: "easeOut" }} />
                </div>
                <span className="text-[9px]" style={{ color: "#94a3b8" }}>{p.pct}%</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Pantalla 2: Presupuesto APU ───────────────────────────────────────────────
function ScreenPresupuesto() {
  const partidas = [
    { codigo: "PA-001", desc: "Excavación y movimiento de tierras", un: "m³", cant: 120, precio: "$4.200", total: "$504.000" },
    { codigo: "RE-012", desc: "Hormigón armado H30 en losas", un: "m³", cant: 45, precio: "$98.500", total: "$4.432.500" },
    { codigo: "GA-003", desc: "Muro de albañilería 14cm", un: "m²", cant: 280, precio: "$32.800", total: "$9.184.000" },
    { codigo: "PC-007", desc: "Instalación eléctrica domiciliaria", un: "un", cant: 1, precio: "$1.240.000", total: "$1.240.000" },
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown < partidas.length) {
      const t = setTimeout(() => setShown(n => n + 1), 600);
      return () => clearTimeout(t);
    }
  }, [shown]);

  return (
    <div style={{ background: "#f8fafc", minHeight: 320 }}>
      {/* Cabecera */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid #e2e8f0" }}>
        <div>
          <p className="text-xs font-bold" style={{ color: "#0f172a" }}>Presupuesto · Edificio Las Acacias</p>
          <p className="text-[10px]" style={{ color: "#94a3b8" }}>Zona Metropolitana · GG 18% · IVA 19%</p>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          + Nueva partida
        </motion.div>
      </div>
      {/* Tabla */}
      <div className="px-5 pt-3 pb-4">
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          <div className="grid text-[9px] font-semibold px-3 py-2" style={{ gridTemplateColumns: "60px 1fr 36px 52px 72px 80px", color: "#94a3b8", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
            <span>CÓDIGO</span><span>DESCRIPCIÓN</span><span>UN.</span><span>CANT.</span><span>V. UNIT.</span><span className="text-right">V. TOTAL</span>
          </div>
          {partidas.slice(0, shown).map((p, i) => (
            <motion.div key={p.codigo}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid text-[10px] px-3 py-2.5 items-center"
              style={{ gridTemplateColumns: "60px 1fr 36px 52px 72px 80px", borderBottom: i < shown - 1 ? "1px solid #f1f5f9" : "none", background: i % 2 === 0 ? "#ffffff" : "#fafafa" }}>
              <span className="font-mono text-[9px]" style={{ color: "#6366f1" }}>{p.codigo}</span>
              <span className="truncate pr-2" style={{ color: "#374151" }}>{p.desc}</span>
              <span style={{ color: "#94a3b8" }}>{p.un}</span>
              <span style={{ color: "#374151" }}>{p.cant}</span>
              <span style={{ color: "#374151" }}>{p.precio}</span>
              <span className="text-right font-semibold" style={{ color: "#6366f1" }}>{p.total}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Pantalla 3: Totales y resumen financiero ──────────────────────────────────
function ScreenTotales() {
  const cd = 142800000;
  const gg = cd * 0.18;
  const util = cd * 0.10;
  const neto = cd + gg + util;
  const iva = neto * 0.19;
  const total = neto + iva;
  const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CL");

  const filas = [
    { label: "Subtotal Costo Directo", val: cd, bold: false, color: "#374151" },
    { label: "Gastos Generales (18%)", val: gg, bold: false, color: "#374151" },
    { label: "Utilidad (10%)", val: util, bold: false, color: "#374151" },
    { label: "Subtotal Neto", val: neto, bold: true, color: "#0f172a" },
    { label: "IVA (19%)", val: iva, bold: false, color: "#374151" },
    { label: "TOTAL PROYECTO", val: total, bold: true, color: "#ffffff", highlight: true },
  ];

  return (
    <div className="p-5 space-y-4" style={{ background: "#f8fafc", minHeight: 320 }}>
      <div className="grid grid-cols-2 gap-4">
        {/* Tabla totales */}
        <div className="col-span-2 md:col-span-1 bg-white rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
          {filas.map((f, i) => (
            <motion.div key={f.label}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
              className="flex justify-between items-center px-4 py-2.5"
              style={{
                background: f.highlight ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : i % 2 === 0 ? "#fafafa" : "#ffffff",
                borderTop: i > 0 ? "1px solid #f1f5f9" : "none",
              }}>
              <span className={`text-xs ${f.bold ? "font-bold" : "font-normal"}`} style={{ color: f.highlight ? "#ffffff" : f.color }}>{f.label}</span>
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
                className={`text-xs ${f.bold ? "font-bold" : "font-medium"}`}
                style={{ color: f.highlight ? "#ffffff" : f.color }}>
                {fmt(f.val)}
              </motion.span>
            </motion.div>
          ))}
        </div>
        {/* Gráfico donut simple */}
        <div className="col-span-2 md:col-span-1 bg-white rounded-xl p-4 flex flex-col justify-center items-center" style={{ border: "1px solid #e2e8f0" }}>
          <p className="text-[10px] font-semibold mb-3" style={{ color: "#94a3b8" }}>DISTRIBUCIÓN DE COSTOS</p>
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
              <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <motion.circle cx="18" cy="18" r="15.9155" fill="none" stroke="#6366f1" strokeWidth="3"
                strokeDasharray="62 38" strokeDashoffset="0"
                initial={{ strokeDasharray: "0 100" }} animate={{ strokeDasharray: "62 38" }}
                transition={{ delay: 0.5, duration: 1, ease: "easeOut" }} />
              <motion.circle cx="18" cy="18" r="15.9155" fill="none" stroke="#8b5cf6" strokeWidth="3"
                strokeDasharray="19 81" strokeDashoffset="-62"
                initial={{ strokeDasharray: "0 100" }} animate={{ strokeDasharray: "19 81" }}
                transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }} />
              <motion.circle cx="18" cy="18" r="15.9155" fill="none" stroke="#10b981" strokeWidth="3"
                strokeDasharray="11 89" strokeDashoffset="-81"
                initial={{ strokeDasharray: "0 100" }} animate={{ strokeDasharray: "11 81" }}
                transition={{ delay: 0.9, duration: 0.6, ease: "easeOut" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-bold" style={{ color: "#0f172a" }}>CD+GG+U</span>
            </div>
          </div>
          <div className="mt-3 space-y-1 w-full">
            {[
              { label: "Costo Directo", color: "#6366f1", pct: "62%" },
              { label: "G. Generales", color: "#8b5cf6", pct: "19%" },
              { label: "IVA", color: "#10b981", pct: "11%" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
                <span className="text-[9px] flex-1" style={{ color: "#64748b" }}>{l.label}</span>
                <span className="text-[9px] font-semibold" style={{ color: l.color }}>{l.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pantalla 4: PDF Export ────────────────────────────────────────────────────
function ScreenPDF() {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); setDone(true); return 100; }
        return p + 4;
      });
    }, 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-5 flex flex-col items-center justify-center" style={{ background: "#f8fafc", minHeight: 320 }}>
      {/* Miniatura PDF */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-xl overflow-hidden mb-5 w-full max-w-sm"
        style={{ border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(99,102,241,0.1)" }}>
        {/* Header PDF */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          <div>
            <p className="text-white text-xs font-bold">Constructora XYZ Ltda.</p>
            <p className="text-white/70 text-[9px]">RUT: 76.543.210-K · Análisis de Precios Unitarios</p>
          </div>
          <div className="text-right">
            <p className="text-white text-[10px] font-semibold">Edificio Las Acacias</p>
            <p className="text-white/70 text-[9px]">{new Date().toLocaleDateString("es-CL")}</p>
          </div>
        </div>
        {/* Contenido simulado */}
        <div className="px-4 py-3 space-y-1.5">
          {["Obras civiles y excavación", "Estructura de hormigón armado", "Instalaciones sanitarias", "Revestimientos y terminaciones"].map((row, i) => (
            <motion.div key={row} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
              className="flex justify-between text-[9px]">
              <span style={{ color: "#64748b" }}>{row}</span>
              <span className="font-semibold" style={{ color: "#6366f1" }}>$XX.XXX.XXX</span>
            </motion.div>
          ))}
          <div className="flex justify-between text-[10px] font-bold pt-2 mt-1" style={{ borderTop: "1px solid #e2e8f0", color: "#0f172a" }}>
            <span>TOTAL PROYECTO</span>
            <span style={{ color: "#6366f1" }}>$201.504.000</span>
          </div>
        </div>
        {/* Firma */}
        <div className="px-4 pb-3 flex justify-end">
          <div className="text-center">
            <div className="h-px w-24 mb-1" style={{ background: "#94a3b8" }} />
            <p className="text-[8px]" style={{ color: "#94a3b8" }}>Jefe de Proyecto</p>
          </div>
        </div>
      </motion.div>

      {/* Barra de progreso */}
      <div className="w-full max-w-xs">
        {!done ? (
          <>
            <div className="flex justify-between text-[10px] mb-1.5" style={{ color: "#64748b" }}>
              <span>Generando PDF...</span>
              <span style={{ color: "#6366f1" }}>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "#e2e8f0" }}>
              <motion.div className="h-full rounded-full"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
            </div>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-semibold" style={{ color: "#10b981" }}>PDF exportado correctamente</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Pantalla 5: Carta Gantt ───────────────────────────────────────────────────
function ScreenGantt() {
  const tareas = [
    { nombre: "Excavación",       inicio: 0, dur: 2, color: "#ef4444", fase: "Demolición" },
    { nombre: "Estructura H30",   inicio: 2, dur: 4, color: "#f59e0b", fase: "Estructura" },
    { nombre: "Cubierta",         inicio: 5, dur: 2, color: "#eab308", fase: "Cubierta" },
    { nombre: "Inst. sanitarias", inicio: 6, dur: 3, color: "#3b82f6", fase: "Instalaciones" },
    { nombre: "Revestimientos",   inicio: 8, dur: 2, color: "#6366f1", fase: "Terminaciones" },
  ];
  const semanas = Array.from({ length: 10 }, (_, i) => `S${i + 1}`);

  return (
    <div style={{ background: "#f8fafc", minHeight: 320 }}>
      <div className="px-5 pt-4 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid #e2e8f0" }}>
        <div>
          <p className="text-xs font-bold" style={{ color: "#0f172a" }}>Carta Gantt · Edificio Las Acacias</p>
          <p className="text-[10px]" style={{ color: "#94a3b8" }}>Plazo total: 10 semanas · Ruta crítica activada</p>
        </div>
        <span className="text-[9px] px-2 py-1 rounded-full font-semibold" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
          Ruta crítica
        </span>
      </div>
      <div className="px-5 pt-3 pb-4 overflow-x-auto">
        {/* Header semanas */}
        <div className="flex mb-2" style={{ marginLeft: 100 }}>
          {semanas.map(s => (
            <div key={s} className="flex-1 text-center text-[9px]" style={{ color: "#94a3b8", minWidth: 28 }}>{s}</div>
          ))}
        </div>
        {/* Barras */}
        <div className="space-y-2">
          {tareas.map((t, i) => (
            <motion.div key={t.nombre}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: i * 0.15, duration: 0.3 }}
              className="flex items-center gap-0">
              <div className="text-[9px] truncate shrink-0" style={{ width: 100, color: "#374151" }}>{t.nombre}</div>
              <div className="flex flex-1 relative" style={{ minWidth: 280 }}>
                {semanas.map((_, si) => (
                  <div key={si} className="flex-1" style={{ minWidth: 28, borderLeft: "1px solid #f1f5f9" }} />
                ))}
                <motion.div
                  className="absolute top-0 h-5 rounded"
                  style={{
                    left: `${(t.inicio / 10) * 100}%`,
                    background: t.color,
                    opacity: 0.85,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(t.dur / 10) * 100}%` }}
                  transition={{ delay: 0.4 + i * 0.15, duration: 0.6, ease: "easeOut" }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-white text-[8px] font-semibold whitespace-nowrap px-1 overflow-hidden">
                    {t.dur}s
                  </span>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal AppDemo ──────────────────────────────────────────────
const SCREENS = [
  { id: "dashboard",   label: "Dashboard",   component: ScreenDashboard,   url: "apudesk.vercel.app/dashboard" },
  { id: "presupuesto", label: "Presupuesto", component: ScreenPresupuesto, url: "apudesk.vercel.app/proyecto" },
  { id: "totales",     label: "Totales",     component: ScreenTotales,     url: "apudesk.vercel.app/proyecto#resumen" },
  { id: "gantt",       label: "Carta Gantt", component: ScreenGantt,       url: "apudesk.vercel.app/proyecto#gantt" },
  { id: "pdf",         label: "Exportar PDF",component: ScreenPDF,         url: "apudesk.vercel.app/proyecto#pdf" },
];

export default function AppDemo({ autoplay = true, showControls = false }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!autoplay || paused) return;
    const t = setInterval(() => {
      setActive(a => (a + 1) % SCREENS.length);
    }, SLIDE_DURATION);
    return () => clearInterval(t);
  }, [autoplay, paused]);

  const Screen = SCREENS[active].component;

  return (
    <div
      className="relative rounded-2xl overflow-hidden w-full"
      style={{ background: "#ffffff", border: "1px solid rgba(99,102,241,0.12)", boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 20px 60px rgba(99,102,241,0.12)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Barra título estilo macOS */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
        <span className="w-3 h-3 rounded-full bg-red-400" />
        <span className="w-3 h-3 rounded-full bg-yellow-400" />
        <span className="w-3 h-3 rounded-full bg-green-400" />
        <span className="ml-3 flex-1 h-6 rounded-md text-[11px] flex items-center px-3 select-none"
          style={{ background: "#e2e8f0", color: "#94a3b8", maxWidth: 260 }}>
          {SCREENS[active].url}
        </span>
        {/* Tabs de navegación */}
        <div className="hidden sm:flex items-center gap-1 ml-auto">
          {SCREENS.map((s, i) => (
            <button key={s.id}
              onClick={() => { setActive(i); setPaused(true); }}
              className="px-2 py-0.5 rounded text-[9px] font-medium transition-all"
              style={{
                background: active === i ? "rgba(99,102,241,0.12)" : "transparent",
                color: active === i ? "#6366f1" : "#94a3b8",
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido animado */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          <Screen />
        </motion.div>
      </AnimatePresence>

      {/* Barra de progreso inferior */}
      {autoplay && !paused && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "#e2e8f0" }}>
          <motion.div
            key={active}
            className="h-full"
            style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: SLIDE_DURATION / 1000, ease: "linear" }}
          />
        </div>
      )}

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {SCREENS.map((_, i) => (
          <button key={i}
            onClick={() => { setActive(i); setPaused(true); }}
            className="rounded-full transition-all"
            style={{
              width: active === i ? 16 : 6,
              height: 6,
              background: active === i ? "#6366f1" : "rgba(99,102,241,0.25)",
            }}
            aria-label={`Ir a pantalla ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
