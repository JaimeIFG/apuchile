"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import AppDemo from "./AppDemo";

// ── URL del video de demo (pon aquí tu link de YouTube o URL directa de video) ──
// Para YouTube: "https://www.youtube.com/embed/TU_ID_VIDEO?autoplay=1&mute=1&loop=1&playlist=TU_ID_VIDEO&controls=0&rel=0"
// Para video directo: "/demo.mp4" o URL pública del archivo
const VIDEO_DEMO_URL = ""; // ← Pega aquí el link de YouTube embed o URL del video
const VIDEO_FONDO_URL = ""; // ← Pega aquí el link directo del video de fondo (mp4)

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
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", animation: "pulsoHalo 2s ease-in-out infinite" }}
          >
            AD
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

// ── Modal de video demo ───────────────────────────────────────────────────────
function ModalVideo({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const isYoutube = VIDEO_DEMO_URL.includes("youtube.com") || VIDEO_DEMO_URL.includes("youtu.be");

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 30px 80px rgba(0,0,0,0.6)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          aria-label="Cerrar video"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {VIDEO_DEMO_URL ? (
          isYoutube ? (
            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
              <iframe
                src={VIDEO_DEMO_URL.includes("autoplay") ? VIDEO_DEMO_URL : VIDEO_DEMO_URL + "?autoplay=1&rel=0"}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Demo APUdesk"
              />
            </div>
          ) : (
            <video src={VIDEO_DEMO_URL} controls autoPlay className="w-full" style={{ maxHeight: "80vh" }} />
          )
        ) : (
          /* Demo animada cuando no hay video real */
          <div style={{ background: "#0f172a", padding: "24px" }}>
            <p className="text-center text-xs font-semibold mb-4" style={{ color: "#94a3b8", letterSpacing: "0.1em" }}>TOUR INTERACTIVO · APUdesk</p>
            <AppDemo autoplay={true} showControls={true} />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Hero principal ────────────────────────────────────────────────────────────
export default function Hero() {
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <div style={{ background: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      {/* Modal video demo */}
      <AnimatePresence>
        {modalAbierto && <ModalVideo onClose={() => setModalAbierto(false)} />}
      </AnimatePresence>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
        style={{ background: "linear-gradient(160deg, #f8fafc 0%, #f1f5f9 40%, #ede9fe 100%)" }}
      >
        {/* ── Video de fondo (si existe VIDEO_FONDO_URL) ── */}
        {VIDEO_FONDO_URL && (
          <>
            <video
              autoPlay muted loop playsInline
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ zIndex: 0 }}
              aria-hidden
            >
              <source src={VIDEO_FONDO_URL} type="video/mp4" />
            </video>
            {/* Overlay para mantener legibilidad del texto */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 1, background: "linear-gradient(160deg, rgba(248,250,252,0.82) 0%, rgba(241,245,249,0.78) 40%, rgba(237,233,254,0.80) 100%)" }}
              aria-hidden
            />
          </>
        )}

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
              onClick={() => setModalAbierto(true)}
              aria-label="Ver demo de APUdesk"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                Ver demo
              </span>
            </motion.button>
          </motion.div>

        </div>
      </section>

      {/* ── Demo animada ───────────────────────────────────────────────────── */}
      <section style={{ background: "#f8fafc", paddingTop: "48px", paddingBottom: "64px" }}>
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ borderRadius: "16px", overflow: "hidden", boxShadow: "0 24px 80px rgba(99,102,241,0.12), 0 8px 32px rgba(0,0,0,0.08)", border: "1px solid rgba(99,102,241,0.12)" }}
          >
            <AppDemo autoplay={true} showControls={true} />
          </motion.div>
        </div>
      </section>

      {/* ── APP MÓVIL ─────────────────────────────────────────────────────── */}
      <section style={{ background: "#f1f5f9", paddingTop: "64px", paddingBottom: "64px" }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: "#dcfce7", color: "#16a34a" }}>
              📱 Disponible en Android
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: "#0f172a" }}>
              APUdesk también en tu celular
            </h2>
            <p className="text-base mb-6" style={{ color: "#64748b", maxWidth: "560px", margin: "0 auto 24px" }}>
              Lleva el control de tus obras desde cualquier lugar. Registra avances, sube fotos y gestiona tu bitácora directo desde tu teléfono Android. La versión para iOS estará disponible próximamente.
            </p>
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "#0f172a", color: "#ffffff" }}>
              <span>🤖</span>
              <span>Android — Próximamente disponible para descarga</span>
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

      {/* ── PRECIOS ────────────────────────────────────────────────────────── */}
      <section id="precios" style={{ padding: "96px 24px", background: "#f8fafc" }}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ color: "#0f172a" }}
          >
            Planes y precios
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg mb-12"
            style={{ color: "#64748b" }}
          >
            Comienza gratis y escala cuando lo necesites.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-sm mx-auto rounded-2xl p-8 border"
            style={{ background: "#fff", borderColor: "#e2e8f0", boxShadow: "0 4px 24px -4px rgba(0,0,0,0.08)" }}
          >
            <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
              Plan gratuito
            </div>
            <div className="text-4xl font-bold mb-1" style={{ color: "#0f172a" }}>$0</div>
            <div className="text-sm mb-6" style={{ color: "#64748b" }}>Para siempre</div>
            <ul className="text-left space-y-3 mb-8">
              {["Hasta 5 proyectos","Exportar PDF","Colaboración básica","Biblioteca 1.100+ partidas"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "#334155" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/login">
              <button className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                Comenzar gratis
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── DOCUMENTACIÓN / FAQ ───────────────────────────────────────────── */}
      <FAQ />

      {/* ── CONTACTO ──────────────────────────────────────────────────────── */}
      <Contacto />

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#0f172a", padding: "48px 24px" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", animation: "pulsoHalo 2s ease-in-out infinite" }}>AD</div>
              <span className="font-bold text-lg" style={{ color: "#fff" }}>APU<span style={{ color: "#818cf8" }}>desk</span></span>
            </div>
            <div className="flex items-center gap-6">
              {["Características","Documentación","Contacto"].map(item => (
                <a key={item} href={`#${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}`}
                  className="text-sm transition-colors duration-200"
                  style={{ color: "#64748b" }}
                  onMouseEnter={e => e.currentTarget.style.color="#fff"}
                  onMouseLeave={e => e.currentTarget.style.color="#64748b"}
                >{item}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "24px" }} className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs" style={{ color: "#475569" }}>© {new Date().getFullYear()} APUdesk · Hecho para constructores chilenos</p>
            <p className="text-xs" style={{ color: "#475569" }}>contacto@apudesk.cl</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── FAQ / DOCUMENTACIÓN ───────────────────────────────────────────────────────
const FAQS = [
  {
    q: "¿Cómo creo mi primer proyecto?",
    a: "Ingresa al dashboard, haz clic en \"Nuevo proyecto\" y ponle un nombre. En segundos tendrás tu espacio listo para agregar partidas, configurar tu presupuesto y comenzar a planificar.",
  },
  {
    q: "¿Cómo agrego partidas a mi presupuesto?",
    a: "Desde la vista del proyecto, abre la pestaña \"Biblioteca\". Busca la partida por nombre o código, ajusta la cantidad y confírmala. También puedes crear partidas personalizadas desde cero.",
  },
  {
    q: "¿Puedo importar un presupuesto que ya tengo en Excel o PDF?",
    a: "Sí. En la sección de Anexos del proyecto, sube tu archivo y la IA lo procesa automáticamente extrayendo las partidas, cantidades y precios en segundos.",
  },
  {
    q: "¿Cómo funciona la carta Gantt?",
    a: "La Gantt se genera automáticamente a partir de tus partidas. Puedes arrastrar y reorganizar las fases, definir dependencias manualmente o dejar que la IA las sugiera según la secuencia constructiva.",
  },
  {
    q: "¿Cómo invito a mi equipo al proyecto?",
    a: "En la barra lateral del proyecto, haz clic en \"Invitar colaborador\", ingresa el correo y elige el rol: visualizar, editar o administrar. Recibirán un código de acceso por email.",
  },
  {
    q: "¿El PDF generado tiene mi logo y datos de empresa?",
    a: "Sí. En Configuración puedes subir tu logo, ingresar el nombre de tu empresa, RUT y datos de contacto. El PDF los incluirá automáticamente en cada exportación.",
  },
  {
    q: "¿Los precios de materiales están actualizados?",
    a: "Los precios base se actualizan periódicamente con valores del mercado chileno. Además puedes ajustarlos manualmente por partida o aplicar el factor de tu región para obtener precios más precisos.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Todos los proyectos se almacenan de forma segura con cifrado en tránsito y en reposo. Solo tú y los colaboradores que invites tienen acceso a tu información.",
  },
];

function FAQ() {
  const [abierto, setAbierto] = useState(null);
  return (
    <section id="documentacion" style={{ background: "#f8fafc", paddingTop: "96px", paddingBottom: "96px" }}>
      <div className="max-w-4xl mx-auto px-6">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ background: "#eef2ff", color: "#6366f1" }}>
            Documentación
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: "#0f172a" }}>
            Preguntas{" "}
            <span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              frecuentes
            </span>
          </h2>
          <p className="text-lg" style={{ color: "#64748b" }}>
            Todo lo que necesitas saber para empezar a usar APUdesk.
          </p>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.06}
              className="rounded-2xl border overflow-hidden"
              style={{ background: "#fff", borderColor: abierto === i ? "rgba(99,102,241,0.3)" : "#e2e8f0" }}
            >
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer"
                onClick={() => setAbierto(abierto === i ? null : i)}
              >
                <span className="font-semibold text-sm pr-4" style={{ color: "#0f172a" }}>{faq.q}</span>
                <motion.span
                  animate={{ rotate: abierto === i ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: abierto === i ? "#6366f1" : "#f1f5f9", color: abierto === i ? "#fff" : "#64748b" }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </motion.span>
              </button>
              <motion.div
                initial={false}
                animate={{ height: abierto === i ? "auto" : 0, opacity: abierto === i ? 1 : 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <p className="px-6 pb-5 text-sm leading-relaxed" style={{ color: "#64748b" }}>{faq.a}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CONTACTO ──────────────────────────────────────────────────────────────────
function Contacto() {
  const [form, setForm] = useState({ nombre: "", email: "", mensaje: "" });
  const [estado, setEstado] = useState(null); // null | "enviando" | "ok" | "error"

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.email || !form.mensaje) return;
    setEstado("enviando");
    // Simula envío — aquí conectarías tu API de correo
    await new Promise(r => setTimeout(r, 1200));
    setEstado("ok");
  };

  return (
    <section id="contacto" style={{ background: "#fff", paddingTop: "96px", paddingBottom: "96px" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Lado izquierdo */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: "#eef2ff", color: "#6366f1" }}>
              Contacto
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: "#0f172a" }}>
              ¿Tienes alguna{" "}
              <span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                pregunta?
              </span>
            </h2>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: "#64748b" }}>
              Estamos aquí para ayudarte. Escríbenos y te respondemos en menos de 24 horas hábiles.
            </p>

            <div className="space-y-6">
              {[
                {
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
                  label: "Email de soporte",
                  value: "contacto@apudesk.cl",
                },
                {
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                  label: "Tiempo de respuesta",
                  value: "Menos de 24 horas hábiles",
                },
                {
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                  label: "Ubicación",
                  value: "Chile",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#eef2ff", color: "#6366f1" }}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-0.5" style={{ color: "#94a3b8" }}>{item.label}</p>
                    <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Formulario */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.15}>
            <div className="rounded-2xl p-8 border" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
              {estado === "ok" ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: "#f0fdf4" }}>
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: "#0f172a" }}>¡Mensaje enviado!</h3>
                  <p className="text-sm" style={{ color: "#64748b" }}>Te responderemos a la brevedad. Revisa tu bandeja de entrada.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Nombre</label>
                    <input
                      type="text" placeholder="Tu nombre"
                      value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                      style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a" }}
                      onFocus={e => e.target.style.borderColor = "#6366f1"}
                      onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Email</label>
                    <input
                      type="email" placeholder="tu@email.com"
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                      style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a" }}
                      onFocus={e => e.target.style.borderColor = "#6366f1"}
                      onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Mensaje</label>
                    <textarea
                      placeholder="¿En qué te podemos ayudar?"
                      rows={4}
                      value={form.mensaje} onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))}
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 resize-none"
                      style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a" }}
                      onFocus={e => e.target.style.borderColor = "#6366f1"}
                      onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                    />
                  </div>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={estado === "enviando"}
                    className="w-full py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer transition-opacity duration-200"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", opacity: estado === "enviando" ? 0.7 : 1 }}
                  >
                    {estado === "enviando" ? "Enviando..." : "Enviar mensaje"}
                  </motion.button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
