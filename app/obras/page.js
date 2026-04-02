"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useInactividad } from "../lib/useInactividad";

const ESTADOS = ["En licitación", "En ejecución", "Paralizada", "Recepcionada", "Liquidada"];

const ESTADO_ST = {
  "En licitación":  { bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  "En ejecución":   { bg: "#d1fae5", color: "#065f46", dot: "#059669" },
  "Paralizada":     { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
  "Recepcionada":   { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  "Liquidada":      { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
};

function fmtPeso(n) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

function diasRestantes(fechaTermino) {
  if (!fechaTermino) return null;
  return Math.ceil((new Date(fechaTermino) - new Date()) / 86400000);
}

function PlazoChip({ fecha }) {
  const d = diasRestantes(fecha);
  if (d === null) return null;
  const color = d < 0 ? "#991b1b" : d <= 30 ? "#b91c1c" : d <= 60 ? "#92400e" : "#065f46";
  const bg    = d < 0 ? "#fee2e2" : d <= 30 ? "#fee2e2" : d <= 60 ? "#fef3c7" : "#d1fae5";
  const label = d < 0 ? `Vencida hace ${Math.abs(d)}d` : d === 0 ? "Vence hoy" : `${d}d restantes`;
  return (
    <span style={{ background: bg, color, fontSize: 10, fontWeight: 700,
      padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

export default function ObrasPage() {
  const router = useRouter();
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [estadoNuevo, setEstadoNuevo] = useState("En ejecución");
  const [creandoLoading, setCreandoLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  useInactividad(supabase, router, 10);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("obras").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setObras(data || []);
      setLoading(false);
    });
  }, []);

  const crearObra = async () => {
    if (!nombreNuevo.trim()) return;
    setCreandoLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("obras").insert({
      nombre: nombreNuevo.trim(),
      estado_obra: estadoNuevo,
      user_id: user.id,
    }).select().single();
    setCreandoLoading(false);
    if (!error && data) {
      setObras(p => [data, ...p]);
      setCreando(false);
      setNombreNuevo("");
      router.push(`/obra?id=${data.id}`);
    }
  };

  const eliminarObra = async (id) => {
    await supabase.from("obras").delete().eq("id", id);
    setObras(p => p.filter(o => o.id !== id));
    setConfirmarEliminar(null);
  };

  const obrasFiltradas = obras.filter(o => {
    if (filtroEstado && o.estado_obra !== filtroEstado) return false;
    if (busqueda && !o.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
        !(o.contratista || "").toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total:       obras.length,
    ejecucion:   obras.filter(o => o.estado_obra === "En ejecución").length,
    paralizadas: obras.filter(o => o.estado_obra === "Paralizada").length,
    recepcionadas: obras.filter(o => o.estado_obra === "Recepcionada").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg, #065f46, #059669)", padding: "24px 32px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button onClick={() => router.push("/dashboard")}
              style={{ background: "rgba(255,255,255,.15)", border: "none", borderRadius: 8,
                padding: "6px 12px", color: "#fff", fontSize: 12, cursor: "pointer" }}>
              ← Dashboard
            </button>
            <span style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>/</span>
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Ejecución de Obras</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-.02em" }}>
                🏗️ Ejecución de Obras
              </h1>
              <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13, margin: "4px 0 0" }}>
                Control y seguimiento de obras en ejecución
              </p>
            </div>
            <button onClick={() => setCreando(true)}
              style={{ background: "#fff", color: "#065f46", border: "none", borderRadius: 12,
                padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
              ＋ Nueva Obra
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            {[
              { label: "Total obras",       val: stats.total,         icon: "🏗️" },
              { label: "En ejecución",      val: stats.ejecucion,     icon: "⚙️" },
              { label: "Paralizadas",       val: stats.paralizadas,   icon: "⏸️" },
              { label: "Recepcionadas",     val: stats.recepcionadas, icon: "✅" },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.15)", borderRadius: 12,
                padding: "10px 16px", backdropFilter: "blur(4px)", minWidth: 120 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginBottom: 2 }}>{s.icon} {s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px" }}>

        {/* ── Filtros ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Buscar por nombre o contratista..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: "9px 14px", border: "1.5px solid #e2e8f0",
              borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none" }}
          />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            style={{ padding: "9px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10,
              fontSize: 13, fontFamily: "inherit", background: "#fff", color: "#374151", outline: "none" }}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          {(busqueda || filtroEstado) && (
            <button onClick={() => { setBusqueda(""); setFiltroEstado(""); }}
              style={{ background: "#f1f5f9", border: "none", borderRadius: 8,
                padding: "9px 14px", fontSize: 12, color: "#64748b", cursor: "pointer" }}>
              Limpiar
            </button>
          )}
        </div>

        {/* ── Lista ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontSize: 14 }}>
            Cargando obras...
          </div>
        ) : obrasFiltradas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏗️</div>
            <p style={{ color: "#94a3b8", fontSize: 15, marginBottom: 8 }}>
              {obras.length === 0 ? "No tienes obras registradas aún" : "Sin resultados con los filtros actuales"}
            </p>
            {obras.length === 0 && (
              <button onClick={() => setCreando(true)}
                style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 10,
                  padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Crear primera obra
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {obrasFiltradas.map(obra => {
              const est = ESTADO_ST[obra.estado_obra] || ESTADO_ST["En ejecución"];
              return (
                <div key={obra.id}
                  onClick={() => router.push(`/obra?id=${obra.id}`)}
                  style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16,
                    padding: "18px 22px", cursor: "pointer", transition: "box-shadow .15s, border-color .15s",
                    borderLeft: `4px solid ${est.dot}` }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.08)"; e.currentTarget.style.borderColor = est.dot; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e2e8f0"; }}>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ background: est.bg, color: est.color, fontSize: 11, fontWeight: 700,
                          padding: "3px 9px", borderRadius: 99 }}>
                          {obra.estado_obra}
                        </span>
                        {obra.region && (
                          <span style={{ fontSize: 11, color: "#64748b" }}>📍 {obra.region}</span>
                        )}
                        <PlazoChip fecha={obra.fecha_termino_contractual} />
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 4px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {obra.nombre}
                      </h3>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {obra.contratista && (
                          <span style={{ fontSize: 12, color: "#64748b" }}>🏢 {obra.contratista}</span>
                        )}
                        {obra.ito && (
                          <span style={{ fontSize: 12, color: "#64748b" }}>👤 ITO: {obra.ito}</span>
                        )}
                        {obra.monto_contrato && (
                          <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>
                            💰 {fmtPeso(obra.monto_contrato)}
                          </span>
                        )}
                        {obra.fecha_inicio && (
                          <span style={{ fontSize: 12, color: "#64748b" }}>
                            📅 Inicio: {new Date(obra.fecha_inicio).toLocaleDateString("es-CL")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/obra?id=${obra.id}`); }}
                        style={{ background: "#f0fdf4", color: "#059669", border: "1px solid #bbf7d0",
                          borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Abrir →
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmarEliminar(obra); }}
                        style={{ background: "#fff", color: "#ef4444", border: "1px solid #fca5a5",
                          borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal nueva obra ── */}
      {creando && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center",
          justifyContent: "center", padding: 16, backdropFilter: "blur(6px)", background: "rgba(0,0,0,.35)" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 440,
            boxShadow: "0 24px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", margin: "0 0 20px" }}>
              🏗️ Nueva Obra
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase",
                letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                Nombre de la obra
              </label>
              <input
                autoFocus
                value={nombreNuevo}
                onChange={e => setNombreNuevo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && crearObra()}
                placeholder="Ej: Mejoramiento veredas sector norte"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0",
                  borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase",
                letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                Estado inicial
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ESTADOS.map(e => {
                  const st = ESTADO_ST[e];
                  const active = estadoNuevo === e;
                  return (
                    <button key={e} onClick={() => setEstadoNuevo(e)}
                      style={{ padding: "6px 12px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                        border: active ? `1.5px solid ${st.dot}` : "1.5px solid #e2e8f0",
                        background: active ? st.bg : "#fff", color: active ? st.color : "#64748b",
                        cursor: "pointer", fontFamily: "inherit" }}>
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={crearObra} disabled={!nombreNuevo.trim() || creandoLoading}
                style={{ flex: 1, background: "#059669", color: "#fff", border: "none", borderRadius: 12,
                  padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  opacity: !nombreNuevo.trim() ? 0.5 : 1, fontFamily: "inherit" }}>
                {creandoLoading ? "Creando..." : "Crear obra →"}
              </button>
              <button onClick={() => { setCreando(false); setNombreNuevo(""); }}
                style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 12,
                  padding: "12px 18px", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar ── */}
      {confirmarEliminar && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center",
          justifyContent: "center", padding: 16, backdropFilter: "blur(6px)", background: "rgba(0,0,0,.35)" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 380,
            boxShadow: "0 24px 60px rgba(0,0,0,.2)", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>
              Eliminar obra
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 4px" }}>
              ¿Eliminar <strong>{confirmarEliminar.nombre}</strong>?
            </p>
            <p style={{ fontSize: 12, color: "#ef4444", margin: "0 0 24px" }}>
              Se eliminarán todos los documentos, estados de pago, garantías y bitácora.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => eliminarObra(confirmarEliminar.id)}
                style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 10,
                  padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Eliminar
              </button>
              <button onClick={() => setConfirmarEliminar(null)}
                style={{ flex: 1, background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 10,
                  padding: "11px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
