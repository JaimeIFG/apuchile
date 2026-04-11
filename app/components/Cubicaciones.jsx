"use client";
import { useState, useEffect, useCallback } from "react";

const emptyLine = () => ({
  descripcion: "",
  n: 1,
  largo: 0,
  ancho: 0,
  alto: 0,
});

function calcSubtotal(line) {
  const dims = [line.largo, line.ancho, line.alto].filter((v) => v > 0);
  if (dims.length === 0) return 0;
  return (line.n || 1) * dims.reduce((a, b) => a * b, 1);
}

function formulaStr(line) {
  const parts = [];
  if ((line.n || 1) !== 1) parts.push(line.n);
  [line.largo, line.ancho, line.alto].forEach((v) => {
    if (v > 0) parts.push(v.toFixed(2));
  });
  if (parts.length === 0) return "—";
  const sub = calcSubtotal(line);
  return parts.join(" × ") + " = " + sub.toFixed(2);
}

export default function Cubicaciones({ partida, onSave, onClose }) {
  const nombre = partida?.descripcion || partida?.desc || "";

  const [lines, setLines] = useState(() => {
    if (partida?.cubicaciones?.length) {
      return partida.cubicaciones.map((c) => ({ ...emptyLine(), ...c }));
    }
    return [emptyLine()];
  });

  const total = lines.reduce((s, l) => s + calcSubtotal(l), 0);

  const update = (idx, field, raw) => {
    setLines((prev) => {
      const next = [...prev];
      const val = field === "descripcion" ? raw : parseFloat(raw) || 0;
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (idx) =>
    setLines((p) => (p.length <= 1 ? p : p.filter((_, i) => i !== idx)));

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

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            📐 Cubicación — {nombre}
          </span>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Table */}
        <div style={s.body}>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Descripción", "N°", "Largo", "Ancho", "Alto", "Subtotal", "Fórmula", ""].map(
                    (h, i) => (
                      <th key={i} style={s.th}>
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx}>
                    <td style={s.td}>
                      <input
                        style={{ ...s.input, width: 120 }}
                        value={line.descripcion}
                        onChange={(e) => update(idx, "descripcion", e.target.value)}
                        placeholder="Ej: Muro norte"
                      />
                    </td>
                    {["n", "largo", "ancho", "alto"].map((f) => (
                      <td key={f} style={s.td}>
                        <input
                          style={{ ...s.input, width: 58, textAlign: "right" }}
                          type="number"
                          step="any"
                          min="0"
                          value={line[f] || ""}
                          onChange={(e) => update(idx, f, e.target.value)}
                        />
                      </td>
                    ))}
                    <td style={{ ...s.td, fontWeight: 600, textAlign: "right", fontSize: 12 }}>
                      {calcSubtotal(line).toFixed(2)}
                    </td>
                    <td style={{ ...s.td, fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
                      {formulaStr(line)}
                    </td>
                    <td style={s.td}>
                      <button style={s.delBtn} onClick={() => removeLine(idx)}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add line */}
          <button style={s.addBtn} onClick={addLine}>
            + Agregar línea
          </button>

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
            Guardar
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
    maxWidth: 700,
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
