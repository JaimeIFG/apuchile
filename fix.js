const fs = require('fs');

let c = fs.readFileSync('app/page.js', 'utf8');

// Encontrar donde empieza el código real
const start = c.indexOf('// ── Base de datos ONDAC');

if (start === -1) {
  console.log('ERROR: No se encontró el marcador');
  process.exit(1);
}

const header = `"use client";
import { useState, useMemo } from "react";
import { ONDAC_APUS } from "./ondac_data.js";

`;

const clean = header + c.slice(start);
fs.writeFileSync('app/page.js', clean);
console.log('Listo. Lineas:', clean.split('\n').length);
