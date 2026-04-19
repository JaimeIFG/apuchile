"use client";
import { useState, useCallback } from "react";
import { createClient } from "../lib/supabase";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => "$\u00a0" + Math.round(n || 0).toLocaleString("es-CL");
const num = (v) => parseFloat(v) || 0;
const uid = () => Math.random().toString(36).slice(2, 10);

const ESTADOS = ["borrador", "emitida", "anulada"];
const ESTADO_COLOR = {
  borrador: "bg-amber-100 text-amber-700 border-amber-300",
  emitida:  "bg-emerald-100 text-emerald-700 border-emerald-300",
  anulada:  "bg-red-100 text-red-600 border-red-300",
};

const MONEDAS = ["CLP", "UF", "USD", "EUR"];
const CONDICIONES_PAGO = ["Contra entrega", "30 días factura", "60 días factura", "Anticipado 50%", "Personalizado"];

function emptyItem(orden) {
  return { _id: uid(), orden, descripcion: "", unidad: "Unid.", cantidad: 1, precio_unitario: 0, total: 0 };
}

// ─── InputField ─────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", placeholder = "", className = "" }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-slate-800 border border-slate-600 rounded-md px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 2, className = "" }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-slate-800 border border-slate-600 rounded-md px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, className = "" }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-slate-800 border border-slate-600 rounded-md px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1 bg-slate-700" />
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{children}</span>
      <div className="h-px flex-1 bg-slate-700" />
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function OrdenCompraGenerator({ obra, ordenesAnteriores = [], onSave, onClose }) {
  const supabase = createClient();

  const nextNum = `OC-${new Date().getFullYear()}-${String((ordenesAnteriores.length || 0) + 1).padStart(4, "0")}`;

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // ── Estado formulario ────────────────────────────────────────────────────
  const [oc, setOc] = useState({
    numero: nextNum,
    fecha: new Date().toISOString().split("T")[0],
    estado: "borrador",
    moneda: "CLP",
    // Proveedor
    proveedor_nombre: "",
    proveedor_rut: "",
    proveedor_direccion: "",
    proveedor_contacto: "",
    proveedor_email: "",
    proveedor_telefono: "",
    // Referencia
    ref_obra: obra?.nombre || "",
    condicion_pago: "30 días factura",
    plazo_entrega: "",
    lugar_entrega: "",
    observaciones: "",
    // Empresa
    empresa_nombre: "",
    empresa_rut: "",
    empresa_direccion: "",
    empresa_telefono: "",
    empresa_email: "",
    // Firma
    firma_nombre: "",
    firma_cargo: "",
    firma_rut: "",
  });

  const setF = (k) => (v) => setOc(prev => ({ ...prev, [k]: v }));

  // ── Ítems ────────────────────────────────────────────────────────────────
  const [items, setItems] = useState([emptyItem(1)]);

  const updateItem = useCallback((idx, field, raw) => {
    setItems(prev => {
      const next = [...prev];
      const item = { ...next[idx], [field]: raw };
      item.total = num(item.cantidad) * num(item.precio_unitario);
      next[idx] = item;
      return next;
    });
  }, []);

  const addItem = () => setItems(prev => [...prev, emptyItem(prev.length + 1)]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const moveItem = (idx, dir) => {
    setItems(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  // ── Totales ──────────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + num(i.total), 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  // ── Guardar en Supabase ──────────────────────────────────────────────────
  const handleGuardar = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ocData = {
        obra_id: obra.id,
        user_id: user.id,
        ...oc,
        subtotal,
        iva,
        total,
      };
      const { data: ocRow, error } = await supabase
        .from("obra_ordenes_compra")
        .insert(ocData)
        .select()
        .single();
      if (error) throw error;

      const itemsData = items.map((item, i) => ({
        oc_id: ocRow.id,
        orden: i,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: num(item.cantidad),
        precio_unitario: num(item.precio_unitario),
        total: num(item.total),
      }));
      const { error: err2 } = await supabase.from("obra_oc_items").insert(itemsData);
      if (err2) throw err2;

      onSave?.({ ...ocRow, items: itemsData });
    } catch (e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Generar PDF ──────────────────────────────────────────────────────────
  const handlePDF = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 14;
      const INDIGO = [67, 56, 202];
      const WHITE = [255, 255, 255];
      const DARK = [15, 23, 42];
      const SLATE_L = [248, 250, 252];

      // ── Cabecera ──────────────────────────────────────────────────────────
      doc.setFillColor(...INDIGO);
      doc.rect(0, 0, W, 32, "F");

      // Placeholder logo
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.4);
      doc.roundedRect(M, 5, 28, 22, 2, 2, "FD");
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.text("LOGO", M + 14, 14, { align: "center" });
      doc.setFontSize(5);
      doc.text("EMPRESA", M + 14, 18, { align: "center" });

      // Título
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("ORDEN DE COMPRA", W / 2, 14, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(oc.numero, W / 2, 21, { align: "center" });
      doc.setFontSize(8);
      doc.text(`Fecha: ${new Date(oc.fecha + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}`, W / 2, 27, { align: "center" });

      // Empresa emisora (derecha)
      if (oc.empresa_nombre) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(oc.empresa_nombre, W - M, 9, { align: "right" });
        doc.setFont("helvetica", "normal");
        if (oc.empresa_rut) doc.text(`RUT: ${oc.empresa_rut}`, W - M, 14, { align: "right" });
        if (oc.empresa_direccion) doc.text(oc.empresa_direccion, W - M, 18, { align: "right" });
        if (oc.empresa_telefono) doc.text(oc.empresa_telefono, W - M, 22, { align: "right" });
        if (oc.empresa_email) doc.text(oc.empresa_email, W - M, 26, { align: "right" });
      }

      let y = 38;
      const col1W = (W - M * 2 - 4) * 0.55;
      const col2W = (W - M * 2 - 4) * 0.45;
      const boxH = 32;

      // ── Box proveedor ─────────────────────────────────────────────────────
      doc.setFillColor(...SLATE_L);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(M, y, col1W, boxH, 2, 2, "FD");
      doc.setFillColor(...INDIGO);
      doc.roundedRect(M, y, col1W, 7, 2, 2, "F");
      doc.rect(M, y + 3, col1W, 4, "F");
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("PROVEEDOR", M + 4, y + 5);

      const provRows = [
        oc.proveedor_nombre,
        oc.proveedor_rut ? `RUT: ${oc.proveedor_rut}` : null,
        oc.proveedor_direccion,
        oc.proveedor_contacto && oc.proveedor_telefono
          ? `${oc.proveedor_contacto}  |  ${oc.proveedor_telefono}`
          : oc.proveedor_contacto || oc.proveedor_telefono || null,
        oc.proveedor_email,
      ].filter(Boolean);

      doc.setTextColor(...DARK);
      provRows.forEach((row, i) => {
        if (i === 0) { doc.setFont("helvetica", "bold"); doc.setFontSize(8); }
        else { doc.setFont("helvetica", "normal"); doc.setFontSize(7); }
        doc.text(row, M + 4, y + 13 + i * 5);
      });

      // ── Box condiciones ───────────────────────────────────────────────────
      const x2 = M + col1W + 4;
      doc.setFillColor(...SLATE_L);
      doc.roundedRect(x2, y, col2W, boxH, 2, 2, "FD");
      doc.setFillColor(...INDIGO);
      doc.roundedRect(x2, y, col2W, 7, 2, 2, "F");
      doc.rect(x2, y + 3, col2W, 4, "F");
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("REFERENCIA Y CONDICIONES", x2 + 4, y + 5);

      const condRows = [
        ["Obra:", oc.ref_obra],
        ["Cond. Pago:", oc.condicion_pago],
        ["Entrega:", oc.plazo_entrega],
        ["Moneda:", oc.moneda],
      ].filter(r => r[1]);

      doc.setTextColor(...DARK);
      condRows.forEach(([l, v], i) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(l, x2 + 4, y + 13 + i * 5.5);
        doc.setFont("helvetica", "normal");
        const trunc = (v || "").length > 26 ? (v || "").slice(0, 25) + "…" : (v || "");
        doc.text(trunc, x2 + 26, y + 13 + i * 5.5);
      });

      y += boxH + 7;

      // ── Tabla ítems ───────────────────────────────────────────────────────
      const filas = items.map((item, i) => [
        i + 1,
        item.descripcion || "—",
        item.unidad || "",
        num(item.cantidad).toLocaleString("es-CL"),
        fmt(num(item.precio_unitario)),
        fmt(num(item.total)),
      ]);

      autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        head: [["N°", "Descripción", "Unid.", "Cant.", "P. Unitario", "Total"]],
        body: filas,
        styles: { fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
        headStyles: { fillColor: INDIGO, textColor: WHITE, fontStyle: "bold", fontSize: 8, halign: "center" },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: "auto" },
          2: { cellWidth: 18, halign: "center" },
          3: { cellWidth: 16, halign: "right" },
          4: { cellWidth: 28, halign: "right" },
          5: { cellWidth: 28, halign: "right", fontStyle: "bold" },
        },
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.2,
      });

      y = doc.lastAutoTable.finalY + 6;

      // ── Totales ───────────────────────────────────────────────────────────
      const totX = W - M - 70;
      autoTable(doc, {
        startY: y,
        margin: { left: totX, right: M },
        tableWidth: 70,
        body: [["Subtotal neto", fmt(subtotal)], ["IVA 19%", fmt(iva)]],
        styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 4, right: 4 } },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [71, 85, 105], cellWidth: 36 },
          1: { halign: "right", cellWidth: 34 },
        },
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.2,
      });

      const totY = doc.lastAutoTable.finalY;
      doc.setFillColor(...INDIGO);
      doc.rect(totX, totY, 70, 9, "F");
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("TOTAL", totX + 4, totY + 6);
      doc.text(fmt(total), W - M - 3, totY + 6, { align: "right" });

      y = totY + 9 + 7;

      // ── Observaciones ─────────────────────────────────────────────────────
      if (oc.lugar_entrega || oc.observaciones) {
        const obsW = W - M * 2;
        doc.setFillColor(...SLATE_L);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, obsW, 20, 2, 2, "FD");
        doc.setFillColor(...INDIGO);
        doc.roundedRect(M, y, obsW, 6, 2, 2, "F");
        doc.rect(M, y + 3, obsW, 3, "F");
        doc.setTextColor(...WHITE);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("LUGAR DE ENTREGA Y OBSERVACIONES", M + 4, y + 4.5);
        doc.setTextColor(...DARK);
        doc.setFontSize(7);
        let oy = y + 11;
        if (oc.lugar_entrega) {
          doc.setFont("helvetica", "bold"); doc.text("Lugar:", M + 4, oy);
          doc.setFont("helvetica", "normal"); doc.text(oc.lugar_entrega, M + 18, oy); oy += 5;
        }
        if (oc.observaciones) {
          doc.setFont("helvetica", "bold"); doc.text("Obs.:", M + 4, oy);
          doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(oc.observaciones, obsW - 25);
          doc.text(lines, M + 18, oy);
        }
        y += 28;
      }

      // ── Firma + Logo ──────────────────────────────────────────────────────
      const fw = (W - M * 2 - 8) / 2;
      const firmaH = 42;

      // Box firma
      doc.setFillColor(...SLATE_L);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(M, y, fw, firmaH, 2, 2, "FD");
      doc.setFillColor(...INDIGO);
      doc.roundedRect(M, y, fw, 6, 2, 2, "F");
      doc.rect(M, y + 3, fw, 3, "F");
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("FIRMA DIGITAL AUTORIZADA", M + 4, y + 4.5);

      doc.setDrawColor(...INDIGO);
      doc.setLineWidth(0.6);
      doc.roundedRect(M + 3, y + 8, fw - 6, 7, 1, 1);
      doc.setTextColor(...INDIGO);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.text("✓  FIRMADO DIGITALMENTE", M + fw / 2, y + 12.5, { align: "center" });

      // Trazo de firma
      doc.setDrawColor(...INDIGO);
      doc.setLineWidth(0.9);
      const fx = M + fw / 2 - 18, fy = y + 22;
      [[0,2,6,-2],[6,-2,10,3],[10,3,16,-1],[16,-1,22,2],[22,2,28,-3],[28,-3,34,1],[34,1,36,-1]]
        .forEach(([x1,y1,x2,y2]) => doc.line(fx+x1, fy+y1, fx+x2, fy+y2));

      doc.setLineWidth(0.3);
      doc.setDrawColor(226, 232, 240);
      doc.line(M + 10, y + 28, M + fw - 10, y + 28);
      doc.setTextColor(...DARK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(oc.firma_nombre || "—", M + fw / 2, y + 33, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(oc.firma_cargo || "", M + fw / 2, y + 37.5, { align: "center" });
      doc.setTextColor(100, 116, 139);
      if (oc.firma_rut) doc.text(`RUT: ${oc.firma_rut}`, M + fw / 2, y + 41, { align: "center" });

      // Box logo empresa
      const lx = M + fw + 8;
      doc.setFillColor(...SLATE_L);
      doc.roundedRect(lx, y, fw, firmaH, 2, 2, "FD");
      doc.setFillColor(...INDIGO);
      doc.roundedRect(lx, y, fw, 6, 2, 2, "F");
      doc.rect(lx, y + 3, fw, 3, "F");
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("SELLO / LOGO EMPRESA", lx + 4, y + 4.5);

      doc.setFillColor(237, 236, 254);
      doc.setDrawColor(...INDIGO);
      doc.setLineWidth(0.4);
      doc.roundedRect(lx + fw / 2 - 18, y + 9, 36, 22, 3, 3, "FD");
      doc.setTextColor(...INDIGO);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("LOGO", lx + fw / 2, y + 20, { align: "center" });
      doc.setFontSize(6);
      doc.text("Tu logo aquí", lx + fw / 2, y + 26, { align: "center" });

      doc.setTextColor(...DARK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(oc.empresa_nombre || obra?.nombre || "", lx + fw / 2, y + 36, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      if (oc.empresa_rut) doc.text(`RUT: ${oc.empresa_rut}`, lx + fw / 2, y + 40, { align: "center" });

      // ── Pie de página ─────────────────────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(...INDIGO);
        doc.rect(0, H - 10, W, 10, "F");
        doc.setTextColor(...WHITE);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        const empresaFooter = [oc.empresa_nombre, oc.empresa_email, oc.empresa_telefono].filter(Boolean).join("  —  ");
        doc.text(empresaFooter || obra?.nombre || "", W / 2, H - 5, { align: "center" });
        doc.text(`Pág. ${i} de ${totalPages}  |  APUdesk`, W - M, H - 5, { align: "right" });
        doc.text(oc.numero, M, H - 5);
      }

      doc.save(`${oc.numero}.pdf`);
    } catch (e) {
      alert("Error al generar PDF: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[95vh] flex flex-col bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Nueva Orden de Compra</h2>
            <p className="text-slate-400 text-sm">{obra?.nombre || "Obra"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${ESTADO_COLOR[oc.estado]}`}>
              {oc.estado.charAt(0).toUpperCase() + oc.estado.slice(1)}
            </span>
            <Select value={oc.estado} onChange={setF("estado")} options={ESTADOS} className="w-36" />
            <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white transition text-xl font-bold">✕</button>
          </div>
        </div>

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Identificación ─────────────────────────────────────────── */}
          <section>
            <SectionTitle>Identificación</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="N° OC" value={oc.numero} onChange={setF("numero")} />
              <Field label="Fecha" value={oc.fecha} onChange={setF("fecha")} type="date" />
              <Select label="Moneda" value={oc.moneda} onChange={setF("moneda")} options={MONEDAS} />
              <Select label="Condición de pago" value={oc.condicion_pago} onChange={setF("condicion_pago")} options={CONDICIONES_PAGO} />
            </div>
          </section>

          {/* ── Empresa emisora ─────────────────────────────────────────── */}
          <section>
            <SectionTitle>Empresa Emisora</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Nombre empresa" value={oc.empresa_nombre} onChange={setF("empresa_nombre")} className="col-span-2 md:col-span-1" />
              <Field label="RUT empresa" value={oc.empresa_rut} onChange={setF("empresa_rut")} placeholder="76.000.000-0" />
              <Field label="Teléfono" value={oc.empresa_telefono} onChange={setF("empresa_telefono")} placeholder="+56 2 …" />
              <Field label="Dirección" value={oc.empresa_direccion} onChange={setF("empresa_direccion")} className="col-span-2" />
              <Field label="Email" value={oc.empresa_email} onChange={setF("empresa_email")} type="email" />
            </div>
          </section>

          {/* ── Proveedor ───────────────────────────────────────────────── */}
          <section>
            <SectionTitle>Proveedor</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Nombre / Razón Social" value={oc.proveedor_nombre} onChange={setF("proveedor_nombre")} className="col-span-2 md:col-span-1" />
              <Field label="RUT proveedor" value={oc.proveedor_rut} onChange={setF("proveedor_rut")} placeholder="77.000.000-0" />
              <Field label="Contacto" value={oc.proveedor_contacto} onChange={setF("proveedor_contacto")} />
              <Field label="Dirección" value={oc.proveedor_direccion} onChange={setF("proveedor_direccion")} className="col-span-2" />
              <Field label="Email" value={oc.proveedor_email} onChange={setF("proveedor_email")} type="email" />
              <Field label="Teléfono" value={oc.proveedor_telefono} onChange={setF("proveedor_telefono")} placeholder="+56 9 …" />
            </div>
          </section>

          {/* ── Referencia obra ─────────────────────────────────────────── */}
          <section>
            <SectionTitle>Referencia y Entrega</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Referencia obra" value={oc.ref_obra} onChange={setF("ref_obra")} className="col-span-2 md:col-span-1" />
              <Field label="Plazo de entrega" value={oc.plazo_entrega} onChange={setF("plazo_entrega")} placeholder="Ej: 15 días hábiles" />
              <Field label="Lugar de entrega" value={oc.lugar_entrega} onChange={setF("lugar_entrega")} placeholder="Dirección de la obra" className="col-span-2 md:col-span-1" />
              <TextArea label="Observaciones" value={oc.observaciones} onChange={setF("observaciones")} rows={2} className="col-span-2 md:col-span-3" />
            </div>
          </section>

          {/* ── Ítems ───────────────────────────────────────────────────── */}
          <section>
            <SectionTitle>Ítems</SectionTitle>
            <div className="rounded-xl overflow-hidden border border-slate-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 bg-slate-800 border-b border-slate-700">
                    <th className="px-2 py-2 text-center w-8">#</th>
                    <th className="px-3 py-2 text-left">Descripción</th>
                    <th className="px-2 py-2 text-center w-20">Unidad</th>
                    <th className="px-2 py-2 text-right w-20">Cantidad</th>
                    <th className="px-2 py-2 text-right w-28">P. Unitario</th>
                    <th className="px-2 py-2 text-right w-28">Total</th>
                    <th className="px-2 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item._id} className="border-b border-slate-800 hover:bg-slate-800/50 group">
                      <td className="px-2 py-1.5 text-center text-slate-500">{idx + 1}</td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.descripcion}
                          onChange={e => updateItem(idx, "descripcion", e.target.value)}
                          placeholder="Descripción del ítem…"
                          className="w-full bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.unidad}
                          onChange={e => updateItem(idx, "unidad", e.target.value)}
                          className="w-full bg-transparent text-slate-300 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={item.cantidad}
                          onChange={e => updateItem(idx, "cantidad", e.target.value)}
                          className="w-full bg-transparent text-slate-200 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={item.precio_unitario}
                          onChange={e => updateItem(idx, "precio_unitario", e.target.value)}
                          className="w-full bg-transparent text-slate-200 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right text-indigo-300 font-semibold">
                        {fmt(num(item.total))}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="text-slate-500 hover:text-slate-200 disabled:opacity-30">↑</button>
                          <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} className="text-slate-500 hover:text-slate-200 disabled:opacity-30">↓</button>
                          <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-400 ml-1">✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={addItem}
                className="w-full py-2 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/50 text-sm transition flex items-center justify-center gap-1.5 border-t border-slate-700"
              >
                <span className="text-lg leading-none">+</span> Agregar ítem
              </button>
            </div>

            {/* Resumen totales */}
            <div className="flex justify-end mt-3">
              <div className="w-64 rounded-xl overflow-hidden border border-slate-700 text-sm">
                <div className="flex justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                  <span className="text-slate-400 font-medium">Subtotal neto</span>
                  <span className="text-slate-200">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between px-4 py-2 bg-slate-800 border-b border-indigo-700">
                  <span className="text-slate-400 font-medium">IVA 19%</span>
                  <span className="text-slate-200">{fmt(iva)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 bg-indigo-700">
                  <span className="text-white font-bold">TOTAL</span>
                  <span className="text-white font-bold">{fmt(total)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Firma ───────────────────────────────────────────────────── */}
          <section>
            <SectionTitle>Firma Autorizada</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Nombre firmante" value={oc.firma_nombre} onChange={setF("firma_nombre")} />
              <Field label="Cargo" value={oc.firma_cargo} onChange={setF("firma_cargo")} />
              <Field label="RUT firmante" value={oc.firma_rut} onChange={setF("firma_rut")} placeholder="12.345.678-9" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              La firma digital se añade automáticamente al PDF con los datos ingresados.
            </p>
          </section>

        </div>

        {/* Footer acciones */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700 shrink-0 bg-slate-900">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition">
            Cancelar
          </button>
          <button
            onClick={handlePDF}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-white transition disabled:opacity-60"
          >
            {generating ? "Generando…" : "Vista previa PDF"}
          </button>
          <button
            onClick={handleGuardar}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar OC"}
          </button>
        </div>
      </div>
    </div>
  );
}
