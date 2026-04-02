"use client";
import { useState } from "react";

const partidas = [
  { codigo: "00462", unidad: "UNI", desc: "ASIENTO WC UNIVERSAL FANALOZA", precio: "$8.989" },
  { codigo: "00068", unidad: "UNI", desc: "ASIENTO WC UNIVERSAL CAPRICE BLANCO", precio: "$7.799" },
  { codigo: "00252", unidad: "MT",  desc: "BAJADA ALLUVIA FE GALV. 30CM E=0.4MM", precio: "$982" },
  { codigo: "03014", unidad: "ML",  desc: "BAJADA ALLUVIA FE GALV. 30CMS E=0.5MM", precio: "$7.972" },
  { codigo: "00253", unidad: "MT",  desc: "BAJADA ALLUVIA FE GALV. 45CMS E=0.4MM", precio: "$8.313" },
  { codigo: "03004", unidad: "ML",  desc: "BAJADA ALLUVIA FE GALV. 45CMS E=0.5MM", precio: "$9.622" },
  { codigo: "03026", unidad: "ML",  desc: "BAJADA ALLUVIA FE GALV. 75CMS E=0.4MM", precio: "$9.544" },
];

const familias = ["Todas las partidas","Instalaciones Domiciliarias","Obras Civiles","Revestimientos","Pavimentos","Cubiertas","Puertas y Ventanas","Demolición y Retiro"];
const subfamilias = { "Instalaciones Domiciliarias": ["Agua Potable","Alcantarillado","Electricidad","Gas","Accesorios de Baño"], "Obras Civiles": ["Movimiento de Tierras","Estructuras y Obras Anexas","Demoliciones y Fajas"] };

const proyecto = [
  { codigo: "00462", desc: "ASIENTO WC UNIVERSAL FANALOZA", unidad: "UNI", cant: 3, precio: "$26.967" },
  { codigo: "03014", desc: "BAJADA ALLUVIA FE GALV. 30CMS", unidad: "ML", cant: 15, precio: "$119.580" },
  { codigo: "03026", desc: "BAJADA ALLUVIA FE GALV. 75CMS", unidad: "ML", cant: 8, precio: "$76.352" },
];

export default function Mockups() {
  const [activo, setActivo] = useState(1);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Selector de mockup */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
          <span className="text-xs font-bold text-gray-400 mr-2 shrink-0">MOCKUP →</span>
          {[
            [1,"1 · Rail Lateral"],
            [2,"2 · Split Panel"],
            [3,"3 · Dark Pro"],
            [4,"4 · Barra de Comandos"],
            [5,"5 · Compacto Pro"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setActivo(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${activo === id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-10">
        {activo === 1 && <Mockup1 />}
        {activo === 2 && <Mockup2 />}
        {activo === 3 && <Mockup3 />}
        {activo === 4 && <Mockup4 />}
        {activo === 5 && <Mockup5 />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MOCKUP 1 — Rail Lateral con iconos
   Nav vertical fija a la izquierda con iconos + texto.
   Panel de familias integrado dentro del contenido.
   Header limpio solo con info del proyecto.
───────────────────────────────────────────────────────── */
function Mockup1() {
  const [tab, setTab] = useState("biblioteca");
  const [fam, setFam] = useState("Todas las partidas");

  const tabs = [
    { id: "biblioteca", icon: "📚", label: "Biblioteca" },
    { id: "resumen",    icon: "📋", label: "Resumen" },
    { id: "editor",     icon: "🔧", label: "Editor APU" },
    { id: "anexos",     icon: "📎", label: "Anexos" },
    { id: "config",     icon: "⚙️", label: "Config" },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-sm">
      {/* Rail izquierdo */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-1 shrink-0">
        <div className="mb-4 text-center">
          <span className="text-[10px] font-black text-emerald-600 leading-none">APU</span>
          <div className="text-[8px] text-gray-400 font-medium">chile</div>
        </div>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${tab === t.id ? "bg-emerald-50 text-emerald-700" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"}`}>
            <span className="text-base">{t.icon}</span>
            <span className="text-[9px] font-medium">{t.label}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all">
          <span className="text-base">←</span>
          <span className="text-[9px] font-medium">Salir</span>
        </button>
      </div>

      {/* Contenido */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header limpio */}
        <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">asdasdasd</span>
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Magallanes</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">20 días</span>
              <button className="text-gray-300 hover:text-emerald-500 text-xs ml-1">✏️</button>
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">asdasdasd · asdasdasd</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
              <span className="font-semibold">UF</span> $39.841 &nbsp;·&nbsp; <span className="font-semibold">UTM</span> $69.889
            </div>
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {["CLP","UF","UTM"].map(m => (
                <button key={m} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${m === "CLP" ? "bg-white shadow text-emerald-700" : "text-gray-400"}`}>{m}</button>
              ))}
            </div>
          </div>
        </header>

        {/* Cuerpo */}
        {tab === "biblioteca" && (
          <div className="flex flex-1 overflow-hidden">
            <aside className="w-52 bg-white border-r border-gray-200 overflow-y-auto py-3 shrink-0">
              <div className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Familias ONDAC</div>
              {familias.map(f => (
                <div key={f}>
                  <button onClick={() => setFam(f)}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${fam === f ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
                    {f}
                  </button>
                  {fam === f && subfamilias[f]?.map(s => (
                    <button key={s} className="w-full text-left pl-6 pr-3 py-1 text-[11px] text-gray-500 hover:bg-gray-50">{s}</button>
                  ))}
                </div>
              ))}
            </aside>
            <main className="flex-1 overflow-y-auto p-4">
              <div className="flex gap-3 mb-4 items-center">
                <input placeholder="Buscar partida por nombre o código..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
                <span className="text-xs text-gray-400 shrink-0">821 partidas</span>
              </div>
              <div className="grid gap-2">
                {partidas.map(p => (
                  <div key={p.codigo} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-emerald-300 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono text-gray-400">{p.codigo}</span>
                        <span className="text-[10px] text-gray-400">{p.unidad}</span>
                      </div>
                      <div className="text-sm text-gray-800">{p.desc}</div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Precio unitario</div>
                        <div className="font-semibold text-emerald-600">{p.precio}</div>
                      </div>
                      <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">Ver APU</button>
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">+ Agregar</button>
                    </div>
                  </div>
                ))}
              </div>
            </main>
          </div>
        )}
        {tab !== "biblioteca" && (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-3">{tabs.find(t => t.id === tab)?.icon}</div>
              <div className="font-medium">{tabs.find(t => t.id === tab)?.label}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MOCKUP 2 — Split Panel (biblioteca + presupuesto siempre visible)
   Dos columnas: izquierda = biblioteca ONDAC, derecha = partidas del proyecto.
   El detalle APU se abre en un drawer lateral deslizante.
───────────────────────────────────────────────────────── */
function Mockup2() {
  const [fam, setFam] = useState("Todas las partidas");
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-sm">
      {/* Header compacto */}
      <header className="bg-emerald-800 px-5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button className="text-emerald-300 hover:text-white text-xs">← Dashboard</button>
          <span className="text-white font-bold text-sm">APU<span className="text-emerald-300">chile</span></span>
          <span className="text-emerald-400">|</span>
          <span className="text-white font-medium text-sm">asdasdasd</span>
          <span className="text-xs px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded-full border border-amber-400/30">Magallanes · 20 días</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-emerald-300">UF $39.841 · UTM $69.889</span>
          <div className="flex bg-emerald-900/50 rounded-lg p-0.5 ml-2">
            {["CLP","UF","UTM"].map(m => (
              <button key={m} className={`px-2 py-0.5 rounded text-[10px] font-semibold ${m === "CLP" ? "bg-emerald-600 text-white" : "text-emerald-400"}`}>{m}</button>
            ))}
          </div>
          <button className="ml-2 text-xs text-emerald-300 border border-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-700">⚙️ Config</button>
          <button className="text-xs text-emerald-300 border border-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-700">📄 PDF</button>
        </div>
      </header>

      {/* Split principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Panel izquierdo: Biblioteca ONDAC */}
        <div className="flex w-[55%] overflow-hidden border-r border-gray-200">
          {/* Sub-sidebar familias */}
          <aside className="w-44 bg-white border-r border-gray-200 overflow-y-auto py-2 shrink-0">
            <div className="px-3 mb-2 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Familias</div>
            {familias.map(f => (
              <button key={f} onClick={() => setFam(f)}
                className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${fam === f ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-500 hover:bg-gray-50"}`}>
                {f}
              </button>
            ))}
          </aside>
          {/* Lista partidas */}
          <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
            <div className="flex gap-2 mb-3 items-center">
              <input placeholder="Buscar..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-400 bg-white" />
              <span className="text-[10px] text-gray-400 shrink-0">821</span>
            </div>
            <div className="grid gap-1.5">
              {partidas.map(p => (
                <div key={p.codigo} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:border-emerald-300 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-mono text-gray-400">{p.codigo}</span>
                      <span className="text-[9px] bg-gray-100 text-gray-500 px-1 rounded">{p.unidad}</span>
                    </div>
                    <div className="text-xs text-gray-700 truncate">{p.desc}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="text-xs font-semibold text-emerald-600">{p.precio}</span>
                    <button onClick={() => setDrawer(true)} className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      ver
                    </button>
                    <button className="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded-lg hover:bg-emerald-700">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho: Presupuesto */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-800 text-sm">Presupuesto</span>
              <span className="ml-2 text-xs text-gray-400">3 partidas</span>
            </div>
            <button className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 flex items-center gap-1">
              📄 Exportar PDF
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-medium">Descripción</th>
                  <th className="px-3 py-2 text-center font-medium">Un.</th>
                  <th className="px-3 py-2 text-right font-medium">Cant.</th>
                  <th className="px-3 py-2 text-right font-medium">V. Total</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {proyecto.map(p => (
                  <tr key={p.codigo} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-gray-800 text-xs">{p.desc}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{p.codigo}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-500">{p.unidad}</td>
                    <td className="px-3 py-2.5 text-right">
                      <input type="number" defaultValue={p.cant} className="w-14 border border-gray-200 rounded px-1.5 py-0.5 text-right text-xs focus:outline-none focus:border-emerald-400" />
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">{p.precio}</td>
                    <td className="px-3 py-2.5 text-center"><button className="text-red-400 hover:text-red-600 text-xs">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Totales pegados al fondo */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <div className="space-y-1">
              {[["Costo Directo","$222.899"],["Gastos Generales (18%)","$40.122"],["Utilidad (10%)","$22.290"],["Neto","$285.311"],["IVA (19%)","$54.209"]].map(([l,v]) => (
                <div key={l} className="flex justify-between text-xs text-gray-600">
                  <span>{l}</span><span>{v}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-sm text-white bg-emerald-700 rounded-lg px-3 py-2 mt-2">
                <span>TOTAL</span><span>$339.520</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer APU */}
      {drawer && (
        <div className="fixed inset-0 z-40 flex" onClick={() => setDrawer(false)}>
          <div className="flex-1 bg-black/30" />
          <div className="w-96 bg-white shadow-2xl border-l overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <span className="font-semibold text-gray-800">Detalle APU</span>
              <button onClick={() => setDrawer(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4">
              <div className="text-xs text-gray-400 mb-1">00252 · MT</div>
              <div className="font-medium text-gray-800 mb-4">BAJADA ALLUVIA FE GALV. 30CM E=0.4MM</div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[["M.O. Neto","$450"],["Leyes Soc.","$180"],["Materiales","$320"],["Precio Unit.","$982"]].map(([l,v],i) => (
                  <div key={l} className={`rounded-lg p-3 ${i===3?"bg-emerald-600 text-white":"bg-gray-50 border"}`}>
                    <div className={`text-[10px] mb-1 ${i===3?"text-emerald-100":"text-gray-400"}`}>{l}</div>
                    <div className={`font-bold ${i===3?"text-white":"text-gray-800"}`}>{v}</div>
                  </div>
                ))}
              </div>
              <button className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700">
                + Agregar al presupuesto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MOCKUP 3 — Dark Pro (estilo herramienta profesional)
   Sidebar oscuro con jerarquía clara.
   Tema oscuro en sidebar, claro en contenido.
   Indicadores financieros en barra superior.
───────────────────────────────────────────────────────── */
function Mockup3() {
  const [tab, setTab] = useState("biblioteca");
  const [fam, setFam] = useState(null);

  const tabs = [
    { id: "biblioteca", icon: "📚", label: "Biblioteca ONDAC", count: "821" },
    { id: "presupuesto", icon: "📋", label: "Presupuesto", count: "3" },
    { id: "editor", icon: "🔧", label: "Editor APU" },
    { id: "anexos", icon: "📎", label: "Anexos", count: "2" },
    { id: "config", icon: "⚙️", label: "Configuración" },
  ];

  return (
    <div className="flex h-screen font-sans text-sm" style={{background:"#0f172a"}}>
      {/* Sidebar oscuro */}
      <div className="w-60 shrink-0 flex flex-col border-r" style={{background:"#1e293b", borderColor:"#334155"}}>
        {/* Logo + proyecto */}
        <div className="p-4 border-b" style={{borderColor:"#334155"}}>
          <div className="flex items-center gap-2 mb-3">
            <button className="text-slate-500 hover:text-slate-300 text-xs">←</button>
            <span className="font-black text-white text-sm">APU<span className="text-emerald-400">chile</span></span>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-medium text-xs">asdasdasd</span>
              <button className="text-slate-500 hover:text-slate-300 text-[10px]">✏️</button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">Magallanes</span>
              <span className="text-[10px] text-slate-500">· 20 días</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-all ${tab === t.id ? "bg-emerald-600/20 text-emerald-400 border-r-2 border-emerald-400" : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"}`}>
              <span>{t.icon}</span>
              <span className="flex-1 text-left">{t.label}</span>
              {t.count && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-emerald-400/20 text-emerald-400" : "bg-slate-700 text-slate-500"}`}>{t.count}</span>}
            </button>
          ))}

          {/* Familias como sub-nav */}
          {tab === "biblioteca" && (
            <div className="mt-2 pt-2 border-t" style={{borderColor:"#334155"}}>
              <div className="px-3 mb-1 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Categorías</div>
              {familias.slice(0,6).map(f => (
                <button key={f} onClick={() => setFam(fam === f ? null : f)}
                  className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${fam === f ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"}`}>
                  {fam === f ? "▼ " : "▶ "}{f}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Footer del sidebar */}
        <div className="p-3 border-t" style={{borderColor:"#334155"}}>
          <div className="text-[10px] text-slate-500 mb-1.5">Guardado · hace 2 seg</div>
          <button className="w-full text-xs text-red-400 hover:text-red-300 py-1.5 rounded-lg hover:bg-red-500/10 transition-all text-left px-2">
            ⏻ Cerrar sesión
          </button>
        </div>
      </div>

      {/* Área principal */}
      <div className="flex flex-col flex-1 overflow-hidden bg-gray-50">
        {/* Barra indicadores */}
        <div className="flex items-center justify-between px-5 py-2 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span><span className="font-semibold text-gray-700">UF</span> $39.841,72</span>
            <span className="text-gray-200">·</span>
            <span><span className="font-semibold text-gray-700">UTM</span> $69.889</span>
            <span className="text-gray-200">·</span>
            <span className="text-gray-400">asdasdasd · asdasdasd</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {["CLP","UF","UTM"].map(m => (
                <button key={m} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${m === "CLP" ? "bg-white shadow text-emerald-700" : "text-gray-400"}`}>{m}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex flex-1 overflow-hidden">
          {tab === "biblioteca" && (
            <main className="flex-1 overflow-y-auto p-4">
              <div className="flex gap-3 mb-4 items-center">
                <input placeholder="Buscar partida por nombre o código..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
                <span className="text-xs text-gray-400">821 partidas</span>
              </div>
              <div className="grid gap-2">
                {partidas.map(p => (
                  <div key={p.codigo} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-emerald-300 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono text-gray-400">{p.codigo}</span>
                        <span className="text-[10px] text-gray-400">{p.unidad}</span>
                      </div>
                      <div className="text-sm text-gray-800">{p.desc}</div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Precio unitario</div>
                        <div className="font-semibold text-emerald-600">{p.precio}</div>
                      </div>
                      <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">Ver APU</button>
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">+ Agregar</button>
                    </div>
                  </div>
                ))}
              </div>
            </main>
          )}
          {tab !== "biblioteca" && (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">{tabs.find(t => t.id === tab)?.icon}</div>
                <div>{tabs.find(t => t.id === tab)?.label}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MOCKUP 4 — Barra de Comandos (minimalista)
   Header ultra compacto. Tabs como pills sobre el contenido.
   Barra flotante de resumen financiero abajo (siempre visible).
   Sin sidebar permanente — familias como dropdown.
───────────────────────────────────────────────────────── */
function Mockup4() {
  const [tab, setTab] = useState("biblioteca");
  const [famOpen, setFamOpen] = useState(false);
  const [fam, setFam] = useState("Todas las partidas");

  return (
    <div className="flex flex-col h-screen bg-white font-sans text-sm">
      {/* Header ultra compacto */}
      <header className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 shrink-0">
        <button className="text-xs text-gray-400 hover:text-gray-600">← Dashboard</button>
        <span className="text-gray-200">|</span>
        <span className="font-black text-emerald-600 text-sm">APU<span className="text-gray-400 font-normal">chile</span></span>
        <span className="text-gray-200">|</span>
        <span className="font-semibold text-gray-800">asdasdasd</span>
        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Magallanes</span>
        <span className="text-xs text-gray-400">· 20 días</span>
        <button className="text-gray-300 hover:text-emerald-500 text-xs">✏️</button>
        <div className="flex-1" />
        <span className="text-[11px] text-gray-400">UF $39.841 · UTM $69.889</span>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {["CLP","UF","UTM"].map(m => (
            <button key={m} className={`px-2 py-0.5 rounded text-[10px] font-semibold ${m === "CLP" ? "bg-white shadow text-emerald-700" : "text-gray-400"}`}>{m}</button>
          ))}
        </div>
      </header>

      {/* Pills de navegación */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
        {[["biblioteca","📚 Biblioteca ONDAC"],["presupuesto","📋 Presupuesto (3)"],["editor","🔧 Editor APU"],["anexos","📎 Anexos"],["config","⚙️ Config"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${tab === id ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200"}`}>
            {label}
          </button>
        ))}

        {/* Filtro por familia (solo en biblioteca) */}
        {tab === "biblioteca" && (
          <div className="relative ml-auto">
            <button onClick={() => setFamOpen(!famOpen)}
              className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-full hover:bg-white">
              <span>🗂</span> {fam} <span>▾</span>
            </button>
            {famOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg w-52 z-10 py-1">
                {familias.map(f => (
                  <button key={f} onClick={() => { setFam(f); setFamOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${fam === f ? "text-emerald-700 font-medium" : "text-gray-600"}`}>
                    {fam === f ? "✓ " : "  "}{f}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-y-auto">
        {tab === "biblioteca" && (
          <div className="p-4">
            <div className="flex gap-3 mb-4 items-center">
              <input placeholder="Buscar partida por nombre o código..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20" />
              <span className="text-xs text-gray-400">821 partidas</span>
            </div>
            <div className="grid gap-2">
              {partidas.map(p => (
                <div key={p.codigo} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-gray-400">{p.codigo}</span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{p.unidad}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-800">{p.desc}</div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400">precio unitario</div>
                      <div className="font-bold text-emerald-600">{p.precio}</div>
                    </div>
                    <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">Ver APU</button>
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm">+ Agregar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab !== "biblioteca" && (
          <div className="flex items-center justify-center h-full text-gray-300">
            <div className="text-center py-20">
              <div className="text-5xl mb-3">{["presupuesto","editor","anexos","config"].includes(tab) ? ["📋","🔧","📎","⚙️"][["presupuesto","editor","anexos","config"].indexOf(tab)] : "📚"}</div>
              <div className="font-medium text-gray-400">{tab}</div>
            </div>
          </div>
        )}
      </div>

      {/* Barra de resumen financiero flotante abajo */}
      <div className="border-t border-gray-200 bg-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6 text-xs">
          {[["Costo Directo","$222.899","text-gray-600"],["GG + Utilidad","$62.412","text-gray-600"],["Neto","$285.311","text-gray-700"],["IVA (19%)","$54.209","text-gray-600"]].map(([l,v,c]) => (
            <div key={l}>
              <div className="text-[10px] text-gray-400 mb-0.5">{l}</div>
              <div className={`font-semibold ${c}`}>{v}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[10px] text-gray-400">Total con IVA</div>
            <div className="text-lg font-black text-emerald-700">$339.520</div>
          </div>
          <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-emerald-700 flex items-center gap-1.5">
            📄 Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MOCKUP 5 — Compacto Pro (tabla densa como Excel)
   Header con proyecto + indicadores en una sola línea.
   Tabs como pestañas (tabs de browser style).
   En biblioteca: tabla compacta tipo Excel con hover actions.
   Panel lateral derecho deslizable para ver APU/agregar.
───────────────────────────────────────────────────────── */
function Mockup5() {
  const [tab, setTab] = useState("biblioteca");
  const [selected, setSelected] = useState(null);
  const [fam, setFam] = useState(null);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans" style={{fontSize:"12px"}}>
      {/* Header todo en uno */}
      <header className="bg-white border-b border-gray-200 px-4 shrink-0">
        <div className="flex items-center gap-2 py-2 border-b border-gray-100">
          <button className="text-gray-400 hover:text-gray-600 text-xs">← Dashboard</button>
          <span className="text-gray-200">|</span>
          <span className="font-black text-emerald-600">APU<span className="text-gray-400 font-normal">chile</span></span>
          <span className="text-gray-200">|</span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-800">asdasdasd</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">Magallanes</span>
            <span className="text-gray-400">· 20 días · asdasdasd</span>
            <button className="text-gray-300 hover:text-emerald-500 ml-0.5">✏️</button>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span>UF $39.841</span>
            <span className="text-gray-200">·</span>
            <span>UTM $69.889</span>
          </div>
          <div className="flex bg-gray-100 rounded p-0.5 ml-2">
            {["CLP","UF","UTM"].map(m => (
              <button key={m} className={`px-2 py-0.5 rounded text-[10px] font-bold ${m === "CLP" ? "bg-white shadow text-emerald-700" : "text-gray-400"}`}>{m}</button>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">3 partidas</span>
            <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-full font-bold">$339.520</span>
          </div>
        </div>
        {/* Tabs estilo browser */}
        <div className="flex gap-0 -mb-px">
          {[["biblioteca","📚 Biblioteca ONDAC"],["presupuesto","📋 Presupuesto (3)"],["editor","🔧 Editor APU"],["anexos","📎 Anexos (2)"],["config","⚙️ Config"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === id ? "border-emerald-600 text-emerald-700 bg-emerald-50/50" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Contenido */}
      <div className="flex flex-1 overflow-hidden">
        {tab === "biblioteca" && (
          <>
            {/* Sidebar familias compacto */}
            <aside className="w-44 bg-white border-r border-gray-200 overflow-y-auto shrink-0">
              <div className="px-3 py-2 text-[9px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Familias ONDAC</div>
              <button onClick={() => setFam(null)} className={`w-full text-left px-3 py-1.5 text-[11px] ${!fam ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-500 hover:bg-gray-50"}`}>
                Todas (821)
              </button>
              {familias.slice(1).map(f => (
                <button key={f} onClick={() => setFam(f === fam ? null : f)}
                  className={`w-full text-left px-3 py-1.5 text-[11px] ${fam === f ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-500 hover:bg-gray-50"}`}>
                  {f}
                </button>
              ))}
            </aside>

            {/* Tabla densa */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-gray-200 bg-white flex items-center gap-2">
                <input placeholder="Buscar partida por nombre o código..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-400" />
                <span className="text-[10px] text-gray-400 shrink-0">821 partidas</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider w-16">Código</th>
                      <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider w-12">Un.</th>
                      <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider">Descripción</th>
                      <th className="px-3 py-2 text-right text-[9px] font-bold text-gray-500 uppercase tracking-wider w-24">Precio Unit.</th>
                      <th className="px-3 py-2 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {partidas.map((p, i) => (
                      <tr key={p.codigo}
                        onClick={() => setSelected(selected === p.codigo ? null : p.codigo)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${selected === p.codigo ? "bg-emerald-50 border-b-emerald-200" : i % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50/50 hover:bg-gray-100"}`}>
                        <td className="px-3 py-2 font-mono text-[10px] text-gray-400">{p.codigo}</td>
                        <td className="px-3 py-2 text-center text-[10px] text-gray-500">{p.unidad}</td>
                        <td className="px-3 py-2 text-gray-800 text-xs">{p.desc}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-700 text-xs">{p.precio}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <button className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-0.5 border border-gray-200 rounded hover:bg-white transition-colors">APU</button>
                            <button className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded hover:bg-emerald-700 transition-colors">+ Agregar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Indicación de más partidas */}
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-3 py-3 text-center text-[10px] text-gray-400">
                        Mostrando 7 de 821 — usa el buscador para filtrar más resultados
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panel detalle deslizable */}
            {selected && (
              <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto shrink-0">
                <div className="p-3 border-b flex items-center justify-between bg-emerald-50">
                  <span className="font-semibold text-emerald-800 text-xs">Detalle APU</span>
                  <button onClick={() => setSelected(null)} className="text-emerald-400 hover:text-emerald-700 text-xs">✕</button>
                </div>
                <div className="p-3">
                  <div className="text-[10px] text-gray-400 mb-0.5">{selected} · MT</div>
                  <div className="font-medium text-gray-800 text-xs mb-3">{partidas.find(p => p.codigo === selected)?.desc}</div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[["M.O. Neto","$450"],["Leyes Soc.","$180"],["Materiales","$320"],["Total","$982"]].map(([l,v],i) => (
                      <div key={l} className={`rounded-lg p-2 ${i===3 ? "bg-emerald-600 text-white col-span-2 flex justify-between items-center" : "bg-gray-50 border"}`}>
                        <div className={`text-[9px] ${i===3 ? "text-emerald-100" : "text-gray-400"} ${i!==3 ? "mb-1" : ""}`}>{l}</div>
                        <div className={`font-bold text-sm ${i===3 ? "text-white" : "text-gray-800"}`}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full bg-emerald-600 text-white py-2 rounded-lg font-medium text-xs hover:bg-emerald-700">
                    + Agregar al presupuesto
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {tab !== "biblioteca" && (
          <div className="flex-1 flex items-center justify-center text-gray-300">
            <div className="text-center py-20">
              <div className="text-4xl mb-2">{tab === "presupuesto" ? "📋" : tab === "editor" ? "🔧" : tab === "anexos" ? "📎" : "⚙️"}</div>
              <div className="font-medium text-gray-400">{tab}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
