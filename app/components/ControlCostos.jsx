"use client";
import { useState, useMemo } from "react";

const fmtPeso = n => (n || n === 0) ? "$" + Math.round(n).toLocaleString("es-CL") : "—";
const fmtPct = n => (n || n === 0) ? n.toFixed(1) + "%" : "—";

export default function ControlCostos({ obra, presupuesto, pagos, gastos }) {
  const [viewMode, setViewMode] = useState("seccion"); // seccion | detalle

  // Group by section
  const secciones = useMemo(() => {
    const groups = {};
    presupuesto.forEach(p => {
      const sec = p.seccion || "Sin sección";
      if (!groups[sec]) groups[sec] = { items: [], venta: 0, objetivo: 0, real: 0 };
      groups[sec].items.push(p);
      groups[sec].venta += p.valor_total || 0;
      groups[sec].objetivo += p.costo_objetivo || p.valor_total || 0;
    });

    // Calculate real cost from pagos
    (pagos || []).forEach(ep => {
      if (ep.partidas_json) {
        try {
          const parts = JSON.parse(ep.partidas_json);
          parts.forEach(part => {
            const item = presupuesto.find(p => p.id === part.id);
            if (item) {
              const sec = item.seccion || "Sin sección";
              if (groups[sec]) groups[sec].real += part.monto_actual || 0;
            }
          });
        } catch {}
      }
    });

    return Object.entries(groups).map(([nombre, data]) => ({
      nombre,
      ...data,
      margenVenta: data.venta > 0 ? ((data.venta - data.objetivo) / data.venta * 100) : 0,
      margenReal: data.venta > 0 ? ((data.venta - data.real) / data.venta * 100) : 0,
      desviacion: data.objetivo > 0 ? ((data.real - data.objetivo) / data.objetivo * 100) : 0,
    }));
  }, [presupuesto, pagos]);

  const totales = useMemo(() => {
    const t = { venta: 0, objetivo: 0, real: 0 };
    secciones.forEach(s => { t.venta += s.venta; t.objetivo += s.objetivo; t.real += s.real; });
    // Add gastos de obra to costo real
    const gastosTotal = (gastos || []).reduce((s, g) => s + (g.monto || 0), 0);
    t.real += gastosTotal;
    t.gastosTotal = gastosTotal;
    t.margenVenta = t.venta > 0 ? ((t.venta - t.objetivo) / t.venta * 100) : 0;
    t.margenReal = t.venta > 0 ? ((t.venta - t.real) / t.venta * 100) : 0;
    t.desviacion = t.objetivo > 0 ? ((t.real - t.objetivo) / t.objetivo * 100) : 0;
    return t;
  }, [secciones, gastos]);

  const hasObjetivo = presupuesto.some(p => p.costo_objetivo && p.costo_objetivo !== p.valor_total);
  const hasReal = totales.real > 0;

  // Bar chart helper - max value for scaling
  const maxVal = Math.max(...secciones.map(s => Math.max(s.venta, s.objetivo, s.real)), 1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", margin: 0 }}>📊 Control de Costos</h2>
          <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
            Presupuesto venta vs. costo objetivo vs. costo real
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Presupuesto Venta", value: fmtPeso(totales.venta), color: "#6366f1", bg: "#eef2ff" },
          { label: "Costo Objetivo", value: fmtPeso(totales.objetivo), color: "#f59e0b", bg: "#fef3c7" },
          { label: "Costo Real", value: hasReal ? fmtPeso(totales.real) : "Sin datos", color: "#10b981", bg: "#ecfdf5" },
          { label: "Margen Esperado", value: fmtPct(totales.margenVenta),
            color: totales.margenVenta > 0 ? "#10b981" : "#ef4444",
            bg: totales.margenVenta > 0 ? "#ecfdf5" : "#fef2f2" },
        ].map((card, i) => (
          <div key={i} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14,
            padding: "14px 16px", borderLeft: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Comparison chart */}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>
          Comparación por Sección
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {[
            { color: "#6366f1", label: "Venta" },
            { color: "#f59e0b", label: "Objetivo" },
            ...(hasReal ? [{ color: "#10b981", label: "Real" }] : []),
          ].map(l => (
            <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>

        {secciones.map((sec, idx) => (
          <div key={sec.nombre} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{sec.nombre}</span>
              <span style={{ fontSize: 11, color: sec.desviacion > 5 ? "#ef4444" : sec.desviacion > 0 ? "#f59e0b" : "#10b981", fontWeight: 600 }}>
                {hasReal && sec.real > 0 ? `Desv: ${sec.desviacion > 0 ? "+" : ""}${sec.desviacion.toFixed(1)}%` :
                  `Margen: ${sec.margenVenta.toFixed(1)}%`}
              </span>
            </div>
            {/* Venta bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <div style={{ width: 50, fontSize: 10, color: "#94a3b8", textAlign: "right" }}>Venta</div>
              <div style={{ flex: 1, height: 14, background: "#f1f5f9", borderRadius: 7, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(sec.venta / maxVal) * 100}%`,
                  background: "#6366f1", borderRadius: 7, transition: "width .5s" }} />
              </div>
              <div style={{ width: 80, fontSize: 10, color: "#64748b", textAlign: "right" }}>{fmtPeso(sec.venta)}</div>
            </div>
            {/* Objetivo bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <div style={{ width: 50, fontSize: 10, color: "#94a3b8", textAlign: "right" }}>Objetivo</div>
              <div style={{ flex: 1, height: 14, background: "#f1f5f9", borderRadius: 7, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(sec.objetivo / maxVal) * 100}%`,
                  background: "#f59e0b", borderRadius: 7, transition: "width .5s" }} />
              </div>
              <div style={{ width: 80, fontSize: 10, color: "#64748b", textAlign: "right" }}>{fmtPeso(sec.objetivo)}</div>
            </div>
            {/* Real bar */}
            {hasReal && sec.real > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 50, fontSize: 10, color: "#94a3b8", textAlign: "right" }}>Real</div>
                <div style={{ flex: 1, height: 14, background: "#f1f5f9", borderRadius: 7, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(sec.real / maxVal) * 100}%`,
                    background: sec.real > sec.objetivo ? "#ef4444" : "#10b981",
                    borderRadius: 7, transition: "width .5s" }} />
                </div>
                <div style={{ width: 80, fontSize: 10, color: "#64748b", textAlign: "right" }}>{fmtPeso(sec.real)}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detail table */}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead style={{ background: "#f8fafc" }}>
            <tr>
              {["Sección", "P. Venta", "C. Objetivo", "Margen Est.", "C. Real", "Desviación", "Semáforo"].map((h, i) => (
                <th key={i} style={{ padding: "10px 12px", fontWeight: 700, color: "#64748b",
                  textAlign: i >= 1 ? "right" : "left", borderBottom: "1px solid #e2e8f0",
                  fontSize: 10, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {secciones.map((sec, i) => {
              const semaforo = sec.real > 0
                ? (sec.desviacion > 10 ? "🔴" : sec.desviacion > 5 ? "🟡" : "🟢")
                : "⚪";
              return (
                <tr key={sec.nombre} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa",
                  borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1e293b" }}>{sec.nombre}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#6366f1", fontWeight: 600 }}>{fmtPeso(sec.venta)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#f59e0b", fontWeight: 600 }}>{fmtPeso(sec.objetivo)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right",
                    color: sec.margenVenta > 0 ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                    {fmtPct(sec.margenVenta)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right",
                    color: sec.real > 0 ? "#374151" : "#cbd5e1", fontWeight: 600 }}>
                    {sec.real > 0 ? fmtPeso(sec.real) : "—"}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right",
                    color: sec.desviacion > 5 ? "#ef4444" : sec.desviacion > 0 ? "#f59e0b" : "#10b981", fontWeight: 700 }}>
                    {sec.real > 0 ? `${sec.desviacion > 0 ? "+" : ""}${fmtPct(sec.desviacion)}` : "—"}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center", fontSize: 16 }}>{semaforo}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot style={{ background: "#eef2ff", borderTop: "2px solid #c7d2fe" }}>
            <tr>
              <td style={{ padding: "10px 12px", fontWeight: 800, color: "#4338ca" }}>TOTALES</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#6366f1" }}>{fmtPeso(totales.venta)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#f59e0b" }}>{fmtPeso(totales.objetivo)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800,
                color: totales.margenVenta > 0 ? "#10b981" : "#ef4444" }}>{fmtPct(totales.margenVenta)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#374151" }}>
                {hasReal ? fmtPeso(totales.real) : "—"}
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800,
                color: totales.desviacion > 5 ? "#ef4444" : "#10b981" }}>
                {hasReal ? `${totales.desviacion > 0 ? "+" : ""}${fmtPct(totales.desviacion)}` : "—"}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {!hasObjetivo && (
        <div style={{ marginTop: 14, padding: "12px 16px", background: "#fef3c7", borderRadius: 12,
          border: "1px solid #fde68a", fontSize: 12, color: "#92400e" }}>
          💡 <strong>Tip:</strong> Edita el presupuesto y agrega un "Costo Objetivo" por partida para habilitar el análisis de márgenes completo.
          El costo objetivo representa tu estimación interna del costo real, vs. el precio de venta al mandante.
        </div>
      )}
    </div>
  );
}
