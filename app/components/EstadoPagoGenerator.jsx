"use client";
import { useState, useMemo, useCallback } from "react";

const fmtPeso = n => (n || n === 0) ? "$" + Math.round(n).toLocaleString("es-CL") : "—";

export default function EstadoPagoGenerator({ obra, presupuesto, pagosAnteriores, onSave, onClose }) {
  const montoContrato = obra?.monto_contrato || 0;
  const retencionPct = 5; // default 5% retención Chile

  // State: avance per partida (percentage 0-100)
  const [avances, setAvances] = useState(() => {
    const init = {};
    presupuesto.forEach(p => { init[p.id] = 0; });
    return init;
  });
  const [config, setConfig] = useState({
    numero: (pagosAnteriores?.length || 0) + 1,
    fecha: new Date().toISOString().split("T")[0],
    retencion: retencionPct,
    anticipo: 0,
    reajuste: 0,
    observaciones: "",
  });
  const [generating, setGenerating] = useState(false);

  // Calculate accumulated from previous EPs
  const acumuladoAnterior = useMemo(() => {
    const acc = {};
    presupuesto.forEach(p => { acc[p.id] = 0; });
    (pagosAnteriores || []).forEach(ep => {
      if (ep.partidas_json) {
        try {
          const parts = JSON.parse(ep.partidas_json);
          parts.forEach(p => {
            if (p.id && acc[p.id] !== undefined) acc[p.id] += (p.monto_actual || 0);
          });
        } catch {}
      }
    });
    return acc;
  }, [presupuesto, pagosAnteriores]);

  const setAvance = (id, val) => {
    const num = Math.max(0, Math.min(100, parseFloat(val) || 0));
    setAvances(prev => ({ ...prev, [id]: num }));
  };

  // Calculate EP lines
  const lineas = useMemo(() => {
    return presupuesto.map(p => {
      const valorTotal = p.valor_total || 0;
      const avancePct = avances[p.id] || 0;
      const montoAcumulado = valorTotal * avancePct / 100;
      const montoAnterior = acumuladoAnterior[p.id] || 0;
      const montoActual = montoAcumulado - montoAnterior;
      return {
        ...p,
        avancePct,
        montoAcumulado,
        montoAnterior,
        montoActual: Math.max(0, montoActual),
      };
    });
  }, [presupuesto, avances, acumuladoAnterior]);

  const totalContrato = presupuesto.reduce((s, p) => s + (p.valor_total || 0), 0);
  const totalAcumulado = lineas.reduce((s, l) => s + l.montoAcumulado, 0);
  const totalAnterior = lineas.reduce((s, l) => s + l.montoAnterior, 0);
  const totalActual = lineas.reduce((s, l) => s + l.montoActual, 0);
  const retencionMonto = totalActual * config.retencion / 100;
  const reajusteMonto = totalActual * config.reajuste / 100;
  const anticipoMonto = config.anticipo || 0;
  const netoAPagar = totalActual - retencionMonto + reajusteMonto - anticipoMonto;
  const avanceGlobal = totalContrato > 0 ? (totalAcumulado / totalContrato * 100) : 0;

  const generarPDF = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();

      // Header
      doc.setFillColor(67, 56, 202);
      doc.rect(0, 0, W, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text(`Estado de Pago N°${config.numero}`, 14, 11);
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(obra?.nombre || "Obra", 14, 18);
      doc.text(`Fecha: ${new Date(config.fecha).toLocaleDateString("es-CL")}`, 14, 24);
      doc.text(`Contratista: ${obra?.contratista || "—"}`, W / 2, 18);
      doc.text(`Mandante: ${obra?.mandante || "—"}`, W / 2, 24);
      doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text(`Avance Global: ${avanceGlobal.toFixed(1)}%`, W - 14, 11, { align: "right" });
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`Monto Contrato: ${fmtPeso(montoContrato || totalContrato)}`, W - 14, 18, { align: "right" });

      let y = 34;

      // Partidas table
      const secciones = [...new Set(lineas.map(l => l.seccion))];
      const filas = [];

      secciones.forEach(sec => {
        const items = lineas.filter(l => l.seccion === sec);
        // Section header row
        filas.push([
          { content: sec, colSpan: 10, styles: { fillColor: [238, 242, 255], fontStyle: "bold", textColor: [67, 56, 202], fontSize: 8 } }
        ]);
        items.forEach(l => {
          if (l.montoActual > 0 || l.montoAcumulado > 0) {
            filas.push([
              l.item || "—",
              (l.partida || "").substring(0, 35),
              l.unidad || "",
              l.cantidad ?? "",
              l.valor_unitario ? "$" + Math.round(l.valor_unitario).toLocaleString("es-CL") : "",
              l.valor_total ? "$" + Math.round(l.valor_total).toLocaleString("es-CL") : "",
              l.avancePct.toFixed(1) + "%",
              "$" + Math.round(l.montoAcumulado).toLocaleString("es-CL"),
              "$" + Math.round(l.montoAnterior).toLocaleString("es-CL"),
              "$" + Math.round(l.montoActual).toLocaleString("es-CL"),
            ]);
          }
        });
      });

      autoTable(doc, {
        startY: y,
        head: [["Ítem", "Partida", "Un.", "Cant.", "V.Unit.", "V.Contrato", "Av.%", "Acumulado", "Anterior", "Actual"]],
        body: filas,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 250, 255] },
        columnStyles: {
          0: { cellWidth: 14 },
          1: { cellWidth: 50 },
          2: { cellWidth: 12, halign: "center" },
          3: { cellWidth: 16, halign: "right" },
          4: { cellWidth: 24, halign: "right" },
          5: { cellWidth: 28, halign: "right" },
          6: { cellWidth: 16, halign: "center" },
          7: { cellWidth: 28, halign: "right" },
          8: { cellWidth: 28, halign: "right" },
          9: { cellWidth: 28, halign: "right" },
        },
      });

      // Summary table
      const summaryY = doc.lastAutoTable.finalY + 8;
      const summaryData = [
        ["TOTAL EP ACTUAL", "$" + Math.round(totalActual).toLocaleString("es-CL")],
        [`Retención (${config.retencion}%)`, "- $" + Math.round(retencionMonto).toLocaleString("es-CL")],
        ...(reajusteMonto !== 0 ? [[`Reajuste (${config.reajuste}%)`, (reajusteMonto >= 0 ? "+ " : "- ") + "$" + Math.round(Math.abs(reajusteMonto)).toLocaleString("es-CL")]] : []),
        ...(anticipoMonto > 0 ? [["Descuento anticipo", "- $" + Math.round(anticipoMonto).toLocaleString("es-CL")]] : []),
        ["NETO A PAGAR", "$" + Math.round(netoAPagar).toLocaleString("es-CL")],
      ];

      autoTable(doc, {
        startY: summaryY,
        body: summaryData,
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 45, halign: "right" } },
        bodyStyles: { fillColor: false },
        didParseCell: (data) => {
          if (data.row.index === summaryData.length - 1) {
            data.cell.styles.fillColor = [67, 56, 202];
            data.cell.styles.textColor = 255;
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fontSize = 11;
          }
        },
        margin: { left: W - 130 },
        tableWidth: 115,
      });

      // Signatures area
      const sigY = Math.max(doc.lastAutoTable.finalY + 20, H - 40);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      // ITO
      doc.line(30, sigY, 100, sigY);
      doc.setFontSize(8); doc.setTextColor(80, 80, 80); doc.setFont("helvetica", "normal");
      doc.text("ITO / Inspector Técnico", 65, sigY + 5, { align: "center" });
      doc.text(obra?.ito || "", 65, sigY + 10, { align: "center" });
      // Contratista
      doc.line(130, sigY, 200, sigY);
      doc.text("Contratista", 165, sigY + 5, { align: "center" });
      doc.text(obra?.contratista || "", 165, sigY + 10, { align: "center" });
      // Mandante
      doc.line(220, sigY, 290, sigY);
      doc.text("Mandante / Unidad Técnica", 255, sigY + 5, { align: "center" });
      doc.text(obra?.mandante || "", 255, sigY + 10, { align: "center" });

      // Footer
      const totalPags = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPags; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text("Generado por APUdesk · apudesk.vercel.app", 14, H - 5);
        doc.text(`Página ${i} de ${totalPags}`, W - 14, H - 5, { align: "right" });
      }

      doc.save(`EP_N${config.numero}_${(obra?.nombre || "obra").replace(/\s+/g, "_")}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    // Build partidas data for storage
    const partidasData = lineas.filter(l => l.montoActual > 0).map(l => ({
      id: l.id, item: l.item, partida: l.partida, unidad: l.unidad,
      cantidad: l.cantidad, precio_unitario: l.valor_unitario,
      monto_contrato: l.valor_total, avance_pct: l.avancePct,
      monto_actual: l.montoActual, monto_anterior: l.montoAnterior,
      monto_acumulado: l.montoAcumulado,
    }));

    onSave?.({
      nombre: `Estado de Pago N°${config.numero}`,
      tipo: "Estado de Pago",
      numero_estado_pago: String(config.numero),
      fecha: config.fecha,
      monto: Math.round(netoAPagar),
      observaciones: config.observaciones,
      partidas_json: JSON.stringify(partidasData),
    });
  };

  const setAllAvance = (pct) => {
    const updated = {};
    presupuesto.forEach(p => { updated[p.id] = pct; });
    setAvances(updated);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center",
      justifyContent: "center", padding: 16, backdropFilter: "blur(6px)", background: "rgba(0,0,0,.4)" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 1100,
        boxShadow: "0 24px 60px rgba(0,0,0,.25)", maxHeight: "94vh",
        display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#4338ca,#6366f1)", padding: "16px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ color: "#fff" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
              💰 Generar Estado de Pago N°{config.numero}
            </h3>
            <p style={{ fontSize: 11, opacity: 0.8, margin: "2px 0 0" }}>
              {obra?.nombre} · {presupuesto.length} partidas
            </p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.2)", border: "none",
            borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#fff" }}>✕</button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left panel - Config */}
          <div style={{ width: 280, padding: "16px 20px", overflowY: "auto",
            borderRight: "1px solid #f1f5f9", flexShrink: 0 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={labelSt}>N° Estado de Pago</label>
                <input type="number" value={config.numero}
                  onChange={e => setConfig(c => ({ ...c, numero: parseInt(e.target.value) || 1 }))}
                  style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Fecha</label>
                <input type="date" value={config.fecha}
                  onChange={e => setConfig(c => ({ ...c, fecha: e.target.value }))}
                  style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Retención (%)</label>
                <input type="number" step="0.5" value={config.retencion}
                  onChange={e => setConfig(c => ({ ...c, retencion: parseFloat(e.target.value) || 0 }))}
                  style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Reajuste (%)</label>
                <input type="number" step="0.1" value={config.reajuste}
                  onChange={e => setConfig(c => ({ ...c, reajuste: parseFloat(e.target.value) || 0 }))}
                  style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Descuento anticipo ($)</label>
                <input type="number" value={config.anticipo}
                  onChange={e => setConfig(c => ({ ...c, anticipo: parseFloat(e.target.value) || 0 }))}
                  style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Observaciones</label>
                <textarea rows={3} value={config.observaciones}
                  onChange={e => setConfig(c => ({ ...c, observaciones: e.target.value }))}
                  style={{ ...inputSt, resize: "vertical", fontFamily: "inherit" }}
                  placeholder="Notas del EP..." />
              </div>

              {/* Quick actions */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                <label style={labelSt}>Avance rápido</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[0, 25, 50, 75, 100].map(v => (
                    <button key={v} onClick={() => setAllAvance(v)}
                      style={{ background: "#f1f5f9", border: "none", borderRadius: 8,
                        padding: "5px 12px", fontSize: 11, cursor: "pointer",
                        fontWeight: 600, color: "#4338ca" }}>
                      {v}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: 14, marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8,
                  textTransform: "uppercase", letterSpacing: ".05em" }}>Resumen</div>
                {[
                  ["Contrato", fmtPeso(totalContrato)],
                  ["Acumulado", fmtPeso(totalAcumulado)],
                  ["Anterior", fmtPeso(totalAnterior)],
                  ["Este EP", fmtPeso(totalActual)],
                  [`Retención (${config.retencion}%)`, "- " + fmtPeso(retencionMonto)],
                  ...(reajusteMonto !== 0 ? [[`Reajuste`, fmtPeso(reajusteMonto)]] : []),
                  ...(anticipoMonto > 0 ? [["Anticipo", "- " + fmtPeso(anticipoMonto)]] : []),
                ].map(([k, v], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between",
                    fontSize: 12, color: "#475569", marginBottom: 4 }}>
                    <span>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between",
                  borderTop: "2px solid #6366f1", paddingTop: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#4338ca" }}>NETO A PAGAR</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#4338ca" }}>{fmtPeso(netoAPagar)}</span>
                </div>
                <div style={{ marginTop: 8, background: "#e0e7ff", borderRadius: 8, height: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, avanceGlobal)}%`,
                    background: "linear-gradient(90deg,#6366f1,#4338ca)", borderRadius: 8,
                    transition: "width .3s" }} />
                </div>
                <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, textAlign: "center", marginTop: 4 }}>
                  Avance global: {avanceGlobal.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Right panel - Partidas */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead style={{ background: "#eef2ff", position: "sticky", top: 0, zIndex: 2 }}>
                  <tr>
                    {["Ítem", "Partida", "Un.", "V. Contrato", "Av. %", "Acumulado", "Anterior", "Actual"].map((h, i) => (
                      <th key={i} style={{ padding: "8px 8px", fontWeight: 700, color: "#4338ca",
                        textAlign: i >= 3 ? "right" : "left", borderBottom: "1px solid #ddd",
                        whiteSpace: "nowrap", fontSize: 10 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...new Set(lineas.map(l => l.seccion))].map(sec => {
                    const items = lineas.filter(l => l.seccion === sec);
                    const secTotal = items.reduce((s, l) => s + l.montoActual, 0);
                    return [
                      <tr key={`sec-${sec}`} style={{ background: "#f0f4ff" }}>
                        <td colSpan={7} style={{ padding: "6px 10px", fontWeight: 700, color: "#4338ca", fontSize: 11 }}>
                          {sec}
                        </td>
                        <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: "#4338ca", fontSize: 11 }}>
                          {fmtPeso(secTotal)}
                        </td>
                      </tr>,
                      ...items.map((l, i) => (
                        <tr key={l.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa",
                          borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "5px 8px", color: "#94a3b8", fontSize: 10 }}>{l.item}</td>
                          <td style={{ padding: "5px 8px", color: "#1e293b", maxWidth: 200,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            title={l.partida}>{l.partida}</td>
                          <td style={{ padding: "5px 8px", color: "#64748b" }}>{l.unidad}</td>
                          <td style={{ padding: "5px 8px", textAlign: "right", color: "#64748b" }}>
                            {l.valor_total ? fmtPeso(l.valor_total) : "—"}
                          </td>
                          <td style={{ padding: "3px 4px", textAlign: "right" }}>
                            <input type="number" min="0" max="100" step="5"
                              value={avances[l.id] || 0}
                              onChange={e => setAvance(l.id, e.target.value)}
                              style={{ width: 52, textAlign: "right", border: "1.5px solid #e2e8f0",
                                borderRadius: 6, padding: "3px 4px", fontSize: 11, outline: "none",
                                fontFamily: "inherit",
                                background: (avances[l.id] || 0) > 0 ? "#eef2ff" : "#fff",
                                color: (avances[l.id] || 0) === 100 ? "#059669" : "#374151",
                                fontWeight: (avances[l.id] || 0) > 0 ? 700 : 400 }} />
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "right", color: "#64748b", fontSize: 11 }}>
                            {fmtPeso(l.montoAcumulado)}
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "right", color: "#94a3b8", fontSize: 11 }}>
                            {l.montoAnterior > 0 ? fmtPeso(l.montoAnterior) : "—"}
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600,
                            color: l.montoActual > 0 ? "#6366f1" : "#cbd5e1", fontSize: 11 }}>
                            {l.montoActual > 0 ? fmtPeso(l.montoActual) : "—"}
                          </td>
                        </tr>
                      ))
                    ];
                  })}
                </tbody>
                <tfoot style={{ background: "#eef2ff", borderTop: "2px solid #c7d2fe" }}>
                  <tr>
                    <td colSpan={3} style={{ padding: "8px 10px", fontWeight: 800, color: "#4338ca", fontSize: 12 }}>
                      TOTALES
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 700, color: "#4338ca", fontSize: 11 }}>
                      {fmtPeso(totalContrato)}
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 700, color: "#4338ca", fontSize: 11 }}>
                      {avanceGlobal.toFixed(1)}%
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 700, color: "#4338ca", fontSize: 11 }}>
                      {fmtPeso(totalAcumulado)}
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 700, color: "#94a3b8", fontSize: 11 }}>
                      {fmtPeso(totalAnterior)}
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 800, color: "#4338ca", fontSize: 12 }}>
                      {fmtPeso(totalActual)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", display: "flex",
          justifyContent: "space-between", alignItems: "center", background: "#f8fafc", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={generarPDF} disabled={generating || totalActual === 0}
              style={{ background: "#fff", color: "#4338ca", border: "1.5px solid #c7d2fe",
                borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 600,
                cursor: "pointer", opacity: totalActual === 0 ? 0.5 : 1 }}>
              📄 {generating ? "Generando..." : "Exportar PDF"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose}
              style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 10,
                padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            <button onClick={handleSave} disabled={totalActual === 0}
              style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10,
                padding: "8px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: totalActual === 0 ? 0.5 : 1 }}>
              💾 Guardar EP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelSt = { fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4 };
const inputSt = { width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8,
  fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" };
