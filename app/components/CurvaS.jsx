"use client";

import { useMemo } from "react";

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function monthsBetween(start, end) {
  const months = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

function formatMonth(d) {
  const names = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${names[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

function formatCurrency(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function CurvaS({
  fechaInicio,
  fechaTermino,
  montoContrato,
  pagos = [],
  presupuesto = [],
}) {
  const data = useMemo(() => {
    const start = parseDate(fechaInicio);
    const end = parseDate(fechaTermino);
    if (!start || !end || start >= end) return null;

    const total = montoContrato || presupuesto.reduce((s, b) => s + (b.valor_total || 0), 0);
    if (!total || total <= 0) return null;

    const months = monthsBetween(start, end);
    if (months.length < 2) return null;

    // Planned: linear 0 -> 100%
    const planned = months.map((_, i) => (i / (months.length - 1)) * 100);

    // Actual: cumulative payments mapped to months
    const pagosSorted = [...pagos]
      .map((p) => ({ ...p, date: parseDate(p.fecha) }))
      .filter((p) => p.date)
      .sort((a, b) => a.date - b.date);

    let cumulative = 0;
    const actual = months.map((m) => {
      const monthEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59);
      while (pagosSorted.length && pagosSorted[0].date <= monthEnd) {
        cumulative += pagosSorted.shift().monto || 0;
      }
      return Math.min((cumulative / total) * 100, 100);
    });

    // Current date index (fractional)
    const now = new Date();
    const startMs = months[0].getTime();
    const endMs = months[months.length - 1].getTime();
    let nowFraction = null;
    if (now >= months[0] && now <= months[months.length - 1]) {
      nowFraction = (now.getTime() - startMs) / (endMs - startMs);
    }

    return { months, planned, actual, total, nowFraction };
  }, [fechaInicio, fechaTermino, montoContrato, pagos, presupuesto]);

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400 text-sm">
        Sin datos suficientes para generar la Curva S.
      </div>
    );
  }

  const { months, planned, actual, total, nowFraction } = data;

  // Chart dimensions inside the SVG
  const W = 800;
  const H = 400;
  const PAD = { top: 50, right: 80, bottom: 60, left: 60 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const x = (i) => PAD.left + (i / (months.length - 1)) * cw;
  const y = (pct) => PAD.top + ch - (pct / 100) * ch;

  const toPath = (arr) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const plannedPath = toPath(planned);
  const actualPath = toPath(actual);

  // Build fill polygons between the two curves, segment by segment
  const fillSegments = [];
  for (let i = 0; i < months.length - 1; i++) {
    const ahead = actual[i] >= planned[i] && actual[i + 1] >= planned[i + 1];
    const behind = actual[i] <= planned[i] && actual[i + 1] <= planned[i + 1];
    let color;
    if (ahead) color = "rgba(34,197,94,0.18)";
    else if (behind) color = "rgba(239,68,68,0.18)";
    else color = "rgba(99,102,241,0.08)";
    const pts = [
      `${x(i).toFixed(1)},${y(planned[i]).toFixed(1)}`,
      `${x(i + 1).toFixed(1)},${y(planned[i + 1]).toFixed(1)}`,
      `${x(i + 1).toFixed(1)},${y(actual[i + 1]).toFixed(1)}`,
      `${x(i).toFixed(1)},${y(actual[i]).toFixed(1)}`,
    ];
    fillSegments.push(
      <polygon key={`fill-${i}`} points={pts.join(" ")} fill={color} />
    );
  }

  // Y-axis ticks
  const yTicks = [0, 20, 40, 60, 80, 100];

  // X-axis: show every label or skip if too many
  const step = months.length > 18 ? 3 : months.length > 10 ? 2 : 1;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Legend */}
        <g transform={`translate(${PAD.left}, 16)`}>
          <line x1="0" y1="8" x2="24" y2="8" stroke="#6366f1" strokeWidth="2.5" />
          <text x="28" y="12" fontSize="11" fill="#6366f1" fontFamily="sans-serif">
            Planificado
          </text>
          <line x1="110" y1="8" x2="134" y2="8" stroke="#22c55e" strokeWidth="2.5" />
          <text x="138" y="12" fontSize="11" fill="#22c55e" fontFamily="sans-serif">
            Real (adelanto)
          </text>
          <line x1="250" y1="8" x2="274" y2="8" stroke="#ef4444" strokeWidth="2.5" />
          <text x="278" y="12" fontSize="11" fill="#ef4444" fontFamily="sans-serif">
            Real (atraso)
          </text>
        </g>

        {/* Grid + Y-axis */}
        {yTicks.map((t) => (
          <g key={`y-${t}`}>
            <line
              x1={PAD.left}
              y1={y(t)}
              x2={W - PAD.right}
              y2={y(t)}
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
            <text
              x={PAD.left - 6}
              y={y(t) + 4}
              textAnchor="end"
              fontSize="10"
              fill="#9ca3af"
              fontFamily="sans-serif"
            >
              {t}%
            </text>
            <text
              x={W - PAD.right + 6}
              y={y(t) + 4}
              textAnchor="start"
              fontSize="9"
              fill="#9ca3af"
              fontFamily="sans-serif"
            >
              {formatCurrency((t / 100) * total)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {months.map((m, i) =>
          i % step === 0 ? (
            <g key={`x-${i}`}>
              <line
                x1={x(i)}
                y1={PAD.top}
                x2={x(i)}
                y2={PAD.top + ch}
                stroke="#f3f4f6"
                strokeWidth="0.5"
              />
              <text
                x={x(i)}
                y={PAD.top + ch + 16}
                textAnchor="middle"
                fontSize="9"
                fill="#9ca3af"
                fontFamily="sans-serif"
                transform={`rotate(-45, ${x(i)}, ${PAD.top + ch + 16})`}
              >
                {formatMonth(m)}
              </text>
            </g>
          ) : null
        )}

        {/* Area fills */}
        {fillSegments}

        {/* Planned line */}
        <path d={plannedPath} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="6 3" />

        {/* Actual line */}
        <path d={actualPath} fill="none" stroke={
          actual[actual.length - 1] >= planned[planned.length - 1] ? "#22c55e" : "#ef4444"
        } strokeWidth="2.5" />

        {/* Data points on actual */}
        {actual.map((v, i) =>
          v > 0 ? (
            <g key={`pt-${i}`}>
              <circle
                cx={x(i)}
                cy={y(v)}
                r="3"
                fill={v >= planned[i] ? "#22c55e" : "#ef4444"}
                stroke="white"
                strokeWidth="1"
              />
              <title>
                {formatMonth(months[i])}: {v.toFixed(1)}% ({formatCurrency((v / 100) * total)})
              </title>
            </g>
          ) : null
        )}

        {/* Data points on planned */}
        {planned.map((v, i) => (
          <g key={`pp-${i}`}>
            <circle cx={x(i)} cy={y(v)} r="2" fill="#6366f1" stroke="white" strokeWidth="0.5" />
            <title>
              Planificado {formatMonth(months[i])}: {v.toFixed(1)}%
            </title>
          </g>
        ))}

        {/* Current date indicator */}
        {nowFraction !== null && (
          <g>
            <line
              x1={PAD.left + nowFraction * cw}
              y1={PAD.top}
              x2={PAD.left + nowFraction * cw}
              y2={PAD.top + ch}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={PAD.left + nowFraction * cw}
              y={PAD.top - 4}
              textAnchor="middle"
              fontSize="9"
              fill="#f59e0b"
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              Hoy
            </text>
          </g>
        )}

        {/* Border */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={cw}
          height={ch}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );
}
