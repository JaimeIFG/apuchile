"use client";
import { useState, useMemo } from "react";

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const fmtPeso = n => "$" + Math.round(n || 0).toLocaleString("es-CL");

// Typical HH per unit for common construction categories
const HH_RATIO = {
  "Demolición": 0.8, "Movimiento de Tierras": 0.5, "Estructura": 2.5, "Hormigón": 3.0,
  "Albañilería": 2.0, "Cubierta": 1.5, "Instalaciones": 2.0, "Electricidad": 1.8,
  "Agua Potable": 1.5, "Alcantarillado": 1.5, "Gas": 1.0, "Carpintería": 1.2,
  "Puertas": 1.0, "Ventanas": 0.8, "Revestimientos": 1.5, "Muros": 1.8,
  "Cielos": 1.2, "Pavimentos": 1.0, "Cerámicas": 1.5, "Pinturas": 0.8,
  "Terminaciones": 1.0, "Equipamiento": 0.5, "Urbanización": 0.6,
};

function estimateHH(seccion, montoTotal) {
  // Estimate based on section type - roughly $15,000/HH average
  const key = Object.keys(HH_RATIO).find(k => seccion?.toLowerCase().includes(k.toLowerCase()));
  const ratio = key ? HH_RATIO[key] : 1.2;
  const hhPerMillon = ratio * 66; // ~66 HH per million CLP base
  return Math.round((montoTotal / 1e6) * hhPerMillon);
}

export default function HistogramaRecursos({ obra, presupuesto }) {
  const [vista, setVista] = useState("mensual"); // mensual | semanal
  const [recurso, setRecurso] = useState("hh"); // hh | materiales | costo

  const fechaInicio = obra?.fecha_inicio ? new Date(obra.fecha_inicio) : null;
  const plazoDias = obra?.plazo_dias || 180;
  const fechaTermino = obra?.fecha_termino_contractual
    ? new Date(obra.fecha_termino_contractual)
    : fechaInicio ? new Date(fechaInicio.getTime() + plazoDias * 86400000) : null;

  const data = useMemo(() => {
    if (!fechaInicio || !fechaTermino || presupuesto.length === 0) return null;

    const secciones = [...new Set(presupuesto.map(p => p.seccion))];
    const totalSecciones = secciones.length;
    if (totalSecciones === 0) return null;

    // Generate months
    const meses = [];
    const cur = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);
    const last = new Date(fechaTermino.getFullYear(), fechaTermino.getMonth(), 1);
    while (cur <= last) { meses.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1); }
    if (meses.length < 2) return null;

    const nMeses = meses.length;
    const durPorSec = Math.max(1, Math.floor(nMeses / totalSecciones));

    // Build resource allocation per section per month
    const seccionData = secciones.map((sec, idx) => {
      const items = presupuesto.filter(p => p.seccion === sec);
      const montoSec = items.reduce((s, p) => s + (p.valor_total || 0), 0);
      const hh = estimateHH(sec, montoSec);
      const matCosto = montoSec * 0.45; // ~45% materials
      const moCosto = montoSec * 0.35;  // ~35% labor

      // Distribute across months with overlap
      const startMonth = Math.min(Math.floor(idx * nMeses / totalSecciones), nMeses - 1);
      const endMonth = Math.min(startMonth + durPorSec + 1, nMeses);
      const span = endMonth - startMonth;

      return { sec, items, montoSec, hh, matCosto, moCosto, startMonth, endMonth, span };
    });

    // Aggregate per month
    const mensual = meses.map((m, mIdx) => {
      let hhTotal = 0, matTotal = 0, moTotal = 0, costoTotal = 0;
      const secActivas = [];

      seccionData.forEach(sd => {
        if (mIdx >= sd.startMonth && mIdx < sd.endMonth) {
          // Bell-curve distribution within section span
          const t = (mIdx - sd.startMonth) / Math.max(1, sd.span - 1);
          const weight = Math.exp(-4 * (t - 0.5) ** 2); // Gaussian
          const normalizer = Array.from({ length: sd.span }, (_, i) => {
            const ti = i / Math.max(1, sd.span - 1);
            return Math.exp(-4 * (ti - 0.5) ** 2);
          }).reduce((s, v) => s + v, 0);
          const pct = weight / normalizer;

          hhTotal += Math.round(sd.hh * pct);
          matTotal += sd.matCosto * pct;
          moTotal += sd.moCosto * pct;
          costoTotal += sd.montoSec * pct;
          secActivas.push(sd.sec);
        }
      });

      // Convert HH to workers (assuming 176 HH/month per worker)
      const trabajadores = Math.ceil(hhTotal / 176);

      return { mes: m, hh: hhTotal, trabajadores, mat: matTotal, mo: moTotal, costo: costoTotal, secActivas };
    });

    const totalHH = mensual.reduce((s, m) => s + m.hh, 0);
    const peakHH = Math.max(...mensual.map(m => m.hh));
    const peakTrabajadores = Math.max(...mensual.map(m => m.trabajadores));
    const peakMat = Math.max(...mensual.map(m => m.mat));

    return { meses, mensual, seccionData, totalHH, peakHH, peakTrabajadores, peakMat };
  }, [fechaInicio, fechaTermino, presupuesto]);

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>👷</div>
        <div style={{ fontSize: 14 }}>Completa fechas de obra e importa presupuesto para ver el histograma de recursos</div>
      </div>
    );
  }

  const { meses, mensual, seccionData, totalHH, peakHH, peakTrabajadores, peakMat } = data;
  const BAR_H = 180;
  const getValue = (m) => recurso === "hh" ? m.hh : recurso === "materiales" ? m.mat : m.costo;
  const maxVal = Math.max(...mensual.map(getValue), 1);
  const hoy = new Date();
  const hoyIdx = meses.findIndex(m => m.getFullYear() === hoy.getFullYear() && m.getMonth() === hoy.getMonth());

  const COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#ec4899","#06b6d4","#f97316","#14b8a6","#3b82f6"];

  const exportarPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Histograma de Recursos", 10, 10);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`${obra?.nombre || "Obra"} · Total: ${totalHH.toLocaleString()} HH · Peak: ${peakTrabajadores} trabajadores`, 10, 17);

    const filas = mensual.map(m => [
      `${MESES[m.mes.getMonth()]} ${m.mes.getFullYear()}`,
      m.hh.toLocaleString(),
      m.trabajadores,
      fmtPeso(m.mo),
      fmtPeso(m.mat),
      fmtPeso(m.costo),
      m.secActivas.join(", ").substring(0, 50),
    ]);

    autoTable(doc, {
      startY: 28,
      head: [["Mes", "HH", "Trab.", "M.O.", "Materiales", "Costo Total", "Secciones activas"]],
      body: filas,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [67, 56, 202], textColor: 255 },
      alternateRowStyles: { fillColor: [250, 250, 255] },
    });

    doc.save(`Recursos_${(obra?.nombre || "obra").replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", margin: 0 }}>👷 Histograma de Recursos</h2>
          <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
            {totalHH.toLocaleString()} HH totales · Peak: {peakTrabajadores} trabajadores · {meses.length} meses
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "hh", label: "HH" },
            { id: "materiales", label: "Materiales" },
            { id: "costo", label: "Costo Total" },
          ].map(v => (
            <button key={v.id} onClick={() => setRecurso(v.id)}
              style={{ padding: "5px 12px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600,
                cursor: "pointer",
                background: recurso === v.id ? "#6366f1" : "#f1f5f9",
                color: recurso === v.id ? "#fff" : "#64748b" }}>
              {v.label}
            </button>
          ))}
          <button onClick={exportarPDF}
            style={{ background: "#fff", color: "#4338ca", border: "1.5px solid #c7d2fe",
              borderRadius: 8, padding: "5px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            📄 PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total HH", value: totalHH.toLocaleString(), sub: "Horas-Hombre", color: "#6366f1" },
          { label: "Peak Trabajadores", value: peakTrabajadores, sub: `Mes ${MESES[mensual.reduce((max, m, i) => m.trabajadores > mensual[max].trabajadores ? i : max, 0).valueOf ? 0 : 0]}`, color: "#f59e0b" },
          { label: "Promedio Mensual", value: Math.round(totalHH / meses.length).toLocaleString() + " HH", sub: `${Math.ceil(totalHH / meses.length / 176)} trabajadores`, color: "#10b981" },
          { label: "Costo M.O. Est.", value: fmtPeso(mensual.reduce((s, m) => s + m.mo, 0)), sub: "~35% del presupuesto", color: "#8b5cf6" },
        ].map((c, i) => (
          <div key={i} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14,
            padding: "14px 16px", borderLeft: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: BAR_H + 40, paddingTop: 20 }}>
          {mensual.map((m, idx) => {
            const val = getValue(m);
            const h = maxVal > 0 ? (val / maxVal) * BAR_H : 0;
            const isHoy = idx === hoyIdx;
            return (
              <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                {/* Value label */}
                <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {recurso === "hh" ? val : fmtPeso(val)}
                </div>
                {/* Workers count for HH view */}
                {recurso === "hh" && (
                  <div style={{ fontSize: 8, color: "#94a3b8" }}>{m.trabajadores}p</div>
                )}
                {/* Bar - stacked by active sections */}
                <div style={{ width: "100%", height: h, borderRadius: "4px 4px 0 0", overflow: "hidden",
                  display: "flex", flexDirection: "column-reverse",
                  border: isHoy ? "2px solid #ef4444" : "none",
                  boxSizing: "border-box" }}>
                  {m.secActivas.map((sec, si) => {
                    const secIdx = seccionData.findIndex(sd => sd.sec === sec);
                    return (
                      <div key={si} style={{
                        flex: 1,
                        background: COLORS[secIdx % COLORS.length],
                        opacity: 0.85,
                        minHeight: 2,
                      }} title={sec} />
                    );
                  })}
                  {m.secActivas.length === 0 && (
                    <div style={{ flex: 1, background: "#e2e8f0" }} />
                  )}
                </div>
                {/* Month label */}
                <div style={{ fontSize: 9, color: isHoy ? "#ef4444" : "#94a3b8", fontWeight: isHoy ? 700 : 400,
                  whiteSpace: "nowrap", transform: meses.length > 12 ? "rotate(-45deg)" : "none" }}>
                  {MESES[m.mes.getMonth()]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, padding: "10px 14px",
        background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        {seccionData.map((sd, i) => (
          <span key={sd.sec} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#475569" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
            {sd.sec} ({sd.hh} HH)
          </span>
        ))}
      </div>

      {/* Detail table */}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 700 }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                {["Mes", "HH", "Trabajadores", "M.O.", "Materiales", "Costo Total", "Secciones Activas"].map((h, i) => (
                  <th key={i} style={{ padding: "9px 12px", fontWeight: 700, color: "#64748b",
                    textAlign: i >= 1 && i <= 5 ? "right" : "left", borderBottom: "1px solid #e2e8f0",
                    fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mensual.map((m, i) => (
                <tr key={i} style={{ background: i === hoyIdx ? "#eef2ff" : i % 2 === 0 ? "#fff" : "#fafafa",
                  borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "7px 12px", fontWeight: i === hoyIdx ? 700 : 500,
                    color: i === hoyIdx ? "#4338ca" : "#374151" }}>
                    {MESES[m.mes.getMonth()]} {m.mes.getFullYear()}
                    {i === hoyIdx && <span style={{ fontSize: 9, color: "#6366f1", marginLeft: 6 }}>← HOY</span>}
                  </td>
                  <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 700, color: "#6366f1" }}>
                    {m.hh.toLocaleString()}
                  </td>
                  <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 600,
                    color: m.trabajadores >= peakTrabajadores ? "#ef4444" : "#374151" }}>
                    {m.trabajadores} 👷
                  </td>
                  <td style={{ padding: "7px 12px", textAlign: "right", color: "#8b5cf6" }}>{fmtPeso(m.mo)}</td>
                  <td style={{ padding: "7px 12px", textAlign: "right", color: "#f59e0b" }}>{fmtPeso(m.mat)}</td>
                  <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 600, color: "#374151" }}>{fmtPeso(m.costo)}</td>
                  <td style={{ padding: "7px 12px", color: "#64748b", fontSize: 10 }}>
                    {m.secActivas.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{ background: "#eef2ff", borderTop: "2px solid #c7d2fe" }}>
              <tr>
                <td style={{ padding: "10px 12px", fontWeight: 800, color: "#4338ca" }}>TOTAL</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#6366f1" }}>
                  {totalHH.toLocaleString()}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#374151" }}>
                  Peak: {peakTrabajadores}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#8b5cf6" }}>
                  {fmtPeso(mensual.reduce((s, m) => s + m.mo, 0))}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#f59e0b" }}>
                  {fmtPeso(mensual.reduce((s, m) => s + m.mat, 0))}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#374151" }}>
                  {fmtPeso(mensual.reduce((s, m) => s + m.costo, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
