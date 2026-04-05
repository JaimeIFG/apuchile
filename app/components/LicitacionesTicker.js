"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

/* ── Tipo metadata ── */
const TIPO_INFO = {
  L1: { label: "<100 UTM",    bg: "#dbeafe", color: "#1d4ed8" },
  LE: { label: ">1000 UTM",   bg: "#ede9fe", color: "#6d28d9" },
  LP: { label: "Gran Lic.",   bg: "#fef3c7", color: "#92400e" },
  LR: { label: "Renegoc.",    bg: "#fee2e2", color: "#991b1b" },
  E2: { label: "T. Directo",  bg: "#f1f5f9", color: "#475569" },
};

const REGIONES = [
  "Arica y Parinacota","Tarapacá","Antofagasta","Atacama","Coquimbo",
  "Valparaíso","Región Metropolitana","O'Higgins","Maule","Ñuble",
  "Biobío","La Araucanía","Los Ríos","Los Lagos","Aysén","Magallanes",
];

function diasRestantes(fechaCierre) {
  if (!fechaCierre) return null;
  const d = Math.ceil((new Date(fechaCierre) - new Date()) / 86400000);
  return d >= 0 ? d : null;
}

/* ── Inline style helpers ── */
function chipSt(active) {
  return {
    padding: "4px 10px", borderRadius: 99, fontSize: 10.5, fontWeight: 600,
    background: active ? "#6366f1" : "#f1f5f9", color: active ? "#fff" : "#475569",
    border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
    transition: "background .12s, color .12s",
  };
}

const lblSt = {
  fontSize: 9, textTransform: "uppercase", letterSpacing: ".05em",
  color: "#64748b", fontWeight: 600, marginBottom: 5,
};

const inputSt = {
  width: 76, padding: "5px 8px", border: "1.5px solid #e2e8f0",
  borderRadius: 8, fontSize: 11, fontFamily: "inherit",
};

const selectSt = {
  padding: "5px 8px", border: "1.5px solid #e2e8f0", borderRadius: 8,
  fontSize: 11, color: "#475569", background: "#fff",
  fontFamily: "inherit", minWidth: 155,
};

/* ══════════════════════════════════════════════════════ */
export default function LicitacionesTicker() {
  const [licitaciones, setLicitaciones] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [panelOpen, setPanelOpen]       = useState(false);

  /* Filtros */
  const [tipoFiltro,   setTipoFiltro]   = useState([]);   // [] = todos
  const [regionFiltro, setRegionFiltro] = useState("");
  const [montoMin,     setMontoMin]     = useState("");
  const [montoMax,     setMontoMax]     = useState("");
  const [diasFiltro,   setDiasFiltro]   = useState(null); // null = todos

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetch("/api/licitaciones", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
        .then(r => r.json())
        .then(d => { setLicitaciones(d.licitaciones || []); setLoading(false); })
        .catch(() => setLoading(false));
    });
  }, []);

  /* ── Aplicar filtros ── */
  const filtradas = licitaciones.filter(l => {
    if (tipoFiltro.length > 0 && !tipoFiltro.includes(l.tipo)) return false;
    if (regionFiltro && l.region && !l.region.toLowerCase().includes(regionFiltro.toLowerCase())) return false;
    if (montoMin && l.monto && l.monto < Number(montoMin)) return false;
    if (montoMax && l.monto && l.monto > Number(montoMax)) return false;
    if (diasFiltro !== null) {
      const d = diasRestantes(l.cierre);
      if (d === null || d > diasFiltro) return false;
    }
    return true;
  });

  const toggleTipo = t =>
    setTipoFiltro(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  /* ── Loading state ── */
  if (loading) return (
    <div style={{background:"#1e3a8a", color:"rgba(255,255,255,.55)", fontSize:11,
      padding:"11px 16px", display:"flex", alignItems:"center", gap:8, flexShrink:0}}>
      <span className="pulse-dot" style={{display:"inline-block", width:6, height:6,
        borderRadius:"50%", background:"#818cf8", flexShrink:0}}/>
      Cargando licitaciones Mercado Público...
    </div>
  );

  /* ── Items para el marquee (duplicados para loop infinito) ── */
  const marqueeItems = licitaciones.length > 0
    ? [...licitaciones, ...licitaciones]
    : [];

  return (
    <div style={{flexShrink: 0}}>

      {/* ══ TICKER BAR ══ */}
      <div style={{background:"#1e3a8a", height:44, display:"flex", alignItems:"center",
        overflow:"hidden", position:"relative", flexShrink:0}}>

        {/* Label naranja */}
        <div style={{background:"#f97316", color:"#fff", fontSize:9, fontWeight:700,
          textTransform:"uppercase", letterSpacing:".06em", padding:"5px 12px",
          borderRadius:"0 7px 7px 0", whiteSpace:"nowrap", flexShrink:0, zIndex:2}}>
          🏛️ Licitaciones MP
        </div>

        {/* ── Marquee ── */}
        {licitaciones.length === 0 ? (
          <span style={{color:"rgba(255,255,255,.4)", fontSize:11, paddingLeft:16, flex:1}}>
            Sin resultados — agrega tu ticket Mercado Público en Vercel
          </span>
        ) : (
          <div
            style={{flex:1, overflow:"hidden", position:"relative", height:"100%",
              display:"flex", alignItems:"center"}}
            onMouseEnter={e => {
              const t = e.currentTarget.querySelector(".marquee-track");
              if (t) t.style.animationPlayState = "paused";
            }}
            onMouseLeave={e => {
              const t = e.currentTarget.querySelector(".marquee-track");
              if (t) t.style.animationPlayState = "running";
            }}>
            {/* fade edges */}
            <div style={{position:"absolute", left:0, top:0, bottom:0, width:28,
              background:"linear-gradient(to right,#1e3a8a,transparent)", zIndex:1, pointerEvents:"none"}}/>
            <div style={{position:"absolute", right:0, top:0, bottom:0, width:28,
              background:"linear-gradient(to left,#1e3a8a,transparent)", zIndex:1, pointerEvents:"none"}}/>

            <div className="marquee-track">
              {marqueeItems.map((l, i) => {
                const ti = TIPO_INFO[l.tipo] || TIPO_INFO.E2;
                const d  = diasRestantes(l.cierre);
                return (
                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                    style={{display:"inline-flex", alignItems:"center", gap:7, padding:"0 22px",
                      borderRight:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.88)",
                      fontSize:11.5, textDecoration:"none", flexShrink:0}}>
                    <span style={{fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:4,
                      background:ti.bg, color:ti.color, flexShrink:0}}>
                      {l.tipo}
                    </span>
                    <span>{l.nombre}</span>
                    <span style={{color:"rgba(255,255,255,.4)", fontSize:10}}>· {l.organismo}</span>
                    {d !== null && (
                      <span style={{fontSize:9.5, fontWeight:700, flexShrink:0,
                        color: d <= 3 ? "#f87171" : d <= 7 ? "#fbbf24" : "#a5b4fc"}}>
                        {d === 0 ? "Cierra hoy" : `${d}d`}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Controles derecha */}
        <div style={{display:"flex", alignItems:"center", gap:8, padding:"0 12px",
          flexShrink:0, zIndex:2}}>
          <span style={{fontSize:11, color:"rgba(255,255,255,.55)", whiteSpace:"nowrap"}}>
            {licitaciones.length} activas
          </span>
          <button
            onClick={() => setPanelOpen(o => !o)}
            style={{background:"#f97316", color:"#fff", border:"none", borderRadius:7,
              padding:"5px 11px", fontSize:10.5, fontWeight:700, cursor:"pointer",
              display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap",
              fontFamily:"inherit", transition:"opacity .15s"}}
            onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            ⚙ Filtrar {panelOpen ? "▲" : "▾"}
          </button>
        </div>
      </div>

      {/* ══ PANEL DE FILTROS ══ */}
      {panelOpen && (
        <div className="anim-slide-down"
          style={{background:"#fff", borderBottom:"2px solid #6366f1",
            boxShadow:"0 8px 24px rgba(6,95,70,.1)", padding:"16px 20px", flexShrink:0}}>

          {/* Fila 1 — Tipo */}
          <div style={{marginBottom:12}}>
            <div style={lblSt}>Tipo de licitación</div>
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              <button style={chipSt(tipoFiltro.length === 0)} onClick={() => setTipoFiltro([])}>
                Todos
              </button>
              {Object.entries(TIPO_INFO).map(([k, v]) => (
                <button key={k} style={chipSt(tipoFiltro.includes(k))} onClick={() => toggleTipo(k)}>
                  <span style={{fontSize:9, fontWeight:700, padding:"1px 4px", borderRadius:3,
                    background:v.bg, color:v.color, marginRight:4}}>{k}</span>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fila 2 — Región + Monto + Cierre */}
          <div style={{display:"flex", gap:20, flexWrap:"wrap", marginBottom:14, alignItems:"flex-start"}}>
            <div>
              <div style={lblSt}>Región</div>
              <select value={regionFiltro} onChange={e => setRegionFiltro(e.target.value)} style={selectSt}>
                <option value="">Todas las regiones</option>
                {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <div style={lblSt}>Monto (UTM)</div>
              <div style={{display:"flex", gap:6, alignItems:"center"}}>
                <input type="number" placeholder="Mín" value={montoMin}
                  onChange={e => setMontoMin(e.target.value)} style={inputSt}/>
                <span style={{fontSize:10, color:"#94a3b8"}}>—</span>
                <input type="number" placeholder="Máx" value={montoMax}
                  onChange={e => setMontoMax(e.target.value)} style={inputSt}/>
              </div>
            </div>
            <div>
              <div style={lblSt}>Cierre</div>
              <div style={{display:"flex", gap:5, flexWrap:"wrap"}}>
                {[
                  {l:"Hoy", v:0}, {l:"< 3d", v:3}, {l:"< 7d", v:7},
                  {l:"< 30d", v:30}, {l:"Todos", v:null},
                ].map(({l, v}) => (
                  <button key={l} style={chipSt(diasFiltro === v)} onClick={() => setDiasFiltro(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))",
            gap:10, marginBottom:10}}>
            {filtradas.slice(0, 6).map(l => {
              const ti = TIPO_INFO[l.tipo] || TIPO_INFO.E2;
              const d  = diasRestantes(l.cierre);
              return (
                <div key={l.codigo}
                  style={{background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12,
                    padding:"10px 12px", display:"flex", flexDirection:"column", gap:4}}>
                  <div style={{display:"flex", alignItems:"flex-start", gap:6}}>
                    <span style={{fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4,
                      background:ti.bg, color:ti.color, flexShrink:0, marginTop:1}}>
                      {l.tipo}
                    </span>
                    <span style={{fontSize:11.5, fontWeight:600, color:"#1e293b", lineHeight:1.35}}>
                      {l.nombre}
                    </span>
                  </div>
                  <div style={{fontSize:10, color:"#64748b"}}>{l.organismo}</div>
                  <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:4}}>
                    {d !== null ? (
                      <span style={{background:"#fef3c7", color:"#92400e", fontSize:9.5,
                        fontWeight:600, padding:"2px 8px", borderRadius:99}}>
                        ⏱ {d === 0 ? "Cierra hoy" : `${d} días`}
                      </span>
                    ) : <span/>}
                    <a href={l.url} target="_blank" rel="noopener noreferrer"
                      style={{background:"#6366f1", color:"#fff", borderRadius:6, padding:"4px 10px",
                        fontSize:10, fontWeight:600, textDecoration:"none"}}>
                      Ver en MP →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {filtradas.length === 0 && (
            <p style={{textAlign:"center", fontSize:12, color:"#94a3b8", padding:"12px 0"}}>
              Sin resultados con los filtros actuales
            </p>
          )}

          <div style={{fontSize:10.5, color:"#94a3b8", textAlign:"center",
            paddingTop:8, borderTop:"1px solid #f1f5f9"}}>
            Mostrando {Math.min(filtradas.length, 6)} de {filtradas.length} licitaciones
            {licitaciones.length > filtradas.length && ` (${licitaciones.length} totales)`}
          </div>
        </div>
      )}
    </div>
  );
}
