"use client";
import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ONDAC_APUS } from '../ondac_data_nuevo.js';
import { supabase } from '../lib/supabase';
import { useInactividad } from '../lib/useInactividad';
import { useIndicadores } from '../lib/useIndicadores';
import LoadingOverlay from '../components/LoadingOverlay';

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
        {TABS_RAIL.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} title={t.label}
            className={`relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${tab === t.id ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"}`}>
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="text-[9px] font-medium leading-none">{t.label}</span>
            {t.id === "resumen" && proyecto.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">{proyecto.length}</span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => router.push("/dashboard")} title="Volver al dashboard"
          className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all">
          <span className="text-lg leading-none">🏠</span>
          <span className="text-[9px] font-medium">Inicio</span>
        </button>
      </div>

      {/* ── Área principal ── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">{proyectoNombre}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{zonaLabel}</span>
              <button onClick={() => setEditandoProyecto(true)} className="text-gray-300 hover:text-emerald-500 transition-colors text-xs">✏️</button>
              {guardando && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Guardando...</span>}
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
              <div className="hidden lg:flex items-center gap-2 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                <span><span className="font-semibold text-gray-600">UF</span> ${uf.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-gray-200">·</span>
                <span><span className="font-semibold text-gray-600">UTM</span> ${utm?.toLocaleString("es-CL") ?? "—"}</span>
              </div>
            )}
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {["CLP","UF","UTM"].map(m => (
                <button key={m} onClick={() => setMoneda(m)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${moneda === m ? "bg-white shadow text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}>
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
              <aside className="w-56 bg-white border-r border-gray-100 flex flex-col overflow-hidden shrink-0">
                <div className="px-3 py-2.5 border-b border-gray-100">
                  <input placeholder="Filtrar categorías..."
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-400" />
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                  <button onClick={() => { setFamiliaActiva(null); setFamAbierta(null); }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${!familiaActiva ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-500" : "text-gray-600 hover:bg-gray-50"}`}>
                    <span>Todas las partidas</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-normal">{APUS.length}</span>
                  </button>
                  {raices.map(r => (
                    <div key={r.codigo}>
                      <button onClick={() => setFamAbierta(famAbierta === r.codigo ? null : r.codigo)}
                        className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between transition-colors ${familiaActiva === r.codigo || hijos(r.codigo).some(h => h.codigo === familiaActiva) ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50"}`}>
                        <span className="truncate pr-1">{r.nombre}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {conteoFamilia[r.codigo] > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-normal">{conteoFamilia[r.codigo]}</span>}
                          <span className="text-gray-400 text-[10px]">{famAbierta === r.codigo ? "▾" : "▸"}</span>
                        </div>
                      </button>
                      {famAbierta === r.codigo && hijos(r.codigo).map(h => (
                        <button key={h.codigo} onClick={() => setFamiliaActiva(h.codigo)}
                          className={`w-full text-left pl-6 pr-3 py-1.5 text-[11px] flex items-center justify-between transition-colors ${familiaActiva === h.codigo ? "text-emerald-600 font-semibold bg-emerald-50 border-r-2 border-emerald-400" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}>
                          <span className="flex items-center gap-1"><span className="text-gray-300">›</span> {h.nombre}</span>
                          {conteoFamilia[h.codigo] > 0 && <span className="text-[10px] text-gray-400">{conteoFamilia[h.codigo]}</span>}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </aside>

              {/* Lista partidas */}
              <main className="flex-1 overflow-y-auto">
                <div className="px-4 py-3 border-b border-gray-200 bg-white flex gap-3 items-center sticky top-0 z-10">
                  <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar partida por nombre o código..."
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 shadow-sm" />
                  <span className="text-xs text-gray-400 shrink-0">{apusFiltrados.length} partidas</span>
                </div>
                <div className="p-4 grid gap-2">
                  {apusFiltrados.slice(0,100).map((apu, idx) => {
                    const { total } = calcAPU(apu, cfg);
                    const desc = apu.desc || apu.descripcion || "Sin descripción";
                    return (
                      <div key={`${apu.codigo}_${idx}`} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-emerald-300 hover:shadow-sm transition-all group">
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
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 opacity-0 group-hover:opacity-100 transition-all">
                            Ver APU
                          </button>
                          <button onClick={() => agregarPartida(apu)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm">
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

          {/* EDITOR APU */}
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
                  {[["Costo M.O. neto",fmtM(apuCalc.moNet)],["Leyes Sociales",fmtM(apuCalc.llssAmt)],["Materiales",fmtM(apuCalc.mat)],["Precio unitario",fmtM(apuCalc.total)]].map(([label,val],i)=>(
                    <div key={i} className={`rounded-xl p-4 ${i===3?"bg-emerald-600 text-white":"bg-white border border-gray-200"}`}>
                      <div className={`text-[10px] uppercase tracking-wider mb-1 ${i===3?"text-emerald-100":"text-gray-400"}`}>{label}</div>
                      <div className={`text-lg font-semibold ${i===3?"text-white":"text-gray-800"}`}>{val}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
                  <div className="flex justify-between items-center px-5 py-4 bg-emerald-50">
                    <span className="font-semibold text-emerald-800">Precio unitario total</span>
                    <span className="text-xl font-bold text-emerald-600">{fmtM(apuCalc.total)}</span>
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
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">
                  + Agregar esta partida al proyecto
                </button>
              </>
            )}
          </div>
        )}

          {/* CONFIG */}
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

          {/* RESUMEN */}
          {tab === "resumen" && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-800">Resumen del proyecto</h2>
              {proyecto.length > 0 && (
                <button onClick={exportarPDF}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-emerald-700 transition-colors">
                  📄 Exportar PDF
                </button>
              )}
            </div>
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
                        const { total, rows } = calcAPU(p, cfg);
                        const desc = p.desc || p.descripcion || "Sin descripción";
                        const expanded = expandedResumen === p.id;
                        return (
                          <>
                            <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${expanded ? "bg-emerald-50" : ""}`}
                              onClick={(e) => { if (e.target.tagName !== "INPUT" && e.target.tagName !== "BUTTON") setExpandedResumen(expanded ? null : p.id); }}>
                              <td className="px-4 py-3">
                                <div className="text-[10px] text-gray-400 font-mono">{p.codigo}</div>
                                <div className="text-gray-700 leading-snug flex items-center gap-1">
                                  <span>{desc}</span>
                                  <span className="text-[10px] text-gray-400">{expanded ? "▲" : "▼"}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center text-gray-500">{p.unidad}</td>
                              <td className="px-3 py-3 text-right">
                                <input type="number" value={p.cantidad} min={0.01} step={0.01}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e)=>setProyecto(pr=>pr.map(x=>x.id===p.id?{...x,cantidad:parseFloat(e.target.value)||1}:x))}
                                  className="w-16 border border-gray-200 rounded px-2 py-1 text-right text-xs focus:outline-none focus:border-emerald-400"/>
                              </td>
                              <td className="px-3 py-3 text-right text-gray-700">{fmtM(total)}</td>
                              <td className="px-3 py-3 text-right font-semibold text-emerald-600">{fmtM(total * p.cantidad)}</td>
                              <td className="px-3 py-3 text-right">
                                <button onClick={(e)=>{e.stopPropagation();setProyecto(pr=>pr.filter(x=>x.id!==p.id));}}
                                  className="text-red-400 hover:text-red-600 text-xs">x</button>
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
                      <span className="font-medium">{fmtM(val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-5 py-4 bg-emerald-600 text-white">
                    <span className="font-semibold">Total proyecto</span>
                    <span className="text-xl font-bold">{fmtM(resumen.total)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

          {/* ANEXOS */}
          {tab === "anexos" && (
          <div className="flex-1 overflow-y-auto p-5 max-w-3xl">
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
                      <div key={i} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{icon}</span>
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
                          className="text-xs text-emerald-600 hover:underline">
                          Abrir
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
const REGIONES_EDIT = [
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

function EditarProyectoModal({ nombre, meta, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    nombre: nombre || "",
    region: meta.region || "",
    mandante: meta.mandante || "",
    fechaInicio: meta.fechaInicio || "",
    fechaTermino: meta.fechaTermino || "",
    responsable: meta.responsable || "",
  });

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const dias = (() => {
    if (!form.fechaInicio || !form.fechaTermino) return null;
    const d = Math.round((new Date(form.fechaTermino) - new Date(form.fechaInicio)) / 86400000);
    return d > 0 ? d : null;
  })();

  const handleGuardar = () => {
    const regionInfo = REGIONES_EDIT.find(r => r.label === form.region);
    const nuevaMeta = {
      region: form.region,
      mandante: form.mandante,
      fechaInicio: form.fechaInicio,
      fechaTermino: form.fechaTermino,
      responsable: form.responsable,
      zona: regionInfo ? regionInfo.zona : meta.zona ?? 0,
      diasCorridos: dias,
    };
    onGuardar(form.nombre, nuevaMeta);
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-800">Editar proyecto</h3>
            <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre del proyecto</label>
              <input value={form.nombre} onChange={e => setF("nombre", e.target.value)} className={inputCls}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Región</label>
              <select value={form.region} onChange={e => setF("region", e.target.value)} className={inputCls + " bg-white"}>
                <option value="">Selecciona...</option>
                {REGIONES_EDIT.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Mandante</label>
              <input value={form.mandante} onChange={e => setF("mandante", e.target.value)} className={inputCls} placeholder="Nombre del mandante"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha inicio</label>
                <input type="date" value={form.fechaInicio} onChange={e => setF("fechaInicio", e.target.value)} className={inputCls}/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha término</label>
                <input type="date" value={form.fechaTermino} onChange={e => setF("fechaTermino", e.target.value)} className={inputCls}/>
              </div>
            </div>
            {dias && <p className="text-xs text-emerald-600">Plazo: <strong>{dias} días corridos</strong></p>}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Persona a cargo</label>
              <input value={form.responsable} onChange={e => setF("responsable", e.target.value)} className={inputCls} placeholder="Nombre del responsable"/>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onCerrar} className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancelar</button>
            <button onClick={handleGuardar} disabled={!form.nombre.trim()}
              className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente selector de archivo y tipo
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

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      {/* Selector tipo */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tipo de documento</p>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map(t => (
            <button key={t.id} onClick={() => setTipo(t.id)}
              className={`rounded-xl p-3 text-left border transition-all ${tipo === t.id ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
              <p className={`text-xs font-semibold ${tipo === t.id ? "text-emerald-700" : "text-gray-700"}`}>{t.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Zona drop */}
      <div
        onClick={() => ref.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) { setArchivo(f); setArchivoNombre(f.name); }
        }}
        className="border-2 border-dashed border-gray-200 hover:border-emerald-400 rounded-xl p-8 text-center cursor-pointer transition-colors">
        <p className="text-2xl mb-2">📂</p>
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
        className="mt-4 w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors">
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
