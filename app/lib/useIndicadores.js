"use client";
import { useState, useEffect } from "react";

export function useIndicadores() {
  const [uf, setUf] = useState(null);
  const [utm, setUtm] = useState(null);
  const [fecha, setFecha] = useState(null);

  useEffect(() => {
    fetch("https://mindicador.cl/api")
      .then(r => r.json())
      .then(d => {
        setUf(d.uf?.valor ?? null);
        setUtm(d.utm?.valor ?? null);
        setFecha(d.uf?.fecha ? new Date(d.uf.fecha).toLocaleDateString("es-CL") : null);
      })
      .catch(() => {});
  }, []);

  return { uf, utm, fecha };
}
