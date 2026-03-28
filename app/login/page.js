"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const PAISES = ["Chile","Argentina","Bolivia","Brasil","Colombia","Ecuador","Paraguay","Perú","Uruguay","Venezuela","México","España","Otro"];

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
  const [modoTexto, setModoTexto] = useState(false); // fallback campo único

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres"); setLoading(false); return;
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
    if (otp.length !== 6) { setOtpError("Ingresa el código de 6 dígitos"); return; }
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
        <div className="hidden lg:flex lg:w-1/2 bg-emerald-800 flex-col items-center justify-center px-16 text-white">
          <span className="text-4xl font-bold tracking-tight mb-6">APU<span className="text-emerald-300">chile</span></span>
          <p className="text-emerald-200 text-center text-sm">Casi listo — confirma tu correo para activar tu cuenta</p>
        </div>
        <div className="w-full lg:w-1/2 flex items-center justify-center px-8 bg-white">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">✉️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Revisa tu correo</h2>
            <p className="text-gray-500 text-sm mb-1">
              Enviamos un código de 6 dígitos a
            </p>
            <p className="font-semibold text-gray-800 mb-2">{form.correo}</p>
            <p className="text-xs text-gray-400 mb-8">Revisa también la carpeta de spam o correo no deseado</p>

            {modoTexto ? (
              /* Campo único — más fácil para pegar */
              <div className="mb-6">
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={e => { if (e.key === "Enter" && otp.length === 6) verificarOtp(); }}
                  placeholder="Ingresa o pega el código aquí"
                  className="w-full text-center text-2xl font-bold tracking-[0.5em] border-2 border-gray-200 rounded-xl px-4 py-4 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
                <button onClick={() => { setModoTexto(false); setOtp(""); }}
                  className="text-xs text-gray-400 hover:text-emerald-600 mt-2 block mx-auto">
                  Volver a los cuadros separados
                </button>
              </div>
            ) : (
              /* 6 cuadros con soporte de pegado */
              <div className="mb-2">
                <div className="flex gap-2 justify-center mb-2">
                  {[0,1,2,3,4,5].map(i => (
                    <input key={i} type="text" maxLength={1} inputMode="numeric"
                      value={otp[i] || ""}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        const arr = otp.padEnd(6, " ").split("");
                        arr[i] = val;
                        setOtp(arr.join("").trimEnd().slice(0, 6));
                        if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
                      }}
                      onKeyDown={e => {
                        if (e.key === "Backspace" && !otp[i] && i > 0) document.getElementById(`otp-${i-1}`)?.focus();
                      }}
                      onPaste={e => {
                        e.preventDefault();
                        const pegado = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                        setOtp(pegado);
                        const nextIdx = Math.min(pegado.length, 5);
                        document.getElementById(`otp-${nextIdx}`)?.focus();
                      }}
                      id={`otp-${i}`}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-gray-800"/>
                  ))}
                </div>
                <button onClick={() => { setModoTexto(true); setOtp(""); }}
                  className="text-xs text-gray-400 hover:text-emerald-600 block mx-auto mt-1">
                  ¿No puedes pegarlo? Haz clic aquí para ingresar manualmente
                </button>
              </div>
            )}

            {otpError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg mb-4">{otpError}</p>}
            <button onClick={verificarOtp} disabled={otpLoading || otp.trim().length !== 6}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mb-4 mt-4">
              {otpLoading ? "Verificando..." : "Verificar código →"}
            </button>
            <button onClick={() => { setOtpStep(false); setOtp(""); setOtpError(""); setModoTexto(false); }}
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
      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-800 flex-col items-center justify-center px-16 text-white">
        <div className="mb-8">
          <span className="text-4xl font-bold tracking-tight">APU<span className="text-emerald-300">chile</span></span>
        </div>
        <h2 className="text-2xl font-semibold text-center mb-4 leading-snug">
          Simplifica tus análisis<br/>de precios unitarios
        </h2>
        <p className="text-emerald-200 text-center text-sm leading-relaxed max-w-xs">
          Base de datos ONDAC 2017 · Cálculo automático de costos · Desglose de insumos · Exportación de presupuestos
        </p>
        <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-xs">
          {["821 APUs disponibles","16 categorías","Cálculo automático","Proyectos guardados"].map((f, i) => (
            <div key={i} className="bg-emerald-700/50 rounded-xl px-4 py-3 text-sm text-emerald-100">{f}</div>
          ))}
        </div>
      </div>

      {/* Panel derecho */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <span className="text-3xl font-bold text-emerald-800">APU<span className="text-emerald-500">chile</span></span>
          </div>
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            {[["ingresar","Ingresar"],["registrar","Registrarse"]].map(([m, label]) => (
              <button key={m} onClick={() => { setModo(m); setError(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${modo === m ? "bg-white shadow text-emerald-700" : "text-gray-500 hover:text-gray-700"}`}>
                {label}
              </button>
            ))}
          </div>

          {modo === "ingresar" ? (
            <form onSubmit={ingresar} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Correo electrónico</label>
                <input type="email" required value={form.correo} onChange={e => set("correo", e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Contraseña</label>
                <input type="password" required value={form.password} onChange={e => set("password", e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
              </div>
              {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mt-2">
                {loading ? "Ingresando..." : "Ingresar →"}
              </button>
            </form>
          ) : (
            <form onSubmit={registrar} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Nombre completo</label>
                  <input type="text" required value={form.nombre} onChange={e => set("nombre", e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Usuario</label>
                  <input type="text" required value={form.usuario} onChange={e => set("usuario", e.target.value)}
                    placeholder="juanp"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Correo electrónico</label>
                <input type="email" required value={form.correo} onChange={e => set("correo", e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Contraseña</label>
                <input type="password" required value={form.password} onChange={e => set("password", e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Año de nacimiento</label>
                  <input type="number" required value={form.anio} onChange={e => set("anio", e.target.value)}
                    placeholder="1990" min="1940" max="2010"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">País</label>
                  <select value={form.pais} onChange={e => set("pais", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white">
                    {PAISES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              {error && (
                <div className="bg-red-50 px-3 py-2 rounded-lg flex items-center justify-between">
                  <p className="text-red-500 text-xs">{error}</p>
                  {error.includes("ya está registrado") && (
                    <button type="button" onClick={() => { setModo("ingresar"); setError(""); }}
                      className="text-emerald-600 text-xs font-medium underline ml-2 shrink-0">
                      Ingresar →
                    </button>
                  )}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
                {loading ? "Creando cuenta..." : "Crear cuenta →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
