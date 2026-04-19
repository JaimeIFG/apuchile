"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ROL_LABEL = { admin: "Administrador", editor: "Editor", visor: "Visor" };
const ROL_COLOR = {
  admin:  "bg-indigo-100 text-indigo-700",
  editor: "bg-emerald-100 text-emerald-700",
  visor:  "bg-slate-100 text-slate-600",
};

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
      />
    </div>
  );
}

export default function EmpresaPage() {
  const router = useRouter();
  const params = useParams();
  const empresaId = params.id;

  const [user, setUser]           = useState(null);
  const [empresa, setEmpresa]     = useState(null);
  const [miembros, setMiembros]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [esAdmin, setEsAdmin]     = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado]   = useState(false);
  const [tab, setTab]             = useState("info"); // info | miembros

  // Invitar miembro
  const [invEmail, setInvEmail]   = useState("");
  const [invRol, setInvRol]       = useState("editor");
  const [invitando, setInvitando] = useState(false);
  const [invMsg, setInvMsg]       = useState(null);

  // Form edición empresa
  const [form, setForm] = useState({
    nombre: "", rut: "", giro: "", direccion: "", ciudad: "", telefono: "", email: "",
  });
  const setF = k => v => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const [empR, miembR] = await Promise.all([
        supabase.from("empresas").select("*").eq("id", empresaId).single(),
        supabase.from("empresa_miembros").select("*").eq("empresa_id", empresaId).order("created_at"),
      ]);

      if (empR.error || !empR.data) { router.push("/dashboard"); return; }
      setEmpresa(empR.data);
      setForm({
        nombre:    empR.data.nombre    || "",
        rut:       empR.data.rut       || "",
        giro:      empR.data.giro      || "",
        direccion: empR.data.direccion || "",
        ciudad:    empR.data.ciudad    || "",
        telefono:  empR.data.telefono  || "",
        email:     empR.data.email     || "",
      });

      const m = miembR.data || [];
      setMiembros(m);

      const isCreador = empR.data.created_by === user.id;
      const isMiembroAdmin = m.some(mb => mb.user_id === user.id && mb.rol === "admin");
      setEsAdmin(isCreador || isMiembroAdmin);
      setLoading(false);
    });
  }, [empresaId]);

  const guardarEmpresa = async () => {
    setGuardando(true);
    const { error } = await supabase.from("empresas").update(form).eq("id", empresaId);
    setGuardando(false);
    if (!error) {
      setEmpresa(p => ({ ...p, ...form }));
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    }
  };

  const invitarMiembro = async () => {
    if (!invEmail.trim()) return;
    setInvitando(true);
    setInvMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const m = user?.user_metadata || {};
    const res = await fetch("/api/invitar-empresa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        email: invEmail.trim(),
        rol: invRol,
        empresa_id: empresaId,
        empresa_nombre: empresa?.nombre,
        invitado_por_nombre: m.nombre || user?.email || "Un usuario",
      }),
    });
    const d = await res.json();
    setInvitando(false);
    if (d.error) {
      setInvMsg({ tipo: "error", texto: d.error });
    } else {
      setInvMsg({ tipo: "ok", texto: d.emailEnviado ? `Invitación enviada a ${invEmail}` : `Código generado: ${d.codigo}` });
      setInvEmail("");
    }
  };

  const eliminarMiembro = async (miembroId) => {
    await supabase.from("empresa_miembros").delete().eq("id", miembroId);
    setMiembros(p => p.filter(m => m.id !== miembroId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Cargando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-white/80 hover:text-white text-sm bg-white/10 px-3 py-1.5 rounded-lg transition"
        >
          ← Dashboard
        </button>
        <span className="text-white/40">·</span>
        <span className="text-white font-semibold text-sm">{empresa?.nombre}</span>
        <span className="ml-auto text-indigo-200 text-xs">
          {esAdmin ? "Administrador" : "Miembro"}
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header empresa */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600 border-2 border-indigo-200">
            {(empresa?.nombre || "E").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{empresa?.nombre}</h1>
            {empresa?.rut && <p className="text-slate-500 text-sm">RUT: {empresa.rut}</p>}
            <p className="text-slate-400 text-xs mt-0.5">{miembros.length + 1} miembro{miembros.length !== 0 ? "s" : ""}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {[["info","Información"], ["miembros","Miembros y accesos"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition -mb-px ${
                tab === id
                  ? "bg-white border border-b-white border-slate-200 text-indigo-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── TAB: Información ──────────────────────────────────────────── */}
        {tab === "info" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-widest">Datos de la empresa</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre / Razón Social" value={form.nombre} onChange={setF("nombre")} />
              <Field label="RUT" value={form.rut} onChange={setF("rut")} placeholder="76.000.000-0" />
              <Field label="Giro" value={form.giro} onChange={setF("giro")} placeholder="Construcción, Consultoría…" />
              <Field label="Ciudad" value={form.ciudad} onChange={setF("ciudad")} />
              <Field label="Dirección" value={form.direccion} onChange={setF("direccion")} placeholder="Av. Principal 123" className="col-span-2" />
              <Field label="Teléfono" value={form.telefono} onChange={setF("telefono")} placeholder="+56 2 …" />
              <Field label="Email empresa" value={form.email} onChange={setF("email")} type="email" />
            </div>

            {esAdmin && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={guardarEmpresa}
                  disabled={guardando}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60"
                >
                  {guardado ? "✓ Guardado" : guardando ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Miembros ─────────────────────────────────────────────── */}
        {tab === "miembros" && (
          <div className="space-y-4">

            {/* Invitar nuevo miembro */}
            {esAdmin && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-700 text-sm mb-4">Invitar nuevo miembro</h3>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={invEmail}
                    onChange={e => setInvEmail(e.target.value)}
                    placeholder="email@colaborador.cl"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    onKeyDown={e => e.key === "Enter" && invitarMiembro()}
                  />
                  <select
                    value={invRol}
                    onChange={e => setInvRol(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    <option value="admin">Administrador</option>
                    <option value="editor">Editor</option>
                    <option value="visor">Visor</option>
                  </select>
                  <button
                    onClick={invitarMiembro}
                    disabled={invitando || !invEmail.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60"
                  >
                    {invitando ? "…" : "Invitar"}
                  </button>
                </div>
                {invMsg && (
                  <p className={`mt-3 text-sm px-3 py-2 rounded-lg ${
                    invMsg.tipo === "ok"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-600 border border-red-200"
                  }`}>
                    {invMsg.texto}
                  </p>
                )}
                <div className="mt-3 flex gap-3 text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
                  <span>🔑</span>
                  <span>
                    <strong>Admin</strong>: gestiona empresa y miembros ·{" "}
                    <strong>Editor</strong>: crea y edita obras ·{" "}
                    <strong>Visor</strong>: solo lectura
                  </span>
                </div>
              </div>
            )}

            {/* Lista de miembros */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700 text-sm">Miembros activos</h3>
              </div>

              {/* Creador */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                    {(empresa?.created_by === user?.id ? user?.email || "Y" : "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {empresa?.created_by === user?.id ? (user?.user_metadata?.nombre || user?.email) : "Creador"}
                    </p>
                    <p className="text-xs text-slate-400">Propietario</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                  Propietario
                </span>
              </div>

              {/* Miembros */}
              {miembros.length === 0 ? (
                <div className="px-5 py-6 text-center text-slate-400 text-sm">
                  Sin miembros adicionales aún.
                </div>
              ) : (
                miembros.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                        {(m.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{m.email || "—"}</p>
                        <p className="text-xs text-slate-400">Miembro desde {new Date(m.created_at).toLocaleDateString("es-CL")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROL_COLOR[m.rol] || "bg-slate-100 text-slate-600"}`}>
                        {ROL_LABEL[m.rol] || m.rol}
                      </span>
                      {esAdmin && m.user_id !== user?.id && (
                        <button
                          onClick={() => eliminarMiembro(m.id)}
                          className="text-slate-300 hover:text-red-400 transition text-lg leading-none"
                          title="Eliminar miembro"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
