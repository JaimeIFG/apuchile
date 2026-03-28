import { NextResponse } from "next/server";

const TICKET = process.env.MERCADOPUBLICO_TICKET || "DEMO";
const BASE = "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json";

// Tipos de licitación relevantes para construcción
const TIPOS = ["L1", "LE", "LP", "LR", "E2"];

// Palabras clave para filtrar licitaciones de construcción/obra
const PALABRAS_CONSTRUCCION = [
  "obra", "construcción", "habilitación", "pavimentación", "mejoramiento",
  "edificio", "infraestructura", "alcantarillado", "agua potable", "vialidad",
  "reparación", "mantención", "ampliación", "instalación", "vivienda",
  "puente", "camino", "arquitectura", "ingeniería", "equipamiento",
];

export async function GET() {
  try {
    const resultados = [];

    // Buscar por cada tipo de licitación
    for (const tipo of TIPOS) {
      const url = `${BASE}?ticket=${TICKET}&estado=activas&tipo=${tipo}`;
      const res = await fetch(url, { next: { revalidate: 1800 } }); // cache 30 min
      if (!res.ok) continue;
      const data = await res.json();
      const items = data?.Listado || [];
      resultados.push(...items);
    }

    // Filtrar por palabras clave de construcción
    const filtradas = resultados.filter(l => {
      const nombre = (l.Nombre || "").toLowerCase();
      return PALABRAS_CONSTRUCCION.some(p => nombre.includes(p));
    });

    // Ordenar por fecha de cierre más próxima
    filtradas.sort((a, b) => new Date(a.FechaCierre) - new Date(b.FechaCierre));

    // Mapear a formato compacto
    const licitaciones = filtradas.slice(0, 50).map(l => ({
      codigo: l.CodigoExterno,
      nombre: l.Nombre,
      tipo: l.Tipo,
      organismo: l.Nombre_unidad_compradora || l.CodigoOrganismo,
      cierre: l.FechaCierre,
      url: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${l.CodigoExterno}`,
    }));

    return NextResponse.json({ licitaciones, total: licitaciones.length });
  } catch (err) {
    console.error("Error MP API:", err);
    return NextResponse.json({ licitaciones: [], error: err.message });
  }
}
