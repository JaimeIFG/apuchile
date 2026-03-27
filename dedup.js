const fs = require('fs');
const o = require('./app/ondac_data.js');

// Eliminar duplicados
const seen = new Set();
const unique = o.ONDAC_APUS.filter(a => {
  const k = a.codigo + '_' + a.descripcion;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

console.log('Antes:', o.ONDAC_APUS.length, '→ Después:', unique.length);

// Guardar ondac_data.js limpio
const contenido = 'export const ONDAC_APUS=' + JSON.stringify(unique) + ';\n' +
  'export const ONDAC_MATERIALES=' + JSON.stringify(o.ONDAC_MATERIALES) + ';\n' +
  'module.exports={ONDAC_APUS:' + JSON.stringify(unique) + ',ONDAC_MATERIALES:' + JSON.stringify(o.ONDAC_MATERIALES) + '};';

fs.writeFileSync('app/ondac_data.js', contenido);
console.log('✓ ondac_data.js actualizado sin duplicados');
