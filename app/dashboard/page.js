"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useInactividad } from "../lib/useInactividad";

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setUser(user);
      cargarProyectos(user.id);
    });
  }, []);

  const cargarProyectos = async (uid) => {
    const { data } = await supabase.from("proyectos").select("*").eq("user_id", uid).order("updated_at", { ascending: false });
    setProyectos(data || []);
    setLoading(false);
  };

  const setM = (k, v) => setMeta(m => ({ ...m, [k]: v }));

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

  useInactividad(supabase, router, 10);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-emerald-800">APU<span className="text-emerald-500">chile</span></span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button onClick={cerrarSesion}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">
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

                {/* Nombre */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Nombre del proyecto *</label>
                  <input autoFocus type="text" value={nombreNuevo} onChange={e => setNombreNuevo(e.target.value)}
                    placeholder="Ej: Habilitación oficinas piso 3"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
                </div>

                {/* Región */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Región / Ubicación</label>
                  <select value={meta.region} onChange={e => setM("region", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white">
                    <option value="">Selecciona una región...</option>
                    {REGIONES.map(r => (
                      <option key={r.label} value={r.label}>{r.label}</option>
                    ))}
                  </select>
                  {zonaPreview && (
                    <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                      <span className="font-medium">Factor zona:</span>
                      {zonaPreview.zona === 0 ? "Sin recargo (zona base)" : `+${(zonaPreview.zona * 100).toFixed(0)}% sobre mano de obra`}
                    </p>
                  )}
                </div>

                {/* Mandante */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Nombre del mandante</label>
                  <input type="text" value={meta.mandante} onChange={e => setM("mandante", e.target.value)}
                    placeholder="Ej: Ministerio de Obras Públicas"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
                </div>

                {/* Fechas */}
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
                  <p className="text-xs text-emerald-600 mb-4 flex items-center gap-1">
                    <span className="font-medium">Plazo:</span> {dias} días corridos
                  </p>
                )}
                {dias === null && (meta.fechaInicio || meta.fechaTermino) && (
                  <p className="text-xs text-gray-400 mb-4">Ingresa ambas fechas para calcular el plazo</p>
                )}

                {/* Responsable */}
                <div className="mb-6">
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Persona a cargo</label>
                  <input type="text" value={meta.responsable} onChange={e => setM("responsable", e.target.value)}
                    placeholder="Ej: Ing. Carlos Soto"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
                </div>

                {/* Resumen previo */}
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
              <button onClick={() => setCreando(true)}
                className="text-emerald-600 text-sm underline">
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
  );
}
