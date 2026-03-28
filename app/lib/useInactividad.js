"use client";
import { useEffect, useRef } from "react";

// Cierra sesión y redirige si el usuario está inactivo más de `minutos` minutos
export function useInactividad(supabase, router, minutos = 10) {
  const timer = useRef(null);

  useEffect(() => {
    const reset = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/login");
      }, minutos * 60 * 1000);
    };

    const eventos = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    eventos.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset(); // inicia el timer al montar

    return () => {
      clearTimeout(timer.current);
      eventos.forEach(e => window.removeEventListener(e, reset));
    };
  }, []);
}
