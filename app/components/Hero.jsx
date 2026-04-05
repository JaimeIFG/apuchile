"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";

// ── Variantes de animación ────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
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

// ── Partículas de fondo ───────────────────────────────────────────────────────
function Particles() {
  const [particles] = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({
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
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "rgba(139,92,246,0.6)",
            boxShadow: "0 0 6px 1px rgba(139,92,246,0.4)",
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
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
        background: scrolled
          ? "rgba(9,9,11,0.85)"
          : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
          >
            A
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">
            APU<span className="text-violet-400">desk</span>
          </span>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          {["Características", "Precios", "Documentación"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm text-zinc-400 hover:text-white transition-colors duration-200"
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA nav */}
        <Link
          href="/login"
          className="text-sm font-medium text-white px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-200"
        >
          Iniciar sesión
        </Link>
      </div>
    </motion.nav>
  );
}

// ── Hero principal ────────────────────────────────────────────────────────────
export default function Hero() {
  return (
    <>
      <Navbar />

      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{ background: "#09090b" }}
      >
        {/* ── Gradiente animado de fondo ─────────────────────────────────── */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          animate={{
            background: [
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.18) 0%, transparent 70%)",
              "radial-gradient(ellipse 80% 60% at 60% -10%, rgba(139,92,246,0.22) 0%, transparent 70%)",
              "radial-gradient(ellipse 80% 60% at 40% -10%, rgba(236,72,153,0.15) 0%, transparent 70%)",
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.18) 0%, transparent 70%)",
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ── Blur orbs decorativos ──────────────────────────────────────── */}
        <div
          className="absolute pointer-events-none"
          aria-hidden
          style={{
            top: "15%", left: "10%",
            width: 400, height: 400,
            borderRadius: "50%",
            background: "rgba(59,130,246,0.07)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          aria-hidden
          style={{
            top: "20%", right: "8%",
            width: 350, height: 350,
            borderRadius: "50%",
            background: "rgba(139,92,246,0.09)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          aria-hidden
          style={{
            bottom: "10%", left: "50%",
            transform: "translateX(-50%)",
            width: 600, height: 300,
            borderRadius: "50%",
            background: "rgba(236,72,153,0.05)",
            filter: "blur(100px)",
          }}
        />

        {/* ── Partículas ────────────────────────────────────────────────── */}
        <Particles />

        {/* ── Grid sutil de fondo ───────────────────────────────────────── */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* ── Contenido principal ───────────────────────────────────────── */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">

          {/* Badge */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            custom={0.1}
            className="inline-flex items-center gap-2 mb-8"
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-violet-300 border"
              style={{
                background: "rgba(139,92,246,0.08)",
                borderColor: "rgba(139,92,246,0.25)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Potenciado con Inteligencia Artificial
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.2}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.08]"
          >
            Optimiza tus proyectos{" "}
            <br className="hidden sm:block" />
            <span
              style={{
                background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              de construcción
            </span>
            <br className="hidden sm:block" />
            con inteligencia artificial
          </motion.h1>

          {/* Radial blur detrás del título */}
          <div
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden
            style={{
              width: 700,
              height: 200,
              background:
                "radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          {/* Subtítulo */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.35}
            className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Automatiza cálculos, análisis y reportes técnicos en segundos.
            <br className="hidden sm:block" />
            Desde APUs hasta carta Gantt, todo en un solo lugar.
          </motion.p>

          {/* Botones */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.5}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {/* CTA Principal */}
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="relative group px-8 py-3.5 rounded-xl text-white font-semibold text-base cursor-pointer overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                }}
              >
                {/* Glow en hover */}
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                  style={{
                    boxShadow: "0 0 40px 8px rgba(139,92,246,0.5)",
                    background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
                  }}
                  aria-hidden
                />
                {/* Brillo superior */}
                <span
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }}
                  aria-hidden
                />
                <span className="relative flex items-center gap-2">
                  Entrar al sistema
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </motion.button>
            </Link>

            {/* CTA Secundario */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group px-8 py-3.5 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white border transition-all duration-200 cursor-pointer"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                e.currentTarget.style.background   = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.background   = "rgba(255,255,255,0.03)";
              }}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Ver demo
              </span>
            </motion.button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            custom={0.75}
            className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-zinc-500"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Sin tarjeta de crédito
            </span>
            <span className="hidden sm:block w-px h-4 bg-zinc-700" />
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Listo en menos de 5 minutos
            </span>
            <span className="hidden sm:block w-px h-4 bg-zinc-700" />
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Datos 100% seguros
            </span>
          </motion.div>

          {/* Preview del producto (ventana de app simulada) */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.65}
            className="mt-20 relative mx-auto max-w-4xl"
          >
            {/* Glow detrás del preview */}
            <div
              className="absolute -inset-4 rounded-2xl pointer-events-none"
              aria-hidden
              style={{
                background: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.2) 0%, transparent 70%)",
                filter: "blur(30px)",
              }}
            />

            {/* Ventana de app */}
            <div
              className="relative rounded-2xl overflow-hidden border"
              style={{
                background: "rgba(18,18,22,0.9)",
                borderColor: "rgba(255,255,255,0.08)",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.08)",
              }}
            >
              {/* Barra de título */}
              <div
                className="flex items-center gap-2 px-4 py-3 border-b"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-green-500/70" />
                <span
                  className="ml-4 flex-1 h-6 rounded-md text-xs text-zinc-500 flex items-center px-3"
                  style={{ background: "rgba(255,255,255,0.04)", maxWidth: 240 }}
                >
                  apudesk.vercel.app/dashboard
                </span>
              </div>

              {/* Contenido simulado del dashboard */}
              <div className="p-6 grid grid-cols-3 gap-4">
                {/* Stat cards */}
                {[
                  { label: "Costo Directo",   value: "$142.8M",  color: "#60a5fa" },
                  { label: "Partidas",         value: "38",       color: "#a78bfa" },
                  { label: "Avance",           value: "67%",      color: "#34d399" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-4"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
                    <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                ))}

                {/* Barras simuladas */}
                <div
                  className="col-span-3 rounded-xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <p className="text-xs text-zinc-500 mb-3">Desglose por partida</p>
                  <div className="space-y-2">
                    {[
                      { name: "Obras civiles",     pct: 78, color: "#3b82f6" },
                      { name: "Instalaciones",      pct: 54, color: "#8b5cf6" },
                      { name: "Revestimientos",     pct: 41, color: "#ec4899" },
                      { name: "Terminaciones",      pct: 22, color: "#10b981" },
                    ].map((row) => (
                      <div key={row.name} className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500 w-28 shrink-0">{row.name}</span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: row.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${row.pct}%` }}
                            transition={{ duration: 1, delay: 1, ease: "easeOut" }}
                          />
                        </div>
                        <span className="text-xs text-zinc-400 w-8 text-right">{row.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Degradado hacia abajo ─────────────────────────────────────────── */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          aria-hidden
          style={{
            background: "linear-gradient(to top, #09090b, transparent)",
          }}
        />
      </section>
    </>
  );
}
