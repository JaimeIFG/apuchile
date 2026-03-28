"use client";
import { useState, useEffect, useRef } from "react";

const TIPO_COLOR = {
  L1: "bg-blue-100 text-blue-700",
  LE: "bg-purple-100 text-purple-700",
  LP: "bg-amber-100 text-amber-700",
  LR: "bg-rose-100 text-rose-700",
  E2: "bg-gray-100 text-gray-600",
};

function diasRestantes(fechaCierre) {
  if (!fechaCierre) return null;
  const d = Math.ceil((new Date(fechaCierre) - new Date()) / 86400000);
  return d >= 0 ? d : null;
}

export default function LicitacionesTicker() {
  const [licitaciones, setLicitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pausado, setPausado] = useState(false);
  const [idx, setIdx] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetch("/api/licitaciones")
      .then(r => r.json())
      .then(d => { setLicitaciones(d.licitaciones || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Auto-avance cada 5 segundos
  useEffect(() => {
    if (licitaciones.length === 0 || pausado) return;
    intervalRef.current = setInterval(() => {
      setIdx(i => (i + 1) % licitaciones.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [licitaciones, pausado]);

  if (loading) return (
    <div className="bg-emerald-800 text-emerald-300 text-xs px-4 py-2 flex items-center gap-2">
      <span className="animate-pulse">●</span> Cargando licitaciones Mercado Público...
    </div>
  );

  if (licitaciones.length === 0) return null;

  const lic = licitaciones[idx];
  const dias = diasRestantes(lic.cierre);

  return (
    <div
      className="bg-emerald-900 text-white text-xs flex items-center gap-0 select-none shrink-0"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}>
      {/* Etiqueta */}
      <div className="bg-emerald-600 px-3 py-2 font-bold text-[11px] uppercase tracking-wider shrink-0 flex items-center gap-1.5">
        <span>🏛️</span> Licitaciones
      </div>

      {/* Contenido */}
      <a
        href={lic.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center gap-3 px-4 py-2 hover:bg-emerald-800 transition-colors cursor-pointer">
        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${TIPO_COLOR[lic.tipo] || "bg-gray-100 text-gray-600"}`}>
          {lic.tipo}
        </span>
        <span className="truncate text-emerald-100">{lic.nombre}</span>
        <span className="shrink-0 text-emerald-400 hidden md:block">· {lic.organismo}</span>
        {dias !== null && (
          <span className={`shrink-0 font-semibold ${dias <= 3 ? "text-red-400" : dias <= 7 ? "text-amber-400" : "text-emerald-400"}`}>
            {dias === 0 ? "Cierra hoy" : `${dias}d`}
          </span>
        )}
        <span className="shrink-0 text-emerald-500 text-[10px]">Ver →</span>
      </a>

      {/* Navegación */}
      <div className="flex items-center gap-1 px-3 shrink-0">
        <button onClick={() => setIdx(i => (i - 1 + licitaciones.length) % licitaciones.length)}
          className="text-emerald-400 hover:text-white px-1 transition-colors">‹</button>
        <span className="text-emerald-500 text-[10px] tabular-nums">{idx + 1}/{licitaciones.length}</span>
        <button onClick={() => setIdx(i => (i + 1) % licitaciones.length)}
          className="text-emerald-400 hover:text-white px-1 transition-colors">›</button>
      </div>
    </div>
  );
}
