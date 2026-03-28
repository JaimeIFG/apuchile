import { NextResponse } from "next/server";

const TICKET = process.env.MERCADOPUBLICO_TICKET || "DEMO";
const BASE = "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json";

const PALABRAS_CONSTRUCCION = [
  "obra", "construcci", "habilita", "paviment", "mejoramiento",
  "edifici", "infraestructura", "alcantarill", "agua potable", "vialidad",
  "reparaci", "mantenci", "ampliaci", "instalaci", "vivienda",
  "puente", "camino", "arquitectura", "ingenier", "equipamiento",
  "sanitari", "eléctric", "electric", "gasfiter", "pintura",
  "techumb", "cubierta", "cielo", "muro", "tabique", "piso",
];

export async function GET() {
  try {
    // Intentar con ticket activas sin filtro de tipo primero
    const url = `${BASE}?ticket=${TICKET}&estado=activas`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json({ licitaciones: [], error: `API error: ${res.status}` });
    }

    const data = await res.json();
    const items = data?.Listado || [];

    // Filtrar por palabras clave de construcción
    let filtradas = items.filter(l => {
      const nombre = (l.Nombre || "").toLowerCase();
      return PALABRAS_CONSTRUCCION.some(p => nombre.includes(p));
    });

    // Si no hay resultados con filtro, mostrar todas las activas (hasta 30)
    if (filtradas.length === 0 && items.length > 0) {
      filtradas = items;
    }

    // Ordenar por fecha de cierre más próxima
    filtradas.sort((a, b) => new Date(a.FechaCierre) - new Date(b.FechaCierre));

    const licitaciones = filtradas.slice(0, 50).map(l => ({
      codigo: l.CodigoExterno,
      nombre: l.Nombre,
      tipo: l.Tipo,
      organismo: l.Nombre_unidad_compradora || l.NombreOrganismo || l.CodigoOrganismo || "",
      cierre: l.FechaCierre,
      url: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${l.CodigoExterno}`,
    }));

    return NextResponse.json({ licitaciones, total: licitaciones.length, raw_total: items.length });
  } catch (err) {
    console.error("Error MP API:", err);
    return NextResponse.json({ licitaciones: [], error: err.message });
  }
}
