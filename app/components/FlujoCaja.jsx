"use client";
import { useMemo } from "react";

const fmtPeso = n => "$" + Math.round(Math.abs(n || 0)).toLocaleString("es-CL");
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default function FlujoCaja({ obra, presupuesto, pagos }) {
  const fechaInicio = obra?.fecha_inicio ? new Date(obra.fecha_inicio) : null;
  const fechaTermino = obra?.fecha_termino_contractual ? new Date(obra.fecha_termino_contractual) : null;
  const montoContrato = obra?.monto_contrato || presupuesto.reduce((s, p) => s + (p.valor_total || 0), 0);

  const data = useMemo(() => {
    if (!fechaInicio || !fechaTermino || montoContrato <= 0) return null;

    const meses = [];
    const cur = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);
    const last = new Date(fechaTermino.getFullYear(), fechaTermino.getMonth(), 1);
    while (cur <= last) {
      meses.push(new Date(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
    if (meses.length < 2) return null;

    const n = meses.length;
    // S-curve distribution (planned)
    const planificado = meses.map((_, i) => {
      const t = (i + 1) / n;
      // Sigmoid function for S-curve
      const s = 1 / (1 + Math.exp(-10 * (t - 0.5)));
      return s;
    });
    // Normalize to total
    const planMax = planificado[n - 1];
    const planMensual = planificado.map((s, i) => {
      const prev = i === 0 ? 0 : planificado[i - 1];
      return ((s - prev) / planMax) * montoContrato;
    });
    const planAcum = [];
    planMensual.reduce((acc, v) => { const next = acc + v; planAcum.push(next); return next; }, 0);

    // Real payments by month
    const realMensual = meses.map(() => 0);
    (pagos || []).forEach(p => {
      if (p.fecha && p.monto) {
        const d = new Date(p.fecha);
        const idx = meses.findIndex(m =>
          m.getFullYear() === d.getFullYear() && m.getMonth() === d.getMonth()
        );
        if (idx >= 0) realMensual[idx] += p.monto;
      }
    });
    const realAcum = [];
    realMensual.reduce((acc, v) => { const next = acc + v; realAcum.push(next); return next; }, 0);

    // Cost estimate (80% of contract as outflow)
    const costoRatio = 0.82; // typical cost/sale ratio
    const costoMensual = planMensual.map(v => v * costoRatio);
    const costoAcum = [];
    costoMensual.reduce((acc, v) => { const next = acc + v; costoAcum.push(next); return next; }, 0);

    return {
      meses,
      planMensual, planAcum,
      realMensual, realAcum,
      costoMensual, costoAcum,
      flujoCaja: meses.map((_, i) => realMensual[i] - costoMensual[i]),
    };
  }, [fechaInicio, fechaTermino, montoContrato, pagos]);

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
        <div style={{ fontSize: 14 }}>Completa la fecha de inicio, término y monto de contrato para ver el flujo de caja</div>
      </div>
    );
  }

  const { meses, planMensual, planAcum, realMensual, realAcum, costoMensual, costoAcum, flujoCaja } = data;
  const maxAcum = Math.max(...planAcum, ...realAcum, 1);
  const maxMensual = Math.max(...planMensual, ...realMensual, ...costoMensual, 1);
  const CHART_H = 200;
  const BAR_W = Math.max(16, Math.min(40, 600 / meses.length));

  // Today month index
  const hoy = new Date();
  const hoyIdx = meses.findIndex(m => m.getFullYear() === hoy.getFullYear() && m.getMonth() === hoy.getMonth());

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", margin: 0 }}>💰 Flujo de Caja</h2>
          <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
            Proyección mensual de ingresos y egresos · {meses.length} meses
          </p>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        {[
          { color: "#6366f1", label: "Planificado" },
          { color: "#10b981", label: "Ingresos reales" },
          { color: "#f59e0b", label: "Egresos estimados" },
        ].map(l => (
          <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Curva S acumulada */}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Curva S — Acumulado</div>
        <div style={{ position: "relative", height: CHART_H + 40, overflow: "hidden" }}>
          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map(pct => (
            <div key={pct} style={{ position: "absolute", left: 0, bottom: (pct / 100) * CHART_H + 20,
              fontSize: 9, color: "#94a3b8", width: 50, textAlign: "right" }}>
              {fmtPeso(maxAcum * pct / 100)}
            </div>
          ))}
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(pct => (
            <div key={`g${pct}`} style={{ position: "absolute", left: 55, right: 0,
              bottom: (pct / 100) * CHART_H + 20, height: 1, background: "#f1f5f9" }} />
          ))}

          {/* Lines - SVG */}
          <svg style={{ position: "absolute", left: 55, bottom: 20, width: `calc(100% - 55px)`, height: CHART_H }}
            viewBox={`0 0 ${meses.length * 40} ${CHART_H}`} preserveAspectRatio="none">
            {/* Planificado line */}
            <polyline fill="none" stroke="#6366f1" strokeWidth="2.5"
              points={planAcum.map((v, i) => `${i * 40 + 20},${CHART_H - (v / maxAcum) * CHART_H}`).join(" ")} />
            {/* Planificado area */}
            <polygon fill="rgba(99,102,241,0.08)"
              points={`0,${CHART_H} ${planAcum.map((v, i) => `${i * 40 + 20},${CHART_H - (v / maxAcum) * CHART_H}`).join(" ")} ${(meses.length - 1) * 40 + 20},${CHART_H}`} />
            {/* Real line */}
            {realAcum.some(v => v > 0) && (
              <>
                <polyline fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="none"
                  points={realAcum.filter((_, i) => i <= hoyIdx || realAcum[i] > 0).map((v, i) =>
                    `${i * 40 + 20},${CHART_H - (v / maxAcum) * CHART_H}`).join(" ")} />
                {realAcum.map((v, i) => v > 0 ? (
                  <circle key={i} cx={i * 40 + 20} cy={CHART_H - (v / maxAcum) * CHART_H}
                    r="4" fill="#10b981" />
                ) : null)}
              </>
            )}
            {/* Cost line */}
            <polyline fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6,4"
              points={costoAcum.map((v, i) => `${i * 40 + 20},${CHART_H - (v / maxAcum) * CHART_H}`).join(" ")} />
          </svg>

          {/* Month labels */}
          <div style={{ position: "absolute", left: 55, bottom: 0, right: 0, display: "flex" }}>
            {meses.map((m, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, color: i === hoyIdx ? "#6366f1" : "#94a3b8",
                fontWeight: i === hoyIdx ? 700 : 400 }}>
                {MESES[m.getMonth()]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly breakdown table */}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 600 }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={thSt}>Mes</th>
                <th style={{ ...thSt, textAlign: "right" }}>Planificado</th>
                <th style={{ ...thSt, textAlign: "right" }}>Ingreso Real</th>
                <th style={{ ...thSt, textAlign: "right" }}>Egreso Est.</th>
                <th style={{ ...thSt, textAlign: "right" }}>Flujo Neto</th>
                <th style={{ ...thSt, textAlign: "right" }}>Acum. Plan</th>
                <th style={{ ...thSt, textAlign: "right" }}>Acum. Real</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((m, i) => {
                const flujo = flujoCaja[i];
                const isHoy = i === hoyIdx;
                return (
                  <tr key={i} style={{ background: isHoy ? "#eef2ff" : i % 2 === 0 ? "#fff" : "#fafafa",
                    borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 12px", fontWeight: isHoy ? 700 : 500, color: isHoy ? "#4338ca" : "#374151" }}>
                      {MESES[m.getMonth()]} {m.getFullYear()}
                      {isHoy && <span style={{ fontSize: 9, color: "#6366f1", marginLeft: 6 }}>← HOY</span>}
                    </td>
                    <td style={{ padding: "7px 12px", textAlign: "right", color: "#6366f1" }}>{fmtPeso(planMensual[i])}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", color: realMensual[i] > 0 ? "#10b981" : "#cbd5e1", fontWeight: 600 }}>
                      {realMensual[i] > 0 ? fmtPeso(realMensual[i]) : "—"}
                    </td>
                    <td style={{ padding: "7px 12px", textAlign: "right", color: "#f59e0b" }}>{fmtPeso(costoMensual[i])}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 700,
                      color: flujo >= 0 ? "#10b981" : "#ef4444" }}>
                      {flujo >= 0 ? "+" : "-"}{fmtPeso(flujo)}
                    </td>
                    <td style={{ padding: "7px 12px", textAlign: "right", color: "#64748b" }}>{fmtPeso(planAcum[i])}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", color: realAcum[i] > 0 ? "#374151" : "#cbd5e1", fontWeight: 600 }}>
                      {realAcum[i] > 0 ? fmtPeso(realAcum[i]) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot style={{ background: "#eef2ff", borderTop: "2px solid #c7d2fe" }}>
              <tr>
                <td style={{ padding: "10px 12px", fontWeight: 800, color: "#4338ca" }}>TOTAL</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#6366f1" }}>{fmtPeso(montoContrato)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#10b981" }}>
                  {realAcum[realAcum.length - 1] > 0 ? fmtPeso(realAcum[realAcum.length - 1]) : "—"}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#f59e0b" }}>
                  {fmtPeso(costoAcum[costoAcum.length - 1])}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

const thSt = { padding: "10px 12px", fontWeight: 700, color: "#64748b", textAlign: "left",
  borderBottom: "1px solid #e2e8f0", fontSize: 10, textTransform: "uppercase" };
