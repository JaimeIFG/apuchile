"use client";
import { useEffect, useState } from "react";

function LogoLoader({ progress }) {
  const h = 44;
  const fillY = h * (1 - progress / 100);
  return (
    <svg width="160" height={h} viewBox={`0 0 160 ${h}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="apu-fill-clip">
          <rect x="0" y={fillY} width="160" height={h} />
        </clipPath>
      </defs>
      <text x="80" y="34" textAnchor="middle" fontSize="32" fontWeight="800"
        fontFamily="'Inter','Helvetica Neue',Arial,sans-serif" fill="#ffffff" opacity="0.15">
        APUdesk
      </text>
      <text x="80" y="34" textAnchor="middle" fontSize="32" fontWeight="800"
        fontFamily="'Inter','Helvetica Neue',Arial,sans-serif"
        clipPath="url(#apu-fill-clip)">
        <tspan fill="#ffffff">APU</tspan><tspan fill="#a5b4fc">desk</tspan>
      </text>
    </svg>
  );
}

/**
 * LoadingOverlay — superposición de carga con logo APUdesk
 *
 * Props:
 *  - visible: boolean — mostrar u ocultar
 *  - mensaje: string — texto opcional (se ignora si `variant` se pasa)
 *  - progress: number|null — si es null usa animación indeterminada (0-80 loop)
 *  - blur: boolean — difumina el fondo (default true, false = fondo opaco para carga inicial)
 *  - variant: 'loading' | 'saving' | 'processing' | 'uploading' | null
 *             atajo para mensajes consistentes en toda la app.
 */
const VARIANT_MSG = {
  loading:    "Cargando…",
  saving:     "Guardando…",
  processing: "Procesando…",
  uploading:  "Subiendo archivo…",
  ia:         "Consultando IA…",
};

export default function LoadingOverlay({ visible, mensaje, progress = null, blur = true, variant = null }) {
  const textoFinal = mensaje || VARIANT_MSG[variant] || "Cargando…";
  const [prog, setProg] = useState(0);
  const [dir, setDir] = useState(1);

  // Animación indeterminada: sube de 0 a 80 y baja, en loop
  useEffect(() => {
    if (!visible || progress !== null) return;
    const t = setInterval(() => {
      setProg(p => {
        const next = p + dir * 1.2;
        if (next >= 82) { setDir(-1); return 82; }
        if (next <= 0) { setDir(1); return 0; }
        return next;
      });
    }, 20);
    return () => clearInterval(t);
  }, [visible, progress, dir]);

  // Cuando se da un progress externo, usarlo directamente
  const displayProg = progress !== null ? progress : Math.round(prog);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-300"
      style={{
        backdropFilter: blur ? "blur(6px)" : "none",
        backgroundColor: blur ? "rgba(0,0,0,0.4)" : "rgba(30,27,75,0.97)",
      }}>
      <div className="flex flex-col items-center gap-4">
        <LogoLoader progress={displayProg} />
        <div className="w-44">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-indigo-300 font-medium">{textoFinal}</span>
            {progress !== null && (
              <span className="text-white font-bold">{displayProg}%</span>
            )}
          </div>
          <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
            <div className="h-1 bg-indigo-400 rounded-full transition-all duration-75"
              style={{ width: `${displayProg}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
