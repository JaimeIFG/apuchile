"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

// ── Variantes de animación ────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: (delay = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
  }),
};
const fadeIn = {
  hidden:  { opacity: 0 },
  visible: (delay = 0) => ({
    opacity: 1,
    transition: { duration: 0.6, delay },
  }),
};

// ── Partículas flotantes ──────────────────────────────────────────────────────
function Particles() {
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 4,
      duration: Math.random() * 6 + 8,
    }))
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            background: "rgba(99,102,241,0.5)",
            boxShadow: "0 0 6px 1px rgba(99,102,241,0.3)",
          }}
          animate={{ y: [0, -28, 0], opacity: [0, 0.7, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(0,0,0,0.06)" : "none",
        boxShadow: scrolled ? "0 1px 20px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            A
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: "#0f172a" }}>
            APU<span style={{ color: "#6366f1" }}>desk</span>
          </span>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "Características", href: "#caracteristicas" },
            { label: "Precios",          href: "#precios"         },
            { label: "Documentación",    href: "#docs"            },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: "#64748b" }}
              onMouseEnter={e => e.currentTarget.style.color = "#0f172a"}
              onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* CTA nav */}
        <Link
          href="/login"
          className="text-sm font-semibold px-5 py-2 rounded-lg text-white transition-all duration-200"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          Iniciar sesión
        </Link>
      </div>
    </motion.nav>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a1 1 0 001-1V6a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1z" />
      </svg>
    ),
    color: "#6366f1",
    bg: "#eef2ff",
    title: "Presupuestos APU",
    desc: "Genera análisis de precios unitarios con una biblioteca de más de 1.100 partidas de construcción. Calcula mano de obra, materiales, herramientas y leyes sociales automáticamente.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: "#8b5cf6",
    bg: "#f5f3ff",
    title: "Carta Gantt con IA",
    desc: "Planifica tu obra con una carta Gantt interactiva. La IA sugiere dependencias entre partidas según la secuencia constructiva chilena y calcula la ruta crítica automáticamente.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
      </svg>
    ),
    color: "#0ea5e9",
    bg: "#f0f9ff",
    title: "Precios Regionales",
    desc: "Ajusta precios de materiales según la región de Chile en tiempo real. Consulta valores actualizados de proveedores locales con factores de zona para todas las regiones del país.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    color: "#10b981",
    bg: "#f0fdf4",
    title: "Exportar PDF Profesional",
    desc: "Genera reportes PDF listos para entregar, con logo de tu empresa, datos de contacto, desglose de partidas, totales con IVA y carta Gantt. Un clic, resultado profesional.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "#f59e0b",
    bg: "#fffbeb",
    title: "Colaboración en Tiempo Real",
    desc: "Invita a tu equipo con roles (visualizar, editar, administrar). Ve quién está conectado, chatea dentro del proyecto y sincroniza cambios al instante entre todos los participantes.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: "#ec4899",
    bg: "#fdf2f8",
    title: "Extracción IA de Documentos",
    desc: "Sube un PDF o Excel de presupuesto existente y la IA extrae automáticamente las partidas, cantidades y precios. Compatible con formatos estándar del rubro.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    color: "#14b8a6",
    bg: "#f0fdfa",
    title: "Gestión de Obras",
    desc: "Administra tus obras con seguimiento de pagos, garantías, bitácora de visitas, documentos adjuntos y estado de avance. Todo centralizado en un módulo dedicado por obra.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: "#f97316",
    bg: "#fff7ed",
    title: "Especificaciones Técnicas",
    desc: "Genera especificaciones técnicas profesionales por partida con un clic: normas aplicables, materiales requeridos, procedimiento de ejecución y criterios de medición y pago.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: "#6366f1",
    bg: "#eef2ff",
    title: "Licitaciones Públicas",
    desc: "Consulta licitaciones de construcción activas directamente desde el dashboard. Filtra por región, tipo, monto y fecha de cierre para encontrar oportunidades relevantes en todo Chile.",
  },
];

// ── Hero principal ────────────────────────────────────────────────────────────
export default function Hero() {
  return (
    <div style={{ background: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
        style={{ background: "linear-gradient(160deg, #f8fafc 0%, #f1f5f9 40%, #ede9fe 100%)" }}
      >
        {/* Gradiente animado suave */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          animate={{
            background: [
              "radial-gradient(ellipse 70% 50% at 50% -5%, rgba(99,102,241,0.12) 0%, transparent 70%)",
              "radial-gradient(ellipse 70% 50% at 60% -5%, rgba(139,92,246,0.14) 0%, transparent 70%)",
              "radial-gradient(ellipse 70% 50% at 40% -5%, rgba(99,102,241,0.10) 0%, transparent 70%)",
              "radial-gradient(ellipse 70% 50% at 50% -5%, rgba(99,102,241,0.12) 0%, transparent 70%)",
            ],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Orbs decorativos */}
        <div className="absolute pointer-events-none" aria-hidden style={{ top: "10%", left: "5%", width: 500, height: 500, borderRadius: "50%", background: "rgba(99,102,241,0.06)", filter: "blur(90px)" }} />
        <div className="absolute pointer-events-none" aria-hidden style={{ top: "15%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "rgba(139,92,246,0.07)", filter: "blur(80px)" }} />

        {/* Grid sutil */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <Particles />

        {/* Contenido */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pb-16">

          {/* Badge */}
          <motion.div variants={fadeIn} initial="hidden" animate="visible" custom={0.1} className="inline-flex mb-8">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border"
              style={{ background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.2)", color: "#6366f1" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Potenciado con Inteligencia Artificial
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={0.2}
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.06]"
            style={{ color: "#0f172a" }}
          >
            Optimiza tus proyectos{" "}
            <br className="hidden sm:block" />
            <span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              de construcción
            </span>
            <br className="hidden sm:block" />
            con inteligencia artificial
          </motion.h1>

          {/* Blur radial detrás del título */}
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none" aria-hidden
            style={{ width: 600, height: 180, background: "radial-gradient(ellipse at center, rgba(99,102,241,0.1) 0%, transparent 70%)", filter: "blur(40px)" }}
          />

          {/* Subtítulo */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={0.35}
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: "#64748b" }}
          >
            Automatiza cálculos, análisis y reportes técnicos en segundos.
            <br className="hidden sm:block" />
            Desde APUs hasta carta Gantt, todo en un solo lugar.
          </motion.p>

          {/* Botones */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={0.5}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="relative group px-8 py-3.5 rounded-xl text-white font-semibold text-base cursor-pointer overflow-hidden"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                  style={{ boxShadow: "0 0 40px 10px rgba(99,102,241,0.4)", background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} aria-hidden />
                <span className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)" }} aria-hidden />
                <span className="relative flex items-center gap-2">
                  Entrar al sistema
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </motion.button>
            </Link>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group px-8 py-3.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer"
              style={{ borderColor: "rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.04)", color: "#6366f1" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.08)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.04)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; }}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                Ver demo
              </span>
            </motion.button>
          </motion.div>

          {/* Preview app */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={0.65}
            className="mt-20 relative mx-auto max-w-4xl"
          >
            <div className="absolute -inset-4 rounded-2xl pointer-events-none" aria-hidden
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 70%)", filter: "blur(30px)" }}
            />
            <div className="relative rounded-2xl overflow-hidden"
              style={{ background: "#ffffff", border: "1px solid rgba(99,102,241,0.12)", boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 20px 60px rgba(99,102,241,0.12), 0 0 0 1px rgba(99,102,241,0.06)" }}
            >
              {/* Barra título */}
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-4 flex-1 h-6 rounded-md text-xs flex items-center px-3"
                  style={{ background: "#e2e8f0", color: "#94a3b8", maxWidth: 240 }}>
                  apudesk.vercel.app/dashboard
                </span>
              </div>
              {/* Dashboard simulado */}
              <div className="p-6 grid grid-cols-3 gap-4" style={{ background: "#f8fafc" }}>
                {[
                  { label: "Costo Directo", value: "$142.8M", color: "#6366f1" },
                  { label: "Partidas",       value: "38",      color: "#8b5cf6" },
                  { label: "Avance",         value: "67%",     color: "#10b981" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl p-4 bg-white" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>{stat.label}</p>
                    <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
                <div className="col-span-3 rounded-xl p-4 bg-white" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <p className="text-xs mb-3" style={{ color: "#94a3b8" }}>Desglose por partida</p>
                  <div className="space-y-2">
                    {[
                      { name: "Obras civiles",  pct: 78, color: "#6366f1" },
                      { name: "Instalaciones",   pct: 54, color: "#8b5cf6" },
                      { name: "Revestimientos",  pct: 41, color: "#a855f7" },
                      { name: "Terminaciones",   pct: 22, color: "#10b981" },
                    ].map((row) => (
                      <div key={row.name} className="flex items-center gap-3">
                        <span className="text-xs w-28 shrink-0" style={{ color: "#64748b" }}>{row.name}</span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: "#e2e8f0" }}>
                          <motion.div className="h-full rounded-full" style={{ background: row.color }}
                            initial={{ width: 0 }} animate={{ width: `${row.pct}%` }}
                            transition={{ duration: 1, delay: 1, ease: "easeOut" }} />
                        </div>
                        <span className="text-xs w-8 text-right" style={{ color: "#64748b" }}>{row.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CARACTERÍSTICAS ───────────────────────────────────────────────── */}
      <section id="caracteristicas" style={{ background: "#ffffff", paddingTop: "96px", paddingBottom: "96px" }}>
        <div className="max-w-6xl mx-auto px-6">

          {/* Header sección */}
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: "#eef2ff", color: "#6366f1" }}>
              Todo lo que necesitas
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: "#0f172a" }}>
              Una plataforma completa para{" "}
              <span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                profesionales de la construcción
              </span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#64748b" }}>
              Desde el primer APU hasta la entrega final, APUdesk cubre cada etapa de tu proyecto.
            </p>
          </motion.div>

          {/* Grid de features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.07}
                className="group rounded-2xl p-6 border transition-all duration-300 cursor-default"
                style={{ background: "#fff", borderColor: "#e2e8f0" }}
                whileHover={{ y: -4, boxShadow: `0 12px 40px ${f.color}18`, borderColor: `${f.color}40` }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: f.bg, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-base mb-2" style={{ color: "#0f172a" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA final */}
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.2}
            className="mt-16 text-center"
          >
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="relative group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold text-base cursor-pointer overflow-hidden"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                  style={{ boxShadow: "0 0 40px 10px rgba(99,102,241,0.35)" }} aria-hidden />
                <span className="relative">Comenzar gratis ahora</span>
                <svg className="relative w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER MÍNIMO ─────────────────────────────────────────────────── */}
      <footer style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "32px 24px" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-xs"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>A</div>
            <span className="font-bold text-sm" style={{ color: "#0f172a" }}>APU<span style={{ color: "#6366f1" }}>desk</span></span>
          </div>
          <p className="text-xs" style={{ color: "#94a3b8" }}>
            © {new Date().getFullYear()} APUdesk · Hecho para constructores chilenos
          </p>
        </div>
      </footer>
    </div>
  );
}
