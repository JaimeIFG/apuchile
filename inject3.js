const fs = require('fs');

const ondac = require('./app/ondac_data.js');

// Mapear campos del ONDAC al formato de la app
const apus = ondac.ONDAC_APUS.map((a, i) => ({
  codigo: a.codigo || ('APU-' + i),
  desc: a.descripcion || a.desc || 'Sin descripción',
  unidad: a.unidad || 'gl',
  precio: a.precio || 0,
  familia: a.familia || 'R',
  insumos: [{
    tipo: 'mat',
    desc: a.descripcion || 'Material',
    un: a.unidad || 'gl',
    rend: null,
    cant: 1,
    perd: 0,
    punit: a.precio || 0
  }],
  _uid: 'apu_' + i
}));

console.log('APUs a inyectar:', apus.length);
console.log('Ejemplo:', JSON.stringify(apus[0]));

let page = fs.readFileSync('app/page.js', 'utf8');

// Quitar import si existe
page = page.replace(/import \{ ONDAC_APUS \} from ["']\.\/ondac_data\.js["'];\n?/g, '');

// Encontrar y reemplazar el array APUS completo
const inicio = page.indexOf('const APUS = ');
if (inicio === -1) {
  console.log('ERROR: No se encontró const APUS');
  process.exit(1);
}

// Encontrar el fin de la declaración (puede ser array o llamada a función)
let fin = inicio;
const primerChar = page[inicio + 13]; // carácter después de "const APUS = "

if (primerChar === '[') {
  // Es un array, buscar el cierre del array
  let depth = 0;
  for (let i = inicio + 13; i < page.length; i++) {
    if (page[i] === '[') depth++;
    if (page[i] === ']') {
      depth--;
      if (depth === 0) { fin = i + 1; break; }
    }
  }
} else {
  // Es una expresión, buscar el punto y coma
  fin = page.indexOf(';', inicio + 13) + 1;
}

console.log('Reemplazando posiciones:', inicio, '-', fin);

const antes = page.slice(0, inicio);
const despues = page.slice(fin);
const nuevo = 'const APUS = ' + JSON.stringify(apus) + ';';
const pageFinal = antes + nuevo + despues;

fs.writeFileSync('app/page.js', pageFinal);
console.log('✓ Listo. Líneas:', pageFinal.split('\n').length);
console.log('✓ Partidas en la app:', apus.length);
