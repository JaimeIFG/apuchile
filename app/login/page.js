"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const PAISES = ["Chile","Argentina","Bolivia","Brasil","Colombia","Ecuador","Paraguay","Perú","Uruguay","Venezuela","México","España","Otro"];

function LeftPanel({ mensaje }) {
  return (
    <div
      className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-16 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #f8fafc 0%, #f1f5f9 40%, #ede9fe 100%)" }}
    >
      {/* Orb decorativo */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: 400, background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.13) 0%, transparent 70%)" }} />
      <div className="absolute pointer-events-none" style={{ bottom: "10%", right: "-5%", width: 300, height: 300, borderRadius: "50%", background: "rgba(139,92,246,0.07)", filter: "blur(70px)" }} />

      {/* Grid sutil */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

      <div className="relative z-10 max-w-sm w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>A</div>
          <span className="text-2xl font-bold tracking-tight" style={{ color: "#0f172a" }}>
            APU<span style={{ color: "#6366f1" }}>desk</span>
          </span>
        </div>

        <h2 className="text-2xl font-bold mb-3 leading-snug" style={{ color: "#0f172a" }}>
          {mensaje || <>Optimiza tus proyectos<br/>de construcción</>}
        </h2>
        <p className="text-sm leading-relaxed mb-10" style={{ color: "#64748b" }}>
          Presupuestos, carta Gantt, colaboración en tiempo real y más — todo en un solo lugar.
        </p>

        {/* Feature pills */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "📐", label: "+1.100 partidas" },
            { icon: "🤖", label: "IA integrada" },
            { icon: "📊", label: "Carta Gantt" },
            { icon: "📄", label: "PDF profesional" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-2.5 px-4 py-3 rounded-xl border"
              style={{ background: "rgba(255,255,255,0.7)", borderColor: "rgba(99,102,241,0.15)", backdropFilter: "blur(8px)" }}>
              <span className="text-base">{f.icon}</span>
              <span className="text-xs font-semibold" style={{ color: "#374151" }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState("ingresar");
  const [form, setForm] = useState({ nombre: "", correo: "", usuario: "", password: "", anio: "", pais: "Chile" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const enviarReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) { setResetError("Ingresa tu correo"); return; }
    setResetError(""); setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) { setResetError(error.message); return; }
    setResetSent(true);
  };

  const ingresar = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.correo,
      password: form.password,
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("Invalid login credentials")) setError("Correo o contraseña incorrectos");
      else if (error.message.includes("Email not confirmed")) setError("Debes confirmar tu correo antes de ingresar");
      else setError(error.message);
      return;
    }
    router.push("/dashboard");
  };

  const registrar = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    if (!form.nombre || !form.correo || !form.usuario || !form.password || !form.anio) {
      setError("Completa todos los campos"); setLoading(false); return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres"); setLoading(false); return;
    }

    // Verificar correo duplicado consultando usuarios existentes
    const { data: existing } = await supabase.from("usuarios_publicos").select("correo").eq("correo", form.correo).maybeSingle();
    if (existing) {
      setError("Este correo ya está registrado. ¿Quieres ingresar?"); setLoading(false); return;
    }

    const { error } = await supabase.auth.signUp({
      email: form.correo,
      password: form.password,
      options: {
        data: { nombre: form.nombre, usuario: form.usuario, anio: form.anio, pais: form.pais }
      }
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("already registered") || error.message.includes("User already registered"))
        setError("Este correo ya está registrado. ¿Quieres ingresar?");
      else setError(error.message);
      return;
    }
    setOtpStep(true);
  };

  const verificarOtp = async () => {
    if (otp.trim().length < 8) { setOtpError("Ingresa el código completo (8 dígitos)"); return; }
    setOtpError(""); setOtpLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: form.correo,
      token: otp,
      type: "signup",
    });
    setOtpLoading(false);
    if (error) {
      if (error.message.includes("expired")) setOtpError("El código expiró. Regístrate nuevamente para recibir uno nuevo.");
      else if (error.message.includes("invalid")) setOtpError("Código incorrecto, revisa tu correo.");
      else setOtpError(error.message);
      return;
    }
    router.push("/dashboard");
  };

  // Pantalla de verificación OTP
  if (otpStep) {
    return (
      <div className="min-h-screen flex">
        <LeftPanel mensaje="Casi listo — confirma tu correo para activar tu cuenta" />
        <div className="w-full lg:w-1/2 flex items-center justify-center px-8 bg-white">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">✉️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Revisa tu correo</h2>
            <p className="text-gray-500 text-sm mb-1">Enviamos el código a</p>
            <p className="font-semibold text-gray-800 mb-2">{form.correo}</p>
            <p className="text-xs text-gray-400 mb-8">Revisa también la carpeta de spam</p>

            <input
              autoFocus
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={e => { if (e.key === "Enter" && otp.length >= 8) verificarOtp(); }}
              placeholder="Pega o escribe el código"
              className="w-full text-center text-3xl font-bold tracking-[0.4em] border-2 border-gray-200 rounded-xl px-4 py-5 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-gray-800 mb-2"/>
            <p className="text-xs text-gray-400 mb-6">Puedes pegar el código directamente con Ctrl+V</p>

            {otpError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg mb-4">{otpError}</p>}
            <button onClick={verificarOtp} disabled={otpLoading || otp.length < 8}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mb-4">
              {otpLoading ? "Verificando..." : "Verificar código →"}
            </button>
            <button onClick={() => { setOtpStep(false); setOtp(""); setOtpError(""); }}
              className="text-gray-400 text-xs hover:text-gray-600">
              Volver al registro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <LeftPanel />

      {/* Panel derecho */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <span className="text-3xl font-bold" style={{ color: "#0f172a" }}>APU<span style={{ color: "#6366f1" }}>desk</span></span>
          </div>
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            {[["ingresar","Ingresar"],["registrar","Registrarse"]].map(([m, label]) => (
              <button key={m} onClick={() => { setModo(m); setError(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${modo === m ? "bg-white shadow text-indigo-700" : "text-gray-500 hover:text-gray-700"}`}>
                {label}
              </button>
            ))}
          </div>

          {modo === "ingresar" ? (
            <>
            <form onSubmit={ingresar} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Correo electrónico</label>
                <input type="email" required value={form.correo} onChange={e => set("correo", e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Contraseña</label>
                <input type="password" required value={form.password} onChange={e => set("password", e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
              </div>
              {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mt-2">
                {loading ? "Ingresando..." : "Ingresar →"}
              </button>
              <div className="text-center mt-3">
                <button type="button" onClick={() => { setResetMode(true); setResetEmail(form.correo); setResetSent(false); setResetError(""); }}
                  className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>

            {/* Panel restablecer contraseña */}
            {resetMode && (
              <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                {resetSent ? (
                  <div className="text-center">
                    <div className="text-2xl mb-2">✉️</div>
                    <p className="text-sm font-semibold text-indigo-800 mb-1">Correo enviado</p>
                    <p className="text-xs text-gray-500">Revisa tu bandeja (y spam) en <span className="font-medium">{resetEmail}</span> y sigue el enlace para crear una nueva contraseña.</p>
                    <button onClick={() => setResetMode(false)} className="mt-4 text-xs text-indigo-600 hover:text-indigo-800">Volver al inicio de sesión</button>
                  </div>
                ) : (
                  <form onSubmit={enviarReset}>
                    <p className="text-xs font-semibold text-indigo-800 mb-3">Restablecer contraseña</p>
                    <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 mb-2 bg-white"/>
                    {resetError && <p className="text-red-500 text-xs mb-2">{resetError}</p>}
                    <div className="flex gap-2">
                      <button type="submit" disabled={resetLoading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
                        {resetLoading ? "Enviando..." : "Enviar enlace →"}
                      </button>
                      <button type="button" onClick={() => setResetMode(false)}
                        className="px-4 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl">
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
            </>
          ) : (
            <form onSubmit={registrar} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Nombre completo</label>
                  <input type="text" required value={form.nombre} onChange={e => set("nombre", e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Usuario</label>
                  <input type="text" required value={form.usuario} onChange={e => set("usuario", e.target.value)}
                    placeholder="juanp"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Correo electrónico</label>
                <input type="email" required value={form.correo} onChange={e => set("correo", e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Contraseña</label>
                <input type="password" required value={form.password} onChange={e => set("password", e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Año de nacimiento</label>
                  <input type="number" required value={form.anio} onChange={e => set("anio", e.target.value)}
                    placeholder="1990" min="1940" max="2010"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">País</label>
                  <select value={form.pais} onChange={e => set("pais", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white">
                    {PAISES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              {error && (
                <div className="bg-red-50 px-3 py-2 rounded-lg flex items-center justify-between">
                  <p className="text-red-500 text-xs">{error}</p>
                  {error.includes("ya está registrado") && (
                    <button type="button" onClick={() => { setModo("ingresar"); setError(""); }}
                      className="text-indigo-600 text-xs font-medium underline ml-2 shrink-0">
                      Ingresar →
                    </button>
                  )}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
                {loading ? "Creando cuenta..." : "Crear cuenta →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
