const fs = require('fs');

const ondac = require('./app/ondac_data.js');
const apus = ondac.ONDAC_APUS.map(a => ({ ...a, insumos: [] }));
console.log('APUs a inyectar:', apus.length);

let page = fs.readFileSync('app/page.js', 'utf8');

// Quitar import si existe
page = page.replace(/import \{ ONDAC_APUS \} from ["']\.\/ondac_data\.js["'];\n?/g, '');

// Encontrar inicio del array APUS
const inicio = page.indexOf('const APUS = [');
if (inicio === -1) {
  console.log('ERROR: No se encontró const APUS = [');
  process.exit(1);
}

// Encontrar el fin del array - buscar el cierre correcto
let depth = 0;
let fin = inicio;
let encontrado = false;

for (let i = inicio; i < page.length; i++) {
  if (page[i] === '[') depth++;
  if (page[i] === ']') {
    depth--;
    if (depth === 0) {
      fin = i + 1;
      encontrado = true;
      break;
    }
  }
}

if (!encontrado) {
  console.log('ERROR: No se encontró el cierre del array');
  process.exit(1);
}

console.log('Array encontrado, posiciones:', inicio, '-', fin);

// Reemplazar
const antes = page.slice(0, inicio);
const despues = page.slice(fin);
const nuevo = 'const APUS = ' + JSON.stringify(apus) + ';';
const pageFinal = antes + nuevo + despues;

fs.writeFileSync('app/page.js', pageFinal);
console.log('Listo. Líneas:', pageFinal.split('\n').length);
console.log('Partidas en la app:', apus.length);
