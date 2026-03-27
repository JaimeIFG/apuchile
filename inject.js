const fs = require('fs');

// Cargar datos ONDAC
const ondac = require('./app/ondac_data.js');
const apus = ondac.ONDAC_APUS.map(a => ({ ...a, insumos: [] }));

console.log('APUs a inyectar:', apus.length);

// Leer page.js actual
let page = fs.readFileSync('app/page.js', 'utf8');

// Quitar el import de ondac_data si existe
page = page.replace(/import \{ ONDAC_APUS \} from "\.\/ondac_data\.js";\n?/g, '');
page = page.replace(/import \{ ONDAC_APUS \} from '\.\/ondac_data\.js';\n?/g, '');

// Reemplazar la línea APUS con los datos reales
const lineaVieja = 'const APUS = ONDAC_APUS.map(a => ({ ...a, insumos: [] }));';
const lineaNueva = 'const APUS = ' + JSON.stringify(apus) + ';';

if (page.includes(lineaVieja)) {
  page = page.replace(lineaVieja, lineaNueva);
  console.log('Datos inyectados correctamente');
} else {
  console.log('ERROR: No se encontró la línea a reemplazar');
  console.log('Buscando APUS en el archivo...');
  const idx = page.indexOf('const APUS');
  if (idx > -1) {
    console.log('Encontrado en posición:', idx);
    console.log('Contexto:', page.substring(idx, idx + 100));
  }
  process.exit(1);
}

fs.writeFileSync('app/page.js', page);
console.log('page.js actualizado. Líneas:', page.split('\n').length);
