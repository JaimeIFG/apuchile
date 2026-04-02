export async function extractBudgetFromPDF(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/procesar-presupuesto", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(err.error || `Error ${res.status}`);
  }

  return res.json();
}
