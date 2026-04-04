"use client";
import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ONDAC_APUS from '../ondac_data_nuevo.json';
import MATERIALES_BASE from '../data/materiales_precios.json';
import { supabase } from '../lib/supabase';
import { useInactividad } from '../lib/useInactividad';
import { useIndicadores } from '../lib/useIndicadores';
import LoadingOverlay from '../components/LoadingOverlay';
import { getTemplatesParaProyecto } from '../data/eett_templates.js';

// Factor IPC acumulado Chile 2017→2025 (INE)
const IPC_2017_2025 = 1.65;

// Índice de materiales con precio Sodimac actualizado
const MATERIALES_IDX = (() => {
  const idx = {};
  for (const m of MATERIALES_BASE) {
    if (m.precio_actual_rm) idx[m.desc.trim().toUpperCase()] = m.precio_actual_rm;
  }
  return idx;
})();

function precioMaterialActual(desc) {
  return MATERIALES_IDX[desc?.trim().toUpperCase()] ?? null;
}

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

// ── Carta Gantt: fases y helpers ───────────────────────────────────────────
const FASE_ORDEN = {
  V:1,VA:1,VB:1,VC:1,
  RB:2,RA:2,R:2,
  RE:3,RC:3,AA:3,
  I:4,IA:4,IB:4,S:4,
  P:5,PA:5,PB:5,PC:5,PD:5,
  K:6,KA:6,KB:6,
  G:7,GA:7,GB:7,H:7,HA:7,HC:7,HE:7,RD:7,
  FA:8,PE:8,PF:8,
  W:9,N:9,
  O:10,QD:10,
};
const FASES_INFO = [
  null,
  { label:"Demolición",     color:"#ef4444", light:"#fee2e2" },
  { label:"Obras civiles",  color:"#f97316", light:"#ffedd5" },
  { label:"Estructura",     color:"#f59e0b", light:"#fef3c7" },
  { label:"Cubierta",       color:"#eab308", light:"#fef9c3" },
  { label:"Instalaciones",  color:"#3b82f6", light:"#dbeafe" },
  { label:"Carpintería",    color:"#8b5cf6", light:"#ede9fe" },
  { label:"Revestimientos", color:"#10b981", light:"#d1fae5" },
  { label:"Terminaciones",  color:"#14b8a6", light:"#ccfbf1" },
  { label:"Equipamiento",   color:"#ec4899", light:"#fce7f3" },
  { label:"Urbanización",   color:"#6b7280", light:"#f3f4f6" },
];
function getFase(apu) {
  const fam = (apu.familia || apu.codigo || "").toUpperCase();
  return FASE_ORDEN[fam.substring(0,2)] || FASE_ORDEN[fam[0]] || 7;
}

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
    if (ins.tipo === "mo") {
      punit = moRates[ins.moKey] ?? 0;
      cant = ins.rend ?? 0;
    } else if (ins.tipo === "mat" || ins.tipo === "fung") {
      const precioSodimac = precioMaterialActual(ins.desc);
      punit = precioSodimac
        ? precioSodimac * (1 + zona)
        : (ins.punit ?? 0) * IPC_2017_2025 * (1 + zona);
    }
    const cantFinal = cant * (1 + (ins.perd ?? 0) / 100);
    const sub = cantFinal * punit;
    if (ins.tipo === "mo") moNet += sub;
    else if (ins.tipo === "mat") mat += sub;
    else if (ins.tipo === "fung") fung += sub;
    return { ...ins, punit, cant, sub };
  });
  if (rows.length === 0 || (moNet === 0 && mat === 0 && fung === 0)) {
    const precioBase = apu.precioOverride
      ? apu.precioOverride * (1 + zona)
      : (apu.precio || 0) * IPC_2017_2025 * (1 + zona);
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

export default function ProyectoPage() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-900"><LoadingOverlay visible={true} mensaje="Cargando proyecto..." blur={false} /></div>}><Home /></Suspense>;
}

function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proyectoId = searchParams.get("id");
  const [proyectoNombre, setProyectoNombre] = useState("Proyecto");
  const [userId, setUserId] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [cfg, setCfg] = useState({
    zona: 0.25, llss: 40, gg: 18, util: 10, iva: 19, herr: 4,
    mo_m1: 6800, mo_m2: 5200, mo_ay: 3800, mo_inst: 9500,
  });
  const updateCfg = (k, v) => setCfg((c) => ({ ...c, [k]: parseFloat(v) || 0 }));
  const tabParam = searchParams.get("tab");
  const archivoParam = searchParams.get("archivo");
  const tipoParam = searchParams.get("tipo");
  const [tab, setTab] = useState(tabParam || "biblioteca");
  const [busqueda, setBusqueda] = useState("");
  const [familiaActiva, setFamiliaActiva] = useState(null);
  const [apuActivo, setApuActivo] = useState(null);
  const [proyecto, setProyecto] = useState([]);
  const [expandedResumen, setExpandedResumen] = useState(null);
  const [moneda, setMoneda] = useState("CLP");
  const { uf, utm } = useIndicadores();
  const [anexos, setAnexos] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [matchesAnexo, setMatchesAnexo] = useState(null);
  const anexoInputRef = useRef(null);
  const [proyectoMeta, setProyectoMeta] = useState({});
  const [editandoProyecto, setEditandoProyecto] = useState(false);
  const [editandoPartida, setEditandoPartida] = useState(null); // partida del proyecto en edición

  // Auth + cargar proyecto
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      if (proyectoId) {
        const { data } = await supabase.from("proyectos").select("*").eq("id", proyectoId).single();
        if (data) {
          setProyectoNombre(data.nombre);
          setProyecto(data.datos || []);
          setProyectoMeta(data.meta || {});
          if (data.meta?.zona !== undefined) setCfg(c => ({ ...c, zona: data.meta.zona }));
        }
        // Si viene con archivo desde dashboard, auto-procesar
        if (archivoParam && tipoParam) {
          const ext = archivoParam.split(".").pop().toLowerCase();
          setAnexos([{ name: archivoParam.split("/").pop(), size: 0 }]);
          setProcesando(true);
          fetch("/api/procesar-anexo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storagePath: archivoParam, tipo: tipoParam }),
          }).then(r => r.json()).then(d => {
            setProcesando(false);
            if (d.error) alert("Error al procesar: " + d.error);
            else setMatchesAnexo({ nombre: archivoParam.split("/").pop(), partidas: d.partidas || [] });
          }).catch(() => setProcesando(false));
        }
      }
    });
  }, [proyectoId]);

  // Auto-logout por inactividad (10 min)
  useInactividad(supabase, router, 10);

  // Autoguardado cada vez que cambia el proyecto (debounce 1.5s)
  useEffect(() => {
    if (!proyectoId || !userId) return;
    const timer = setTimeout(async () => {
      setGuardando(true);
      await supabase.from("proyectos").update({ datos: proyecto, updated_at: new Date().toISOString() }).eq("id", proyectoId);
      setGuardando(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [proyecto]);

  // Guardar inmediatamente al cerrar o salir de la pestaña
  useEffect(() => {
    if (!proyectoId || !userId) return;
    const guardarAhora = () => {
      navigator.sendBeacon(
        `/api/guardar?id=${proyectoId}`,
        JSON.stringify({ datos: proyecto })
      );
    };
    window.addEventListener("beforeunload", guardarAhora);
    return () => window.removeEventListener("beforeunload", guardarAhora);
  }, [proyectoId, userId, proyecto]);

  const [famAbierta, setFamAbierta] = useState(null);

  const raices = FAMILIAS.filter((f) => !f.padre);
  const hijos = (padre) => FAMILIAS.filter((f) => f.padre === padre);

  const conteoFamilia = useMemo(() => {
    const map = {};
    APUS.forEach(a => {
      const fam = (a.familia || "").toUpperCase();
      FAMILIAS.forEach(f => {
        if (fam === f.codigo || fam.startsWith(f.codigo)) {
          map[f.codigo] = (map[f.codigo] || 0) + 1;
        }
      });
    });
    return map;
  }, []);

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

  // Formateo según moneda seleccionada
  const fmtM = (n) => {
    const v = n || 0;
    if (moneda === "UF" && uf) return `${(v / uf).toFixed(2)} UF`;
    if (moneda === "UTM" && utm) return `${(v / utm).toFixed(3)} UTM`;
    return "$" + Math.round(v).toLocaleString("es-CL");
  };

  const ZONAS = [
    { val: 0, label: "Metropolitana" },
    { val: 0.15, label: "Biobío / La Araucanía (+15%)" },
    { val: 0.20, label: "Los Lagos (+20%)" },
    { val: 0.25, label: "Magallanes (+25%)" },
    { val: 0.30, label: "Aysén (+30%)" },
  ];
  const zonaLabel = ZONAS.find((z) => z.val === cfg.zona)?.label ?? "Magallanes";

  const guardarPartidaEditada = (partidaActualizada) => {
    setProyecto(pr => pr.map(x => x.id === partidaActualizada.id ? partidaActualizada : x));
    setEditandoPartida(null);
  };

  const guardarEdicionProyecto = async (nuevoNombre, nuevaMeta) => {
    if (!proyectoId) return;
    await supabase.from("proyectos").update({
      nombre: nuevoNombre,
      meta: nuevaMeta,
      updated_at: new Date().toISOString()
    }).eq("id", proyectoId);
    setProyectoNombre(nuevoNombre);
    setProyectoMeta(nuevaMeta);
    if (nuevaMeta?.zona !== undefined) setCfg(c => ({ ...c, zona: nuevaMeta.zona }));
    setEditandoProyecto(false);
  };

  const exportarPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const ancho = doc.internal.pageSize.getWidth();

    // Encabezado
    doc.setFillColor(6, 95, 70);
    doc.rect(0, 0, ancho, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("APUchile", 14, 12);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Análisis de Precios Unitarios", 14, 19);
    doc.setFontSize(11);
    doc.text(proyectoNombre, ancho - 14, 12, { align: "right" });
    doc.setFontSize(8);
    doc.text(new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" }), ancho - 14, 19, { align: "right" });

    // Info del proyecto
    let y = 36;
    doc.setTextColor(30, 30, 30);
    const infoItems = [
      proyectoMeta.mandante && ["Mandante", proyectoMeta.mandante],
      proyectoMeta.region && ["Región", proyectoMeta.region],
      proyectoMeta.responsable && ["Responsable", proyectoMeta.responsable],
      proyectoMeta.fechaInicio && ["Inicio", new Date(proyectoMeta.fechaInicio).toLocaleDateString("es-CL")],
      proyectoMeta.fechaTermino && ["Término", new Date(proyectoMeta.fechaTermino).toLocaleDateString("es-CL")],
      proyectoMeta.diasCorridos && ["Plazo", `${proyectoMeta.diasCorridos} días corridos`],
    ].filter(Boolean);

    if (infoItems.length > 0) {
      doc.setFillColor(247, 250, 249);
      doc.rect(14, y - 4, ancho - 28, infoItems.length * 6 + 4, "F");
      infoItems.forEach(([label, val]) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(label + ":", 18, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(val, 50, y);
        y += 6;
      });
      y += 4;
    }

    // Tabla de partidas
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(6, 95, 70);
    doc.text("Partidas del presupuesto", 14, y + 4);
    y += 8;

    const filas = proyecto.map(p => {
      const { total } = calcAPU(p, cfg);
      return [
        p.codigo,
        (p.desc || p.descripcion || "").substring(0, 55),
        p.unidad,
        p.cantidad,
        "$" + Math.round(total).toLocaleString("es-CL"),
        "$" + Math.round(total * p.cantidad).toLocaleString("es-CL"),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Código", "Descripción", "Un.", "Cant.", "V. Unit.", "V. Total"]],
      body: filas,
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: [6, 95, 70], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 250, 248] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 75 },
        2: { cellWidth: 12, halign: "center" },
        3: { cellWidth: 15, halign: "right" },
        4: { cellWidth: 28, halign: "right" },
        5: { cellWidth: 28, halign: "right" },
      },
    });

    // Totales
    const finalY = doc.lastAutoTable.finalY + 6;
    const totalesData = [
      ["Subtotal Costo Directo", resumen.cd],
      [`Gastos Generales (${cfg.gg}%)`, resumen.gg],
      [`Utilidad (${cfg.util}%)`, resumen.util],
      ["Subtotal Neto", resumen.neto],
      [`IVA (${cfg.iva}%)`, resumen.iva],
      ["TOTAL PROYECTO", resumen.total],
    ];

    autoTable(doc, {
      startY: finalY,
      body: totalesData.map(([label, val], i) => [
        label,
        "$" + Math.round(val).toLocaleString("es-CL"),
      ]),
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 40, halign: "right" },
      },
      bodyStyles: { fillColor: false },
      didParseCell: (data) => {
        if (data.row.index === totalesData.length - 1) {
          data.cell.styles.fillColor = [6, 95, 70];
          data.cell.styles.textColor = 255;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 10;
        }
      },
      margin: { left: ancho - 155 },
      tableWidth: 140,
    });

    // Pie de página
    const totalPags = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPags; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text("Generado por APUchile · apuchile.vercel.app", 14, 292);
      doc.text(`Página ${i} de ${totalPags}`, ancho - 14, 292, { align: "right" });
    }

    doc.save(`${proyectoNombre.replace(/\s+/g, "_")}_presupuesto.pdf`);
  };

  // Cargar anexos guardados cuando carga el proyecto
  useEffect(() => {
    if (!proyectoId) return;
    supabase.storage.from("anexos").list(proyectoId + "/").then(({ data }) => {
      if (data) setAnexos(data.map(f => ({ name: f.name, size: f.metadata?.size })));
    });
  }, [proyectoId]);

  const subirYProcesar = async (file, tipo) => {
    if (!file || !proyectoId) return;
    setProcesando(true);
    setMatchesAnexo(null);

    // 1. Subir a Supabase Storage
    const path = `${proyectoId}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("anexos").upload(path, file, { upsert: true });
    if (uploadError) {
      alert("Error al subir archivo: " + uploadError.message);
      setProcesando(false);
      return;
    }
    setAnexos(prev => {
      const sin = prev.filter(a => a.name !== file.name);
      return [...sin, { name: file.name, size: file.size }];
    });

    if (tipo === "plano") { setProcesando(false); return; }

    // 2. El servidor descarga desde Supabase, extrae texto y cruza con ONDAC
    try {
      const res = await fetch("/api/procesar-anexo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath: path, tipo }),
      });
      const data = await res.json();
      if (data.error) { alert("Error al procesar: " + data.error); }
      else { setMatchesAnexo({ nombre: file.name, partidas: data.partidas || [] }); }
    } catch (err) {
      alert("Error de conexión: " + err.message);
    }
    setProcesando(false);
  };

  const confirmarPartidas = (seleccionadas) => {
    const nuevas = seleccionadas.map(p => ({
      ...p.apu,
      cantidad: p.cantidad || 1,
      id: Date.now() + Math.random(),
    }));
    setProyecto(prev => [...prev, ...nuevas]);
    setMatchesAnexo(null);
    setTab("resumen");
  };

  const TABS_RAIL = [
    { id: "biblioteca",  icon: "📚", label: "Biblioteca"  },
    { id: "resumen",     icon: "📋", label: "Presupuesto" },
    { id: "gantt",       icon: "📅", label: "Gantt"       },
    { id: "eett",        icon: "📝", label: "EE.TT."      },
    { id: "editor",      icon: "🔧", label: "Editor APU"  },
    { id: "anexos",      icon: "📎", label: "Anexos"      },
    { id: "config",      icon: "⚙️", label: "Config"      },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-sm text-gray-800">
      <LoadingOverlay visible={procesando} mensaje="Analizando documento con ONDAC..." />

      {/* ── Rail lateral ── */}
      <div className="w-[68px] bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-1 shrink-0 shadow-sm z-10">
        <div className="mb-3 text-center leading-none select-none">
          <div className="text-[11px] font-black text-emerald-600">APU</div>
          <div className="text-[9px] text-gray-400 font-medium">chile</div>
        </div>
        {TABS_RAIL.map((t, i) => (
          <button key={t.id} onClick={() => setTab(t.id)} title={t.label}
            style={{ animationDelay: `${i * 40}ms` }}
            className={`relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 rail-btn anim-fade-up ${tab === t.id ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 shadow-sm" : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"}`}>
            <span className={`text-lg leading-none transition-transform duration-150 ${tab === t.id ? "scale-110" : "scale-100"}`}>{t.icon}</span>
            <span className="text-[9px] font-medium leading-none">{t.label}</span>
            {t.id === "resumen" && proyecto.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold shadow-sm">{proyecto.length}</span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => router.push("/dashboard")} title="Volver al dashboard"
          className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:bg-red-50 hover:text-red-400 rail-btn">
          <span className="text-lg leading-none">🏠</span>
          <span className="text-[9px] font-medium">Inicio</span>
        </button>
      </div>

      {/* ── Área principal ── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0 anim-fade-up">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">{proyectoNombre}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{zonaLabel}</span>
              <button onClick={() => setEditandoProyecto(true)}
                className="text-gray-300 hover:text-emerald-500 transition-colors text-xs hover:scale-110 transition-transform">✏️</button>
              {guardando && (
                <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full anim-fade-in flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>
                  Guardando...
                </span>
              )}
            </div>
            {(proyectoMeta.mandante || proyectoMeta.responsable || proyectoMeta.diasCorridos) && (
              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                {proyectoMeta.mandante && <span>{proyectoMeta.mandante}</span>}
                {proyectoMeta.responsable && <span>· {proyectoMeta.responsable}</span>}
                {proyectoMeta.diasCorridos && <span>· {proyectoMeta.diasCorridos} días</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {uf && (
              <div className="hidden lg:flex items-center gap-2 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 anim-fade-in delay-200">
                <span><span className="font-semibold text-gray-600">UF</span> ${uf.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-gray-200">·</span>
                <span><span className="font-semibold text-gray-600">UTM</span> ${utm?.toLocaleString("es-CL") ?? "—"}</span>
              </div>
            )}
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {["CLP","UF","UTM"].map(m => (
                <button key={m} onClick={() => setMoneda(m)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold btn-press ${moneda === m ? "bg-white shadow text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── Contenido según tab ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* BIBLIOTECA */}
          {tab === "biblioteca" && (
            <>
              {/* Sidebar acordeón */}
              <aside className="w-56 bg-white border-r border-gray-100 flex flex-col overflow-hidden shrink-0 anim-fade-up">
                <div className="px-3 py-2.5 border-b border-gray-100">
                  <input placeholder="Filtrar categorías..."
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs input-focus focus:outline-none focus:border-emerald-400" />
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                  <button onClick={() => { setFamiliaActiva(null); setFamAbierta(null); }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors duration-100 ${!familiaActiva ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-500" : "text-gray-600 hover:bg-gray-50"}`}>
                    <span>Todas las partidas</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-normal">{APUS.length}</span>
                  </button>
                  {raices.map(r => {
                    const estaAbierta = famAbierta === r.codigo;
                    const tieneActiva = familiaActiva === r.codigo || hijos(r.codigo).some(h => h.codigo === familiaActiva);
                    return (
                      <div key={r.codigo}>
                        <button onClick={() => setFamAbierta(estaAbierta ? null : r.codigo)}
                          className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between transition-colors duration-100 ${tieneActiva ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50"}`}>
                          <span className="truncate pr-1">{r.nombre}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {conteoFamilia[r.codigo] > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-normal">{conteoFamilia[r.codigo]}</span>}
                            <span className={`text-gray-400 text-[10px] inline-block ${estaAbierta ? "arrow-open" : "arrow-close"}`}>▸</span>
                          </div>
                        </button>
                        {estaAbierta && hijos(r.codigo).map((h, hi) => (
                          <button key={h.codigo} onClick={() => setFamiliaActiva(h.codigo)}
                            style={{ animationDelay: `${hi * 25}ms` }}
                            className={`accordion-item w-full text-left pl-6 pr-3 py-1.5 text-[11px] flex items-center justify-between transition-colors duration-100 ${familiaActiva === h.codigo ? "text-emerald-600 font-semibold bg-emerald-50 border-r-2 border-emerald-400" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}>
                            <span className="flex items-center gap-1"><span className="text-gray-300">›</span> {h.nombre}</span>
                            {conteoFamilia[h.codigo] > 0 && <span className="text-[10px] text-gray-400">{conteoFamilia[h.codigo]}</span>}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </aside>

              {/* Lista partidas */}
              <main className="flex-1 overflow-y-auto">
                <div className="px-4 py-3 border-b border-gray-200 bg-white flex gap-3 items-center sticky top-0 z-10 shadow-sm">
                  <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar partida por nombre o código..."
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm input-focus focus:outline-none focus:border-emerald-400 shadow-sm" />
                  <span className="text-xs text-gray-400 shrink-0 tabular-nums">{apusFiltrados.length} partidas</span>
                </div>
                <div className="p-4 grid gap-2">
                  {apusFiltrados.slice(0,100).map((apu, idx) => {
                    const { total } = calcAPU(apu, cfg);
                    const desc = apu.desc || apu.descripcion || "Sin descripción";
                    return (
                      <div key={`${apu.codigo}_${idx}`}
                        style={{ animationDelay: `${Math.min(idx, 12) * 25}ms` }}
                        className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between card-hover anim-fade-up group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{apu.codigo}</span>
                            <span className="text-[10px] text-gray-400 font-medium">{apu.unidad}</span>
                          </div>
                          <div className="text-sm text-gray-800 leading-snug font-medium">{desc}</div>
                        </div>
                        <div className="flex items-center gap-3 ml-4 shrink-0">
                          <div className="text-right">
                            <div className="text-[10px] text-gray-400">Precio unitario</div>
                            <div className="font-bold text-emerald-600">{fmtM(total)}</div>
                          </div>
                          <button onClick={() => { setApuActivo(apu); setTab("editor"); }}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600 opacity-0 group-hover:opacity-100 btn-press"
                            style={{ transition: "opacity 0.15s ease, transform 0.12s cubic-bezier(0.16,1,0.3,1), background-color 0.15s ease" }}>
                            Ver APU
                          </button>
                          <button onClick={() => agregarPartida(apu)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white shadow-sm btn-primary hover:bg-emerald-700">
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
            </>
          )}

          {/* GANTT */}
          {tab === "gantt" && (
            <GanttView
              proyecto={proyecto}
              cfg={cfg}
              proyectoNombre={proyectoNombre}
              proyectoMeta={proyectoMeta}
              onGoTo={setTab}
            />
          )}

          {/* EE.TT. */}
          {tab === "eett" && (
            <EETTView
              proyecto={proyecto}
              proyectoNombre={proyectoNombre}
              proyectoMeta={proyectoMeta}
            />
          )}

          {/* EDITOR APU */}
          {tab === "editor" && (
          <div className="flex-1 overflow-y-auto p-5 anim-fade-up">
            {!apuActivo ? (
              <div className="text-center py-20 text-gray-400 anim-fade-in">
                <p className="text-4xl mb-4">🔧</p>
                <p className="text-base mb-2 font-medium text-gray-500">Ninguna partida seleccionada</p>
                <button onClick={()=>setTab("biblioteca")} className="text-emerald-600 text-sm underline btn-press">Ir a la biblioteca</button>
              </div>
            ) : (
              <>
                <div className="mb-5 anim-fade-up">
                  <div className="text-xs text-gray-400 mb-1">{apuActivo.codigo} · {apuActivo.unidad}</div>
                  <h2 className="text-base font-semibold text-gray-800">{apuActivo.desc || apuActivo.descripcion}</h2>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[["Costo M.O. neto",fmtM(apuCalc.moNet)],["Leyes Sociales",fmtM(apuCalc.llssAmt)],["Materiales",fmtM(apuCalc.mat)],["Precio unitario",fmtM(apuCalc.total)]].map(([label,val],i)=>(
                    <div key={i} style={{ animationDelay: `${i * 50 + 60}ms` }}
                      className={`rounded-xl p-4 anim-scale-in ${i===3?"bg-emerald-600 text-white shadow-lg shadow-emerald-200":"bg-white border border-gray-200"}`}>
                      <div className={`text-[10px] uppercase tracking-wider mb-1 ${i===3?"text-emerald-100":"text-gray-400"}`}>{label}</div>
                      <div className={`text-lg font-semibold ${i===3?"text-white":"text-gray-800"}`}>{val}</div>
                    </div>
                  ))}
                </div>

                {apuActivo.insumos && apuActivo.insumos.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5 anim-fade-up delay-200">
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
                            <tr key={idx} className="row-hover hover:bg-blue-50">
                              <td className="px-4 py-2 text-gray-700">{ins.desc}</td>
                              <td className="px-4 py-2 text-right text-gray-700">{ins.cant}</td>
                              <td className="px-4 py-2 text-center text-gray-500">{ins.un}</td>
                              <td className="px-4 py-2 text-right text-gray-600">{ins.punit > 0 ? fmtM(ins.punit) : <span className="text-gray-300">—</span>}</td>
                              <td className="px-4 py-2 text-right font-medium text-gray-800">{ins.punit > 0 ? fmtM(ins.cant * ins.punit) : <span className="text-gray-300">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <button onClick={()=>agregarPartida(apuActivo)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 btn-primary anim-fade-up delay-300">
                  + Agregar esta partida al proyecto
                </button>
              </>
            )}
          </div>
        )}

          {/* CONFIG */}
          {tab === "config" && (
          <div className="flex-1 overflow-y-auto p-5 max-w-2xl">
            <h2 className="text-base font-semibold mb-5 text-gray-800 anim-fade-up">Configuración del proyecto</h2>
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 anim-fade-up delay-50">
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
            <div className="bg-white border border-gray-200 rounded-xl p-5 anim-fade-up delay-100">
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

          {/* RESUMEN */}
          {tab === "resumen" && (
          <div className="flex-1 overflow-y-auto p-5 anim-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-800">Resumen del proyecto</h2>
              {proyecto.length > 0 && (
                <button onClick={exportarPDF}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-medium btn-primary hover:bg-emerald-700">
                  📄 Exportar PDF
                </button>
              )}
            </div>
            {proyecto.length === 0 ? (
              <div className="text-center py-20 text-gray-400 anim-fade-in">
                <p className="text-4xl mb-4">📋</p>
                <p className="mb-2 font-medium text-gray-500">No hay partidas agregadas</p>
                <button onClick={()=>setTab("biblioteca")} className="text-emerald-600 text-sm underline btn-press">Ir a la biblioteca ONDAC</button>
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
                        const { total, rows } = calcAPU(p, cfg);
                        const desc = p.desc || p.descripcion || "Sin descripción";
                        const expanded = expandedResumen === p.id;
                        return (
                          <>
                            <tr key={p.id} className={`border-b border-gray-100 row-hover cursor-pointer ${expanded ? "bg-emerald-50" : "hover:bg-gray-50"}`}
                              onClick={(e) => { if (e.target.tagName !== "INPUT" && e.target.tagName !== "BUTTON") setExpandedResumen(expanded ? null : p.id); }}>
                              <td className="px-4 py-3">
                                <div className="text-[10px] text-gray-400 font-mono">{p.codigo}</div>
                                <div className="text-gray-700 leading-snug flex items-center gap-1">
                                  <span>{desc}</span>
                                  <span className={`text-[10px] text-gray-400 inline-block ${expanded ? "arrow-open" : "arrow-close"}`}>▸</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center text-gray-500">{p.unidad}</td>
                              <td className="px-3 py-3 text-right">
                                <input type="number" value={p.cantidad} min={0.01} step={0.01}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e)=>setProyecto(pr=>pr.map(x=>x.id===p.id?{...x,cantidad:parseFloat(e.target.value)||1}:x))}
                                  className="w-16 border border-gray-200 rounded px-2 py-1 text-right text-xs input-focus focus:outline-none focus:border-emerald-400"/>
                              </td>
                              <td className="px-3 py-3 text-right text-gray-700">{fmtM(total)}</td>
                              <td className="px-3 py-3 text-right font-semibold text-emerald-600">{fmtM(total * p.cantidad)}</td>
                              <td className="px-3 py-3 text-right">
                                <div className="flex items-center gap-1 justify-end">
                                  <button onClick={(e)=>{e.stopPropagation();setEditandoPartida(p);}}
                                    className="text-gray-300 hover:text-emerald-600 text-xs btn-press transition-colors px-1" title="Editar partida">✏️</button>
                                  <button onClick={(e)=>{e.stopPropagation();setProyecto(pr=>pr.filter(x=>x.id!==p.id));}}
                                    className="text-gray-300 hover:text-red-500 text-xs btn-press transition-colors px-1">✕</button>
                                </div>
                              </td>
                            </tr>
                            {expanded && rows.length > 0 && (
                              <tr key={p.id + "_detail"} className="bg-emerald-50 border-b border-emerald-100">
                                <td colSpan={6} className="px-6 py-3">
                                  <table className="w-full text-[11px]">
                                    <thead>
                                      <tr className="text-gray-400 border-b border-emerald-100">
                                        <th className="text-left py-1 font-medium">Insumo</th>
                                        <th className="text-center py-1 font-medium">Tipo</th>
                                        <th className="text-center py-1 font-medium">Un.</th>
                                        <th className="text-right py-1 font-medium">Cant.</th>
                                        <th className="text-right py-1 font-medium">P. Unit.</th>
                                        <th className="text-right py-1 font-medium">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((ins, i) => (
                                        <tr key={i} className="border-b border-emerald-50">
                                          <td className="py-1 text-gray-700">{ins.desc}</td>
                                          <td className="py-1 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${ins.tipo==="mo"?"bg-blue-100 text-blue-700":ins.tipo==="mat"?"bg-amber-100 text-amber-700":"bg-gray-100 text-gray-600"}`}>
                                              {ins.tipo}
                                            </span>
                                          </td>
                                          <td className="py-1 text-center text-gray-500">{ins.un}</td>
                                          <td className="py-1 text-right text-gray-600">{(ins.cant ?? 0).toFixed(3)}</td>
                                          <td className="py-1 text-right text-gray-600">{fmtM(ins.punit)}</td>
                                          <td className="py-1 text-right font-medium text-gray-700">{fmtM(ins.sub)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </>
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
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-md ml-auto anim-fade-up shadow-sm">
                  {[
                    ["Subtotal costo directo", resumen.cd],
                    [`Gastos Generales (${cfg.gg}%)`, resumen.gg],
                    [`Utilidad (${cfg.util}%)`, resumen.util],
                    ["Subtotal neto", resumen.neto],
                    [`IVA (${cfg.iva}%)`, resumen.iva],
                  ].map(([label, val], i) => (
                    <div key={i} className="flex justify-between items-center px-5 py-3 border-b border-gray-100 row-hover hover:bg-gray-50">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium tabular-nums">{fmtM(val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-5 py-4 bg-emerald-600 text-white">
                    <span className="font-semibold">Total proyecto</span>
                    <span className="text-xl font-bold tabular-nums">{fmtM(resumen.total)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

          {/* ANEXOS */}
          {tab === "anexos" && (
          <div className="flex-1 overflow-y-auto p-5 max-w-3xl anim-fade-up">
            <h2 className="text-base font-semibold mb-2 text-gray-800">Anexos del proyecto</h2>
            <p className="text-xs text-gray-400 mb-6">Sube documentos del proyecto. Los PDF y Excel pueden procesarse automáticamente con IA para detectar partidas ONDAC.</p>

            {/* Zona de subida */}
            <AnexoUploader onSubir={subirYProcesar} procesando={procesando} inputRef={anexoInputRef}/>

            {/* Procesando indicator */}
            {procesando && (
              <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center gap-4">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0"/>
                <div>
                  <p className="text-sm font-medium text-emerald-700">Procesando documento...</p>
                  <p className="text-xs text-emerald-500 mt-0.5">Extrayendo texto y cruzando con base ONDAC</p>
                </div>
              </div>
            )}

            {/* Resultados del procesamiento */}
            {matchesAnexo && (
              <MatchesReview
                nombre={matchesAnexo.nombre}
                partidas={matchesAnexo.partidas}
                onConfirmar={confirmarPartidas}
                onDescartar={() => setMatchesAnexo(null)}
              />
            )}

            {/* Lista de anexos subidos */}
            {anexos.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Archivos subidos</h3>
                <div className="space-y-2">
                  {anexos.map((a, i) => {
                    const ext = a.name.split(".").pop().toLowerCase();
                    const icon = ext === "pdf" ? "📄" : ext === "xlsx" || ext === "xls" ? "📊" : ext === "dwg" || ext === "dxf" ? "📐" : "📎";
                    return (
                      <div key={i} style={{ animationDelay: `${i * 40}ms` }}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between card-hover anim-fade-up">
                        <div className="flex items-center gap-3">
                          <span className="text-xl transition-transform duration-150 group-hover:scale-110">{icon}</span>
                          <div>
                            <p className="text-sm text-gray-700 font-medium">{a.name}</p>
                            {a.size && <p className="text-xs text-gray-400">{(a.size / 1024).toFixed(0)} KB</p>}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const { data } = await supabase.storage.from("anexos").createSignedUrl(`${proyectoId}/${a.name}`, 60);
                            if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                          }}
                          className="text-xs text-emerald-600 hover:text-emerald-700 btn-press font-medium">
                          Abrir →
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        </div>{/* fin contenido según tab */}
      </div>{/* fin área principal */}

      {/* Modal editar partida */}
      {editandoPartida && (
        <EditarPartidaModal
          partida={editandoPartida}
          cfg={cfg}
          onGuardar={guardarPartidaEditada}
          onCerrar={() => setEditandoPartida(null)}
        />
      )}

      {/* Modal editar proyecto */}
      {editandoProyecto && (
        <EditarProyectoModal
          nombre={proyectoNombre}
          meta={proyectoMeta}
          onGuardar={guardarEdicionProyecto}
          onCerrar={() => setEditandoProyecto(false)}
        />
      )}
    </div>
  );
}

// Modal editar proyecto
// Factor zona = diferencial sobre precio base RM (flete + mercado local)
const REGIONES_EDIT = [
  { label: "Región Metropolitana", zona: 0.00 },
  { label: "Valparaíso",           zona: 0.04 },
  { label: "O'Higgins",            zona: 0.03 },
  { label: "Maule",                zona: 0.05 },
  { label: "Ñuble",                zona: 0.07 },
  { label: "Biobío",               zona: 0.06 },
  { label: "La Araucanía",         zona: 0.10 },
  { label: "Los Ríos",             zona: 0.12 },
  { label: "Coquimbo",             zona: 0.08 },
  { label: "Atacama",              zona: 0.12 },
  { label: "Antofagasta",          zona: 0.15 },
  { label: "Tarapacá",             zona: 0.18 },
  { label: "Arica y Parinacota",   zona: 0.22 },
  { label: "Los Lagos",            zona: 0.15 },
  { label: "Aysén",                zona: 0.28 },
  { label: "Magallanes",           zona: 0.30 },
];

function EditarProyectoModal({ nombre, meta, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    nombre:      nombre || "",
    region:      meta.region      || "",
    mandante:    meta.mandante    || "",
    direccion:   meta.direccion   || "",
    fechaInicio: meta.fechaInicio || "",
    fechaTermino:meta.fechaTermino|| "",
    responsable: meta.responsable || "",
    logoEmpresa: meta.logoEmpresa || "",
  });

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const dias = (() => {
    if (!form.fechaInicio || !form.fechaTermino) return null;
    const d = Math.round((new Date(form.fechaTermino) - new Date(form.fechaInicio)) / 86400000);
    return d > 0 ? d : null;
  })();

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setF("logoEmpresa", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleGuardar = () => {
    const regionInfo = REGIONES_EDIT.find(r => r.label === form.region);
    const nuevaMeta = {
      region:       form.region,
      mandante:     form.mandante,
      direccion:    form.direccion,
      fechaInicio:  form.fechaInicio,
      fechaTermino: form.fechaTermino,
      responsable:  form.responsable,
      logoEmpresa:  form.logoEmpresa,
      zona:         regionInfo ? regionInfo.zona : meta.zona ?? 0,
      diasCorridos: dias,
    };
    onGuardar(form.nombre, nuevaMeta);
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 anim-fade-in"
      style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.25)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto anim-scale-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-800">Editar proyecto</h3>
            <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 btn-press w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">✕</button>
          </div>
          <div className="space-y-3">
            {/* Logo empresa */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Logo empresa</label>
              <div className="flex items-center gap-3">
                {form.logoEmpresa
                  ? <img src={form.logoEmpresa} alt="logo" className="h-10 w-auto rounded border border-gray-200 object-contain bg-gray-50 px-1"/>
                  : <div className="h-10 w-16 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-xs">Logo</div>
                }
                <label className="cursor-pointer text-xs text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 btn-press">
                  {form.logoEmpresa ? "Cambiar" : "Subir imagen"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogo}/>
                </label>
                {form.logoEmpresa && (
                  <button onClick={() => setF("logoEmpresa", "")} className="text-xs text-red-400 hover:text-red-600 btn-press">Quitar</button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre del proyecto</label>
              <input value={form.nombre} onChange={e => setF("nombre", e.target.value)} className={inputCls + " input-focus"}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Mandante / Propietario</label>
              <input value={form.mandante} onChange={e => setF("mandante", e.target.value)} className={inputCls + " input-focus"} placeholder="Nombre del mandante"/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Dirección de la obra</label>
              <input value={form.direccion} onChange={e => setF("direccion", e.target.value)} className={inputCls + " input-focus"} placeholder="Ej: Av. Francisco Sampaio N°580, Porvenir"/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Región</label>
              <select value={form.region} onChange={e => setF("region", e.target.value)} className={inputCls + " bg-white input-focus"}>
                <option value="">Selecciona...</option>
                {REGIONES_EDIT.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha inicio</label>
                <input type="date" value={form.fechaInicio} onChange={e => setF("fechaInicio", e.target.value)} className={inputCls + " input-focus"}/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha término</label>
                <input type="date" value={form.fechaTermino} onChange={e => setF("fechaTermino", e.target.value)} className={inputCls + " input-focus"}/>
              </div>
            </div>
            {dias && (
              <p className="text-xs text-emerald-600 anim-fade-in bg-emerald-50 px-3 py-2 rounded-lg">
                Plazo: <strong>{dias} días corridos</strong>
              </p>
            )}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Persona a cargo</label>
              <input value={form.responsable} onChange={e => setF("responsable", e.target.value)} className={inputCls + " input-focus"} placeholder="Nombre del responsable"/>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onCerrar} className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm hover:bg-gray-50 btn-press">Cancelar</button>
            <button onClick={handleGuardar} disabled={!form.nombre.trim()}
              className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium btn-primary hover:bg-emerald-700 disabled:opacity-40">
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente selector de archivo y tipo
// ── Modal editar partida del proyecto ──────────────────────────────────────
const TIPOS_INSUMO = [
  { val: "mo",   label: "Mano de obra" },
  { val: "mat",  label: "Material" },
  { val: "fung", label: "Fungible" },
  { val: "tool", label: "Herramienta" },
];
const MO_KEYS = [
  { val: "m1",   label: "Maestro 1ª" },
  { val: "m2",   label: "Maestro 2ª" },
  { val: "ay",   label: "Ayudante" },
  { val: "inst", label: "Instalador" },
];

function EditarPartidaModal({ partida, cfg, onGuardar, onCerrar }) {
  const [desc, setDesc] = useState(partida.desc || partida.descripcion || "");
  const [unidad, setUnidad] = useState(partida.unidad || "");
  const [insumos, setInsumos] = useState(
    (partida.insumos || []).map((ins, i) => ({ ...ins, _key: i }))
  );
  // Si no tiene insumos, permitir override de precio directo
  const [precioOverride, setPrecioOverride] = useState(partida.precioOverride ?? partida.precio ?? "");

  const setIns = (key, campo, valor) =>
    setInsumos(prev => prev.map(x => x._key === key ? { ...x, [campo]: valor } : x));

  const agregarInsumo = () => {
    setInsumos(prev => [...prev, {
      _key: Date.now(),
      tipo: "mat", desc: "", un: "un", cant: 1, punit: 0, perd: 0,
    }]);
  };

  const eliminarInsumo = (key) => setInsumos(prev => prev.filter(x => x._key !== key));

  const handleGuardar = () => {
    const insumosLimpios = insumos.map(({ _key, ...rest }) => ({
      ...rest,
      cant: parseFloat(rest.cant) || 0,
      punit: parseFloat(rest.punit) || 0,
      perd: parseFloat(rest.perd) || 0,
      rend: rest.tipo === "mo" ? (parseFloat(rest.rend) || 0) : undefined,
    }));
    onGuardar({
      ...partida,
      desc,
      descripcion: desc,
      unidad,
      insumos: insumosLimpios,
      precioOverride: insumosLimpios.length === 0 ? (parseFloat(precioOverride) || 0) : undefined,
    });
  };

  const inputCls = "border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-400 w-full";

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 anim-fade-in"
      style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.35)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col anim-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-base font-bold text-gray-800">Editar partida</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 btn-press w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Descripción y unidad */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-4">
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block mb-1">Descripción</label>
              <input value={desc} onChange={e => setDesc(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block mb-1">Unidad</label>
              <input value={unidad} onChange={e => setUnidad(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>

          {/* Insumos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Insumos</span>
              <button onClick={agregarInsumo}
                className="text-xs px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 btn-press">
                + Agregar insumo
              </button>
            </div>

            {insumos.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 italic">Sin desglose de insumos. Puedes ingresar precio directo:</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Precio unitario ($):</span>
                  <input type="number" value={precioOverride} onChange={e => setPrecioOverride(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-36 focus:outline-none focus:border-emerald-400" />
                </div>
              </div>
            )}

            {insumos.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 uppercase tracking-wide">
                      <th className="px-3 py-2 text-left font-medium w-8"></th>
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="px-3 py-2 text-left font-medium min-w-[180px]">Descripción</th>
                      <th className="px-3 py-2 text-center font-medium">Un.</th>
                      <th className="px-3 py-2 text-right font-medium">Cantidad / Rend.</th>
                      <th className="px-3 py-2 text-right font-medium">Precio unit.</th>
                      <th className="px-3 py-2 text-right font-medium">Pérdida %</th>
                      <th className="px-3 py-2 text-center font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {insumos.map((ins) => (
                      <tr key={ins._key} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 text-center">
                          <span className={`w-2 h-2 rounded-full inline-block ${ins.tipo==="mo"?"bg-blue-400":ins.tipo==="mat"?"bg-amber-400":ins.tipo==="fung"?"bg-purple-400":"bg-gray-300"}`}/>
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={ins.tipo} onChange={e => setIns(ins._key, "tipo", e.target.value)}
                            className={inputCls + " w-28"}>
                            {TIPOS_INSUMO.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                          </select>
                          {ins.tipo === "mo" && (
                            <select value={ins.moKey || "m1"} onChange={e => setIns(ins._key, "moKey", e.target.value)}
                              className={inputCls + " w-24 mt-1"}>
                              {MO_KEYS.map(k => <option key={k.val} value={k.val}>{k.label}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={ins.desc || ""} onChange={e => setIns(ins._key, "desc", e.target.value)}
                            placeholder="Descripción..." className={inputCls} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={ins.un || ""} onChange={e => setIns(ins._key, "un", e.target.value)}
                            className={inputCls + " w-14 text-center"} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" step="any" min="0"
                            value={ins.tipo === "mo" ? (ins.rend ?? ins.cant ?? "") : (ins.cant ?? "")}
                            onChange={e => setIns(ins._key, ins.tipo === "mo" ? "rend" : "cant", e.target.value)}
                            className={inputCls + " w-20 text-right"} />
                        </td>
                        <td className="px-2 py-1.5">
                          {ins.tipo !== "mo" ? (
                            <input type="number" step="any" min="0" value={ins.punit ?? ""}
                              onChange={e => setIns(ins._key, "punit", e.target.value)}
                              className={inputCls + " w-24 text-right"} />
                          ) : (
                            <span className="text-gray-300 text-xs px-2">auto</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {ins.tipo === "mat" ? (
                            <input type="number" step="1" min="0" max="50" value={ins.perd ?? 0}
                              onChange={e => setIns(ins._key, "perd", e.target.value)}
                              className={inputCls + " w-16 text-right"} />
                          ) : (
                            <span className="text-gray-300 text-xs px-2">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button onClick={() => eliminarInsumo(ins._key)}
                            className="text-gray-300 hover:text-red-500 btn-press transition-colors">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Preview precio calculado */}
          {insumos.length > 0 && (() => {
            const preview = calcAPU({ ...partida, desc, unidad, insumos: insumos.map(({ _key, ...r }) => ({ ...r, cant: parseFloat(r.cant)||0, punit: parseFloat(r.punit)||0, perd: parseFloat(r.perd)||0, rend: parseFloat(r.rend)||0 })) }, cfg);
            return (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 flex items-center gap-6">
                <div><div className="text-[10px] text-emerald-600 uppercase tracking-wider">M.O. neto</div><div className="font-semibold text-gray-800">${Math.round(preview.moNet).toLocaleString("es-CL")}</div></div>
                <div><div className="text-[10px] text-emerald-600 uppercase tracking-wider">Materiales</div><div className="font-semibold text-gray-800">${Math.round(preview.mat).toLocaleString("es-CL")}</div></div>
                <div className="ml-auto"><div className="text-[10px] text-emerald-600 uppercase tracking-wider">Precio unitario estimado</div><div className="font-bold text-emerald-700 text-lg">${Math.round(preview.total).toLocaleString("es-CL")}</div></div>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button onClick={onCerrar} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 btn-press">Cancelar</button>
          <button onClick={handleGuardar} className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 btn-primary font-medium">Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}

function AnexoUploader({ onSubir, procesando, inputRef }) {
  const [tipo, setTipo] = useState("presupuesto");
  const [archivoNombre, setArchivoNombre] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const localRef = useRef(null);
  const ref = inputRef || localRef;

  const TIPOS = [
    { id: "presupuesto", label: "Presupuesto / Cubicación", desc: "Detecta partidas y cantidades" },
    { id: "especificacion", label: "Especificación técnica", desc: "Detecta partidas según los trabajos descritos" },
    { id: "plano", label: "Plano / AutoCAD", desc: "Se guarda como referencia sin procesar" },
  ];

  const [dragging, setDragging] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      {/* Selector tipo */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tipo de documento</p>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map(t => (
            <button key={t.id} onClick={() => setTipo(t.id)}
              className={`rounded-xl p-3 text-left border btn-press ${tipo === t.id ? "border-emerald-400 bg-emerald-50 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
              style={{ transition: "border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s cubic-bezier(0.16,1,0.3,1)" }}>
              <p className={`text-xs font-semibold ${tipo === t.id ? "text-emerald-700" : "text-gray-700"}`}>{t.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Zona drop */}
      <div
        onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) { setArchivo(f); setArchivoNombre(f.name); }
        }}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer dropzone ${dragging ? "dropzone-drag" : archivoNombre ? "border-emerald-300 bg-emerald-50" : "border-gray-200 hover:border-emerald-400"}`}>
        <p className={`text-2xl mb-2 transition-transform duration-150 ${dragging ? "scale-125" : "scale-100"}`}>📂</p>
        <p className="text-sm text-gray-600 font-medium">{archivoNombre || "Arrastra o haz clic para seleccionar"}</p>
        <p className="text-xs text-gray-400 mt-1">PDF, Excel (.xlsx), AutoCAD (.dwg, .dxf)</p>
        <input ref={ref} type="file" accept=".pdf,.xlsx,.xls,.dwg,.dxf" className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) { setArchivo(f); setArchivoNombre(f.name); }
          }}/>
      </div>

      <button
        onClick={() => { if (archivo) onSubir(archivo, tipo); }}
        disabled={!archivo || procesando}
        className="mt-4 w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium btn-primary hover:bg-emerald-700 disabled:opacity-40">
        {procesando ? "Procesando..." : tipo === "plano" ? "Subir archivo →" : "Subir y procesar con IA →"}
      </button>
    </div>
  );
}

// Componente para revisar y confirmar matches
function MatchesReview({ nombre, partidas, onConfirmar, onDescartar }) {
  const [seleccion, setSeleccion] = useState(() => new Set(partidas.map((_, i) => i)));

  const toggle = (i) => setSeleccion(s => {
    const n = new Set(s);
    n.has(i) ? n.delete(i) : n.add(i);
    return n;
  });

  return (
    <div className="mt-6 bg-white border border-emerald-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
        <div>
          <p className="font-semibold text-emerald-800 text-sm">Partidas detectadas en «{nombre}»</p>
          <p className="text-xs text-emerald-600 mt-0.5">{partidas.length} coincidencias — selecciona las que quieres agregar al proyecto</p>
        </div>
        <button onClick={onDescartar} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
      </div>

      <div className="divide-y divide-gray-100">
        {partidas.map((p, i) => (
          <div key={i}
            onClick={() => toggle(i)}
            className={`px-5 py-3 flex items-start gap-3 cursor-pointer transition-colors ${seleccion.has(i) ? "bg-emerald-50" : "hover:bg-gray-50"}`}>
            <div className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${seleccion.has(i) ? "bg-emerald-600 border-emerald-600" : "border-gray-300"}`}>
              {seleccion.has(i) && <span className="text-white text-[10px]">✓</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono text-gray-400">{p.codigo}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.similitud >= 80 ? "bg-emerald-100 text-emerald-700" : p.similitud >= 65 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                  {p.similitud}% similar
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-snug">{p.desc}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 italic">"{p.texto_original}"</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold text-gray-600">{p.cantidad ?? "—"}</p>
              <p className="text-[10px] text-gray-400">{p.unidad}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
        <button onClick={onDescartar} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Descartar</button>
        <button
          onClick={() => onConfirmar(partidas.filter((_, i) => seleccion.has(i)))}
          disabled={seleccion.size === 0}
          className="bg-emerald-600 text-white text-sm font-medium px-5 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-40">
          Agregar {seleccion.size} partida{seleccion.size !== 1 ? "s" : ""} al proyecto →
        </button>
      </div>
    </div>
  );
}

// ── CPM: algoritmo paso adelante/atrás ────────────────────────────────────
function computeCPM(items, predecessors, getDur) {
  if (!items.length) return {};
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  const succs = Object.fromEntries(items.map(i => [i.id, []]));
  items.forEach(i => (predecessors[i.id] || []).forEach(pid => { if (succs[pid]) succs[pid].push(i.id); }));

  // Kahn topological sort
  const inDeg = Object.fromEntries(items.map(i => [i.id, (predecessors[i.id] || []).filter(pid => byId[pid]).length]));
  const queue = items.filter(i => inDeg[i.id] === 0).map(i => i.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift(); order.push(id);
    succs[id].forEach(s => { if (--inDeg[s] === 0) queue.push(s); });
  }
  const finalOrder = order.length === items.length ? order : items.map(i => i.id); // fallback si hay ciclo

  // Paso adelante: ES / EF
  const ES = {}, EF = {};
  finalOrder.forEach(id => {
    const preds = (predecessors[id] || []).filter(pid => byId[pid]);
    ES[id] = preds.length ? Math.max(...preds.map(pid => EF[pid] ?? 0)) : 0;
    EF[id] = ES[id] + getDur(byId[id]);
  });

  const durTotal = Math.max(...Object.values(EF));

  // Paso atrás: LF / LS
  const LF = {}, LS = {};
  [...finalOrder].reverse().forEach(id => {
    const s = succs[id].filter(sid => byId[sid]);
    LF[id] = s.length ? Math.min(...s.map(sid => LS[sid] ?? durTotal)) : durTotal;
    LS[id] = LF[id] - getDur(byId[id]);
  });

  // Float y ruta crítica
  const result = {};
  finalOrder.forEach(id => {
    const float = Math.round((LS[id] - ES[id]) * 10) / 10;
    result[id] = { es: ES[id], ef: EF[id], ls: LS[id], lf: LF[id], float, critical: float < 0.5 };
  });
  return result;
}

// ── Reglas constructivas chilenas para auto-sugerir dependencias ───────────
function sugerirPorReglas(itemsConFase) {
  const deps = Object.fromEntries(itemsConFase.map(i => [i.id, []]));

  // Agrupa por fase
  const porFase = {};
  itemsConFase.forEach(i => { (porFase[i.fase] = porFase[i.fase] || []).push(i); });
  const fases = Object.keys(porFase).map(Number).sort((a, b) => a - b);

  // Entre fases consecutivas: items de fase N+1 dependen del item más largo de fase N (gate)
  for (let i = 1; i < fases.length; i++) {
    const prev = porFase[fases[i - 1]];
    const gate = prev.reduce((m, x) => (x.duracionCalc || 1) >= (m.duracionCalc || 1) ? x : m);
    porFase[fases[i]].forEach(curr => { deps[curr.id] = [gate.id]; });
  }

  // Reglas específicas por prefijo de código ONDAC (sucesor depende de predecesor)
  const REGLAS = [
    ["RE","I"],["RE","IA"],["RE","IB"],["RE","S"],  // estructuras → cubierta/escaleras
    ["RC","RD"],                                       // sub-bases → pavimentos viales
    ["PA","GA"],["PB","GA"],["PC","GA"],["PD","GA"],  // instalaciones rough → muros
    ["KA","GA"],["KB","GA"],                           // marcos puertas/ventanas → revestimientos
    ["GA","FA"],["GB","FA"],["HA","FA"],               // revest. muros/cielos/pisos → pintura
    ["FA","W"],["FA","PE"],["FA","PF"],["FA","N"],     // pintura → equipamiento/quincallería
    ["RD","HA"],["RD","HC"],                           // pavimentos exteriores → pisos interiores
  ];

  itemsConFase.forEach(curr => {
    const cc = (curr.familia || curr.codigo || "").toUpperCase();
    itemsConFase.forEach(prev => {
      if (prev.id === curr.id) return;
      const pc = (prev.familia || prev.codigo || "").toUpperCase();
      if (REGLAS.some(([p, s]) => pc.startsWith(p) && cc.startsWith(s))) {
        if (!deps[curr.id].includes(prev.id)) deps[curr.id].push(prev.id);
      }
    });
  });

  return deps;
}

// ── Carta Gantt ────────────────────────────────────────────────────────────
function GanttView({ proyecto, cfg, proyectoNombre, proyectoMeta, onGoTo }) {
  const [duraciones, setDuraciones]   = useState({});
  const [predecessors, setPredecessors] = useState({});   // { [id]: [id, …] }
  const [modoEdicion, setModoEdicion]   = useState(false);
  const [popover, setPopover]           = useState(null);  // { id, x, y }
  const [cargandoIA, setCargandoIA]     = useState(false);
  const [msgSugerencia, setMsgSugerencia] = useState(null); // feedback string

  function calcDuracionAuto(apu, cantidad, cfgLocal) {
    const { moNet } = calcAPU(apu, cfgLocal);
    const totalMO = moNet * cantidad;
    if (totalMO === 0) return 2;
    const jornal = cfgLocal.mo_m1 * 8 * 2;
    return Math.max(1, Math.min(Math.ceil(totalMO / jornal), 90));
  }

  const getDur = (item) => duraciones[item.id] ?? calcDuracionAuto(item, item.cantidad, cfg);

  // Items con fase + posición secuencial (fallback sin CPM)
  const items = useMemo(() => {
    if (!proyecto.length) return [];
    const withFase = proyecto.map(p => ({ ...p, fase: getFase(p) }));
    const porFase = {};
    withFase.forEach(p => { (porFase[p.fase] = porFase[p.fase] || []).push(p); });
    let diaActual = 0;
    const result = [];
    Object.keys(porFase).map(Number).sort((a,b)=>a-b).forEach(fase => {
      let maxDur = 0;
      porFase[fase].forEach(p => {
        const dur = duraciones[p.id] ?? calcDuracionAuto(p, p.cantidad, cfg);
        result.push({ ...p, fase, inicioCalc: diaActual, duracionCalc: dur });
        maxDur = Math.max(maxDur, dur);
      });
      diaActual += maxDur;
    });
    return result;
  }, [proyecto, cfg, duraciones]);

  // CPM: sólo se activa cuando hay dependencias definidas
  const hasDeps = useMemo(() => Object.values(predecessors).some(p => p.length > 0), [predecessors]);

  const cpm = useMemo(() => {
    if (!hasDeps || !items.length) return {};
    return computeCPM(items, predecessors, getDur);
  }, [items, predecessors, hasDeps, duraciones]);

  // Posición efectiva de cada barra
  const getPos   = (item) => hasDeps ? (cpm[item.id]?.es    ?? item.inicioCalc)               : item.inicioCalc;
  const getFloat = (item) => hasDeps ? (cpm[item.id]?.float ?? 0)                              : 0;
  const getCrit  = (item) => hasDeps && (cpm[item.id]?.critical ?? false);

  const totalDias = useMemo(() => {
    if (!items.length) return 30;
    return hasDeps && Object.keys(cpm).length
      ? Math.max(...items.map(i => cpm[i.id]?.ef ?? (i.inicioCalc + getDur(i))))
      : Math.max(...items.map(i => i.inicioCalc + getDur(i)));
  }, [items, cpm, hasDeps, duraciones]);

  // Sugerir dependencias por reglas (instantáneo, sin API)
  const sugerirReglas = () => {
    const deps = sugerirPorReglas(items);
    setPredecessors(deps);
    setMsgSugerencia("✓ Dependencias sugeridas por reglas constructivas chilenas");
    setTimeout(() => setMsgSugerencia(null), 4000);
  };

  // Sugerir dependencias con IA (llama a /api/sugerir-dependencias)
  const sugerirIA = async () => {
    setCargandoIA(true);
    setMsgSugerencia(null);
    try {
      const res = await fetch("/api/sugerir-dependencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partidas: items.map(i => ({ id: i.id, codigo: i.codigo, familia: i.familia, desc: i.desc, descripcion: i.descripcion })) }),
      });
      const data = await res.json();
      if (data.error || data.source === "no_key") {
        // API no disponible: usar reglas locales como fallback
        sugerirReglas();
        setMsgSugerencia("⚠️ Sin créditos API — se aplicaron reglas constructivas locales");
      } else {
        // Merge: IA + reglas base
        const reglas = sugerirPorReglas(items);
        const merged = {};
        items.forEach(i => {
          const ia   = data.predecessors[i.id] || [];
          const base = reglas[i.id] || [];
          const union = [...new Set([...ia, ...base])].filter(pid => items.some(x => x.id === pid));
          merged[i.id] = union;
        });
        setPredecessors(merged);
        setMsgSugerencia("✨ Dependencias mejoradas con IA + reglas constructivas");
      }
    } catch { sugerirReglas(); }
    setCargandoIA(false);
    setTimeout(() => setMsgSugerencia(null), 5000);
  };

  const limpiarDeps = () => { setPredecessors({}); setMsgSugerencia("Dependencias eliminadas"); setTimeout(() => setMsgSugerencia(null), 2000); };

  const fechaBase = useMemo(() => {
    if (proyectoMeta?.fechaInicio) return new Date(proyectoMeta.fechaInicio + "T00:00:00");
    return new Date();
  }, [proyectoMeta]);

  const semanas = useMemo(() => {
    const s = [];
    const total = Math.ceil(totalDias / 7) + 2;
    for (let i = 0; i < total; i++) {
      const d = new Date(fechaBase);
      d.setDate(d.getDate() + i * 7);
      s.push({
        dia: i * 7,
        label: d.toLocaleDateString("es-CL", { day:"2-digit", month:"short" }),
      });
    }
    return s;
  }, [totalDias, fechaBase]);

  const PX = totalDias > 150 ? 5 : totalDias > 90 ? 8 : totalDias > 45 ? 12 : 16;
  const TW = Math.max(totalDias * PX + 80, 500);

  const fasesUsadas = useMemo(() => [...new Set(items.map(i => i.fase))].sort((a,b)=>a-b), [items]);

  const exportarGanttPDF = async () => {
    if (!items.length) return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();   // 297mm
    const H = doc.internal.pageSize.getHeight();  // 210mm

    // Header
    doc.setFillColor(6, 95, 70);
    doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont("helvetica","bold");
    doc.text("APUchile · Carta Gantt", 10, 10);
    doc.setFontSize(9); doc.setFont("helvetica","normal");
    doc.text(proyectoNombre, 10, 17);
    doc.setFontSize(8);
    doc.text(`Duración estimada: ${totalDias} días corridos`, W - 10, 10, { align:"right" });
    const fechaStr = fechaBase.toLocaleDateString("es-CL", { day:"2-digit", month:"long", year:"numeric" });
    doc.text(`Inicio: ${fechaStr}`, W - 10, 17, { align:"right" });

    // Layout
    const LEFT = 75;    // ancho columna nombre
    const BAR_AREA = W - LEFT - 10;  // ancho zona timeline
    const ROW_H = 7;
    const HEADER_Y = 28;
    const START_Y = HEADER_Y + 7;

    // Fases legend
    let lx = 10;
    doc.setFontSize(6.5);
    fasesUsadas.forEach(f => {
      const info = FASES_INFO[f];
      if (!info) return;
      const rgb = hexToRgb(info.color);
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(lx, 23.5, 3, 3, "F");
      doc.setTextColor(60, 60, 60);
      doc.text(info.label, lx + 4, 26.3);
      lx += 4 + doc.getTextWidth(info.label) + 4;
    });

    // Column headers
    doc.setFillColor(245, 247, 250);
    doc.rect(0, HEADER_Y, W, 7, "F");
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(6.5); doc.setFont("helvetica","bold");
    doc.text("Partida", 3, HEADER_Y + 4.5);
    doc.text("Días", LEFT - 10, HEADER_Y + 4.5, { align:"right" });

    // Week headers in timeline
    const pxPerDia = BAR_AREA / totalDias;
    semanas.forEach(s => {
      const x = LEFT + s.dia * pxPerDia;
      if (x > W - 5) return;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(x, HEADER_Y, x, H - 10);
      doc.setTextColor(140, 140, 140);
      doc.setFontSize(5.5); doc.setFont("helvetica","normal");
      doc.text(s.label, x + 1, HEADER_Y + 4.5);
    });

    // Leyenda ruta crítica si aplica
    if (hasDeps) {
      const rgbCrit = hexToRgb("#ef4444");
      doc.setFillColor(rgbCrit.r, rgbCrit.g, rgbCrit.b);
      doc.rect(lx, 23.5, 3, 3, "F");
      doc.setTextColor(60, 60, 60);
      doc.text("Ruta crítica", lx + 4, 26.3);
    }

    // Rows
    items.forEach((item, idx) => {
      const y = START_Y + idx * ROW_H;
      if (y + ROW_H > H - 12) return;

      const crit     = getCrit(item);
      const esDay    = getPos(item);
      const durDay   = getDur(item);
      const floatDay = getFloat(item);

      if (idx % 2 === 0) { doc.setFillColor(252,252,252); doc.rect(0, y, W, ROW_H, "F"); }
      // Critical row highlight
      if (crit) { doc.setFillColor(255,245,245); doc.rect(0, y, W, ROW_H, "F"); }

      const desc = (item.desc || item.descripcion || "").substring(0, 38);
      doc.setTextColor(crit ? 180 : 50, 50, 50);
      doc.setFontSize(6); doc.setFont("helvetica", crit ? "bold" : "normal");
      doc.text(`${item.codigo}  ${desc}`, 3, y + ROW_H * 0.65);

      doc.setTextColor(100,100,100); doc.setFont("helvetica","normal");
      doc.text(String(durDay), LEFT - 3, y + ROW_H * 0.65, { align:"right" });

      // Float bar (dashed look using thin rect)
      if (floatDay > 0) {
        const fx = LEFT + (esDay + durDay) * pxPerDia;
        const fw = Math.max(floatDay * pxPerDia - 1, 1);
        const info = FASES_INFO[item.fase];
        const rgb = hexToRgb(info?.color || "#10b981");
        doc.setFillColor(rgb.r, rgb.g, rgb.b, 0.2);
        doc.setDrawColor(rgb.r, rgb.g, rgb.b);
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([1, 1], 0);
        doc.rect(fx, y + 2, fw, ROW_H - 4, "S");
        doc.setLineDashPattern([], 0);
      }

      // Main bar
      const barX = LEFT + esDay * pxPerDia;
      const barW = Math.max(durDay * pxPerDia - 1, 2);
      const info = FASES_INFO[item.fase];
      const rgb = crit ? hexToRgb("#ef4444") : hexToRgb(info?.color || "#10b981");
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.roundedRect(barX, y + 1.5, barW, ROW_H - 3, 0.8, 0.8, "F");

      if (barW > 20) {
        doc.setTextColor(255,255,255); doc.setFontSize(5);
        doc.text(desc.substring(0, Math.floor(barW / 2)), barX + 1.5, y + ROW_H * 0.65);
      }
    });

    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(0, H - 8, W, H - 8);
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(6.5); doc.setFont("helvetica","normal");
    doc.text("Generado por APUchile · apuchile.vercel.app · Duración estimada, sujeta a ajuste por el proyectista", 10, H - 4);

    doc.save(`${proyectoNombre.replace(/\s+/g,"_")}_gantt.pdf`);
  };

  if (!proyecto.length) {
    return (
      <div className="flex-1 flex items-center justify-center anim-fade-in">
        <div className="text-center text-gray-400">
          <p className="text-5xl mb-4">📅</p>
          <p className="text-base font-medium text-gray-500 mb-2">No hay partidas en el proyecto</p>
          <button onClick={() => onGoTo("biblioteca")} className="text-emerald-600 text-sm underline btn-press">Ir a la biblioteca ONDAC</button>
        </div>
      </div>
    );
  }

  const critCount = items.filter(i => getCrit(i)).length;

  return (
    <div className="flex-1 overflow-hidden flex flex-col anim-fade-up">

      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-gray-200 bg-white flex items-center gap-3 shrink-0 flex-wrap">
        <div className="shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">Carta Gantt</h2>
          <p className="text-xs text-gray-400">
            {items.length} partidas ·{" "}
            <strong className={hasDeps ? "text-emerald-600" : "text-gray-600"}>{totalDias}d</strong>
            {hasDeps && critCount > 0 && (
              <span className="ml-2 text-red-500 font-medium">· {critCount} en ruta crítica</span>
            )}
          </p>
        </div>

        {/* Leyenda fases */}
        <div className="hidden xl:flex items-center gap-2 flex-wrap flex-1 justify-center">
          {fasesUsadas.map(f => {
            const info = FASES_INFO[f];
            if (!info) return null;
            return (
              <span key={f} className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: info.color }}/>
                {info.label}
              </span>
            );
          })}
          {hasDeps && (
            <>
              <span className="flex items-center gap-1 text-[10px] text-red-500 font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0"/>Ruta crítica
              </span>
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <span className="w-6 h-2.5 rounded-sm shrink-0" style={{ background: "repeating-linear-gradient(90deg,#d1d5db 0,#d1d5db 3px,transparent 3px,transparent 6px)" }}/>Float
              </span>
            </>
          )}
        </div>

        {/* Acciones dependencias */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {hasDeps && (
            <button onClick={limpiarDeps}
              className="text-[11px] text-gray-400 hover:text-red-500 btn-press px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              ✕ Limpiar
            </button>
          )}
          <button onClick={() => setModoEdicion(m => !m)}
            className={`text-[11px] px-3 py-1.5 rounded-lg border btn-press transition-colors ${modoEdicion ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {modoEdicion ? "✓ Editando deps" : "Editar deps"}
          </button>
          <button onClick={sugerirReglas}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 btn-press transition-colors">
            ⚡ Sugerir reglas
          </button>
          <button onClick={sugerirIA} disabled={cargandoIA}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-violet-600 text-white btn-primary hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5">
            {cargandoIA ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> : "✨"}
            {cargandoIA ? "Analizando..." : "Mejorar con IA"}
          </button>
          <button onClick={exportarGanttPDF}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-emerald-600 text-white btn-primary hover:bg-emerald-700 flex items-center gap-1.5">
            📄 PDF
          </button>
        </div>
      </div>

      {/* Mensaje feedback */}
      {msgSugerencia && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-700 anim-slide-down font-medium">
          {msgSugerencia}
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 overflow-auto">
        <div className="flex" style={{ minWidth: LEFT_W + (modoEdicion ? DEPS_W : 0) + DUR_W + TW }}>

          {/* Col: nombre */}
          <div className="shrink-0 border-r border-gray-200 bg-white" style={{ width: LEFT_W, position:"sticky", left:0, zIndex:20 }}>
            <div className="h-10 border-b border-gray-200 px-3 flex items-center bg-gray-50">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Partida</span>
            </div>
            {items.map((item, idx) => {
              const crit = getCrit(item);
              return (
                <div key={item.id}
                  className={`border-b border-gray-100 px-3 flex items-center gap-2 ${idx%2===0?"bg-white":"bg-gray-50/40"} ${crit?"border-l-2 border-l-red-400":""}`}
                  style={{ height: ROW_PX }}>
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: crit ? "#ef4444" : (FASES_INFO[item.fase]?.color || "#10b981") }}/>
                  <div className="min-w-0">
                    <div className="text-[9px] font-mono text-gray-400 leading-none">{item.codigo}</div>
                    <div className="text-[11px] text-gray-700 truncate leading-tight">{item.desc || item.descripcion}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Col: predecesoras (solo en modo edición) */}
          {modoEdicion && (
            <div className="shrink-0 border-r border-gray-200 bg-white" style={{ width: DEPS_W, position:"sticky", left: LEFT_W, zIndex:20 }}>
              <div className="h-10 border-b border-gray-200 px-2 flex items-center bg-violet-50">
                <span className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider">Predecesoras</span>
              </div>
              {items.map((item, idx) => {
                const preds = (predecessors[item.id] || []).map(pid => items.find(x => x.id === pid)).filter(Boolean);
                return (
                  <div key={item.id}
                    className={`border-b border-gray-100 px-2 flex items-center gap-1 flex-wrap ${idx%2===0?"bg-white":"bg-gray-50/40"}`}
                    style={{ height: ROW_PX, minHeight: ROW_PX }}>
                    {preds.map(pred => (
                      <span key={pred.id}
                        className="flex items-center gap-0.5 text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-mono leading-none">
                        {pred.codigo}
                        <button onClick={() => setPredecessors(p => ({ ...p, [item.id]: (p[item.id]||[]).filter(id => id !== pred.id) }))}
                          className="ml-0.5 text-violet-400 hover:text-red-500 leading-none">×</button>
                      </span>
                    ))}
                    <button
                      onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setPopover(popover?.id === item.id ? null : { id: item.id, x: rect.left, y: rect.bottom + 4 });
                      }}
                      className="w-5 h-5 rounded-full bg-gray-100 hover:bg-violet-100 text-gray-500 hover:text-violet-600 text-[11px] flex items-center justify-center btn-press shrink-0">
                      +
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Col: duración */}
          <div className="shrink-0 border-r border-gray-200 bg-white"
            style={{ width: DUR_W, position:"sticky", left: LEFT_W + (modoEdicion ? DEPS_W : 0), zIndex:20 }}>
            <div className="h-10 border-b border-gray-200 flex items-center justify-center bg-gray-50">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Días</span>
            </div>
            {items.map((item, idx) => (
              <div key={item.id}
                className={`border-b border-gray-100 flex items-center justify-center ${idx%2===0?"bg-white":"bg-gray-50/40"}`}
                style={{ height: ROW_PX }}>
                <input type="number" min={1} max={365} value={getDur(item)}
                  onChange={e => setDuraciones(d => ({ ...d, [item.id]: Math.max(1, parseInt(e.target.value)||1) }))}
                  className="w-11 text-center text-xs py-1 rounded-lg border border-gray-200 input-focus focus:outline-none focus:border-emerald-400"/>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="relative" style={{ width: TW }}>
            {/* Semana headers */}
            <div className="h-10 border-b border-gray-200 bg-white relative" style={{ width: TW, position:"sticky", top:0, zIndex:10 }}>
              {semanas.map((s,i) => (
                <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: s.dia * PX }}/>
              ))}
              {semanas.map((s,i) => (
                <span key={`l${i}`} className="absolute bottom-1.5 text-[9px] text-gray-400 pl-1" style={{ left: s.dia * PX }}>{s.label}</span>
              ))}
            </div>

            {/* Filas */}
            {items.map((item, idx) => {
              const crit    = getCrit(item);
              const barLeft = getPos(item) * PX + 2;
              const barW    = Math.max(getDur(item) * PX - 4, 6);
              const floatW  = Math.max(getFloat(item) * PX - 2, 0);
              const barColor = crit ? "#ef4444" : (FASES_INFO[item.fase]?.color || "#10b981");
              return (
                <div key={item.id}
                  className={`border-b border-gray-100 relative ${idx%2===0?"bg-white":"bg-gray-50/30"}`}
                  style={{ height: ROW_PX, width: TW }}>
                  {semanas.map((s,i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: s.dia*PX }}/>
                  ))}
                  {/* Float (dashed, detrás de la barra) */}
                  {floatW > 0 && (
                    <div className="absolute rounded-md"
                      style={{
                        left: barLeft + barW,
                        top: 8, bottom: 8,
                        width: floatW,
                        background: `repeating-linear-gradient(90deg,${barColor}40 0,${barColor}40 4px,transparent 4px,transparent 8px)`,
                        borderRadius: "0 4px 4px 0",
                        transition: "width 0.3s cubic-bezier(0.16,1,0.3,1), left 0.3s cubic-bezier(0.16,1,0.3,1)",
                      }}/>
                  )}
                  {/* Barra principal */}
                  <div className="absolute rounded-md flex items-center overflow-hidden"
                    style={{
                      left: barLeft, top: 6, bottom: 6, width: barW,
                      background: barColor,
                      opacity: crit ? 1 : 0.82,
                      boxShadow: crit ? `0 0 0 1px ${barColor}60` : "none",
                      transition: "width 0.35s cubic-bezier(0.16,1,0.3,1), left 0.35s cubic-bezier(0.16,1,0.3,1)",
                    }}>
                    {barW > 50 && (
                      <span className="text-white text-[9px] font-medium px-2 truncate leading-none select-none">
                        {(item.desc || item.descripcion || "").substring(0, Math.floor(barW / 7))}
                      </span>
                    )}
                  </div>
                  {/* Float badge */}
                  {hasDeps && floatW === 0 && crit && barW > 24 && (
                    <div className="absolute flex items-center" style={{ left: barLeft + 4, top: 8, bottom: 8 }}>
                      <span className="text-[8px] text-white font-bold opacity-70 leading-none">★</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Popover selección predecesoras */}
      {popover && (
        <div className="fixed inset-0 z-50" onClick={() => setPopover(null)}>
          <div className="absolute bg-white border border-gray-200 rounded-xl shadow-2xl p-3 w-72 z-50 anim-scale-in"
            style={{ top: Math.min(popover.y, window.innerHeight - 280), left: Math.min(popover.x, window.innerWidth - 290) }}
            onClick={e => e.stopPropagation()}>
            <p className="text-xs font-semibold text-gray-600 mb-2">Selecciona predecesoras de <span className="text-violet-600">{items.find(i=>i.id===popover.id)?.codigo}</span></p>
            <div className="space-y-0.5 max-h-52 overflow-y-auto">
              {items.filter(i => i.id !== popover.id).map(item => {
                const checked = (predecessors[popover.id] || []).includes(item.id);
                return (
                  <label key={item.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg">
                    <input type="checkbox" checked={checked}
                      onChange={e => setPredecessors(p => ({
                        ...p,
                        [popover.id]: e.target.checked
                          ? [...(p[popover.id]||[]), item.id]
                          : (p[popover.id]||[]).filter(id => id !== item.id)
                      }))}
                      className="rounded accent-violet-600"/>
                    <span className="font-mono text-[10px] text-gray-400 shrink-0">{item.codigo}</span>
                    <span className="text-gray-600 truncate">{(item.desc||item.descripcion||"").substring(0,32)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer fases */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 flex items-center gap-5 shrink-0 overflow-x-auto">
        {fasesUsadas.map(f => {
          const info = FASES_INFO[f];
          const itemsFase = items.filter(i => i.fase === f);
          const inicio = hasDeps
            ? Math.min(...itemsFase.map(i => cpm[i.id]?.es ?? i.inicioCalc))
            : Math.min(...itemsFase.map(i => i.inicioCalc));
          const fin = hasDeps
            ? Math.max(...itemsFase.map(i => cpm[i.id]?.ef ?? (i.inicioCalc + getDur(i))))
            : Math.max(...itemsFase.map(i => i.inicioCalc + getDur(i)));
          const critFase = itemsFase.some(i => getCrit(i));
          return (
            <div key={f} className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: critFase ? "#ef4444" : info?.color }}/>
              <div>
                <p className="text-[10px] font-semibold text-gray-600">{info?.label}{critFase && <span className="ml-1 text-red-400">★</span>}</p>
                <p className="text-[9px] text-gray-400">{itemsFase.length} partidas · {fin-inicio}d · día {inicio+1}→{fin}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const LEFT_W = 260;
const DEPS_W = 160;
const DUR_W  = 64;
const ROW_PX = 40;

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return { r, g, b };
}

// ── Textos fijos EE.TT. chilenas (extraídos de documentos reales CFT Magallanes) ──
const EETT_GENERALIDADES = `Las presentes especificaciones técnicas son de carácter general. Se consideran mínimas y tienen por objeto complementar los planos de arquitectura y de detalles.

La obra considera la reposición, modificación, instalación, etc., de elementos. Todos los materiales deberán cumplir con las exigencias fijadas por las normas INN, leyes, ordenanzas o reglamentos vigentes y deberán cumplir con las instrucciones dadas por los fabricantes de los elementos que se especifican. Todos los procesos constructivos deberán cumplir las Normas chilenas.

Ante cualquier discrepancia entre los planos, especificaciones, aclaraciones u otro documento que componga el legajo de antecedentes para la construcción se deberá consultar mediante libro de obras. Los planos de arquitectura, instalaciones, especificaciones técnicas y demás documentos que componen la carpeta técnica de obra, se complementan entre sí de modo que las partidas, materiales o especificaciones de obras pueden estar incluidas indistintamente en cualquiera de ellos.

Los planos y especificaciones deberán estar permanentemente en obra y los planos plastificados para evitar deterioro y deformaciones.

Todos los materiales deberán ser nuevos y de primera calidad. Los materiales indicados en las especificaciones técnicas podrán ser modificados a solicitud del contratista con el consentimiento del arquitecto y la autorización de la Inspección Técnica de la Obra.

El material de demolición y todo material con características de escombros deberá ser llevado fuera del recinto de la obra a botadero autorizado, debiendo archivarse los documentos que acrediten dicha faena.

Se da cumplimiento a las normas de impacto de ruido y polvo de acuerdo con el Art. 5.8.3 de la OGUC.`;

const EETT_ORDEN_PRELACION = `Los planos de arquitectura, ingeniería estructural, instalaciones, especificaciones técnicas, etc., se complementan entre sí, en forma tal, que las partidas, obras y materiales, puedan estar indistintamente expresadas en cualquiera de ello. Cualquier mención de las especificaciones que no se incluyan en los planos, o que haya sido contemplada en los planos y omitida en las especificaciones, se considera incluida en ambos y es parte integrante del contrato.

En caso de discordancia entre los planos de Arquitectura, Cálculo e Instalaciones, ninguno tendrá preferencia y se deberá consultar a la Unidad Técnica la duda antes de la ejecución de la obra. En general, los planos de detalle priman sobre los planos generales y las cotas prevalecen sobre el dibujo de los planos. No se debe medir a escala en los planos.`;

// ── EE.TT. View ────────────────────────────────────────────────────────────
function EETTView({ proyecto, proyectoNombre, proyectoMeta }) {
  const [expandidos, setExpandidos] = useState({});
  const [exportando, setExportando] = useState(false);
  const [mejorando, setMejorando] = useState(false);
  const [msgMejora, setMsgMejora] = useState(null);
  const [templatesExtra, setTemplatesExtra] = useState({});

  const templates = useMemo(() => getTemplatesParaProyecto(proyecto), [proyecto]);

  // Campos del proyecto
  const logo       = proyectoMeta?.logoEmpresa || null;
  const mandante   = proyectoMeta?.mandante    || "";
  const direccion  = proyectoMeta?.direccion   || "";
  const fechaDoc   = (() => {
    if (proyectoMeta?.fechaInicio)
      return new Date(proyectoMeta.fechaInicio).toLocaleDateString("es-CL", { month:"long", year:"numeric" });
    return new Date().toLocaleDateString("es-CL", { month:"long", year:"numeric" });
  })();
  const plazo = proyectoMeta?.diasCorridos ? `${proyectoMeta.diasCorridos} días corridos` : "";

  const toggle = (key) => setExpandidos(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Merge custom IA improvements with base templates ──────────────────────
  const getSeccion = (codigo, seccion) =>
    templatesExtra[codigo]?.[seccion] ?? templates.find(t => t.codigo === codigo)?.data?.secciones?.[seccion] ?? "";

  // ── Export PDF ────────────────────────────────────────────────────────────
  async function exportarPDF() {
    setExportando(true);
    try {
      const jsPDFModule = await import("jspdf");
      const { jsPDF } = jsPDFModule;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const PW = 210, PH = 297;
      const ML = 25, MR = 25, MT = 25, MB = 20;
      const CW = PW - ML - MR;
      let y = MT;

      const checkPage = (h) => {
        if (y + h > PH - MB - 10) { doc.addPage(); y = MT; }
      };

      // ── PAGE 1: Portada ──────────────────────────────────────────────────
      // Logo empresa (top left)
      if (logo) {
        try {
          const imgFmt = logo.startsWith("data:image/png") ? "PNG" : "JPEG";
          doc.addImage(logo, imgFmt, ML, y, 40, 20);
          y += 26;
        } catch { /* logo inválido, omitir */ }
      }

      // Título
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(20, 20, 20);
      doc.text("ESPECIFICACIONES TÉCNICAS", ML, y);
      y += 7;
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.6);
      doc.line(ML, y, PW - MR, y);
      y += 10;

      // Nombre proyecto (destacado)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(20, 20, 20);
      const nombreLines = doc.splitTextToSize(proyectoNombre || "Proyecto", CW);
      nombreLines.forEach(line => { doc.text(line, ML, y); y += 7; });
      y += 8;

      // Tabla portada
      const tableRows = [
        ["PROYECTO",    proyectoNombre || "—"],
        ["PROPIETARIO", mandante       || "—"],
        ["DIRECCIÓN",   direccion      || "—"],
        ["FECHA",       fechaDoc       || "—"],
      ];
      const col1W = 42;
      const rowH  = 9;
      tableRows.forEach(([lbl, val], i) => {
        if (i % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(ML, y - 6, CW, rowH, "F");
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(lbl, ML + 2, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(20, 20, 20);
        const valLines = doc.splitTextToSize(String(val), CW - col1W - 4);
        doc.text(valLines[0] || "", ML + col1W, y);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(ML, y + rowH - 6, ML + CW, y + rowH - 6);
        y += rowH;
      });

      y += 8;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      const fechaGen = new Date().toLocaleDateString("es-CL", { day:"2-digit", month:"long", year:"numeric" });
      doc.text(`Generado por APUchile · ${fechaGen}`, ML, y);

      // ── PAGE 2: Generalidades + Orden de Prelación ──────────────────────
      doc.addPage();
      y = MT;

      const printSection = (titulo, texto) => {
        checkPage(20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(20, 20, 20);
        doc.text(titulo, ML, y);
        y += 5;
        doc.setDrawColor(80, 80, 80);
        doc.setLineWidth(0.4);
        doc.line(ML, y, PW - MR, y);
        y += 7;
        texto.split("\n\n").filter(Boolean).forEach(p => {
          const lines = doc.splitTextToSize(p.trim(), CW);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(40, 40, 40);
          lines.forEach(line => { checkPage(5.5); doc.text(line, ML, y); y += 5.5; });
          y += 3;
        });
        y += 6;
      };

      printSection("I.  GENERALIDADES",       EETT_GENERALIDADES);
      printSection("II.  ORDEN DE PRELACIÓN", EETT_ORDEN_PRELACION);

      // ── Capítulos ────────────────────────────────────────────────────────
      const PDF_SECCIONES = [
        { key: "descripcion",   label: "1.  DESCRIPCIÓN" },
        { key: "materiales",    label: "2.  MATERIALES Y EQUIPOS" },
        { key: "ejecucion",     label: "3.  EJECUCIÓN" },
        { key: "medicion_pago", label: "4.  MEDICIÓN Y PAGO" },
      ];

      templates.forEach(({ codigo, capitulo, data }) => {
        doc.addPage();
        y = MT;

        // Encabezado capítulo
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(20, 20, 20);
        doc.text(`${capitulo}.  ${data.titulo.toUpperCase()}`, ML, y);
        y += 5;
        doc.setDrawColor(80, 80, 80);
        doc.setLineWidth(0.5);
        doc.line(ML, y, PW - MR, y);
        y += 8;

        // Normas
        if (data.normas?.length) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text("Normas aplicables: " + data.normas.join(" · "), ML, y);
          y += 7;
        }

        // Secciones
        PDF_SECCIONES.forEach(({ key, label }) => {
          const texto = getSeccion(codigo, key);
          if (!texto) return;
          checkPage(14);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(40, 40, 40);
          doc.text(label, ML, y);
          y += 4;
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.2);
          doc.line(ML, y, PW - MR, y);
          y += 5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(50, 50, 50);
          const lines = doc.splitTextToSize(texto, CW);
          lines.forEach(line => { checkPage(5.5); doc.text(line, ML, y); y += 5.5; });
          y += 5;
        });
      });

      // ── Pie de página en todas ────────────────────────────────────────────
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.3);
        doc.line(ML, PH - 14, PW - MR, PH - 14);
        doc.text(proyectoNombre || "", ML, PH - 9);
        doc.text(`Página ${i} de ${totalPages}`, PW - MR - 22, PH - 9);
      }

      doc.save(`${(proyectoNombre || "proyecto").replace(/\s+/g, "_")}_EETT.pdf`);
    } catch (err) {
      console.error("Error exportando EE.TT. PDF:", err);
      alert("Error al generar el PDF: " + err.message);
    } finally {
      setExportando(false);
    }
  }

  // ── Mejorar con IA ────────────────────────────────────────────────────────
  async function mejorarConIA() {
    if (proyecto.length === 0) return;
    setMejorando(true);
    setMsgMejora(null);
    try {
      const res = await fetch("/api/mejorar-eett", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          partidas: proyecto.map(p => ({
            codigo: p.codigo,
            familia: p.familia,
            descripcion: p.desc || p.descripcion,
          })),
          familias: templates.map(t => t.codigo),
        }),
      });
      const data = await res.json();
      if (data.mejoras) {
        setTemplatesExtra(prev => ({ ...prev, ...data.mejoras }));
        setMsgMejora({ tipo: "ok", texto: `✅ Especificaciones mejoradas con IA para ${Object.keys(data.mejoras).length} capítulos.` });
      } else {
        setMsgMejora({ tipo: "warn", texto: data.error || "Sin créditos API disponibles." });
      }
    } catch {
      setMsgMejora({ tipo: "error", texto: "Error al conectar con la IA." });
    } finally {
      setMejorando(false);
    }
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (proyecto.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 anim-fade-in">
        <span className="text-6xl">📝</span>
        <p className="text-base font-medium text-gray-500">Sin partidas en el proyecto</p>
        <p className="text-xs text-center max-w-xs">Agrega partidas desde la Biblioteca para generar las Especificaciones Técnicas automáticamente.</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 anim-fade-in">
        <span className="text-6xl">🔍</span>
        <p className="text-base font-medium text-gray-500">Sin templates disponibles</p>
        <p className="text-xs text-center max-w-xs">Las familias ONDAC de tus partidas aún no tienen especificaciones en la base de datos.</p>
      </div>
    );
  }

  const SECCION_INFO = [
    { key: "descripcion",   label: "Descripción",        icon: "📄" },
    { key: "materiales",    label: "Materiales y Equipos", icon: "🧱" },
    { key: "ejecucion",     label: "Ejecución",           icon: "🔨" },
    { key: "medicion_pago", label: "Medición y Pago",     icon: "📐" },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ── Header barra ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between anim-fade-up">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">Especificaciones Técnicas</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">{templates.length} capítulos · {proyecto.length} partidas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={mejorarConIA}
            disabled={mejorando}
            title="Mejorar texto con Claude IA (requiere créditos API)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-200 text-purple-600 hover:bg-purple-50 btn-press disabled:opacity-40">
            {mejorando
              ? <span className="w-3.5 h-3.5 border border-purple-400 border-t-transparent rounded-full animate-spin"/>
              : <span>✨</span>
            }
            Mejorar con IA
          </button>
          <button
            onClick={exportarPDF}
            disabled={exportando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 btn-primary disabled:opacity-40">
            {exportando
              ? <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin"/>
              : <span>⬇️</span>
            }
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Mensaje IA */}
      {msgMejora && (
        <div className={`mx-5 mt-3 px-4 py-2.5 rounded-xl text-xs font-medium anim-slide-down ${
          msgMejora.tipo === "ok"   ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
          msgMejora.tipo === "warn" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                      "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {msgMejora.texto}
          <button onClick={() => setMsgMejora(null)} className="ml-3 opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ── Documento ── */}
      <div className="max-w-3xl mx-auto px-5 py-6 space-y-3">

        {/* ── HEADER / PORTADA ── */}
        <div className="rounded-2xl overflow-hidden anim-scale-in shadow-lg"
          style={{background:"linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#2563eb 100%)"}}>
          <div className="px-6 pt-5 pb-0 relative overflow-hidden">
            {/* dot grid overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
              style={{backgroundImage:"radial-gradient(rgba(255,255,255,.8) 1px,transparent 1px)",backgroundSize:"20px 20px"}}/>
            <div className="relative z-10 flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-extrabold tracking-[.18em] uppercase text-white/50 mb-2 flex items-center gap-2">
                  <span className="inline-block w-5 h-0.5 bg-orange-400 rounded shrink-0"/>
                  Especificaciones Técnicas · ONDAC 2017
                </p>
                {/* Biggest text on card — 22px */}
                <h1 className="text-[22px] font-black text-white leading-tight tracking-tight mb-1.5">
                  {proyectoNombre || "Proyecto"}
                </h1>
                <p className="text-[11px] text-white/50 font-medium truncate">
                  {[mandante, direccion].filter(Boolean).join(" · ") || "Sin datos del mandante"}
                </p>
              </div>
              {logo
                ? <img src={logo} alt="Logo" className="h-9 w-auto object-contain rounded-lg shrink-0 opacity-90"/>
                : <div className="w-14 h-8 rounded-lg shrink-0 flex items-center justify-center text-[9px] font-bold text-white/30 border border-white/15">LOGO</div>
              }
            </div>
          </div>
          {/* Stats strip — orange values */}
          <div className="flex border-t border-white/10">
            {[
              { v: templates.length,  k: "Capítulos" },
              { v: proyecto.length,   k: "Partidas" },
              { v: plazo || "—",      k: "Plazo" },
              { v: fechaDoc,          k: "Fecha" },
            ].map(({ v, k }) => (
              <div key={k} className="flex-1 text-center py-2.5 border-r border-white/10 last:border-r-0">
                <div className="text-[15px] font-black text-orange-400 leading-tight tracking-tight">{v}</div>
                <div className="text-[8px] font-bold uppercase tracking-[.1em] text-white/35 mt-0.5">{k}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FICHA DE DATOS ── */}
        <div className="bg-white rounded-2xl overflow-hidden anim-fade-up shadow-sm" style={{borderBottom:"3px solid #2563eb"}}>
          <div className="grid grid-cols-2">
            {[
              ["Proyecto",    proyectoNombre || "—"],
              ["Propietario", mandante       || "—"],
              ["Dirección",   direccion      || "—"],
              ["Fecha",       fechaDoc       || "—"],
            ].map(([lbl, val], i) => (
              <div key={lbl}
                className={`px-5 py-3 border-b border-gray-100 transition-colors hover:bg-blue-50/30 ${i % 2 === 0 ? "border-r border-gray-100" : ""}`}>
                {/* Label: 9px vivid blue */}
                <div className="text-[9px] font-extrabold uppercase tracking-[.1em] text-blue-600 mb-1">{lbl}</div>
                {/* Value: 12.5px dark */}
                <div className="text-[12.5px] font-semibold text-slate-800 leading-snug">{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── I. GENERALIDADES ── */}
        <div className="bg-white rounded-2xl overflow-hidden anim-fade-up shadow-sm">
          <button
            onClick={() => toggle("__generalidades__")}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left border-l-[3px] border-transparent hover:border-cyan-500">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-sm shrink-0">📄</div>
            <div className="flex-1">
              <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-slate-700">I. Generalidades</div>
              <div className="text-[10px] text-slate-400 mt-0.5">7 puntos · Normativa general chilena</div>
            </div>
            <span className={`text-slate-300 text-base transition-transform duration-200 ${expandidos["__generalidades__"] ? "rotate-90" : ""}`}>›</span>
          </button>
          {expandidos["__generalidades__"] && (
            <div className="border-t border-gray-100 px-6 py-4 accordion-item">
              <p className="text-[11.5px] text-slate-500 leading-relaxed whitespace-pre-wrap">{EETT_GENERALIDADES}</p>
            </div>
          )}
        </div>

        {/* ── II. ORDEN DE PRELACIÓN ── */}
        <div className="bg-white rounded-2xl overflow-hidden anim-fade-up shadow-sm">
          <button
            onClick={() => toggle("__orden_prelacion__")}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left border-l-[3px] border-transparent hover:border-cyan-500">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-sm shrink-0">⚖️</div>
            <div className="flex-1">
              <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-slate-700">II. Orden de Prelación</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Planos de arquitectura vs. especificaciones</div>
            </div>
            <span className={`text-slate-300 text-base transition-transform duration-200 ${expandidos["__orden_prelacion__"] ? "rotate-90" : ""}`}>›</span>
          </button>
          {expandidos["__orden_prelacion__"] && (
            <div className="border-t border-gray-100 px-6 py-4 accordion-item">
              <p className="text-[11.5px] text-slate-500 leading-relaxed whitespace-pre-wrap">{EETT_ORDEN_PRELACION}</p>
            </div>
          )}
        </div>

        {/* ── ÍNDICE ── */}
        <div className="bg-white rounded-2xl overflow-hidden anim-fade-up shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100">
            <span className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-400">Índice de capítulos</span>
          </div>
          <div className="px-5 py-2 divide-y divide-gray-50">
            {templates.map(({ codigo, capitulo, data }) => (
              <button key={codigo}
                onClick={() => document.getElementById(`eett-cap-${codigo}`)?.scrollIntoView({behavior:"smooth",block:"start"})}
                className="w-full flex items-center gap-3 py-2 text-left hover:text-blue-600 transition-colors group">
                <span className="w-6 h-6 rounded-md bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 group-hover:bg-blue-700 transition-colors">{capitulo}</span>
                <span className="text-[12px] font-medium text-slate-700 group-hover:text-blue-600 flex-1">{data.titulo}</span>
                <span className="text-[10px] text-slate-300 font-mono">{codigo}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── CAPÍTULOS ── */}
        {templates.map(({ codigo, capitulo, data }, tIdx) => {
          const isOpen = expandidos[codigo] !== false;
          return (
            <div key={codigo} id={`eett-cap-${codigo}`}
              style={{animationDelay:`${tIdx * 40}ms`}}
              className="bg-white rounded-2xl overflow-hidden anim-fade-up shadow-sm">

              {/* Chapter header */}
              <button
                onClick={() => toggle(codigo)}
                className="w-full flex items-center gap-3.5 px-5 py-4 hover:bg-slate-50 transition-colors text-left">
                {/* Orange badge — vivid with shadow */}
                <span className="w-9 h-9 rounded-xl text-white text-[13px] font-black flex items-center justify-center shrink-0"
                  style={{background:"linear-gradient(135deg,#f97316,#c2410c)",boxShadow:"0 4px 12px rgba(249,115,22,.35)"}}>
                  {capitulo}
                </span>
                <div className="flex-1 min-w-0">
                  {/* Chapter title: 14px — second hierarchy level */}
                  <div className="text-[14px] font-extrabold text-slate-900 uppercase tracking-[.01em] leading-snug">{data.titulo}</div>
                  {data.normas?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {data.normas.map(n => (
                        <span key={n} className="text-[9px] font-extrabold bg-cyan-100 text-cyan-700 border border-cyan-200 px-1.5 py-0.5 rounded">{n}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-slate-300 text-base transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>›</span>
              </button>

              {/* Sections */}
              {isOpen && (
                <div className="border-t border-gray-100 divide-y divide-gray-50 accordion-item">
                  {SECCION_INFO.map(({ key, label, icon }) => {
                    const texto = getSeccion(codigo, key);
                    if (!texto) return null;
                    const isCustom = templatesExtra[codigo]?.[key];
                    return (
                      <div key={key} className="px-5 py-3.5 pl-[72px]">
                        {/* Section label: 9px vivid blue + fade line */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm shrink-0">{icon}</span>
                          <span className="text-[9px] font-extrabold uppercase tracking-[.12em] text-blue-600">{label}</span>
                          <div className="flex-1 h-px rounded" style={{background:"linear-gradient(90deg,#dbeafe,transparent)"}}/>
                          {isCustom && (
                            <span className="text-[9px] bg-purple-50 text-purple-500 px-2 py-0.5 rounded-full font-bold shrink-0">✨ IA</span>
                          )}
                        </div>
                        {/* Body: 11.5px muted */}
                        <p className="text-[11.5px] text-slate-500 leading-[1.7] whitespace-pre-wrap">{texto}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* ── FOOTER DOC ── */}
        <div className="rounded-xl py-3 px-5 flex justify-between items-center anim-fade-in" style={{background:"#1e3a8a"}}>
          <span className="text-[10px] font-bold text-blue-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block shrink-0"/>
            APUchile · Base ONDAC 2017
          </span>
          <span className="text-[10px] font-semibold text-blue-600">{new Date().getFullYear()}</span>
        </div>

      </div>
    </div>
  );
}
