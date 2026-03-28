"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const PAISES = ["Chile","Argentina","Bolivia","Brasil","Colombia","Ecuador","Paraguay","Perú","Uruguay","Venezuela","México","España","Otro"];

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState("ingresar"); // "ingresar" | "registrar"
  const [form, setForm] = useState({ nombre: "", correo: "", usuario: "", password: "", anio: "", pais: "Chile" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const ingresar = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.correo,
      password: form.password,
    });
    setLoading(false);
    if (error) { setError(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : error.message); return; }
    router.push("/dashboard");
  };

  const registrar = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    if (!form.nombre || !form.correo || !form.usuario || !form.password || !form.anio) {
      setError("Completa todos los campos"); setLoading(false); return;
    }
    const { error } = await supabase.auth.signUp({
      email: form.correo,
      password: form.password,
      options: {
        data: { nombre: form.nombre, usuario: form.usuario, anio: form.anio, pais: form.pais }
      }
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setVerificando(true);
  };

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">✉️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Revisa tu correo</h2>
          <p className="text-gray-500 text-sm mb-6">
            Te enviamos un enlace de verificación a <strong>{form.correo}</strong>. Confirma tu cuenta para poder ingresar.
          </p>
          <button onClick={() => { setVerificando(false); setModo("ingresar"); }}
            className="text-emerald-600 text-sm underline">
            Ya verifiqué → Ingresar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — branding */}
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

      {/* Panel derecho — formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-3xl font-bold text-emerald-800">APU<span className="text-emerald-500">chile</span></span>
          </div>

          {/* Tabs */}
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
              {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
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
