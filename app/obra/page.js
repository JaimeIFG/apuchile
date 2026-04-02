"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useInactividad } from "../lib/useInactividad";

// ── Constants ──────────────────────────────────────────────────────────────
const ESTADOS = ["En licitación", "En ejecución", "Paralizada", "Recepcionada", "Liquidada"];

const ESTADO_ST = {
  "En licitación":  { bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  "En ejecución":   { bg: "#d1fae5", color: "#065f46", dot: "#059669" },
  "Paralizada":     { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
  "Recepcionada":   { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  "Liquidada":      { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
};

const CATEGORIAS_DOCS = [
  "Actas", "Bases", "Decretos", "Orden de Compra",
  "Contratos y Modificaciones", "Caución de Garantías",
  "Estados de Pago", "Oficios", "Contratista", "Multas",
  "Recepciones", "Liquidaciones", "Contraloría",
  "Carta Gantt y Planos", "Varios",
];

const TIPOS_EP = ["Certificado", "Estado de Pago", "Retención", "Anticipo"];

const TIPOS_GARANTIA = [
  "Seriedad de Oferta", "Fiel Cumplimiento", "Anticipo",
  "Correcta Ejecución", "Otra",
];

const TIPOS_BITACORA = ["Observación", "Avance", "Problema", "Reunión", "Hito"];

const REGIONES_CL = [
  "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo",
  "Valparaíso", "Región Metropolitana", "O'Higgins", "Maule", "Ñuble",
  "Biobío", "La Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes",
];

const TABS = [
  { id: "ficha",     icon: "📋", label: "Ficha"          },
  { id: "docs",      icon: "📁", label: "Banco de Datos"  },
  { id: "pagos",     icon: "💰", label: "Est. de Pago"    },
  { id: "garantias", icon: "🔒", label: "Garantías"       },
  { id: "bitacora",  icon: "📖", label: "Bitácora"        },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtFecha(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-CL");
}
function fmtPeso(n) {
  if (!n && n !== 0) return "—";
  return "$" + Math.round(n).toLocaleString("es-CL");
}
function diasAlVencimiento(fecha) {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha) - new Date()) / 86400000);
}

// Semáforo de garantías
function SemaforoGarantia({ fecha }) {
  const d = diasAlVencimiento(fecha);
  if (d === null) return null;
  const { color, bg, label } =
    d < 0    ? { color: "#7f1d1d", bg: "#fee2e2", label: `Vencida hace ${Math.abs(d)}d` } :
    d <= 30  ? { color: "#991b1b", bg: "#fee2e2", label: `🔴 Vence en ${d}d` } :
    d <= 45  ? { color: "#92400e", bg: "#fed7aa", label: `🟠 Vence en ${d}d` } :
    d <= 75  ? { color: "#713f12", bg: "#fef3c7", label: `🟡 Vence en ${d}d` } :
               { color: "#065f46", bg: "#d1fae5", label: `🟢 Vence en ${d}d` };
  return (
    <span style={{ background: bg, color, fontSize: 10.5, fontWeight: 700,
      padding: "3px 10px", borderRadius: 99, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function InputRow({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase",
        letterSpacing: ".05em", display: "block", marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
const inputSt = {
  width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0",
  borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  background: "#fff", color: "#1e293b",
};
const selectSt = { ...inputSt };

// ── Main component ─────────────────────────────────────────────────────────
export default function ObraPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Cargando...</div>}>
      <ObraDetail />
    </Suspense>
  );
}

function ObraDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const obraId = searchParams.get("id");

  const [obra, setObra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ficha");
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [userId, setUserId] = useState(null);

  // Sub-data
  const [docs, setDocs] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [garantias, setGarantias] = useState([]);
  const [bitacora, setBitacora] = useState([]);

  // Modal states
  const [modalDoc, setModalDoc] = useState(false);
  const [modalPago, setModalPago] = useState(false);
  const [modalGarantia, setModalGarantia] = useState(false);
  const [modalBitacora, setModalBitacora] = useState(false);

  useInactividad(supabase, router, 10);

  useEffect(() => {
    if (!obraId) { router.push("/obras"); return; }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const [obraRes, docsRes, pagosRes, garantiasRes, bitacoraRes] = await Promise.all([
        supabase.from("obras").select("*").eq("id", obraId).single(),
        supabase.from("obra_documentos").select("*").eq("obra_id", obraId).order("created_at", { ascending: false }),
        supabase.from("obra_estados_pago").select("*").eq("obra_id", obraId).order("fecha", { ascending: false }),
        supabase.from("obra_garantias").select("*").eq("obra_id", obraId).order("fecha_vencimiento"),
        supabase.from("obra_bitacora").select("*").eq("obra_id", obraId).order("fecha", { ascending: false }),
      ]);
      if (obraRes.data) setObra(obraRes.data);
      setDocs(docsRes.data || []);
      setPagos(pagosRes.data || []);
      setGarantias(garantiasRes.data || []);
      setBitacora(bitacoraRes.data || []);
      setLoading(false);
    });
  }, [obraId]);

  const guardarFicha = async () => {
    if (!obra) return;
    setGuardando(true);
    await supabase.from("obras").update({ ...obra, updated_at: new Date().toISOString() }).eq("id", obraId);
    setGuardando(false);
    setGuardadoOk(true);
    setTimeout(() => setGuardadoOk(false), 2000);
  };

  const setField = (k, v) => setObra(o => ({ ...o, [k]: v }));

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center",
      justifyContent: "center", color: "#94a3b8", fontSize: 14, fontFamily: "sans-serif" }}>
      Cargando obra...
    </div>
  );
  if (!obra) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p>Obra no encontrada. <button onClick={() => router.push("/obras")} style={{ color: "#059669" }}>Volver</button></p>
    </div>
  );

  const est = ESTADO_ST[obra.estado_obra] || ESTADO_ST["En ejecución"];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg,#065f46,#059669)", padding: "20px 28px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button onClick={() => router.push("/obras")}
              style={{ background: "rgba(255,255,255,.15)", border: "none", borderRadius: 8,
                padding: "5px 12px", color: "#fff", fontSize: 12, cursor: "pointer" }}>
              ← Obras
            </button>
            <span style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>/</span>
            <span style={{ color: "rgba(255,255,255,.85)", fontSize: 12,
              maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {obra.nombre}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ background: est.bg, color: est.color, fontSize: 11, fontWeight: 700,
                  padding: "3px 10px", borderRadius: 99 }}>
                  {obra.estado_obra}
                </span>
              </div>
              <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0,
                letterSpacing: "-.02em", maxWidth: 600 }}>
                {obra.nombre}
              </h1>
              {(obra.mandante || obra.region) && (
                <p style={{ color: "rgba(255,255,255,.65)", fontSize: 12, margin: "4px 0 0" }}>
                  {[obra.mandante, obra.region].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {tab === "ficha" && (
                <button onClick={guardarFicha} disabled={guardando}
                  style={{ background: guardadoOk ? "#34d399" : "#fff", color: guardadoOk ? "#065f46" : "#059669",
                    border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", transition: "all .2s" }}>
                  {guardando ? "Guardando..." : guardadoOk ? "✓ Guardado" : "Guardar ficha"}
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ background: tab === t.id ? "#fff" : "transparent",
                  color: tab === t.id ? "#059669" : "rgba(255,255,255,.7)",
                  border: "none", borderRadius: "10px 10px 0 0", padding: "8px 16px",
                  fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 6, transition: "all .15s" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 28px" }}>

        {/* ═══ FICHA ═══ */}
        {tab === "ficha" && (
          <div style={{ display: "grid", gap: 20 }}>
            {/* Estado */}
            <Section title="Estado de la Obra">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ESTADOS.map(e => {
                  const s = ESTADO_ST[e]; const active = obra.estado_obra === e;
                  return (
                    <button key={e} onClick={() => setField("estado_obra", e)}
                      style={{ padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                        border: active ? `2px solid ${s.dot}` : "1.5px solid #e2e8f0",
                        background: active ? s.bg : "#fff", color: active ? s.color : "#64748b",
                        cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}>
                      {e}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Info básica */}
            <Section title="Información Básica">
              <Grid cols={2}>
                <InputRow label="Nombre de la Obra">
                  <input value={obra.nombre || ""} onChange={e => setField("nombre", e.target.value)} style={inputSt}/>
                </InputRow>
                <InputRow label="Región">
                  <select value={obra.region || ""} onChange={e => setField("region", e.target.value)} style={selectSt}>
                    <option value="">Seleccionar...</option>
                    {REGIONES_CL.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </InputRow>
                <InputRow label="Mandante">
                  <input value={obra.mandante || ""} onChange={e => setField("mandante", e.target.value)} style={inputSt} placeholder="Ej: Municipalidad de..."/>
                </InputRow>
                <InputRow label="Unidad Técnica">
                  <input value={obra.unidad_tecnica || ""} onChange={e => setField("unidad_tecnica", e.target.value)} style={inputSt}/>
                </InputRow>
                <InputRow label="ITO (Inspector Técnico de Obra)">
                  <input value={obra.ito || ""} onChange={e => setField("ito", e.target.value)} style={inputSt}/>
                </InputRow>
                <InputRow label="Contratista">
                  <input value={obra.contratista || ""} onChange={e => setField("contratista", e.target.value)} style={inputSt}/>
                </InputRow>
                <InputRow label="RUT Contratista">
                  <input value={obra.rut_contratista || ""} onChange={e => setField("rut_contratista", e.target.value)} style={inputSt} placeholder="12.345.678-9"/>
                </InputRow>
              </Grid>
            </Section>

            {/* Decreto y Contrato */}
            <Section title="Decreto y Contrato">
              <Grid cols={3}>
                <InputRow label="N° Decreto">
                  <input value={obra.numero_decreto || ""} onChange={e => setField("numero_decreto", e.target.value)} style={inputSt}/>
                </InputRow>
                <InputRow label="Fecha Decreto">
                  <input type="date" value={obra.fecha_decreto || ""} onChange={e => setField("fecha_decreto", e.target.value)} style={inputSt}/>
                </InputRow>
                <InputRow label="N° Contrato">
                  <input value={obra.numero_contrato || ""} onChange={e => setField("numero_contrato", e.target.value)} style={inputSt}/>
                </InputRow>
                <InputRow label="Fecha Contrato">
                  <input type="date" value={obra.fecha_contrato || ""} onChange={e => setField("fecha_contrato", e.target.value)} style={inputSt}/>
                </InputRow>
              </Grid>
            </Section>

            {/* Plazos */}
            <Section title="Plazos">
              <Grid cols={3}>
                <InputRow label="Fecha Inicio">
                  <input type="date" value={obra.fecha_inicio || ""} onChange={e => setField("fecha_inicio", e.target.value)} style={inputSt}/>
                </InputRow>
                <InputRow label="Plazo Contractual (días)">
                  <input type="number" value={obra.plazo_dias || ""} onChange={e => setField("plazo_dias", e.target.value)} style={inputSt} placeholder="180"/>
                </InputRow>
                <InputRow label="Fecha Término Contractual">
                  <input type="date" value={obra.fecha_termino_contractual || ""} onChange={e => setField("fecha_termino_contractual", e.target.value)} style={inputSt}/>
                </InputRow>
                <InputRow label="Fecha Término Real">
                  <input type="date" value={obra.fecha_termino_real || ""} onChange={e => setField("fecha_termino_real", e.target.value)} style={inputSt}/>
                </InputRow>
              </Grid>
            </Section>

            {/* Montos */}
            <Section title="Montos">
              <Grid cols={2}>
                <InputRow label="Presupuesto Oficial ($)">
                  <input type="number" value={obra.presupuesto_oficial || ""} onChange={e => setField("presupuesto_oficial", e.target.value)} style={inputSt} placeholder="0"/>
                </InputRow>
                <InputRow label="Monto Contrato ($)">
                  <input type="number" value={obra.monto_contrato || ""} onChange={e => setField("monto_contrato", e.target.value)} style={inputSt} placeholder="0"/>
                </InputRow>
              </Grid>
              {obra.monto_contrato && obra.presupuesto_oficial && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#f0fdf4",
                  border: "1px solid #bbf7d0", borderRadius: 10, display: "inline-flex", gap: 20 }}>
                  <span style={{ fontSize: 12, color: "#065f46" }}>
                    Presupuesto: <strong>{fmtPeso(obra.presupuesto_oficial)}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: "#065f46" }}>
                    Contrato: <strong>{fmtPeso(obra.monto_contrato)}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: "#065f46" }}>
                    Diferencia: <strong>{fmtPeso(obra.monto_contrato - obra.presupuesto_oficial)}</strong>
                  </span>
                </div>
              )}
            </Section>

            {/* Notas */}
            <Section title="Notas">
              <textarea value={obra.notas || ""} onChange={e => setField("notas", e.target.value)}
                rows={4} placeholder="Observaciones generales de la obra..."
                style={{ ...inputSt, resize: "vertical", lineHeight: 1.6 }}/>
            </Section>

            <div style={{ textAlign: "right" }}>
              <button onClick={guardarFicha} disabled={guardando}
                style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 12,
                  padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", opacity: guardando ? 0.7 : 1 }}>
                {guardando ? "Guardando..." : guardadoOk ? "✓ Guardado" : "Guardar ficha"}
              </button>
            </div>
          </div>
        )}

        {/* ═══ BANCO DE DATOS ═══ */}
        {tab === "docs" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0 }}>Banco de Datos</h2>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>{docs.length} documentos · 15 categorías</p>
              </div>
              <button onClick={() => setModalDoc(true)}
                style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 10,
                  padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ＋ Agregar documento
              </button>
            </div>

            {CATEGORIAS_DOCS.map(cat => {
              const items = docs.filter(d => d.categoria === cat);
              return (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 14px", background: items.length > 0 ? "#f0fdf4" : "#f8fafc",
                    border: `1px solid ${items.length > 0 ? "#bbf7d0" : "#e2e8f0"}`,
                    borderRadius: items.length > 0 ? "10px 10px 0 0" : 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", flex: 1 }}>{cat}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      {items.length > 0 ? `${items.length} doc${items.length > 1 ? "s" : ""}` : "Sin documentos"}
                    </span>
                  </div>
                  {items.length > 0 && (
                    <div style={{ border: "1px solid #bbf7d0", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                      {items.map((doc, i) => (
                        <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 14px", background: i % 2 === 0 ? "#fff" : "#f9fafb",
                          borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                          <span style={{ fontSize: 20 }}>📄</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {doc.nombre}
                            </div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>
                              {doc.fecha ? fmtFecha(doc.fecha) : ""}{doc.descripcion ? " · " + doc.descripcion : ""}
                            </div>
                          </div>
                          {doc.archivo_url && (
                            <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer"
                              style={{ background: "#f0fdf4", color: "#059669", border: "1px solid #bbf7d0",
                                borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                                textDecoration: "none", whiteSpace: "nowrap" }}>
                              Ver archivo
                            </a>
                          )}
                          <button onClick={() => eliminarDoc(doc.id)}
                            style={{ background: "none", border: "none", color: "#fca5a5",
                              cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ ESTADOS DE PAGO ═══ */}
        {tab === "pagos" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0 }}>Estados de Pago</h2>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                  {pagos.length} registros ·{" "}
                  Total: <strong>{fmtPeso(pagos.reduce((s, p) => s + (p.monto || 0), 0))}</strong>
                </p>
              </div>
              <button onClick={() => setModalPago(true)}
                style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 10,
                  padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ＋ Agregar
              </button>
            </div>

            {pagos.length === 0 ? (
              <EmptyState icon="💰" msg="Sin estados de pago registrados" />
            ) : (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Nombre", "Tipo", "Fecha", "Monto", "N° EP", "N° Oficio", ""].map(h => (
                        <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700,
                          color: "#64748b", textAlign: "left", textTransform: "uppercase",
                          letterSpacing: ".05em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((p, i) => (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                        <td style={{ padding: "12px 14px", fontSize: 13, color: "#1e293b", fontWeight: 500 }}>{p.nombre}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                            background: "#dbeafe", color: "#1d4ed8" }}>{p.tipo || "—"}</span>
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748b" }}>{fmtFecha(p.fecha)}</td>
                        <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#059669" }}>{fmtPeso(p.monto)}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748b" }}>{p.numero_estado_pago || "—"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748b" }}>{p.numero_oficio || "—"}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {p.archivo_url && (
                              <a href={p.archivo_url} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 11, color: "#059669", textDecoration: "none" }}>📎</a>
                            )}
                            <button onClick={() => eliminarPago(p.id)}
                              style={{ background: "none", border: "none", color: "#fca5a5",
                                cursor: "pointer", fontSize: 13 }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ GARANTÍAS ═══ */}
        {tab === "garantias" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0 }}>Cauciones y Garantías</h2>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>{garantias.length} garantías registradas</p>
              </div>
              <button onClick={() => setModalGarantia(true)}
                style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 10,
                  padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ＋ Agregar
              </button>
            </div>

            {/* Leyenda semáforo */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { color: "#991b1b", bg: "#fee2e2", label: "🔴 1–30 días" },
                { color: "#92400e", bg: "#fed7aa", label: "🟠 31–45 días" },
                { color: "#713f12", bg: "#fef3c7", label: "🟡 46–75 días" },
                { color: "#065f46", bg: "#d1fae5", label: "🟢 76–90+ días" },
              ].map(s => (
                <span key={s.label} style={{ background: s.bg, color: s.color, fontSize: 10.5,
                  fontWeight: 600, padding: "3px 10px", borderRadius: 99 }}>{s.label}</span>
              ))}
            </div>

            {garantias.length === 0 ? (
              <EmptyState icon="🔒" msg="Sin garantías registradas" />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {garantias.map(g => (
                  <div key={g.id} style={{ background: "#fff", border: "1.5px solid #e2e8f0",
                    borderRadius: 14, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{g.tipo || "Garantía"}</span>
                          <SemaforoGarantia fecha={g.fecha_vencimiento} />
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                            background: g.estado === "Vigente" ? "#d1fae5" : "#f1f5f9",
                            color: g.estado === "Vigente" ? "#065f46" : "#64748b" }}>
                            {g.estado}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                          {g.entidad && <span style={{ fontSize: 12, color: "#64748b" }}>🏦 {g.entidad}</span>}
                          {g.numero_documento && <span style={{ fontSize: 12, color: "#64748b" }}>N° {g.numero_documento}</span>}
                          {g.monto && <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>{fmtPeso(g.monto)}</span>}
                          {g.fecha_emision && <span style={{ fontSize: 12, color: "#64748b" }}>Emisión: {fmtFecha(g.fecha_emision)}</span>}
                          {g.fecha_vencimiento && <span style={{ fontSize: 12, color: "#64748b" }}>Vence: {fmtFecha(g.fecha_vencimiento)}</span>}
                        </div>
                        {g.descripcion && <p style={{ fontSize: 12, color: "#94a3b8", margin: "6px 0 0" }}>{g.descripcion}</p>}
                      </div>
                      <button onClick={() => eliminarGarantia(g.id)}
                        style={{ background: "none", border: "none", color: "#fca5a5",
                          cursor: "pointer", fontSize: 16 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ BITÁCORA ═══ */}
        {tab === "bitacora" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0 }}>Bitácora de Obra</h2>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>{bitacora.length} registros</p>
              </div>
              <button onClick={() => setModalBitacora(true)}
                style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 10,
                  padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ＋ Nueva entrada
              </button>
            </div>

            {bitacora.length === 0 ? (
              <EmptyState icon="📖" msg="Sin registros en la bitácora" />
            ) : (
              <div style={{ position: "relative", paddingLeft: 20 }}>
                <div style={{ position: "absolute", left: 6, top: 0, bottom: 0,
                  width: 2, background: "#e2e8f0", borderRadius: 2 }}/>
                {bitacora.map(b => {
                  const TIPO_COLOR = {
                    "Avance":      { bg: "#d1fae5", color: "#065f46" },
                    "Problema":    { bg: "#fee2e2", color: "#991b1b" },
                    "Reunión":     { bg: "#dbeafe", color: "#1d4ed8" },
                    "Hito":        { bg: "#fef3c7", color: "#92400e" },
                    "Observación": { bg: "#f1f5f9", color: "#475569" },
                  };
                  const tc = TIPO_COLOR[b.tipo] || TIPO_COLOR["Observación"];
                  return (
                    <div key={b.id} style={{ marginBottom: 18, position: "relative" }}>
                      <div style={{ position: "absolute", left: -17, top: 4, width: 10, height: 10,
                        borderRadius: "50%", background: tc.color, border: "2px solid #fff",
                        boxShadow: "0 0 0 2px " + tc.color }}/>
                      <div style={{ background: "#fff", border: "1px solid #e2e8f0",
                        borderRadius: 12, padding: "12px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ background: tc.bg, color: tc.color, fontSize: 10.5,
                              fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
                              {b.tipo}
                            </span>
                            {b.autor && <span style={{ fontSize: 11, color: "#94a3b8" }}>por {b.autor}</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>{fmtFecha(b.fecha)}</span>
                            <button onClick={() => eliminarBitacora(b.id)}
                              style={{ background: "none", border: "none", color: "#fca5a5",
                                cursor: "pointer", fontSize: 13 }}>✕</button>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>
                          {b.descripcion}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ MODALS ═══ */}
      {modalDoc && (
        <ModalDoc obraId={obraId} onClose={() => setModalDoc(false)}
          onSave={doc => { setDocs(p => [doc, ...p]); setModalDoc(false); }}/>
      )}
      {modalPago && (
        <ModalPago obraId={obraId} onClose={() => setModalPago(false)}
          onSave={p => { setPagos(prev => [p, ...prev]); setModalPago(false); }}/>
      )}
      {modalGarantia && (
        <ModalGarantia obraId={obraId} onClose={() => setModalGarantia(false)}
          onSave={g => { setGarantias(prev => [...prev, g].sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))); setModalGarantia(false); }}/>
      )}
      {modalBitacora && (
        <ModalBitacora obraId={obraId} userId={userId} onClose={() => setModalBitacora(false)}
          onSave={b => { setBitacora(prev => [b, ...prev]); setModalBitacora(false); }}/>
      )}
    </div>
  );

  // ── Delete helpers ──
  async function eliminarDoc(id) {
    await supabase.from("obra_documentos").delete().eq("id", id);
    setDocs(p => p.filter(d => d.id !== id));
  }
  async function eliminarPago(id) {
    await supabase.from("obra_estados_pago").delete().eq("id", id);
    setPagos(p => p.filter(d => d.id !== id));
  }
  async function eliminarGarantia(id) {
    await supabase.from("obra_garantias").delete().eq("id", id);
    setGarantias(p => p.filter(d => d.id !== id));
  }
  async function eliminarBitacora(id) {
    await supabase.from("obra_bitacora").delete().eq("id", id);
    setBitacora(p => p.filter(d => d.id !== id));
  }
}

// ── Helper UI components ────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "20px 22px" }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#374151", textTransform: "uppercase",
        letterSpacing: ".05em", margin: "0 0 16px", paddingBottom: 10,
        borderBottom: "1px solid #f1f5f9" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Grid({ cols = 2, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
      {children}
    </div>
  );
}

function EmptyState({ icon, msg }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>
      <p style={{ fontSize: 14 }}>{msg}</p>
    </div>
  );
}

// ── Modal: Documento ────────────────────────────────────────────────────────
function ModalDoc({ obraId, onClose, onSave }) {
  const [form, setForm] = useState({ categoria: "Actas", nombre: "", descripcion: "", fecha: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("obra_documentos").insert({
      obra_id: obraId, ...form,
    }).select().single();
    setSaving(false);
    if (!error && data) onSave(data);
  };

  return (
    <Modal title="📄 Agregar Documento" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <InputRow label="Categoría">
          <select value={form.categoria} onChange={e => set("categoria", e.target.value)} style={selectSt}>
            {CATEGORIAS_DOCS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </InputRow>
        <InputRow label="Nombre del documento">
          <input autoFocus value={form.nombre} onChange={e => set("nombre", e.target.value)} style={inputSt}
            placeholder="Ej: Acta de Inicio N°1"/>
        </InputRow>
        <InputRow label="Descripción (opcional)">
          <input value={form.descripcion} onChange={e => set("descripcion", e.target.value)} style={inputSt}/>
        </InputRow>
        <InputRow label="Fecha">
          <input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} style={inputSt}/>
        </InputRow>
        <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
          * La subida de archivos estará disponible próximamente
        </p>
        <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!form.nombre.trim()}/>
      </div>
    </Modal>
  );
}

// ── Modal: Estado de Pago ────────────────────────────────────────────────────
function ModalPago({ obraId, onClose, onSave }) {
  const [form, setForm] = useState({ nombre: "", tipo: "Estado de Pago", fecha: "", monto: "",
    numero_oficio: "", numero_estado_pago: "", unidad_pago: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("obra_estados_pago").insert({
      obra_id: obraId, ...form, monto: form.monto ? parseFloat(form.monto) : null,
    }).select().single();
    setSaving(false);
    if (!error && data) onSave(data);
  };

  return (
    <Modal title="💰 Estado de Pago" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <InputRow label="Nombre">
          <input autoFocus value={form.nombre} onChange={e => set("nombre", e.target.value)} style={inputSt}
            placeholder="Ej: Estado de Pago N°1"/>
        </InputRow>
        <Grid cols={2}>
          <InputRow label="Tipo">
            <select value={form.tipo} onChange={e => set("tipo", e.target.value)} style={selectSt}>
              {TIPOS_EP.map(t => <option key={t}>{t}</option>)}
            </select>
          </InputRow>
          <InputRow label="Fecha">
            <input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} style={inputSt}/>
          </InputRow>
          <InputRow label="Monto ($)">
            <input type="number" value={form.monto} onChange={e => set("monto", e.target.value)} style={inputSt} placeholder="0"/>
          </InputRow>
          <InputRow label="Unidad de Pago">
            <input value={form.unidad_pago} onChange={e => set("unidad_pago", e.target.value)} style={inputSt}/>
          </InputRow>
          <InputRow label="N° Estado de Pago">
            <input value={form.numero_estado_pago} onChange={e => set("numero_estado_pago", e.target.value)} style={inputSt}/>
          </InputRow>
          <InputRow label="N° Oficio">
            <input value={form.numero_oficio} onChange={e => set("numero_oficio", e.target.value)} style={inputSt}/>
          </InputRow>
        </Grid>
        <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!form.nombre.trim()}/>
      </div>
    </Modal>
  );
}

// ── Modal: Garantía ────────────────────────────────────────────────────────
function ModalGarantia({ obraId, onClose, onSave }) {
  const [form, setForm] = useState({ tipo: "Fiel Cumplimiento", descripcion: "", monto: "",
    entidad: "", numero_documento: "", fecha_emision: "", fecha_vencimiento: "", estado: "Vigente" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.from("obra_garantias").insert({
      obra_id: obraId, ...form, monto: form.monto ? parseFloat(form.monto) : null,
    }).select().single();
    setSaving(false);
    if (!error && data) onSave(data);
  };

  return (
    <Modal title="🔒 Nueva Garantía" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <InputRow label="Tipo de Garantía">
          <select value={form.tipo} onChange={e => set("tipo", e.target.value)} style={selectSt}>
            {TIPOS_GARANTIA.map(t => <option key={t}>{t}</option>)}
          </select>
        </InputRow>
        <Grid cols={2}>
          <InputRow label="Entidad (Banco)">
            <input autoFocus value={form.entidad} onChange={e => set("entidad", e.target.value)} style={inputSt}/>
          </InputRow>
          <InputRow label="N° Documento">
            <input value={form.numero_documento} onChange={e => set("numero_documento", e.target.value)} style={inputSt}/>
          </InputRow>
          <InputRow label="Monto ($)">
            <input type="number" value={form.monto} onChange={e => set("monto", e.target.value)} style={inputSt} placeholder="0"/>
          </InputRow>
          <InputRow label="Estado">
            <select value={form.estado} onChange={e => set("estado", e.target.value)} style={selectSt}>
              {["Vigente", "Vencida", "Ejecutada", "Devuelta"].map(s => <option key={s}>{s}</option>)}
            </select>
          </InputRow>
          <InputRow label="Fecha Emisión">
            <input type="date" value={form.fecha_emision} onChange={e => set("fecha_emision", e.target.value)} style={inputSt}/>
          </InputRow>
          <InputRow label="Fecha Vencimiento">
            <input type="date" value={form.fecha_vencimiento} onChange={e => set("fecha_vencimiento", e.target.value)} style={inputSt}/>
          </InputRow>
        </Grid>
        <InputRow label="Descripción">
          <input value={form.descripcion} onChange={e => set("descripcion", e.target.value)} style={inputSt}/>
        </InputRow>
        <ModalActions onClose={onClose} onSave={save} saving={saving}/>
      </div>
    </Modal>
  );
}

// ── Modal: Bitácora ────────────────────────────────────────────────────────
function ModalBitacora({ obraId, userId, onClose, onSave }) {
  const [form, setForm] = useState({ tipo: "Observación", descripcion: "",
    fecha: new Date().toISOString().split("T")[0], autor: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.descripcion.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("obra_bitacora").insert({
      obra_id: obraId, user_id: userId, ...form,
    }).select().single();
    setSaving(false);
    if (!error && data) onSave(data);
  };

  return (
    <Modal title="📖 Nueva Entrada Bitácora" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <Grid cols={2}>
          <InputRow label="Tipo">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TIPOS_BITACORA.map(t => (
                <button key={t} onClick={() => set("tipo", t)}
                  style={{ padding: "5px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                    border: form.tipo === t ? "1.5px solid #059669" : "1.5px solid #e2e8f0",
                    background: form.tipo === t ? "#d1fae5" : "#fff",
                    color: form.tipo === t ? "#065f46" : "#64748b",
                    cursor: "pointer", fontFamily: "inherit" }}>
                  {t}
                </button>
              ))}
            </div>
          </InputRow>
          <InputRow label="Fecha">
            <input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} style={inputSt}/>
          </InputRow>
        </Grid>
        <InputRow label="Autor">
          <input value={form.autor} onChange={e => set("autor", e.target.value)} style={inputSt} placeholder="Nombre del responsable"/>
        </InputRow>
        <InputRow label="Descripción">
          <textarea autoFocus value={form.descripcion} onChange={e => set("descripcion", e.target.value)}
            rows={4} placeholder="Descripción del evento, avance u observación..."
            style={{ ...inputSt, resize: "vertical", lineHeight: 1.6 }}/>
        </InputRow>
        <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!form.descripcion.trim()}/>
      </div>
    </Modal>
  );
}

// ── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center",
      justifyContent: "center", padding: 16, backdropFilter: "blur(6px)", background: "rgba(0,0,0,.35)" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "28px 28px 24px", width: "100%", maxWidth: 560,
        boxShadow: "0 24px 60px rgba(0,0,0,.2)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8,
            width: 28, height: 28, cursor: "pointer", fontSize: 14, color: "#64748b" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, onSave, saving, disabled = false }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
      <button onClick={onSave} disabled={saving || disabled}
        style={{ flex: 1, background: "#059669", color: "#fff", border: "none", borderRadius: 12,
          padding: "11px", fontSize: 14, fontWeight: 700, cursor: "pointer",
          opacity: disabled ? 0.5 : 1, fontFamily: "inherit" }}>
        {saving ? "Guardando..." : "Guardar →"}
      </button>
      <button onClick={onClose}
        style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 12,
          padding: "11px 18px", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
        Cancelar
      </button>
    </div>
  );
}
