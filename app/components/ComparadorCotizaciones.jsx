"use client";
import { useState, useMemo, useRef } from "react";

const fmtPeso = n => (n || n === 0) ? "$" + Math.round(n).toLocaleString("es-CL") : "—";

export default function ComparadorCotizaciones({ presupuesto, onClose }) {
  const MAX_OFERTAS = 5;
  const [ofertas, setOfertas] = useState([
    { proveedor: "", contacto: "", plazo: "", condiciones: "", precios: {} },
    { proveedor: "", contacto: "", plazo: "", condiciones: "", precios: {} },
    { proveedor: "", contacto: "", plazo: "", condiciones: "", precios: {} },
  ]);
  const [filtroSeccion, setFiltroSeccion] = useState("");
  const fileRefs = useRef([]);

  const secciones = [...new Set(presupuesto.map(p => p.seccion))];
  const items = filtroSeccion ? presupuesto.filter(p => p.seccion === filtroSeccion) : presupuesto;

  const updateOferta = (idx, field, value) => {
    setOfertas(prev => { const c = [...prev]; c[idx] = { ...c[idx], [field]: value }; return c; });
  };

  const updatePrecio = (ofertaIdx, itemId, value) => {
    setOfertas(prev => {
      const c = [...prev];
      c[ofertaIdx] = { ...c[ofertaIdx], precios: { ...c[ofertaIdx].precios, [itemId]: parseFloat(value) || 0 } };
      return c;
    });
  };

  const addOferta = () => {
    if (ofertas.length < MAX_OFERTAS) {
      setOfertas(prev => [...prev, { proveedor: "", contacto: "", plazo: "", condiciones: "", precios: {} }]);
    }
  };

  const removeOferta = (idx) => {
    if (ofertas.length > 2) setOfertas(prev => prev.filter((_, i) => i !== idx));
  };

  const importExcel = async (idx, file) => {
    if (!file) return;
    const XLSX = await import("xlsx");
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      const newPrecios = {};
      for (const row of rows) {
        const desc = (row.descripcion || row.Descripcion || row.partida || row.Partida || row.desc || "").toLowerCase().trim();
        const precio = parseFloat(row.precio_unitario || row.Precio || row.precio || row.valor_unitario || row.Valor || 0);
        if (!desc || !precio) continue;
        for (const p of presupuesto) {
          if ((p.partida || "").toLowerCase().trim() === desc) { newPrecios[p.id] = precio; break; }
        }
      }
      setOfertas(prev => {
        const c = [...prev];
        c[idx] = { ...c[idx], precios: { ...c[idx].precios, ...newPrecios } };
        return c;
      });
    };
    reader.readAsArrayBuffer(file);
  };

  // Analysis
  const analysis = useMemo(() => {
    return items.map(p => {
      const precios = ofertas.map((o, i) => ({ idx: i, precio: o.precios[p.id] || 0, proveedor: o.proveedor || `Oferta ${i + 1}` })).filter(x => x.precio > 0);
      const min = precios.length ? Math.min(...precios.map(x => x.precio)) : 0;
      const max = precios.length ? Math.max(...precios.map(x => x.precio)) : 0;
      const avg = precios.length ? precios.reduce((s, x) => s + x.precio, 0) / precios.length : 0;
      const mejor = precios.find(x => x.precio === min);
      const presupuestado = p.valor_unitario || 0;
      return { ...p, precios, min, max, avg, mejor, presupuestado, dispersion: max > 0 ? ((max - min) / avg * 100) : 0 };
    });
  }, [items, ofertas]);

  const totales = ofertas.map((o, idx) => {
    return items.reduce((s, p) => s + (o.precios[p.id] || 0) * (p.cantidad || 1), 0);
  });
  const totalPresupuesto = items.reduce((s, p) => s + (p.valor_total || 0), 0);
  const mejorTotal = Math.min(...totales.filter(t => t > 0));

  const exportarPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Cuadro Comparativo de Cotizaciones", 10, 10);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`${items.length} partidas · ${ofertas.filter(o => o.proveedor).length} proveedores`, 10, 17);

    const head = ["Partida", "Un.", "Cant.", "Presup.", ...ofertas.map((o, i) => o.proveedor || `Oferta ${i + 1}`), "Mejor"];
    const body = analysis.map(a => [
      (a.partida || "").substring(0, 30),
      a.unidad || "",
      a.cantidad || "",
      a.presupuestado ? fmtPeso(a.presupuestado) : "—",
      ...ofertas.map(o => o.precios[a.id] ? fmtPeso(o.precios[a.id]) : "—"),
      a.mejor ? `${a.mejor.proveedor} ${fmtPeso(a.min)}` : "—",
    ]);
    body.push(["TOTALES", "", "", fmtPeso(totalPresupuesto), ...totales.map(t => t > 0 ? fmtPeso(t) : "—"), fmtPeso(mejorTotal)]);

    autoTable(doc, {
      startY: 28, head: [head], body,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 255] },
      didParseCell: (data) => {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [238, 242, 255];
        }
      },
    });

    doc.save("Comparativo_Cotizaciones.pdf");
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center",
      justifyContent: "center", padding: 16, backdropFilter: "blur(6px)", background: "rgba(0,0,0,.4)" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 1200,
        boxShadow: "0 24px 60px rgba(0,0,0,.25)", maxHeight: "94vh",
        display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#4338ca,#6366f1)", padding: "16px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ color: "#fff" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>📊 Cuadro Comparativo de Cotizaciones</h3>
            <p style={{ fontSize: 11, opacity: 0.8, margin: "2px 0 0" }}>
              {items.length} partidas · Compara hasta {MAX_OFERTAS} proveedores
            </p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.2)", border: "none",
            borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#fff" }}>✕</button>
        </div>

        {/* Proveedor headers */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", overflowX: "auto", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {ofertas.map((o, idx) => (
              <div key={idx} style={{ minWidth: 160, background: "#f8fafc", borderRadius: 12, padding: 12,
                border: totales[idx] === mejorTotal && totales[idx] > 0 ? "2px solid #10b981" : "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#4338ca" }}>Oferta {idx + 1}</span>
                  {ofertas.length > 2 && (
                    <button onClick={() => removeOferta(idx)} style={{ background: "none", border: "none",
                      color: "#fca5a5", cursor: "pointer", fontSize: 12 }}>✕</button>
                  )}
                </div>
                <input value={o.proveedor} onChange={e => updateOferta(idx, "proveedor", e.target.value)}
                  placeholder="Nombre proveedor" style={inputSt} />
                <input value={o.contacto} onChange={e => updateOferta(idx, "contacto", e.target.value)}
                  placeholder="Contacto / email" style={{ ...inputSt, marginTop: 4 }} />
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  <input value={o.plazo} onChange={e => updateOferta(idx, "plazo", e.target.value)}
                    placeholder="Plazo" style={{ ...inputSt, flex: 1 }} />
                  <button onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file"; input.accept = ".xlsx,.xls";
                    input.onchange = (e) => importExcel(idx, e.target.files[0]);
                    input.click();
                  }} style={{ background: "#eef2ff", border: "none", borderRadius: 6, padding: "4px 8px",
                    fontSize: 10, cursor: "pointer", color: "#4338ca", fontWeight: 600, whiteSpace: "nowrap" }}>
                    📎 Excel
                  </button>
                </div>
                {totales[idx] > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700,
                    color: totales[idx] === mejorTotal ? "#10b981" : "#374151" }}>
                    Total: {fmtPeso(totales[idx])}
                    {totales[idx] === mejorTotal && <span style={{ fontSize: 10, marginLeft: 4 }}>✅ Mejor</span>}
                  </div>
                )}
              </div>
            ))}
            {ofertas.length < MAX_OFERTAS && (
              <button onClick={addOferta} style={{ minWidth: 100, height: 100, background: "#f8fafc",
                border: "2px dashed #cbd5e1", borderRadius: 12, cursor: "pointer", fontSize: 12,
                color: "#6366f1", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                ＋ Oferta
              </button>
            )}
          </div>
        </div>

        {/* Filter */}
        <div style={{ padding: "8px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={() => setFiltroSeccion("")}
            style={{ ...chipSt, background: !filtroSeccion ? "#6366f1" : "#f1f5f9", color: !filtroSeccion ? "#fff" : "#64748b" }}>
            Todas
          </button>
          {secciones.map(s => (
            <button key={s} onClick={() => setFiltroSeccion(s === filtroSeccion ? "" : s)}
              style={{ ...chipSt, background: filtroSeccion === s ? "#6366f1" : "#f1f5f9",
                color: filtroSeccion === s ? "#fff" : "#64748b" }}>
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 12px" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 8 }}>
              <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 2 }}>
                <tr>
                  <th style={thSt}>Partida</th>
                  <th style={{ ...thSt, textAlign: "center" }}>Un.</th>
                  <th style={{ ...thSt, textAlign: "right" }}>Presupuesto</th>
                  {ofertas.map((o, i) => (
                    <th key={i} style={{ ...thSt, textAlign: "right", minWidth: 100 }}>
                      {o.proveedor || `Oferta ${i + 1}`}
                    </th>
                  ))}
                  <th style={{ ...thSt, textAlign: "center" }}>Mejor</th>
                  <th style={{ ...thSt, textAlign: "center" }}>Dispersión</th>
                </tr>
              </thead>
              <tbody>
                {analysis.map((a, i) => (
                  <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "5px 8px", color: "#1e293b", maxWidth: 200, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.partida}>{a.partida}</td>
                    <td style={{ padding: "5px 8px", textAlign: "center", color: "#64748b" }}>{a.unidad}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#6366f1", fontWeight: 600 }}>
                      {a.presupuestado ? fmtPeso(a.presupuestado) : "—"}
                    </td>
                    {ofertas.map((o, oi) => {
                      const precio = o.precios[a.id] || 0;
                      const isBest = precio > 0 && precio === a.min;
                      const isWorst = precio > 0 && precio === a.max && a.precios.length > 1;
                      return (
                        <td key={oi} style={{ padding: "3px 4px", textAlign: "right" }}>
                          <input type="number" value={precio || ""}
                            onChange={e => updatePrecio(oi, a.id, e.target.value)}
                            style={{ width: 85, textAlign: "right", border: `1.5px solid ${isBest ? "#10b981" : isWorst ? "#ef4444" : "#e2e8f0"}`,
                              borderRadius: 6, padding: "3px 6px", fontSize: 11, outline: "none",
                              background: isBest ? "#ecfdf5" : isWorst ? "#fef2f2" : "#fff",
                              fontWeight: isBest ? 700 : 400, color: isBest ? "#059669" : isWorst ? "#dc2626" : "#374151" }} />
                        </td>
                      );
                    })}
                    <td style={{ padding: "5px 8px", textAlign: "center", fontSize: 10 }}>
                      {a.mejor ? (
                        <span style={{ background: "#ecfdf5", color: "#059669", padding: "2px 8px",
                          borderRadius: 99, fontWeight: 700 }}>
                          {a.mejor.proveedor?.substring(0, 10) || `O${a.mejor.idx + 1}`}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "center" }}>
                      {a.dispersion > 0 ? (
                        <span style={{ fontSize: 10, fontWeight: 600,
                          color: a.dispersion > 30 ? "#ef4444" : a.dispersion > 15 ? "#f59e0b" : "#10b981" }}>
                          {a.dispersion.toFixed(0)}%
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", display: "flex",
          justifyContent: "space-between", alignItems: "center", background: "#f8fafc", flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Presupuesto: <strong style={{ color: "#6366f1" }}>{fmtPeso(totalPresupuesto)}</strong>
            {mejorTotal > 0 && mejorTotal < Infinity && (
              <> · Mejor oferta: <strong style={{ color: "#10b981" }}>{fmtPeso(mejorTotal)}</strong>
                {totalPresupuesto > 0 && (
                  <span style={{ color: mejorTotal < totalPresupuesto ? "#10b981" : "#ef4444" }}>
                    {" "}({((mejorTotal - totalPresupuesto) / totalPresupuesto * 100).toFixed(1)}%)
                  </span>
                )}
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={exportarPDF}
              style={{ background: "#fff", color: "#4338ca", border: "1.5px solid #c7d2fe",
                borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              📄 Exportar PDF
            </button>
            <button onClick={onClose}
              style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 10,
                padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputSt = { width: "100%", padding: "5px 8px", border: "1px solid #e2e8f0", borderRadius: 6,
  fontSize: 11, outline: "none", boxSizing: "border-box" };
const chipSt = { padding: "4px 10px", borderRadius: 8, border: "none", fontSize: 10, fontWeight: 600, cursor: "pointer" };
const thSt = { padding: "8px 8px", fontWeight: 700, color: "#64748b", textAlign: "left",
  borderBottom: "1px solid #e2e8f0", fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap" };
