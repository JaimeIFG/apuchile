export async function extractBudgetFromPDF(file) {
  if (typeof window === "undefined") {
    throw new Error("Esta función solo funciona en el navegador");
  }

  try {
    // Importar dinámicamente Tesseract (OCR gratuito)
    const Tesseract = await import("tesseract.js").then(m => m.default);

    // Leer archivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Cargar PDF y convertir a imagen
    const pdfjsModule = await import("pdfjs-dist");
    const pdfjsLib = pdfjsModule;
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;

    const imageUrl = canvas.toDataURL("image/png");

    // Usar Tesseract para OCR (completamente gratis)
    const result = await Tesseract.recognize(imageUrl, "spa");
    const text = result.data.text;

    // Parsear el texto extraído
    const items = [];
    const lines = text.split("\n").filter(l => l.trim());

    let currentSection = "";
    let itemNumber = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detectar secciones (líneas en mayúsculas sin números)
      if (
        trimmed.length > 5 &&
        trimmed === trimmed.toUpperCase() &&
        !/^\d/.test(trimmed) &&
        !trimmed.includes("$") &&
        trimmed.split(" ").length > 2
      ) {
        currentSection = trimmed;
        continue;
      }

      // Detectar items (líneas que empiezan con número)
      const itemMatch = trimmed.match(/^([\d.]+)\s+(.+?)\s+(un|m2|m3|kg|l|ml|m|km|h|jor|gl|pcs|set|lts|ha|etc)\s+([\d,.]+)\s+\$?\s*([\d,.]+)\s+\$?\s*([\d,.]+)/i);

      if (itemMatch) {
        itemNumber++;
        items.push({
          item: itemMatch[1],
          seccion: currentSection || "General",
          partida: itemMatch[2].trim(),
          unidad: itemMatch[3],
          cantidad: parseFloat(itemMatch[4].replace(",", ".")),
          valor_unitario: parseFloat(itemMatch[5].replace(/[,.]/g, match => match === "." ? "." : "")),
          valor_total: parseFloat(itemMatch[6].replace(/[,.]/g, match => match === "." ? "." : "")),
        });
      }
    }

    if (items.length === 0) {
      throw new Error(
        "No se pudieron extraer items del presupuesto. Asegúrate de que el PDF tenga una estructura clara de tabla."
      );
    }

    // Calcular totales
    const costoDirecto = items.reduce((sum, item) => sum + (item.valor_total || 0), 0);

    return {
      items,
      totales: {
        costo_directo: costoDirecto,
        gastos_generales: 0,
        utilidades: 0,
        iva: 0,
        total: costoDirecto,
      },
    };
  } catch (error) {
    console.error("Error extracting budget:", error);
    throw error;
  }
}
