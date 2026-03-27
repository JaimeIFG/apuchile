const fs = require('fs');
const d = require('./app/ondac_data.js');

// Mapa de palabras clave a familias
const KEYWORDS = [
  // Instalaciones
  { keys: ['AGUA POTABLE','EMPALME AGUA','MEDIDOR AGUA','TUBERIA AGUA','VALVULA AGUA'], familia: 'PA' },
  { keys: ['ALCANTARILLADO','UNION DOMICILIARIA','CAMARA INSPECCION','TUBERIA PVC ALCANT'], familia: 'PB' },
  { keys: ['ELECTRICO','ELECTRICA','EMPALME ELECTR','TABLERO','CONDUCTOR','AMPOLLETA','INTERRUPTOR','ENCHUFE','ILUMINACION','ALUMBRADO'], familia: 'PC' },
  { keys: ['GAS NATURAL','EMPALME GAS','TUBERIA GAS','MEDIDOR GAS','GASFITER','CALEFON'], familia: 'PD' },
  { keys: ['ARTEFACTO SANITARIO','WC','INODORO','LAVAMANOS','LAVAPLATOS','BIDET'], familia: 'PE' },
  { keys: ['PORTA ROLLO','JABONERA','ESPEJO','BARRA SEGURIDAD','ACCESORIO BAÑO','ACCESORIO SANITARIO'], familia: 'PF' },
  // Obras civiles
  { keys: ['ACARREO','MOVIMIENTO TIERRA','EXCAVACION','RELLENO COMPACTADO','ESCARPE','NIVELACION TERRENO'], familia: 'RB' },
  { keys: ['HORMIGON','RADIER','CIMIENTO','SOBRECI','MOLDAJE','ENFIERRAD','ACERO CORRUG'], familia: 'RE' },
  { keys: ['DEMOLICION','DEMOLER','RETIRO ESCOMBROS','ESCOMBRERAS'], familia: 'VB' },
  { keys: ['PAVIMENTO','ADOQUIN','BALDOSA','ACERA','CALZADA'], familia: 'RD' },
  { keys: ['SUB-BASE','SUBBASE','BASE GRANULAR','MATERIAL GRANULAR'], familia: 'RC' },
  // Terminaciones
  { keys: ['OSB','MDF','YESO CARTON','FIBROCEMENTO MURO','REVESTIMIENTO MURO','TABIQUE','PLANCHA MURO'], familia: 'GA' },
  { keys: ['CIELO','PLANCHA CIELO','REVESTIMIENTO CIELO','FIBROCEMENTO CIELO'], familia: 'GB' },
  // Pavimentos
  { keys: ['CERAMICO','CERAMICA','PORCELANATO','GRES'], familia: 'HA' },
  { keys: ['PISO LAMINADO','PARQUET','MADERA PISO','PISO FLOTANTE'], familia: 'HC' },
  { keys: ['ALFOMBRA'], familia: 'HE' },
  // Cubiertas
  { keys: ['ZINC','CUBIERTA ZINC','TEJA ZINC','CUBIERTA METALICA'], familia: 'IB' },
  { keys: ['FIBROCEMENTO TECHO','FIBROCEMENTO CUBIERTA','PLANCHA FIBROCEMENTO TECHO'], familia: 'IA' },
  { keys: ['TEJA','CUBIERTA TEJA'], familia: 'ID' },
  // Puertas y ventanas
  { keys: ['PUERTA','MARCO PUERTA'], familia: 'KA' },
  { keys: ['VENTANA','TERMOPANEL','VIDRIO'], familia: 'KB' },
  // Pinturas
  { keys: ['PINTURA','LATEX','ESMALTE','BARNIZ','ANTICORROSIVO','PINTAR'], familia: 'F' },
  // Aislacion
  { keys: ['AISLANTE','AISLACION','LANA VIDRIO','LANA MINERAL','POLIESTIRENO','ESPUMA'], familia: 'AA' },
  // Demolicion y retiro
  { keys: ['RETIRO ESCOMBRO','RETIRO MATERIAL','ESCARPE VEGETAL'], familia: 'VC' },
  { keys: ['DESMANTELAR','DESMANTELAMIENTO'], familia: 'VA' },
  // Mobiliario
  { keys: ['SILLA','MESA','ESCRITORIO','MOBILIARIO','MUEBLE','LOCKER'], familia: 'W' },
  // Urbanización
  { keys: ['JARDINES','AREAS VERDES','CESPED','PLANTAS'], familia: 'QF' },
  { keys: ['PAVIMENTACION URBANA','ADOQUINES URBANO'], familia: 'QA' },
  // Escaleras
  { keys: ['ESCALERA','BARANDA','PASAMANO'], familia: 'S' },
];

function asignarFamilia(descripcion) {
  if (!descripcion) return 'R';
  const desc = descripcion.toUpperCase();
  for (const { keys, familia } of KEYWORDS) {
    for (const key of keys) {
      if (desc.includes(key)) return familia;
    }
  }
  return 'R'; // Por defecto: Obras Civiles
}

// Asignar familias
const apusConFamilia = d.ONDAC_APUS.map((a, i) => ({
  ...a,
  familia: asignarFamilia(a.descripcion || a.desc)
}));

// Estadísticas
const stats = {};
apusConFamilia.forEach(a => { stats[a.familia] = (stats[a.familia] || 0) + 1; });
console.log('Distribución por familia:');
Object.entries(stats).sort((a,b) => b[1]-a[1]).forEach(([f,n]) => console.log(`  ${f}: ${n}`));

// Guardar
const contenido = 'export const ONDAC_APUS=' + JSON.stringify(apusConFamilia) + ';\n' +
  'module.exports={ONDAC_APUS:' + JSON.stringify(apusConFamilia) + '};';
fs.writeFileSync('app/ondac_data.js', contenido);
console.log('\n✓ ondac_data.js actualizado con familias');
console.log('Total APUs:', apusConFamilia.length);
