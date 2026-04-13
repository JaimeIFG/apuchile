"use client";
import { useState, useRef, useCallback, useEffect } from "react";

const TOOLS = [
  { id: "line", icon: "📏", label: "Línea", desc: "Medir distancia entre 2 puntos" },
  { id: "area", icon: "⬜", label: "Área", desc: "Medir área de polígono" },
  { id: "count", icon: "#️⃣", label: "Contar", desc: "Contar elementos" },
];

export default function MedidorPlano({ onClose, onSaveMedicion }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const [tool, setTool] = useState("line");
  const [scale, setScale] = useState(null); // pixels per meter
  const [calibrating, setCalibrating] = useState(false);
  const [calibPoints, setCalibPoints] = useState([]);
  const [calibDist, setCalibDist] = useState("");
  const [points, setPoints] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [counts, setCounts] = useState([]);

  const handleFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgDims({ w: img.width, h: img.height });
      setImgSrc(url);
      imgRef.current = img;
    };
    img.src = url;
  };

  const getCanvasPoint = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }, [zoom, pan]);

  const dist = (a, b) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

  const handleClick = useCallback((e) => {
    if (e.button !== 0) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;

    if (calibrating) {
      const next = [...calibPoints, pt];
      setCalibPoints(next);
      if (next.length === 2) {
        // Wait for distance input
      }
      return;
    }

    if (tool === "count") {
      setCounts(prev => [...prev, pt]);
      return;
    }

    if (tool === "line") {
      const next = [...points, pt];
      setPoints(next);
      if (next.length === 2) {
        const pxDist = dist(next[0], next[1]);
        const realDist = scale ? (pxDist / scale) : pxDist;
        setMeasurements(prev => [...prev, {
          type: "line", points: next, pxDist, realDist,
          label: scale ? `${realDist.toFixed(2)} m` : `${pxDist.toFixed(0)} px`,
        }]);
        setPoints([]);
      }
    } else if (tool === "area") {
      setPoints(prev => [...prev, pt]);
    }
  }, [calibrating, calibPoints, tool, points, scale, getCanvasPoint]);

  const finishArea = () => {
    if (points.length < 3) return;
    // Shoelace formula
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    const realArea = scale ? (area / (scale * scale)) : area;
    setMeasurements(prev => [...prev, {
      type: "area", points: [...points], pxArea: area, realArea,
      label: scale ? `${realArea.toFixed(2)} m²` : `${area.toFixed(0)} px²`,
    }]);
    setPoints([]);
  };

  const confirmCalibration = () => {
    if (calibPoints.length === 2 && calibDist > 0) {
      const pxd = dist(calibPoints[0], calibPoints[1]);
      setScale(pxd / parseFloat(calibDist));
      setCalibrating(false);
      setCalibPoints([]);
      // Recalculate existing measurements
      setMeasurements(prev => prev.map(m => {
        const s = pxd / parseFloat(calibDist);
        if (m.type === "line") {
          const rd = m.pxDist / s;
          return { ...m, realDist: rd, label: `${rd.toFixed(2)} m` };
        }
        if (m.type === "area") {
          const ra = m.pxArea / (s * s);
          return { ...m, realArea: ra, label: `${ra.toFixed(2)} m²` };
        }
        return m;
      }));
    }
  };

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgSrc) return;
    const ctx = canvas.getContext("2d");
    const img = imgRef.current;
    if (!img) return;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Draw measurements
    measurements.forEach(m => {
      ctx.strokeStyle = m.type === "area" ? "#6366f1" : "#ef4444";
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([]);

      if (m.type === "line") {
        ctx.beginPath();
        ctx.moveTo(m.points[0].x, m.points[0].y);
        ctx.lineTo(m.points[1].x, m.points[1].y);
        ctx.stroke();
        // Endpoints
        m.points.forEach(p => {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4 / zoom, 0, Math.PI * 2);
          ctx.fill();
        });
        // Label
        const mx = (m.points[0].x + m.points[1].x) / 2;
        const my = (m.points[0].y + m.points[1].y) / 2;
        ctx.fillStyle = "#fff";
        ctx.fillRect(mx - 30 / zoom, my - 10 / zoom, 60 / zoom, 16 / zoom);
        ctx.fillStyle = "#ef4444";
        ctx.font = `bold ${12 / zoom}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(m.label, mx, my + 3 / zoom);
      }

      if (m.type === "area") {
        ctx.beginPath();
        m.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = "rgba(99,102,241,0.15)";
        ctx.fill();
        ctx.stroke();
        // Label at centroid
        const cx = m.points.reduce((s, p) => s + p.x, 0) / m.points.length;
        const cy = m.points.reduce((s, p) => s + p.y, 0) / m.points.length;
        ctx.fillStyle = "#fff";
        ctx.fillRect(cx - 30 / zoom, cy - 10 / zoom, 60 / zoom, 16 / zoom);
        ctx.fillStyle = "#6366f1";
        ctx.font = `bold ${12 / zoom}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(m.label, cx, cy + 3 / zoom);
      }
    });

    // Current points being drawn
    if (points.length > 0) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.beginPath();
      points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      points.forEach(p => {
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath(); ctx.arc(p.x, p.y, 4 / zoom, 0, Math.PI * 2); ctx.fill();
      });
    }

    // Calibration points
    if (calibPoints.length > 0) {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      calibPoints.forEach(p => {
        ctx.fillStyle = "#10b981";
        ctx.beginPath(); ctx.arc(p.x, p.y, 5 / zoom, 0, Math.PI * 2); ctx.fill();
      });
      if (calibPoints.length === 2) {
        ctx.beginPath();
        ctx.moveTo(calibPoints[0].x, calibPoints[0].y);
        ctx.lineTo(calibPoints[1].x, calibPoints[1].y);
        ctx.stroke();
      }
    }

    // Count markers
    counts.forEach((p, i) => {
      ctx.fillStyle = "#ec4899";
      ctx.beginPath(); ctx.arc(p.x, p.y, 8 / zoom, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${10 / zoom}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), p.x, p.y + 3 / zoom);
    });

    ctx.restore();
  }, [imgSrc, zoom, pan, measurements, points, calibPoints, counts]);

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.1, Math.min(10, z * delta)));
  };

  // Pan with middle/right click
  const handleMouseDown = (e) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const handleMouseMove = (e) => {
    if (dragging && dragStart) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };
  const handleMouseUp = () => { setDragging(false); setDragStart(null); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "#1e1e2e", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{ background: "#2d2d44", padding: "8px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>📐 Medidor de Planos</span>
        <div style={{ width: 1, height: 24, background: "#444" }} />

        {!imgSrc ? (
          <button onClick={() => {
            const input = document.createElement("input");
            input.type = "file"; input.accept = "image/*,.pdf";
            input.onchange = (e) => handleFile(e.target.files[0]);
            input.click();
          }} style={btnSt}>📎 Cargar plano (imagen)</button>
        ) : (
          <>
            {TOOLS.map(t => (
              <button key={t.id} onClick={() => { setTool(t.id); setPoints([]); }}
                title={t.desc}
                style={{ ...btnSt, background: tool === t.id ? "#6366f1" : "#3d3d5c",
                  color: tool === t.id ? "#fff" : "#94a3b8" }}>
                {t.icon} {t.label}
              </button>
            ))}
            <div style={{ width: 1, height: 24, background: "#444" }} />
            <button onClick={() => { setCalibrating(true); setCalibPoints([]); setCalibDist(""); }}
              style={{ ...btnSt, background: calibrating ? "#10b981" : "#3d3d5c",
                color: calibrating ? "#fff" : "#94a3b8" }}>
              📏 Calibrar escala
            </button>
            {scale && (
              <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>
                ✓ 1m = {scale.toFixed(0)}px
              </span>
            )}
            <div style={{ width: 1, height: 24, background: "#444" }} />
            <button onClick={() => setZoom(z => z * 1.2)} style={btnSt}>🔍+</button>
            <button onClick={() => setZoom(z => Math.max(0.1, z * 0.8))} style={btnSt}>🔍-</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={btnSt}>↺ Reset</button>
            {tool === "area" && points.length >= 3 && (
              <button onClick={finishArea} style={{ ...btnSt, background: "#6366f1", color: "#fff" }}>
                ✓ Cerrar área
              </button>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />
        <button onClick={() => {
          if (onSaveMedicion && measurements.length > 0) {
            onSaveMedicion(measurements.map(m => ({ type: m.type, label: m.label, value: m.type === "line" ? m.realDist : m.realArea })));
          }
          onClose();
        }} style={{ ...btnSt, background: "#ef4444", color: "#fff" }}>✕ Cerrar</button>
      </div>

      {/* Calibration dialog */}
      {calibrating && calibPoints.length === 2 && (
        <div style={{ background: "#2d2d44", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #444" }}>
          <span style={{ color: "#10b981", fontSize: 12, fontWeight: 600 }}>Ingresa la distancia real entre los 2 puntos:</span>
          <input type="number" step="0.01" value={calibDist}
            onChange={e => setCalibDist(e.target.value)}
            placeholder="Metros"
            style={{ width: 100, padding: "5px 8px", borderRadius: 6, border: "1px solid #10b981",
              background: "#1e1e2e", color: "#fff", fontSize: 13, outline: "none" }} />
          <span style={{ color: "#94a3b8", fontSize: 12 }}>metros</span>
          <button onClick={confirmCalibration} disabled={!calibDist || parseFloat(calibDist) <= 0}
            style={{ ...btnSt, background: "#10b981", color: "#fff" }}>✓ Confirmar</button>
          <button onClick={() => { setCalibrating(false); setCalibPoints([]); }}
            style={btnSt}>Cancelar</button>
        </div>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Canvas */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", cursor: dragging ? "grabbing" : "crosshair" }}
          onContextMenu={e => e.preventDefault()}>
          {!imgSrc ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", color: "#64748b" }}>
                <div style={{ fontSize: 60, marginBottom: 16 }}>📐</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Carga un plano para comenzar a medir</div>
                <div style={{ fontSize: 13 }}>Formatos: JPG, PNG, BMP</div>
                <div style={{ fontSize: 11, marginTop: 8, color: "#94a3b8" }}>
                  1. Calibra la escala con una medida conocida<br/>
                  2. Mide distancias y áreas con las herramientas
                </div>
              </div>
            </div>
          ) : (
            <canvas ref={canvasRef}
              onClick={handleClick}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{ width: "100%", height: "100%" }} />
          )}
        </div>

        {/* Sidebar - measurements */}
        {imgSrc && (
          <div style={{ width: 240, background: "#2d2d44", borderLeft: "1px solid #444",
            overflowY: "auto", padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
              📋 Mediciones ({measurements.length + (counts.length > 0 ? 1 : 0)})
            </div>

            {measurements.map((m, i) => (
              <div key={i} style={{ background: "#3d3d5c", borderRadius: 8, padding: "8px 10px",
                marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>
                    {m.type === "line" ? "📏" : "⬜"} {m.label}
                  </div>
                  <div style={{ fontSize: 9, color: "#94a3b8" }}>
                    {m.type === "line" ? "Distancia" : "Área"}
                  </div>
                </div>
                <button onClick={() => setMeasurements(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>✕</button>
              </div>
            ))}

            {counts.length > 0 && (
              <div style={{ background: "#3d3d5c", borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>
                  #️⃣ Conteo: {counts.length} elementos
                </div>
                <button onClick={() => setCounts([])}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 10, marginTop: 4 }}>
                  Limpiar conteo
                </button>
              </div>
            )}

            {measurements.length === 0 && counts.length === 0 && (
              <div style={{ textAlign: "center", padding: 20, color: "#64748b", fontSize: 11 }}>
                {calibrating
                  ? "Haz clic en 2 puntos de distancia conocida"
                  : scale
                    ? "Haz clic para medir"
                    : "Calibra la escala primero"}
              </div>
            )}

            <div style={{ marginTop: 12, padding: "8px 10px", background: "#1e1e2e", borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>Controles:</div>
              <div style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1.8 }}>
                🖱️ Clic = Medir punto<br/>
                ⇧+Clic / Medio = Mover plano<br/>
                Scroll = Zoom<br/>
                {tool === "area" && "Clic cerrar = Finalizar área"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const btnSt = { background: "#3d3d5c", color: "#94a3b8", border: "none", borderRadius: 8,
  padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
