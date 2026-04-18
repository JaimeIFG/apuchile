"use client";
import { useEffect, useState } from "react";

/**
 * Banner superior que aparece cuando el navegador detecta pérdida de red.
 * No intrusivo — se oculta al recuperarse la conexión.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-[60] bg-amber-500 text-white text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 shadow-md"
    >
      <span aria-hidden="true">🔌</span>
      <span>Sin conexión a internet. Tus cambios se guardarán cuando vuelvas a estar en línea.</span>
    </div>
  );
}

/**
 * Hook equivalente para usar en componentes que necesitan saber si hay red.
 */
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
