import Anthropic from "@anthropic-ai/sdk";
import * as pdfjsLib from "pdfjs-dist";

const client = new Anthropic();

// Configurar worker de pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractBudgetFromPDF(file) {
  try {
    // Leer archivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Cargar PDF
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Convertir primera página a imagen
    const page = await pdf.getPage(1);
    const scale = 2;
    const viewport = page.getViewport({ scale });

    const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
    if (!canvas) {
      throw new Error("Canvas not available - must run in browser");
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;

    // Convertir canvas a base64
    const imageData = canvas.toDataURL("image/png").split(",")[1];

    // Enviar a Claude para análisis
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageData,
              },
            },
            {
              type: "text",
              text: `Analiza esta imagen de un presupuesto y extrae TODOS los items en formato JSON.

Responde SOLO con un JSON válido (sin texto adicional) con esta estructura:
{
  "items": [
    {
      "item": "1.0",
      "seccion": "INSTALACIONES DE FAENA",
      "partida": "Descripción del item",
      "unidad": "un",
      "cantidad": 2.00,
      "valor_unitario": 1000,
      "valor_total": 2000
    }
  ],
  "totales": {
    "costo_directo": 123456.78,
    "gastos_generales": 12345.67,
    "utilidades": 9876.54,
    "iva": 8765.43,
    "total": 154444.42
  }
}

IMPORTANTE:
- Incluye TODOS los items de la tabla, sin excepción
- Respeta los números exactos del presupuesto
- Agrupa por secciones correctamente
- Los valores deben ser números, no texto
- Si hay subtotales de secciones, ignóralos (solo los items individuales)
- Asegúrate de que cantidad × valor_unitario = valor_total`,
            },
          ],
        },
      ],
    });

    // Parsear respuesta JSON
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Limpiar la respuesta para asegurar JSON válido
    let jsonText = content.text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const data = JSON.parse(jsonText);
    return data;
  } catch (error) {
    console.error("Error extracting budget:", error);
    throw error;
  }
}
