"use client";
import { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";

export default function ComparadorOfertas({ partidas = [], onClose, onSave }) {
  const fileInputRefs = [useRef(null), useRef(null), useRef(null)];
  const [ofertas, setOfertas] = useState([
    { proveedor: "", fecha: "", precios: {} },
    { proveedor: "", fecha: "", precios: {} },
    { proveedor: "", fecha: "", precios: {} },
  ]);

  const getDesc = (p) => p.descripcion || p.partida || p.desc || "";

  const updateOferta = (idx, field, value) => {
    setOfertas((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const updatePrecio = (ofertaIdx, partidaId, value) => {
    setOfertas((prev) => {
      const copy = [...prev];
      copy[ofertaIdx] = {
        ...copy[ofertaIdx],
        precios: { ...copy[ofertaIdx].precios, [partidaId]: value },
      };
      return copy;
    });
  };

  const importExcel = (ofertaIdx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      const newPrecios = {};
      for (const row of rows) {
        const rowDesc = (
          row.descripcion ||
          row.Descripcion ||
          row.partida ||
          row.Partida ||
          row.desc ||
          row.Desc ||
          ""
        ).toLowerCase().trim();
        const precio =
          parseFloat(row.precio_unitario || row.Precio || row.precio || row.valor_unitario || row.Valor || 0);
        if (!rowDesc || !precio) continue;
        for (const p of partidas) {
          if (getDesc(p).toLowerCase().trim() === rowDesc) {
            newPrecios[p.id] = precio;
            break;
          }
        }
      }
      setOfertas((prev) => {
        const copy = [...prev];
        copy[ofertaIdx] = {
          ...copy[ofertaIdx],
          precios: { ...copy[ofertaIdx].precios, ...newPrecios },
        };
        return copy;
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const analysis = useMemo(() => {
    return partidas.map((p) => {
      const prices = ofertas.map((o) => {
        const v = parseFloat(o.precios[p.id]);
        return isNaN(v) || v <= 0 ? null : v;
      });
      const valid = prices.filter((v) => v !== null);
      const best = valid.length > 0 ? Math.min(...valid) : null;
      const worst = valid.length > 1 ? Math.max(...valid) : null;
      const diffPct =
        best !== null && worst !== null && worst > 0
          ? (((worst - best) / worst) * 100).toFixed(1)
          : null;
      return { partida: p, prices, best, worst, diffPct };
    });
  }, [partidas, ofertas]);

  const totals = useMemo(() => {
    const perOferta = ofertas.map((o, i) =>
      partidas.reduce((sum, p) => {
        const v = parseFloat(o.precios[p.id]);
        const cant = parseFloat(p.cantidad) || 0;
        return sum + (isNaN(v) ? 0 : v * cant);
      }, 0)
    );
    const bestTotal = analysis.reduce((sum, a) => {
      if (a.best === null) return sum;
      const cant = parseFloat(a.partida.cantidad) || 0;
      return sum + a.best * cant;
    }, 0);
    const worstTotal = perOferta.length > 0 ? Math.max(...perOferta.filter((t) => t > 0), 0) : 0;
    const savingsPct =
      worstTotal > 0 ? (((worstTotal - bestTotal) / worstTotal) * 100).toFixed(1) : "0.0";
    return { perOferta, bestTotal, worstTotal, savingsPct };
  }, [analysis, ofertas, partidas]);

  const handleSave = () => {
    const bestPrecios = {};
    for (const a of analysis) {
      if (a.best !== null) {
        bestPrecios[a.partida.id] = a.best;
      }
    }
    onSave?.(bestPrecios);
  };

  const fmt = (n) =>
    n != null
      ? n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
      : "-";

  const thStyle = {
    padding: "8px 10px",
    textAlign: "left",
    color: "#fff",
    background: "#6366f1",
    position: "sticky",
    top: 0,
    zIndex: 2,
    fontSize: 13,
    whiteSpace: "nowrap",
  };
  const tdStyle = { padding: "6px 10px", borderBottom: "1px solid #e5e7eb", fontSize: 13 };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 1200,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            📊 Comparación de Ofertas
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            ✕
          </button>
        </div>

        {/* Provider inputs */}
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "12px 20px",
            borderBottom: "1px solid #e5e7eb",
            flexWrap: "wrap",
          }}
        >
          {ofertas.map((o, i) => (
            <div
              key={i}
              style={{
                flex: "1 1 200px",
                padding: 10,
                background: "#f9fafb",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#6366f1" }}>
                Oferta {i + 1}
              </div>
              <input
                type="text"
                placeholder="Nombre proveedor"
                value={o.proveedor}
                onChange={(e) => updateOferta(i, "proveedor", e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 13,
                  marginBottom: 6,
                  boxSizing: "border-box",
                }}
              />
              <input
                type="date"
                value={o.fecha}
                onChange={(e) => updateOferta(i, "fecha", e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 13,
                  marginBottom: 6,
                  boxSizing: "border-box",
                }}
              />
              <input
                ref={fileInputRefs[i]}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={(e) => {
                  importExcel(i, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInputRefs[i].current?.click()}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  background: "#eef2ff",
                  color: "#6366f1",
                  border: "1px solid #c7d2fe",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                📥 Importar Excel
              </button>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 900,
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Partida</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Ud.</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Cant.</th>
                {ofertas.map((o, i) => (
                  <th key={i} style={{ ...thStyle, textAlign: "center" }}>
                    {o.proveedor || `Oferta ${i + 1}`}
                  </th>
                ))}
                <th style={{ ...thStyle, textAlign: "center", background: "#059669" }}>
                  Mejor
                </th>
                <th style={{ ...thStyle, textAlign: "center" }}>Dif %</th>
              </tr>
            </thead>
            <tbody>
              {analysis.map((a, ri) => (
                <tr key={a.partida.id} style={{ background: ri % 2 === 0 ? "#fff" : "#f9fafb" }}>
                  <td style={{ ...tdStyle, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {getDesc(a.partida)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{a.partida.unidad || "-"}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{a.partida.cantidad ?? "-"}</td>
                  {a.prices.map((price, oi) => {
                    const isBest = price !== null && price === a.best;
                    const isWorst = price !== null && a.worst !== null && price === a.worst && a.best !== a.worst;
                    return (
                      <td
                        key={oi}
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                          background: isBest ? "#dcfce7" : isWorst ? "#fee2e2" : undefined,
                          fontWeight: isBest ? 700 : 400,
                        }}
                      >
                        <input
                          type="number"
                          min="0"
                          value={ofertas[oi].precios[a.partida.id] ?? ""}
                          onChange={(e) => updatePrecio(oi, a.partida.id, e.target.value)}
                          placeholder="-"
                          style={{
                            width: 90,
                            padding: "4px 6px",
                            border: "1px solid #d1d5db",
                            borderRadius: 4,
                            fontSize: 13,
                            textAlign: "right",
                            background: "transparent",
                          }}
                        />
                      </td>
                    );
                  })}
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      fontWeight: 700,
                      color: "#059669",
                    }}
                  >
                    {a.best !== null ? fmt(a.best) : "-"}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      color: a.diffPct && parseFloat(a.diffPct) > 0 ? "#dc2626" : "#6b7280",
                    }}
                  >
                    {a.diffPct !== null ? `${a.diffPct}%` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "2px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            {totals.perOferta.map((t, i) => (
              <div
                key={i}
                style={{
                  padding: "6px 14px",
                  background: "#fff",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "#6b7280" }}>
                  {ofertas[i].proveedor || `Oferta ${i + 1}`}:{" "}
                </span>
                <strong>{fmt(t)}</strong>
              </div>
            ))}
            <div
              style={{
                padding: "6px 14px",
                background: "#dcfce7",
                borderRadius: 8,
                border: "1px solid #bbf7d0",
                fontSize: 13,
              }}
            >
              <span style={{ color: "#059669" }}>Mejor total: </span>
              <strong style={{ color: "#059669" }}>{fmt(totals.bestTotal)}</strong>
            </div>
            <div
              style={{
                padding: "6px 14px",
                background: "#fef9c3",
                borderRadius: 8,
                border: "1px solid #fde68a",
                fontSize: 13,
              }}
            >
              Ahorro: <strong>{totals.savingsPct}%</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 20px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                background: "#fff",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Cerrar
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: "8px 20px",
                border: "none",
                borderRadius: 8,
                background: "#6366f1",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Seleccionar mejor oferta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
