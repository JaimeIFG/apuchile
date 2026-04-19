"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useInactividad } from "../lib/useInactividad";
import LoadingOverlay from "../components/LoadingOverlay";
import SpotlightTour from "../components/SpotlightTour";

const ESTADOS = ["En licitación", "En ejecución", "Paralizada", "Recepcionada", "Liquidada"];

const ESTADO_ST = {
  "En licitación":  { bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  "En ejecución":   { bg: "#eef2ff", color: "#4338ca", dot: "#6366f1" },
  "Paralizada":     { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
  "Recepcionada":   { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  "Liquidada":      { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
};

function fmtPeso(n) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

function diasRestantes(fechaTermino) {
  if (!fechaTermino) return null;
  return Math.ceil((new Date(fechaTermino) - new Date()) / 86400000);
}

function PlazoChip({ fecha }) {
  const d = diasRestantes(fecha);
  if (d === null) return null;
  const color = d < 0 ? "#991b1b" : d <= 30 ? "#b91c1c" : d <= 60 ? "#92400e" : "#4338ca";
  const bg    = d < 0 ? "#fee2e2" : d <= 30 ? "#fee2e2" : d <= 60 ? "#fef3c7" : "#eef2ff";
  const label = d < 0 ? `Vencida hace ${Math.abs(d)}d` : d === 0 ? "Vence hoy" : `${d}d restantes`;
  return (
    <span style={{ background: bg, color, fontSize: 10, fontWeight: 700,
      padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

// Loading skeleton para las cards
function SkeletonCard() {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16,
      padding: "18px 22px", borderLeft: "4px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 80, height: 20, borderRadius: 99, background: "#f1f5f9",
              animation: "shimmerPulse 1.4s ease infinite" }}/>
            <div style={{ width: 60, height: 20, borderRadius: 99, background: "#f1f5f9",
              animation: "shimmerPulse 1.4s ease infinite", animationDelay: "0.2s" }}/>
          </div>
          <div style={{ width: "60%", height: 18, borderRadius: 6, background: "#f1f5f9",
            marginBottom: 10, animation: "shimmerPulse 1.4s ease infinite", animationDelay: "0.1s" }}/>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 100, height: 14, borderRadius: 6, background: "#f1f5f9",
              animation: "shimmerPulse 1.4s ease infinite", animationDelay: "0.3s" }}/>
            <div style={{ width: 70, height: 14, borderRadius: 6, background: "#f1f5f9",
              animation: "shimmerPulse 1.4s ease infinite", animationDelay: "0.4s" }}/>
          </div>
        </div>
        <div style={{ width: 70, height: 32, borderRadius: 8, background: "#f1f5f9",
          animation: "shimmerPulse 1.4s ease infinite" }}/>
      </div>
    </div>
  );
}

export default function ObrasPage() {
  const router = useRouter();
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navegando, setNavegando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [estadoNuevo, setEstadoNuevo] = useState("En ejecución");
  const [creandoLoading, setCreandoLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [alertas, setAlertas] = useState([]);
  const [alertasCollapsed, setAlertasCollapsed] = useState(false);
  const [empresaActiva, setEmpresaActivaLocal] = useState(null); // { id, nombre }

  useInactividad(supabase, router, 10);

  useEffect(() => {
    setMounted(true);
    // Leer empresa activa desde localStorage
    try {
      const stored = localStorage.getItem("apudesk_empresa_activa");
      if (stored) setEmpresaActivaLocal(JSON.parse(stored));
    } catch {}

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }

      // Leer empresa activa (puede cambiar async)
      let empActiva = null;
      try {
        const stored = localStorage.getItem("apudesk_empresa_activa");
        if (stored) empActiva = JSON.parse(stored);
      } catch {}

      let obrasQuery = supabase.from("obras").select("*").order("created_at", { ascending: false });
      if (empActiva?.id) {
        obrasQuery = obrasQuery.eq("empresa_id", empActiva.id);
      } else {
        // Solo obras personales (sin empresa asignada)
        obrasQuery = obrasQuery.eq("user_id", user.id).is("empresa_id", null);
      }

      const [obrasR, garR, pagosR] = await Promise.all([
        obrasQuery,
        supabase.from("obra_garantias").select("*"),
        supabase.from("obra_estados_pago").select("*").order("created_at", { ascending: false }),
      ]);
      setObras(obrasR.data || []);
      // Calcular alertas
      const hoy = new Date();
      const alertasArr = [];
      // Garantías próximas a vencer (< 30 días)
      for (const g of (garR.data || [])) {
        if (!g.fecha_vencimiento) continue;
        const dias = Math.ceil((new Date(g.fecha_vencimiento) - hoy) / 86400000);
        if (dias <= 30 && dias >= 0) {
          const obra = (obrasR.data||[]).find(o => o.id === g.obra_id);
          alertasArr.push({ tipo: "garantia", nivel: dias <= 7 ? "rojo" : "amarillo",
            msg: `Garantía "${g.tipo}" vence en ${dias} día${dias!==1?"s":""}`,
            sub: obra?.nombre || "", obraId: g.obra_id });
        } else if (dias < 0) {
          const obra = (obrasR.data||[]).find(o => o.id === g.obra_id);
          alertasArr.push({ tipo: "garantia", nivel: "rojo",
            msg: `Garantía "${g.tipo}" venció hace ${Math.abs(dias)} días`,
            sub: obra?.nombre || "", obraId: g.obra_id });
        }
      }
      // Plazos contractuales próximos (< 30 días)
      for (const o of (obrasR.data||[])) {
        if (!o.fecha_termino_contractual) continue;
        if (o.estado_obra === "Recepcionada" || o.estado_obra === "Liquidada") continue;
        const dias = Math.ceil((new Date(o.fecha_termino_contractual) - hoy) / 86400000);
        if (dias <= 30 && dias >= 0) {
          alertasArr.push({ tipo: "plazo", nivel: dias <= 7 ? "rojo" : "amarillo",
            msg: `Plazo contractual vence en ${dias} día${dias!==1?"s":""}`,
            sub: o.nombre, obraId: o.id });
        } else if (dias < 0) {
          alertasArr.push({ tipo: "plazo", nivel: "rojo",
            msg: `Plazo contractual vencido hace ${Math.abs(dias)} días`,
            sub: o.nombre, obraId: o.id });
        }
      }
      // Obras sin EP en más de 60 días
      const pagosData = pagosR.data || [];
      for (const o of (obrasR.data||[])) {
        if (o.estado_obra !== "En ejecución") continue;
        const pagosObra = pagosData.filter(p => p.obra_id === o.id);
        if (pagosObra.length === 0) continue;
        const ultimo = pagosObra[0];
        const dias = Math.ceil((hoy - new Date(ultimo.created_at)) / 86400000);
        if (dias > 60) {
          alertasArr.push({ tipo: "ep", nivel: "amarillo",
            msg: `Sin nuevo EP hace ${dias} días`,
            sub: o.nombre, obraId: o.id });
        }
      }
      setAlertas(alertasArr);
      setLoading(false);
    });
  }, []);

  const crearObra = async () => {
    if (!nombreNuevo.trim()) return;
    setCreandoLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    let empActiva = null;
    try { const s = localStorage.getItem("apudesk_empresa_activa"); if (s) empActiva = JSON.parse(s); } catch {}
    const { data, error } = await supabase.from("obras").insert({
      nombre: nombreNuevo.trim(),
      estado_obra: estadoNuevo,
      user_id: user.id,
      ...(empActiva?.id ? { empresa_id: empActiva.id } : {}),
    }).select().single();
    setCreandoLoading(false);
    if (!error && data) {
      setObras(p => [data, ...p]);
      setCreando(false);
      setNombreNuevo("");
      setNavegando(true); router.push(`/obra?id=${data.id}`);
    }
  };

  const eliminarObra = async (id) => {
    await supabase.from("obras").delete().eq("id", id);
    setObras(p => p.filter(o => o.id !== id));
    setConfirmarEliminar(null);
  };

  const obrasFiltradas = obras.filter(o => {
    if (filtroEstado && o.estado_obra !== filtroEstado) return false;
    if (busqueda && !o.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
        !(o.contratista || "").toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total:         obras.length,
    ejecucion:     obras.filter(o => o.estado_obra === "En ejecución").length,
    paralizadas:   obras.filter(o => o.estado_obra === "Paralizada").length,
    recepcionadas: obras.filter(o => o.estado_obra === "Recepcionada").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <LoadingOverlay visible={loading} mensaje="Cargando obras..." blur={false} />
      <LoadingOverlay visible={navegando} mensaje="Abriendo obra..." blur={true} />

      <SpotlightTour storageKey="apudesk_tour_obras_v1" pasos={[
        { titulo: "Proyectos en Ejecución", descripcion: "Aquí controlas todas tus obras en terreno. Puedes registrar estados, garantías, estados de pago y fechas contractuales. Te mostramos las secciones principales.", icono: "🏗️", targetId: null, posPanel: "center" },
        { titulo: "Estadísticas de obras", descripcion: "En el encabezado ves el resumen de tus obras: cuántas están en ejecución, paralizadas o recepcionadas. Se actualiza automáticamente al cambiar los estados.", icono: "📊", targetId: "tour-obras-stats", posPanel: "bottom" },
        { titulo: "Alertas automáticas", descripcion: "APUdesk detecta alertas críticas: garantías próximas a vencer, plazos contractuales y obras sin estado de pago reciente. Aparecen aquí en amarillo o rojo.", icono: "🚨", targetId: "tour-obras-alertas", posPanel: "bottom" },
        { titulo: "Buscar y filtrar", descripcion: "Filtra tus obras por nombre, contratista o estado. Ideal cuando tienes muchos proyectos activos simultáneamente.", icono: "🔍", targetId: "tour-obras-filtros", posPanel: "bottom" },
        { titulo: "Nueva obra", descripcion: "Usa este botón para registrar una nueva obra. Ingresa el nombre, mandante, fechas contractuales, monto y estado. Cada obra tiene su propio módulo de seguimiento.", icono: "➕", targetId: "tour-obras-nueva", posPanel: "bottom" },
      ]} />

      <style>{`
        @keyframes shimmerPulse {
          0%,100% { opacity: 1; }
          50%      { opacity: .45; }
        }
      `}</style>

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")}
              className="btn-press text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
              ← Dashboard
            </button>
            <span className="text-gray-300 text-xs">/</span>
            <span className="text-gray-700 text-xs font-semibold">Ejecución de Obras</span>
          </div>
          <button id="tour-obras-nueva" onClick={() => setCreando(true)}
            className="btn-primary anim-fade-up text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2"
            style={{background:"linear-gradient(135deg,#4338ca,#6366f1)", color:"#fff", border:"none", cursor:"pointer",
              boxShadow:"0 2px 10px rgba(99,102,241,.3)"}}>
            ＋ Nueva Obra
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-6">

        {/* ── Banner empresa activa ── */}
        {empresaActiva && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-2.5 rounded-xl"
            style={{ background: "#eef2ff", border: "1.5px solid #c7d2fe" }}>
            <div className="flex items-center gap-2 text-sm">
              <span>🏢</span>
              <span className="font-semibold text-indigo-800">{empresaActiva.nombre}</span>
              <span className="text-indigo-400 text-xs">— viendo obras de esta empresa</span>
            </div>
            <button onClick={() => { localStorage.removeItem("apudesk_empresa_activa"); window.location.reload(); }}
              className="text-indigo-400 hover:text-indigo-700 text-xs font-semibold transition">
              Ver todo ×
            </button>
          </div>
        )}

        {/* ── Header card ── */}
        <div className="rounded-2xl overflow-hidden anim-scale-in mb-4"
          style={{background:"linear-gradient(135deg,#4338ca 0%,#6366f1 60%,#0891b2 100%)",
            boxShadow:"0 4px 20px rgba(67,56,202,.28)", padding:"20px 24px", position:"relative"}}>
          <div style={{position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,.08) 1px,transparent 1px)",
            backgroundSize:"20px 20px", pointerEvents:"none"}}/>
          <div className="shimmer-sweep"/>
          <div style={{position:"relative", zIndex:1, display:"flex", alignItems:"center",
            justifyContent:"space-between", gap:16, flexWrap:"wrap"}}>
            <div>
              <p style={{fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".14em",
                color:"rgba(255,255,255,.55)", marginBottom:4}}>CONTROL DE OBRAS</p>
              <h1 style={{fontSize:22, fontWeight:900, color:"#fff", letterSpacing:"-.02em", lineHeight:1.2}}>
                🏗️ Ejecución de Obras
              </h1>
              <p style={{fontSize:12, color:"rgba(255,255,255,.5)", marginTop:4}}>
                Control y seguimiento de obras en ejecución
              </p>
            </div>
            <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6}}>
              <span style={{background:"rgba(255,255,255,.14)", border:"1px solid rgba(255,255,255,.18)",
                color:"rgba(255,255,255,.85)", borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:600}}>
                {new Date().toLocaleDateString("es-CL",{weekday:"long",day:"2-digit",month:"short",year:"numeric"})}
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div id="tour-obras-stats" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { num: stats.total,         lbl: "Total obras",   color: "#6366f1", border: "#6366f1", icon: "🏗️" },
            { num: stats.ejecucion,     lbl: "En ejecución",  color: "#0891b2", border: "#0891b2", icon: "⚙️", pulse: true },
            { num: stats.paralizadas,   lbl: "Paralizadas",   color: "#ef4444", border: "#ef4444", icon: "⏸️" },
            { num: stats.recepcionadas, lbl: "Recepcionadas", color: "#f59e0b", border: "#f59e0b", icon: "✅" },
          ].map(({ num, lbl, color, border, icon, pulse }, i) => (
            <div key={lbl} className="bg-white rounded-2xl shadow-sm anim-fade-up"
              style={{padding:"14px 16px", borderBottom:`3px solid ${border}`, animationDelay:`${i*50}ms`}}>
              <div style={{fontSize:24, fontWeight:900, color, lineHeight:1, marginBottom:3,
                display:"flex", alignItems:"center", gap:6}}>
                {pulse && <span className="pulse-dot" style={{display:"inline-block", width:8, height:8,
                  borderRadius:"50%", background:color, flexShrink:0}}/>}
                {num}
              </div>
              <div style={{fontSize:9, textTransform:"uppercase", letterSpacing:".06em",
                fontWeight:700, color:"#64748b", marginBottom:2}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* ── Panel de Alertas ── */}
        {alertas.length > 0 && (
          <div id="tour-obras-alertas" className={mounted ? "anim-fade-up" : ""}
            style={{ marginBottom: 20, border: "1.5px solid #fbbf24", borderRadius: 14,
              background: "#fffbeb", overflow: "hidden" }}>
            <button onClick={() => setAlertasCollapsed(p => !p)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "12px 16px", background: "none", border: "none",
                cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🔔</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
                  {alertas.length} alerta{alertas.length !== 1 ? "s" : ""} activa{alertas.length !== 1 ? "s" : ""}
                </span>
                {alertas.filter(a => a.nivel === "rojo").length > 0 && (
                  <span style={{ background: "#fee2e2", color: "#991b1b", fontSize: 10,
                    fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>
                    {alertas.filter(a => a.nivel === "rojo").length} urgente{alertas.filter(a=>a.nivel==="rojo").length!==1?"s":""}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 12, color: "#92400e" }}>{alertasCollapsed ? "▼ Ver" : "▲ Ocultar"}</span>
            </button>
            {!alertasCollapsed && (
              <div style={{ borderTop: "1px solid #fde68a", padding: "8px 16px 12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {alertas.map((a, i) => (
                    <div key={i}
                      onClick={() => { setNavegando(true); router.push(`/obra?id=${a.obraId}`); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                        borderRadius: 10, cursor: "pointer",
                        background: a.nivel === "rojo" ? "#fee2e2" : "#fef3c7",
                        border: `1px solid ${a.nivel === "rojo" ? "#fca5a5" : "#fde68a"}`,
                        transition: "opacity .15s" }}
                      onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>
                        {a.tipo === "garantia" ? "🛡️" : a.tipo === "plazo" ? "📅" : "📋"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700,
                          color: a.nivel === "rojo" ? "#991b1b" : "#92400e" }}>{a.msg}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#6b7280",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.sub}</p>
                      </div>
                      <span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0 }}>Ver →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Filtros ── */}
        <div id="tour-obras-filtros" className={`bg-white rounded-2xl shadow-sm p-4 mb-4 ${mounted ? "anim-slide-down delay-100" : ""}`}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              placeholder="Buscar por nombre o contratista..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white text-gray-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 cursor-pointer">
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            {(busqueda || filtroEstado) && (
              <button onClick={() => { setBusqueda(""); setFiltroEstado(""); }}
                className="btn-press bg-gray-100 hover:bg-gray-200 border-none rounded-lg px-3.5 py-2.5 text-xs text-gray-500 cursor-pointer transition-colors">
                ✕ Limpiar
              </button>
            )}
          </div>
        </div>

        {/* ── Lista ── */}
        {loading ? (
          <div style={{ display: "grid", gap: 14 }}>
            {[0,1,2].map(i => (
              <div key={i} className={`anim-fade-up delay-${(i+1)*50}`}>
                <SkeletonCard/>
              </div>
            ))}
          </div>
        ) : obrasFiltradas.length === 0 ? (
          <div className="anim-fade-up" style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏗️</div>
            <p style={{ color: "#94a3b8", fontSize: 15, marginBottom: 8 }}>
              {obras.length === 0 ? "No tienes obras registradas aún" : "Sin resultados con los filtros actuales"}
            </p>
            {obras.length === 0 && (
              <button onClick={() => setCreando(true)}
                className="btn-primary"
                style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10,
                  padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit" }}>
                Crear primera obra
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {obrasFiltradas.map((obra, idx) => {
              const est = ESTADO_ST[obra.estado_obra] || ESTADO_ST["En ejecución"];
              const delay = Math.min(idx * 50, 400);
              return (
                <div key={obra.id}
                  className={`card-hover anim-fade-up`}
                  style={{ animationDelay: `${delay}ms`,
                    background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16,
                    padding: "18px 22px", cursor: "pointer",
                    borderLeft: `4px solid ${est.dot}`,
                    boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}
                  onClick={() => { setNavegando(true); router.push(`/obra?id=${obra.id}`); }}>

                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Fila superior: estado + región + plazo */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8,
                        marginBottom: 7, flexWrap: "wrap" }}>
                        <span style={{ background: est.bg, color: est.color, fontSize: 11, fontWeight: 700,
                          padding: "3px 9px", borderRadius: 99, display:"inline-flex", alignItems:"center", gap:4 }}>
                          <span className="pulse-dot" style={{ display: "inline-block",
                            width: 6, height: 6, borderRadius: "50%", background: est.dot }}/>
                          {obra.estado_obra}
                        </span>
                        {obra.region && (
                          <span style={{ fontSize: 11, color: "#64748b", background:"#f8fafc",
                            padding:"2px 7px", borderRadius:99, border:"1px solid #e2e8f0" }}>
                            📍 {obra.region}
                          </span>
                        )}
                        <PlazoChip fecha={obra.fecha_termino_contractual} />
                      </div>

                      {/* Nombre */}
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: "0 0 8px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        letterSpacing: "-.01em" }}>
                        {obra.nombre}
                      </h3>

                      {/* Meta info */}
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: obra.monto_contrato ? 10 : 0 }}>
                        {obra.contratista && (
                          <span style={{ fontSize: 12, color: "#64748b", display:"flex", alignItems:"center", gap:4 }}>
                            🏢 <span style={{ maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{obra.contratista}</span>
                          </span>
                        )}
                        {obra.inspector_fiscal && (
                          <span style={{ fontSize: 12, color: "#64748b" }}>👤 {obra.inspector_fiscal}</span>
                        )}
                        {obra.monto_contrato && (
                          <span style={{ fontSize: 12, color: "#6366f1", fontWeight: 700 }}>
                            💰 {fmtPeso(obra.monto_contrato)}
                          </span>
                        )}
                        {obra.fecha_inicio && (
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>
                            📅 {new Date(obra.fecha_inicio).toLocaleDateString("es-CL")}
                            {obra.fecha_termino_contractual && (
                              <> → {new Date(obra.fecha_termino_contractual).toLocaleDateString("es-CL")}</>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Barra de avance si hay porcentaje */}
                      {obra.porcentaje_avance != null && obra.porcentaje_avance > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <span style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>AVANCE EP</span>
                            <span style={{ fontSize:10, color:"#6366f1", fontWeight:700 }}>{Math.round(obra.porcentaje_avance)}%</span>
                          </div>
                          <div style={{ height:4, background:"#e2e8f0", borderRadius:99, overflow:"hidden" }}>
                            <div style={{ width:`${Math.min(obra.porcentaje_avance,100)}%`, height:"100%",
                              borderRadius:99, background: obra.porcentaje_avance >= 100 ? "#6366f1" : "#818cf8",
                              transition:"width .6s ease" }}/>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection:"column", gap: 6, flexShrink: 0, alignItems:"flex-end" }}>
                      <button
                        onClick={e => { e.stopPropagation(); setNavegando(true); router.push(`/obra?id=${obra.id}`); }}
                        className="btn-press"
                        style={{ background: "#eef2ff", color: "#6366f1", border: "1px solid #bbf7d0",
                          borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700,
                          cursor: "pointer", transition: "background .15s, box-shadow .15s",
                          whiteSpace:"nowrap" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#dcfce7"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(99,102,241,.2)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#eef2ff"; e.currentTarget.style.boxShadow = "none"; }}>
                        Abrir →
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmarEliminar(obra); }}
                        className="btn-press"
                        style={{ background: "#fff", color: "#ef4444", border: "1px solid #fca5a5",
                          borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer",
                          transition: "background .15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#fff5f5"}
                        onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Modal nueva obra ── */}
      {creando && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center",
          justifyContent: "center", padding: 16, backdropFilter: "blur(6px)",
          background: "rgba(0,0,0,.35)", animation: "fadeIn .2s ease both" }}>
          <div className="anim-scale-in"
            style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 440,
              boxShadow: "0 24px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", margin: "0 0 20px" }}>
              🏗️ Nueva Obra
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase",
                letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                Nombre de la obra
              </label>
              <input
                autoFocus
                value={nombreNuevo}
                onChange={e => setNombreNuevo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && crearObra()}
                placeholder="Ej: Mejoramiento veredas sector norte"
                className="input-focus"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0",
                  borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none",
                  boxSizing: "border-box", transition: "border-color .15s, box-shadow .15s" }}
                onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.12)"; }}
                onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase",
                letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                Estado inicial
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ESTADOS.map(e => {
                  const st = ESTADO_ST[e];
                  const active = estadoNuevo === e;
                  return (
                    <button key={e} onClick={() => setEstadoNuevo(e)}
                      className="btn-press"
                      style={{ padding: "6px 12px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                        border: active ? `1.5px solid ${st.dot}` : "1.5px solid #e2e8f0",
                        background: active ? st.bg : "#fff", color: active ? st.color : "#64748b",
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "background .15s, border-color .15s, color .15s" }}>
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={crearObra} disabled={!nombreNuevo.trim() || creandoLoading}
                className="btn-primary"
                style={{ flex: 1, background: "#6366f1", color: "#fff", border: "none", borderRadius: 12,
                  padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  opacity: !nombreNuevo.trim() ? 0.5 : 1, fontFamily: "inherit",
                  transition: "opacity .15s" }}>
                {creandoLoading ? "⏳ Creando..." : "Crear obra →"}
              </button>
              <button onClick={() => { setCreando(false); setNombreNuevo(""); }}
                className="btn-press"
                style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 12,
                  padding: "12px 18px", fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                  transition: "background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
                onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar ── */}
      {confirmarEliminar && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center",
          justifyContent: "center", padding: 16, backdropFilter: "blur(6px)",
          background: "rgba(0,0,0,.35)", animation: "fadeIn .2s ease both" }}>
          <div className="anim-scale-in"
            style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 380,
              boxShadow: "0 24px 60px rgba(0,0,0,.2)", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>
              Eliminar obra
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 4px" }}>
              ¿Eliminar <strong>{confirmarEliminar.nombre}</strong>?
            </p>
            <p style={{ fontSize: 12, color: "#ef4444", margin: "0 0 24px" }}>
              Se eliminarán todos los documentos, estados de pago, garantías y bitácora.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => eliminarObra(confirmarEliminar.id)}
                className="btn-press"
                style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 10,
                  padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", transition: "background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#dc2626"}
                onMouseLeave={e => e.currentTarget.style.background = "#ef4444"}>
                Eliminar
              </button>
              <button onClick={() => setConfirmarEliminar(null)}
                className="btn-press"
                style={{ flex: 1, background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 10,
                  padding: "11px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  transition: "background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
                onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
