/**
 * Calcula los días corridos entre dos fechas (strings ISO o 'YYYY-MM-DD').
 * Retorna null si alguna fecha falta o el resultado es <= 0.
 */
export function diasCorridos(inicio, termino) {
  if (!inicio || !termino) return null;
  const d = Math.round((new Date(termino) - new Date(inicio)) / 86400000);
  return d > 0 ? d : null;
}

/**
 * Formatea un número como moneda chilena: $ 1.234.567
 */
export function fmtCLP(valor) {
  if (valor == null) return "—";
  return "$ " + Math.round(valor).toLocaleString("es-CL");
}
