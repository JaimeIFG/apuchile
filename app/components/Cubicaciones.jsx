"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

const emptyLine = () => ({
  descripcion: "",
  recinto: "",
  n: 1,
  largo: 0,
  ancho: 0,
  alto: 0,
  formula: "",
  negativo: false,
});

// Safe formula evaluator (only math ops, no eval)
function evalFormula(expr) {
  if (!expr || typeof expr !== "string") return null;
  const clean = expr.replace(/\s/g, "").replace(/,/g, ".");
  // Only allow numbers, operators, parentheses, and decimal points
  if (!/^[\d.+\-*/()]+$/.test(clean)) return null;
  try {
    // Use Function constructor (safer than eval, no access to scope)
    const fn = new Function(`"use strict"; return (${clean});`);
    const result = fn();
    return typeof result === "number" && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function calcSubtotal(line) {
  // If formula is provided, use it
  if (line.formula) {
    const val = evalFormula(line.formula);
    if (val !== null) return line.negativo ? -Math.abs(val) : val;
  }
  const dims = [line.largo, line.ancho, line.alto].filter((v) => v > 0);
  if (dims.length === 0) return 0;
  const result = (line.n || 1) * dims.reduce((a, b) => a * b, 1);
  return line.negativo ? -result : result;
}

function formulaStr(line) {
  if (line.formula) {
    const val = evalFormula(line.formula);
    return val !== null ? `${line.formula} = ${val.toFixed(2)}` : `${line.formula} (error)`;
  }
  const parts = [];
  if ((line.n || 1) !== 1) parts.push(line.n);
  [line.largo, line.ancho, line.alto].forEach((v) => {
    if (v > 0) parts.push(v.toFixed(2));
  });
  if (parts.length === 0) return "—";
  const sub = calcSubtotal(line);
  const prefix = line.negativo ? "−" : "";
  return prefix + parts.join(" × ") + " = " + sub.toFixed(2);
}

export default function Cubicaciones({ partida, onSave, onClose }) {
  const nombre = partida?.descripcion || partida?.desc || "";

  const [lines, setLines] = useState(() => {
    if (partida?.cubicaciones?.length) {
      return partida.cubicaciones.map((c) => ({ ...emptyLine(), ...c }));
    }
    return [emptyLine()];
  });

  const [vistaRecinto, setVistaRecinto] = useState(false);

  const total = lines.reduce((s, l) => s + calcSubtotal(l), 0);

  // Group by recinto
  const recintos = useMemo(() => {
    const groups = {};
    lines.forEach((l, idx) => {
      const r = l.recinto || "Sin recinto";
      if (!groups[r]) groups[r] = { lines: [], indices: [], subtotal: 0 };
      groups[r].lines.push(l);
      groups[r].indices.push(idx);
      groups[r].subtotal += calcSubtotal(l);
    });
    return groups;
  }, [lines]);

  const update = (idx, field, raw) => {
    setLines((prev) => {
      const next = [...prev];
      let val;
      if (field === "descripcion" || field === "recinto" || field === "formula") val = raw;
      else if (field === "negativo") val = raw;
      else val = parseFloat(raw) || 0;
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const addLine = (recinto = "") => setLines((p) => [...p, { ...emptyLine(), recinto }]);
  const removeLine = (idx) =>
    setLines((p) => (p.length <= 1 ? p : p.filter((_, i) => i !== idx)));
  const duplicateLine = (idx) =>
    setLines((p) => {
      const copy = { ...p[idx], descripcion: p[idx].descripcion + " (copia)" };
      const next = [...p];
      next.splice(idx + 1, 0, copy);
      return next;
    });

  const handleSave = () => {
    onSave?.(partida?.id, lines, total);
  };

  // close on Escape
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const s = styles;

  const renderRow = (line, idx) => (
    <tr key={idx} style={line.negativo ? { background: "#fef2f2" } : {}}>
      <td style={s.td}>
        <input
          style={{ ...s.input, width: 90 }}
          value={line.descripcion}
          onChange={(e) => update(idx, "descripcion", e.target.value)}
          placeholder="Ej: Muro norte"
        />
      </td>
      {!vistaRecinto && (
        <td style={s.td}>
          <input
            style={{ ...s.input, width: 70 }}
            value={line.recinto || ""}
            onChange={(e) => update(idx, "recinto", e.target.value)}
            placeholder="Recinto"
          />
        </td>
      )}
      {["n", "largo", "ancho", "alto"].map((f) => (
        <td key={f} style={s.td}>
          <input
            style={{ ...s.input, width: 52, textAlign: "right" }}
            type="number"
            step="any"
            min="0"
            value={line[f] || ""}
            onChange={(e) => update(idx, f, e.target.value)}
          />
        </td>
      ))}
      <td style={s.td}>
        <input
          style={{ ...s.input, width: 90, fontFamily: "monospace", fontSize: 11 }}
          value={line.formula || ""}
          onChange={(e) => update(idx, "formula", e.target.value)}
          placeholder="3.5*2.8-0.9*2.1"
          title="Fórmula: usa +, -, *, /, paréntesis"
        />
      </td>
      <td style={{ ...s.td, fontWeight: 600, textAlign: "right", fontSize: 12, color: line.negativo ? "#dc2626" : "#1e293b" }}>
        {calcSubtotal(line).toFixed(2)}
      </td>
      <td style={{ ...s.td, fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
        {formulaStr(line)}
      </td>
      <td style={{ ...s.td, display: "flex", gap: 2 }}>
        <button
          style={{ ...s.iconBtn, color: line.negativo ? "#dc2626" : "#94a3b8" }}
          onClick={() => update(idx, "negativo", !line.negativo)}
          title={line.negativo ? "Línea negativa (descuento)" : "Marcar como descuento"}
        >
          ±
        </button>
        <button style={{ ...s.iconBtn, color: "#6366f1" }} onClick={() => duplicateLine(idx)} title="Duplicar">
          ⧉
        </button>
        <button style={s.delBtn} onClick={() => removeLine(idx)}>
          ×
        </button>
      </td>
    </tr>
  );

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700 }}>
              📐 Cubicación — {nombre}
            </span>
            <span style={{ fontSize: 11, opacity: 0.8, marginLeft: 8 }}>
              ({partida?.unidad || "u"})
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              style={{ ...s.toggleBtn, background: vistaRecinto ? "rgba(255,255,255,0.25)" : "transparent" }}
              onClick={() => setVistaRecinto(!vistaRecinto)}
              title="Agrupar por recinto"
            >
              🏠
            </button>
            <button style={s.closeBtn} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={s.body}>
          {vistaRecinto ? (
            // Vista agrupada por recinto
            Object.entries(recintos).map(([recinto, group]) => (
              <div key={recinto} style={{ marginBottom: 16 }}>
                <div style={s.recintoHeader}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>🏠 {recinto}</span>
                  <span style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>
                    Subtotal: {group.subtotal.toFixed(2)}
                  </span>
                </div>
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {["Descripción", "N°", "Largo", "Ancho", "Alto", "Fórmula", "Subtotal", "Cálculo", ""].map(
                          (h, i) => <th key={i} style={s.th}>{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {group.indices.map(idx => renderRow(lines[idx], idx))}
                    </tbody>
                  </table>
                </div>
                <button style={s.addBtn} onClick={() => addLine(recinto)}>
                  + Agregar línea en {recinto}
                </button>
              </div>
            ))
          ) : (
            // Vista plana
            <>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["Descripción", "Recinto", "N°", "Largo", "Ancho", "Alto", "Fórmula", "Subtotal", "Cálculo", ""].map(
                        (h, i) => <th key={i} style={s.th}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => renderRow(line, idx))}
                  </tbody>
                </table>
              </div>
              <button style={s.addBtn} onClick={() => addLine()}>
                + Agregar línea
              </button>
            </>
          )}

          {/* Tips */}
          <div style={s.tips}>
            <strong>Tips:</strong> Usa <code style={s.code}>Fórmula</code> para expresiones como <code style={s.code}>3.5*2.8-0.9*2.1</code> (muro menos vano).
            Marca con <code style={s.code}>±</code> para descuentos (valores negativos).
            Agrupa por <code style={s.code}>Recinto</code> para organizar por espacio.
          </div>

          {/* Total */}
          <div style={s.totalRow}>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              TOTAL ({partida?.unidad || "u"})
            </span>
            <span style={s.totalValue}>{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onClose}>
            Cancelar
          </button>
          <button style={s.saveBtn} onClick={handleSave}>
            💾 Guardar cubicación
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.4)",
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
    width: "95%",
    maxWidth: 900,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "#fff",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: 18,
    cursor: "pointer",
    lineHeight: 1,
  },
  toggleBtn: {
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: 8,
    padding: "4px 8px",
    color: "#fff",
    fontSize: 14,
    cursor: "pointer",
    lineHeight: 1,
  },
  body: {
    padding: "16px 20px",
    overflowY: "auto",
    flex: 1,
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
  th: {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    color: "#64748b",
    padding: "6px 4px",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "4px",
    verticalAlign: "middle",
  },
  input: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "5px 8px",
    fontSize: 12,
    outline: "none",
    transition: "border-color 0.15s",
  },
  delBtn: {
    background: "transparent",
    border: "none",
    color: "#ef4444",
    fontSize: 16,
    cursor: "pointer",
    fontWeight: 700,
    lineHeight: 1,
  },
  iconBtn: {
    background: "transparent",
    border: "none",
    fontSize: 14,
    cursor: "pointer",
    fontWeight: 700,
    lineHeight: 1,
    padding: "2px",
  },
  addBtn: {
    marginTop: 8,
    background: "transparent",
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 12,
    color: "#6366f1",
    cursor: "pointer",
    fontWeight: 600,
  },
  recintoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    background: "#f8fafc",
    borderRadius: 8,
    marginBottom: 6,
    border: "1px solid #e2e8f0",
  },
  tips: {
    marginTop: 12,
    padding: "8px 12px",
    background: "#f0f9ff",
    borderRadius: 8,
    fontSize: 11,
    color: "#475569",
    lineHeight: 1.6,
  },
  code: {
    background: "#e0e7ff",
    padding: "1px 5px",
    borderRadius: 4,
    fontFamily: "monospace",
    fontSize: 10,
  },
  totalRow: {
    marginTop: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderTop: "2px solid #e2e8f0",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 700,
    color: "#4f46e5",
  },
  footer: {
    padding: "12px 20px",
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    borderTop: "1px solid #f1f5f9",
  },
  cancelBtn: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: 8,
    padding: "8px 18px",
    fontSize: 13,
    cursor: "pointer",
    color: "#475569",
    fontWeight: 500,
  },
  saveBtn: {
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    border: "none",
    borderRadius: 8,
    padding: "8px 22px",
    fontSize: 13,
    cursor: "pointer",
    color: "#fff",
    fontWeight: 600,
  },
};
