"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useInactividad } from "../lib/useInactividad";
import { useIndicadores } from "../lib/useIndicadores";

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
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [meta, setMeta] = useState(META_INICIAL);
  const [creandoLoading, setCreandoLoading] = useState(false);
  const { uf, utm, fecha } = useIndicadores();

  // Perfil editable
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfilForm, setPerfilForm] = useState({ nombre: "", profesion: "", cargo: "" });
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const m = user.user_metadata || {};
      setPerfilForm({ nombre: m.nombre || "", profesion: m.profesion || "", cargo: m.cargo || "" });
      setAvatarUrl(m.avatar_url || null);
      cargarProyectos(user.id);
    });
  }, []);

  useInactividad(supabase, router, 10);

  const cargarProyectos = async (uid) => {
    const { data } = await supabase.from("proyectos").select("*").eq("user_id", uid).order("updated_at", { ascending: false });
    setProyectos(data || []);
    setLoading(false);
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
    if (!error) router.push(`/proyecto?id=${data.id}`);
  };

  const abrirProyecto = (id) => router.push(`/proyecto?id=${id}`);

  const eliminarProyecto = async (id, e) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar este proyecto?")) return;
    await supabase.from("proyectos").delete().eq("id", id);
    setProyectos(p => p.filter(x => x.id !== id));
  };

  const cerrarSesion = async () => {
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-sm">Cargando...</div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* Sidebar izquierdo */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0 min-h-screen">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <span className="text-lg font-bold text-emerald-800">APU<span className="text-emerald-500">chile</span></span>
        </div>

        {/* Perfil */}
        <div className="px-5 py-6 border-b border-gray-100">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative group mb-3">
              <div className="w-20 h-20 rounded-2xl bg-emerald-100 overflow-hidden flex items-center justify-center border-2 border-white shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover"/>
                ) : (
                  <span className="text-3xl font-bold text-emerald-600">{nombre.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <button onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-medium">
                {subiendoFoto ? "Subiendo..." : "Cambiar foto"}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={subirFoto}/>
            </div>

            {editandoPerfil ? (
              <div className="w-full space-y-2">
                <input value={perfilForm.nombre} onChange={e => setPerfilForm(f => ({...f, nombre: e.target.value}))}
                  placeholder="Nombre completo"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-400"/>
                <input value={perfilForm.profesion} onChange={e => setPerfilForm(f => ({...f, profesion: e.target.value}))}
                  placeholder="Profesión (ej: Ingeniero Civil)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-400"/>
                <input value={perfilForm.cargo} onChange={e => setPerfilForm(f => ({...f, cargo: e.target.value}))}
                  placeholder="Cargo (ej: Jefe de Obra)"
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
                <button onClick={() => setEditandoPerfil(true)}
                  className="text-[11px] text-gray-400 hover:text-emerald-600 mt-2 transition-colors">
                  Editar perfil
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{proyectos.length}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{proyectos.length === 1 ? "proyecto creado" : "proyectos creados"}</p>
          </div>
        </div>

        {/* Indicadores UF/UTM */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Indicadores</p>
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

        {/* Spacer */}
        <div className="flex-1"/>

        {/* Email + Cerrar sesión */}
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 truncate mb-3">{user?.email}</p>
          <button onClick={cerrarSesion}
            className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 rounded-xl py-2.5 transition-all">
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 overflow-y-auto">
        <main className="max-w-4xl mx-auto px-8 py-10">
          {/* Saludo */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-800">{saludo}, {nombre}</h1>
            <p className="text-gray-400 mt-1 text-sm">¿En qué proyecto trabajamos hoy?</p>
          </div>

          {/* Acciones principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: "＋", label: "Nuevo proyecto", color: "bg-emerald-600 text-white hover:bg-emerald-700", action: () => setCreando(true) },
              { icon: "📂", label: "Mis proyectos", color: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200", action: () => document.getElementById("mis-proyectos").scrollIntoView({ behavior: "smooth" }) },
              { icon: "📄", label: "Importar documento", color: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200", action: () => alert("Próximamente") },
              { icon: "⚙️", label: "Configuración", color: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200", action: () => alert("Próximamente") },
            ].map((c, i) => (
              <button key={i} onClick={c.action}
                className={`${c.color} rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all shadow-sm hover:shadow-md aspect-square`}>
                <span className="text-3xl">{c.icon}</span>
                <span className="text-sm font-medium text-center leading-tight">{c.label}</span>
              </button>
            ))}
          </div>

          {/* Modal nuevo proyecto */}
          {creando && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
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
                      className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button onClick={crearProyecto} disabled={!nombreNuevo.trim() || creandoLoading}
                      className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                      {creandoLoading ? "Creando..." : "Crear proyecto →"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Proyectos recientes */}
          <div id="mis-proyectos">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Proyectos recientes</h2>
            {proyectos.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                <p className="text-gray-400 text-sm mb-3">No tienes proyectos aún</p>
                <button onClick={() => setCreando(true)} className="text-emerald-600 text-sm underline">
                  Crea tu primer proyecto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {proyectos.map(p => {
                  const m = p.meta || {};
                  const dc = m.diasCorridos || diasCorridos(m.fechaInicio, m.fechaTermino);
                  return (
                    <button key={p.id} onClick={() => abrirProyecto(p.id)}
                      className="bg-white border border-gray-200 rounded-2xl p-5 text-left hover:border-emerald-300 hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-2xl">📋</span>
                        <button onClick={e => eliminarProyecto(p.id, e)}
                          className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          ✕
                        </button>
                      </div>
                      <div className="font-semibold text-gray-800 text-sm mb-2 truncate">{p.nombre}</div>
                      {(m.region || m.mandante || m.responsable) && (
                        <div className="space-y-0.5 mb-2">
                          {m.region && <p className="text-xs text-gray-400 truncate">{m.region}</p>}
                          {m.mandante && <p className="text-xs text-gray-400 truncate">{m.mandante}</p>}
                          {m.responsable && <p className="text-xs text-gray-400 truncate">A cargo: {m.responsable}</p>}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                        <span>{(p.datos || []).length} partidas</span>
                        <span>{dc ? `${dc} días` : new Date(p.updated_at).toLocaleDateString("es-CL")}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
