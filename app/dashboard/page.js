"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useInactividad } from "../lib/useInactividad";
import { useIndicadores } from "../lib/useIndicadores";
import LicitacionesTicker from "../components/LicitacionesTicker";
import LoadingOverlay from "../components/LoadingOverlay";

const REGIONES = [
  { label: "Región Metropolitana", zona: 0 },
  { label: "Arica y Parinacota", zona: 0.10 },
  { label: "Tarapacá", zona: 0.10 },
  { label: "Antofagasta", zona: 0.10 },
  { label: "Atacama", zona: 0.10 },
  { label: "Coquimbo", zona: 0.05 },
  { label: "Valparaíso", zona: 0.05 },
  { label: "O'Higgins", zona: 0.05 },
  { label: "Maule", zona: 0.05 },
  { label: "Ñuble", zona: 0.10 },
  { label: "Biobío", zona: 0.15 },
  { label: "La Araucanía", zona: 0.15 },
  { label: "Los Ríos", zona: 0.15 },
  { label: "Los Lagos", zona: 0.20 },
  { label: "Aysén", zona: 0.30 },
  { label: "Magallanes", zona: 0.25 },
];

const META_INICIAL = { region: "", mandante: "", fechaInicio: "", fechaTermino: "", responsable: "" };

function diasCorridos(inicio, termino) {
  if (!inicio || !termino) return null;
  const d = Math.round((new Date(termino) - new Date(inicio)) / 86400000);
  return d > 0 ? d : null;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [proyectosCompartidos, setProyectosCompartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalCodigo, setModalCodigo] = useState(false);
  const [codigoInput, setCodigoInput] = useState("");
  const [codigoError, setCodigoError] = useState("");
  const [codigoCargando, setCodigoCargando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [meta, setMeta] = useState(META_INICIAL);
  const [creandoLoading, setCreandoLoading] = useState(false);
  const [importModal, setImportModal] = useState(null); // { id, nombre } del proyecto recién creado
  const [importTipo, setImportTipo] = useState("eett");
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const importFileRef = useRef(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null); // { id }
  const [confirmarCancelarImport, setConfirmarCancelarImport] = useState(false);
  const { uf, utm, fecha } = useIndicadores();

  // Perfil editable
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfilForm, setPerfilForm] = useState({ nombre: "", profesion: "", cargo: "" });
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fileInputRef = useRef(null);
  const [ultimaConexion, setUltimaConexion] = useState(null);
  const [regionDetectada, setRegionDetectada] = useState(null);
  const [usuariosOnline, setUsuariosOnline] = useState(1);
  const canalRef = useRef(null);
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const [confirmarLogout, setConfirmarLogout] = useState(false);
  const [guardandoSesion, setGuardandoSesion] = useState(false);
  const [progresoGuardado, setProgresoGuardado] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const m = user.user_metadata || {};
      setPerfilForm({ nombre: m.nombre || "", profesion: m.profesion || "", cargo: m.cargo || "" });
      setAvatarUrl(m.avatar_url || null);

      // Guardar última conexión y cargar la anterior
      const ahora = new Date().toISOString();
      const anterior = m.ultima_conexion || null;
      setUltimaConexion(anterior);
      supabase.auth.updateUser({ data: { ultima_conexion: ahora } });

      cargarProyectos(user.id);

      // Presencia en tiempo real
      const canal = supabase.channel("presencia-global", {
        config: { presence: { key: user.id } }
      });
      canalRef.current = canal;
      canal.on("presence", { event: "sync" }, () => {
        const estado = canal.presenceState();
        setUsuariosOnline(Object.keys(estado).length);
      });
      canal.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await canal.track({ user_id: user.id, en: new Date().toISOString() });
        }
      });
    });

    return () => { if (canalRef.current) supabase.removeChannel(canalRef.current); };

    // Geolocalización automática
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`
          );
          const data = await res.json();
          const region = data.principalSubdivision || data.locality || null;
          if (region) setRegionDetectada(region);
        } catch {}
      }, () => {}); // silenciar error si el usuario rechaza
    }
  }, []);

  useInactividad(supabase, router, 10);

  const cargarProyectos = async (uid) => {
    // Proyectos propios
    const { data } = await supabase.from("proyectos").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    setProyectos(data || []);

    // Proyectos compartidos conmigo
    const { data: colabs } = await supabase
      .from("proyecto_colaboradores")
      .select("proyecto_id, rol")
      .eq("user_id", uid);
    if (colabs?.length) {
      const ids = colabs.map(c => c.proyecto_id);
      const { data: compartidos } = await supabase.from("proyectos").select("*").in("id", ids).order("created_at", { ascending: false });
      setProyectosCompartidos((compartidos || []).map(p => ({
        ...p,
        _compartido: true,
        _rol: colabs.find(c => c.proyecto_id === p.id)?.rol || "editar",
      })));
    }
    setLoading(false);
  };

  const aceptarCodigoInvitacion = async () => {
    if (!codigoInput.trim() || !user) return;
    setCodigoCargando(true);
    setCodigoError("");
    const res = await fetch("/api/aceptar-invitacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: codigoInput.trim(), user_id: user.id, email: user.email }),
    });
    const d = await res.json();
    setCodigoCargando(false);
    if (d.error) { setCodigoError(d.error); return; }
    setModalCodigo(false);
    setCodigoInput("");
    router.push(`/proyecto?id=${d.proyecto_id}`);
  };

  const setM = (k, v) => setMeta(m => ({ ...m, [k]: v }));

  const guardarPerfil = async () => {
    const { data, error } = await supabase.auth.updateUser({
      data: { nombre: perfilForm.nombre, profesion: perfilForm.profesion, cargo: perfilForm.cargo }
    });
    if (!error) {
      setUser(data.user);
      setEditandoPerfil(false);
    }
  };

  const subirFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSubiendoFoto(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!upErr) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl + "?t=" + Date.now();
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      setAvatarUrl(url);
    }
    setSubiendoFoto(false);
  };

  const crearProyecto = async () => {
    if (!nombreNuevo.trim()) return;
    setCreandoLoading(true);
    const regionInfo = REGIONES.find(r => r.label === meta.region);
    const metaGuardar = {
      ...meta,
      zona: regionInfo ? regionInfo.zona : 0,
      diasCorridos: diasCorridos(meta.fechaInicio, meta.fechaTermino),
    };
    const { data, error } = await supabase.from("proyectos").insert({
      user_id: user.id,
      nombre: nombreNuevo.trim(),
      datos: [],
      meta: metaGuardar,
    }).select().single();
    setCreandoLoading(false);
    if (!error) {
      setProyectos(prev => [data, ...prev]);
      setCreando(false);
      setNombreNuevo("");
      setMeta(META_INICIAL);
      setImportModal({ id: data.id, nombre: data.nombre });
      setImportTipo("eett");
      setImportFile(null);
    }
  };

  const abrirProyecto = (id) => router.push(`/proyecto?id=${id}`);

  const eliminarProyecto = (id, e) => {
    e.stopPropagation();
    setConfirmarEliminar({ id });
  };

  const confirmarEliminarProyecto = async () => {
    if (!confirmarEliminar) return;
    await supabase.from("proyectos").delete().eq("id", confirmarEliminar.id);
    setProyectos(p => p.filter(x => x.id !== confirmarEliminar.id));
    setConfirmarEliminar(null);
  };

  const cerrarSesion = () => setConfirmarLogout(true);

  const ejecutarCierreSesion = async () => {
    setConfirmarLogout(false);
    setGuardandoSesion(true);
    setProgresoGuardado(0);
    // Guardar última conexión y animar progreso
    const pasos = [
      { p: 20, fn: () => supabase.auth.updateUser({ data: { ultima_conexion: new Date().toISOString() } }) },
      { p: 60, fn: () => new Promise(r => setTimeout(r, 400)) },
      { p: 90, fn: () => new Promise(r => setTimeout(r, 300)) },
      { p: 100, fn: () => new Promise(r => setTimeout(r, 200)) },
    ];
    for (const paso of pasos) {
      await paso.fn();
      setProgresoGuardado(paso.p);
    }
    await supabase.auth.signOut();
    router.push("/login");
  };

  const cerrarModal = () => {
    setCreando(false);
    setNombreNuevo("");
    setMeta(META_INICIAL);
  };

  const nombre = user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario";
  const profesion = user?.user_metadata?.profesion || "";
  const cargo = user?.user_metadata?.cargo || "";
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  const dias = diasCorridos(meta.fechaInicio, meta.fechaTermino);
  const zonaPreview = REGIONES.find(r => r.label === meta.region);

  // Totales para stats row
  const totalPartidas = proyectos.reduce((s, p) => s + (p.datos?.length || 0), 0);
  const totalValorBruto = proyectos.reduce((s, p) => {
    const zona = p.meta?.zona ?? 0;
    const cd = (p.datos || []).reduce((ss, i) => ss + (i.precio || 0) * (1 + zona) * (i.cantidad || 1), 0);
    return s + cd * 1.28 * 1.19;
  }, 0);
  const totalValorFmt = totalValorBruto >= 1e9
    ? `$${(totalValorBruto / 1e9).toFixed(1)}B`
    : totalValorBruto >= 1e6
    ? `$${(totalValorBruto / 1e6).toFixed(1)}M`
    : totalValorBruto > 0
    ? `$${Math.round(totalValorBruto).toLocaleString("es-CL")}`
    : "$0";

  if (loading) return (
    <div className="min-h-screen bg-gray-900">
      <LoadingOverlay visible={true} mensaje="Cargando dashboard..." blur={false} />
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* Sidebar izquierdo */}
      <aside style={{ width: sidebarAbierto ? "256px" : "72px", transition: "width 0.3s ease" }}
        className="bg-white border-r border-gray-100 flex flex-col shrink-0 min-h-screen relative overflow-hidden">

        {/* Botón toggle - centrado verticalmente */}
        <button onClick={() => setSidebarAbierto(a => !a)}
          style={{ transition: "transform 0.3s ease", top: "50%", transform: "translateY(-50%)" }}
          className="absolute -right-3 z-10 w-6 h-6 bg-white border border-gray-200 rounded-full shadow flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-400 transition-colors">
          <span style={{ display: "inline-block", transform: sidebarAbierto ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.3s ease", fontSize: "10px" }}>◀</span>
        </button>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100 flex items-center gap-2 overflow-hidden">
          {sidebarAbierto ? (
            <span className="text-lg font-bold text-emerald-800 whitespace-nowrap">APU<span className="text-emerald-500">chile</span></span>
          ) : (
            <span className="text-lg font-bold text-emerald-600 mx-auto">A</span>
          )}
        </div>

        {/* Perfil */}
        <div className="py-6 border-b border-gray-100 overflow-hidden">
          {/* Avatar — siempre visible con punto verde */}
          <div className="flex flex-col items-center px-3 mb-4">
            <div className="relative group mb-3">
              <div className={`${sidebarAbierto ? "w-20 h-20 rounded-2xl" : "w-11 h-11 rounded-xl"} bg-emerald-100 overflow-hidden flex items-center justify-center border-2 border-white shadow-md`}
                style={{ transition: "width 0.3s ease, height 0.3s ease" }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover"/>
                ) : (
                  <span className={`${sidebarAbierto ? "text-3xl" : "text-lg"} font-bold text-emerald-600`}>{nombre.charAt(0).toUpperCase()}</span>
                )}
              </div>
              {/* Punto verde conectado */}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"/>
              {sidebarAbierto && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-medium">
                  {subiendoFoto ? "Subiendo..." : "Cambiar foto"}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={subirFoto}/>
            </div>

            {/* Info perfil — solo si está abierto */}
            {sidebarAbierto && (
              <div style={{ opacity: sidebarAbierto ? 1 : 0, transition: "opacity 0.2s ease" }} className="w-full">
                {editandoPerfil ? (
                  <div className="w-full space-y-2">
                    <input value={perfilForm.nombre} onChange={e => setPerfilForm(f => ({...f, nombre: e.target.value}))}
                      placeholder="Nombre completo"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-400"/>
                    <input value={perfilForm.profesion} onChange={e => setPerfilForm(f => ({...f, profesion: e.target.value}))}
                      placeholder="Profesión"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-400"/>
                    <input value={perfilForm.cargo} onChange={e => setPerfilForm(f => ({...f, cargo: e.target.value}))}
                      placeholder="Cargo"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-400"/>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditandoPerfil(false)}
                        className="flex-1 text-xs text-gray-400 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50">Cancelar</button>
                      <button onClick={guardarPerfil}
                        className="flex-1 text-xs bg-emerald-600 text-white rounded-lg py-1.5 hover:bg-emerald-700">Guardar</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center w-full">
                    <p className="font-semibold text-gray-800 text-sm truncate">{nombre}</p>
                    {profesion && <p className="text-xs text-gray-500 mt-0.5 truncate">{profesion}</p>}
                    {cargo && <p className="text-xs text-emerald-600 font-medium mt-0.5 truncate">{cargo}</p>}
                    {regionDetectada && (
                      <p className="text-[11px] text-gray-400 mt-1 flex items-center justify-center gap-1">
                        <span>📍</span>{regionDetectada}
                      </p>
                    )}
                    {ultimaConexion && (
                      <p className="text-[10px] text-gray-300 mt-1">
                        Última vez: {new Date(ultimaConexion).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                    <button onClick={() => setEditandoPerfil(true)}
                      className="text-[11px] text-gray-400 hover:text-emerald-600 mt-2 transition-colors">
                      Editar perfil
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats — solo si está abierto */}
          {sidebarAbierto && (
            <div style={{ opacity: sidebarAbierto ? 1 : 0, transition: "opacity 0.2s ease" }} className="grid grid-cols-2 gap-2 px-3">
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{proyectos.length}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{proyectos.length === 1 ? "proyecto creado" : "proyectos creados"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"/>
                  <p className="text-2xl font-bold text-emerald-600">{usuariosOnline}</p>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{usuariosOnline === 1 ? "en línea" : "en línea"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Indicadores UF/UTM — solo si está abierto */}
        {sidebarAbierto && (
          <div style={{ opacity: sidebarAbierto ? 1 : 0, transition: "opacity 0.2s ease" }} className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Valores en tiempo real</p>
            {uf ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-500">UF</span>
                  <span className="text-sm font-bold text-gray-700">${uf.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-500">UTM</span>
                  <span className="text-sm font-bold text-gray-700">${utm?.toLocaleString("es-CL") ?? "—"}</span>
                </div>
                {fecha && <p className="text-[10px] text-gray-300 text-right">Actualizado {fecha}</p>}
              </div>
            ) : (
              <p className="text-xs text-gray-300">Cargando...</p>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1"/>

        {/* Email + Cerrar sesión */}
        <div className={`${sidebarAbierto ? "px-5" : "px-2"} py-4 border-t border-gray-100`}>
          {sidebarAbierto && <p className="text-[11px] text-gray-400 truncate mb-3">{user?.email}</p>}
          <button onClick={cerrarSesion}
            className={`w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 rounded-xl py-2.5 transition-all`}>
            <span>{sidebarAbierto ? "Cerrar sesión" : "⏻"}</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Ticker licitaciones */}
        <LicitacionesTicker />
        <main className="max-w-4xl mx-auto px-8 py-6 flex-1 w-full">

          {/* ── Header card ── */}
          <div className="rounded-2xl overflow-hidden anim-scale-in mb-4"
            style={{background:"linear-gradient(135deg,#065f46 0%,#059669 60%,#10b981 100%)",
              boxShadow:"0 4px 20px rgba(6,95,70,.28)", padding:"20px 24px", position:"relative"}}>
            <div style={{position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,.08) 1px,transparent 1px)",
              backgroundSize:"20px 20px", pointerEvents:"none"}}/>
            <div className="shimmer-sweep"/>
            <div style={{position:"relative", zIndex:1, display:"flex", alignItems:"center",
              justifyContent:"space-between", gap:16, flexWrap:"wrap"}}>
              <div>
                <p style={{fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".14em",
                  color:"rgba(255,255,255,.55)", marginBottom:4}}>{saludo}</p>
                <h1 style={{fontSize:22, fontWeight:900, color:"#fff", letterSpacing:"-.02em", lineHeight:1.2}}>
                  {nombre}
                </h1>
                <p style={{fontSize:12, color:"rgba(255,255,255,.5)", marginTop:4}}>
                  ¿En qué proyecto trabajamos hoy?
                </p>
              </div>
              <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6}}>
                <span style={{background:"rgba(255,255,255,.14)", border:"1px solid rgba(255,255,255,.18)",
                  color:"rgba(255,255,255,.85)", borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:600}}>
                  {new Date().toLocaleDateString("es-CL",{weekday:"long",day:"2-digit",month:"short",year:"numeric"})}
                </span>
                <div style={{display:"flex", gap:6}}>
                  {uf && <span style={{background:"rgba(249,115,22,.2)", border:"1px solid rgba(249,115,22,.3)",
                    color:"#fed7aa", borderRadius:99, padding:"4px 10px", fontSize:10.5, fontWeight:700}}>
                    UF ${uf.toLocaleString("es-CL",{minimumFractionDigits:2,maximumFractionDigits:2})}
                  </span>}
                  {utm && <span style={{background:"rgba(8,145,178,.2)", border:"1px solid rgba(8,145,178,.3)",
                    color:"#a5f3fc", borderRadius:99, padding:"4px 10px", fontSize:10.5, fontWeight:700}}>
                    UTM ${utm?.toLocaleString("es-CL")}
                  </span>}
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { num:proyectos.length, lbl:"Proyectos",   sub:"en tu cuenta",          color:"#059669", border:"#059669" },
              { num:totalPartidas,    lbl:"Partidas",    sub:"en todos los proyectos", color:"#f97316", border:"#f97316" },
              { num:totalValorFmt,    lbl:"Valor total", sub:"con utilidades + IVA",   color:"#0891b2", border:"#0891b2", isStr:true },
              { num:usuariosOnline,   lbl:"En línea",    sub:"en este momento",        color:"#16a34a", border:"#16a34a", pulse:true },
            ].map(({ num, lbl, sub, color, border, isStr, pulse }, i) => (
              <div key={lbl} className="bg-white rounded-2xl shadow-sm anim-fade-up"
                style={{padding:"14px 16px", borderBottom:`3px solid ${border}`, animationDelay:`${i*50}ms`}}>
                <div style={{fontSize:24, fontWeight:900, color, lineHeight:1, marginBottom:3,
                  display:"flex", alignItems:"center", gap:6}}>
                  {pulse && <span className="pulse-dot" style={{display:"inline-block", width:8, height:8,
                    borderRadius:"50%", background:color, flexShrink:0}}/>}
                  {isStr ? num : num.toLocaleString("es-CL")}
                </div>
                <div style={{fontSize:9, textTransform:"uppercase", letterSpacing:".06em",
                  fontWeight:700, color:"#64748b", marginBottom:2}}>{lbl}</div>
                <div style={{fontSize:9.5, color:"#94a3b8"}}>{sub}</div>
              </div>
            ))}
          </div>

          {/* ── Acciones principales ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { icon:"＋", label:"Nuevo proyecto",  action:() => setCreando(true),
                st:{background:"linear-gradient(135deg,#065f46,#059669)", borderBottom:"3px solid #34d399"}, txt:"#fff" },
              { icon:"📂", label:"Mis proyectos",   action:() => document.getElementById("mis-proyectos")?.scrollIntoView({behavior:"smooth"}),
                st:{background:"#fff", border:"1.5px solid #e2e8f0", borderBottom:"3px solid #059669"}, txt:"#374151" },
              { icon:"🏗️", label:"Ejecución de Obras", action:() => router.push("/obras"),
                st:{background:"#fff", border:"1.5px solid #e2e8f0", borderBottom:"3px solid #0891b2"}, txt:"#374151" },
              { icon:"⚙️", label:"Configuración",   action:() => alert("Próximamente"),
                st:{background:"#fff", border:"1.5px solid #e2e8f0", borderBottom:"3px solid #64748b"}, txt:"#374151" },
            ].map((c, i) => (
              <button key={i} onClick={c.action}
                className="rounded-2xl flex flex-col items-center justify-center gap-3 aspect-square shadow-sm anim-fade-up card-hover btn-press"
                style={{...c.st, padding:"18px 12px", animationDelay:`${i*50+100}ms`}}>
                <span className="text-3xl">{c.icon}</span>
                <span className="text-sm font-semibold text-center leading-tight" style={{color:c.txt}}>{c.label}</span>
              </button>
            ))}
          </div>

          {/* Modal confirmar cerrar sesión */}
          {confirmarLogout && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in" style={{backdropFilter:"blur(6px)", background:"rgba(0,0,0,0.35)"}}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center anim-scale-in">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">👋</span>
                </div>
                <h3 className="text-base font-bold text-gray-800 mb-1">¿Cerrar sesión?</h3>
                <p className="text-sm text-gray-500 mb-6">Se guardará tu información antes de salir.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmarLogout(false)}
                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 btn-press">
                    Cancelar
                  </button>
                  <button onClick={ejecutarCierreSesion}
                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium btn-primary">
                    Sí, salir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Overlay guardando al cerrar sesión */}
          <LoadingOverlay
            visible={guardandoSesion}
            progress={progresoGuardado}
            mensaje={progresoGuardado < 30 ? "Guardando perfil..." : progresoGuardado < 70 ? "Sincronizando proyectos..." : progresoGuardado < 100 ? "Cerrando sesión..." : "¡Hasta pronto!"}
          />

          {/* Modal nuevo proyecto */}
          {creando && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 anim-fade-in" style={{backdropFilter:"blur(6px)", background:"rgba(0,0,0,0.3)"}}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto anim-scale-in">
                <div className="p-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-6">Nuevo proyecto</h3>

                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Nombre del proyecto *</label>
                    <input autoFocus type="text" value={nombreNuevo} onChange={e => setNombreNuevo(e.target.value)}
                      placeholder="Ej: Habilitación oficinas piso 3"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Región / Ubicación</label>
                    <select value={meta.region} onChange={e => setM("region", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white">
                      <option value="">Selecciona una región...</option>
                      {REGIONES.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
                    </select>
                    {zonaPreview && (
                      <p className="text-xs text-emerald-600 mt-1.5">
                        <span className="font-medium">Factor zona:</span> {zonaPreview.zona === 0 ? "Sin recargo (zona base)" : `+${(zonaPreview.zona * 100).toFixed(0)}% sobre mano de obra`}
                      </p>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Nombre del mandante</label>
                    <input type="text" value={meta.mandante} onChange={e => setM("mandante", e.target.value)}
                      placeholder="Ej: Ministerio de Obras Públicas"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">Fecha de inicio</label>
                      <input type="date" value={meta.fechaInicio} onChange={e => setM("fechaInicio", e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">Fecha de término</label>
                      <input type="date" value={meta.fechaTermino} onChange={e => setM("fechaTermino", e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
                    </div>
                  </div>
                  {dias !== null && (
                    <p className="text-xs text-emerald-600 mb-4"><span className="font-medium">Plazo:</span> {dias} días corridos</p>
                  )}
                  {dias === null && (meta.fechaInicio || meta.fechaTermino) && (
                    <p className="text-xs text-gray-400 mb-4">Ingresa ambas fechas para calcular el plazo</p>
                  )}

                  <div className="mb-6">
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Persona a cargo</label>
                    <input type="text" value={meta.responsable} onChange={e => setM("responsable", e.target.value)}
                      placeholder="Ej: Ing. Carlos Soto"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
                  </div>

                  {(meta.region || meta.mandante || meta.responsable || dias) && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6 space-y-1.5">
                      <p className="text-xs font-semibold text-emerald-700 mb-2">Resumen del proyecto</p>
                      {nombreNuevo && <p className="text-xs text-gray-600"><span className="text-gray-400">Nombre:</span> {nombreNuevo}</p>}
                      {meta.region && <p className="text-xs text-gray-600"><span className="text-gray-400">Ubicación:</span> {meta.region}</p>}
                      {meta.mandante && <p className="text-xs text-gray-600"><span className="text-gray-400">Mandante:</span> {meta.mandante}</p>}
                      {dias !== null && <p className="text-xs text-gray-600"><span className="text-gray-400">Plazo:</span> {dias} días corridos</p>}
                      {meta.responsable && <p className="text-xs text-gray-600"><span className="text-gray-400">Responsable:</span> {meta.responsable}</p>}
                      {zonaPreview && zonaPreview.zona > 0 && (
                        <p className="text-xs text-emerald-600 font-medium">Factor zona +{(zonaPreview.zona * 100).toFixed(0)}% aplicado a MO</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={cerrarModal}
                      className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm hover:bg-gray-50 btn-press">
                      Cancelar
                    </button>
                    <button onClick={crearProyecto} disabled={!nombreNuevo.trim() || creandoLoading}
                      className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 btn-primary">
                      {creandoLoading ? "Creando..." : "Crear proyecto →"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal importar archivo al crear proyecto */}
          {importModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in" style={{backdropFilter:"blur(6px)", background:"rgba(0,0,0,0.45)"}}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative anim-scale-in">
                <button onClick={() => setConfirmarCancelarImport(true)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📂</span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">¡Proyecto creado!</h2>
                  <p className="text-sm text-gray-500 mt-1">¿Quieres importar un archivo para comenzar?</p>
                </div>

                {/* Tipo de documento */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { key: "eett", label: "EE.TT.", desc: "Especificación técnica", icon: "📋" },
                    { key: "presupuesto", label: "Presupuesto", desc: "Cubicación / APU", icon: "💰" },
                    { key: "plano", label: "Plano / CAD", desc: "DWG, DXF, PDF plano", icon: "📐" },
                    { key: "otro", label: "Otro documento", desc: "Cualquier referencia", icon: "📄" },
                  ].map(op => (
                    <button key={op.key} onClick={() => setImportTipo(op.key)}
                      className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-all ${importTipo === op.key ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <span className="text-lg">{op.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">{op.label}</p>
                        <p className="text-[10px] text-gray-400">{op.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Drop zone */}
                <div onClick={() => importFileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors mb-4 ${importFile ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:border-emerald-300"}`}>
                  <input ref={importFileRef} type="file" className="hidden"
                    accept=".pdf,.xlsx,.xls,.dwg,.dxf"
                    onChange={e => setImportFile(e.target.files[0] || null)} />
                  {importFile ? (
                    <div>
                      <p className="text-sm font-medium text-emerald-700">✓ {importFile.name}</p>
                      <p className="text-xs text-gray-400">{(importFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500">Arrastra o haz clic para seleccionar</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, Excel (.xlsx), AutoCAD (.dwg, .dxf)</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setImportModal(null); router.push(`/proyecto?id=${importModal.id}`); }}
                    className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm hover:bg-gray-50 btn-press">
                    Comenzar manual
                  </button>
                  <button
                    disabled={!importFile || importLoading}
                    onClick={async () => {
                      if (!importFile) return;
                      setImportLoading(true);
                      const path = `${importModal.id}/${importFile.name}`;
                      const { error: upErr } = await supabase.storage.from("anexos").upload(path, importFile, { upsert: true });
                      setImportLoading(false);
                      if (upErr) { alert("Error al subir: " + upErr.message); return; }
                      const tipoMap = { eett: "eett", presupuesto: "presupuesto", plano: "plano", otro: "eett" };
                      router.push(`/proyecto?id=${importModal.id}&tab=anexos&archivo=${encodeURIComponent(path)}&tipo=${tipoMap[importTipo]}`);
                    }}
                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 btn-primary">
                    {importLoading ? "Subiendo..." : "Importar y abrir →"}
                  </button>
                </div>

                {/* Confirmar cancelar y eliminar proyecto recién creado */}
                {confirmarCancelarImport && (
                  <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
                      <span className="text-2xl">🗑️</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-800 mb-1">¿Eliminar proyecto?</h3>
                    <p className="text-sm text-gray-500 mb-6">El proyecto se eliminará como si nunca se hubiera creado.</p>
                    <div className="flex gap-3 w-full">
                      <button onClick={() => setConfirmarCancelarImport(false)}
                        className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">
                        No, cancelar
                      </button>
                      <button onClick={async () => {
                        await supabase.from("proyectos").delete().eq("id", importModal.id);
                        setProyectos(p => p.filter(x => x.id !== importModal.id));
                        setConfirmarCancelarImport(false);
                        setImportModal(null);
                      }}
                        className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600">
                        Sí, eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal confirmar eliminación */}
          {confirmarEliminar && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in" style={{backdropFilter:"blur(6px)", background:"rgba(0,0,0,0.45)"}}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center anim-scale-in">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🗑️</span>
                </div>
                <h3 className="text-base font-bold text-gray-800 mb-1">¿Eliminar proyecto?</h3>
                <p className="text-sm text-gray-500 mb-6">Esta acción no se puede deshacer. Se eliminará el proyecto y todos sus datos.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmarEliminar(null)}
                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 btn-press">
                    No, cancelar
                  </button>
                  <button onClick={confirmarEliminarProyecto}
                    className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 btn-press">
                    Sí, eliminar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Proyectos recientes ── */}
          <div id="mis-proyectos">
            <div className="flex items-center justify-between mb-4 anim-fade-up delay-300">
              <h2 className="text-[14px] font-bold text-gray-800">Mis proyectos</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setModalCodigo(true); setCodigoError(""); setCodigoInput(""); }}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg btn-press hover:bg-emerald-100">
                  🔑 Unirse a proyecto
                </button>
                {(proyectos.length + proyectosCompartidos.length) > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-600">{proyectos.length + proyectosCompartidos.length} proyecto{(proyectos.length + proyectosCompartidos.length) !== 1 ? "s" : ""}</span>
                )}
              </div>
            </div>
            {proyectos.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center anim-fade-up delay-350"
                style={{border:"1.5px solid #f1f5f9", borderBottom:"3px solid #059669"}}>
                <p className="text-gray-400 text-sm mb-3">No tienes proyectos aún</p>
                <button onClick={() => setCreando(true)} className="text-emerald-600 text-sm font-semibold underline btn-press">
                  Crea tu primer proyecto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {proyectos.map((p, idx) => {
                  const m = p.meta || {};
                  const dc = m.diasCorridos || diasCorridos(m.fechaInicio, m.fechaTermino);
                  const zona = m.zona ?? 0;
                  const cd = (p.datos || []).reduce((s, item) => s + (item.precio || 0) * (1 + zona) * (item.cantidad || 1), 0);
                  const total = cd * 1.28 * 1.19;
                  const montoLabel = total >= 1e6
                    ? `$${(total / 1e6).toFixed(1)}M`
                    : total > 0 ? `$${Math.round(total).toLocaleString("es-CL")}` : null;
                  return (
                    <button key={p.id} onClick={() => abrirProyecto(p.id)}
                      className="bg-white rounded-2xl text-left group card-hover anim-fade-up"
                      style={{animationDelay:`${350 + idx * 60}ms`, padding:20,
                        border:"1.5px solid #f1f5f9", borderBottom:"3px solid #059669",
                        boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-2xl transition-transform duration-200 group-hover:scale-110">📋</span>
                        <button onClick={e => eliminarProyecto(p.id, e)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-all btn-press"
                          style={{background:"#fee2e2", color:"#ef4444"}}>✕</button>
                      </div>
                      <div className="font-semibold text-sm mb-1 truncate" style={{color:"#1f2937"}}>{p.nombre}</div>
                      {montoLabel && (
                        <div className="font-extrabold mb-2" style={{fontSize:18, color:"#059669"}}>{montoLabel}</div>
                      )}
                      {(m.region || m.mandante) && (
                        <div className="space-y-0.5 mb-2">
                          {m.region   && <p className="text-xs truncate" style={{color:"#94a3b8"}}>{m.region}</p>}
                          {m.mandante && <p className="text-xs font-semibold truncate" style={{color:"#059669"}}>{m.mandante}</p>}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs pt-2"
                        style={{borderTop:"1px solid #f1f5f9", marginTop:8, color:"#94a3b8"}}>
                        <span>{(p.datos || []).length} partidas</span>
                        <span style={{color:"#059669", fontWeight:600}}>
                          {dc ? `${dc} días` : new Date(p.updated_at).toLocaleDateString("es-CL")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Proyectos compartidos conmigo */}
            {proyectosCompartidos.length > 0 && (
              <div className="mt-8">
                <h3 className="text-[13px] font-bold text-gray-600 mb-3 flex items-center gap-2">
                  <span>👥</span> Compartidos conmigo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {proyectosCompartidos.map((p, idx) => {
                    const m = p.meta || {};
                    const dc = m.diasCorridos || diasCorridos(m.fechaInicio, m.fechaTermino);
                    const zona = m.zona ?? 0;
                    const cd = (p.datos || []).reduce((s, item) => s + (item.precio || 0) * (1 + zona) * (item.cantidad || 1), 0);
                    const total = cd * 1.28 * 1.19;
                    const montoLabel = total >= 1e6 ? `$${(total / 1e6).toFixed(1)}M` : total > 0 ? `$${Math.round(total).toLocaleString("es-CL")}` : null;
                    const rolColor = { visualizar: "#64748b", editar: "#2563eb", administrar: "#059669" }[p._rol] || "#64748b";
                    const rolLabel = { visualizar: "Solo lectura", editar: "Puede editar", administrar: "Administrador" }[p._rol] || p._rol;
                    return (
                      <button key={p.id} onClick={() => abrirProyecto(p.id)}
                        className="bg-white rounded-2xl text-left group card-hover anim-fade-up"
                        style={{ animationDelay: `${350 + idx * 60}ms`, padding: 20,
                          border: "1.5px solid #dbeafe", borderBottom: "3px solid #3b82f6",
                          boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-2xl">🤝</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${rolColor}15`, color: rolColor }}>
                            {rolLabel}
                          </span>
                        </div>
                        <div className="font-semibold text-sm mb-1 truncate" style={{ color: "#1f2937" }}>{p.nombre}</div>
                        {montoLabel && (
                          <div className="font-extrabold mb-2" style={{ fontSize: 18, color: "#3b82f6" }}>{montoLabel}</div>
                        )}
                        {(m.region || m.mandante) && (
                          <div className="space-y-0.5 mb-2">
                            {m.region   && <p className="text-xs truncate" style={{ color: "#94a3b8" }}>{m.region}</p>}
                            {m.mandante && <p className="text-xs font-semibold truncate" style={{ color: "#3b82f6" }}>{m.mandante}</p>}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs pt-2"
                          style={{ borderTop: "1px solid #f1f5f9", marginTop: 8, color: "#94a3b8" }}>
                          <span>{(p.datos || []).length} partidas</span>
                          <span style={{ color: "#3b82f6", fontWeight: 600 }}>
                            {dc ? `${dc} días` : new Date(p.updated_at).toLocaleDateString("es-CL")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal ingresar código de invitación */}
      {modalCodigo && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">🔑 Unirse a proyecto</h3>
              <button onClick={() => setModalCodigo(false)} className="text-gray-400 hover:text-gray-600 text-xl btn-press">✕</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Ingresa el código de 6 dígitos que recibiste en tu email para unirte al proyecto.
            </p>
            <input
              value={codigoInput}
              onChange={e => { setCodigoInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setCodigoError(""); }}
              placeholder="000000"
              maxLength={6}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest focus:outline-none focus:border-emerald-400 mb-3"
              style={{ letterSpacing: "0.3em" }}
            />
            {codigoError && (
              <p className="text-xs text-red-500 mb-3 text-center">{codigoError}</p>
            )}
            <button
              onClick={aceptarCodigoInvitacion}
              disabled={codigoInput.length !== 6 || codigoCargando}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 btn-primary">
              {codigoCargando ? "Verificando..." : "Unirse al proyecto →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
