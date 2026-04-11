"use client";

import { useMemo } from "react";

function formatCLP(n) {
  if (n == null || isNaN(n)) return "$0";
  return "$" + Math.round(n).toLocaleString("es-CL");
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function getColor(value) {
  if (value >= 1) return "#22c55e";
  if (value >= 0.9) return "#eab308";
  return "#ef4444";
}

function getLabel(value, goodWord, badWord) {
  if (value >= 1) return goodWord;
  if (value >= 0.9) return "Precaucion";
  return badWord;
}

function CircularGauge({ value, color, size = 90, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = clamp(value, 0, 2);
  const offset = circumference - (pct / 2) * circumference;

  return (
    <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 16, fontWeight: 700, fill: color }}
      >
        {value.toFixed(2)}
      </text>
    </svg>
  );
}

function MainCard({ title, icon, value, description, color, children }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 20,
        textAlign: "center",
        flex: "1 1 0",
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{title}</div>
      {children}
      <div style={{ fontSize: 12, color, marginTop: 8, fontWeight: 600 }}>
        {description}
      </div>
    </div>
  );
}

function SmallCard({ title, icon, value, description }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 16,
        minWidth: 140,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{description}</div>
    </div>
  );
}

export default function IndicadoresEVM({
  fechaInicio,
  fechaTermino,
  montoContrato,
  pagos = [],
  presupuesto = [],
}) {
  const metrics = useMemo(() => {
    const now = new Date();
    const start = new Date(fechaInicio);
    const end = new Date(fechaTermino);
    const totalDuration = end - start;
    const elapsed = now - start;

    // BAC: Budget at Completion
    const BAC =
      presupuesto.length > 0
        ? presupuesto.reduce((s, p) => s + (p.valor_total || 0), 0)
        : montoContrato || 0;

    // Planned % complete (linear time-based)
    let plannedPct = 0;
    if (totalDuration > 0) {
      plannedPct = clamp(elapsed / totalDuration, 0, 1);
    }

    // Actual cost
    const AC = pagos.reduce((s, p) => s + (p.monto || 0), 0);

    // Actual % complete: prefer avance_pct from presupuesto, fallback to pagos/BAC
    let actualPct = 0;
    const itemsWithProgress = presupuesto.filter(
      (p) => p.avance_pct != null && p.avance_pct !== undefined
    );
    if (itemsWithProgress.length > 0 && BAC > 0) {
      const weightedSum = itemsWithProgress.reduce(
        (s, p) => s + (p.avance_pct / 100) * (p.valor_total || 0),
        0
      );
      actualPct = weightedSum / BAC;
    } else if (BAC > 0) {
      actualPct = clamp(AC / BAC, 0, 1);
    }

    const PV = BAC * plannedPct;
    const EV = BAC * actualPct;
    const SV = EV - PV;
    const CV = EV - AC;
    const SPI = PV > 0 ? EV / PV : actualPct > 0 ? 1 : 0;
    const CPI = AC > 0 ? EV / AC : EV > 0 ? 1 : 0;
    const EAC = CPI > 0 ? BAC / CPI : BAC;
    const ETC = Math.max(EAC - AC, 0);

    return {
      BAC, PV, EV, AC, SV, CV, SPI, CPI, EAC, ETC,
      plannedPct, actualPct,
    };
  }, [fechaInicio, fechaTermino, montoContrato, pagos, presupuesto]);

  const { PV, EV, AC, SV, CV, SPI, CPI, EAC, ETC, actualPct } = metrics;

  const spiColor = getColor(SPI);
  const cpiColor = getColor(CPI);
  const avancePct = Math.round(actualPct * 100);
  const avanceColor = avancePct >= 100 ? "#22c55e" : avancePct >= 50 ? "#3b82f6" : "#eab308";

  return (
    <div>
      {/* Main metric cards */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <MainCard
          title="SPI - Indice de Plazo"
          icon={"\u23F1\uFE0F"}
          color={spiColor}
          description={getLabel(SPI, "Adelantado", "Atrasado")}
        >
          <CircularGauge value={SPI} color={spiColor} />
        </MainCard>

        <MainCard
          title="CPI - Indice de Costo"
          icon={"\uD83D\uDCB0"}
          color={cpiColor}
          description={getLabel(CPI, "Bajo presupuesto", "Sobre presupuesto")}
        >
          <CircularGauge value={CPI} color={cpiColor} />
        </MainCard>

        <MainCard
          title="Avance Real"
          icon={"\uD83D\uDCC8"}
          color={avanceColor}
          description={`${avancePct}% completado`}
        >
          <CircularGauge value={actualPct * 2} color={avanceColor} />
          <div style={{ fontSize: 22, fontWeight: 700, color: avanceColor, marginTop: 4 }}>
            {avancePct}%
          </div>
        </MainCard>
      </div>

      {/* Small metric cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <SmallCard
          icon={"\uD83D\uDCCA"}
          title="PV - Valor Planificado"
          value={formatCLP(PV)}
          description="Valor del trabajo planificado a la fecha"
        />
        <SmallCard
          icon={"\u2705"}
          title="EV - Valor Ganado"
          value={formatCLP(EV)}
          description="Valor del trabajo realmente ejecutado"
        />
        <SmallCard
          icon={"\uD83D\uDCB8"}
          title="AC - Costo Real"
          value={formatCLP(AC)}
          description="Total pagado a la fecha"
        />
        <SmallCard
          icon={SV >= 0 ? "\uD83D\uDFE2" : "\uD83D\uDD34"}
          title="SV - Variacion de Plazo"
          value={formatCLP(SV)}
          description={SV >= 0 ? "Adelantado en plazo" : "Atrasado en plazo"}
        />
        <SmallCard
          icon={CV >= 0 ? "\uD83D\uDFE2" : "\uD83D\uDD34"}
          title="CV - Variacion de Costo"
          value={formatCLP(CV)}
          description={CV >= 0 ? "Bajo presupuesto" : "Sobre presupuesto"}
        />
        <SmallCard
          icon={"\uD83C\uDFAF"}
          title="EAC - Estimacion al Termino"
          value={formatCLP(EAC)}
          description="Costo total estimado del proyecto"
        />
      </div>
    </div>
  );
}
