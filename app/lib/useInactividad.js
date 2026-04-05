"use client";
import { useEffect, useRef } from "react";

// Cierra sesión y redirige si el usuario está inactivo más de `minutos` minutos
export function useInactividad(supabase, router, minutos = 10) {
  const timer = useRef(null);
  const minutosRef = useRef(minutos);
  const supabaseRef = useRef(supabase);
  const routerRef = useRef(router);

  // Mantener refs actualizadas sin re-ejecutar el effect
  minutosRef.current = minutos;
  supabaseRef.current = supabase;
  routerRef.current = router;

  useEffect(() => {
    const reset = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        await supabaseRef.current.auth.signOut();
        routerRef.current.push("/login");
      }, minutosRef.current * 60 * 1000);
    };

    const eventos = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    eventos.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset(); // inicia el timer al montar

    return () => {
      clearTimeout(timer.current);
      eventos.forEach(e => window.removeEventListener(e, reset));
    };
  }, []); // effect solo corre al montar — refs mantienen valores frescos
}
