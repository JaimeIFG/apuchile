// Constantes centrales de la aplicación.
// Centralizar aquí para evitar "magic numbers" dispersos por el código.

// Inflación acumulada referencial base 2017 → 2025 (IPC INE).
export const IPC_2017_2025 = 1.65;

// Colaboración
export const MAX_COLABORADORES_POR_PROYECTO = 2; // sin contar al dueño
export const CODIGO_INVITACION_LEN = 16;
export const CODIGO_INVITACION_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITACION_TTL_MIN = 5; // minutos
export const INVITACION_TTL_MS = INVITACION_TTL_MIN * 60 * 1000;

// Rate limiting (ventanas deslizantes en memoria por proceso)
export const RATE_LIMIT = {
  invitar:      { max: 10, windowMs: 60_000 },
  aceptar:      { max: 10, windowMs: 60_000 },
  precios:      { max: 30, windowMs: 60_000 },
  procesar:     { max: 20, windowMs: 60_000 },
  ia:           { max: 30, windowMs: 60_000 },
  default:      { max: 60, windowMs: 60_000 },
};

// Tamaños máximos de archivo (bytes)
export const MAX_FILE_SIZE = {
  presupuesto: 25 * 1024 * 1024, // 25 MB
  anexo:       25 * 1024 * 1024,
  ep:          15 * 1024 * 1024,
};

// Timeouts
export const TIMEOUT_MS = {
  ia:       5 * 60 * 1000,
  scraping: 10_000,
  debounce: 800,
};

// Límites de UI / modelo
export const LIMITS = {
  maxPartidasIA: 30,
  maxMaterialesIA: 50,
  maxLicitaciones: 50,
};

// Regiones de Chile (usado en dashboard y validaciones de backend)
export const REGIONES = [
  "Arica y Parinacota","Tarapacá","Antofagasta","Atacama","Coquimbo",
  "Valparaíso","Metropolitana","O'Higgins","Maule","Ñuble","Biobío",
  "La Araucanía","Los Ríos","Los Lagos","Aysén","Magallanes",
];

export const ROLES_COLABORADOR = ["visualizar", "editar", "administrar"];
