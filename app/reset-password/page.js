"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase envía el token en el hash de la URL.
  // onAuthStateChange detecta el evento PASSWORD_RECOVERY y establece la sesión.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
    // Si ya hay sesión activa (ej. recarga de página) también habilitamos
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (password !== confirm)  { setError("Las contraseñas no coinciden"); return; }
    setError(""); setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 2500);
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-800 flex-col items-center justify-center px-16 text-white">
        <span className="text-4xl font-bold tracking-tight mb-6">
          APU<span className="text-emerald-300">chile</span>
        </span>
        <p className="text-emerald-200 text-center text-sm">
          Crea una nueva contraseña segura para tu cuenta
        </p>
      </div>

      {/* Panel derecho */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 bg-white">
        <div className="w-full max-w-md">

          <div className="lg:hidden text-center mb-8">
            <span className="text-3xl font-bold text-emerald-800">
              APU<span className="text-emerald-500">chile</span>
            </span>
          </div>

          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Contraseña actualizada!</h2>
              <p className="text-gray-500 text-sm">Redirigiendo al dashboard...</p>
            </div>
          ) : !sessionReady ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">⏳</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Verificando enlace...</h2>
              <p className="text-gray-500 text-sm mb-6">
                Si este mensaje no desaparece, el enlace puede haber expirado.
              </p>
              <button onClick={() => router.push("/login")}
                className="text-emerald-600 text-sm font-medium hover:text-emerald-800">
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Nueva contraseña</h2>
              <p className="text-gray-500 text-sm mb-8">Elige una contraseña segura de al menos 6 caracteres.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Nueva contraseña</label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Confirmar contraseña</label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mt-2">
                  {loading ? "Guardando..." : "Guardar contraseña →"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
