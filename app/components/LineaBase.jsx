"use client";
import { useState, useEffect } from "react";

export default function LineaBase({ proyecto, cfg, calcAPU, proyectoId, onGuardarBase }) {
  const [baseline, setBaseline] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const storageKey = `apudesk_baseline_${proyectoId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setBaseline(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  const calcPrice = (p) => {
    try {
      const r = calcAPU(p, cfg);
      return r?.total ?? 0;
    } catch {
      return 0;
    }
  };

  const guardarBase = () => {
    const data = {
      timestamp: Date.now(),
      cfg: { ...cfg },
      partidas: (proyecto || []).map((p) => ({
        id: p.id,
        descripcion: p.descripcion || p.desc || "",
        cantidad: Number(p.cantidad) || 0,
        precio: calcPrice(p),
      })),
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
    setBaseline(data);
    if (onGuardarBase) onGuardarBase(data);
  };

  const eliminarBase = () => {
    localStorage.removeItem(storageKey);
    setBaseline(null);
  };

  const fmtNum = (n) =>
    Number(n || 0).toLocaleString("es-CL", { maximumFractionDigits: 0 });

  const fmtPct = (n) =>
    (Number(n) || 0).toLocaleString("es-CL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + "%";

  const fmtDate = (ts) => {
    const d = new Date(ts);
    const pad = (v) => String(v).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const rows = baseline
    ? (proyecto || []).map((p) => {
        const id = p.id;
        const bp = baseline.partidas.find((b) => b.id === id);
        const baseQty = bp?.cantidad ?? 0;
        const actualQty = Number(p.cantidad) || 0;
        const basePrice = bp?.precio ?? 0;
        const actualPrice = calcPrice(p);
        const dQty = actualQty - baseQty;
        const dPrice = actualPrice - basePrice;
        const dPct = basePrice !== 0 ? (dPrice / basePrice) * 100 : 0;
        return {
          descripcion: p.descripcion || p.desc || bp?.descripcion || "",
          baseQty,
          actualQty,
          dQty,
          basePrice,
          actualPrice,
          dPrice,
          dPct,
        };
      })
    : [];

  const totalBase = rows.reduce((s, r) => s + r.basePrice * r.baseQty, 0);
  const totalActual = rows.reduce((s, r) => s + r.actualPrice * r.actualQty, 0);
  const totalDiff = totalActual - totalBase;
  const totalPct = totalBase !== 0 ? (totalDiff / totalBase) * 100 : 0;

  const rowBg = (r) => {
    if (r.dPrice < 0) return "#dcfce7";
    if (r.dPrice > 0) return "#fee2e2";
    if (r.dQty !== 0) return "#fef9c3";
    return undefined;
  };

  const s = {
    card: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      cursor: "pointer",
      userSelect: "none",
    },
    title: { fontSize: 18, fontWeight: 700, color: "#1e1b4b" },
    btn: {
      padding: "8px 16px",
      borderRadius: 8,
      border: "none",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 13,
      color: "#fff",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13,
      marginTop: 12,
    },
    th: {
      textAlign: "left",
      padding: "8px 6px",
      borderBottom: "2px solid #6366f1",
      color: "#6366f1",
      fontWeight: 700,
      fontSize: 12,
      whiteSpace: "nowrap",
    },
    td: { padding: "6px 6px", borderBottom: "1px solid #f3f4f6" },
    date: { fontSize: 13, color: "#6b7280", marginTop: 8 },
  };

  return (
    <div style={s.card}>
      <div style={s.header} onClick={() => setExpanded(!expanded)}>
        <span style={s.title}>{expanded ? "▾" : "▸"} \ud83d\udccf L\u00ednea Base</span>
        {!expanded && baseline && (
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            Base guardada: {fmtDate(baseline.timestamp)}
          </span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              style={{ ...s.btn, background: "#6366f1" }}
              onClick={guardarBase}
            >
              {baseline ? "Actualizar L\u00ednea Base" : "Guardar L\u00ednea Base"}
            </button>
            {baseline && (
              <button
                style={{ ...s.btn, background: "#ef4444" }}
                onClick={eliminarBase}
              >
                Eliminar L\u00ednea Base
              </button>
            )}
          </div>

          {baseline && (
            <>
              <p style={s.date}>
                L\u00ednea base guardada el: {fmtDate(baseline.timestamp)}
              </p>

              <div style={{ overflowX: "auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {[
                        "Partida",
                        "Base Qty",
                        "Actual Qty",
                        "\u0394 Qty",
                        "Base Price",
                        "Actual Price",
                        "\u0394 Price",
                        "\u0394 %",
                      ].map((h) => (
                        <th key={h} style={s.th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={i}
                        style={{
                          background:
                            rowBg(r) ||
                            (i % 2 === 0 ? "#f9fafb" : "#fff"),
                        }}
                      >
                        <td style={s.td}>{r.descripcion}</td>
                        <td style={{ ...s.td, textAlign: "right" }}>
                          {fmtNum(r.baseQty)}
                        </td>
                        <td style={{ ...s.td, textAlign: "right" }}>
                          {fmtNum(r.actualQty)}
                        </td>
                        <td
                          style={{
                            ...s.td,
                            textAlign: "right",
                            fontWeight: r.dQty !== 0 ? 700 : 400,
                          }}
                        >
                          {r.dQty > 0 ? "+" : ""}
                          {fmtNum(r.dQty)}
                        </td>
                        <td style={{ ...s.td, textAlign: "right" }}>
                          ${fmtNum(r.basePrice)}
                        </td>
                        <td style={{ ...s.td, textAlign: "right" }}>
                          ${fmtNum(r.actualPrice)}
                        </td>
                        <td
                          style={{
                            ...s.td,
                            textAlign: "right",
                            fontWeight: 700,
                            color:
                              r.dPrice < 0
                                ? "#16a34a"
                                : r.dPrice > 0
                                  ? "#dc2626"
                                  : "#374151",
                          }}
                        >
                          {r.dPrice > 0 ? "+" : ""}${fmtNum(r.dPrice)}
                        </td>
                        <td
                          style={{
                            ...s.td,
                            textAlign: "right",
                            fontWeight: 700,
                            color:
                              r.dPct < 0
                                ? "#16a34a"
                                : r.dPct > 0
                                  ? "#dc2626"
                                  : "#374151",
                          }}
                        >
                          {r.dPct > 0 ? "+" : ""}
                          {fmtPct(r.dPct)}
                        </td>
                      </tr>
                    ))}
                    <tr
                      style={{
                        background: "#eef2ff",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      <td style={s.td}>TOTAL</td>
                      <td style={s.td} />
                      <td style={s.td} />
                      <td style={s.td} />
                      <td style={{ ...s.td, textAlign: "right" }}>
                        ${fmtNum(totalBase)}
                      </td>
                      <td style={{ ...s.td, textAlign: "right" }}>
                        ${fmtNum(totalActual)}
                      </td>
                      <td
                        style={{
                          ...s.td,
                          textAlign: "right",
                          color:
                            totalDiff < 0
                              ? "#16a34a"
                              : totalDiff > 0
                                ? "#dc2626"
                                : "#374151",
                        }}
                      >
                        {totalDiff > 0 ? "+" : ""}${fmtNum(totalDiff)}
                      </td>
                      <td
                        style={{
                          ...s.td,
                          textAlign: "right",
                          color:
                            totalPct < 0
                              ? "#16a34a"
                              : totalPct > 0
                                ? "#dc2626"
                                : "#374151",
                        }}
                      >
                        {totalPct > 0 ? "+" : ""}
                        {fmtPct(totalPct)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
