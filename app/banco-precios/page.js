"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useInactividad } from "../lib/useInactividad";
import ONDAC_APUS from "../ondac_data_nuevo.json";
import MATERIALES_BASE from "../data/materiales_precios.json";

const IPC_2017_2025 = 1.65;

const FAMILIAS = [
  { codigo: "P",  nombre: "Instalaciones Domiciliarias", icon: "🔧" },
  { codigo: "PA", nombre: "Agua Potable", icon: "💧" },
  { codigo: "PB", nombre: "Alcantarillado", icon: "🚰" },
  { codigo: "PC", nombre: "Electricidad", icon: "⚡" },
  { codigo: "PD", nombre: "Gas", icon: "🔥" },
  { codigo: "PE", nombre: "Artefactos Sanitarios", icon: "��" },
  { codigo: "PF", nombre: "Accesorios de Baño", icon: "🧴" },
  { codigo: "R",  nombre: "Obras Civiles", icon: "🏗️" },
  { codigo: "RB", nombre: "Movimiento de Tierras", icon: "⛏️" },
  { codigo: "RE", nombre: "Estructuras", icon: "🏛️" },
  { codigo: "RA", nombre: "Demoliciones", icon: "💥" },
  { codigo: "RC", nombre: "Sub-bases y Bases", icon: "🧱" },
  { codigo: "RD", nombre: "Pavimentos", icon: "🛣️" },
  { codigo: "G",  nombre: "Revestimientos", icon: "🎨" },
  { codigo: "GA", nombre: "Muros", icon: "🧱" },
  { codigo: "GB", nombre: "Cielos", icon: "☁️" },
  { codigo: "H",  nombre: "Pavimentos Interior", icon: "��" },
  { codigo: "HA", nombre: "Cerámicas", icon: "🔲" },
  { codigo: "HC", nombre: "Maderas", icon: "🪵" },
  { codigo: "HE", nombre: "Alfombras", icon: "🟫" },
  { codigo: "I",  nombre: "Cubiertas", icon: "🏠" },
  { codigo: "IA", nombre: "Fibrocemento", icon: "📐" },
  { codigo: "IB", nombre: "Fierro Galvanizado", icon: "🔩" },
  { codigo: "K",  nombre: "Puertas y Ventanas", icon: "🚪" },
  { codigo: "KA", nombre: "Puertas", icon: "🚪" },
  { codigo: "KB", nombre: "Ventanas", icon: "🪟" },
  { codigo: "V",  nombre: "Demolición y Retiro", icon: "🗑️" },
  { codigo: "AA", nombre: "Hormigones y Aislación", icon: "🏗️" },
  { codigo: "N",  nombre: "Quincallería", icon: "🔨" },
  { codigo: "O",  nombre: "Urbanización", icon: "🌳" },
  { codigo: "S",  nombre: "Escaleras y Barandas", icon: "🪜" },
  { codigo: "FA", nombre: "Pinturas y Barnices", icon: "🖌️" },
  { codigo: "W",  nombre: "Mobiliario", icon: "🪑" },
];

const ZONAS = [
  { val: 0, label: "Región Metropolitana" },
  { val: 0.05, label: "Zona Centro (+5%)" },
  { val: 0.10, label: "Zona Norte (+10%)" },
  { val: 0.15, label: "Biobío / Araucanía (+15%)" },
  { val: 0.20, label: "Los Lagos (+20%)" },
  { val: 0.25, label: "Magallanes (+25%)" },
  { val: 0.30, label: "Aysén (+30%)" },
];

const fmt = (n) => "$" + Math.round(n || 0).toLocaleString("es-CL");

// Build material price index
const MAT_IDX = {};
MATERIALES_BASE.forEach(m => {
  if (m.precio_actual_rm) MAT_IDX[m.desc.trim().toUpperCase()] = m;
});

export default function BancoPrecios() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [familiaFiltro, setFamiliaFiltro] = useState("");
  const [zona, setZona] = useState(0);
  const [tab, setTab] = useState("apus"); // apus | materiales
  const [detalle, setDetalle] = useState(null);
  const [pagina, setPagina] = useState(0);
  const POR_PAG = 50;

  useInactividad();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
      else setUser(data.user);
    });
  }, []);

  // Filter APUs
  const apusFiltrados = useMemo(() => {
    let items = ONDAC_APUS;
    if (familiaFiltro) items = items.filter(a => (a.familia || a.codigo || "").startsWith(familiaFiltro));
    if (busqueda.trim()) {
      const terms = busqueda.toLowerCase().split(/\s+/);
      items = items.filter(a => {
        const txt = `${a.codigo} ${a.desc} ${a.familia}`.toLowerCase();
        return terms.every(t => txt.includes(t));
      });
    }
    return items;
  }, [busqueda, familiaFiltro]);

  // Filter Materials
  const matFiltrados = useMemo(() => {
    let items = MATERIALES_BASE.filter(m => m.precio_actual_rm);
    if (busqueda.trim()) {
      const terms = busqueda.toLowerCase().split(/\s+/);
      items = items.filter(m => {
        const txt = `${m.desc} ${m.nombre_sodimac || ""}`.toLowerCase();
        return terms.every(t => txt.includes(t));
      });
    }
    return items.sort((a, b) => (b.apariciones || 0) - (a.apariciones || 0));
  }, [busqueda]);

  const listado = tab === "apus" ? apusFiltrados : matFiltrados;
  const paginado = listado.slice(pagina * POR_PAG, (pagina + 1) * POR_PAG);
  const totalPags = Math.ceil(listado.length / POR_PAG);

  const precioAPU = (apu) => {
    const price = (apu.precio || 0) * IPC_2017_2025 * (1 + zona);
    return price;
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse text-gray-400">Cargando...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-indigo-600 transition text-lg">
              ←
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">📦 Banco de Precios Chile</h1>
              <p className="text-xs text-gray-500">{ONDAC_APUS.length.toLocaleString()} partidas ONDAC + {MATERIALES_BASE.filter(m=>m.precio_actual_rm).length} materiales con precio actualizado</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={zona}
              onChange={e => setZona(parseFloat(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-300 outline-none"
            >
              {ZONAS.map(z => <option key={z.val} value={z.val}>{z.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs + Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-2">
            {[
              { id: "apus", label: "Partidas APU", icon: "📋", count: apusFiltrados.length },
              { id: "materiales", label: "Materiales", icon: "🧱", count: matFiltrados.length },
            ].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setPagina(0); }}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  tab === t.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
                }`}>
                {t.icon} {t.label} <span className="text-xs opacity-70">({t.count.toLocaleString()})</span>
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPagina(0); }}
              placeholder="Buscar partida, material, código..."
              className="w-full px-4 py-2.5 pl-10 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Family filter for APUs */}
        {tab === "apus" && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => { setFamiliaFiltro(""); setPagina(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                !familiaFiltro ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
              }`}
            >
              Todas
            </button>
            {FAMILIAS.filter(f => f.codigo.length <= 2).map(f => (
              <button key={f.codigo}
                onClick={() => { setFamiliaFiltro(f.codigo === familiaFiltro ? "" : f.codigo); setPagina(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  familiaFiltro === f.codigo ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
                }`}
              >
                {f.icon} {f.nombre}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-1">Código</div>
            <div className="col-span-5">Descripción</div>
            <div className="col-span-1 text-center">Unidad</div>
            {tab === "apus" ? (
              <>
                <div className="col-span-1 text-center">Familia</div>
                <div className="col-span-1 text-center">Insumos</div>
                <div className="col-span-2 text-right">Precio Unit.</div>
                <div className="col-span-1 text-center">Ver</div>
              </>
            ) : (
              <>
                <div className="col-span-2 text-right">Precio RM</div>
                <div className="col-span-1 text-center">Usos</div>
                <div className="col-span-1 text-center">Fuente</div>
                <div className="col-span-1 text-right">Actualizado</div>
              </>
            )}
          </div>

          {/* Rows */}
          {paginado.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-sm">No se encontraron resultados</div>
            </div>
          ) : (
            paginado.map((item, idx) => (
              <div key={item.codigo || item.id || idx}
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-gray-100 hover:bg-indigo-50/40 transition cursor-pointer ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                onClick={() => tab === "apus" && setDetalle(item)}
              >
                <div className="col-span-1 text-xs font-mono text-indigo-600 font-semibold">
                  {item.codigo || "—"}
                </div>
                <div className="col-span-5 text-sm text-gray-800 truncate">
                  {item.desc || item.descripcion || "—"}
                </div>
                <div className="col-span-1 text-center text-xs text-gray-500">
                  {item.unidad || item.un || "—"}
                </div>
                {tab === "apus" ? (
                  <>
                    <div className="col-span-1 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                        {FAMILIAS.find(f => f.codigo === item.familia)?.nombre?.substring(0, 12) || item.familia || "—"}
                      </span>
                    </div>
                    <div className="col-span-1 text-center text-xs text-gray-500">
                      {(item.insumos?.length || 0) > 0 ? (
                        <span className="text-green-600 font-medium">{item.insumos.length}</span>
                      ) : "—"}
                    </div>
                    <div className="col-span-2 text-right text-sm font-semibold text-gray-900">
                      {fmt(precioAPU(item))}
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetalle(item); }}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                      >
                        Detalle →
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-span-2 text-right text-sm font-semibold text-gray-900">
                      {fmt(item.precio_actual_rm * (1 + zona))}
                    </div>
                    <div className="col-span-1 text-center text-xs text-gray-500">
                      {item.apariciones || "—"}
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        {item.nombre_sodimac ? "Sodimac" : "ONDAC"}
                      </span>
                    </div>
                    <div className="col-span-1 text-right text-xs text-gray-400">
                      {item.actualizado || "—"}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPags > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-gray-500">
              Mostrando {pagina * POR_PAG + 1}-{Math.min((pagina + 1) * POR_PAG, listado.length)} de {listado.length.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagina === 0}
                onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 disabled:opacity-40 hover:border-indigo-300 transition"
              >
                ← Anterior
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-500">
                {pagina + 1} / {totalPags}
              </span>
              <button
                disabled={pagina >= totalPags - 1}
                onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 disabled:opacity-40 hover:border-indigo-300 transition"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal detalle APU */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: "blur(6px)", background: "rgba(0,0,0,0.35)" }}
          onClick={() => setDetalle(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-mono opacity-80">{detalle.codigo}</div>
                  <div className="text-base font-bold mt-1">{detalle.desc || detalle.descripcion}</div>
                  <div className="text-xs opacity-80 mt-1">
                    {detalle.unidad || "u"} · {FAMILIAS.find(f => f.codigo === detalle.familia)?.nombre || detalle.familia}
                  </div>
                </div>
                <button onClick={() => setDetalle(null)} className="text-white/70 hover:text-white text-lg">✕</button>
              </div>
              <div className="mt-3 text-2xl font-bold">{fmt(precioAPU(detalle))}</div>
              <div className="text-xs opacity-70">
                Precio base ONDAC: {fmt(detalle.precio)} → ajustado por IPC y zona
              </div>
            </div>

            {/* Insumos */}
            <div className="flex-1 overflow-y-auto p-5">
              {(detalle.insumos?.length || 0) > 0 ? (
                <>
                  <h3 className="text-sm font-bold text-gray-700 mb-3">Desglose de Insumos</h3>
                  <div className="space-y-2">
                    {detalle.insumos.map((ins, i) => {
                      const tipoColors = {
                        mo: "bg-blue-50 border-blue-200 text-blue-700",
                        mat: "bg-indigo-50 border-indigo-200 text-indigo-700",
                        fung: "bg-purple-50 border-purple-200 text-purple-700",
                      };
                      const tipoLabels = { mo: "M.O.", mat: "Material", fung: "Fungible" };
                      return (
                        <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg border ${tipoColors[ins.tipo] || "bg-gray-50 border-gray-200"}`}>
                          <div className="flex-1">
                            <div className="text-xs font-medium">{ins.desc}</div>
                            <div className="text-[10px] opacity-70">
                              {tipoLabels[ins.tipo] || ins.tipo} · {ins.un || ins.unidad || "u"} · Cant: {ins.cant || 0}
                              {ins.perd ? ` · Pérdida: ${ins.perd}%` : ""}
                            </div>
                          </div>
                          <div className="text-xs font-semibold">{fmt(ins.punit || 0)}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2">📦</div>
                  <div className="text-sm">Partida sin desglose de insumos</div>
                  <div className="text-xs mt-1">Precio global basado en referencia ONDAC</div>
                </div>
              )}

              {/* Material price check */}
              {detalle.insumos?.filter(ins => ins.tipo === "mat").map((ins, i) => {
                const matInfo = MAT_IDX[ins.desc?.trim().toUpperCase()];
                if (!matInfo) return null;
                return (
                  <div key={`mat-${i}`} className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-xs font-semibold text-green-700">✅ Precio actualizado Sodimac</div>
                    <div className="text-xs text-green-600">
                      {matInfo.nombre_sodimac}: {fmt(matInfo.precio_actual_rm)} (actualizado {matInfo.actualizado})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
