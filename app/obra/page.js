"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useInactividad } from "../lib/useInactividad";
import { extractBudgetFromPDF } from "../lib/extractPresupuesto";

// ── Constantes ─────────────────────────────────────────────────────────────
const ESTADOS = ["En licitación", "En ejecución", "Paralizada", "Recepcionada", "Liquidada"];
const ESTADO_ST = {
  "En licitación": { bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  "En ejecución":  { bg: "#d1fae5", color: "#065f46", dot: "#059669" },
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
  Avance:      { bg:"#d1fae5", color:"#065f46" },
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
    h1 { color: #065f46; border-bottom: 2px solid #059669; padding-bottom: 10px; }
    .proyecto-info { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
    .entrada { page-break-inside: avoid; margin-bottom: 25px; border-left: 4px solid #059669; padding-left: 15px; }
    .entrada-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .tipo { display: inline-block; background: #d1fae5; color: #065f46; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
    .fecha-autor { color: #64748b; font-size: 13px; }
    .descripcion { margin: 10px 0; color: #374151; }
    .anexos { background: #f9fafb; padding: 10px; border-radius: 6px; margin-top: 10px; font-size: 12px; }
    .anexos strong { color: #059669; }
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
              { color:"#065f46", bg:"#d1fae5", label:`🟢 ${d}d` };
  return <span style={{ background:bg, color, fontSize:10, fontWeight:700,
    padding:"2px 8px", borderRadius:99, whiteSpace:"nowrap" }}>{label}</span>;
}
function ProgressBar({ pct, color="#059669", height=8 }) {
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
      background:file?"#f0fdf4":"#fafafa", cursor:"pointer" }}
      onClick={() => document.getElementById(id).click()}>
      <input id={id} type="file" style={{ display:"none" }} accept={accept}
        onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); }}/>
      {file ? (
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>📎</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#065f46" }}>{file.name}</div>
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
        style={{ flex:1, background:"#059669", color:"#fff", border:"none", borderRadius:12,
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
              style={{ position:"relative", background: isSelected ? "#059669" : isToday ? "#f0fdf4" : "transparent",
                color: isSelected ? "#fff" : isToday ? "#059669" : "#374151",
                border: isToday && !isSelected ? "1px solid #bbf7d0" : "1px solid transparent",
                borderRadius:6, padding:"4px 2px", fontSize:11, cursor: hasEntry ? "pointer" : "default",
                fontWeight: hasEntry ? 700 : 400 }}>
              {d}
              {hasEntry && (
                <span style={{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)",
                  width:4, height:4, borderRadius:"50%",
                  background: isSelected ? "#fff" : "#059669", display:"block" }}/>
              )}
            </button>
          );
        })}
      </div>
      {filtroFecha && (
        <button onClick={()=>setFiltroFecha(null)}
          style={{ marginTop:10, width:"100%", background:"#f0fdf4", color:"#059669",
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

  function generarDescripcion(partida, pct, estado) {
    const n = (partida || "").toLowerCase();
    const p = Math.round(pct || 0);
    const fin = estado === "Terminada";
    const ini = estado === "No iniciada";

    // Prefijos contextuales según avance
    const avStr = fin
      ? "Se completó el 100% de"
      : `Durante el período se avanzó un ${p}% en`;

    // Sufijo de estado
    const sufijo = fin
      ? " Los trabajos quedaron terminados y conformes a las especificaciones técnicas del proyecto."
      : ` Acumulando a la fecha un avance total de ${p}% respecto al total contratado. Trabajos en ejecución conforme a programa.`;

    if (n.includes("hormig")) {
      const dosif = n.match(/g\d+/i) ? n.match(/g\d+/i)[0].toUpperCase() : "";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizaron la totalidad de los trabajos de moldaje, colocación de armadura y vaciado de hormigón${dosif?" "+dosif:""}. Se verificó el correcto fraguado y curado del hormigón conforme a especificaciones técnicas. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la partida ${partida}. Se realizaron trabajos de moldaje, habilitación de armadura y vaciado de hormigón${dosif?" "+dosif:""}. Se verificó el nivelado, vibrado y curado correspondiente. ${sufijo}`;
    }
    if (n.includes("excav") || n.includes("movim") || n.includes("escarpe")) {
      return fin
        ? `Se completó el 100% de los trabajos de ${partida}. Se ejecutó la excavación y/o movimiento de tierras en su totalidad, incluyendo el perfilado de taludes, retiro y disposición del material excedente en botadero autorizado. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó el movimiento de tierras en el área correspondiente, con retiro y traslado del material al botadero designado. Se verificó la cota de fundación según lo indicado en proyecto.${sufijo}`;
    }
    if (n.includes("rellen") || n.includes("compac")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutó el relleno y compactación en la totalidad del área proyectada, en capas de 20 cm debidamente compactadas y controladas mediante ensayes de densidad in situ. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la partida ${partida}. Se colocó y compactó el material de relleno por capas según especificaciones, verificando la densidad requerida mediante ensayes en terreno.${sufijo}`;
    }
    if (n.includes("pintur") || n.includes("revestim")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó la preparación de superficies (lijado, masillado y limpieza), aplicándose la totalidad de manos de pintura/revestimiento indicadas en especificaciones técnicas. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la aplicación de ${partida}. Se prepararon las superficies y se aplicaron las manos de imprimación y terminación correspondientes en el área intervenida.${sufijo}`;
    }
    if (n.includes("cubierta") || n.includes("techo") || n.includes("teja") || n.includes("zinc")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló la totalidad de la cubierta incluyendo estructura de soporte, aislación, planchas y elementos de remate y evacuación de aguas lluvias. Se verificó la hermeticidad del sistema. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó la estructura de soporte y colocación de los elementos de cubierta en el área correspondiente, asegurando la correcta fijación y traslape.${sufijo}`;
    }
    if (n.includes("eléctri") || n.includes("electric") || n.includes("alumbr") || n.includes("luminaria")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó el tendido de ductos, cableado, conexionado y pruebas eléctricas de la totalidad de la instalación conforme a la normativa SEC vigente. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutó el tendido de ductos y conductores, fijación de elementos y conexionado parcial de los tableros y puntos de luz/fuerza correspondientes.${sufijo}`;
    }
    if (n.includes("instala") && (n.includes("agua") || n.includes("sanitari") || n.includes("cañer") || n.includes("alcan"))) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó el tendido de tuberías, uniones, pruebas de presión y desinfección de la red conforme a normativa MINVU/SEC vigente. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en las obras de ${partida}. Se instalaron tuberías, piezas especiales y se ejecutaron las uniones correspondientes. Se realizaron pruebas parciales de hermeticidad.${sufijo}`;
    }
    if (n.includes("muro") || n.includes("tabique") || n.includes("mamposter") || n.includes("albañil")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutó la totalidad de la mampostería/tabique, con colocación de elementos, aplomado, nivelación y sellado de juntas según planos de proyecto. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó la colocación y aplomado de los elementos en el área correspondiente, controlando geometría y verticalidad conforme a proyecto.${sufijo}`;
    }
    if (n.includes("cielo") || n.includes("plafón") || n.includes("plafon") || n.includes("cielo falso")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló la totalidad de la estructura metálica de soporte y paneles de cielo, con nivelación y terminaciones de borde según especificaciones. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutó la estructura de soporte y la fijación de paneles en el área intervenida.${sufijo}`;
    }
    if (n.includes("piso") || n.includes("pavim") || n.includes("cerám") || n.includes("baldos") || n.includes("porcelan")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutó la totalidad de la colocación del revestimiento de piso, incluyendo preparación de base, aplicación de adhesivo, nivelado y sellado de juntas. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la colocación de ${partida}. Se preparó la base de apoyo, se aplicó adhesivo y se instaló el revestimiento en el área correspondiente, verificando planeidad y alineamiento.${sufijo}`;
    }
    if (n.includes("ventana") || n.includes("puerta") || n.includes("carpint") || n.includes("marco")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó la instalación de la totalidad de los elementos de carpintería, incluyendo colocación, nivelación, fijación, sellado perimetral y prueba de funcionamiento. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se colocaron, nivelaron y fijaron los elementos correspondientes en los vanos indicados en proyecto.${sufijo}`;
    }
    if (n.includes("fundaci") || n.includes("zapata") || n.includes("radier") || n.includes("losa")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutaron la totalidad de los trabajos de preparación de subrasante, colocación de enfierradura y vaciado de hormigón. Se realizó el curado correspondiente y se verificaron las cotas según planos de fundaciones. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutaron trabajos de preparación de base, colocación de moldajes, habilitación de armaduras y vaciado de hormigón en la zona indicada.${sufijo}`;
    }
    if (n.includes("demolici") || n.includes("retiro") || n.includes("desmonte")) {
      return fin
        ? `Se completó el 100% de los trabajos de ${partida}. Se procedió al retiro controlado de la totalidad de los elementos indicados, con disposición del escombro en botadero autorizado y limpieza final del área. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se procedió al retiro y disposición controlada del material en el área asignada.${sufijo}`;
    }
    if (n.includes("aseo") || n.includes("limpieza")) {
      return fin
        ? `Se completó el 100% de las labores de ${partida}. Se realizó la limpieza general de la obra, retiro de escombros y materiales sobrantes, dejando el área en condiciones de entrega. Partida finalizada.`
        : `Durante el período se ejecutaron labores de ${partida} en el área intervenida, con retiro de escombros y materiales sobrantes acumulados.${sufijo}`;
    }
    // Fallback genérico mejorado
    return fin
      ? `Se completó el 100% de la partida "${partida}". Se ejecutaron la totalidad de los trabajos indicados en las especificaciones técnicas del proyecto, verificándose la correcta ejecución conforme a planos y normativa vigente. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida "${partida}". Se ejecutaron los trabajos correspondientes conforme a las especificaciones técnicas del proyecto y bajo la supervisión de la Inspección Técnica de Obras.${sufijo}`;
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
          background:"linear-gradient(135deg,#065f46,#059669)", borderRadius:"18px 18px 0 0" }}>
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
                  color: paso>i+1?"#059669":paso===i+1?"#059669":"#fff" }}>
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
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <input type="checkbox" checked={p.incluir} onChange={e=>updatePartida(p.id,"incluir",e.target.checked)}
                              style={{ width:14, height:14, cursor:"pointer" }}/>
                            <span style={{ fontSize:11, color:"#94a3b8", fontWeight:600 }}>{p.item}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:"#1e293b" }}>{p.partida}</span>
                          </div>
                          <span style={{ fontSize:10, color:"#94a3b8", marginLeft:22 }}>{p.unidad} · {fmtP(p.valor_total)}</span>
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
                                background: p.pct===100?"#059669":p.pct>0?"#f59e0b":"#e2e8f0",
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
              <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:12, padding:20, marginBottom:16 }}>
                <h3 style={{ margin:"0 0 12px", fontSize:15, color:"#065f46" }}>
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
                          color: p.estado==="Terminada"?"#059669":p.estado==="En progreso"?"#d97706":"#94a3b8" }}>
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
              style={{ background:"#059669", color:"#fff", border:"none", borderRadius:10,
                padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              Siguiente →
            </button>
          ):(
            <button onClick={handleSave} disabled={saving}
              style={{ background:"#059669", color:"#fff", border:"none", borderRadius:10,
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

// ══════════════════════════════════════════════════════════════════════════════
export default function ObraPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#f8fafc", display:"flex", alignItems:"center",
        justifyContent:"center", color:"#94a3b8", fontFamily:"sans-serif" }}>
        Cargando obra...
      </div>}>
      <ObraDetail />
    </Suspense>
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
  const [mInforme, setMInforme] = useState(false);
  const [mFoto,setMFoto]  = useState(false);
  const [mPresupuesto, setMPresupuesto] = useState(false);
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
      const [oR, dR, pR, gR, bR, fR, aR, presR] = await Promise.all([
        supabase.from("obras").select("*").eq("id", obraId).single(),
        supabase.from("obra_documentos").select("*").eq("obra_id", obraId).order("created_at",{ascending:false}),
        supabase.from("obra_estados_pago").select("*").eq("obra_id", obraId).order("fecha",{ascending:false}),
        supabase.from("obra_garantias").select("*").eq("obra_id", obraId).order("fecha_vencimiento"),
        supabase.from("obra_bitacora").select("*").eq("obra_id", obraId).order("fecha",{ascending:false}),
        supabase.from("obra_fotos").select("*").eq("obra_id", obraId).order("created_at",{ascending:false}),
        supabase.from("obra_bitacora_anexos").select("*"),
        supabase.from("obra_presupuesto").select("*").eq("obra_id", obraId).order("orden"),
      ]);
      if (oR.data) setObra(oR.data);
      setDocs(dR.data||[]); setPagos(pR.data||[]); setGarantias(gR.data||[]);
      setBitacora(bR.data||[]); setFotos(fR.data||[]); setPresupuesto(presR.data||[]);
      const iR = await supabase.from("obra_informes").select("*").eq("obra_id", obraId).order("created_at",{ascending:false});
      setInformes(iR.data || []);
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
    await supabase.from("obras").update({...obra, updated_at:new Date().toISOString()}).eq("id",obraId);
    setGuardando(false); setGuardadoOk(true);
    setTimeout(()=>setGuardadoOk(false),2000);
  };
  const delDoc  = async id => { await supabase.from("obra_documentos").delete().eq("id",id);   setDocs(p=>p.filter(x=>x.id!==id)); };
  const delPago = async id => { await supabase.from("obra_estados_pago").delete().eq("id",id); setPagos(p=>p.filter(x=>x.id!==id)); };
  const delGar  = async id => { await supabase.from("obra_garantias").delete().eq("id",id);    setGarantias(p=>p.filter(x=>x.id!==id)); };
  const delBit  = async id => { await supabase.from("obra_bitacora").delete().eq("id",id);     setBitacora(p=>p.filter(x=>x.id!==id)); };
  const delFoto = async id => { await supabase.from("obra_fotos").delete().eq("id",id);        setFotos(p=>p.filter(x=>x.id!==id)); };
  const delPresupuesto = async id => { await supabase.from("obra_presupuesto").delete().eq("id",id); setPresupuesto(p=>p.filter(x=>x.id!==id)); };
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
        style={{ color:"#059669", background:"none", border:"none", cursor:"pointer" }}>Volver</button></p>
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
    if (n.includes("hormig")) {
      const dosif = n.match(/g\d+/i) ? n.match(/g\d+/i)[0].toUpperCase() : "";
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizaron la totalidad de los trabajos de moldaje, colocación de armadura y vaciado de hormigón${dosif?" "+dosif:""}. Se verificó el correcto fraguado y curado conforme a especificaciones técnicas. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la partida ${partida}. Se realizaron trabajos de moldaje, habilitación de armadura y vaciado de hormigón${dosif?" "+dosif:""}. Se verificó el nivelado, vibrado y curado correspondiente.${sufijo}`;
    }
    if (n.includes("excav") || n.includes("movim") || n.includes("escarpe")) {
      return fin
        ? `Se completó el 100% de los trabajos de ${partida}. Se ejecutó la excavación y/o movimiento de tierras en su totalidad, incluyendo perfilado de taludes, retiro y disposición del material excedente en botadero autorizado. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó el movimiento de tierras en el área correspondiente, con retiro y traslado del material al botadero designado. Se verificó la cota de fundación según proyecto.${sufijo}`;
    }
    if (n.includes("rellen") || n.includes("compac")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutó el relleno y compactación en la totalidad del área proyectada, en capas de 20 cm debidamente compactadas y controladas mediante ensayes de densidad in situ. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la partida ${partida}. Se colocó y compactó el material de relleno por capas según especificaciones, verificando la densidad requerida mediante ensayes en terreno.${sufijo}`;
    }
    if (n.includes("pintur") || n.includes("revestim")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó la preparación de superficies (lijado, masillado y limpieza), aplicándose la totalidad de manos de pintura/revestimiento indicadas en especificaciones. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la aplicación de ${partida}. Se prepararon las superficies y se aplicaron las manos de imprimación y terminación en el área intervenida.${sufijo}`;
    }
    if (n.includes("cubierta") || n.includes("techo") || n.includes("teja") || n.includes("zinc")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló la totalidad de la cubierta incluyendo estructura de soporte, aislación, planchas y elementos de remate y evacuación de aguas lluvias. Se verificó hermeticidad del sistema. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó la estructura de soporte y colocación de los elementos de cubierta en el área correspondiente, asegurando correcta fijación y traslape.${sufijo}`;
    }
    if (n.includes("eléctri") || n.includes("electric") || n.includes("alumbr") || n.includes("luminaria")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó el tendido de ductos, cableado, conexionado y pruebas eléctricas de la totalidad de la instalación conforme a normativa SEC vigente. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutó el tendido de ductos y conductores, fijación de elementos y conexionado parcial de tableros y puntos de luz/fuerza.${sufijo}`;
    }
    if (n.includes("agua") || n.includes("sanitari") || n.includes("cañer") || n.includes("alcan")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó el tendido de tuberías, uniones, pruebas de presión y desinfección de la red conforme a normativa vigente. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en las obras de ${partida}. Se instalaron tuberías, piezas especiales y se ejecutaron las uniones correspondientes, con pruebas parciales de hermeticidad.${sufijo}`;
    }
    if (n.includes("muro") || n.includes("tabique") || n.includes("mamposter") || n.includes("albañil")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutó la totalidad de la mampostería/tabique, con colocación de elementos, aplomado, nivelación y sellado de juntas según planos. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutó la colocación y aplomado de los elementos en el área correspondiente, controlando geometría y verticalidad conforme a proyecto.${sufijo}`;
    }
    if (n.includes("cielo") || n.includes("plafón") || n.includes("plafon")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se instaló la totalidad de la estructura metálica de soporte y paneles de cielo, con nivelación y terminaciones de borde según especificaciones. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se ejecutó la estructura de soporte y la fijación de paneles en el área intervenida.${sufijo}`;
    }
    if (n.includes("piso") || n.includes("pavim") || n.includes("cerám") || n.includes("porcelan")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutó la totalidad del revestimiento de piso, incluyendo preparación de base, aplicación de adhesivo, nivelado y sellado de juntas. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la colocación de ${partida}. Se preparó la base de apoyo, se aplicó adhesivo y se instaló el revestimiento en el área correspondiente, verificando planeidad y alineamiento.${sufijo}`;
    }
    if (n.includes("ventana") || n.includes("puerta") || n.includes("carpint") || n.includes("marco")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se realizó la instalación de la totalidad de los elementos de carpintería, incluyendo colocación, nivelación, fijación, sellado perimetral y prueba de funcionamiento. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en la instalación de ${partida}. Se colocaron, nivelaron y fijaron los elementos en los vanos indicados en proyecto.${sufijo}`;
    }
    if (n.includes("fundaci") || n.includes("zapata") || n.includes("radier") || n.includes("losa")) {
      return fin
        ? `Se completó el 100% de la partida ${partida}. Se ejecutaron la totalidad de los trabajos de preparación de subrasante, colocación de enfierradura y vaciado de hormigón. Se realizó el curado correspondiente verificando cotas según planos. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se ejecutaron trabajos de preparación de base, colocación de moldajes, habilitación de armaduras y vaciado de hormigón en la zona indicada.${sufijo}`;
    }
    if (n.includes("demolici") || n.includes("retiro") || n.includes("desmonte")) {
      return fin
        ? `Se completó el 100% de los trabajos de ${partida}. Se procedió al retiro controlado de la totalidad de los elementos indicados, con disposición del escombro en botadero autorizado y limpieza final del área. Partida finalizada.`
        : `Durante el período se avanzó un ${p}% en los trabajos de ${partida}. Se procedió al retiro y disposición controlada del material en el área asignada.${sufijo}`;
    }
    if (n.includes("aseo") || n.includes("limpieza")) {
      return fin
        ? `Se completó el 100% de las labores de ${partida}. Se realizó la limpieza general de la obra, retiro de escombros y materiales sobrantes, dejando el área en condiciones de entrega. Partida finalizada.`
        : `Durante el período se ejecutaron labores de ${partida} en el área intervenida, con retiro de escombros y materiales sobrantes acumulados.${sufijo}`;
    }
    return fin
      ? `Se completó el 100% de la partida "${partida}". Se ejecutaron la totalidad de los trabajos indicados en las especificaciones técnicas del proyecto, verificándose la correcta ejecución conforme a planos y normativa vigente. Partida finalizada.`
      : `Durante el período se avanzó un ${p}% en la partida "${partida}". Se ejecutaron los trabajos correspondientes conforme a las especificaciones técnicas del proyecto y bajo supervisión de la Inspección Técnica de Obras.${sufijo}`;
  }

  function imprimirInforme(inf, obra) {
    const d = inf.datos_json || {};
    const partidas = inf.partidas_json || [];
    const fmtP = n => n ? "$"+Math.round(n).toLocaleString("es-CL") : "—";
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe ${inf.tipo} — ${d.obra_nombre||""}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#333;font-size:13px;}
  h1{color:#065f46;font-size:20px;margin-bottom:4px;}
  h2{color:#065f46;font-size:14px;border-bottom:2px solid #059669;padding-bottom:6px;margin:24px 0 12px;}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f0fdf4;padding:14px;border-radius:8px;margin-bottom:20px;}
  .meta-item label{font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;}
  .meta-item p{margin:2px 0 0;font-weight:700;font-size:13px;}
  .partida{border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px;page-break-inside:avoid;}
  .partida-header{display:flex;justify-content:space-between;margin-bottom:6px;}
  .partida-title{font-weight:700;font-size:13px;}
  .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;}
  .badge-terminada{background:#d1fae5;color:#065f46;}
  .badge-progreso{background:#fef3c7;color:#92400e;}
  .badge-no{background:#f1f5f9;color:#64748b;}
  .desc{font-size:12px;color:#4b5563;line-height:1.6;margin:4px 0 0;}
  .progress{height:4px;background:#e2e8f0;border-radius:99px;margin:8px 0 4px;overflow:hidden;}
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
<h2>Avance por Partidas</h2>
${partidas.map(p=>`
<div class="partida">
  <div class="partida-header">
    <span class="partida-title">${p.item||""} ${p.partida||""}</span>
    <div style="display:flex;gap:8px;align-items:center">
      <span class="badge ${p.estado==="Terminada"?"badge-terminada":p.estado==="En progreso"?"badge-progreso":"badge-no"}">${p.estado}</span>
      <span style="font-weight:800;font-size:13px">${p.pct||0}%</span>
    </div>
  </div>
  <div class="progress"><div class="progress-bar" style="width:${p.pct||0}%;background:${p.estado==="Terminada"?"#059669":p.estado==="En progreso"?"#f59e0b":"#94a3b8"}"></div></div>
  <p style="font-size:10px;color:#9ca3af;margin:0">${p.unidad||""} · ${fmtP(p.valor_total)}</p>
  <p class="desc">${p.descripcion||""}</p>
</div>`).join("")}
<div class="footer">Generado por APUChile · ${new Date().toLocaleDateString("es-CL")}</div>
</body></html>`;
    const w = window.open("","_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(()=>w.print(),500);
  }

  const NAV = [
    { id:"resumen",   icon:"📊", label:"Resumen"         },
    { id:"ficha",     icon:"📋", label:"Ficha"            },
    { id:"docs",      icon:"📁", label:"Banco de Datos", sub:true },
    { id:"pagos",     icon:"💰", label:"Estados de Pago" },
    { id:"garantias", icon:"🔒", label:"Garantías"        },
    { id:"bitacora",  icon:"📖", label:"Bitácora"         },
    { id:"informes",  icon:"📋", label:"Informes"         },
    { id:"fotos",     icon:"📸", label:"Fotos", badge:fotos.length },
    { id:"presupuesto", icon:"💰", label:"Presupuesto", badge:presupuesto.length },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"sans-serif", display:"flex", flexDirection:"column" }}>

      {/* Top bar */}
      <div style={{ background:"linear-gradient(135deg,#065f46,#059669)", padding:"10px 20px",
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

        {/* SIDEBAR */}
        <div style={{ width:210, background:"#fff", borderRight:"1px solid #e2e8f0",
          display:"flex", flexDirection:"column", overflowY:"auto", flexShrink:0 }}>
          <div style={{ padding:"10px 8px", flex:1 }}>
            {NAV.map(item => (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (item.sub) {
                      setDocsOpen(o=>!o);
                      if (tab!=="docs") { setTab("docs"); setCatActiva(null); }
                    } else {
                      setTab(item.id); setDocsOpen(false);
                    }
                  }}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:8,
                    padding:"9px 10px", borderRadius:10, border:"none", cursor:"pointer",
                    background:tab===item.id?"#f0fdf4":"transparent",
                    color:tab===item.id?"#059669":"#475569",
                    fontWeight:tab===item.id?700:500, fontSize:13,
                    fontFamily:"inherit", textAlign:"left", transition:"all .1s" }}>
                  <span style={{ fontSize:14 }}>{item.icon}</span>
                  <span style={{ flex:1 }}>{item.label}</span>
                  {item.badge>0 && (
                    <span style={{ background:"#d1fae5", color:"#065f46", fontSize:9,
                      fontWeight:700, padding:"1px 5px", borderRadius:99 }}>{item.badge}</span>
                  )}
                  {item.sub && <span style={{ fontSize:9, color:"#94a3b8" }}>{docsOpen?"▲":"▼"}</span>}
                </button>

                {item.sub && docsOpen && (
                  <div style={{ marginLeft:6, marginBottom:2 }}>
                    <button onClick={()=>{ setTab("docs"); setCatActiva(null); }}
                      style={{ width:"100%", padding:"5px 10px", borderRadius:7, border:"none",
                        cursor:"pointer", fontSize:11, fontFamily:"inherit", textAlign:"left",
                        background:tab==="docs"&&!catActiva?"#f0fdf4":"transparent",
                        color:tab==="docs"&&!catActiva?"#059669":"#94a3b8", fontWeight:tab==="docs"&&!catActiva?700:400 }}>
                      Todas las categorías
                    </button>
                    {CATEGORIAS_DOCS.map(cat => {
                      const cnt = docs.filter(d=>d.categoria===cat).length;
                      const active = tab==="docs"&&catActiva===cat;
                      return (
                        <button key={cat} onClick={()=>{ setTab("docs"); setCatActiva(cat); }}
                          style={{ width:"100%", display:"flex", alignItems:"center", gap:4,
                            padding:"5px 10px", borderRadius:7, border:"none", cursor:"pointer",
                            background:active?"#f0fdf4":"transparent",
                            color:active?"#059669":"#64748b",
                            fontSize:11, fontFamily:"inherit", textAlign:"left", fontWeight:active?700:400 }}>
                          <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cat}</span>
                          {cnt>0 && <span style={{ background:"#f0fdf4", color:"#059669", fontSize:9,
                            fontWeight:700, padding:"1px 4px", borderRadius:99, flexShrink:0 }}>{cnt}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {tab==="ficha" && (
            <div style={{ padding:"10px 8px", borderTop:"1px solid #f1f5f9" }}>
              <button onClick={guardar} disabled={guardando}
                style={{ width:"100%", background:guardadoOk?"#34d399":"#059669",
                  color:"#fff", border:"none", borderRadius:10, padding:"10px",
                  fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"background .2s" }}>
                {guardando?"Guardando...":guardadoOk?"✓ Guardado":"Guardar ficha"}
              </button>
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
                  color="#059669" progress={pctEjec} progressColor="#059669"
                  empty={montoContrato===0} emptyMsg="Sin monto de contrato"/>
                <MetricCard title="Plazo Contractual" main={`${diasPasados}d`}
                  sub={`de ${diasTotal||"?"} días contractuales`}
                  color={pctPlazo>90?"#ef4444":pctPlazo>75?"#f59e0b":"#3b82f6"}
                  progress={pctPlazo} progressColor={pctPlazo>90?"#ef4444":pctPlazo>75?"#f59e0b":"#3b82f6"}
                  empty={!obra.fecha_inicio} emptyMsg="Sin fecha de inicio"/>
                <MetricCard title="Saldo Disponible" main={fmtPeso(saldo)}
                  sub={saldo<0?"⚠️ Monto excedido":montoContrato>0?`${(100-pctEjec).toFixed(1)}% restante`:""}
                  color={saldo<0?"#ef4444":"#059669"}
                  empty={montoContrato===0} emptyMsg="Sin monto de contrato"/>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <Section title="Datos clave"
                  action={<button onClick={()=>setTab("ficha")}
                    style={{ fontSize:11, color:"#059669", background:"none", border:"none",
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
                      style={{ fontSize:11, color:"#059669", background:"none", border:"none",
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
                        style={{ fontSize:11, color:"#059669", background:"none", border:"none",
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
                    <span style={{ fontSize:12, color:"#059669" }}>{presupuestoOpen?"▲":"▼"}</span>
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
                                <span style={{ color:"#059669", fontWeight:600, whiteSpace:"nowrap" }}>
                                  {fmtPeso(p.valor_total)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      <div style={{ padding:"12px 20px", background:"#f0fdf4", display:"flex",
                        justifyContent:"space-between", borderTop:"2px solid #bbf7d0" }}>
                        <span style={{ fontSize:13, fontWeight:700, color:"#065f46" }}>COSTO DIRECTO</span>
                        <span style={{ fontSize:14, fontWeight:800, color:"#065f46" }}>
                          {fmtPeso(presupuesto.reduce((s,p)=>s+(p.valor_total||0),0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {pagos.length>0 && (
                <Section title="Últimos estados de pago"
                  action={<button onClick={()=>setTab("pagos")}
                    style={{ fontSize:11, color:"#059669", background:"none", border:"none",
                      cursor:"pointer", fontFamily:"inherit" }}>Ver todos</button>}>
                  {pagos.slice(0,4).map(p=>(
                    <div key={p.id} style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f8fafc" }}>
                      <div>
                        <span style={{ fontSize:13, fontWeight:600, color:"#1e293b" }}>{p.nombre}</span>
                        {p.tipo&&<span style={{ fontSize:10, color:"#94a3b8", marginLeft:8 }}>{p.tipo}</span>}
                      </div>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <span style={{ fontSize:13, fontWeight:700, color:"#059669" }}>{fmtPeso(p.monto)}</span>
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
                  style={{ background:"#059669", color:"#fff", border:"none", borderRadius:10,
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
                                style={{ background:"#f0fdf4", color:"#059669", border:"1px solid #bbf7d0",
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
                <button onClick={()=>setMPago(true)}
                  style={{ background:"#059669", color:"#fff", border:"none", borderRadius:10,
                    padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>＋ Agregar</button>
              </div>
              {montoContrato>0&&(
                <div style={{ marginBottom:14, background:"#fff", border:"1px solid #e2e8f0",
                  borderRadius:12, padding:"12px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:12, color:"#64748b" }}>Avance financiero</span>
                    <span style={{ fontSize:13, fontWeight:700, color:"#059669" }}>{pctEjec.toFixed(1)}%</span>
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
                          <td style={{ padding:"10px 12px", fontSize:13, fontWeight:700, color:"#059669" }}>{fmtPeso(p.monto)}</td>
                          <td style={{ padding:"10px 12px", fontSize:12, color:"#64748b" }}>{p.numero_estado_pago||"—"}</td>
                          <td style={{ padding:"10px 12px", fontSize:12, color:"#64748b" }}>{p.numero_oficio||"—"}</td>
                          <td style={{ padding:"10px 12px" }}>
                            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                              {p.archivo_url&&<a href={p.archivo_url} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize:12, color:"#059669", textDecoration:"none" }}>📎</a>}
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
                  style={{ background:"#059669", color:"#fff", border:"none", borderRadius:10,
                    padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>＋ Agregar</button>
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                {[["🔴","1–30d","#fee2e2","#991b1b"],["🟠","31–45d","#fed7aa","#92400e"],
                  ["🟡","46–75d","#fef3c7","#713f12"],["🟢","76+d","#d1fae5","#065f46"]].map(([ico,l,bg,c])=>(
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
                              background:g.estado==="Vigente"?"#d1fae5":"#f1f5f9",
                              color:g.estado==="Vigente"?"#065f46":"#64748b" }}>{g.estado}</span>
                          </div>
                          <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                            {g.entidad&&<span style={{ fontSize:12, color:"#64748b" }}>🏦 {g.entidad}</span>}
                            {g.numero_documento&&<span style={{ fontSize:12, color:"#64748b" }}>N° {g.numero_documento}</span>}
                            {g.monto&&<span style={{ fontSize:13, fontWeight:700, color:"#059669" }}>{fmtPeso(g.monto)}</span>}
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
                      style={{ background:"#f8fafc", color:"#059669", border:"1px solid #e2e8f0", borderRadius:10,
                        padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>📥 Exportar PDF</button>
                  )}
                  <button onClick={()=>setMBit(true)}
                    style={{ background:"#059669", color:"#fff", border:"none", borderRadius:10,
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
                                      fontSize:11, color:"#059669", fontWeight:600, display:"flex",
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
                                              fontSize:11, color:"#059669", textDecoration:"none",
                                              background:"#f0fdf4", border:"1px solid #bbf7d0",
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

          {/* ═══ INFORMES ═══ */}
          {tab==="informes" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>Informes de Obra</h2>
                  <p style={{ fontSize:12, color:"#64748b", margin:"2px 0 0" }}>{informes.length} informe{informes.length!==1?"s":""} generados</p>
                </div>
                <button onClick={()=>setMInforme(true)}
                  style={{ background:"#059669", color:"#fff", border:"none", borderRadius:10,
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
                              <span style={{ background:"#d1fae5", color:"#065f46", fontSize:10, fontWeight:700,
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
                            <button onClick={()=>imprimirInforme(inf, obra)}
                              style={{ background:"#f0fdf4", color:"#059669", border:"1px solid #bbf7d0",
                                borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                              🖨️ Imprimir
                            </button>
                            <button onClick={async()=>{ await supabase.from("obra_informes").delete().eq("id",inf.id); setInformes(p=>p.filter(x=>x.id!==inf.id)); }}
                              style={{ background:"none", border:"none", color:"#fca5a5", cursor:"pointer", fontSize:14 }}>✕</button>
                          </div>
                        </div>
                        {partidas.length>0&&(
                          <div style={{ display:"flex", gap:10, marginTop:10, flexWrap:"wrap" }}>
                            <span style={{ fontSize:11, color:"#64748b" }}>📦 {partidas.length} partidas</span>
                            {terminadas>0&&<span style={{ fontSize:11, color:"#059669" }}>✓ {terminadas} terminadas</span>}
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
                  style={{ background:"#059669", color:"#fff", border:"none", borderRadius:10,
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
                    style={{ background:"#059669", color:"#fff", border:"none", borderRadius:10,
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
                          background:"linear-gradient(90deg,#f0fdf4,#f8fafc)", padding:"10px 14px",
                          borderRadius:8, marginBottom:0, borderLeft:"3px solid #059669" }}>
                          <span style={{ fontSize:12, fontWeight:700, color:"#065f46" }}>{seccion}</span>
                          <span style={{ fontSize:11, fontWeight:600, color:"#059669" }}>
                            ${Math.round(subtotal).toLocaleString("es-CL")}
                          </span>
                        </div>
                        <div style={{ border:"1px solid #e2e8f0", borderTop:"none", borderRadius:"0 0 10px 10px", overflow:"hidden" }}>
                          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                            <thead style={{ background:"#f9fafb" }}>
                              <tr>
                                {["Ítem","Partida","Un.","Cantidad","V. Unitario","V. Total",""].map((h,i)=>(
                                  <th key={i} style={{ padding:"8px 10px", fontWeight:600, color:"#64748b",
                                    textAlign: i>=3&&i<=5 ? "right" : "left",
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
                                    onMouseEnter={e=>e.currentTarget.style.background="#f0fdf4"}
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
                                          style={{ width:70, textAlign:"right", border:"1.5px solid #059669",
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
                                          style={{ width:90, textAlign:"right", border:"1.5px solid #059669",
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
                                      color: p.valor_total ? "#059669" : "#cbd5e1" }}>
                                      {p.valor_total ? "$"+Math.round(p.valor_total).toLocaleString("es-CL") : "—"}
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

        </div>
      </div>

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
                    style={{ display:"inline-block", background:"#f0fdf4", color:"#059669",
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
            {hasPartidas && <span style={{ fontSize:11, fontWeight:500, color:"#059669",
              marginLeft:10, background:"#d1fae5", padding:"2px 8px", borderRadius:99 }}>
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
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#059669";e.currentTarget.style.background="#f0fdf4";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.background="#fafafa";}}>
                  <input id="pago-file-inp" type="file" accept=".xlsx,.xls,.pdf"
                    style={{display:"none"}} onChange={e=>handleFile(e.target.files?.[0]||null)}/>
                  {file ? (
                    <div>
                      <div style={{fontSize:20,marginBottom:3}}>{isExcel?"📊":"📄"}</div>
                      <p style={{fontSize:11,fontWeight:700,color:"#065f46",margin:0}}>{file.name}</p>
                      {leyendo && <p style={{fontSize:10,color:"#059669",margin:"4px 0 0"}}>⏳ Leyendo datos…</p>}
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
                <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 14px"}}>
                  <p style={{fontSize:11,fontWeight:700,color:"#065f46",margin:"0 0 8px",textTransform:"uppercase",letterSpacing:".04em"}}>
                    📊 Resumen extraído
                  </p>
                  {epMeta?.contratista && (
                    <div style={{fontSize:11,color:"#374151",marginBottom:8,paddingBottom:8,borderBottom:"1px solid #d1fae5"}}>
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
                      fontSize:12,padding:"4px 0",borderBottom:"1px solid #d1fae5"}}>
                      <span style={{color:"#374151"}}>{lbl}</span>
                      <span style={{fontWeight:bold?700:500,color:bold?"#059669":"#374151"}}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botones */}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button onClick={save} disabled={saving||!form.nombre.trim()}
                style={{flex:1,background:"#059669",color:"#fff",border:"none",borderRadius:12,
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
              <p style={{fontSize:12,fontWeight:700,color:"#065f46",margin:"0 0 12px",
                textTransform:"uppercase",letterSpacing:".05em"}}>
                📋 Desglose de Partidas
              </p>
              <div style={{border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden",background:"#fff"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead style={{background:"#f0fdf4"}}>
                    <tr>
                      {["Ítem","Descripción","Un.","Cant.","V. Unit.","V. Total",
                        ...(hasAvancePct?["Av. %"]:  []),
                        "Av. $"
                      ].map((h,i)=>(
                        <th key={i} style={{padding:"8px 10px",fontWeight:700,color:"#065f46",
                          textAlign:i>=3?"right":"left",borderBottom:"1px solid #d1fae5",
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
                            color: p.avance_pct===100?"#059669":p.avance_pct>0?"#f59e0b":"#cbd5e1",
                            fontWeight:600}}>
                            {p.avance_pct!=null ? p.avance_pct===100?"✓":p.avance_pct+"%": "—"}
                          </td>
                        )}
                        <td style={{padding:"6px 10px",textAlign:"right",fontWeight:600,
                          color:p.monto_actual?"#059669":"#cbd5e1"}}>
                          {p.monto_actual?fmtN(p.monto_actual):"—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {hasMontosActuales && (
                    <tfoot style={{background:"#f0fdf4",borderTop:"2px solid #d1fae5"}}>
                      <tr>
                        <td colSpan={hasAvancePct?6:5}
                          style={{padding:"8px 10px",fontWeight:700,color:"#065f46",fontSize:12}}>
                          TOTAL EP
                        </td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,color:"#059669",fontSize:13}}>
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
                  border:form.tipo===t?"1.5px solid #059669":"1.5px solid #e2e8f0",
                  background:form.tipo===t?"#d1fae5":"#fff",color:form.tipo===t?"#065f46":"#64748b",
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
                <p style={{fontSize:12,fontWeight:600,color:"#065f46",margin:0}}>
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
        {prog&&<p style={{fontSize:11,color:"#059669",margin:0}}>⏳ {prog}</p>}
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
              <p style={{fontSize:13,fontWeight:600,color:"#065f46",margin:0}}>
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
        {prog&&<p style={{fontSize:11,color:"#059669",margin:0}}>⏳ {prog}</p>}
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
      <h3 style={{ fontSize:12, fontWeight:700, color:"#065f46", margin:"0 0 12px",
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
        <span style={{ fontSize:15, fontWeight:800, color:"#065f46" }}>TOTAL</span>
        <span style={{ fontSize:20, fontWeight:800, color:"#059669" }}>{fmtN(total)}</span>
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
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="#059669"; e.currentTarget.style.background="#f0fdf4"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.background="#fafafa"; }}>
              <input id="presupuesto-input" type="file"
                accept=".xlsx,.xls,.pdf"
                style={{ display:"none" }}
                onChange={e=>{ setFile(e.target.files?.[0]||null); setError(""); setPreview(null); }}/>
              {file ? (
                <div>
                  <div style={{ fontSize:28, marginBottom:6 }}>{isExcel?"📊":"📄"}</div>
                  <p style={{ fontSize:13, fontWeight:700, color:"#065f46", margin:0 }}>{file.name}</p>
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
                    {[["📊","Excel .xlsx","Recomendado","#d1fae5","#065f46"],
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
              <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, padding:"10px 14px",
                fontSize:12, color:"#065f46" }}>
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

            {prog && <p style={{ fontSize:11, color:"#059669", margin:0, textAlign:"center" }}>⏳ {prog}</p>}

            <ModalActions onClose={onClose} onSave={procesar} saving={saving}
              disabled={!file} label={saving ? "Procesando…" : "Procesar →"}/>
          </>
        ) : (
          <>
            {/* Vista previa de partidas */}
            <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10,
              padding:"10px 14px", fontSize:12, color:"#065f46" }}>
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
                      <td style={{ padding:"6px 10px", textAlign:"right", fontWeight:600, color:"#059669" }}>
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
                style={{ flex:1, background:"#059669", color:"#fff", border:"none", borderRadius:10,
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
