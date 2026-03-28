"use client";
import { useState, useMemo } from "react";
import { ONDAC_APUS } from './ondac_data_nuevo.js';

const APUS = ONDAC_APUS;

const FAMILIAS = [
  { codigo: "P",   nombre: "Instalaciones Domiciliarias", padre: null },
  { codigo: "PA",  nombre: "Agua Potable",                padre: "P"  },
  { codigo: "PB",  nombre: "Alcantarillado",              padre: "P"  },
  { codigo: "PC",  nombre: "Electricidad",                padre: "P"  },
  { codigo: "PD",  nombre: "Gas",                         padre: "P"  },
  { codigo: "PF",  nombre: "Accesorios de Baño",          padre: "P"  },
  { codigo: "PE",  nombre: "Artefactos Sanitarios",       padre: "P"  },
  { codigo: "R",   nombre: "Obras Civiles",               padre: null },
  { codigo: "RB",  nombre: "Movimiento de Tierras",       padre: "R"  },
  { codigo: "RE",  nombre: "Estructuras y Obras Anexas",  padre: "R"  },
  { codigo: "RA",  nombre: "Demoliciones y Fajas",        padre: "R"  },
  { codigo: "RC",  nombre: "Sub-bases y Bases",           padre: "R"  },
  { codigo: "RD",  nombre: "Revestimientos y Pavimentos", padre: "R"  },
  { codigo: "G",   nombre: "Revestimientos",              padre: null },
  { codigo: "GA",  nombre: "Muros",                       padre: "G"  },
  { codigo: "GB",  nombre: "Cielos",                      padre: "G"  },
  { codigo: "H",   nombre: "Pavimentos",                  padre: null },
  { codigo: "HA",  nombre: "Cerámicas",                   padre: "H"  },
  { codigo: "HC",  nombre: "Maderas",                     padre: "H"  },
  { codigo: "HE",  nombre: "Alfombras",                   padre: "H"  },
  { codigo: "I",   nombre: "Cubiertas",                   padre: null },
  { codigo: "IA",  nombre: "Fibrocemento",                padre: "I"  },
  { codigo: "IB",  nombre: "Fierro Galvanizado",          padre: "I"  },
  { codigo: "K",   nombre: "Puertas y Ventanas",          padre: null },
  { codigo: "KA",  nombre: "Puertas",                     padre: "K"  },
  { codigo: "KB",  nombre: "Ventanas",                    padre: "K"  },
  { codigo: "V",   nombre: "Demolición y Retiro",         padre: null },
  { codigo: "VA",  nombre: "Desmantelamiento",            padre: "V"  },
  { codigo: "VB",  nombre: "Demolición",                  padre: "V"  },
  { codigo: "VC",  nombre: "Retiro de Escombros",         padre: "V"  },
  { codigo: "W",   nombre: "Mobiliario",                  padre: null },
  { codigo: "AA",  nombre: "Hormigones y Aislación",      padre: null },
  { codigo: "N",   nombre: "Quincallería",                padre: null },
  { codigo: "O",   nombre: "Obras de Urbanización",       padre: null },
  { codigo: "QD",  nombre: "Juegos y Equipamiento",       padre: "O"  },
  { codigo: "S",   nombre: "Escaleras y Barandas",        padre: null },
  { codigo: "FA",  nombre: "Pinturas y Barnices",         padre: null },
];

const fmt = (n) => "$" + Math.round(n || 0).toLocaleString("es-CL");

function calcAPU(apu, cfg) {
  const zona = cfg.zona;
  const llss = cfg.llss / 100;
  const herrPct = cfg.herr / 100;
  const moRates = {
    m1: cfg.mo_m1 * (1 + zona),
    m2: cfg.mo_m2 * (1 + zona),
    ay: cfg.mo_ay * (1 + zona),
    inst: cfg.mo_inst * (1 + zona),
  };
  let moNet = 0, mat = 0, fung = 0;
  const rows = (apu.insumos || []).map((ins) => {
    let punit = ins.punit ?? 0;
    let cant = ins.cant ?? 0;
    if (ins.tipo === "mo") { punit = moRates[ins.moKey] ?? 0; cant = ins.rend ?? 0; }
    const cantFinal = cant * (1 + (ins.perd ?? 0) / 100);
    const sub = cantFinal * punit;
    if (ins.tipo === "mo") moNet += sub;
    else if (ins.tipo === "mat") mat += sub;
    else if (ins.tipo === "fung") fung += sub;
    return { ...ins, punit, cant, sub };
  });
  if (rows.length === 0 || (moNet === 0 && mat === 0 && fung === 0)) {
    const precioBase = (apu.precio || 0) * (1 + zona);
    return { rows, moNet: 0, llssAmt: 0, mat: precioBase, herr: 0, fung: 0, total: precioBase };
  }
  const herr = moNet * herrPct;
  const llssAmt = moNet * llss;
  const total = moNet + llssAmt + mat + herr + fung;
  return { rows, moNet, llssAmt, mat, herr, fung, total };
}

function Badge({ tipo }) {
  const map = {
    mo:   { label: "M.O.",     cls: "bg-blue-100 text-blue-700"    },
    mat:  { label: "Material", cls: "bg-green-100 text-green-700"  },
    tool: { label: "Herram.",  cls: "bg-amber-100 text-amber-700"  },
    fung: { label: "Fungible", cls: "bg-purple-100 text-purple-700"},
  };
  const { label, cls } = map[tipo] ?? { label: tipo, cls: "bg-gray-100 text-gray-600" };
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

export default function Home() {
  const [cfg, setCfg] = useState({
    zona: 0.25, llss: 40, gg: 18, util: 10, iva: 19, herr: 4,
    mo_m1: 6800, mo_m2: 5200, mo_ay: 3800, mo_inst: 9500,
  });
  const updateCfg = (k, v) => setCfg((c) => ({ ...c, [k]: parseFloat(v) || 0 }));
  const [tab, setTab] = useState("biblioteca");
  const [busqueda, setBusqueda] = useState("");
  const [familiaActiva, setFamiliaActiva] = useState(null);
  const [apuActivo, setApuActivo] = useState(null);
  const [proyecto, setProyecto] = useState([]);

  const raices = FAMILIAS.filter((f) => !f.padre);
  const hijos = (padre) => FAMILIAS.filter((f) => f.padre === padre);

  const apusFiltrados = useMemo(() => {
    let list = APUS;
    if (familiaActiva) {
      list = list.filter((a) => {
        const fam = (a.familia || "").toUpperCase();
        const act = familiaActiva.toUpperCase();
        return fam === act || fam.startsWith(act);
      });
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      list = list.filter((a) =>
        (a.desc || "").toLowerCase().includes(q) ||
        (a.descripcion || "").toLowerCase().includes(q) ||
        (a.codigo || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [familiaActiva, busqueda]);

  const agregarPartida = (apu) => {
    setProyecto((p) => [...p, { ...apu, cantidad: 1, id: Date.now() + Math.random() }]);
  };

  const resumen = useMemo(() => {
    let cd = 0;
    proyecto.forEach((p) => { const { total } = calcAPU(p, cfg); cd += total * p.cantidad; });
    const gg = cd * cfg.gg / 100;
    const util = cd * cfg.util / 100;
    const neto = cd + gg + util;
    const iva = neto * cfg.iva / 100;
    return { cd, gg, util, neto, iva, total: neto + iva };
  }, [proyecto, cfg]);

  const apuCalc = apuActivo ? calcAPU(apuActivo, cfg) : null;

  const ZONAS = [
    { val: 0, label: "Metropolitana" },
    { val: 0.15, label: "Biobío / La Araucanía (+15%)" },
    { val: 0.20, label: "Los Lagos (+20%)" },
    { val: 0.25, label: "Magallanes (+25%)" },
    { val: 0.30, label: "Aysén (+30%)" },
  ];
  const zonaLabel = ZONAS.find((z) => z.val === cfg.zona)?.label ?? "Magallanes";

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-sm text-gray-800">
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-emerald-600 tracking-tight">APU<span className="text-gray-400 font-normal">chile</span></span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{zonaLabel}</span>
        </div>
        <nav className="flex gap-1">
          {[["biblioteca","Biblioteca ONDAC"],["editor","Editor APU"],["config","Configuración"],["resumen","Resumen"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab===id?"bg-emerald-600 text-white":"text-gray-500 hover:bg-gray-100"}`}>
              {label}{id==="resumen"&&proyecto.length>0?` (${proyecto.length})`:""}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {tab === "biblioteca" && (
          <div className="flex flex-1 overflow-hidden">
            <aside className="w-56 bg-white border-r border-gray-200 overflow-y-auto shrink-0 py-3">
              <div className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Familias ONDAC</div>
              <button onClick={()=>setFamiliaActiva(null)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${!familiaActiva?"bg-emerald-50 text-emerald-700 font-medium":"text-gray-500 hover:bg-gray-50"}`}>
                Todas las partidas
              </button>
              {raices.map((r) => (
                <div key={r.codigo}>
                  <button onClick={()=>setFamiliaActiva(r.codigo)}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${familiaActiva===r.codigo?"bg-emerald-50 text-emerald-700":"text-gray-700 hover:bg-gray-50"}`}>
                    {r.nombre}
                  </button>
                  {hijos(r.codigo).map((h) => (
                    <button key={h.codigo} onClick={()=>setFamiliaActiva(h.codigo)}
                      className={`w-full text-left pl-6 pr-3 py-1 text-[11px] transition-colors ${familiaActiva===h.codigo?"bg-emerald-50 text-emerald-600":"text-gray-500 hover:bg-gray-50"}`}>
                      {h.nombre}
                    </button>
                  ))}
                </div>
              ))}
            </aside>
            <main className="flex-1 overflow-y-auto p-5">
              <div className="mb-4 flex gap-3 items-center">
                <input value={busqueda} onChange={(e)=>setBusqueda(e.target.value)}
                  placeholder="Buscar partida por nombre o código..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"/>
                <span className="text-xs text-gray-400 shrink-0">{apusFiltrados.length} partidas</span>
              </div>
              <div className="grid gap-2">
                {apusFiltrados.slice(0,100).map((apu, idx) => {
                  const { total } = calcAPU(apu, cfg);
                  const desc = apu.desc || apu.descripcion || "Sin descripción";
                  return (
                    <div key={`${apu.codigo}_${idx}`} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-emerald-300 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-mono text-gray-400">{apu.codigo}</span>
                          <span className="text-[10px] text-gray-400">{apu.unidad}</span>
                        </div>
                        <div className="text-sm text-gray-800 leading-snug">{desc}</div>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <div className="text-right">
                          <div className="text-xs text-gray-400">Precio unitario</div>
                          <div className="font-semibold text-emerald-600">{fmt(total)}</div>
                        </div>
                        <button onClick={()=>{setApuActivo(apu);setTab("editor");}}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
                          Ver APU
                        </button>
                        <button onClick={()=>agregarPartida(apu)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                          + Agregar
                        </button>
                      </div>
                    </div>
                  );
                })}
                {apusFiltrados.length > 100 && (
                  <div className="text-center py-4 text-xs text-gray-400">
                    Mostrando 100 de {apusFiltrados.length} — usa el buscador para filtrar
                  </div>
                )}
              </div>
            </main>
          </div>
        )}

        {tab === "editor" && (
          <div className="flex-1 overflow-y-auto p-5">
            {!apuActivo ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-base mb-2">Ninguna partida seleccionada</p>
                <button onClick={()=>setTab("biblioteca")} className="text-emerald-600 text-sm underline">Ir a la biblioteca</button>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <div className="text-xs text-gray-400 mb-1">{apuActivo.codigo} · {apuActivo.unidad}</div>
                  <h2 className="text-base font-semibold text-gray-800">{apuActivo.desc || apuActivo.descripcion}</h2>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[["Costo M.O. neto",fmt(apuCalc.moNet)],["Leyes Sociales",fmt(apuCalc.llssAmt)],["Materiales",fmt(apuCalc.mat)],["Precio unitario",fmt(apuCalc.total)]].map(([label,val],i)=>(
                    <div key={i} className={`rounded-xl p-4 ${i===3?"bg-emerald-600 text-white":"bg-white border border-gray-200"}`}>
                      <div className={`text-[10px] uppercase tracking-wider mb-1 ${i===3?"text-emerald-100":"text-gray-400"}`}>{label}</div>
                      <div className={`text-lg font-semibold ${i===3?"text-white":"text-gray-800"}`}>{val}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
                  <div className="flex justify-between items-center px-5 py-4 bg-emerald-50">
                    <span className="font-semibold text-emerald-800">Precio unitario total</span>
                    <span className="text-xl font-bold text-emerald-600">{fmt(apuCalc.total)}</span>
                  </div>
                </div>

                {apuActivo.insumos && apuActivo.insumos.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
                    <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                      <span className="text-blue-500">📋</span>
                      <span className="font-semibold text-blue-800 text-sm">Desglose de insumos ONDAC 2017</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide">
                            <th className="px-4 py-2 text-left font-medium">Descripción</th>
                            <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                            <th className="px-4 py-2 text-center font-medium">Unidad</th>
                            <th className="px-4 py-2 text-right font-medium">P. Unitario</th>
                            <th className="px-4 py-2 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {apuActivo.insumos.map((ins, idx) => (
                            <tr key={idx} className="hover:bg-blue-50 transition-colors">
                              <td className="px-4 py-2 text-gray-700">{ins.desc}</td>
                              <td className="px-4 py-2 text-right text-gray-700">{ins.cant}</td>
                              <td className="px-4 py-2 text-center text-gray-500">{ins.un}</td>
                              <td className="px-4 py-2 text-right text-gray-600">{ins.punit > 0 ? fmt(ins.punit) : <span className="text-gray-300">—</span>}</td>
                              <td className="px-4 py-2 text-right font-medium text-gray-800">{ins.punit > 0 ? fmt(ins.cant * ins.punit) : <span className="text-gray-300">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <button onClick={()=>agregarPartida(apuActivo)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">
                  + Agregar esta partida al proyecto
                </button>
              </>
            )}
          </div>
        )}

        {tab === "config" && (
          <div className="flex-1 overflow-y-auto p-5 max-w-2xl">
            <h2 className="text-base font-semibold mb-5 text-gray-800">Configuración del proyecto</h2>
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Zona y parámetros</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-wider block mb-1">Región / Zona</label>
                  <select value={cfg.zona} onChange={(e)=>updateCfg("zona",e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400">
                    {ZONAS.map((z)=><option key={z.val} value={z.val}>{z.label}</option>)}
                  </select>
                </div>
                {[["llss","Leyes Sociales (%)"],["gg","Gastos Generales (%)"],["util","Utilidad (%)"],["iva","IVA (%)"],["herr","Herramientas (% MO)"]].map(([k,label])=>(
                  <div key={k}>
                    <label className="text-[11px] text-gray-400 uppercase tracking-wider block mb-1">{label}</label>
                    <input type="number" value={cfg[k]} onChange={(e)=>updateCfg(k,e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"/>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Valores hora mano de obra ($/hr)</div>
              <div className="grid grid-cols-2 gap-4">
                {[["mo_m1","Maestro primera"],["mo_m2","Maestro segunda"],["mo_ay","Ayudante"],["mo_inst","Instalador SEC"]].map(([k,label])=>(
                  <div key={k}>
                    <label className="text-[11px] text-gray-400 uppercase tracking-wider block mb-1">{label}</label>
                    <input type="number" value={cfg[k]} onChange={(e)=>updateCfg(k,e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"/>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-amber-50 rounded-lg text-[11px] text-amber-700">
                Con zona {Math.round(cfg.zona*100)}%: Maestro primera = {fmt(cfg.mo_m1*(1+cfg.zona))}/hr · Ayudante = {fmt(cfg.mo_ay*(1+cfg.zona))}/hr
              </div>
            </div>
          </div>
        )}

        {tab === "resumen" && (
          <div className="flex-1 overflow-y-auto p-5">
            <h2 className="text-base font-semibold mb-5 text-gray-800">Resumen del proyecto</h2>
            {proyecto.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="mb-2">No hay partidas agregadas</p>
                <button onClick={()=>setTab("biblioteca")} className="text-emerald-600 text-sm underline">Ir a la biblioteca ONDAC</button>
              </div>
            ) : (
              <>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-[10px] uppercase text-gray-400 font-medium">Partida</th>
                        <th className="px-3 py-3 text-[10px] uppercase text-gray-400 font-medium text-center">Un.</th>
                        <th className="px-3 py-3 text-[10px] uppercase text-gray-400 font-medium text-right">Cant.</th>
                        <th className="px-3 py-3 text-[10px] uppercase text-gray-400 font-medium text-right">V. Unit.</th>
                        <th className="px-3 py-3 text-[10px] uppercase text-gray-400 font-medium text-right">V. Total</th>
                        <th className="px-3 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {proyecto.map((p) => {
                        const { total } = calcAPU(p, cfg);
                        const desc = p.desc || p.descripcion || "Sin descripción";
                        return (
                          <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="text-[10px] text-gray-400 font-mono">{p.codigo}</div>
                              <div className="text-gray-700 leading-snug">{desc}</div>
                            </td>
                            <td className="px-3 py-3 text-center text-gray-500">{p.unidad}</td>
                            <td className="px-3 py-3 text-right">
                              <input type="number" value={p.cantidad} min={0.01} step={0.01}
                                onChange={(e)=>setProyecto(pr=>pr.map(x=>x.id===p.id?{...x,cantidad:parseFloat(e.target.value)||1}:x))}
                                className="w-16 border border-gray-200 rounded px-2 py-1 text-right text-xs focus:outline-none focus:border-emerald-400"/>
                            </td>
                            <td className="px-3 py-3 text-right text-gray-700">{fmt(total)}</td>
                            <td className="px-3 py-3 text-right font-semibold text-emerald-600">{fmt(total * p.cantidad)}</td>
                            <td className="px-3 py-3 text-right">
                              <button onClick={()=>setProyecto(pr=>pr.filter(x=>x.id!==p.id))}
                                className="text-red-400 hover:text-red-600 text-xs">x</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {(() => {
                  const matMap = {};
                  proyecto.forEach((p) => {
                    (p.insumos || []).filter(ins => ins.tipo === "mat").forEach((ins) => {
                      const key = ins.desc;
                      const qty = (ins.cant ?? 0) * (1 + (ins.perd ?? 0) / 100) * p.cantidad;
                      if (!matMap[key]) matMap[key] = { desc: ins.desc, un: ins.un, total: 0 };
                      matMap[key].total += qty;
                    });
                  });
                  const mats = Object.values(matMap).filter(m => m.total > 0).sort((a,b) => a.desc.localeCompare(b.desc));
                  if (mats.length === 0) return null;
                  return (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
                      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                        <span className="font-semibold text-sm text-gray-700">Desglose de materiales</span>
                        <span className="text-xs text-gray-400 ml-2">cantidades totales del proyecto</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left px-4 py-2 text-[10px] uppercase text-gray-400 font-medium">Material</th>
                            <th className="px-3 py-2 text-[10px] uppercase text-gray-400 font-medium text-center">Un.</th>
                            <th className="px-3 py-2 text-[10px] uppercase text-gray-400 font-medium text-right">Cant. neta</th>
                            <th className="px-3 py-2 text-[10px] uppercase text-gray-400 font-medium text-right">A comprar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mats.map((m, i) => (
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-700">{m.desc}</td>
                              <td className="px-3 py-2 text-center text-gray-500">{m.un}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{m.total.toFixed(3)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-emerald-700">{Math.ceil(m.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-md ml-auto">
                  {[
                    ["Subtotal costo directo", resumen.cd],
                    [`Gastos Generales (${cfg.gg}%)`, resumen.gg],
                    [`Utilidad (${cfg.util}%)`, resumen.util],
                    ["Subtotal neto", resumen.neto],
                    [`IVA (${cfg.iva}%)`, resumen.iva],
                  ].map(([label, val], i) => (
                    <div key={i} className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium">{fmt(val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-5 py-4 bg-emerald-600 text-white">
                    <span className="font-semibold">Total proyecto</span>
                    <span className="text-xl font-bold">{fmt(resumen.total)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
