"use client";
import { useState, useMemo, useEffect } from "react";

const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#3b82f6",
];

const fmtFecha = d => d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) : "—";

export default function GanttObra({ obra, presupuesto }) {
  const fechaInicio = obra?.fecha_inicio ? new Date(obra.fecha_inicio) : new Date();
  const plazoDias = obra?.plazo_dias || 180;
  const [hoveredId, setHoveredId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [items, setItems] = useState([]);

  // Build base items from presupuesto sections
  const baseItems = useMemo(() => {
    const secciones = [...new Set(presupuesto.map(p => p.seccion))];
    const totalItems = secciones.length;
    if (totalItems === 0) return [];
    const durPorItem = Math.max(7, Math.floor(plazoDias / totalItems));
    let offset = 0;
    return secciones.map((sec, idx) => {
      const partidasSec = presupuesto.filter(p => p.seccion === sec);
      const montoSec = partidasSec.reduce((s, p) => s + (p.valor_total || 0), 0);
      const item = {
        id: idx,
        label: sec,
        start: offset,
        duration: durPorItem,
        color: COLORS[idx % COLORS.length],
        monto: montoSec,
        partidas: partidasSec.length,
      };
      offset += Math.floor(durPorItem * 0.7);
      return item;
    });
  }, [presupuesto, plazoDias]);

  // Initialize items from presupuesto (only once when data arrives)
  useEffect(() => {
    if (baseItems.length > 0 && items.length === 0) {
      setItems(baseItems);
    }
  }, [baseItems.length]);

  const updateItem = (id, field, rawVal) => {
    const value = (field === "start" || field === "duration") ? Math.max(0, parseInt(rawVal) || 0) : rawVal;
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const addItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 0;
    setItems(prev => [...prev, {
      id: newId,
      label: "Nueva tarea",
      start: 0,
      duration: 14,
      color: COLORS[newId % COLORS.length],
      monto: 0,
      partidas: 0,
    }]);
  };

  const removeItem = id => setItems(prev => prev.filter(it => it.id !== id));

  const totalDias = plazoDias;
  const PX_PER_DAY = Math.max(2, Math.min(8, 800 / totalDias));
  const CHART_W = totalDias * PX_PER_DAY;
  const ROW_H = 36;
  const LABEL_W = 200;

  const weeks = useMemo(() => {
    const w = [];
    for (let d = 0; d < totalDias; d += 7) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fecha.getDate() + d);
      w.push({ day: d, label: fmtFecha(fecha) });
    }
    return w;
  }, [totalDias, fechaInicio]);

  const hoy = Math.floor((new Date() - fechaInicio) / 86400000);

  const exportarPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(67, 56, 202);
    doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Carta Gantt", 10, 10);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(obra?.nombre || "Obra", 10, 17);
    doc.text(`Plazo: ${plazoDias} días · Inicio: ${fmtFecha(obra?.fecha_inicio)}`, W - 10, 10, { align: "right" });
    const LEFT = 70; const BAR_AREA = W - LEFT - 10; const ROW = 7; let y = 28;
    doc.setFillColor(245, 247, 250); doc.rect(0, y, W, 7, "F");
    doc.setTextColor(100, 100, 100); doc.setFontSize(6.5); doc.setFont("helvetica", "bold");
    doc.text("Sección", 3, y + 4.5);
    const pxD = BAR_AREA / totalDias;
    weeks.forEach(w => {
      const x = LEFT + w.day * pxD;
      if (x > W - 5) return;
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2);
      doc.line(x, y, x, y + 7 + items.length * ROW + 4);
      doc.setFontSize(5); doc.setFont("helvetica", "normal"); doc.setTextColor(140, 140, 140);
      doc.text(w.label, x + 1, y + 4.5);
    });
    y += 7;
    items.forEach((item, idx) => {
      const iy = y + idx * ROW;
      if (idx % 2 === 0) { doc.setFillColor(252, 252, 252); doc.rect(0, iy, W, ROW, "F"); }
      doc.setTextColor(50, 50, 50); doc.setFontSize(6); doc.setFont("helvetica", "normal");
      doc.text(item.label.substring(0, 35), 3, iy + ROW * 0.65);
      const bx = LEFT + item.start * pxD;
      const bw = Math.max(item.duration * pxD, 2);
      const rgb = hexToRgb(item.color);
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.roundedRect(bx, iy + 1.5, bw, ROW - 3, 1, 1, "F");
      doc.setFontSize(5); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
      if (bw > 15) doc.text(`${item.duration}d`, bx + bw / 2, iy + ROW * 0.6, { align: "center" });
    });
    doc.setFontSize(7); doc.setTextColor(160, 160, 160);
    doc.text("Generado por APUdesk", 14, 205);
    doc.save(`Gantt_${(obra?.nombre || "obra").replace(/\s+/g, "_")}.pdf`);
  };

  if (items.length === 0 && baseItems.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
        <div style={{ fontSize: 14 }}>Importa un presupuesto para generar la Carta Gantt automáticamente</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", margin: 0 }}>📅 Carta Gantt</h2>
          <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
            {items.length} tareas · {plazoDias} días de plazo
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setEditMode(e => !e)}
            style={{ background: editMode ? "#6366f1" : "#fff", color: editMode ? "#fff" : "#6366f1",
              border: "1.5px solid #c7d2fe", borderRadius: 10, padding: "8px 16px",
              fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {editMode ? "✅ Guardar vista" : "✏️ Editar tareas"}
          </button>
          <button onClick={exportarPDF}
            style={{ background: "#fff", color: "#4338ca", border: "1.5px solid #c7d2fe",
              borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* Edit mode table */}
      {editMode && (
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16,
          overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Editar tareas del Gantt</span>
            <button onClick={addItem}
              style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8,
                padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              ＋ Agregar tarea
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  {["Color", "Nombre de tarea", "Inicio (día)", "Duración (días)", ""].map((h, i) => (
                    <th key={i} style={{ padding: "8px 12px", fontWeight: 700, color: "#64748b",
                      borderBottom: "1px solid #e2e8f0", textAlign: "left", fontSize: 10,
                      textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9",
                    background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "6px 12px" }}>
                      <input type="color" value={item.color}
                        onChange={e => updateItem(item.id, "color", e.target.value)}
                        style={{ width: 32, height: 28, border: "1px solid #e2e8f0",
                          borderRadius: 6, cursor: "pointer", padding: 2 }} />
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      <input value={item.label}
                        onChange={e => updateItem(item.id, "label", e.target.value)}
                        style={{ width: "100%", minWidth: 160, border: "1px solid #e2e8f0",
                          borderRadius: 6, padding: "4px 8px", fontSize: 12, color: "#1e293b" }} />
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      <input type="number" value={item.start} min={0} max={totalDias}
                        onChange={e => updateItem(item.id, "start", e.target.value)}
                        style={{ width: 80, border: "1px solid #e2e8f0", borderRadius: 6,
                          padding: "4px 8px", fontSize: 12 }} />
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      <input type="number" value={item.duration} min={1} max={totalDias}
                        onChange={e => updateItem(item.id, "duration", e.target.value)}
                        style={{ width: 80, border: "1px solid #e2e8f0", borderRadius: 6,
                          padding: "4px 8px", fontSize: 12 }} />
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      <button onClick={() => removeItem(item.id)}
                        style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca",
                          borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer",
                          fontWeight: 600 }}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gantt chart */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", minWidth: LABEL_W + CHART_W + 20 }}>
            {/* Labels column */}
            <div style={{ width: LABEL_W, flexShrink: 0, borderRight: "1px solid #e2e8f0" }}>
              <div style={{ height: 32, background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", padding: "0 12px",
                fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Sección / Tarea
              </div>
              {items.map((item, idx) => (
                <div key={item.id}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ height: ROW_H, display: "flex", alignItems: "center", padding: "0 12px",
                    background: hoveredId === item.id ? "#eef2ff" : idx % 2 === 0 ? "#fff" : "#fafafa",
                    borderBottom: "1px solid #f1f5f9", transition: "background .1s", cursor: "default" }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: item.color, marginRight: 8, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap" }}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Chart area */}
            <div style={{ flex: 1, position: "relative" }}>
              <div style={{ height: 32, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", position: "relative" }}>
                {weeks.map((w, i) => (
                  <div key={i} style={{ position: "absolute", left: w.day * PX_PER_DAY,
                    fontSize: 9, color: "#94a3b8", top: 10, whiteSpace: "nowrap" }}>
                    {w.label}
                  </div>
                ))}
              </div>
              {items.map((item, idx) => (
                <div key={item.id} style={{ height: ROW_H, position: "relative",
                  background: hoveredId === item.id ? "#eef2ff" : idx % 2 === 0 ? "#fff" : "#fafafa",
                  borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}>
                  {weeks.map((w, i) => (
                    <div key={i} style={{ position: "absolute", left: w.day * PX_PER_DAY,
                      top: 0, bottom: 0, width: 1, background: "#f1f5f9" }} />
                  ))}
                  <div style={{
                    position: "absolute",
                    left: item.start * PX_PER_DAY,
                    top: 6,
                    height: ROW_H - 12,
                    width: Math.max(item.duration * PX_PER_DAY, 4),
                    background: `linear-gradient(135deg, ${item.color}, ${item.color}dd)`,
                    borderRadius: 6,
                    boxShadow: hoveredId === item.id ? `0 2px 8px ${item.color}44` : "none",
                    transition: "box-shadow .15s",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                  }}>
                    <span style={{ fontSize: 10, color: "#fff", fontWeight: 700, whiteSpace: "nowrap", padding: "0 6px" }}>
                      {item.duration * PX_PER_DAY > 40 ? `${item.duration}d` : ""}
                    </span>
                  </div>
                  {hoy >= 0 && hoy <= totalDias && (
                    <div style={{ position: "absolute", left: hoy * PX_PER_DAY, top: 0, bottom: 0,
                      width: 2, background: "#ef4444", zIndex: 5, opacity: 0.6 }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, padding: "8px 12px",
        background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        {hoy >= 0 && hoy <= totalDias && (
          <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>▎Hoy (día {hoy})</span>
        )}
        <span style={{ fontSize: 11, color: "#64748b" }}>
          Inicio: {fmtFecha(obra?.fecha_inicio)} · Plazo: {plazoDias} días · Término: {fmtFecha(obra?.fecha_termino_contractual)}
        </span>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 100, g: 100, b: 241 };
}
