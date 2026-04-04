"use client";
import { useState, useEffect, useCallback } from "react";

// Factor de ajuste por zona (mismo que en el API route)
// Usado en cliente para ajuste instantáneo sin llamada al servidor
export const FACTOR_ZONA_CLIENTE = {
  "Arica y Parinacota":   1.22,
  "Tarapacá":             1.18,
  "Antofagasta":          1.15,
  "Atacama":              1.12,
  "Coquimbo":             1.08,
  "Valparaíso":           1.04,
  "Región Metropolitana": 1.00,
  "O'Higgins":            1.03,
  "Maule":                1.05,
  "Ñuble":                1.07,
  "Biobío":               1.06,
  "La Araucanía":         1.10,
  "Los Ríos":             1.12,
  "Los Lagos":            1.15,
  "Aysén":                1.28,
  "Magallanes":           1.30,
};

/**
 * Ajusta un precio base (RM) a la región seleccionada.
 * Uso instantáneo en cliente, sin llamada al servidor.
 */
export function ajustarPrecioRegion(precioRM, region) {
  const factor = FACTOR_ZONA_CLIENTE[region] || 1.0;
  return Math.round(precioRM * factor);
}

/**
 * Hook principal para precios regionales.
 * - Mantiene la región seleccionada en localStorage
 * - Expone función para buscar precio actualizado de un material
 * - Cache local de precios consultados
 */
export function usePreciosRegionales() {
  const [region, setRegionState] = useState("Región Metropolitana");
  const [cache, setCache] = useState({});
  const [cargando, setCargando] = useState(false);

  // Cargar región guardada
  useEffect(() => {
    const saved = localStorage.getItem("apuchile_region");
    if (saved) setRegionState(saved);
  }, []);

  const setRegion = useCallback((r) => {
    setRegionState(r);
    localStorage.setItem("apuchile_region", r);
  }, []);

  const factor = FACTOR_ZONA_CLIENTE[region] || 1.0;

  /**
   * Ajusta cualquier precio base (2017, RM) a la región actual.
   * Aplica además factor IPC acumulado 2017→2025 (~1.65).
   */
  const ajustarPrecio = useCallback((precioBase2017) => {
    if (!precioBase2017) return null;
    const IPC_2017_2025 = 1.65; // INE Chile, acumulado
    return Math.round(precioBase2017 * IPC_2017_2025 * factor);
  }, [factor]);

  /**
   * Busca el precio real actualizado de un material desde Sodimac/Construmart.
   * Usa cache local para no repetir llamadas.
   */
  const buscarPrecioReal = useCallback(async (desc, busquedaOverride) => {
    const cacheKey = `${region}:${desc}`;
    if (cache[cacheKey]) return cache[cacheKey];

    const query = busquedaOverride || desc;
    try {
      const res = await fetch(
        `/api/precios-materiales?q=${encodeURIComponent(query)}&region=${encodeURIComponent(region)}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.encontrado) {
        setCache(prev => ({ ...prev, [cacheKey]: data }));
        return data;
      }
    } catch {}
    return null;
  }, [region, cache]);

  /**
   * Actualiza precios de un lote de materiales.
   * Devuelve array con precio_actual_zona para cada material.
   */
  const actualizarLote = useCallback(async (materiales) => {
    setCargando(true);
    try {
      const res = await fetch("/api/precios-materiales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materiales, region }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.resultados || [];
    } catch {
      return [];
    } finally {
      setCargando(false);
    }
  }, [region]);

  return {
    region,
    setRegion,
    factor,
    ajustarPrecio,
    buscarPrecioReal,
    actualizarLote,
    cargando,
  };
}
