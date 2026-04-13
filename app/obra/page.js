"use client";
import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useInactividad } from "../lib/useInactividad";
import { extractBudgetFromPDF } from "../lib/extractPresupuesto";
import ONDAC_APUS from "../ondac_data_nuevo.json";
import {
  LayoutDashboard, FolderOpen, CircleDollarSign, CalendarRange,
  FileText, BookOpen, ClipboardList, FilePen, CheckCircle, Camera,
  Receipt, Banknote, ShieldCheck, TrendingUp, ArrowLeftRight,
  GanttChart, HardHat,
} from "lucide-react";

const CurvaS = lazy(() => import("../components/CurvaS"));
const IndicadoresEVM = lazy(() => import("../components/IndicadoresEVM"));
const EstadoPagoGenerator = lazy(() => import("../components/EstadoPagoGenerator"));
const GanttObra = lazy(() => import("../components/GanttObra"));
const ControlCostos = lazy(() => import("../components/ControlCostos"));
const FlujoCaja = lazy(() => import("../components/FlujoCaja"));
const HistogramaRecursos = lazy(() => import("../components/HistogramaRecursos"));
const ComparadorCotizaciones = lazy(() => import("../components/ComparadorCotizaciones"));
const MedidorPlano = lazy(() => import("../components/MedidorPlano"));

const LUCIDE_ICONS = {
  LayoutDashboard, FolderOpen, CircleDollarSign, CalendarRange,
  FileText, BookOpen, ClipboardList, FilePen, CheckCircle, Camera,
  Receipt, Banknote, ShieldCheck, TrendingUp, ArrowLeftRight,
  GanttChart, HardHat,
};

// ── Constantes ─────────────────────────────────────────────────────────────
const ESTADOS = ["En licitación", "En ejecución", "Paralizada", "Recepcionada", "Liquidada"];
const ESTADO_ST = {
  "En licitación": { bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  "En ejecución":  { bg: "#eef2ff", color: "#4338ca", dot: "#6366f1" },
  "Paralizada":    { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
  "Recepcionada":  { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  "Liquidada":     { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
};
const CATEGORIAS_DOCS = [
  "Actas","Bases","Decretos","Orden de Compra","Contratos y Modificaciones",
  "Caución de Garantías","Estados de Pago","Oficios","Contratista","Multas",
  "Recepciones","Liquidaciones","Contraloría","Carta Gantt y Planos","Varios",
];
const TIPOS_EP  = ["Certificado","Estado de Pago","Retención","Anticipo"];
const TIPOS_GAR = ["Seriedad de Oferta","Fiel Cumplimiento","Anticipo","Correcta Ejecución","Otra"];
const TIPOS_BIT = ["Observación","Avance","Problema","Reunión","Hito"];
const REGIONES_CL = [
  "Arica y Parinacota","Tarapacá","Antofagasta","Atacama","Coquimbo",
  "Valparaíso","Región Metropolitana","O'Higgins","Maule","Ñuble",
  "Biobío","La Araucanía","Los Ríos","Los Lagos","Aysén","Magallanes",
];
const TIPO_BIT_COLOR = {
  Avance:      { bg:"#eef2ff", color:"#4338ca" },
  Problema:    { bg:"#fee2e2", color:"#991b1b" },
  Reunión:     { bg:"#dbeafe", color:"#1d4ed8" },
  Hito:        { bg:"#fef3c7", color:"#92400e" },
  Observación: { bg:"#f1f5f9", color:"#475569" },
};
const BUCKET = "obras-docs";

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtFecha = s => s ? new Date(s).toLocaleDateString("es-CL") : "—";
const fmtPeso  = n => (n || n === 0) ? "$" + Math.round(n).toLocaleString("es-CL") : "—";
const diasAl   = f => f ? Math.ceil((new Date(f) - new Date()) / 86400000) : null;
const clamp    = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

async function uploadFile(obraId, subfolder, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `obras/${obraId}/${subfolder}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) return { url: null, nombre: null, error: error.message };
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, nombre: file.name, error: null };
}

function exportBitacoraPDF(obra, bitacora, anexos) {
  if (typeof window === "undefined") return;

  // Crear HTML para exportación
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bitácora - ${obra?.nombre || "Obra"}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { color: #4338ca; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
    .proyecto-info { background: #eef2ff; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
    .entrada { page-break-inside: avoid; margin-bottom: 25px; border-left: 4px solid #6366f1; padding-left: 15px; }
    .entrada-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .tipo { display: inline-block; background: #eef2ff; color: #4338ca; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
    .fecha-autor { color: #64748b; font-size: 13px; }
    .descripcion { margin: 10px 0; color: #374151; }
    .anexos { background: #f9fafb; padding: 10px; border-radius: 6px; margin-top: 10px; font-size: 12px; }
    .anexos strong { color: #6366f1; }
    .anexo-item { margin: 5px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; text-align: center; }
    @media print { .entrada { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>📖 Bitácora de Obra</h1>
  <div class="proyecto-info">
    <strong>${obra?.nombre || "Obra sin nombre"}</strong><br>
    ${obra?.ubicacion ? `📍 ${obra.ubicacion}<br>` : ""}
    ${obra?.monto_contrato ? `💰 Monto: $${Math.round(obra.monto_contrato).toLocaleString("es-CL")}<br>` : ""}
    ${obra?.estado ? `Estado: ${obra.estado}` : ""}
  </div>

  <div>
    ${bitacora.map(b => {
      const bitAnexos = anexos[b.id] || [];
      return `
    <div class="entrada">
      <div class="entrada-header">
        <span class="tipo">${b.tipo}</span>
        <span class="fecha-autor">${b.autor ? `por ${b.autor}` : ""} ${b.fecha ? `· ${fmtFecha(b.fecha)}` : ""}</span>
      </div>
      <div class="descripcion">${b.descripcion.replace(/\n/g, "<br>")}</div>
      ${bitAnexos.length > 0 ? `
      <div class="anexos">
        <strong>📎 Anexos:</strong>
        ${bitAnexos.map(a => `<div class="anexo-item">• ${a.nombre}</div>`).join("")}
      </div>
      ` : ""}
    </div>
      `;
    }).join("")}
  </div>

  <div class="footer">
    Generado el ${new Date().toLocaleDateString("es-CL")} · Bitácora de Ejecución de Obras
  </div>
</body>
</html>`;

  // Abrir en ventana nueva y disparar diálogo de impresión (Guardar como PDF)
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ── UI átomos ──────────────────────────────────────────────────────────────
const inputSt = {
  width:"100%", padding:"9px 12px", border:"1.5px solid #e2e8f0",
  borderRadius:10, fontSize:13, fontFamily:"inherit", outline:"none",
  boxSizing:"border-box", background:"#fff", color:"#1e293b",
};
const selectSt = { ...inputSt };

function InputRow({ label, children }) {
  return (
    <div>
      <label style={{ fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase",
        letterSpacing:".05em", display:"block", marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );
}
function Grid({ cols=2, children }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:14 }}>
      {children}
    </div>
  );
}
function Section({ title, children, action }) {
  return (
    <div style={{ background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:16,
      padding:"16px 20px", marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:14, paddingBottom:10, borderBottom:"1px solid #f1f5f9" }}>
        <h3 style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase",
          letterSpacing:".05em", margin:0 }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
function EmptyState({ icon, msg }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 0", color:"#94a3b8" }}>
      <div style={{ fontSize:36, marginBottom:8 }}>{icon}</div>
      <p style={{ fontSize:13 }}>{msg}</p>
    </div>
  );
}
function SemaforoChip({ fecha }) {
  const d = diasAl(fecha);
  if (d === null) return null;
  const { color, bg, label } =
    d < 0   ? { color:"#7f1d1d", bg:"#fee2e2", label:`Vencida ${Math.abs(d)}d` } :
    d <= 30 ? { color:"#991b1b", bg:"#fee2e2", label:`🔴 ${d}d` } :
    d <= 45 ? { color:"#92400e", bg:"#fed7aa", label:`🟠 ${d}d` } :
    d <= 75 ? { color:"#713f12", bg:"#fef3c7", label:`🟡 ${d}d` } :
              { color:"#4338ca", bg:"#eef2ff", label:`🟢 ${d}d` };
  return <span style={{ background:bg, color, fontSize:10, fontWeight:700,
    padding:"2px 8px", borderRadius:99, whiteSpace:"nowrap" }}>{label}</span>;
}
function ProgressBar({ pct, color="#6366f1", height=8 }) {
  const p = clamp(pct || 0, 0, 100);
  return (
    <div style={{ background:"#f1f5f9", borderRadius:99, overflow:"hidden", height }}>
      <div style={{ width:`${p}%`, background:color, height:"100%", borderRadius:99, transition:"width .5s" }}/>
    </div>
  );
}
function FileDropZone({ id, file, setFile, accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" }) {
  return (
    <div style={{ border:"2px dashed #e2e8f0", borderRadius:10, padding:"12px 14px",
      background:file?"#eef2ff":"#fafafa", cursor:"pointer" }}
      onClick={() => document.getElementById(id).click()}>
      <input id={id} type="file" style={{ display:"none" }} accept={accept}
        onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); }}/>
      {file ? (
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>📎</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#4338ca" }}>{file.name}</div>
            <div style={{ fontSize:10, color:"#94a3b8" }}>{(file.size/1024).toFixed(0)} KB</div>
          </div>
          <button type="button" onClick={e=>{ e.stopPropagation(); setFile(null); }}
            style={{ background:"none", border:"none", color:"#fca5a5", cursor:"pointer" }}>✕</button>
        </div>
      ) : (
        <div style={{ textAlign:"center", color:"#94a3b8", fontSize:12 }}>📁 Click para adjuntar archivo</div>
      )}
    </div>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:60, display:"flex", alignItems:"center",
      justifyContent:"center", padding:16, backdropFilter:"blur(6px)", background:"rgba(0,0,0,.35)" }}>
      <div style={{ background:"#fff", borderRadius:20, padding:"26px 28px 22px",
        width:"100%", maxWidth:540, boxShadow:"0 24px 60px rgba(0,0,0,.2)",
        maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", borderRadius:8,
            width:28, height:28, cursor:"pointer", fontSize:13, color:"#64748b" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function ModalActions({ onClose, onSave, saving, disabled=false, label="Guardar →" }) {
  return (
    <div style={{ display:"flex", gap:10, marginTop:6 }}>
      <button onClick={onSave} disabled={saving||disabled}
        style={{ flex:1, background:"#6366f1", color:"#fff", border:"none", borderRadius:12,
          padding:"11px", fontSize:14, fontWeight:700, cursor:"pointer",
          opacity:disabled?0.5:1, fontFamily:"inherit" }}>
        {saving ? "Guardando..." : label}
      </button>
      <button onClick={onClose}
        style={{ background:"#f1f5f9", color:"#64748b", border:"none", borderRadius:12,
          padding:"11px 18px", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
        Cancelar
      </button>
    </div>
  );
}

// ── Slideshow ───────────────────────────────────────────────────────────────
function FotoSlideshow({ fotos, onClickFoto }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (fotos.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % fotos.length), 4000);
    return () => clearInterval(t);
  }, [fotos.length]);
  const f = fotos[idx];
  if (!f) return null;
  return (
    <div style={{ position:"relative", borderRadius:16, overflow:"hidden", height:220,
      marginBottom:20, cursor:"pointer", background:"#1e293b" }}
      onClick={() => onClickFoto(f)}>
      <img src={f.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:.85 }}/>
      <div style={{ position:"absolute", inset:0,
        background:"linear-gradient(transparent 40%,rgba(0,0,0,.6))",
        display:"flex", flexDirection:"column", justifyContent:"flex-end", padding:"14px 18px" }}>
        {f.caption && <p style={{ color:"#fff", fontSize:13, fontWeight:600, margin:0 }}>{f.caption}</p>}
        <p style={{ color:"rgba(255,255,255,.55)", fontSize:10, margin:"3px 0 0" }}>
          📸 {idx+1}/{fotos.length} · Click para ampliar
        </p>
      </div>
      {fotos.length > 1 && (
        <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)", display:"flex", gap:4 }}>
          {fotos.map((_,i) => (
            <div key={i} onClick={e=>{ e.stopPropagation(); setIdx(i); }}
              style={{ width:i===idx?18:5, height:5, borderRadius:99,
                background:i===idx?"#fff":"rgba(255,255,255,.4)", transition:"all .3s", cursor:"pointer" }}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MetricCard ──────────────────────────────────────────────────────────────
function MetricCard({ title, main, sub, color, progress, progressColor, empty, emptyMsg }) {
  return (
    <div style={{ background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:14, padding:"14px 16px" }}>
      <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase",
        letterSpacing:".05em", marginBottom:8 }}>{title}</div>
      {empty ? <p style={{ fontSize:12, color:"#cbd5e1", margin:0 }}>{emptyMsg}</p> : (
        <>
          <div style={{ fontSize:24, fontWeight:800, color, marginBottom:4 }}>{main}</div>
          {sub && <div style={{ fontSize:11, color:"#64748b", marginBottom:progress!==undefined?8:0 }}>{sub}</div>}
          {progress !== undefined && <ProgressBar pct={progress} color={progressColor} height={5}/>}
        </>
      )}
    </div>
  );
}

// ── Calendario Bitácora ────────────────────────────────────────────────────
const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_ES  = ["Lu","Ma","Mi","Ju","Vi","Sá","Do"];

function CalendarioBitacora({ bitacora, mes, setMes, filtroFecha, setFiltroFecha }) {
  const { y, m } = mes;
  const firstDay = new Date(y, m, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  // Convertir domingo=0 a lunes=0
  const startOffset = (firstDay + 6) % 7;

  // Set de fechas con entradas (solo yyyy-mm-dd)
  const fechasConEntradas = new Set(
    bitacora.map(b => b.fecha ? b.fecha.slice(0, 10) : null).filter(Boolean)
  );

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const toKey = d => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"14px 12px", minWidth:220 }}>
      {/* Header mes */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <button onClick={()=>setMes(p=>{ const nm=p.m-1; return nm<0?{y:p.y-1,m:11}:{y:p.y,m:nm}; })}
          style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", fontSize:16, padding:"0 4px" }}>‹</button>
        <span style={{ fontSize:12, fontWeight:700, color:"#1e293b" }}>{MESES_ES[m]} {y}</span>
        <button onClick={()=>setMes(p=>{ const nm=p.m+1; return nm>11?{y:p.y+1,m:0}:{y:p.y,m:nm}; })}
          style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", fontSize:16, padding:"0 4px" }}>›</button>
      </div>
      {/* Días semana */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {DIAS_ES.map(d=>(
          <div key={d} style={{ textAlign:"center", fontSize:9, fontWeight:700, color:"#94a3b8", padding:"2px 0" }}>{d}</div>
        ))}
      </div>
      {/* Celdas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`}/>;
          const key = toKey(d);
          const hasEntry = fechasConEntradas.has(key);
          const isSelected = filtroFecha === key;
          const isToday = key === new Date().toISOString().slice(0,10);
          return (
            <button key={key} onClick={()=>setFiltroFecha(isSelected ? null : key)}
              style={{ position:"relative", background: isSelected ? "#6366f1" : isToday ? "#eef2ff" : "transparent",
                color: isSelected ? "#fff" : isToday ? "#6366f1" : "#374151",
                border: isToday && !isSelected ? "1px solid #bbf7d0" : "1px solid transparent",
                borderRadius:6, padding:"4px 2px", fontSize:11, cursor: hasEntry ? "pointer" : "default",
                fontWeight: hasEntry ? 700 : 400 }}>
              {d}
              {hasEntry && (
                <span style={{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)",
                  width:4, height:4, borderRadius:"50%",
                  background: isSelected ? "#fff" : "#6366f1", display:"block" }}/>
              )}
            </button>
          );
        })}
      </div>
      {filtroFecha && (
        <button onClick={()=>setFiltroFecha(null)}
          style={{ marginTop:10, width:"100%", background:"#eef2ff", color:"#6366f1",
            border:"1px solid #bbf7d0", borderRadius:8, padding:"5px 0", fontSize:11,
            fontWeight:600, cursor:"pointer" }}>✕ Limpiar filtro</button>
      )}
    </div>
  );
}

// ── Modal Informe de Obra ──────────────────────────────────────────────────
function ModalInforme({ obra, presupuesto, pagos, fotos, onClose, onSave }) {
  const hoy = new Date().toISOString().slice(0,10);
  const [paso, setPaso] = useState(1);
  const [tipo, setTipo] = useState("Mensual");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState(hoy);
  const [observGeneral, setObservGeneral] = useState("");
  const [partidasInforme, setPartidasInforme] = useState(() =>
    (presupuesto || []).map(p => ({
      id: p.id,
      item: p.item,
      partida: p.partida,
      unidad: p.unidad,
      cantidad: p.cantidad,
      valor_total: p.valor_total,
      pct: 0,
      estado: "No iniciada",
      obs: "",
      descripcion: "",
      incluir: true,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [busqOndacIdx, setBusqOndacIdx] = useState(null); // id partida con búsqueda abierta
  const [busqOndacQ, setBusqOndacQ] = useState("");

  const ondacSugerencias = busqOndacQ.length >= 2
    ? ONDAC_APUS.filter(a =>
        a.desc.toLowerCase().includes(busqOndacQ.toLowerCase()) ||
        a.codigo.includes(busqOndacQ)
      ).slice(0, 12)
    : [];

  const vincularOndac = (partidaId, apu) => {
    setPartidasInforme(prev => prev.map(p => {
      if (p.id !== partidaId) return p;
      const next = { ...p, ondac_codigo: apu.codigo, ondac_familia: apu.familia, ondac_desc: apu.desc, ondac_unidad: apu.unidad };
      next.descripcion = generarDescripcionFamilia(next.partida, next.pct, next.estado, apu.familia, apu.desc);
      return next;
    }));
    setBusqOndacIdx(null);
    setBusqOndacQ("");
  };

  function generarDescripcionFamilia(partida, pct, estado, familia, ondacDesc) {
    const p = Math.round(pct || 0);
    const fin = estado === "Terminada";
    const sufijo = fin
      ? " Los trabajos quedaron terminados y conformes a las especificaciones técnicas del proyecto."
      : ` Acumulando a la fecha un avance total de ${p}% respecto al total contratado. Trabajos en ejecución conforme a programa.`;
    const nombre = ondacDesc || partida;
    const f = (familia || "").toUpperCase();

    if (f === "A") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se ejecutó la instalación completa de faenas incluyendo bodega, oficina ITO, servicios higiénicos, cerco perimetral, señalética de seguridad y acometidas provisorias de agua y electricidad. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida ${nombre}. Se ejecutaron los trabajos de habilitación del campamento de obra y acometidas provisorias conforme a lo estipulado.${sufijo}`;

    if (f === "B") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se ejecutó la totalidad de los trabajos de movimiento de tierras y/o excavaciones, incluyendo perfilado de taludes, retiro y disposición del material excedente en botadero autorizado. Se verificó la cota de diseño según planos. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida ${nombre}. Se ejecutó el movimiento de tierras en el área correspondiente, con retiro y traslado del material al botadero designado. Se verificó la cota de fundación o diseño según proyecto.${sufijo}`;

    if (f === "C") {
      const n = (ondacDesc||partida||"").toLowerCase();
      const esBombeado = n.includes("bombeado") || n.includes("bomba");
      const esLiviano = n.includes("liviano");
      const dosif = n.match(/h\s?(\d+)/i) ? "H"+n.match(/h\s?(\d+)/i)[1] : n.match(/g(\d+)/i) ? "H"+n.match(/g(\d+)/i)[1] : "";
      const tipo = esBombeado ? " bombeado (340 kg cemento/m³ mín.)" : esLiviano ? " liviano" : dosif ? ` ${dosif}` : "";
      return fin
        ? `Se completó el 100% de la partida ${nombre}. Se ejecutaron la totalidad de los trabajos de instalación de moldajes, habilitación de enfierraduras y vaciado de hormigón${tipo}. Se verificó vibrado, curado húmedo mínimo 7 días y conformidad geométrica según NCh170. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la partida ${nombre}. Se realizaron trabajos de instalación de moldajes, colocación de armadura y vaciado de hormigón${tipo}. Se controló consistencia mediante cono de Abrams y se ejecutó vibrado y curado correspondiente.${sufijo}`;
    }

    if (f === "D") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se instaló, aplomó y arriostró la totalidad de los moldajes, incluyendo posterior desencofrado en los plazos de fraguado requeridos según NCh170. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida ${nombre}. Se ejecutó el montaje y arriostramiento de moldajes en el área indicada, verificando verticalidad, planeidad y estanqueidad previo al vaciado.${sufijo}`;

    if (f === "E") {
      const n = (ondacDesc||"").toLowerCase();
      const diam = n.match(/d\s?(\d+)/i) ? "D"+n.match(/d\s?(\d+)/i)[1] : "";
      return fin
        ? `Se completó el 100% de la partida ${nombre}. Se habilitó y colocó la totalidad de la armadura${diam?" "+diam:""} según planos estructurales, incluyendo corte, doblado, amarre con alambre recocido y verificación de recubrimientos mínimos conforme a NCh429. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la partida ${nombre}. Se ejecutó el corte, doblado y colocación de ${diam?"enfierradura "+diam:"armaduras"} en la zona indicada, verificando recubrimientos y traslapes según especificaciones.${sufijo}`;
    }

    if (f === "F") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se ejecutó la totalidad de la mampostería con mortero cemento-arena dosificación 1:5, aplomado, nivelación y sellado de juntas según planos de proyecto. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida ${nombre}. Se ejecutó la colocación de albañilería con mortero 1:5, controlando aplome, escuadra y geometría de vanos en el área indicada.${sufijo}`;

    if (f === "G") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se realizó la fabricación y/o montaje de la totalidad de los elementos de acero y cerrajería, incluyendo corte, soldadura, tratamiento anticorrosivo y fijaciones según especificaciones. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida ${nombre}. Se ejecutaron los trabajos de acero y cerrajería en el área indicada, verificando dimensiones, soldaduras y tratamientos de superficie.${sufijo}`;

    if (f === "H") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se instaló la totalidad de los tabiques y divisiones interiores de estructura metálica (volcametal/metalcon), con soleras, montantes a 60 cm, placa por cara y sellado de juntas. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida ${nombre}. Se ejecutó el trazado, instalación de soleras, montantes y placas de yeso-cartón en el área indicada, rellenando juntas.${sufijo}`;

    if (f === "I" || f === "IB") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se instaló la totalidad de la cubierta incluyendo estructura de soporte, aislación, planchas con traslape reglamentario, canaletas y bajadas de aguas lluvias. Se verificó hermeticidad del sistema. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida ${nombre}. Se ejecutó la instalación de estructura de soporte y planchas de cubierta en el área indicada, asegurando fijación, traslape y pendiente según proyecto.${sufijo}`;

    if (f === "J") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se instaló la totalidad de la estructura metálica de soporte (perfiles T y canales), paneles de cielo y terminaciones de borde. Se verificó nivelación y ausencia de deflexiones. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida ${nombre}. Se ejecutó la estructura de soporte y fijación de paneles de cielo en el área intervenida, verificando nivelación y planeidad.${sufijo}`;

    if (f === "K") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se realizó la preparación de superficies y se aplicó la totalidad de las capas de revestimiento/pintura indicadas en especificaciones técnicas. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida ${nombre}. Se prepararon las superficies y se aplicaron las capas de revestimiento/pintura en el área intervenida, verificando uniformidad y adherencia.${sufijo}`;

    if (f === "L") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se ejecutó la preparación de base con mortero autonivelante, aplicación de adhesivo, colocación de pavimento/revestimiento con crucetas, fraguado de juntas y remates. Tolerancia ±3 mm/2 m verificada. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida ${nombre}. Se preparó la base, se aplicó adhesivo y se instaló el pavimento/revestimiento en el área indicada, verificando planeidad y alineamiento de juntas.${sufijo}`;

    if (f === "M") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se instaló la totalidad de los elementos de carpintería (puertas/ventanas), incluyendo colocación en vano, aplomado, fijación con tacos expansivos, sellado perimetral con silicona neutra y prueba de funcionamiento. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida ${nombre}. Se colocaron, aplomaron y fijaron los elementos de carpintería en los vanos indicados, ejecutando sellado perimetral y prueba de funcionamiento.${sufijo}`;

    if (f === "N") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se instaló la totalidad de la quincallería, herrajes y accesorios conforme a especificaciones, verificando el correcto funcionamiento de cada elemento. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la instalación de ${nombre}. Se colocaron los herrajes y accesorios correspondientes, verificando funcionamiento y acabados.${sufijo}`;

    if (f === "P" || f === "PE" || f === "PA") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se realizó el tendido de redes (ductos/tuberías), conexionado de elementos y pruebas de funcionamiento/presión conforme a normativa SEC/SISS vigente. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la instalación de ${nombre}. Se ejecutó el tendido de redes, colocación de elementos y conexionado parcial en el área indicada, con pruebas de hermeticidad/continuidad.${sufijo}`;

    if (f === "Q") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se ejecutaron la totalidad de los trabajos de urbanización y obras exteriores, incluyendo pavimentos, soleras, veredas, áreas verdes y señalización conforme a proyecto. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en los trabajos de ${nombre}. Se ejecutaron las obras de urbanización en el área indicada conforme a planos y especificaciones técnicas.${sufijo}`;

    if (f === "R") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se ejecutaron la totalidad de las obras civiles indicadas, verificándose la correcta ejecución conforme a planos y especificaciones técnicas del proyecto. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en los trabajos de ${nombre}. Se ejecutaron las obras civiles correspondientes en el área indicada conforme a proyecto.${sufijo}`;

    if (f === "S") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se instaló la totalidad de las escaleras, barandas y elementos de circulación vertical, verificando dimensiones, fijaciones y acabados conforme a especificaciones. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la instalación de ${nombre}. Se ejecutaron los trabajos de escaleras/barandas en el área indicada, verificando escuadras, fijaciones y acabados.${sufijo}`;

    if (f === "V") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se procedió al retiro controlado de los elementos indicados, carga en camión y disposición del material en botadero autorizado. Limpieza final del área ejecutada. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en los trabajos de ${nombre}. Se ejecutó el retiro y carga del material, transportándolo al botadero autorizado conforme a normativa de residuos de construcción.${sufijo}`;

    if (f === "W") return fin
      ? `Se completó el 100% de la partida ${nombre}. Se instaló la totalidad del mobiliario y equipamiento conforme a especificaciones, verificando nivelación, fijación y funcionamiento de cada elemento. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la instalación de ${nombre}. Se colocó y fijó el mobiliario/equipamiento en las posiciones indicadas en proyecto.${sufijo}`;

    // fallback a texto si no hay familia
    return generarDescripcion(partida, pct, estado);
  }

  function generarDescripcion(partida, pct, estado) {
    const n = (partida || "").toLowerCase();
    const p = Math.round(pct || 0);
    const fin = estado === "Terminada";
    const sufijo = fin
      ? " Los trabajos quedaron terminados y conformes a las especificaciones técnicas del proyecto."
      : ` Acumulando a la fecha un avance total de ${p}% respecto al total contratado. Trabajos en ejecución conforme a programa.`;

    // C — Hormigones (ONDAC: H5/H20/H25/H30, liviano, bombeado)
    if (n.includes("hormig")) {
      const dosif = n.match(/h\s?(\d+)/i) ? "H"+n.match(/h\s?(\d+)/i)[1] : n.match(/g\d+/i) ? n.match(/g\d+/i)[0].toUpperCase() : "";
      const esBombeado = n.includes("bombeado") || n.includes("bomba");
      const esLiviano = n.includes("liviano") || n.includes("celular");
      const tipoHorm = esBombeado ? " bombeado (dosificación mín. 340 kg cemento/m³)" : esLiviano ? " liviano (densidad aprox. 1.200 kg/m³)" : dosif ? ` ${dosif}` : "";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutaron la totalidad de los trabajos de instalación de moldajes, habilitación de enfierraduras y vaciado de hormigón${tipoHorm}. Se verificó vibrado, curado húmedo mínimo 7 días y conformidad geométrica según NCh170 y especificaciones técnicas. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la partida ${partida}. Se realizaron trabajos de instalación de moldajes, colocación de armadura y vaciado de hormigón${tipoHorm}. Se controló consistencia mediante cono de Abrams y se ejecutó vibrado y curado correspondiente. ${sufijo}`;
    }
    // E — Enfierraduras (ONDAC: D10–D25, mallas electrosoldadas)
    if (n.includes("enfierr") || n.includes("armadur") || n.includes("fierro") || n.includes("malla electro")) {
      const diam = n.match(/d\s?(\d+)/i) ? "D"+n.match(/d\s?(\d+)/i)[1] : "";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se habilitó y colocó la totalidad de la armadura${diam?" "+diam:""} según planos estructurales, incluyendo corte, doblado, amarre con alambre recocido y verificación de recubrimientos mínimos conforme a NCh429. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la partida ${partida}. Se ejecutó corte, doblado y colocación de ${diam?"enfierradura "+diam:"armaduras"} en la zona indicada, verificando recubrimientos y traslapes según especificaciones técnicas.${sufijo}`;
    }
    // D — Moldajes y andamios (ONDAC: losa, muro, fundación, pilar)
    if (n.includes("moldaje") || n.includes("encofr") || n.includes("andamio")) {
      const tm = n.includes("losa") ? "losa" : n.includes("muro") ? "muro" : n.includes("pilar") ? "pilar" : n.includes("fundaci") ? "fundación" : "elemento estructural";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló, aplomó y arriostró la totalidad de los moldajes de ${tm}, incluyendo posterior desencofrado en los plazos de fraguado requeridos según NCh170. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutó el montaje y arriostramiento de moldajes de ${tm} en el área indicada, verificando verticalidad, planeidad y estanqueidad previo al vaciado.${sufijo}`;
    }
    // B — Excavaciones (ONDAC: brazo/máquina, terreno blando/semiduro/duro/roca)
    if (n.includes("excav") || n.includes("movim") || n.includes("escarpe")) {
      const conMaq = n.includes("máquina") || n.includes("retroexcavad") || n.includes("maquina");
      const terreno = n.includes("roca") ? "roca" : n.includes("duro") ? "terreno duro" : n.includes("semiduro") ? "terreno semiduro" : "terreno normal";
      return fin
        ? `Se completó el 100% de los trabajos de ${partida}. Se ejecutó la excavación en ${terreno} mediante ${conMaq?"maquinaria pesada (retroexcavadora)":"medios manuales y mecánicos"}, con perfilado de taludes, retiro y disposición del material en botadero autorizado. Se verificó cota de fundación según planos. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó la excavación en ${terreno} con retiro y traslado del material al botadero designado. Se verificó la cota de fundación según lo indicado en proyecto.${sufijo}`;
    }
    // B — Rellenos y compactación (ONDAC: capas 20 cm, Proctor)
    if (n.includes("rellen") || n.includes("compac")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutó el relleno y compactación en capas de 20 cm, controladas mediante ensayes de densidad in situ (Proctor modificado), alcanzando la densidad mínima requerida según especificaciones técnicas. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la partida ${partida}. Se colocó material de relleno por capas de 20 cm y se compactó con equipo vibratorio, verificando densidad mediante ensayes en terreno.${sufijo}`;
    }
    // F — Albañilería y mampostería (ONDAC: fiscal/gran titán/super flaco, mortero 1:5)
    if (n.includes("albañil") || n.includes("mamposter") || n.includes("ladrillo") || n.includes("bloque")) {
      const tb = n.includes("fiscal") ? "ladrillo fiscal" : n.includes("gran tit") ? "bloque gran titán" : n.includes("super flaco") ? "bloque super flaco" : n.includes("bloque") ? "bloque de hormigón" : "ladrillo";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutó la totalidad de la mampostería de ${tb} con mortero cemento-arena dosificación 1:5, aplomado, nivelación y sellado de juntas según planos de proyecto. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó la colocación de ${tb} con mortero 1:5, controlando aplome, escuadra y geometría de vanos en el área indicada.${sufijo}`;
    }
    // K — Estucos y revoques (ONDAC: exterior 340 kg/m², interior, 2-3 manos con llana)
    if (n.includes("estuco") || n.includes("revoque") || n.includes("empaste")) {
      const esExt = n.includes("exter") || n.includes("fachada");
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se aplicó la totalidad del estuco ${esExt?"exterior (dosificación 340 kg cemento/m²)":"interior"} en 2-3 manos, previa limpieza y humedecimiento de base, terminando con llana metálica para obtener superficies planas. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la aplicación de ${partida}. Se ejecutó el estuco ${esExt?"exterior (340 kg cemento/m²)":"interior"} en capas sucesivas con llana, verificando planeidad y aplome en el área indicada.${sufijo}`;
    }
    // K — Pinturas (ONDAC: látex/esmalte/anticorrosivo, imprimación + 2 manos terminación)
    if (n.includes("pintur") || n.includes("látex") || n.includes("latex") || n.includes("esmalte")) {
      const tp = n.includes("esmalte") ? "esmalte alkídico" : n.includes("metal") || n.includes("estructura") ? "anticorrosivo + esmalte para estructura metálica" : "látex acrílico";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó preparación de superficies (lijado, masillado y limpieza) y se aplicó 1 mano de imprimación + 2 manos de ${tp}, verificando uniformidad y adherencia. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la aplicación de ${partida}. Se prepararon las superficies y se aplicaron las manos de ${tp} en el área intervenida, verificando uniformidad y ausencia de escurrimientos.${sufijo}`;
    }
    // K — Revestimientos (ONDAC: siding, piedra, madera)
    if (n.includes("revestim") || n.includes("siding") || n.includes("piedra revestim")) {
      const tr = n.includes("siding") ? "siding" : n.includes("piedra") ? "piedra" : n.includes("madera") ? "madera" : "revestimiento";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló la totalidad del revestimiento de ${tr}, incluyendo preparación de base, estructura de soporte, colocación de piezas, sellado de juntas y remates perimetrales conforme a especificaciones. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutó la colocación del revestimiento de ${tr} en el área indicada, verificando planeidad, fijaciones y sellado de juntas.${sufijo}`;
    }
    // H — Tabiques y divisiones interiores (ONDAC: volcametal PL10/PL15, húmedo/seco)
    if (n.includes("tabique") || n.includes("volcametal") || n.includes("drywall") || n.includes("metalcon")) {
      const thum = n.includes("húmedo") || n.includes("humedo") ? " área húmeda (PL15, e=15 mm)" : n.includes("seco") ? " área seca (PL10, e=10 mm)" : "";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló la totalidad de los tabiques de estructura metálica (volcametal/metalcon)${thum?", tipo"+thum:""}, con soleras, montantes a 60 cm, placa por cara, sellado de juntas y terminación. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutó trazado, soleras, montantes metálicos y placas de yeso-cartón${thum?" "+thum:""} en el área indicada, rellenando juntas.${sufijo}`;
    }
    // I — Cubierta y techumbre (ONDAC: cerchas, correas, plancha, traslape mínimo)
    if (n.includes("cubierta") || n.includes("techo") || n.includes("teja") || n.includes("zinc") || n.includes("plancha")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló la totalidad de la cubierta incluyendo cerchas, correas, aislación, planchas con traslape mínimo reglamentario, canaletas y bajadas de aguas lluvias. Se verificó hermeticidad del sistema. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó instalación de estructura de soporte y planchas de cubierta en el área indicada, asegurando fijación, traslape y pendiente según proyecto.${sufijo}`;
    }
    // J — Cielos y aislaciones (ONDAC: perfiles T, canales, paneles)
    if (n.includes("cielo") || n.includes("plafón") || n.includes("plafon") || n.includes("aislaci")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló la totalidad de la estructura metálica de soporte (perfiles T y canales), paneles de cielo y terminaciones de borde. Se verificó nivelación y ausencia de deflexiones. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutó la estructura de soporte y fijación de paneles en el área intervenida, verificando nivelación y planeidad.${sufijo}`;
    }
    // L — Pisos y pavimentos (ONDAC: flotante clic, cerámico, porcelanato, mortero autonivelante)
    if (n.includes("piso") || n.includes("pavim") || n.includes("cerám") || n.includes("baldos") || n.includes("porcelan")) {
      const tpiso = n.includes("flotante") ? "piso flotante (sistema clic)" : n.includes("porcelan") ? "porcelanato" : n.includes("cerám") ? "cerámico" : "pavimento";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutó preparación de base con mortero autonivelante, aplicación de adhesivo, colocación de ${tpiso} con crucetas, fraguado de juntas y remates de bordes. Tolerancia ±3 mm/2 m verificada. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la colocación de ${partida}. Se preparó la base, se aplicó adhesivo y se instaló ${tpiso} en el área indicada, verificando planeidad y alineamiento de juntas.${sufijo}`;
    }
    // M — Puertas, ventanas y carpintería (ONDAC: fijación, sellado silicona, prueba funcionamiento)
    if (n.includes("ventana") || n.includes("puerta") || n.includes("carpint") || n.includes("marco") || n.includes("cancel")) {
      const tcarpt = n.includes("ventana") ? "ventanas" : n.includes("puerta") ? "puertas" : "elementos de carpintería";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló la totalidad de ${tcarpt}, incluyendo colocación en vano, aplomado, fijación con tacos expansivos, sellado perimetral con silicona neutra y prueba de funcionamiento. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se colocaron, aplomaron y fijaron ${tcarpt} en los vanos indicados, ejecutando sellado perimetral y prueba de funcionamiento.${sufijo}`;
    }
    // C/R — Fundaciones, radier y losas (ONDAC: subrasante + enfierradura + hormigón + curado)
    if (n.includes("fundaci") || n.includes("zapata") || n.includes("radier") || n.includes("losa")) {
      const tf = n.includes("radier") ? "radier" : n.includes("losa") ? "losa" : n.includes("zapata") ? "zapatas" : "fundaciones";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutaron trabajos de excavación, preparación de subrasante, habilitación de enfierraduras y vaciado de hormigón para ${tf}. Curado húmedo mínimo 7 días y verificación de cotas según planos de fundaciones. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutaron habilitación de enfierraduras, instalación de moldajes y vaciado de hormigón en los ${tf} correspondientes, controlando cotas y niveles.${sufijo}`;
    }
    // P — Instalaciones eléctricas (ONDAC/SEC: ductos conduit, THHN, tableros, pruebas)
    if (n.includes("eléctri") || n.includes("electric") || n.includes("alumbr") || n.includes("luminaria") || n.includes("tablero")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó tendido de ductos conduit, cableado con conductores THHN, conexionado de tableros y puntos de luz/fuerza, y pruebas eléctricas conforme a NSEG 5 E.n.71 (SEC). Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutó tendido de ductos, cableado, fijación de cajas y conexionado parcial de tableros y puntos de luz/fuerza en el área indicada.${sufijo}`;
    }
    // P — Instalaciones sanitarias (ONDAC: PVC/HDPE, prueba presión, desinfección)
    if (n.includes("agua") || n.includes("sanitari") || n.includes("cañer") || n.includes("alcan")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó tendido de tuberías (PVC/HDPE), piezas especiales, prueba de presión hidrostática y desinfección de la red conforme a NCh1105 y normativa SISS. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en las obras de ${partida}. Se instalaron tuberías, piezas especiales y se ejecutaron uniones, con pruebas parciales de hermeticidad en tramos terminados.${sufijo}`;
    }
    // V — Demolición y retiro de escombros (ONDAC: carga, transporte, botadero autorizado)
    if (n.includes("demolici") || n.includes("retiro") || n.includes("desmonte")) {
      return fin
        ? `Se completó el 100% de los trabajos de ${partida}. Se procedió al retiro controlado de los elementos indicados, carga en camión y disposición del escombro en botadero autorizado por la autoridad competente. Limpieza final del área ejecutada. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó el retiro y carga del material en el área asignada, transportándolo al botadero autorizado conforme a normativa de residuos de construcción.${sufijo}`;
    }
    // A — Instalación de faenas
    if (n.includes("faena") || (n.includes("instala") && n.includes("obr"))) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutó la instalación completa de faenas incluyendo bodega, oficina ITO, servicios higiénicos, cerco perimetral, señalética de seguridad y acometidas provisorias de agua y electricidad. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutaron los trabajos de habilitación del campamento de obra, cerco perimetral y acometidas provisorias conforme a lo estipulado.${sufijo}`;
    }
    // Aseo y limpieza final de obra
    if (n.includes("aseo") || n.includes("limpieza")) {
      return fin
        ? `Se completó el 100% de las labores de ${partida}. Se realizó limpieza general de la obra, retiro de escombros y materiales sobrantes, dejando el área en condiciones de entrega conforme a las bases del contrato. Partida finalizada.`
        : `Durante el período se ejecutaron labores de ${partida} en el área intervenida, retirando escombros y materiales sobrantes acumulados, manteniendo el orden y aseo de la faena.${sufijo}`;
    }
    // Fallback genérico ONDAC
    return fin
      ? `Se completó el 100% de la partida "${partida}". Se ejecutaron la totalidad de los trabajos indicados en las especificaciones técnicas del proyecto, verificándose la correcta ejecución conforme a planos, normativa vigente y exigencias de la Inspección Técnica de Obras (ITO). Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida "${partida}". Se ejecutaron los trabajos correspondientes conforme a las especificaciones técnicas del proyecto, bajo supervisión de la ITO y en conformidad con el programa contractual.${sufijo}`;
  }

  const updatePartida = (id, field, val) => {
    setPartidasInforme(prev => prev.map(p => {
      if (p.id !== id) return p;
      const next = { ...p, [field]: val };
      if (field === "pct" || field === "estado") {
        next.descripcion = generarDescripcion(next.partida, field==="pct"?val:next.pct, field==="estado"?val:next.estado);
      }
      return next;
    }));
  };

  const fmtP = n => n ? "$"+Math.round(n).toLocaleString("es-CL") : "—";
  const totalContrato = (presupuesto||[]).reduce((s,p)=>s+(p.valor_total||0),0);
  const ultimoEP = pagos && pagos.length > 0 ? pagos[pagos.length-1] : null;

  const handleSave = async () => {
    setSaving(true);
    const datos = {
      obra_nombre: obra?.nombre,
      contratista: obra?.contratista,
      inspector: obra?.inspector_fiscal,
      region: obra?.region,
      monto_contrato: obra?.monto_contrato || totalContrato,
      tipo_informe: tipo,
      observacion_general: observGeneral,
      ultimo_ep: ultimoEP?.nombre,
      fotos_count: fotos?.length || 0,
    };
    const partidas_out = partidasInforme.filter(p=>p.incluir && (p.pct||0) > 0).map(p=>({
      item: p.item,
      partida: p.partida,
      unidad: p.unidad,
      cantidad: p.cantidad,
      valor_total: p.valor_total,
      pct: p.pct,
      estado: p.estado,
      obs: p.obs,
      descripcion: p.descripcion || generarDescripcion(p.partida, p.pct, p.estado),
    }));
    await onSave({ tipo, periodo_desde: desde||null, periodo_hasta: hasta||null, datos_json: datos, partidas_json: partidas_out });
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:860,
        maxHeight:"92vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"18px 24px", borderBottom:"1px solid #e2e8f0",
          background:"linear-gradient(135deg,#4338ca,#6366f1)", borderRadius:"18px 18px 0 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <h2 style={{ color:"#fff", margin:0, fontSize:16, fontWeight:800 }}>📋 Nuevo Informe de Obra</h2>
              <p style={{ color:"#a7f3d0", margin:"2px 0 0", fontSize:12 }}>{obra?.nombre}</p>
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none",
              color:"#fff", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:13 }}>✕</button>
          </div>
          {/* Pasos */}
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            {["Datos generales","Avance partidas","Vista previa"].map((s,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:6, flex:1 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", fontSize:11, fontWeight:800,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: paso>i+1?"#fff":paso===i+1?"#fff":"rgba(255,255,255,0.3)",
                  color: paso>i+1?"#6366f1":paso===i+1?"#6366f1":"#fff" }}>
                  {paso>i+1?"✓":i+1}
                </div>
                <span style={{ fontSize:11, color: paso===i+1?"#fff":"rgba(255,255,255,0.6)", fontWeight: paso===i+1?700:400 }}>{s}</span>
                {i<2&&<div style={{ flex:1, height:1, background:"rgba(255,255,255,0.2)" }}/>}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {/* PASO 1 */}
          {paso===1&&(
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>TIPO DE INFORME</label>
                  <select value={tipo} onChange={e=>setTipo(e.target.value)}
                    style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13 }}>
                    {["Semanal","Mensual","Final","Especial"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div/>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>PERÍODO DESDE</label>
                  <input type="date" value={desde} onChange={e=>setDesde(e.target.value)}
                    style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13 }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>PERÍODO HASTA</label>
                  <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)}
                    style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13 }}/>
                </div>
              </div>
              {/* Datos auto-rellenados */}
              <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:16, marginBottom:16 }}>
                <p style={{ fontSize:11, fontWeight:700, color:"#64748b", margin:"0 0 12px", textTransform:"uppercase" }}>Datos de la Obra (auto-rellenado)</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[
                    ["Nombre","obra_nombre",obra?.nombre],
                    ["Contratista","contratista",obra?.contratista||"—"],
                    ["Inspector Fiscal","inspector",obra?.inspector_fiscal||"—"],
                    ["Región","region",obra?.region||"—"],
                    ["Monto Contrato","monto",fmtP(obra?.monto_contrato||totalContrato)],
                    ["Último EP","ep",ultimoEP?.nombre||"Sin EP registrado"],
                  ].map(([label,,val])=>(
                    <div key={label}>
                      <span style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>{label}</span>
                      <p style={{ fontSize:13, color:"#1e293b", fontWeight:600, margin:"2px 0 0" }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>OBSERVACIÓN GENERAL DEL PERÍODO</label>
                <textarea value={observGeneral} onChange={e=>setObservGeneral(e.target.value)} rows={3}
                  placeholder="Describa brevemente las actividades generales del período..."
                  style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8,
                    fontSize:13, resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" }}/>
              </div>
            </div>
          )}

          {/* PASO 2 */}
          {paso===2&&(
            <div>
              <p style={{ fontSize:12, color:"#64748b", margin:"0 0 14px" }}>
                Ingrese el % de avance y estado de cada partida. La descripción técnica se genera automáticamente.
              </p>
              {partidasInforme.length===0?(
                <div style={{ textAlign:"center", padding:"40px 20px", color:"#94a3b8" }}>
                  <p style={{ fontSize:32, margin:0 }}>📦</p>
                  <p style={{ fontSize:14, margin:"8px 0 0" }}>No hay partidas cargadas en el presupuesto</p>
                </div>
              ):(
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {partidasInforme.map(p=>(
                    <div key={p.id} style={{ border:`1px solid ${p.incluir?"#e2e8f0":"#f1f5f9"}`,
                      borderRadius:12, padding:"12px 14px",
                      background: p.incluir?"#fff":"#f8fafc", opacity: p.incluir?1:0.6 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                            <input type="checkbox" checked={p.incluir} onChange={e=>updatePartida(p.id,"incluir",e.target.checked)}
                              style={{ width:14, height:14, cursor:"pointer" }}/>
                            <span style={{ fontSize:11, color:"#94a3b8", fontWeight:600 }}>{p.item}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:"#1e293b" }}>{p.partida}</span>
                            {p.ondac_codigo && (
                              <span style={{ fontSize:10, background:"#eef2ff", color:"#4338ca",
                                padding:"1px 6px", borderRadius:99, fontFamily:"monospace", fontWeight:700 }}>
                                {p.ondac_codigo}
                              </span>
                            )}
                            <button onClick={()=>{ setBusqOndacIdx(busqOndacIdx===p.id?null:p.id); setBusqOndacQ(""); }}
                              style={{ fontSize:10, padding:"2px 8px", borderRadius:6, border:"1px solid #e2e8f0",
                                background:"#f8fafc", color:"#64748b", cursor:"pointer" }}>
                              🔍 ONDAC
                            </button>
                          </div>
                          <span style={{ fontSize:10, color:"#94a3b8", marginLeft:22 }}>
                            {p.unidad} · {fmtP(p.valor_total)}
                            {p.ondac_desc&&<span style={{ color:"#6366f1", marginLeft:6 }}>· {p.ondac_desc}</span>}
                          </span>
                          {/* Panel búsqueda ONDAC */}
                          {busqOndacIdx===p.id&&(
                            <div style={{ marginTop:8, marginLeft:22, background:"#f8fafc",
                              border:"1px solid #e2e8f0", borderRadius:10, padding:10 }}>
                              <input autoFocus value={busqOndacQ} onChange={e=>setBusqOndacQ(e.target.value)}
                                placeholder="Buscar en catálogo ONDAC (ej: hormigón, estuco, excavación...)"
                                style={{ width:"100%", padding:"6px 10px", border:"1px solid #cbd5e1",
                                  borderRadius:6, fontSize:12, boxSizing:"border-box" }}/>
                              {ondacSugerencias.length>0&&(
                                <div style={{ maxHeight:180, overflowY:"auto", marginTop:6 }}>
                                  {ondacSugerencias.map(apu=>(
                                    <button key={apu.codigo} onClick={()=>vincularOndac(p.id, apu)}
                                      style={{ display:"block", width:"100%", textAlign:"left",
                                        padding:"6px 8px", border:"none", background:"none", cursor:"pointer",
                                        borderRadius:6, fontSize:11 }}
                                      onMouseEnter={e=>e.currentTarget.style.background="#e0f2fe"}
                                      onMouseLeave={e=>e.currentTarget.style.background="none"}>
                                      <span style={{ fontFamily:"monospace", color:"#64748b", marginRight:8 }}>{apu.codigo}</span>
                                      <span style={{ fontWeight:600, color:"#1e293b" }}>{apu.desc}</span>
                                      <span style={{ color:"#94a3b8", marginLeft:8 }}>{apu.unidad}</span>
                                      <span style={{ float:"right", fontSize:10, background:"#eef2ff",
                                        color:"#4338ca", padding:"1px 5px", borderRadius:99 }}>{apu.familia}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              {busqOndacQ.length>=2&&ondacSugerencias.length===0&&(
                                <p style={{ fontSize:11, color:"#94a3b8", margin:"8px 0 0" }}>Sin resultados para "{busqOndacQ}"</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {p.incluir&&(
                        <div style={{ display:"grid", gridTemplateColumns:"120px 160px 1fr", gap:10, alignItems:"start" }}>
                          <div>
                            <label style={{ fontSize:10, fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>% AVANCE</label>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <input type="number" min={0} max={100} value={p.pct}
                                onChange={e=>updatePartida(p.id,"pct",Number(e.target.value))}
                                style={{ width:60, padding:"5px 8px", border:"1px solid #e2e8f0",
                                  borderRadius:6, fontSize:13, textAlign:"center" }}/>
                              <span style={{ fontSize:12, color:"#64748b" }}>%</span>
                            </div>
                            <div style={{ marginTop:5, height:4, borderRadius:99, background:"#e2e8f0", overflow:"hidden" }}>
                              <div style={{ width:`${p.pct}%`, height:"100%", borderRadius:99,
                                background: p.pct===100?"#6366f1":p.pct>0?"#f59e0b":"#e2e8f0",
                                transition:"width .3s" }}/>
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize:10, fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>ESTADO</label>
                            <select value={p.estado} onChange={e=>updatePartida(p.id,"estado",e.target.value)}
                              style={{ width:"100%", padding:"5px 8px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:12 }}>
                              {["No iniciada","En progreso","Terminada"].map(s=><option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize:10, fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>DESCRIPCIÓN GENERADA</label>
                            <textarea value={p.descripcion||generarDescripcion(p.partida,p.pct,p.estado)}
                              onChange={e=>updatePartida(p.id,"descripcion",e.target.value)} rows={2}
                              style={{ width:"100%", padding:"5px 8px", border:"1px solid #e2e8f0",
                                borderRadius:6, fontSize:11, resize:"vertical", fontFamily:"inherit",
                                color:"#374151", boxSizing:"border-box" }}/>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PASO 3 — Vista previa */}
          {paso===3&&(
            <div>
              <div style={{ background:"#eef2ff", border:"1px solid #bbf7d0", borderRadius:12, padding:20, marginBottom:16 }}>
                <h3 style={{ margin:"0 0 12px", fontSize:15, color:"#4338ca" }}>
                  Informe {tipo} — {obra?.nombre}
                </h3>
                {desde&&hasta&&<p style={{ fontSize:12, color:"#64748b", margin:"0 0 8px" }}>Período: {desde} al {hasta}</p>}
                {observGeneral&&<p style={{ fontSize:13, color:"#374151", margin:"0 0 12px", fontStyle:"italic" }}>"{observGeneral}"</p>}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[
                    ["Contratista", obra?.contratista||"—"],
                    ["Inspector", obra?.inspector_fiscal||"—"],
                    ["Monto Contrato", fmtP(obra?.monto_contrato||totalContrato)],
                    ["Partidas incluidas", partidasInforme.filter(p=>p.incluir).length+" de "+partidasInforme.length],
                  ].map(([k,v])=>(
                    <div key={k} style={{ background:"#fff", borderRadius:8, padding:"8px 12px" }}>
                      <span style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>{k}</span>
                      <p style={{ margin:"2px 0 0", fontSize:13, fontWeight:700, color:"#1e293b" }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {partidasInforme.filter(p=>p.incluir).map(p=>(
                  <div key={p.id} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:"#1e293b" }}>{p.item} — {p.partida}</span>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ fontSize:11, fontWeight:700,
                          color: p.estado==="Terminada"?"#6366f1":p.estado==="En progreso"?"#d97706":"#94a3b8" }}>
                          {p.estado}
                        </span>
                        <span style={{ fontSize:12, fontWeight:800, color:"#1e293b" }}>{p.pct}%</span>
                      </div>
                    </div>
                    <p style={{ fontSize:11, color:"#64748b", margin:0, lineHeight:1.5 }}>
                      {p.descripcion||generarDescripcion(p.partida,p.pct,p.estado)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:"1px solid #e2e8f0",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          background:"#f8fafc", borderRadius:"0 0 18px 18px" }}>
          <button onClick={paso===1?onClose:()=>setPaso(p=>p-1)}
            style={{ background:"#f1f5f9", color:"#64748b", border:"none", borderRadius:10,
              padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            {paso===1?"Cancelar":"← Atrás"}
          </button>
          {paso<3?(
            <button onClick={()=>setPaso(p=>p+1)}
              style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:10,
                padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              Siguiente →
            </button>
          ):(
            <button onClick={handleSave} disabled={saving}
              style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:10,
                padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer",
                opacity: saving?0.7:1 }}>
              {saving?"Guardando…":"💾 Guardar Informe"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal Modificación de Contrato ────────────────────────────────────────
function ModalModificacion({ obraId, onClose, onSave }) {
  const TIPOS = ["Aumento de Obras","Disminución de Obras","Ampliación de Plazo","Mixta"];
  const [tipo, setTipo] = useState("Aumento de Obras");
  const [numero, setNumero] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [dias, setDias] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0,10));
  const [decreto, setDecreto] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const montoNum = parseFloat(String(monto).replace(/\./g,"").replace(",",".")) || 0;
    const diasNum = parseInt(dias) || 0;
    const { data } = await supabase.from("obra_modificaciones").insert([{
      obra_id: obraId,
      numero: parseInt(numero) || null,
      tipo, descripcion,
      monto_modificacion: tipo === "Disminución de Obras" ? -Math.abs(montoNum) : montoNum,
      dias_adicionales: diasNum,
      fecha: fecha || null,
      decreto,
    }]).select().single();
    if (data) onSave(data);
    setSaving(false);
  };

  const showMonto = tipo !== "Ampliación de Plazo";
  const showDias  = tipo === "Ampliación de Plazo" || tipo === "Mixta";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:520,
        boxShadow:"0 24px 60px rgba(0,0,0,.2)" }}>
        <div style={{ padding:"18px 24px", borderBottom:"1px solid #e2e8f0",
          background:"linear-gradient(135deg,#1e40af,#3b82f6)", borderRadius:"18px 18px 0 0",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h2 style={{ color:"#fff", margin:0, fontSize:15, fontWeight:800 }}>📝 Nueva Modificación</h2>
            <p style={{ color:"#bfdbfe", margin:"2px 0 0", fontSize:12 }}>Modificación de contrato</p>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none",
            color:"#fff", borderRadius:8, padding:"6px 12px", cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>TIPO</label>
              <select value={tipo} onChange={e=>setTipo(e.target.value)}
                style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13 }}>
                {TIPOS.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>N° MODIFICACIÓN</label>
              <input type="number" value={numero} onChange={e=>setNumero(e.target.value)} placeholder="1"
                style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, boxSizing:"border-box" }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>DESCRIPCIÓN</label>
            <textarea value={descripcion} onChange={e=>setDescripcion(e.target.value)} rows={2}
              placeholder="Descripción de la modificación..."
              style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8,
                fontSize:13, resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" }}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns: showMonto && showDias ? "1fr 1fr" : "1fr", gap:12 }}>
            {showMonto && (
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>
                  MONTO {tipo==="Disminución de Obras"?"(−)":"(+)"}
                </label>
                <input type="text" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0"
                  style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8,
                    fontSize:13, boxSizing:"border-box",
                    borderColor: tipo==="Disminución de Obras"?"#fca5a5":"#bbf7d0" }}/>
              </div>
            )}
            {showDias && (
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>DÍAS ADICIONALES</label>
                <input type="number" value={dias} onChange={e=>setDias(e.target.value)} placeholder="0"
                  style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, boxSizing:"border-box" }}/>
              </div>
            )}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>FECHA</label>
              <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)}
                style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, boxSizing:"border-box" }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>DECRETO / RESOLUCIÓN</label>
              <input type="text" value={decreto} onChange={e=>setDecreto(e.target.value)} placeholder="Nº decreto..."
                style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, boxSizing:"border-box" }}/>
            </div>
          </div>
        </div>
        <div style={{ padding:"14px 24px", borderTop:"1px solid #e2e8f0", display:"flex",
          justifyContent:"flex-end", gap:10, background:"#f8fafc", borderRadius:"0 0 18px 18px" }}>
          <button onClick={onClose} style={{ background:"#f1f5f9", color:"#64748b", border:"none",
            borderRadius:10, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{ background:"#3b82f6", color:"#fff", border:"none", borderRadius:10,
              padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer", opacity:saving?.7:1 }}>
            {saving?"Guardando…":"Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Recepción ───────────────────────────────────────────────────────
function ModalRecepcion({ obraId, onClose, onSave }) {
  const TIPOS   = ["Provisoria","Definitiva"];
  const ESTADOS = ["Solicitada","Realizada","Con observaciones","Rechazada"];
  const [tipo,         setTipo]         = useState("Provisoria");
  const [estado,       setEstado]       = useState("Solicitada");
  const [fechaSol,     setFechaSol]     = useState(new Date().toISOString().slice(0,10));
  const [fechaRec,     setFechaRec]     = useState("");
  const [inspector,    setInspector]    = useState("");
  const [observ,       setObserv]       = useState("");
  const [saving,       setSaving]       = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { data } = await supabase.from("obra_recepciones").insert([{
      obra_id: obraId, tipo, estado,
      fecha_solicitud: fechaSol || null,
      fecha_recepcion: fechaRec || null,
      inspector, observaciones: observ,
    }]).select().single();
    if (data) onSave(data);
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:500,
        boxShadow:"0 24px 60px rgba(0,0,0,.2)" }}>
        <div style={{ padding:"18px 24px", borderBottom:"1px solid #e2e8f0",
          background:"linear-gradient(135deg,#4338ca,#6366f1)", borderRadius:"18px 18px 0 0",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h2 style={{ color:"#fff", margin:0, fontSize:15, fontWeight:800 }}>🏁 Nueva Recepción</h2>
            <p style={{ color:"#a7f3d0", margin:"2px 0 0", fontSize:12 }}>Recepción de obra</p>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none",
            color:"#fff", borderRadius:8, padding:"6px 12px", cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>TIPO</label>
              <div style={{ display:"flex", gap:8 }}>
                {TIPOS.map(t=>(
                  <button key={t} onClick={()=>setTipo(t)}
                    style={{ flex:1, padding:"8px", border:`2px solid ${tipo===t?"#6366f1":"#e2e8f0"}`,
                      borderRadius:8, background: tipo===t?"#eef2ff":"#fff",
                      color: tipo===t?"#4338ca":"#64748b", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>ESTADO</label>
              <select value={estado} onChange={e=>setEstado(e.target.value)}
                style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13 }}>
                {ESTADOS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>FECHA SOLICITUD</label>
              <input type="date" value={fechaSol} onChange={e=>setFechaSol(e.target.value)}
                style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, boxSizing:"border-box" }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>FECHA RECEPCIÓN</label>
              <input type="date" value={fechaRec} onChange={e=>setFechaRec(e.target.value)}
                style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, boxSizing:"border-box" }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>INSPECTOR</label>
            <input type="text" value={inspector} onChange={e=>setInspector(e.target.value)} placeholder="Nombre del inspector..."
              style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:13, boxSizing:"border-box" }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>OBSERVACIONES</label>
            <textarea value={observ} onChange={e=>setObserv(e.target.value)} rows={3}
              placeholder="Observaciones de la recepción..."
              style={{ width:"100%", padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:8,
                fontSize:13, resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" }}/>
          </div>
        </div>
        <div style={{ padding:"14px 24px", borderTop:"1px solid #e2e8f0", display:"flex",
          justifyContent:"flex-end", gap:10, background:"#f8fafc", borderRadius:"0 0 18px 18px" }}>
          <button onClick={onClose} style={{ background:"#f1f5f9", color:"#64748b", border:"none",
            borderRadius:10, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:10,
              padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer", opacity:saving?.7:1 }}>
            {saving?"Guardando…":"Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ObraDetail() {
  const router   = useRouter();
  const params   = useSearchParams();
  const obraId   = params.get("id");

  const [obra,      setObra]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("resumen");
  const [catActiva, setCatActiva] = useState(null);
  const [docsOpen,  setDocsOpen]  = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk,setGuardadoOk]=useState(false);
  const [userId,    setUserId]    = useState(null);

  const [docs,      setDocs]      = useState([]);
  const [pagos,     setPagos]     = useState([]);
  const [garantias, setGarantias] = useState([]);
  const [bitacora,  setBitacora]  = useState([]);
  const [fotos,     setFotos]     = useState([]);
  const [presupuesto, setPresupuesto] = useState([]);
  const [editingCell, setEditingCell] = useState(null); // {id, field}

  const [mDoc, setMDoc]   = useState(false);
  const [mPago,setMPago]  = useState(false);
  const [mGar, setMGar]   = useState(false);
  const [mBit, setMBit]   = useState(false);
  const [informes, setInformes] = useState([]);
  const [modificaciones, setModificaciones] = useState([]);
  const [recepciones,    setRecepciones]    = useState([]);
  const [mMod,  setMMod]  = useState(false);
  const [mRec,  setMRec]  = useState(false);
  const [mInforme, setMInforme] = useState(false);
  const [previsualizando, setPrevisualizando] = useState(null); // informe en preview
  const [mFoto,setMFoto]  = useState(false);
  const [mPresupuesto, setMPresupuesto] = useState(false);
  const [mEPGenerator, setMEPGenerator] = useState(false);
  const [mComparador, setMComparador] = useState(false);
  const [mMedidor, setMMedidor] = useState(false);
  const [lightbox,setLb]  = useState(null);
  const [docSelec,setDocSelec]=useState(null);  // documento seleccionado para previsualización
  const [anexos,setAnexos]=useState({});  // { bitacora_id: [anexos] }
  const [expandedAnexo,setExpandedAnexo]=useState(null);  // bitacora_id expandido para mostrar preview adjuntos
  const [calMes,setCalMes]=useState(()=>{ const d=new Date(); return {y:d.getFullYear(),m:d.getMonth()}; });
  const [filtroFecha,setFiltroFecha]=useState(null);
  const [presupuestoOpen,setPresupuestoOpen]=useState(false);  // desplegable presupuesto en resumen

  useInactividad(supabase, router, 10);

  useEffect(() => {
    if (!obraId) { router.push("/obras"); return; }
    supabase.auth.getUser().then(async ({ data:{ user } }) => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const [oR, dR, pR, gR, bR, fR, aR, presR] = await Promise.allSettled([
        supabase.from("obras").select("*").eq("id", obraId).single(),
        supabase.from("obra_documentos").select("*").eq("obra_id", obraId).order("created_at",{ascending:false}),
        supabase.from("obra_estados_pago").select("*").eq("obra_id", obraId).order("fecha",{ascending:false}),
        supabase.from("obra_garantias").select("*").eq("obra_id", obraId).order("fecha_vencimiento"),
        supabase.from("obra_bitacora").select("*").eq("obra_id", obraId).order("fecha",{ascending:false}),
        supabase.from("obra_fotos").select("*").eq("obra_id", obraId).order("created_at",{ascending:false}),
        supabase.from("obra_bitacora_anexos").select("*"),
        supabase.from("obra_presupuesto").select("*").eq("obra_id", obraId).order("orden"),
      ]).then(rs => rs.map(r => r.status === "fulfilled" ? r.value : { data: null, error: r.reason }));
      if (oR.data) setObra(oR.data);
      setDocs(dR.data||[]); setPagos(pR.data||[]); setGarantias(gR.data||[]);
      setBitacora(bR.data||[]); setFotos(fR.data||[]); setPresupuesto(presR.data||[]);
      const iR = await supabase.from("obra_informes").select("*").eq("obra_id", obraId).order("created_at",{ascending:false});
      setInformes(iR.data || []);
      const modR = await supabase.from("obra_modificaciones").select("*").eq("obra_id", obraId).order("fecha",{ascending:true});
      setModificaciones(modR.data || []);
      const recR = await supabase.from("obra_recepciones").select("*").eq("obra_id", obraId).order("created_at",{ascending:false});
      setRecepciones(recR.data || []);
      // Agrupar anexos por bitacora_id
      const anexosMap = {};
      (aR.data||[]).forEach(a=>{ if(!anexosMap[a.bitacora_id]) anexosMap[a.bitacora_id]=[]; anexosMap[a.bitacora_id].push(a); });
      setAnexos(anexosMap);
      setLoading(false);
    });
  }, [obraId]);

  const setField = (k,v) => setObra(o=>({...o,[k]:v}));
  const guardar  = async () => {
    if (!obra) return;
    setGuardando(true);
    // Campos explícitos — evita sobreescribir columnas del sistema (id, created_at, user_id)
    const { nombre, estado_obra, region, mandante, unidad_tecnica, ito, contratista,
      rut_contratista, numero_decreto, fecha_decreto, numero_contrato, fecha_contrato,
      fecha_inicio, plazo_dias, fecha_termino_contractual, monto_contrato, presupuesto_oficial,
      ubicacion, descripcion, estado } = obra;
    await supabase.from("obras").update({
      nombre, estado_obra, region, mandante, unidad_tecnica, ito, contratista,
      rut_contratista, numero_decreto, fecha_decreto, numero_contrato, fecha_contrato,
      fecha_inicio, plazo_dias, fecha_termino_contractual, monto_contrato, presupuesto_oficial,
      ubicacion, descripcion, estado,
      updated_at: new Date().toISOString(),
    }).eq("id", obraId).eq("user_id", userId);
    setGuardando(false); setGuardadoOk(true);
    setTimeout(()=>setGuardadoOk(false),2000);
  };
  const delDoc  = async id => { await supabase.from("obra_documentos").delete().eq("id",id).eq("obra_id",obraId);   setDocs(p=>p.filter(x=>x.id!==id)); };
  const delPago = async id => { await supabase.from("obra_estados_pago").delete().eq("id",id).eq("obra_id",obraId); setPagos(p=>p.filter(x=>x.id!==id)); };
  const delGar  = async id => { await supabase.from("obra_garantias").delete().eq("id",id).eq("obra_id",obraId);    setGarantias(p=>p.filter(x=>x.id!==id)); };
  const delBit  = async id => { await supabase.from("obra_bitacora").delete().eq("id",id).eq("obra_id",obraId);     setBitacora(p=>p.filter(x=>x.id!==id)); };
  const delFoto = async id => { await supabase.from("obra_fotos").delete().eq("id",id).eq("obra_id",obraId);        setFotos(p=>p.filter(x=>x.id!==id)); };
  const delPresupuesto = async id => { await supabase.from("obra_presupuesto").delete().eq("id",id).eq("obra_id",obraId); setPresupuesto(p=>p.filter(x=>x.id!==id)); };
  const updatePresupuesto = async (id, field, rawVal) => {
    const num = parseFloat(String(rawVal).replace(/\./g,"").replace(",",".")) || 0;
    // Recalcular valor_total si cambia cantidad o valor_unitario
    const updated = presupuesto.map(p => {
      if (p.id !== id) return p;
      const next = { ...p, [field]: num };
      if (field === "cantidad" || field === "valor_unitario") {
        next.valor_total = (next.cantidad || 0) * (next.valor_unitario || 0);
      }
      return next;
    });
    setPresupuesto(updated);
    setEditingCell(null);
    const item = updated.find(p => p.id === id);
    await supabase.from("obra_presupuesto").update({
      [field]: num,
      valor_total: item.valor_total,
    }).eq("id", id);
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", display:"flex", alignItems:"center",
      justifyContent:"center", color:"#94a3b8", fontFamily:"sans-serif" }}>Cargando...</div>
  );
  if (!obra) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
      <p>Obra no encontrada. <button onClick={()=>router.push("/obras")}
        style={{ color:"#6366f1", background:"none", border:"none", cursor:"pointer" }}>Volver</button></p>
    </div>
  );

  // Métricas
  const est          = ESTADO_ST[obra.estado_obra] || ESTADO_ST["En ejecución"];
  const totalPagado  = pagos.reduce((s,p)=>s+(p.monto||0),0);
  const montoContrato= obra.monto_contrato||0;
  const pctEjec      = montoContrato>0 ? (totalPagado/montoContrato)*100 : 0;
  const saldo        = montoContrato - totalPagado;
  const diasTotal    = obra.plazo_dias||0;
  const diasPasados  = obra.fecha_inicio ? Math.max(0,Math.ceil((new Date()-new Date(obra.fecha_inicio))/86400000)) : 0;
  const pctPlazo     = diasTotal>0 ? (diasPasados/diasTotal)*100 : 0;
  const garAlerta    = garantias.filter(g=>g.estado==="Vigente"&&g.fecha_vencimiento&&diasAl(g.fecha_vencimiento)<=30);

  // ── Generador de descripción por plantillas ─────────────────────────────
  function generarDescripcion(partida, pct, estado) {
    const n = (partida || "").toLowerCase();
    const p = Math.round(pct || 0);
    const fin = estado === "Terminada";
    const sufijo = fin
      ? " Los trabajos quedaron terminados y conformes a las especificaciones técnicas del proyecto."
      : ` Acumulando a la fecha un avance total de ${p}% respecto al total contratado. Trabajos en ejecución conforme a programa.`;
    // C — Hormigones (ONDAC: H5/H20/H25/H30, liviano, bombeado)
    if (n.includes("hormig")) {
      const dosif = n.match(/h\s?(\d+)/i) ? "H"+n.match(/h\s?(\d+)/i)[1] : n.match(/g\d+/i) ? n.match(/g\d+/i)[0].toUpperCase() : "";
      const esBombeado = n.includes("bombeado") || n.includes("bomba");
      const esLiviano = n.includes("liviano") || n.includes("celular");
      const tipoHorm = esBombeado ? " bombeado (dosificación mín. 340 kg cemento/m³)" : esLiviano ? " liviano (densidad aprox. 1.200 kg/m³)" : dosif ? ` ${dosif}` : "";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutaron la totalidad de los trabajos de instalación de moldajes, habilitación de enfierraduras y vaciado de hormigón${tipoHorm}. Se verificó vibrado, curado húmedo mínimo 7 días y conformidad geométrica según NCh170. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la partida ${partida}. Se realizaron trabajos de instalación de moldajes, colocación de armadura y vaciado de hormigón${tipoHorm}. Se controló consistencia mediante cono de Abrams y se ejecutó vibrado y curado correspondiente.${sufijo}`;
    }
    // E — Enfierraduras (ONDAC: D10–D25, mallas electrosoldadas)
    if (n.includes("enfierr") || n.includes("armadur") || n.includes("fierro") || n.includes("malla electro")) {
      const diam = n.match(/d\s?(\d+)/i) ? "D"+n.match(/d\s?(\d+)/i)[1] : "";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se habilitó y colocó la totalidad de la armadura${diam?" "+diam:""} según planos estructurales, incluyendo corte, doblado, amarre con alambre recocido y verificación de recubrimientos mínimos conforme a NCh429. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la partida ${partida}. Se ejecutó corte, doblado y colocación de ${diam?"enfierradura "+diam:"armaduras"} en la zona indicada, verificando recubrimientos y traslapes según especificaciones.${sufijo}`;
    }
    // D — Moldajes y andamios (ONDAC: losa, muro, fundación, pilar)
    if (n.includes("moldaje") || n.includes("encofr") || n.includes("andamio")) {
      const tm = n.includes("losa") ? "losa" : n.includes("muro") ? "muro" : n.includes("pilar") ? "pilar" : n.includes("fundaci") ? "fundación" : "elemento estructural";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló, aplomó y arriostró la totalidad de los moldajes de ${tm}, con posterior desencofrado en los plazos de fraguado requeridos según NCh170. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutó montaje y arriostramiento de moldajes de ${tm} en el área indicada, verificando verticalidad, planeidad y estanqueidad previo al vaciado.${sufijo}`;
    }
    // B — Excavaciones (ONDAC: brazo/máquina, terreno blando/semiduro/duro/roca)
    if (n.includes("excav") || n.includes("movim") || n.includes("escarpe")) {
      const conMaq = n.includes("máquina") || n.includes("retroexcavad") || n.includes("maquina");
      const terreno = n.includes("roca") ? "roca" : n.includes("duro") ? "terreno duro" : n.includes("semiduro") ? "terreno semiduro" : "terreno normal";
      return fin
        ? `Se completó el 100% de los trabajos de ${partida}. Se ejecutó la excavación en ${terreno} mediante ${conMaq?"maquinaria pesada (retroexcavadora)":"medios manuales y mecánicos"}, con perfilado de taludes y disposición del material en botadero autorizado. Se verificó cota de fundación según planos. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó la excavación en ${terreno} con retiro y traslado del material al botadero designado. Se verificó la cota de fundación según proyecto.${sufijo}`;
    }
    // B — Rellenos y compactación (Proctor, capas 20 cm)
    if (n.includes("rellen") || n.includes("compac")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutó el relleno y compactación en capas de 20 cm, controladas mediante ensayes de densidad in situ (Proctor modificado), alcanzando la densidad mínima requerida. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la partida ${partida}. Se colocó material de relleno por capas de 20 cm y se compactó con equipo vibratorio, verificando densidad mediante ensayes en terreno.${sufijo}`;
    }
    // F — Albañilería (ONDAC: fiscal/gran titán/super flaco, mortero 1:5)
    if (n.includes("albañil") || n.includes("mamposter") || n.includes("ladrillo") || n.includes("bloque")) {
      const tb = n.includes("fiscal") ? "ladrillo fiscal" : n.includes("gran tit") ? "bloque gran titán" : n.includes("super flaco") ? "bloque super flaco" : n.includes("bloque") ? "bloque de hormigón" : "ladrillo";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutó la totalidad de la mampostería de ${tb} con mortero cemento-arena dosificación 1:5, aplomado, nivelación y sellado de juntas según planos. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó colocación de ${tb} con mortero 1:5, controlando aplome, escuadra y geometría de vanos en el área indicada.${sufijo}`;
    }
    // K — Estucos (ONDAC: exterior 340 kg/m², interior, 2-3 manos)
    if (n.includes("estuco") || n.includes("revoque") || n.includes("empaste")) {
      const esExt = n.includes("exter") || n.includes("fachada");
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se aplicó el estuco ${esExt?"exterior (dosificación 340 kg cemento/m²)":"interior"} en 2-3 manos, previa limpieza y humedecimiento de base, terminando con llana metálica. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la aplicación de ${partida}. Se ejecutó el estuco ${esExt?"exterior (340 kg cemento/m²)":"interior"} en capas sucesivas con llana, verificando planeidad y aplome.${sufijo}`;
    }
    // K — Pinturas (ONDAC: látex/esmalte/anticorrosivo, imprimación + 2 manos)
    if (n.includes("pintur") || n.includes("látex") || n.includes("latex") || n.includes("esmalte") || n.includes("revestim")) {
      const tp = n.includes("esmalte") ? "esmalte alkídico" : n.includes("metal") || n.includes("estructura") ? "anticorrosivo + esmalte para estructura metálica" : "látex acrílico";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó preparación de superficies (lijado, masillado y limpieza) y aplicación de 1 mano de imprimación + 2 manos de ${tp}. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la aplicación de ${partida}. Se prepararon las superficies y se aplicaron las manos de ${tp} en el área intervenida, verificando uniformidad y adherencia.${sufijo}`;
    }
    // H — Tabiques (ONDAC: volcametal PL10/PL15, húmedo/seco, montantes 60 cm)
    if (n.includes("tabique") || n.includes("volcametal") || n.includes("drywall") || n.includes("metalcon")) {
      const thum = n.includes("húmedo") || n.includes("humedo") ? " área húmeda (PL15, e=15 mm)" : n.includes("seco") ? " área seca (PL10, e=10 mm)" : "";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló la totalidad de los tabiques de estructura metálica (volcametal)${thum?", tipo"+thum:""}, con soleras, montantes a 60 cm, placa por cara y sellado de juntas. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutó trazado, soleras, montantes y placas de yeso-cartón${thum?" "+thum:""} en el área indicada.${sufijo}`;
    }
    // I — Cubierta (ONDAC: cerchas, correas, plancha, traslape mínimo)
    if (n.includes("cubierta") || n.includes("techo") || n.includes("teja") || n.includes("zinc") || n.includes("plancha")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló la totalidad de la cubierta incluyendo cerchas, correas, aislación, planchas con traslape mínimo reglamentario, canaletas y bajadas de aguas lluvias. Se verificó hermeticidad. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó instalación de estructura de soporte y planchas en el área indicada, asegurando fijación, traslape y pendiente según proyecto.${sufijo}`;
    }
    // J — Cielos y aislaciones (ONDAC: perfiles T, canales, paneles)
    if (n.includes("cielo") || n.includes("plafón") || n.includes("plafon") || n.includes("aislaci")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló la totalidad de la estructura metálica de soporte (perfiles T y canales), paneles de cielo y terminaciones de borde. Se verificó nivelación y ausencia de deflexiones. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutó la estructura de soporte y fijación de paneles en el área intervenida, verificando nivelación y planeidad.${sufijo}`;
    }
    // L — Pisos (ONDAC: flotante clic, cerámico, porcelanato, mortero autonivelante)
    if (n.includes("piso") || n.includes("pavim") || n.includes("cerám") || n.includes("porcelan")) {
      const tpiso = n.includes("flotante") ? "piso flotante (sistema clic)" : n.includes("porcelan") ? "porcelanato" : n.includes("cerám") ? "cerámico" : "pavimento";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutó preparación de base con mortero autonivelante, aplicación de adhesivo, colocación de ${tpiso} con crucetas, fraguado de juntas y remates de borde. Tolerancia ±3 mm/2 m verificada. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la colocación de ${partida}. Se preparó la base, se aplicó adhesivo y se instaló ${tpiso} en el área indicada, verificando planeidad y alineamiento de juntas.${sufijo}`;
    }
    // M — Carpintería (ONDAC: tacos expansivos, silicona neutra, prueba funcionamiento)
    if (n.includes("ventana") || n.includes("puerta") || n.includes("carpint") || n.includes("marco") || n.includes("cancel")) {
      const tcarpt = n.includes("ventana") ? "ventanas" : n.includes("puerta") ? "puertas" : "elementos de carpintería";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló la totalidad de ${tcarpt}, incluyendo colocación en vano, aplomado, fijación con tacos expansivos, sellado perimetral con silicona neutra y prueba de funcionamiento. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se colocaron, aplomaron y fijaron ${tcarpt} en los vanos indicados, ejecutando sellado perimetral y prueba de funcionamiento.${sufijo}`;
    }
    // C/R — Fundaciones, radier y losas
    if (n.includes("fundaci") || n.includes("zapata") || n.includes("radier") || n.includes("losa")) {
      const tf = n.includes("radier") ? "radier" : n.includes("losa") ? "losa" : n.includes("zapata") ? "zapatas" : "fundaciones";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutaron trabajos de excavación, preparación de subrasante, habilitación de enfierraduras y vaciado de hormigón para ${tf}. Curado húmedo mínimo 7 días y verificación de cotas según planos. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutaron habilitación de enfierraduras, instalación de moldajes y vaciado de hormigón en los ${tf} correspondientes.${sufijo}`;
    }
    // P — Instalaciones eléctricas (SEC: ductos conduit, THHN, tableros)
    if (n.includes("eléctri") || n.includes("electric") || n.includes("alumbr") || n.includes("luminaria") || n.includes("tablero")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó tendido de ductos conduit, cableado con conductores THHN, conexionado de tableros y puntos de luz/fuerza, y pruebas eléctricas conforme a NSEG 5 E.n.71 (SEC). Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutó tendido de ductos, cableado, fijación de cajas y conexionado parcial de tableros y puntos de luz/fuerza.${sufijo}`;
    }
    // P — Instalaciones sanitarias (NCh1105, PVC/HDPE, prueba presión)
    if (n.includes("agua") || n.includes("sanitari") || n.includes("cañer") || n.includes("alcan")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó tendido de tuberías PVC/HDPE, piezas especiales, prueba de presión hidrostática y desinfección de la red conforme a NCh1105 y normativa SISS. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en las obras de ${partida}. Se instalaron tuberías, piezas especiales y uniones, con pruebas parciales de hermeticidad en tramos terminados.${sufijo}`;
    }
    // V — Demolición y retiro (ONDAC: carga, transporte, botadero autorizado)
    if (n.includes("demolici") || n.includes("retiro") || n.includes("desmonte")) {
      return fin
        ? `Se completó el 100% de los trabajos de ${partida}. Se procedió al retiro controlado de los elementos indicados, carga en camión y disposición del escombro en botadero autorizado. Limpieza final del área ejecutada. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó el retiro y carga del material, transportándolo al botadero autorizado conforme a normativa de residuos de construcción.${sufijo}`;
    }
    // Aseo y limpieza
    if (n.includes("aseo") || n.includes("limpieza")) {
      return fin
        ? `Se completó el 100% de las labores de ${partida}. Se realizó limpieza general de la obra, retiro de escombros y materiales sobrantes, dejando el área en condiciones de entrega conforme a las bases del contrato. Partida finalizada.`
        : `Durante el período se ejecutaron labores de ${partida} en el área intervenida, retirando escombros y materiales sobrantes acumulados, manteniendo el orden y aseo de la faena.${sufijo}`;
    }
    // Fallback genérico ONDAC
    return fin
      ? `Se completó el 100% de la partida "${partida}". Se ejecutaron la totalidad de los trabajos indicados en las especificaciones técnicas del proyecto, verificándose la correcta ejecución conforme a planos, normativa vigente y exigencias de la ITO. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida "${partida}". Se ejecutaron los trabajos correspondientes conforme a las especificaciones técnicas del proyecto, bajo supervisión de la Inspección Técnica de Obras (ITO).${sufijo}`;
  }

  function generarHtmlInforme(inf) {
    const d = inf.datos_json || {};
    const todasPartidas = inf.partidas_json || [];
    // Filtrar solo partidas con avance > 0
    const partidas = todasPartidas.filter(p => (p.pct || 0) > 0);
    const fmtP = n => n ? "$"+Math.round(n).toLocaleString("es-CL") : "—";
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe ${inf.tipo} — ${d.obra_nombre||""}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#333;font-size:13px;}
  h1{color:#4338ca;font-size:20px;margin-bottom:4px;}
  h2{color:#4338ca;font-size:14px;border-bottom:2px solid #6366f1;padding-bottom:6px;margin:24px 0 12px;}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#eef2ff;padding:14px;border-radius:8px;margin-bottom:20px;}
  .meta-item label{font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;}
  .meta-item p{margin:2px 0 0;font-weight:700;font-size:13px;}
  .partida{border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px;page-break-inside:avoid;}
  .partida-header{display:flex;justify-content:space-between;margin-bottom:6px;}
  .partida-title{font-weight:700;font-size:13px;}
  .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;}
  .badge-terminada{background:#eef2ff;color:#4338ca;}
  .badge-progreso{background:#fef3c7;color:#92400e;}
  .badge-no{background:#f1f5f9;color:#64748b;}
  .desc{font-size:12px;color:#4b5563;line-height:1.6;margin:4px 0 0;}
  .progress{height:6px;background:#e2e8f0;border-radius:99px;margin:8px 0 4px;overflow:hidden;}
  .progress-bar{height:100%;border-radius:99px;}
  .footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px;color:#94a3b8;font-size:11px;text-align:center;}
  @media print{.partida{page-break-inside:avoid;}}
</style></head><body>
<h1>Informe ${inf.tipo} de Obra</h1>
<p style="color:#6b7280;margin:0 0 16px">${inf.periodo_desde||""} ${inf.periodo_hasta?"→ "+inf.periodo_hasta:""}</p>
<div class="meta">
  ${[["Nombre obra",d.obra_nombre||""],["Contratista",d.contratista||"—"],["Inspector Fiscal",d.inspector||"—"],["Región",d.region||"—"],["Monto Contrato",fmtP(d.monto_contrato)],["Último EP",d.ultimo_ep||"—"]].map(([l,v])=>`<div class="meta-item"><label>${l}</label><p>${v}</p></div>`).join("")}
</div>
${d.observacion_general?`<h2>Observación General</h2><p style="font-style:italic;color:#374151">"${d.observacion_general}"</p>`:""}
<h2>Avance por Partidas ${partidas.length < todasPartidas.length ? `(${partidas.length} con avance de ${todasPartidas.length} total)` : ""}</h2>
${partidas.length === 0 ? '<p style="color:#94a3b8;font-style:italic;">Sin partidas con avance registrado en este período.</p>' : ""}
${partidas.map(p=>`
<div class="partida">
  <div class="partida-header">
    <span class="partida-title">${p.item||""} ${p.partida||""}</span>
    <div style="display:flex;gap:8px;align-items:center">
      <span class="badge ${p.estado==="Terminada"?"badge-terminada":p.estado==="En progreso"?"badge-progreso":"badge-no"}">${p.estado}</span>
      <span style="font-weight:800;font-size:14px">${p.pct||0}%</span>
    </div>
  </div>
  <div class="progress"><div class="progress-bar" style="width:${p.pct||0}%;background:${p.estado==="Terminada"?"#6366f1":p.estado==="En progreso"?"#f59e0b":"#94a3b8"}"></div></div>
  <p style="font-size:10px;color:#9ca3af;margin:0">${p.unidad||""} · ${fmtP(p.valor_total)}</p>
  <p class="desc">${p.descripcion||""}</p>
</div>`).join("")}
<div class="footer">Generado por APUdesk · ${new Date().toLocaleDateString("es-CL")}</div>
</body></html>`;
  }

  // ── Navegación agrupada ──
  const [seccionActiva, setSeccionActiva] = useState("resumen");
  const [subTab, setSubTab] = useState(null);

  const SECCIONES = [
    { id:"resumen",      label:"Resumen",       iconName:"LayoutDashboard" },
    { id:"documentos",   label:"Documentos",    iconName:"FolderOpen" },
    { id:"financiero",   label:"Financiero",    iconName:"CircleDollarSign" },
    { id:"planificacion",label:"Planificación", iconName:"CalendarRange" },
  ];

  const SUB_TABS = {
    documentos: [
      { id:"ficha",          label:"Ficha técnica",  iconName:"FileText" },
      { id:"docs",           label:"Archivos",       iconName:"FolderOpen", badge:docs.length },
      { id:"bitacora",       label:"Bitácora",       iconName:"BookOpen" },
      { id:"informes",       label:"Informes",       iconName:"ClipboardList" },
      { id:"modificaciones", label:"Modificaciones", iconName:"FilePen" },
      { id:"recepciones",    label:"Recepciones",    iconName:"CheckCircle" },
      { id:"fotos",          label:"Fotos",          iconName:"Camera", badge:fotos.length },
    ],
    financiero: [
      { id:"presupuesto", label:"Presupuesto",     iconName:"Receipt", badge:presupuesto.length },
      { id:"pagos",       label:"Estados de Pago",  iconName:"Banknote" },
      { id:"garantias",   label:"Garantías",        iconName:"ShieldCheck" },
      { id:"costos",      label:"Control Costos",   iconName:"TrendingUp" },
      { id:"flujo",       label:"Flujo de Caja",    iconName:"ArrowLeftRight" },
    ],
    planificacion: [
      { id:"gantt",     label:"Carta Gantt",   iconName:"GanttChart" },
      { id:"recursos",  label:"Recursos",      iconName:"HardHat" },
    ],
  };

  const handleSeccion = (secId) => {
    setSeccionActiva(secId);
    if (secId === "resumen") { setTab("resumen"); setSubTab(null); }
    else {
      const subs = SUB_TABS[secId];
      if (subs?.length) { setTab(subs[0].id); setSubTab(subs[0].id); }
    }
  };

  const handleSubTab = (subId) => {
    setSubTab(subId);
    setTab(subId);
    if (subId === "docs") { setDocsOpen(false); setCatActiva(null); }
  };

  // Legacy NAV for mobile (kept for backward compat)
  const NAV = [
    { id:"resumen",   icon:"", label:"Resumen"         },
    { id:"ficha",     icon:"", label:"Ficha"            },
    { id:"docs",      icon:"", label:"Archivos", sub:true },
    { id:"pagos",     icon:"", label:"EP" },
    { id:"garantias", icon:"", label:"Garantías"        },
    { id:"bitacora",  icon:"", label:"Bitácora"         },
    { id:"informes",  icon:"", label:"Informes"         },
    { id:"modificaciones", icon:"", label:"Modif." },
    { id:"recepciones",    icon:"", label:"Recep."    },
    { id:"fotos",     icon:"", label:"Fotos", badge:fotos.length },
    { id:"presupuesto", icon:"", label:"Presup.", badge:presupuesto.length },
    { id:"gantt",        icon:"", label:"Gantt" },
    { id:"costos",       icon:"", label:"Costos" },
    { id:"flujo",        icon:"", label:"Flujo" },
    { id:"recursos",     icon:"", label:"Recursos" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"sans-serif", display:"flex", flexDirection:"column" }}>

      {/* Top bar */}
      <div style={{ background:"linear-gradient(135deg,#4338ca,#6366f1)", padding:"10px 20px",
        display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <button onClick={()=>router.push("/obras")}
          style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:8,
            padding:"5px 12px", color:"#fff", fontSize:12, cursor:"pointer" }}>
          ← Obras
        </button>
        <span style={{ color:"rgba(255,255,255,.4)" }}>·</span>
        <span style={{ background:est.bg, color:est.color, fontSize:10, fontWeight:700,
          padding:"2px 8px", borderRadius:99 }}>{obra.estado_obra}</span>
        <span style={{ color:"#fff", fontSize:13, fontWeight:700, flex:1,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{obra.nombre}</span>
        {garAlerta.length>0 && (
          <span onClick={()=>setTab("garantias")}
            style={{ background:"#fee2e2", color:"#991b1b", fontSize:11, fontWeight:700,
              padding:"3px 10px", borderRadius:99, cursor:"pointer", whiteSpace:"nowrap" }}>
            ⚠️ {garAlerta.length} garantía{garAlerta.length>1?"s":""} por vencer
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* SIDEBAR — Grouped navigation */}
        <div className="hidden md:flex" style={{ width:230, background:"#fff", borderRight:"1px solid #e2e8f0",
          flexDirection:"column", overflowY:"auto", flexShrink:0 }}>

          {/* Main sections */}
          <div style={{ padding:"14px 12px 8px" }}>
            <div style={{ display:"flex", gap:4 }}>
              {SECCIONES.map(sec => {
                const Icon = LUCIDE_ICONS[sec.iconName];
                const active = seccionActiva === sec.id;
                return (
                  <button key={sec.id} onClick={() => handleSeccion(sec.id)}
                    style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                      padding:"10px 4px", borderRadius:12, border:"none", cursor:"pointer",
                      fontFamily:"inherit", transition:"all .15s",
                      background: active ? "#4338ca" : "#f8fafc",
                      boxShadow: active ? "0 2px 12px rgba(67,56,202,.25)" : "none" }}>
                    {Icon && <Icon size={18} strokeWidth={active?2.2:1.6}
                      color={active?"#fff":"#94a3b8"} />}
                    <span style={{ fontSize:9, fontWeight:active?700:500,
                      color:active?"#fff":"#64748b", lineHeight:1.1, textAlign:"center" }}>
                      {sec.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-tabs for active section */}
          {SUB_TABS[seccionActiva] && (
            <div style={{ padding:"0 12px 12px", flex:1 }}>
              <div style={{ fontSize:9, fontWeight:700, color:"#94a3b8", textTransform:"uppercase",
                letterSpacing:".06em", padding:"6px 8px 6px", marginBottom:2 }}>
                {SECCIONES.find(s=>s.id===seccionActiva)?.label}
              </div>
              {SUB_TABS[seccionActiva].map(st => {
                const Icon = LUCIDE_ICONS[st.iconName];
                const active = tab === st.id;
                return (
                  <button key={st.id} onClick={() => handleSubTab(st.id)}
                    style={{ width:"100%", display:"flex", alignItems:"center", gap:10,
                      padding:"9px 12px", borderRadius:10, border:"none", cursor:"pointer",
                      fontFamily:"inherit", transition:"all .12s", marginBottom:2,
                      background: active ? "#eef2ff" : "transparent",
                      position:"relative" }}>
                    {Icon && <Icon size={16} strokeWidth={active?2:1.5}
                      color={active?"#4338ca":"#94a3b8"} />}
                    <span style={{ fontSize:12, fontWeight:active?650:450,
                      color: active?"#1e293b":"#64748b", flex:1, textAlign:"left" }}>
                      {st.label}
                    </span>
                    {st.badge>0 && (
                      <span style={{ background:active?"#4338ca":"#e2e8f0",
                        color:active?"#fff":"#64748b", fontSize:9, fontWeight:700,
                        padding:"1px 6px", borderRadius:99, minWidth:18, textAlign:"center" }}>
                        {st.badge}
                      </span>
                    )}
                    {active && <div style={{ position:"absolute", left:0, top:"20%", bottom:"20%",
                      width:3, borderRadius:2, background:"#4338ca" }}/>}
                  </button>
                );
              })}

              {/* Doc categories sub-list */}
              {seccionActiva==="documentos" && tab==="docs" && (
                <div style={{ marginTop:4, marginLeft:24, borderLeft:"1px solid #e2e8f0", paddingLeft:8 }}>
                  <button onClick={()=>setCatActiva(null)}
                    style={{ width:"100%", padding:"4px 8px", borderRadius:6, border:"none",
                      cursor:"pointer", fontSize:10, fontFamily:"inherit", textAlign:"left",
                      background:!catActiva?"#eef2ff":"transparent",
                      color:!catActiva?"#4338ca":"#94a3b8", fontWeight:!catActiva?700:400 }}>
                    Todas
                  </button>
                  {CATEGORIAS_DOCS.map(cat => {
                    const cnt = docs.filter(d=>d.categoria===cat).length;
                    const active = catActiva===cat;
                    return (
                      <button key={cat} onClick={()=>setCatActiva(cat)}
                        style={{ width:"100%", display:"flex", alignItems:"center", gap:4,
                          padding:"4px 8px", borderRadius:6, border:"none", cursor:"pointer",
                          background:active?"#eef2ff":"transparent",
                          color:active?"#4338ca":"#64748b",
                          fontSize:10, fontFamily:"inherit", textAlign:"left", fontWeight:active?600:400 }}>
                        <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cat}</span>
                        {cnt>0 && <span style={{ fontSize:8, color:"#94a3b8" }}>{cnt}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Save button for ficha */}
          {tab==="ficha" && (
            <div style={{ padding:"10px 12px", borderTop:"1px solid #f1f5f9" }}>
              <button onClick={guardar} disabled={guardando}
                style={{ width:"100%", background:guardadoOk?"#818cf8":"#4338ca",
                  color:"#fff", border:"none", borderRadius:10, padding:"10px",
                  fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"background .2s" }}>
                {guardando?"Guardando...":guardadoOk?"✓ Guardado":"Guardar ficha"}
              </button>
            </div>
          )}
        </div>

        {/* MOBILE NAV - grouped */}
        <div className="md:hidden" style={{ background:"#fff", borderBottom:"1px solid #e2e8f0",
          flexShrink:0 }}>
          {/* Main sections */}
          <div style={{ display:"flex", borderBottom:"1px solid #f1f5f9" }}>
            {SECCIONES.map(sec => {
              const Icon = LUCIDE_ICONS[sec.iconName];
              const active = seccionActiva === sec.id;
              return (
                <button key={sec.id} onClick={() => handleSeccion(sec.id)}
                  style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                    padding:"8px 4px", border:"none", cursor:"pointer", fontFamily:"inherit",
                    background: active ? "#eef2ff" : "transparent",
                    borderBottom: active ? "2px solid #4338ca" : "2px solid transparent" }}>
                  {Icon && <Icon size={16} strokeWidth={active?2.2:1.5}
                    color={active?"#4338ca":"#94a3b8"} />}
                  <span style={{ fontSize:9, fontWeight:active?700:500,
                    color:active?"#4338ca":"#64748b" }}>{sec.label}</span>
                </button>
              );
            })}
          </div>
          {/* Sub-tabs */}
          {SUB_TABS[seccionActiva] && (
            <div style={{ display:"flex", gap:2, overflowX:"auto", padding:"6px 8px" }}>
              {SUB_TABS[seccionActiva].map(st => {
                const active = tab === st.id;
                return (
                  <button key={st.id} onClick={() => handleSubTab(st.id)}
                    style={{ padding:"5px 10px", borderRadius:8, border:"none", cursor:"pointer",
                      fontSize:10, fontWeight:active?700:500, whiteSpace:"nowrap", fontFamily:"inherit",
                      background: active ? "#4338ca" : "#f1f5f9",
                      color: active ? "#fff" : "#64748b", flexShrink:0 }}>
                    {st.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CONTENIDO */}
        <div style={{ flex:1, overflowY:"auto", padding:"22px 26px" }}>

          {/* ═══ RESUMEN ═══ */}
          {tab==="resumen" && (
            <div>
              {fotos.length>0 && <FotoSlideshow fotos={fotos} onClickFoto={f=>setLb(f)}/>}

              <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:"0 0 16px" }}>Resumen Ejecutivo</h2>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
                <MetricCard title="Avance Financiero" main={`${pctEjec.toFixed(1)}%`}
                  sub={`${fmtPeso(totalPagado)} de ${fmtPeso(montoContrato)}`}
                  color="#6366f1" progress={pctEjec} progressColor="#6366f1"
                  empty={montoContrato===0} emptyMsg="Sin monto de contrato"/>
                <MetricCard title="Plazo Contractual" main={`${diasPasados}d`}
                  sub={`de ${diasTotal||"?"} días contractuales`}
                  color={pctPlazo>90?"#ef4444":pctPlazo>75?"#f59e0b":"#3b82f6"}
                  progress={pctPlazo} progressColor={pctPlazo>90?"#ef4444":pctPlazo>75?"#f59e0b":"#3b82f6"}
                  empty={!obra.fecha_inicio} emptyMsg="Sin fecha de inicio"/>
                <MetricCard title="Saldo Disponible" main={fmtPeso(saldo)}
                  sub={saldo<0?"⚠️ Monto excedido":montoContrato>0?`${(100-pctEjec).toFixed(1)}% restante`:""}
                  color={saldo<0?"#ef4444":"#6366f1"}
                  empty={montoContrato===0} emptyMsg="Sin monto de contrato"/>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <Section title="Datos clave"
                  action={<button onClick={()=>setTab("ficha")}
                    style={{ fontSize:11, color:"#6366f1", background:"none", border:"none",
                      cursor:"pointer", fontFamily:"inherit" }}>Editar →</button>}>
                  <div style={{ display:"grid", gap:7 }}>
                    {[["Mandante",obra.mandante],["ITO",obra.ito],["Contratista",obra.contratista],
                      ["Región",obra.region],["Inicio",fmtFecha(obra.fecha_inicio)],
                      ["Término",fmtFecha(obra.fecha_termino_contractual)],
                      ["N° Contrato",obra.numero_contrato],
                      ["Presupuesto",fmtPeso(obra.presupuesto_oficial)]].map(([k,v])=>v&&v!=="—"?(
                      <div key={k} style={{ display:"flex", gap:8 }}>
                        <span style={{ fontSize:11, color:"#94a3b8", minWidth:90 }}>{k}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:"#1e293b" }}>{v}</span>
                      </div>
                    ):null)}
                  </div>
                </Section>

                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <Section title="Bitácora reciente"
                    action={<button onClick={()=>setTab("bitacora")}
                      style={{ fontSize:11, color:"#6366f1", background:"none", border:"none",
                        cursor:"pointer", fontFamily:"inherit" }}>Ver todo</button>}>
                    {bitacora.length===0 ? <p style={{ fontSize:12, color:"#94a3b8", margin:0 }}>Sin registros aún</p> :
                      bitacora.slice(0,3).map(b => {
                        const tc=TIPO_BIT_COLOR[b.tipo]||TIPO_BIT_COLOR.Observación;
                        return (
                          <div key={b.id} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"flex-start" }}>
                            <span style={{ background:tc.bg, color:tc.color, fontSize:9, fontWeight:700,
                              padding:"2px 6px", borderRadius:99, flexShrink:0, marginTop:2 }}>{b.tipo}</span>
                            <div>
                              <p style={{ fontSize:12, color:"#374151", margin:0,
                                display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                                overflow:"hidden" }}>{b.descripcion}</p>
                              <span style={{ fontSize:10, color:"#94a3b8" }}>{fmtFecha(b.fecha)}</span>
                            </div>
                          </div>
                        );
                      })}
                  </Section>

                  {garantias.filter(g=>g.estado==="Vigente").length>0 && (
                    <Section title="Garantías vigentes"
                      action={<button onClick={()=>setTab("garantias")}
                        style={{ fontSize:11, color:"#6366f1", background:"none", border:"none",
                          cursor:"pointer", fontFamily:"inherit" }}>Ver todo</button>}>
                      {garantias.filter(g=>g.estado==="Vigente").slice(0,3).map(g=>(
                        <div key={g.id} style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"center", marginBottom:6 }}>
                          <span style={{ fontSize:12, color:"#374151" }}>{g.tipo}</span>
                          <SemaforoChip fecha={g.fecha_vencimiento}/>
                        </div>
                      ))}
                    </Section>
                  )}
                </div>
              </div>

              {presupuesto.length>0 && (
                <div style={{ background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:16,
                  overflow:"hidden", marginBottom:16 }}>
                  <button onClick={()=>setPresupuestoOpen(o=>!o)}
                    style={{ width:"100%", background:"none", border:"none", cursor:"pointer",
                      padding:"14px 20px", display:"flex", justifyContent:"space-between",
                      alignItems:"center", fontFamily:"inherit" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:"#64748b",
                        textTransform:"uppercase", letterSpacing:".05em" }}>💰 Presupuesto</span>
                      <span style={{ fontSize:11, color:"#94a3b8" }}>
                        {presupuesto.length} partidas · {fmtPeso(presupuesto.reduce((s,p)=>s+(p.valor_total||0),0))}
                      </span>
                    </div>
                    <span style={{ fontSize:12, color:"#6366f1" }}>{presupuestoOpen?"▲":"▼"}</span>
                  </button>
                  {presupuestoOpen&&(
                    <div style={{ borderTop:"1px solid #f1f5f9", maxHeight:340, overflowY:"auto" }}>
                      {[...new Set(presupuesto.map(p=>p.seccion))].map(sec=>{
                        const items=presupuesto.filter(p=>p.seccion===sec);
                        const subtotal=items.reduce((s,p)=>s+(p.valor_total||0),0);
                        return(
                          <div key={sec}>
                            <div style={{ padding:"8px 20px", background:"#f8fafc", fontSize:11,
                              fontWeight:700, color:"#475569", display:"flex",
                              justifyContent:"space-between" }}>
                              <span>{sec}</span>
                              <span>{fmtPeso(subtotal)}</span>
                            </div>
                            {items.map(p=>(
                              <div key={p.id} style={{ padding:"7px 20px", display:"flex",
                                justifyContent:"space-between", alignItems:"center",
                                borderBottom:"1px solid #f8fafc", fontSize:12 }}>
                                <span style={{ color:"#374151", flex:1, marginRight:12 }}>{p.item} · {p.partida}</span>
                                <span style={{ color:"#6366f1", fontWeight:600, whiteSpace:"nowrap" }}>
                                  {fmtPeso(p.valor_total)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      <div style={{ padding:"12px 20px", background:"#eef2ff", display:"flex",
                        justifyContent:"space-between", borderTop:"2px solid #bbf7d0" }}>
                        <span style={{ fontSize:13, fontWeight:700, color:"#4338ca" }}>COSTO DIRECTO</span>
                        <span style={{ fontSize:14, fontWeight:800, color:"#4338ca" }}>
                          {fmtPeso(presupuesto.reduce((s,p)=>s+(p.valor_total||0),0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Indicadores EVM ── */}
              {(pagos.length > 0 || presupuesto.length > 0) && (
                <div style={{ marginBottom: 16 }}>
                  <IndicadoresEVM
                    fechaInicio={obra.fecha_inicio}
                    fechaTermino={obra.fecha_termino_contractual}
                    montoContrato={montoContrato || presupuesto.reduce((s,p) => s + (p.valor_total||0), 0)}
                    pagos={pagos}
                    presupuesto={presupuesto}
                  />
                </div>
              )}

              {/* ── Curva S ── */}
              {(pagos.length > 0 || obra.fecha_inicio) && (
                <div style={{ marginBottom: 16 }}>
                  <Section title="📈 Curva S — Avance planificado vs real">
                    <CurvaS
                      fechaInicio={obra.fecha_inicio}
                      fechaTermino={obra.fecha_termino_contractual}
                      montoContrato={montoContrato || presupuesto.reduce((s,p) => s + (p.valor_total||0), 0)}
                      pagos={pagos}
                      presupuesto={presupuesto}
                    />
                  </Section>
                </div>
              )}

              {pagos.length>0 && (
                <Section title="Últimos estados de pago"
                  action={<button onClick={()=>setTab("pagos")}
                    style={{ fontSize:11, color:"#6366f1", background:"none", border:"none",
                      cursor:"pointer", fontFamily:"inherit" }}>Ver todos</button>}>
                  {pagos.slice(0,4).map(p=>(
                    <div key={p.id} style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f8fafc" }}>
                      <div>
                        <span style={{ fontSize:13, fontWeight:600, color:"#1e293b" }}>{p.nombre}</span>
                        {p.tipo&&<span style={{ fontSize:10, color:"#94a3b8", marginLeft:8 }}>{p.tipo}</span>}
                      </div>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <span style={{ fontSize:13, fontWeight:700, color:"#6366f1" }}>{fmtPeso(p.monto)}</span>
                        <span style={{ fontSize:10, color:"#94a3b8" }}>{fmtFecha(p.fecha)}</span>
                      </div>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}

          {/* ═══ FICHA ═══ */}
          {tab==="ficha" && (
            <div>
              <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:"0 0 16px" }}>Ficha de la Obra</h2>
              <Section title="Estado">
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {ESTADOS.map(e=>{ const s=ESTADO_ST[e]; const active=obra.estado_obra===e; return (
                    <button key={e} onClick={()=>setField("estado_obra",e)}
                      style={{ padding:"6px 14px", borderRadius:99, fontSize:12, fontWeight:600,
                        border:active?`2px solid ${s.dot}`:"1.5px solid #e2e8f0",
                        background:active?s.bg:"#fff", color:active?s.color:"#64748b",
                        cursor:"pointer", fontFamily:"inherit" }}>{e}</button>
                  );})}
                </div>
              </Section>
              <Section title="Información Básica">
                <Grid cols={2}>
                  <InputRow label="Nombre"><input value={obra.nombre||""} onChange={e=>setField("nombre",e.target.value)} style={inputSt}/></InputRow>
                  <InputRow label="Región">
                    <select value={obra.region||""} onChange={e=>setField("region",e.target.value)} style={selectSt}>
                      <option value="">Seleccionar...</option>
                      {REGIONES_CL.map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                  </InputRow>
                  <InputRow label="Mandante"><input value={obra.mandante||""} onChange={e=>setField("mandante",e.target.value)} style={inputSt} placeholder="Municipalidad de..."/></InputRow>
                  <InputRow label="Unidad Técnica"><input value={obra.unidad_tecnica||""} onChange={e=>setField("unidad_tecnica",e.target.value)} style={inputSt}/></InputRow>
                  <InputRow label="ITO"><input value={obra.ito||""} onChange={e=>setField("ito",e.target.value)} style={inputSt}/></InputRow>
                  <InputRow label="Contratista"><input value={obra.contratista||""} onChange={e=>setField("contratista",e.target.value)} style={inputSt}/></InputRow>
                  <InputRow label="RUT Contratista"><input value={obra.rut_contratista||""} onChange={e=>setField("rut_contratista",e.target.value)} style={inputSt} placeholder="12.345.678-9"/></InputRow>
                </Grid>
              </Section>
              <Section title="Decreto y Contrato">
                <Grid cols={3}>
                  <InputRow label="N° Decreto"><input value={obra.numero_decreto||""} onChange={e=>setField("numero_decreto",e.target.value)} style={inputSt}/></InputRow>
                  <InputRow label="Fecha Decreto"><input type="date" value={obra.fecha_decreto||""} onChange={e=>setField("fecha_decreto",e.target.value)} style={inputSt}/></InputRow>
                  <InputRow label="N° Contrato"><input value={obra.numero_contrato||""} onChange={e=>setField("numero_contrato",e.target.value)} style={inputSt}/></InputRow>
                  <InputRow label="Fecha Contrato"><input type="date" value={obra.fecha_contrato||""} onChange={e=>setField("fecha_contrato",e.target.value)} style={inputSt}/></InputRow>
                </Grid>
              </Section>
              <Section title="Plazos">
                <Grid cols={3}>
                  <InputRow label="Fecha Inicio"><input type="date" value={obra.fecha_inicio||""} onChange={e=>setField("fecha_inicio",e.target.value)} style={inputSt}/></InputRow>
                  <InputRow label="Plazo (días)"><input type="number" value={obra.plazo_dias||""} onChange={e=>setField("plazo_dias",e.target.value)} style={inputSt} placeholder="180"/></InputRow>
                  <InputRow label="Término Contractual"><input type="date" value={obra.fecha_termino_contractual||""} onChange={e=>setField("fecha_termino_contractual",e.target.value)} style={inputSt}/></InputRow>
                  <InputRow label="Término Real"><input type="date" value={obra.fecha_termino_real||""} onChange={e=>setField("fecha_termino_real",e.target.value)} style={inputSt}/></InputRow>
                </Grid>
              </Section>
              <Section title="Montos">
                <Grid cols={2}>
                  <InputRow label="Presupuesto Oficial ($)"><input type="number" value={obra.presupuesto_oficial||""} onChange={e=>setField("presupuesto_oficial",e.target.value)} style={inputSt} placeholder="0"/></InputRow>
                  <InputRow label="Monto Contrato ($)"><input type="number" value={obra.monto_contrato||""} onChange={e=>setField("monto_contrato",e.target.value)} style={inputSt} placeholder="0"/></InputRow>
                </Grid>
              </Section>
              <Section title="Notas">
                <textarea value={obra.notas||""} onChange={e=>setField("notas",e.target.value)}
                  rows={4} placeholder="Observaciones generales..."
                  style={{ ...inputSt, resize:"vertical", lineHeight:1.6 }}/>
              </Section>
            </div>
          )}

          {/* ═══ BANCO DE DATOS ═══ */}
          {tab==="docs" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>
                    {catActiva||"Banco de Datos"}
                  </h2>
                  <p style={{ fontSize:12, color:"#64748b", margin:"2px 0 0" }}>
                    {catActiva ? `${docs.filter(d=>d.categoria===catActiva).length} docs` : `${docs.length} docs · 15 categorías`}
                  </p>
                </div>
                <button onClick={()=>setMDoc(true)}
                  style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:10,
                    padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>＋ Agregar</button>
              </div>
              {(catActiva?[catActiva]:CATEGORIAS_DOCS).map(cat=>{
                const items=docs.filter(d=>d.categoria===cat);
                return (
                  <div key={cat} style={{ marginBottom:10 }}>
                    {!catActiva && (
                      <div style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase",
                        letterSpacing:".05em", padding:"6px 0 4px" }}>{cat} ({items.length})</div>
                    )}
                    {items.length===0 ? (catActiva?<EmptyState icon="📁" msg="Sin documentos en esta categoría"/>:null) : (
                      <div style={{ border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden" }}>
                        {items.map((doc,i)=>(
                          <div key={doc.id} style={{ display:"flex", alignItems:"center", gap:10,
                            padding:"10px 14px", background:i%2===0?"#fff":"#f9fafb",
                            borderTop:i>0?"1px solid #f1f5f9":"none" }}>
                            <span>📄</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:600, color:"#1e293b",
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.nombre}</div>
                              <div style={{ fontSize:11, color:"#94a3b8" }}>
                                {[doc.fecha?fmtFecha(doc.fecha):null,doc.descripcion].filter(Boolean).join(" · ")}
                              </div>
                            </div>
                            {doc.archivo_url&&(
                              <button onClick={()=>setDocSelec(doc)}
                                style={{ background:"#eef2ff", color:"#6366f1", border:"1px solid #bbf7d0",
                                  borderRadius:7, padding:"4px 10px", fontSize:11, fontWeight:600,
                                  cursor:"pointer", whiteSpace:"nowrap", fontFamily:"inherit" }}>Ver →</button>
                            )}
                            <button onClick={()=>delDoc(doc.id)}
                              style={{ background:"none", border:"none", color:"#fca5a5",
                                cursor:"pointer", fontSize:14 }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ ESTADOS DE PAGO ═══ */}
          {tab==="pagos" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>Estados de Pago</h2>
                  <p style={{ fontSize:12, color:"#64748b", margin:"2px 0 0" }}>
                    {pagos.length} registros · Pagado: <strong>{fmtPeso(totalPagado)}</strong>
                    {montoContrato>0&&` · Saldo: ${fmtPeso(saldo)}`}
                  </p>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {presupuesto.length>0 && (
                    <button onClick={()=>setMEPGenerator(true)}
                      style={{ background:"#fff", color:"#4338ca", border:"1.5px solid #c7d2fe", borderRadius:10,
                        padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>📊 Generar EP por partida</button>
                  )}
                  <button onClick={()=>setMPago(true)}
                    style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:10,
                      padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>＋ Agregar</button>
                </div>
              </div>
              {montoContrato>0&&(
                <div style={{ marginBottom:14, background:"#fff", border:"1px solid #e2e8f0",
                  borderRadius:12, padding:"12px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:12, color:"#64748b" }}>Avance financiero</span>
                    <span style={{ fontSize:13, fontWeight:700, color:"#6366f1" }}>{pctEjec.toFixed(1)}%</span>
                  </div>
                  <ProgressBar pct={pctEjec}/>
                </div>
              )}
              {pagos.length===0?<EmptyState icon="💰" msg="Sin estados de pago"/>:(
                <div style={{ border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr style={{ background:"#f8fafc" }}>
                      {["Nombre","Tipo","Fecha","Monto","N° EP","N° Oficio",""].map(h=>(
                        <th key={h} style={{ padding:"9px 12px", fontSize:10, fontWeight:700, color:"#64748b",
                          textAlign:"left", textTransform:"uppercase", letterSpacing:".05em",
                          borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {pagos.map((p,i)=>(
                        <tr key={p.id} style={{ background:i%2===0?"#fff":"#f9fafb" }}>
                          <td style={{ padding:"10px 12px", fontSize:13, fontWeight:500, color:"#1e293b" }}>{p.nombre}</td>
                          <td style={{ padding:"10px 12px" }}>
                            <span style={{ fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:99,
                              background:"#dbeafe", color:"#1d4ed8" }}>{p.tipo||"—"}</span>
                          </td>
                          <td style={{ padding:"10px 12px", fontSize:12, color:"#64748b" }}>{fmtFecha(p.fecha)}</td>
                          <td style={{ padding:"10px 12px", fontSize:13, fontWeight:700, color:"#6366f1" }}>{fmtPeso(p.monto)}</td>
                          <td style={{ padding:"10px 12px", fontSize:12, color:"#64748b" }}>{p.numero_estado_pago||"—"}</td>
                          <td style={{ padding:"10px 12px", fontSize:12, color:"#64748b" }}>{p.numero_oficio||"—"}</td>
                          <td style={{ padding:"10px 12px" }}>
                            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                              {p.archivo_url&&<a href={p.archivo_url} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize:12, color:"#6366f1", textDecoration:"none" }}>📎</a>}
                              <button onClick={()=>delPago(p.id)}
                                style={{ background:"none", border:"none", color:"#fca5a5",
                                  cursor:"pointer", fontSize:13 }}>✕</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ GARANTÍAS ═══ */}
          {tab==="garantias" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>Cauciones y Garantías</h2>
                  <p style={{ fontSize:12, color:"#64748b", margin:"2px 0 0" }}>{garantias.length} registradas</p>
                </div>
                <button onClick={()=>setMGar(true)}
                  style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:10,
                    padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>＋ Agregar</button>
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                {[["🔴","1–30d","#fee2e2","#991b1b"],["🟠","31–45d","#fed7aa","#92400e"],
                  ["🟡","46–75d","#fef3c7","#713f12"],["🟢","76+d","#eef2ff","#4338ca"]].map(([ico,l,bg,c])=>(
                  <span key={l} style={{ background:bg, color:c, fontSize:10, fontWeight:600,
                    padding:"3px 10px", borderRadius:99 }}>{ico} {l}</span>
                ))}
              </div>
              {garantias.length===0?<EmptyState icon="🔒" msg="Sin garantías"/>:(
                <div style={{ display:"grid", gap:10 }}>
                  {garantias.map(g=>(
                    <div key={g.id} style={{ background:"#fff", border:"1.5px solid #e2e8f0",
                      borderRadius:14, padding:"14px 16px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                            <span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>{g.tipo||"Garantía"}</span>
                            <SemaforoChip fecha={g.fecha_vencimiento}/>
                            <span style={{ fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:99,
                              background:g.estado==="Vigente"?"#eef2ff":"#f1f5f9",
                              color:g.estado==="Vigente"?"#4338ca":"#64748b" }}>{g.estado}</span>
                          </div>
                          <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                            {g.entidad&&<span style={{ fontSize:12, color:"#64748b" }}>🏦 {g.entidad}</span>}
                            {g.numero_documento&&<span style={{ fontSize:12, color:"#64748b" }}>N° {g.numero_documento}</span>}
                            {g.monto&&<span style={{ fontSize:13, fontWeight:700, color:"#6366f1" }}>{fmtPeso(g.monto)}</span>}
                            {g.fecha_emision&&<span style={{ fontSize:12, color:"#64748b" }}>Emisión: {fmtFecha(g.fecha_emision)}</span>}
                            {g.fecha_vencimiento&&<span style={{ fontSize:12, color:"#64748b" }}>Vence: {fmtFecha(g.fecha_vencimiento)}</span>}
                          </div>
                          {g.descripcion&&<p style={{ fontSize:12, color:"#94a3b8", margin:"6px 0 0" }}>{g.descripcion}</p>}
                        </div>
                        <button onClick={()=>delGar(g.id)}
                          style={{ background:"none", border:"none", color:"#fca5a5", cursor:"pointer", fontSize:16 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ BITÁCORA ═══ */}
          {tab==="bitacora" && (()=>{
            const bitacoraFiltrada = filtroFecha
              ? bitacora.filter(b => b.fecha && b.fecha.slice(0,10) === filtroFecha)
              : bitacora;
            return (
            <div>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>Bitácora de Obra</h2>
                  <p style={{ fontSize:12, color:"#64748b", margin:"2px 0 0" }}>
                    {filtroFecha ? `${bitacoraFiltrada.length} registro${bitacoraFiltrada.length!==1?"s":""} el ${fmtFecha(filtroFecha)}` : `${bitacora.length} registros`}
                  </p>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {bitacora.length>0&&(
                    <button onClick={()=>exportBitacoraPDF(obra,bitacora,anexos)}
                      style={{ background:"#f8fafc", color:"#6366f1", border:"1px solid #e2e8f0", borderRadius:10,
                        padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>📥 Exportar PDF</button>
                  )}
                  <button onClick={()=>setMBit(true)}
                    style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:10,
                      padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>＋ Nueva entrada</button>
                </div>
              </div>
              {/* 2-column layout */}
              <div style={{ display:"flex", gap:18, alignItems:"flex-start" }}>
                {/* Timeline */}
                <div style={{ flex:1, minWidth:0 }}>
                  {bitacoraFiltrada.length===0 ? (
                    <EmptyState icon="📖" msg={filtroFecha ? "Sin registros para esta fecha" : "Sin registros en la bitácora"}/>
                  ) : (
                    <div style={{ position:"relative", paddingLeft:22 }}>
                      <div style={{ position:"absolute", left:7, top:0, bottom:0,
                        width:2, background:"#e2e8f0", borderRadius:2 }}/>
                      {bitacoraFiltrada.map(b=>{
                        const tc=TIPO_BIT_COLOR[b.tipo]||TIPO_BIT_COLOR.Observación;
                        const bitAnexos=anexos[b.id]||[];
                        return (
                          <div key={b.id} style={{ marginBottom:14, position:"relative" }}>
                            <div style={{ position:"absolute", left:-19, top:5, width:10, height:10,
                              borderRadius:"50%", background:tc.color, border:"2px solid #fff",
                              boxShadow:`0 0 0 2px ${tc.color}` }}/>
                            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"11px 14px" }}>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                                marginBottom:5, flexWrap:"wrap", gap:6 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                                  <span style={{ background:tc.bg, color:tc.color, fontSize:9, fontWeight:700,
                                    padding:"2px 7px", borderRadius:99 }}>{b.tipo}</span>
                                  {b.autor&&<span style={{ fontSize:10, color:"#94a3b8" }}>por {b.autor}</span>}
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                                  <span style={{ fontSize:10, color:"#94a3b8" }}>{fmtFecha(b.fecha)}</span>
                                  <button onClick={()=>delBit(b.id)}
                                    style={{ background:"none", border:"none", color:"#fca5a5",
                                      cursor:"pointer", fontSize:12 }}>✕</button>
                                </div>
                              </div>
                              <p style={{ fontSize:13, color:"#374151", margin:0, lineHeight:1.6 }}>{b.descripcion}</p>
                              {bitAnexos.length>0&&(
                                <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #f1f5f9" }}>
                                  <button onClick={()=>setExpandedAnexo(expandedAnexo===b.id?null:b.id)}
                                    style={{ background:"none", border:"none", cursor:"pointer", padding:0,
                                      fontSize:11, color:"#6366f1", fontWeight:600, display:"flex",
                                      alignItems:"center", gap:5 }}>
                                    📎 {bitAnexos.length} adjunto{bitAnexos.length>1?"s":""} {expandedAnexo===b.id?"▲":"▼"}
                                  </button>
                                  {expandedAnexo===b.id&&(
                                    <div style={{ marginTop:8, display:"flex", gap:8, flexWrap:"wrap" }}>
                                      {bitAnexos.map(a=>(
                                        a.tipo==="foto" ? (
                                          <div key={a.id} style={{ position:"relative" }}>
                                            <img src={a.url} alt={a.nombre}
                                              style={{ width:120, height:90, objectFit:"cover",
                                                borderRadius:8, cursor:"pointer", border:"1px solid #e2e8f0" }}
                                              onClick={()=>setLb({url:a.url,caption:a.nombre})}/>
                                          </div>
                                        ) : (
                                          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                                            style={{ display:"inline-flex", alignItems:"center", gap:5,
                                              fontSize:11, color:"#6366f1", textDecoration:"none",
                                              background:"#eef2ff", border:"1px solid #bbf7d0",
                                              borderRadius:8, padding:"8px 12px" }}>
                                            📄 {a.nombre.length>25?a.nombre.substring(0,25)+"…":a.nombre}
                                          </a>
                                        )
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Sidebar derecho */}
                <div style={{ width:230, flexShrink:0, display:"flex", flexDirection:"column", gap:14 }}>
                  <CalendarioBitacora bitacora={bitacora} mes={calMes} setMes={setCalMes}
                    filtroFecha={filtroFecha} setFiltroFecha={setFiltroFecha}/>
                  {/* Filtro por tipo */}
                  <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"12px" }}>
                    <p style={{ fontSize:11, fontWeight:700, color:"#64748b", margin:"0 0 8px", textTransform:"uppercase", letterSpacing:".5px" }}>Tipo</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {TIPOS_BIT.map(t=>{
                        const tc=TIPO_BIT_COLOR[t]||TIPO_BIT_COLOR.Observación;
                        const cnt=bitacora.filter(b=>b.tipo===t).length;
                        return (
                          <div key={t} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <span style={{ background:tc.bg, color:tc.color, fontSize:10, fontWeight:600,
                              padding:"2px 8px", borderRadius:99 }}>{t}</span>
                            <span style={{ fontSize:11, color:"#94a3b8", fontWeight:600 }}>{cnt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* ═══ MODIFICACIONES ═══ */}
          {tab==="modificaciones" && (()=>{
            const montoBase = obra?.monto_contrato || 0;
            const totalMods = modificaciones.reduce((s,m)=>s+(m.monto_modificacion||0),0);
            const totalDias = modificaciones.reduce((s,m)=>s+(m.dias_adicionales||0),0);
            const montoFinal = montoBase + totalMods;
            const TIPO_MOD_COLOR = {
              "Aumento de Obras":    { bg:"#eef2ff", color:"#4338ca" },
              "Disminución de Obras":{ bg:"#fee2e2", color:"#991b1b" },
              "Ampliación de Plazo": { bg:"#dbeafe", color:"#1d4ed8" },
              "Mixta":               { bg:"#fef3c7", color:"#92400e" },
            };
            return (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>Modificaciones de Contrato</h2>
                  <p style={{ fontSize:12, color:"#64748b", margin:"2px 0 0" }}>{modificaciones.length} modificación{modificaciones.length!==1?"es":""}</p>
                </div>
                <button onClick={()=>setMMod(true)}
                  style={{ background:"#3b82f6", color:"#fff", border:"none", borderRadius:10,
                    padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>＋ Nueva modificación</button>
              </div>
              {/* Resumen financiero de modificaciones */}
              {modificaciones.length > 0 && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
                  {[
                    { label:"Monto contrato original", val:"$"+Math.round(montoBase).toLocaleString("es-CL"), color:"#1e293b" },
                    { label:"Total modificaciones",    val:(totalMods>=0?"+":"")+"$"+Math.round(totalMods).toLocaleString("es-CL"), color:totalMods>=0?"#6366f1":"#ef4444" },
                    { label:"Monto contrato vigente",  val:"$"+Math.round(montoFinal).toLocaleString("es-CL"), color:"#1d4ed8" },
                  ].map(c=>(
                    <div key={c.label} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"12px 16px" }}>
                      <p style={{ fontSize:10, color:"#94a3b8", fontWeight:700, margin:"0 0 4px", textTransform:"uppercase" }}>{c.label}</p>
                      <p style={{ fontSize:16, fontWeight:800, color:c.color, margin:0 }}>{c.val}</p>
                    </div>
                  ))}
                </div>
              )}
              {modificaciones.length===0 ? <EmptyState icon="📝" msg="Sin modificaciones registradas"/> : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {modificaciones.map(m=>{
                    const tc = TIPO_MOD_COLOR[m.tipo] || TIPO_MOD_COLOR["Mixta"];
                    return (
                      <div key={m.id} style={{ background:"#fff", border:"1px solid #e2e8f0",
                        borderRadius:12, padding:"14px 18px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                              {m.numero&&<span style={{ fontSize:11, color:"#94a3b8", fontWeight:700 }}>Mod. N°{m.numero}</span>}
                              <span style={{ background:tc.bg, color:tc.color, fontSize:10, fontWeight:700,
                                padding:"2px 8px", borderRadius:99 }}>{m.tipo}</span>
                              {m.fecha&&<span style={{ fontSize:11, color:"#94a3b8" }}>{new Date(m.fecha).toLocaleDateString("es-CL")}</span>}
                            </div>
                            {m.descripcion&&<p style={{ fontSize:13, color:"#374151", margin:"0 0 6px", lineHeight:1.5 }}>{m.descripcion}</p>}
                            <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                              {m.monto_modificacion!==0&&(
                                <span style={{ fontSize:13, fontWeight:700, color:m.monto_modificacion>0?"#6366f1":"#ef4444" }}>
                                  {m.monto_modificacion>0?"▲":"▼"} ${Math.abs(Math.round(m.monto_modificacion)).toLocaleString("es-CL")}
                                </span>
                              )}
                              {m.dias_adicionales>0&&(
                                <span style={{ fontSize:12, color:"#3b82f6", fontWeight:600 }}>+{m.dias_adicionales} días</span>
                              )}
                              {m.decreto&&<span style={{ fontSize:11, color:"#94a3b8" }}>📄 {m.decreto}</span>}
                            </div>
                          </div>
                          <button onClick={async()=>{ await supabase.from("obra_modificaciones").delete().eq("id",m.id).eq("obra_id",obraId); setModificaciones(p=>p.filter(x=>x.id!==m.id)); }}
                            style={{ background:"none", border:"none", color:"#fca5a5", cursor:"pointer", fontSize:14, padding:"0 4px" }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })()}

          {/* ═══ RECEPCIONES ═══ */}
          {tab==="recepciones" && (()=>{
            const ESTADO_REC_COLOR = {
              "Solicitada":        { bg:"#dbeafe", color:"#1d4ed8" },
              "Realizada":         { bg:"#eef2ff", color:"#4338ca" },
              "Con observaciones": { bg:"#fef3c7", color:"#92400e" },
              "Rechazada":         { bg:"#fee2e2", color:"#991b1b" },
            };
            const provRec = recepciones.find(r=>r.tipo==="Provisoria"&&r.estado==="Realizada");
            const defRec  = recepciones.find(r=>r.tipo==="Definitiva"&&r.estado==="Realizada");
            return (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>Recepciones de Obra</h2>
                  <p style={{ fontSize:12, color:"#64748b", margin:"2px 0 0" }}>{recepciones.length} registro{recepciones.length!==1?"s":""}</p>
                </div>
                <button onClick={()=>setMRec(true)}
                  style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:10,
                    padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>＋ Nueva recepción</button>
              </div>
              {/* Estado recepciones */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                {[
                  { label:"Recepción Provisoria", rec:provRec, tipo:"Provisoria" },
                  { label:"Recepción Definitiva", rec:defRec,  tipo:"Definitiva" },
                ].map(({label,rec,tipo})=>(
                  <div key={tipo} style={{ background: rec?"#eef2ff":"#f8fafc",
                    border:`1.5px solid ${rec?"#bbf7d0":"#e2e8f0"}`, borderRadius:14, padding:"14px 18px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:rec?"#4338ca":"#94a3b8" }}>{label}</span>
                      <span style={{ fontSize:20 }}>{rec?"✅":"⏳"}</span>
                    </div>
                    {rec ? (
                      <>
                        <p style={{ fontSize:12, color:"#6366f1", fontWeight:600, margin:"0 0 2px" }}>
                          Realizada el {new Date(rec.fecha_recepcion||rec.fecha_solicitud).toLocaleDateString("es-CL")}
                        </p>
                        {rec.inspector&&<p style={{ fontSize:11, color:"#64748b", margin:0 }}>👤 {rec.inspector}</p>}
                      </>
                    ) : (
                      <p style={{ fontSize:12, color:"#94a3b8", margin:0 }}>Pendiente</p>
                    )}
                  </div>
                ))}
              </div>
              {recepciones.length===0 ? <EmptyState icon="🏁" msg="Sin recepciones registradas"/> : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {recepciones.map(r=>{
                    const tc = ESTADO_REC_COLOR[r.estado] || ESTADO_REC_COLOR["Solicitada"];
                    return (
                      <div key={r.id} style={{ background:"#fff", border:"1px solid #e2e8f0",
                        borderRadius:12, padding:"14px 18px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                              <span style={{ fontSize:13, fontWeight:800, color:"#1e293b" }}>Recepción {r.tipo}</span>
                              <span style={{ background:tc.bg, color:tc.color, fontSize:10, fontWeight:700,
                                padding:"2px 8px", borderRadius:99 }}>{r.estado}</span>
                            </div>
                            <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom: r.observaciones?8:0 }}>
                              {r.fecha_solicitud&&(
                                <span style={{ fontSize:12, color:"#64748b" }}>📋 Solicitud: {new Date(r.fecha_solicitud).toLocaleDateString("es-CL")}</span>
                              )}
                              {r.fecha_recepcion&&(
                                <span style={{ fontSize:12, color:"#6366f1", fontWeight:600 }}>✅ Recepción: {new Date(r.fecha_recepcion).toLocaleDateString("es-CL")}</span>
                              )}
                              {r.inspector&&(
                                <span style={{ fontSize:12, color:"#64748b" }}>👤 {r.inspector}</span>
                              )}
                            </div>
                            {r.observaciones&&(
                              <p style={{ fontSize:12, color:"#374151", margin:0, fontStyle:"italic",
                                background:"#f8fafc", padding:"6px 10px", borderRadius:8 }}>"{r.observaciones}"</p>
                            )}
                          </div>
                          <button onClick={async()=>{ await supabase.from("obra_recepciones").delete().eq("id",r.id).eq("obra_id",obraId); setRecepciones(p=>p.filter(x=>x.id!==r.id)); }}
                            style={{ background:"none", border:"none", color:"#fca5a5", cursor:"pointer", fontSize:14, padding:"0 4px" }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })()}

          {/* ═══ INFORMES ═══ */}
          {tab==="informes" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>Informes de Obra</h2>
                  <p style={{ fontSize:12, color:"#64748b", margin:"2px 0 0" }}>{informes.length} informe{informes.length!==1?"s":""} generados</p>
                </div>
                <button onClick={()=>setMInforme(true)}
                  style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:10,
                    padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>＋ Nuevo Informe</button>
              </div>
              {informes.length===0?<EmptyState icon="📋" msg="Sin informes generados"/>:(
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {informes.map(inf=>{
                    const d = inf.datos_json||{};
                    const partidas = inf.partidas_json||[];
                    const terminadas = partidas.filter(p=>p.estado==="Terminada").length;
                    const enProgreso = partidas.filter(p=>p.estado==="En progreso").length;
                    return (
                      <div key={inf.id} style={{ background:"#fff", border:"1px solid #e2e8f0",
                        borderRadius:14, padding:"14px 18px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                              <span style={{ background:"#eef2ff", color:"#4338ca", fontSize:10, fontWeight:700,
                                padding:"2px 8px", borderRadius:99 }}>{inf.tipo}</span>
                              <span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>{d.obra_nombre}</span>
                            </div>
                            {inf.periodo_desde&&inf.periodo_hasta&&(
                              <p style={{ fontSize:11, color:"#94a3b8", margin:0 }}>
                                {inf.periodo_desde} → {inf.periodo_hasta}
                              </p>
                            )}
                          </div>
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                            <button onClick={()=>setPrevisualizando(inf)}
                              style={{ background:"#eef2ff", color:"#6366f1", border:"1px solid #bbf7d0",
                                borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                              👁️ Ver informe
                            </button>
                            <button onClick={async()=>{ await supabase.from("obra_informes").delete().eq("id",inf.id).eq("obra_id",obraId); setInformes(p=>p.filter(x=>x.id!==inf.id)); }}
                              style={{ background:"none", border:"none", color:"#fca5a5", cursor:"pointer", fontSize:14 }}>✕</button>
                          </div>
                        </div>
                        {partidas.length>0&&(
                          <div style={{ display:"flex", gap:10, marginTop:10, flexWrap:"wrap" }}>
                            <span style={{ fontSize:11, color:"#64748b" }}>📦 {partidas.length} partidas</span>
                            {terminadas>0&&<span style={{ fontSize:11, color:"#6366f1" }}>✓ {terminadas} terminadas</span>}
                            {enProgreso>0&&<span style={{ fontSize:11, color:"#d97706" }}>⏳ {enProgreso} en progreso</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ FOTOS ═══ */}
          {tab==="fotos" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>Fotos de la Obra</h2>
                  <p style={{ fontSize:12, color:"#64748b", margin:"2px 0 0" }}>
                    {fotos.length} foto{fotos.length!==1?"s":""} · Las fotos aparecen como portada en el Resumen
                  </p>
                </div>
                <button onClick={()=>setMFoto(true)}
                  style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:10,
                    padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>＋ Subir fotos</button>
              </div>
              {fotos.length===0?<EmptyState icon="📸" msg="Sin fotos — sube imágenes de avance de obra"/>:(
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:10 }}>
                  {fotos.map(f=>(
                    <div key={f.id} style={{ position:"relative", borderRadius:12, overflow:"hidden",
                      aspectRatio:"4/3", cursor:"pointer", background:"#f1f5f9" }}
                      onClick={()=>setLb(f)}>
                      <img src={f.url} alt={f.caption||"Foto"} style={{ width:"100%", height:"100%",
                        objectFit:"cover", display:"block" }} onError={e=>{ e.target.style.display="none"; }}/>
                      {f.caption&&(
                        <div style={{ position:"absolute", bottom:0, left:0, right:0,
                          background:"linear-gradient(transparent,rgba(0,0,0,.6))",
                          padding:"16px 8px 6px", color:"#fff", fontSize:10 }}>{f.caption}</div>
                      )}
                      <button onClick={e=>{ e.stopPropagation(); delFoto(f.id); }}
                        style={{ position:"absolute", top:5, right:5, background:"rgba(0,0,0,.5)",
                          border:"none", borderRadius:"50%", width:22, height:22, color:"#fff",
                          cursor:"pointer", fontSize:10 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ PRESUPUESTO ═══ */}
          {tab==="presupuesto" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>💰 Presupuesto</h2>
                  <p style={{ fontSize:12, color:"#64748b", margin:"2px 0 0" }}>
                    {presupuesto.length>0 ? `${presupuesto.length} partidas · Haz clic en Cantidad o V. Unitario para editar` : "Importa tu presupuesto desde Excel o PDF"}
                  </p>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {presupuesto.length>0 && (
                    <button onClick={async()=>{ if(!confirm("¿Limpiar todo el presupuesto actual?"))return; await supabase.from("obra_presupuesto").delete().eq("obra_id",obraId); setPresupuesto([]); }}
                      style={{ background:"#fff", color:"#ef4444", border:"1px solid #fca5a5", borderRadius:10,
                        padding:"8px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>🗑 Limpiar</button>
                  )}
                  <button onClick={()=>setMPresupuesto(true)}
                    style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:10,
                      padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                    {presupuesto.length>0?"↑ Reimportar":"＋ Importar presupuesto"}
                  </button>
                </div>
              </div>

              {presupuesto.length===0 ? (
                <EmptyState icon="💰" msg="Sin partidas — importa tu presupuesto desde Excel (.xlsx) o PDF"/>
              ) : (
                <div>
                  {[...new Set(presupuesto.map(p=>p.seccion))].map(seccion=>{
                    const items = presupuesto.filter(p=>p.seccion===seccion);
                    const subtotal = items.reduce((s,p)=>s+(p.valor_total||0),0);
                    return (
                      <div key={seccion} style={{ marginBottom:20 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                          background:"linear-gradient(90deg,#eef2ff,#f8fafc)", padding:"10px 14px",
                          borderRadius:8, marginBottom:0, borderLeft:"3px solid #6366f1" }}>
                          <span style={{ fontSize:12, fontWeight:700, color:"#4338ca" }}>{seccion}</span>
                          <span style={{ fontSize:11, fontWeight:600, color:"#6366f1" }}>
                            ${Math.round(subtotal).toLocaleString("es-CL")}
                          </span>
                        </div>
                        <div style={{ border:"1px solid #e2e8f0", borderTop:"none", borderRadius:"0 0 10px 10px", overflow:"hidden" }}>
                          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                            <thead style={{ background:"#f9fafb" }}>
                              <tr>
                                {["Ítem","Partida","Un.","Cantidad","V. Unitario","V. Total","C. Objetivo",""].map((h,i)=>(
                                  <th key={i} style={{ padding:"8px 10px", fontWeight:600, color:"#64748b",
                                    textAlign: i>=3&&i<=6 ? "right" : "left",
                                    borderBottom:"1px solid #e2e8f0", whiteSpace:"nowrap", fontSize:11 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((p,i)=>{
                                const editCant = editingCell?.id===p.id && editingCell?.field==="cantidad";
                                const editUnit = editingCell?.id===p.id && editingCell?.field==="valor_unitario";
                                return (
                                  <tr key={p.id} style={{ background:i%2===0?"#fff":"#fafafa",
                                    borderBottom:"1px solid #f1f5f9", transition:"background .1s" }}
                                    onMouseEnter={e=>e.currentTarget.style.background="#eef2ff"}
                                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}>
                                    <td style={{ padding:"7px 10px", color:"#94a3b8", fontSize:11 }}>{p.item}</td>
                                    <td style={{ padding:"7px 10px", color:"#1e293b", maxWidth:280,
                                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.partida}</td>
                                    <td style={{ padding:"7px 10px", color:"#64748b" }}>{p.unidad}</td>
                                    {/* Cantidad — editable */}
                                    <td style={{ padding:"4px 6px", textAlign:"right" }}>
                                      {editCant ? (
                                        <input autoFocus defaultValue={p.cantidad ?? ""}
                                          onBlur={e=>updatePresupuesto(p.id,"cantidad",e.target.value)}
                                          onKeyDown={e=>{ if(e.key==="Enter") e.target.blur(); if(e.key==="Escape") setEditingCell(null); }}
                                          style={{ width:70, textAlign:"right", border:"1.5px solid #6366f1",
                                            borderRadius:6, padding:"3px 6px", fontSize:12, fontFamily:"inherit", outline:"none" }}/>
                                      ) : (
                                        <span onClick={()=>setEditingCell({id:p.id,field:"cantidad"})}
                                          title="Clic para editar"
                                          style={{ cursor:"pointer", padding:"3px 8px", borderRadius:6, display:"inline-block",
                                            color: p.cantidad ? "#374151" : "#cbd5e1",
                                            border:"1px dashed #e2e8f0", minWidth:50, textAlign:"right",
                                            background: p.cantidad ? "transparent" : "#fafafa" }}>
                                          {p.cantidad ?? "—"}
                                        </span>
                                      )}
                                    </td>
                                    {/* Valor unitario — editable */}
                                    <td style={{ padding:"4px 6px", textAlign:"right" }}>
                                      {editUnit ? (
                                        <input autoFocus defaultValue={p.valor_unitario ?? ""}
                                          onBlur={e=>updatePresupuesto(p.id,"valor_unitario",e.target.value)}
                                          onKeyDown={e=>{ if(e.key==="Enter") e.target.blur(); if(e.key==="Escape") setEditingCell(null); }}
                                          style={{ width:90, textAlign:"right", border:"1.5px solid #6366f1",
                                            borderRadius:6, padding:"3px 6px", fontSize:12, fontFamily:"inherit", outline:"none" }}/>
                                      ) : (
                                        <span onClick={()=>setEditingCell({id:p.id,field:"valor_unitario"})}
                                          title="Clic para editar"
                                          style={{ cursor:"pointer", padding:"3px 8px", borderRadius:6, display:"inline-block",
                                            color: p.valor_unitario ? "#374151" : "#cbd5e1",
                                            border:"1px dashed #e2e8f0", minWidth:70, textAlign:"right",
                                            background: p.valor_unitario ? "transparent" : "#fafafa" }}>
                                          {p.valor_unitario ? "$"+Math.round(p.valor_unitario).toLocaleString("es-CL") : "—"}
                                        </span>
                                      )}
                                    </td>
                                    {/* Valor total — calculado */}
                                    <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:600,
                                      color: p.valor_total ? "#6366f1" : "#cbd5e1" }}>
                                      {p.valor_total ? "$"+Math.round(p.valor_total).toLocaleString("es-CL") : "—"}
                                    </td>
                                    {/* Costo objetivo — editable */}
                                    <td style={{ padding:"4px 6px", textAlign:"right" }}>
                                      {editingCell?.id===p.id && editingCell?.field==="costo_objetivo" ? (
                                        <input autoFocus defaultValue={p.costo_objetivo ?? ""}
                                          onBlur={e=>updatePresupuesto(p.id,"costo_objetivo",e.target.value)}
                                          onKeyDown={e=>{ if(e.key==="Enter") e.target.blur(); if(e.key==="Escape") setEditingCell(null); }}
                                          style={{ width:90, textAlign:"right", border:"1.5px solid #f59e0b",
                                            borderRadius:6, padding:"3px 6px", fontSize:12, fontFamily:"inherit", outline:"none" }}/>
                                      ) : (
                                        <span onClick={()=>setEditingCell({id:p.id,field:"costo_objetivo"})}
                                          title="Clic para editar costo objetivo"
                                          style={{ cursor:"pointer", padding:"3px 8px", borderRadius:6, display:"inline-block",
                                            color: p.costo_objetivo ? "#f59e0b" : "#cbd5e1",
                                            border:"1px dashed #fde68a", minWidth:70, textAlign:"right",
                                            background: p.costo_objetivo ? "#fefce8" : "#fafafa",
                                            fontWeight: p.costo_objetivo ? 600 : 400 }}>
                                          {p.costo_objetivo ? "$"+Math.round(p.costo_objetivo).toLocaleString("es-CL") : "—"}
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding:"7px 8px", textAlign:"center" }}>
                                      <button onClick={()=>delPresupuesto(p.id)}
                                        style={{ background:"none", border:"none", color:"#fca5a5",
                                          cursor:"pointer", fontSize:13, lineHeight:1 }}>✕</button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}

                  {/* Resumen financiero */}
                  <ResumenFinanciero presupuesto={presupuesto}/>

                  <p style={{ fontSize:11, color:"#94a3b8", marginTop:10, textAlign:"center" }}>
                    ✏️ Haz clic en <strong>Cantidad</strong> o <strong>V. Unitario</strong> para editar · El total se calcula automáticamente
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ═══ CARTA GANTT ═══ */}
          {tab==="gantt" && (
            <GanttObra obra={obra} presupuesto={presupuesto} />
          )}

          {/* ═══ CONTROL DE COSTOS ═══ */}
          {tab==="costos" && (
            <ControlCostos obra={obra} presupuesto={presupuesto} pagos={pagos} />
          )}

          {/* ═══ FLUJO DE CAJA ═══ */}
          {tab==="flujo" && (
            <FlujoCaja obra={obra} presupuesto={presupuesto} pagos={pagos} />
          )}

          {/* ═══ RECURSOS ═══ */}
          {tab==="recursos" && (
            <div>
              <HistogramaRecursos obra={obra} presupuesto={presupuesto} />
              <div style={{ marginTop:20, display:"flex", gap:10 }}>
                {presupuesto.length>0 && (
                  <button onClick={()=>setMComparador(true)}
                    style={{ background:"#fff", color:"#4338ca", border:"1.5px solid #c7d2fe", borderRadius:10,
                      padding:"10px 20px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                    📊 Comparar Cotizaciones
                  </button>
                )}
                <button onClick={()=>setMMedidor(true)}
                  style={{ background:"#fff", color:"#4338ca", border:"1.5px solid #c7d2fe", borderRadius:10,
                    padding:"10px 20px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  📐 Medir sobre Plano
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* EP Generator Modal */}
      {mEPGenerator && (
        <EstadoPagoGenerator
          obra={obra}
          presupuesto={presupuesto}
          pagosAnteriores={pagos}
          onClose={() => setMEPGenerator(false)}
          onSave={async (epData) => {
            const { data, error } = await supabase.from("obra_estados_pago")
              .insert({ obra_id: obraId, ...epData })
              .select().single();
            if (!error && data) {
              setPagos(prev => [data, ...prev]);
              setMEPGenerator(false);
            }
          }}
        />
      )}

      {/* Comparador Cotizaciones */}
      {mComparador && (
        <ComparadorCotizaciones presupuesto={presupuesto} onClose={()=>setMComparador(false)} />
      )}

      {/* Medidor de Plano */}
      {mMedidor && (
        <MedidorPlano onClose={()=>setMMedidor(false)} />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,.92)",
          display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>setLb(null)}>
          <img src={lightbox.url} alt="" style={{ maxWidth:"90vw", maxHeight:"90vh",
            objectFit:"contain", borderRadius:8 }}/>
          <button onClick={()=>setLb(null)}
            style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,.2)",
              border:"none", borderRadius:"50%", width:38, height:38, color:"#fff",
              cursor:"pointer", fontSize:16 }}>✕</button>
          {lightbox.caption&&(
            <div style={{ position:"absolute", bottom:20, left:"50%", transform:"translateX(-50%)",
              background:"rgba(0,0,0,.7)", color:"#fff", padding:"7px 16px",
              borderRadius:8, fontSize:12 }}>{lightbox.caption}</div>
          )}
        </div>
      )}

      {/* Panel de previsualización de documentos */}
      {docSelec && (
        <>
          <div style={{ position:"fixed", inset:0, zIndex:39, background:"rgba(0,0,0,.2)" }} onClick={()=>setDocSelec(null)}/>
          <div style={{ position:"fixed", right:0, top:0, bottom:0, width:450, background:"#fff",
            borderLeft:"1px solid #e2e8f0", display:"flex", flexDirection:"column",
            boxShadow:"-4px 0 12px rgba(0,0,0,.08)", animation:"slideIn .3s ease", zIndex:40 }}>
            <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"16px 20px", borderBottom:"1px solid #e2e8f0" }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#1e293b", overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                📄 {docSelec.nombre}
              </div>
              <button onClick={()=>setDocSelec(null)}
                style={{ background:"#f1f5f9", border:"none", borderRadius:6,
                  width:28, height:28, cursor:"pointer", fontSize:14, color:"#64748b" }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ flex:1, overflowY:"auto", display:"flex", alignItems:"center",
              justifyContent:"center", padding:20, background:"#f8fafc" }}>
              {docSelec.archivo_url?.endsWith(".pdf") ? (
                <iframe src={docSelec.archivo_url} style={{ width:"100%", height:"100%",
                  border:"none", borderRadius:8 }}/>
              ) : docSelec.archivo_url?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <img src={docSelec.archivo_url} alt="" style={{ maxWidth:"100%", maxHeight:"100%",
                  objectFit:"contain", borderRadius:8, boxShadow:"0 2px 8px rgba(0,0,0,.1)" }}/>
              ) : (
                <div style={{ textAlign:"center", color:"#94a3b8" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📎</div>
                  <div style={{ fontSize:12 }}>
                    Tipo de archivo no previsualizable<br/>
                    <span style={{ fontSize:11, color:"#cbd5e1" }}>(usa el botón descargar para verlo)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ padding:"16px 20px", borderTop:"1px solid #e2e8f0", background:"#fff" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:12 }}>
                <span style={{ color:"#64748b" }}>Categoría:</span>
                <span style={{ color:"#1e293b", fontWeight:600 }}>{docSelec.categoria}</span>
              </div>
              {docSelec.fecha&&(
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:12 }}>
                  <span style={{ color:"#64748b" }}>Fecha:</span>
                  <span style={{ color:"#1e293b", fontWeight:600 }}>{fmtFecha(docSelec.fecha)}</span>
                </div>
              )}
              {docSelec.descripcion&&(
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:12 }}>
                  <span style={{ color:"#64748b" }}>Descripción:</span>
                  <span style={{ color:"#1e293b", fontWeight:600 }}>{docSelec.descripcion}</span>
                </div>
              )}
              <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #e2e8f0" }}>
                {docSelec.archivo_url&&(
                  <a href={docSelec.archivo_url} download target="_blank" rel="noopener noreferrer"
                    style={{ display:"inline-block", background:"#eef2ff", color:"#6366f1",
                      border:"1px solid #bbf7d0", borderRadius:8, padding:"8px 16px", fontSize:12,
                      fontWeight:600, textDecoration:"none" }}>
                    Descargar archivo →
                  </a>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal previsualización informe */}
      {previsualizando && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:1000,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:860,
            maxHeight:"92vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 25px 60px rgba(0,0,0,0.3)" }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"14px 20px", borderBottom:"1px solid #e2e8f0", background:"#f8fafc", borderRadius:"16px 16px 0 0" }}>
              <div>
                <span style={{ fontSize:14, fontWeight:700, color:"#1e293b" }}>
                  Informe {previsualizando.tipo} — {(previsualizando.datos_json||{}).obra_nombre||""}
                </span>
                <span style={{ fontSize:11, color:"#94a3b8", marginLeft:10 }}>
                  {previsualizando.periodo_desde} {previsualizando.periodo_hasta ? "→ " + previsualizando.periodo_hasta : ""}
                </span>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>{
                  const html = generarHtmlInforme(previsualizando);
                  const w = window.open("","_blank");
                  w.document.write(html); w.document.close(); w.focus();
                  setTimeout(()=>w.print(), 400);
                }} style={{ background:"#6366f1", color:"#fff", border:"none", borderRadius:8,
                  padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  🖨️ Imprimir
                </button>
                <button onClick={()=>setPrevisualizando(null)}
                  style={{ background:"#f1f5f9", color:"#64748b", border:"none", borderRadius:8,
                    padding:"6px 12px", fontSize:13, cursor:"pointer", fontWeight:700 }}>✕</button>
              </div>
            </div>
            {/* iframe preview */}
            <iframe
              srcDoc={generarHtmlInforme(previsualizando)}
              style={{ flex:1, border:"none", width:"100%" }}
              title="preview-informe"
            />
          </div>
        </div>
      )}

      {/* Modals */}
      {mDoc  && <ModalDoc      obraId={obraId} catInicial={catActiva} onClose={()=>setMDoc(false)}
                  onSave={d=>{ setDocs(p=>[d,...p]); setMDoc(false); }}/>}
      {mPago && <ModalPago     obraId={obraId} obraMontoContrato={obra?.monto_contrato} onClose={()=>setMPago(false)}
                  onSave={p=>{ setPagos(prev=>[p,...prev]); setMPago(false); }}/>}
      {mGar  && <ModalGarantia obraId={obraId} onClose={()=>setMGar(false)}
                  onSave={g=>{ setGarantias(prev=>[...prev,g].sort((a,b)=>new Date(a.fecha_vencimiento)-new Date(b.fecha_vencimiento))); setMGar(false); }}/>}
      {mBit  && <ModalBitacora obraId={obraId} userId={userId} onClose={()=>setMBit(false)}
                  onSave={(b,newAnexos)=>{
                    setBitacora(prev=>[b,...prev]);
                    if(newAnexos?.length>0){
                      setAnexos(prev=>({...prev,[b.id]:newAnexos}));
                    }
                    setMBit(false);
                  }}/>}
      {mMod&&<ModalModificacion obraId={obraId} onClose={()=>setMMod(false)}
        onSave={data=>{ setModificaciones(p=>[...p,data]); setMMod(false); }}/>}
      {mRec&&<ModalRecepcion obraId={obraId} onClose={()=>setMRec(false)}
        onSave={data=>{ setRecepciones(p=>[data,...p]); setMRec(false); }}/>}
      {mInforme&&<ModalInforme obra={obra} presupuesto={presupuesto} pagos={pagos} fotos={fotos}
        onClose={()=>setMInforme(false)}
        onSave={async(data)=>{
          const { data:saved } = await supabase.from("obra_informes").insert([{ obra_id: obraId, ...data }]).select().single();
          if (saved) setInformes(p=>[saved,...p]);
          setMInforme(false);
        }}/>}
      {mFoto && <ModalFotos    obraId={obraId} onClose={()=>setMFoto(false)}
                  onSave={f=>{ setFotos(prev=>[f,...prev]); }}/>}
      {mPresupuesto && <ModalPresupuesto obraId={obraId} onClose={()=>setMPresupuesto(false)}
                  onSave={items=>{ setPresupuesto(items); setMPresupuesto(false); }}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════════════════════════════════════
function ModalDoc({ obraId, catInicial, onClose, onSave }) {
  const [form,setForm]=useState({ categoria:catInicial||"Actas",nombre:"",descripcion:"",fecha:"" });
  const [file,setFile]=useState(null); const [saving,setSaving]=useState(false); const [err,setErr]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const save=async()=>{
    if(!form.nombre.trim())return; setSaving(true); setErr("");
    let archivo_url=null,archivo_nombre=null,archivo_size=null;
    if(file){ const r=await uploadFile(obraId,"docs",file); if(r.error){setErr("Error: "+r.error);setSaving(false);return;} archivo_url=r.url;archivo_nombre=r.nombre;archivo_size=file.size; }
    const{data,error}=await supabase.from("obra_documentos").insert({obra_id:obraId,...form,archivo_url,archivo_nombre,archivo_size}).select().single();
    setSaving(false); if(error){setErr(error.message);return;} onSave(data);
  };
  return(
    <Modal title="📄 Agregar Documento" onClose={onClose}>
      <div style={{display:"grid",gap:14}}>
        <InputRow label="Categoría"><select value={form.categoria} onChange={e=>set("categoria",e.target.value)} style={selectSt}>{CATEGORIAS_DOCS.map(c=><option key={c} value={c}>{c}</option>)}</select></InputRow>
        <InputRow label="Nombre del documento"><input autoFocus value={form.nombre} onChange={e=>set("nombre",e.target.value)} style={inputSt} placeholder="Ej: Acta de Inicio N°1"/></InputRow>
        <InputRow label="Descripción (opcional)"><input value={form.descripcion} onChange={e=>set("descripcion",e.target.value)} style={inputSt}/></InputRow>
        <InputRow label="Fecha"><input type="date" value={form.fecha} onChange={e=>set("fecha",e.target.value)} style={inputSt}/></InputRow>
        <InputRow label="Archivo adjunto"><FileDropZone id="doc-file" file={file} setFile={setFile}/></InputRow>
        {err&&<p style={{fontSize:11,color:"#ef4444",margin:0}}>{err}</p>}
        <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!form.nombre.trim()}/>
      </div>
    </Modal>
  );
}

function ModalPago({ obraId, obraMontoContrato, onClose, onSave }) {
  const [form,setForm]=useState({nombre:"",tipo:"Estado de Pago",fecha:"",monto:"",numero_oficio:"",numero_estado_pago:"",unidad_pago:""});
  const [file,setFile]=useState(null);
  const [saving,setSaving]=useState(false);
  const [leyendo,setLeyendo]=useState(false);
  const [partidas,setPartidas]=useState([]);
  const [epMeta,setEpMeta]=useState(null);
  const [epError,setEpError]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const isExcel = file && (file.name.endsWith(".xlsx")||file.name.endsWith(".xls"));

  const leerExcel = async (f) => {
    if (!f || !(f.name.endsWith(".xlsx")||f.name.endsWith(".xls"))) return;
    setLeyendo(true); setEpError(""); setPartidas([]); setEpMeta(null);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch("/api/procesar-ep-excel", { method:"POST", body:fd });
      const data = await res.json();
      if (data.error) { setEpError(data.error); setLeyendo(false); return; }
      const m = data.meta;
      setEpMeta(m);
      // Auto-fill todos los campos extraídos
      if (m.nombreSugerido) set("nombre", m.nombreSugerido);
      if (m.numeroEP)       set("numero_estado_pago", m.numeroEP);
      if (m.fecha)          set("fecha", m.fecha);
      if (m.monto)          set("monto", String(Math.round(m.monto)));
      if (data.partidas?.length) setPartidas(data.partidas);
    } catch(e) { setEpError(e.message); }
    setLeyendo(false);
  };

  const handleFile = (f) => { setFile(f); leerExcel(f); };

  const save = async () => {
    if (!form.nombre.trim()) return; setSaving(true);
    let archivo_url=null, archivo_nombre=null;
    if (file) {
      const r = await uploadFile(obraId,"pagos",file);
      if (!r.error) { archivo_url=r.url; archivo_nombre=r.nombre; }
    }
    const partidas_json = partidas.length ? JSON.stringify(partidas) : null;
    const {data,error} = await supabase.from("obra_estados_pago")
      .insert({obra_id:obraId,...form, monto:form.monto?parseFloat(String(form.monto).replace(/\./g,"").replace(",",".")):null,
        archivo_url, archivo_nombre, partidas_json})
      .select().single();
    setSaving(false);
    if (!error && data) onSave(data);
  };

  const fmtN  = v => v ? "$"+Math.round(v).toLocaleString("es-CL") : "—";
  const fmtPct= v => v != null ? v.toFixed(2)+"%" : "—";
  const hasPartidas        = partidas.length > 0;
  const hasMontosActuales  = partidas.some(p=>p.monto_actual);
  const hasAvancePct       = partidas.some(p=>p.avance_pct!=null);
  const hasColumnaAnterior = partidas.some(p=>p.monto_anterior!=null);
  const totalEP      = epMeta?.monto || partidas.reduce((s,p)=>s+(p.monto_actual||0),0);
  const totalProy    = epMeta?.totalProyecto;
  const pctAvance    = epMeta?.porcentajeAvance ?? (totalEP&&totalProy ? Math.round(totalEP/totalProy*10000)/100 : null);
  // Porcentaje calculado contra el monto de contrato de la obra si se pasó
  const pctConMonto  = obraMontoContrato && totalEP ? Math.round(totalEP/obraMontoContrato*10000)/100 : null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:60, display:"flex", alignItems:"center",
      justifyContent:"center", padding:16, backdropFilter:"blur(6px)", background:"rgba(0,0,0,.4)" }}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%",
        maxWidth: hasPartidas ? 980 : 560,
        boxShadow:"0 24px 60px rgba(0,0,0,.25)", maxHeight:"92vh",
        display:"flex", flexDirection:"column", overflow:"hidden",
        transition:"max-width .3s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"20px 24px 16px", borderBottom:"1px solid #f1f5f9", flexShrink:0 }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>
            💰 Estado de Pago
            {hasPartidas && <span style={{ fontSize:11, fontWeight:500, color:"#6366f1",
              marginLeft:10, background:"#eef2ff", padding:"2px 8px", borderRadius:99 }}>
              {partidas.length} partidas leídas ✓
            </span>}
          </h3>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", borderRadius:8,
            width:28, height:28, cursor:"pointer", fontSize:13, color:"#64748b" }}>✕</button>
        </div>

        {/* Body — dos columnas cuando hay partidas */}
        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

          {/* Panel izquierdo — formulario */}
          <div style={{ flex:"0 0 auto", width: hasPartidas ? 340 : "100%",
            padding:"20px 24px", overflowY:"auto",
            borderRight: hasPartidas ? "1px solid #f1f5f9" : "none" }}>
            <div style={{ display:"grid", gap:13 }}>

              <InputRow label="Nombre">
                <input autoFocus value={form.nombre} onChange={e=>set("nombre",e.target.value)}
                  style={inputSt} placeholder="Ej: Estado de Pago N°1"/>
              </InputRow>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <InputRow label="Tipo">
                  <select value={form.tipo} onChange={e=>set("tipo",e.target.value)} style={selectSt}>
                    {TIPOS_EP.map(t=><option key={t}>{t}</option>)}
                  </select>
                </InputRow>
                <InputRow label="Fecha">
                  <input type="date" value={form.fecha} onChange={e=>set("fecha",e.target.value)} style={inputSt}/>
                </InputRow>
                <InputRow label="Monto ($)">
                  <input value={form.monto} onChange={e=>set("monto",e.target.value)} style={inputSt} placeholder="0"/>
                </InputRow>
                <InputRow label="Unidad de Pago">
                  <input value={form.unidad_pago} onChange={e=>set("unidad_pago",e.target.value)} style={inputSt}/>
                </InputRow>
                <InputRow label="N° Estado de Pago">
                  <input value={form.numero_estado_pago} onChange={e=>set("numero_estado_pago",e.target.value)} style={inputSt}/>
                </InputRow>
                <InputRow label="N° Oficio">
                  <input value={form.numero_oficio} onChange={e=>set("numero_oficio",e.target.value)} style={inputSt}/>
                </InputRow>
              </div>

              {/* Zona de archivo */}
              <InputRow label="Archivo adjunto (Excel o PDF)">
                <div style={{ border:"2px dashed #e2e8f0", borderRadius:10, padding:"14px 12px",
                  background:"#fafafa", cursor:"pointer", textAlign:"center",
                  transition:"border-color .15s, background .15s" }}
                  onClick={()=>document.getElementById("pago-file-inp").click()}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#6366f1";e.currentTarget.style.background="#eef2ff";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.background="#fafafa";}}>
                  <input id="pago-file-inp" type="file" accept=".xlsx,.xls,.pdf"
                    style={{display:"none"}} onChange={e=>handleFile(e.target.files?.[0]||null)}/>
                  {file ? (
                    <div>
                      <div style={{fontSize:20,marginBottom:3}}>{isExcel?"📊":"📄"}</div>
                      <p style={{fontSize:11,fontWeight:700,color:"#4338ca",margin:0}}>{file.name}</p>
                      {leyendo && <p style={{fontSize:10,color:"#6366f1",margin:"4px 0 0"}}>⏳ Leyendo datos…</p>}
                    </div>
                  ) : (
                    <div>
                      <div style={{fontSize:22,marginBottom:4}}>📂</div>
                      <p style={{fontSize:11,color:"#94a3b8",margin:0}}>
                        <strong>Excel</strong> → lee partidas automáticamente<br/>
                        <span style={{fontSize:10}}>.xlsx · .xls · .pdf</span>
                      </p>
                    </div>
                  )}
                </div>
              </InputRow>

              {epError && (
                <div style={{background:"#fff5f5",border:"1px solid #fca5a5",borderRadius:8,
                  padding:"8px 12px",fontSize:11,color:"#b91c1c"}}>⚠️ {epError}</div>
              )}

              {/* Resumen extraído del Excel */}
              {hasPartidas && (
                <div style={{background:"#eef2ff",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 14px"}}>
                  <p style={{fontSize:11,fontWeight:700,color:"#4338ca",margin:"0 0 8px",textTransform:"uppercase",letterSpacing:".04em"}}>
                    📊 Resumen extraído
                  </p>
                  {epMeta?.contratista && (
                    <div style={{fontSize:11,color:"#374151",marginBottom:8,paddingBottom:8,borderBottom:"1px solid #eef2ff"}}>
                      🏢 <strong>{epMeta.contratista}</strong>
                    </div>
                  )}
                  {[
                    totalProy    && ["Total proyecto",    fmtN(totalProy),  false],
                    totalEP      && ["Este EP",           fmtN(totalEP),    true ],
                    pctAvance    && ["% Avance (EP/Proy)",fmtPct(pctAvance),true ],
                    pctConMonto  && ["% Avance (s/contrato)", fmtPct(pctConMonto), false],
                  ].filter(Boolean).map(([lbl,val,bold])=>(
                    <div key={lbl} style={{display:"flex",justifyContent:"space-between",
                      fontSize:12,padding:"4px 0",borderBottom:"1px solid #eef2ff"}}>
                      <span style={{color:"#374151"}}>{lbl}</span>
                      <span style={{fontWeight:bold?700:500,color:bold?"#6366f1":"#374151"}}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botones */}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button onClick={save} disabled={saving||!form.nombre.trim()}
                style={{flex:1,background:"#6366f1",color:"#fff",border:"none",borderRadius:12,
                  padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer",
                  opacity:!form.nombre.trim()?0.5:1,fontFamily:"inherit"}}>
                {saving?"Guardando…":"Guardar →"}
              </button>
              <button onClick={onClose}
                style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:12,
                  padding:"11px 16px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                Cancelar
              </button>
            </div>
          </div>

          {/* Panel derecho — tabla de partidas */}
          {hasPartidas && (
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px",background:"#fafafa"}}>
              <p style={{fontSize:12,fontWeight:700,color:"#4338ca",margin:"0 0 12px",
                textTransform:"uppercase",letterSpacing:".05em"}}>
                📋 Desglose de Partidas
              </p>
              <div style={{border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden",background:"#fff"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead style={{background:"#eef2ff"}}>
                    <tr>
                      {["Ítem","Descripción","Un.","Cant.","V. Unit.","V. Total",
                        ...(hasAvancePct?["Av. %"]:  []),
                        "Av. $"
                      ].map((h,i)=>(
                        <th key={i} style={{padding:"8px 10px",fontWeight:700,color:"#4338ca",
                          textAlign:i>=3?"right":"left",borderBottom:"1px solid #eef2ff",
                          whiteSpace:"nowrap",fontSize:10}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {partidas.map((p,i)=>(
                      <tr key={i} style={{background:i%2===0?"#fff":"#f9fafb",
                        borderBottom:"1px solid #f1f5f9"}}>
                        <td style={{padding:"6px 10px",color:"#94a3b8",whiteSpace:"nowrap",fontSize:10}}>{p.item}</td>
                        <td style={{padding:"6px 10px",color:"#1e293b",maxWidth:220,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                          title={p.partida}>{p.partida}</td>
                        <td style={{padding:"6px 10px",color:"#64748b"}}>{p.unidad}</td>
                        <td style={{padding:"6px 10px",textAlign:"right",color:"#64748b"}}>
                          {p.cantidad??""}</td>
                        <td style={{padding:"6px 10px",textAlign:"right",color:"#64748b"}}>
                          {p.precio_unitario?fmtN(p.precio_unitario):""}</td>
                        <td style={{padding:"6px 10px",textAlign:"right",color:"#64748b"}}>
                          {p.monto_contrato?fmtN(p.monto_contrato):""}</td>
                        {hasAvancePct && (
                          <td style={{padding:"6px 10px",textAlign:"right",
                            color: p.avance_pct===100?"#6366f1":p.avance_pct>0?"#f59e0b":"#cbd5e1",
                            fontWeight:600}}>
                            {p.avance_pct!=null ? p.avance_pct===100?"✓":p.avance_pct+"%": "—"}
                          </td>
                        )}
                        <td style={{padding:"6px 10px",textAlign:"right",fontWeight:600,
                          color:p.monto_actual?"#6366f1":"#cbd5e1"}}>
                          {p.monto_actual?fmtN(p.monto_actual):"—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {hasMontosActuales && (
                    <tfoot style={{background:"#eef2ff",borderTop:"2px solid #eef2ff"}}>
                      <tr>
                        <td colSpan={hasAvancePct?6:5}
                          style={{padding:"8px 10px",fontWeight:700,color:"#4338ca",fontSize:12}}>
                          TOTAL EP
                        </td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#6366f1",fontSize:13}}>
                          {fmtN(partidas.reduce((s,p)=>s+(p.monto_actual||0),0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalGarantia({ obraId, onClose, onSave }) {
  const [form,setForm]=useState({tipo:"Fiel Cumplimiento",descripcion:"",monto:"",entidad:"",numero_documento:"",fecha_emision:"",fecha_vencimiento:"",estado:"Vigente"});
  const [saving,setSaving]=useState(false); const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const save=async()=>{
    setSaving(true);
    const{data,error}=await supabase.from("obra_garantias").insert({obra_id:obraId,...form,monto:form.monto?parseFloat(form.monto):null}).select().single();
    setSaving(false); if(!error&&data) onSave(data);
  };
  return(
    <Modal title="🔒 Nueva Garantía" onClose={onClose}>
      <div style={{display:"grid",gap:14}}>
        <InputRow label="Tipo"><select value={form.tipo} onChange={e=>set("tipo",e.target.value)} style={selectSt}>{TIPOS_GAR.map(t=><option key={t}>{t}</option>)}</select></InputRow>
        <Grid cols={2}>
          <InputRow label="Entidad (Banco)"><input autoFocus value={form.entidad} onChange={e=>set("entidad",e.target.value)} style={inputSt}/></InputRow>
          <InputRow label="N° Documento"><input value={form.numero_documento} onChange={e=>set("numero_documento",e.target.value)} style={inputSt}/></InputRow>
          <InputRow label="Monto ($)"><input type="number" value={form.monto} onChange={e=>set("monto",e.target.value)} style={inputSt} placeholder="0"/></InputRow>
          <InputRow label="Estado"><select value={form.estado} onChange={e=>set("estado",e.target.value)} style={selectSt}>{["Vigente","Vencida","Ejecutada","Devuelta"].map(s=><option key={s}>{s}</option>)}</select></InputRow>
          <InputRow label="Fecha Emisión"><input type="date" value={form.fecha_emision} onChange={e=>set("fecha_emision",e.target.value)} style={inputSt}/></InputRow>
          <InputRow label="Fecha Vencimiento"><input type="date" value={form.fecha_vencimiento} onChange={e=>set("fecha_vencimiento",e.target.value)} style={inputSt}/></InputRow>
        </Grid>
        <InputRow label="Descripción"><input value={form.descripcion} onChange={e=>set("descripcion",e.target.value)} style={inputSt}/></InputRow>
        <ModalActions onClose={onClose} onSave={save} saving={saving}/>
      </div>
    </Modal>
  );
}

function ModalBitacora({ obraId, userId, onClose, onSave }) {
  const [form,setForm]=useState({tipo:"Observación",descripcion:"",fecha:new Date().toISOString().split("T")[0],autor:""});
  const [files,setFiles]=useState([]);
  const [saving,setSaving]=useState(false);
  const [prog,setProg]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const save=async()=>{
    if(!form.descripcion.trim())return;
    setSaving(true);
    const{data,error}=await supabase.from("obra_bitacora").insert({obra_id:obraId,user_id:userId,...form}).select().single();
    if(!error&&data){
      const newAnexos=[];
      if(files.length>0){
        for(let i=0;i<files.length;i++){
          const f=files[i];
          setProg(`Subiendo archivo ${i+1}/${files.length}…`);
          const res=await uploadFile(obraId,"bitacora_anexos",f);
          if(!res.error){
            const{data:a}=await supabase.from("obra_bitacora_anexos").insert({
              bitacora_id:data.id, url:res.url, nombre:f.name,
              tipo:f.type.startsWith("image/")?"foto":"documento",
            }).select().single();
            if(a) newAnexos.push(a);
          }
        }
        setProg("");
      }
      setSaving(false);
      onSave(data, newAnexos);
    } else {
      setSaving(false);
    }
  };
  return(
    <Modal title="📖 Nueva Entrada Bitácora" onClose={onClose}>
      <div style={{display:"grid",gap:14}}>
        <InputRow label="Tipo">
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {TIPOS_BIT.map(t=>(
              <button key={t} onClick={()=>set("tipo",t)}
                style={{padding:"5px 11px",borderRadius:99,fontSize:11,fontWeight:600,
                  border:form.tipo===t?"1.5px solid #6366f1":"1.5px solid #e2e8f0",
                  background:form.tipo===t?"#eef2ff":"#fff",color:form.tipo===t?"#4338ca":"#64748b",
                  cursor:"pointer",fontFamily:"inherit"}}>{t}</button>
            ))}
          </div>
        </InputRow>
        <Grid cols={2}>
          <InputRow label="Fecha"><input type="date" value={form.fecha} onChange={e=>set("fecha",e.target.value)} style={inputSt}/></InputRow>
          <InputRow label="Autor"><input value={form.autor} onChange={e=>set("autor",e.target.value)} style={inputSt} placeholder="Responsable"/></InputRow>
        </Grid>
        <InputRow label="Descripción">
          <textarea autoFocus value={form.descripcion} onChange={e=>set("descripcion",e.target.value)}
            rows={4} placeholder="Descripción del evento..."
            style={{...inputSt,resize:"vertical",lineHeight:1.6}}/>
        </InputRow>
        <InputRow label="Anexos (opcional)">
          <div style={{border:"2px dashed #e2e8f0",borderRadius:12,padding:"16px",
            background:"#fafafa",cursor:"pointer",textAlign:"center"}}
            onClick={()=>document.getElementById("anexo-input").click()}>
            <input id="anexo-input" type="file" multiple style={{display:"none"}}
              onChange={e=>setFiles(Array.from(e.target.files))}/>
            {files.length>0?(
              <div>
                <div style={{fontSize:18,marginBottom:4}}>📎</div>
                <p style={{fontSize:12,fontWeight:600,color:"#4338ca",margin:0}}>
                  {files.length} archivo{files.length>1?"s":""} seleccionado{files.length>1?"s":""}
                </p>
                <p style={{fontSize:9,color:"#94a3b8",margin:"3px 0 0",wordBreak:"break-word"}}>
                  {files.map(f=>f.name).join(", ")}
                </p>
              </div>
            ):(
              <div>
                <div style={{fontSize:20,marginBottom:4}}>📁</div>
                <p style={{fontSize:11,color:"#94a3b8",margin:0}}>
                  Fotos, PDFs, docs<br/>
                  <span style={{fontSize:9}}>Click para subir anexos</span>
                </p>
              </div>
            )}
          </div>
        </InputRow>
        {prog&&<p style={{fontSize:11,color:"#6366f1",margin:0}}>⏳ {prog}</p>}
        <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!form.descripcion.trim()}/>
      </div>
    </Modal>
  );
}

function ModalFotos({ obraId, onClose, onSave }) {
  const [files,setFiles]=useState([]); const [caption,setCaption]=useState("");
  const [saving,setSaving]=useState(false); const [prog,setProg]=useState("");
  const save=async()=>{
    if(files.length===0)return; setSaving(true);
    for(let i=0;i<files.length;i++){
      const f=files[i]; setProg(`Subiendo ${i+1}/${files.length}…`);
      const res=await uploadFile(obraId,"fotos",f);
      if(!res.error){
        const{data}=await supabase.from("obra_fotos").insert({
          obra_id:obraId,url:res.url,nombre:f.name,caption:files.length===1?caption:"",
        }).select().single();
        if(data) onSave(data);
      }
    }
    setSaving(false); onClose();
  };
  return(
    <Modal title="📸 Subir Fotos" onClose={onClose}>
      <div style={{display:"grid",gap:14}}>
        <div style={{border:"2px dashed #e2e8f0",borderRadius:12,padding:"24px",
          background:"#fafafa",cursor:"pointer",textAlign:"center"}}
          onClick={()=>document.getElementById("foto-input").click()}>
          <input id="foto-input" type="file" multiple style={{display:"none"}}
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={e=>setFiles(Array.from(e.target.files))}/>
          {files.length>0?(
            <div>
              <div style={{fontSize:22,marginBottom:4}}>🖼️</div>
              <p style={{fontSize:13,fontWeight:600,color:"#4338ca",margin:0}}>
                {files.length} foto{files.length>1?"s":""} seleccionada{files.length>1?"s":""}
              </p>
              <p style={{fontSize:10,color:"#94a3b8",margin:"3px 0 0"}}>{files.map(f=>f.name).join(", ")}</p>
            </div>
          ):(
            <div>
              <div style={{fontSize:28,marginBottom:6}}>📷</div>
              <p style={{fontSize:12,color:"#94a3b8",margin:0}}>
                Click para seleccionar fotos<br/>
                <span style={{fontSize:10}}>JPG, PNG, WEBP — puedes elegir varias a la vez</span>
              </p>
            </div>
          )}
        </div>
        {files.length===1&&(
          <InputRow label="Descripción (opcional)">
            <input value={caption} onChange={e=>setCaption(e.target.value)} style={inputSt}
              placeholder="Ej: Avance semana 3 — sector norte"/>
          </InputRow>
        )}
        {prog&&<p style={{fontSize:11,color:"#6366f1",margin:0}}>⏳ {prog}</p>}
        <ModalActions onClose={onClose} onSave={save} saving={saving}
          disabled={files.length===0} label={`Subir ${files.length||""}foto${files.length!==1?"s":""} →`}/>
      </div>
    </Modal>
  );
}

function ResumenFinanciero({ presupuesto }) {
  const cd    = presupuesto.reduce((s,p) => s + (p.valor_total||0), 0);
  const gg    = cd * 0.25;
  const ut    = cd * 0.15;
  const neto  = cd + gg + ut;
  const iva   = neto * 0.19;
  const total = neto + iva;
  const fmtN  = v => "$" + Math.round(v).toLocaleString("es-CL");
  const filas = [
    { label:"Costo Directo",          val:cd,    bold:false },
    { label:"Gastos Generales (25%)", val:gg,    bold:false },
    { label:"Utilidades (15%)",       val:ut,    bold:false },
    { label:"Costo Neto",             val:neto,  bold:true  },
    { label:"IVA (19%)",              val:iva,   bold:false },
  ];
  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14,
      padding:"18px 22px", marginTop:8 }}>
      <h3 style={{ fontSize:12, fontWeight:700, color:"#4338ca", margin:"0 0 12px",
        textTransform:"uppercase", letterSpacing:".05em" }}>📊 Resumen Financiero</h3>
      {filas.map(({label,val,bold}) => (
        <div key={label} style={{ display:"flex", justifyContent:"space-between",
          padding:"8px 0", borderBottom:"1px solid #f1f5f9" }}>
          <span style={{ fontSize:13, color:"#374151", fontWeight:bold?700:400 }}>{label}</span>
          <span style={{ fontSize:13, fontWeight:bold?700:500, color:"#1e293b" }}>{fmtN(val)}</span>
        </div>
      ))}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        paddingTop:12, marginTop:4 }}>
        <span style={{ fontSize:15, fontWeight:800, color:"#4338ca" }}>TOTAL</span>
        <span style={{ fontSize:20, fontWeight:800, color:"#6366f1" }}>{fmtN(total)}</span>
      </div>
    </div>
  );
}

function ModalPresupuesto({ obraId, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [prog, setProg] = useState("");
  const [preview, setPreview] = useState(null); // items antes de guardar
  const [error, setError] = useState("");

  const isExcel = file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"));
  const isPDF   = file && file.name.endsWith(".pdf");

  const procesar = async () => {
    if (!file) return;
    setSaving(true);
    setError("");
    setPreview(null);
    try {
      let data;
      if (isExcel) {
        setProg("Leyendo Excel…");
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/procesar-presupuesto-excel", { method:"POST", body:formData });
        if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||"Error al procesar Excel"); }
        data = await res.json();
      } else {
        setProg("Analizando PDF…");
        data = await extractBudgetFromPDF(file);
      }

      if (!data.items || data.items.length === 0) {
        setError("No se encontraron partidas. Revisa el formato del archivo.");
        setSaving(false); setProg(""); return;
      }

      setPreview(data.items);
      setProg("");
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const guardar = async () => {
    if (!preview) return;
    setSaving(true);
    setProg("Guardando partidas…");
    // Borrar presupuesto anterior
    await supabase.from("obra_presupuesto").delete().eq("obra_id", obraId);
    // Insertar nuevas partidas en lotes de 50
    const items = preview.map((item,idx) => ({ ...item, obra_id:obraId, orden:idx+1 }));
    const batchSize = 50;
    let all = [];
    for (let i=0; i<items.length; i+=batchSize) {
      const { data:saved } = await supabase.from("obra_presupuesto").insert(items.slice(i,i+batchSize)).select();
      if (saved) all = [...all, ...saved];
    }
    setProg(""); setSaving(false);
    onSave(all);
  };

  return (
    <Modal title="💰 Importar Presupuesto" onClose={onClose}>
      <div style={{ display:"grid", gap:14, minWidth:460 }}>

        {!preview ? (
          <>
            {/* Zona de drop */}
            <div style={{ border:"2px dashed #e2e8f0", borderRadius:12, padding:"28px 20px",
              background:"#fafafa", cursor:"pointer", textAlign:"center",
              transition:"border-color .15s, background .15s" }}
              onClick={()=>document.getElementById("presupuesto-input").click()}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="#6366f1"; e.currentTarget.style.background="#eef2ff"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.background="#fafafa"; }}>
              <input id="presupuesto-input" type="file"
                accept=".xlsx,.xls,.pdf"
                style={{ display:"none" }}
                onChange={e=>{ setFile(e.target.files?.[0]||null); setError(""); setPreview(null); }}/>
              {file ? (
                <div>
                  <div style={{ fontSize:28, marginBottom:6 }}>{isExcel?"📊":"📄"}</div>
                  <p style={{ fontSize:13, fontWeight:700, color:"#4338ca", margin:0 }}>{file.name}</p>
                  <p style={{ fontSize:11, color:"#94a3b8", margin:"4px 0 0" }}>
                    {isExcel ? "Excel detectado — extracción automática de partidas" : "PDF detectado — extracción por texto"}
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:36, marginBottom:8 }}>📂</div>
                  <p style={{ fontSize:13, fontWeight:600, color:"#374151", margin:"0 0 6px" }}>
                    Selecciona tu presupuesto
                  </p>
                  <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
                    {[["📊","Excel .xlsx","Recomendado","#eef2ff","#4338ca"],
                      ["📄","PDF","Texto extraíble","#dbeafe","#1d4ed8"]].map(([ic,lb,sub,bg,col])=>(
                      <div key={lb} style={{ background:bg, color:col, borderRadius:8, padding:"6px 12px",
                        fontSize:11, fontWeight:600 }}>{ic} {lb} <span style={{ opacity:.7 }}>· {sub}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tip Excel */}
            {isExcel && (
              <div style={{ background:"#eef2ff", border:"1px solid #bbf7d0", borderRadius:10, padding:"10px 14px",
                fontSize:12, color:"#4338ca" }}>
                ✅ <strong>Excel detectado.</strong> La app leerá automáticamente: Ítem, Partida, Unidad,
                Cantidad, Valor Unitario y Valor Total. Si no hay valores ingresados, los podrás editar
                directamente en la tabla después de importar.
              </div>
            )}

            {error && (
              <div style={{ background:"#fff5f5", border:"1px solid #fca5a5", borderRadius:10,
                padding:"10px 14px", fontSize:12, color:"#b91c1c" }}>
                ⚠️ {error}
              </div>
            )}

            {prog && <p style={{ fontSize:11, color:"#6366f1", margin:0, textAlign:"center" }}>⏳ {prog}</p>}

            <ModalActions onClose={onClose} onSave={procesar} saving={saving}
              disabled={!file} label={saving ? "Procesando…" : "Procesar →"}/>
          </>
        ) : (
          <>
            {/* Vista previa de partidas */}
            <div style={{ background:"#eef2ff", border:"1px solid #bbf7d0", borderRadius:10,
              padding:"10px 14px", fontSize:12, color:"#4338ca" }}>
              ✅ Se encontraron <strong>{preview.length} partidas</strong> en {[...new Set(preview.map(p=>p.seccion))].length} secciones.
              {preview.every(p=>!p.valor_total) && " Los valores están en blanco — podrás editarlos en la tabla."}
            </div>

            {/* Preview tabla */}
            <div style={{ maxHeight:280, overflowY:"auto", border:"1px solid #e2e8f0", borderRadius:10 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead style={{ background:"#f9fafb", position:"sticky", top:0 }}>
                  <tr>
                    {["Ítem","Partida","Un.","Cantidad","V. Unitario","V. Total"].map(h=>(
                      <th key={h} style={{ padding:"7px 10px", fontWeight:600, color:"#64748b",
                        textAlign:"left", borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0,50).map((p,i)=>(
                    <tr key={i} style={{ background:i%2===0?"#fff":"#f9fafb", borderBottom:"1px solid #f1f5f9" }}>
                      <td style={{ padding:"6px 10px", color:"#94a3b8" }}>{p.item}</td>
                      <td style={{ padding:"6px 10px", color:"#1e293b", maxWidth:220,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.partida}</td>
                      <td style={{ padding:"6px 10px", color:"#64748b" }}>{p.unidad}</td>
                      <td style={{ padding:"6px 10px", textAlign:"right", color:"#64748b" }}>{p.cantidad??""}</td>
                      <td style={{ padding:"6px 10px", textAlign:"right", color:"#64748b" }}>
                        {p.valor_unitario ? "$"+Math.round(p.valor_unitario).toLocaleString("es-CL") : ""}
                      </td>
                      <td style={{ padding:"6px 10px", textAlign:"right", fontWeight:600, color:"#6366f1" }}>
                        {p.valor_total ? "$"+Math.round(p.valor_total).toLocaleString("es-CL") : "—"}
                      </td>
                    </tr>
                  ))}
                  {preview.length>50 && (
                    <tr><td colSpan={6} style={{ padding:"8px", textAlign:"center",
                      color:"#94a3b8", fontSize:11 }}>…y {preview.length-50} partidas más</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{ setPreview(null); setFile(null); }}
                style={{ background:"#f1f5f9", color:"#64748b", border:"none", borderRadius:10,
                  padding:"11px 16px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                ← Cambiar archivo
              </button>
              <button onClick={guardar} disabled={saving}
                style={{ flex:1, background:"#6366f1", color:"#fff", border:"none", borderRadius:10,
                  padding:"11px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                  opacity: saving?0.7:1 }}>
                {saving ? "⏳ Guardando…" : `✅ Importar ${preview.length} partidas →`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

class ObraErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div style={{padding:40,fontFamily:"monospace",color:"#ef4444",whiteSpace:"pre-wrap"}}>
        <h2>Error en página de obra</h2>
        <p>{this.state.error?.message}</p>
        <pre style={{fontSize:11,color:"#64748b",maxHeight:400,overflow:"auto"}}>{this.state.error?.stack}</pre>
        <button onClick={()=>window.location.reload()} style={{marginTop:16,padding:"8px 16px",background:"#4338ca",color:"#fff",border:"none",borderRadius:8,cursor:"pointer"}}>Recargar</button>
      </div>
    );
    return this.props.children;
  }
}

function ObraPage() {
  return (
    <ObraErrorBoundary>
      <Suspense fallback={<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#64748b"}}>Cargando obra…</div>}>
        <ObraDetail />
      </Suspense>
    </ObraErrorBoundary>
  );
}

export default ObraPage;
