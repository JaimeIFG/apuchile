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

  const [mDoc, setMDoc]   = useState(false);
  const [mPago,setMPago]  = useState(false);
  const [mGar, setMGar]   = useState(false);
  const [mBit, setMBit]   = useState(false);
  const [mFoto,setMFoto]  = useState(false);
  const [mPresupuesto, setMPresupuesto] = useState(false);
  const [lightbox,setLb]  = useState(null);
  const [docSelec,setDocSelec]=useState(null);  // documento seleccionado para previsualización
  const [anexos,setAnexos]=useState({});  // { bitacora_id: [anexos] }
  const [expandedAnexo,setExpandedAnexo]=useState(null);  // bitacora_id expandido para mostrar preview adjuntos

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

  const NAV = [
    { id:"resumen",   icon:"📊", label:"Resumen"         },
    { id:"ficha",     icon:"📋", label:"Ficha"            },
    { id:"docs",      icon:"📁", label:"Banco de Datos", sub:true },
    { id:"pagos",     icon:"💰", label:"Estados de Pago" },
    { id:"garantias", icon:"🔒", label:"Garantías"        },
    { id:"bitacora",  icon:"📖", label:"Bitácora"         },
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
          {tab==="bitacora" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>Bitácora de Obra</h2>
                  <p style={{ fontSize:12, color:"#64748b", margin:"2px 0 0" }}>{bitacora.length} registros</p>
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
              {bitacora.length===0?<EmptyState icon="📖" msg="Sin registros en la bitácora"/>:(
                <div style={{ position:"relative", paddingLeft:22 }}>
                  <div style={{ position:"absolute", left:7, top:0, bottom:0,
                    width:2, background:"#e2e8f0", borderRadius:2 }}/>
                  {bitacora.map(b=>{
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
                  <h2 style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:0 }}>Presupuesto</h2>
                  <p style={{ fontSize:12, color:"#64748b", margin:"2px 0 0" }}>
                    {presupuesto.length} partidas · Cargadas desde presupuesto de licitación
                  </p>
                </div>
                <button onClick={()=>setMPresupuesto(true)}
                  style={{ background:"#059669", color:"#fff", border:"none", borderRadius:10,
                    padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>＋ Cargar presupuesto</button>
              </div>

              {presupuesto.length===0?<EmptyState icon="💰" msg="Sin partidas — carga un presupuesto en PDF"/>:(
                <div>
                  {/* Agrupar por sección */}
                  {[...new Set(presupuesto.map(p=>p.seccion))].map(seccion=>(
                    <div key={seccion} style={{ marginBottom:20 }}>
                      <div style={{ background:"#f8fafc", padding:"10px 14px", borderRadius:8, marginBottom:8,
                        fontSize:12, fontWeight:700, color:"#475569" }}>{seccion}</div>
                      <div style={{ border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden" }}>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                          <thead style={{ background:"#f9fafb" }}>
                            <tr>
                              {["Item","Partida","Unidad","Cantidad","V. Unitario","V. Total",""].map(h=>(
                                <th key={h} style={{ padding:"9px 10px", fontWeight:600, color:"#64748b",
                                  textAlign:"left", borderBottom:"1px solid #e2e8f0", whiteSpace:"nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {presupuesto.filter(p=>p.seccion===seccion).map((p,i)=>(
                              <tr key={p.id} style={{ background:i%2===0?"#fff":"#f9fafb", borderBottom:"1px solid #f1f5f9" }}>
                                <td style={{ padding:"8px 10px", color:"#64748b" }}>{p.item}</td>
                                <td style={{ padding:"8px 10px", color:"#1e293b" }}>{p.partida}</td>
                                <td style={{ padding:"8px 10px", color:"#64748b" }}>{p.unidad}</td>
                                <td style={{ padding:"8px 10px", textAlign:"right", color:"#64748b" }}>{p.cantidad}</td>
                                <td style={{ padding:"8px 10px", textAlign:"right", color:"#64748b" }}>${Math.round(p.valor_unitario).toLocaleString("es-CL")}</td>
                                <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:600, color:"#059669" }}>${Math.round(p.valor_total).toLocaleString("es-CL")}</td>
                                <td style={{ padding:"8px 10px", textAlign:"center" }}>
                                  <button onClick={()=>delPresupuesto(p.id)}
                                    style={{ background:"none", border:"none", color:"#fca5a5",
                                      cursor:"pointer", fontSize:12 }}>✕</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}

                  {/* Totales */}
                  <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12,
                    padding:"16px", marginTop:20 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16 }}>
                      <div>
                        <p style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", fontWeight:600, margin:0 }}>Costo Directo</p>
                        <p style={{ fontSize:18, fontWeight:700, color:"#1e293b", margin:"4px 0 0" }}>
                          ${presupuesto.reduce((sum,p)=>sum+(p.valor_total||0),0).toLocaleString("es-CL")}
                        </p>
                      </div>
                    </div>
                  </div>
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
      {mPago && <ModalPago     obraId={obraId} onClose={()=>setMPago(false)}
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

function ModalPago({ obraId, onClose, onSave }) {
  const [form,setForm]=useState({nombre:"",tipo:"Estado de Pago",fecha:"",monto:"",numero_oficio:"",numero_estado_pago:"",unidad_pago:""});
  const [file,setFile]=useState(null); const [saving,setSaving]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const save=async()=>{
    if(!form.nombre.trim())return; setSaving(true);
    let archivo_url=null,archivo_nombre=null;
    if(file){const r=await uploadFile(obraId,"pagos",file);if(!r.error){archivo_url=r.url;archivo_nombre=r.nombre;}}
    const{data,error}=await supabase.from("obra_estados_pago").insert({obra_id:obraId,...form,monto:form.monto?parseFloat(form.monto):null,archivo_url,archivo_nombre}).select().single();
    setSaving(false); if(!error&&data) onSave(data);
  };
  return(
    <Modal title="💰 Estado de Pago" onClose={onClose}>
      <div style={{display:"grid",gap:14}}>
        <InputRow label="Nombre"><input autoFocus value={form.nombre} onChange={e=>set("nombre",e.target.value)} style={inputSt} placeholder="Ej: Estado de Pago N°1"/></InputRow>
        <Grid cols={2}>
          <InputRow label="Tipo"><select value={form.tipo} onChange={e=>set("tipo",e.target.value)} style={selectSt}>{TIPOS_EP.map(t=><option key={t}>{t}</option>)}</select></InputRow>
          <InputRow label="Fecha"><input type="date" value={form.fecha} onChange={e=>set("fecha",e.target.value)} style={inputSt}/></InputRow>
          <InputRow label="Monto ($)"><input type="number" value={form.monto} onChange={e=>set("monto",e.target.value)} style={inputSt} placeholder="0"/></InputRow>
          <InputRow label="Unidad de Pago"><input value={form.unidad_pago} onChange={e=>set("unidad_pago",e.target.value)} style={inputSt}/></InputRow>
          <InputRow label="N° Estado de Pago"><input value={form.numero_estado_pago} onChange={e=>set("numero_estado_pago",e.target.value)} style={inputSt}/></InputRow>
          <InputRow label="N° Oficio"><input value={form.numero_oficio} onChange={e=>set("numero_oficio",e.target.value)} style={inputSt}/></InputRow>
        </Grid>
        <InputRow label="Archivo adjunto"><FileDropZone id="pago-file" file={file} setFile={setFile}/></InputRow>
        <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!form.nombre.trim()}/>
      </div>
    </Modal>
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

function ModalPresupuesto({ obraId, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [prog, setProg] = useState("");

  const save = async () => {
    if (!file) return;
    setSaving(true);
    try {
      setProg("Analizando PDF...");
      const data = await extractBudgetFromPDF(file);

      setProg("Guardando partidas...");
      // Insertar todas las partidas
      const items = data.items.map((item, idx) => ({
        ...item,
        obra_id: obraId,
        orden: idx + 1,
      }));

      const { data: saved, error } = await supabase
        .from("obra_presupuesto")
        .insert(items)
        .select();

      if (!error && saved) {
        setProg("");
        onSave(saved);
      } else {
        setProg("Error al guardar");
      }
    } catch (e) {
      console.error("Error:", e);
      setProg(`Error: ${e.message}`);
    }
    setSaving(false);
  };

  return (
    <Modal title="💰 Cargar Presupuesto" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <div
          style={{
            border: "2px dashed #e2e8f0",
            borderRadius: 12,
            padding: "24px",
            background: "#fafafa",
            cursor: "pointer",
            textAlign: "center",
          }}
          onClick={() => document.getElementById("presupuesto-input").click()}
        >
          <input
            id="presupuesto-input"
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <div>
              <div style={{ fontSize: 22, marginBottom: 4 }}>📄</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#065f46", margin: 0 }}>{file.name}</p>
              <p style={{ fontSize: 10, color: "#94a3b8", margin: "3px 0 0" }}>
                Presupuesto PDF seleccionado
              </p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 6 }}>📊</div>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                Click para seleccionar PDF<br />
                <span style={{ fontSize: 10 }}>Presupuesto de licitación en PDF</span>
              </p>
            </div>
          )}
        </div>

        {prog && <p style={{ fontSize: 11, color: "#059669", margin: 0 }}>⏳ {prog}</p>}

        <ModalActions
          onClose={onClose}
          onSave={save}
          saving={saving}
          disabled={!file}
          label="Procesar presupuesto →"
        />
      </div>
    </Modal>
  );
}
