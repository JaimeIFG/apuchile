/**
 * Base de datos de Especificaciones Técnicas (EE.TT.)
 * Fuentes: EETT 1-8 (Fundación Integra / CORESAM), Anexo ETP Electricidad (Metro),
 *          EETT-Veredas SERVIU RM, EETT-DS-Structural MINVU, C_EETT-Resumidas
 * Compilado para APUchile — pendiente enriquecimiento IA cuando haya créditos.
 *
 * Estructura por código de familia ONDAC:
 * {
 *   titulo, normas[], secciones: { descripcion, materiales, ejecucion, medicion_pago }
 * }
 */

export const EETT_TEMPLATES = {

  // ── DEMOLICIÓN Y RETIRO ───────────────────────────────────────────────────
  V: {
    titulo: "Demolición y Retiro",
    normas: ["DFL 411/1948 Reglamento de Pavimentos", "NCh 1369 Of.78", "Ley 19.300"],
    secciones: {
      descripcion:
        "Los trabajos de demolición comprenden la extracción, retiro y transporte a botadero " +
        "autorizado de todos los elementos existentes que se indican en los planos del proyecto, " +
        "incluyendo pavimentos, solerillas, estructuras y elementos varios. La demolición deberá " +
        "ser ejecutada sin dañar las obras a conservar. El contratista deberá adoptar todas las " +
        "medidas de seguridad necesarias para proteger al personal, terceros y construcciones " +
        "vecinas durante la ejecución de estos trabajos.",
      materiales:
        "Equipos de demolición mecánica o manual según corresponda. Camiones de volteo con " +
        "capacidad suficiente para el retiro de escombros. El transporte se realizará a botadero " +
        "autorizado por la autoridad competente, debiendo el contratista acreditar la disposición " +
        "final del material mediante certificados del botadero.",
      ejecucion:
        "Previo al inicio, se delimitará el área de trabajo con señalética y cierres de " +
        "seguridad según normativa vigente. La demolición se ejecutará en forma progresiva, " +
        "evitando vibraciones o golpes que puedan afectar construcciones adyacentes. " +
        "Los materiales con posibilidad de reutilización serán acopiados separadamente. " +
        "Los escombros serán retirados diariamente para mantener el área de trabajo despejada. " +
        "Queda expresamente prohibido quemar materiales en obra.",
      medicion_pago:
        "La demolición de pavimentos y estructuras se medirá en metros cúbicos (m³) de material " +
        "demolido y transportado, o en metros cuadrados (m²) para losas y pavimentos, según lo " +
        "indicado en el itemizado. El precio unitario incluirá la mano de obra, equipos, " +
        "transporte a botadero y todos los costos asociados.",
    },
  },

  VA: {
    titulo: "Desmantelamiento",
    normas: ["OGUC Art. 5.6", "DS 594 MINSAL"],
    secciones: {
      descripcion:
        "Comprende el desmontaje cuidadoso de elementos existentes destinados a ser conservados, " +
        "reutilizados o entregados al mandante: carpintería, artefactos sanitarios, luminarias, " +
        "equipos y otros elementos especificados en proyecto.",
      materiales:
        "Herramientas manuales y mecánicas adecuadas para cada tipo de elemento. " +
        "Materiales de embalaje y protección para elementos a reutilizar.",
      ejecucion:
        "El desmantelamiento se realizará con precaución para no dañar los elementos. " +
        "Los elementos a reutilizar se limpiarán, catalogarán y almacenarán protegidos. " +
        "Se notificará al ITO antes de iniciar el desmantelamiento de cualquier elemento " +
        "para definir el destino final de cada pieza.",
      medicion_pago:
        "Se medirá por unidad (UN) o global (GL) según lo indicado en el itemizado. " +
        "Incluye desmontaje, traslado interno y acopio en lugar indicado por ITO.",
    },
  },

  VB: {
    titulo: "Demolición de Estructuras",
    normas: ["NCh 170 Of.2013", "OGUC Art. 5.6"],
    secciones: {
      descripcion:
        "Comprende la demolición de elementos estructurales como muros de albañilería, " +
        "hormigón armado, tabiques, sobrecimientos y otros elementos resistentes indicados " +
        "en los planos de demolición.",
      materiales:
        "Equipos de demolición: martillos neumáticos, cortadoras de disco, retroexcavadoras " +
        "según envergadura. Apuntalamiento temporal donde sea necesario para seguridad.",
      ejecucion:
        "Se ejecutará por etapas según secuencia constructiva aprobada por ITO. " +
        "En estructuras de hormigón armado, se cortará el acero antes de demoler el " +
        "hormigón. Se preservarán los elementos de fundación que indique el proyecto. " +
        "No se utilizará explosivos sin autorización expresa del mandante e ITO.",
      medicion_pago:
        "Se medirá en metros cúbicos (m³) de estructura demolida o por partida global (GL). " +
        "Incluye corte, demolición, carga y transporte a botadero autorizado.",
    },
  },

  VC: {
    titulo: "Retiro de Escombros",
    normas: ["Ley 19.300 Bases del Medio Ambiente", "Ordenanzas Municipales"],
    secciones: {
      descripcion:
        "Comprende el carguío, transporte y disposición final en botadero autorizado de " +
        "todos los materiales provenientes de demoliciones, excavaciones y trabajos en general.",
      materiales:
        "Camiones de volteo o contenedores según volumen. Acceso a botadero autorizado " +
        "por la autoridad ambiental correspondiente.",
      ejecucion:
        "El retiro de escombros se realizará en forma permanente durante la obra para " +
        "mantener el área de trabajo en condiciones de orden y seguridad. " +
        "El contratista deberá presentar a la ITO los comprobantes de disposición en " +
        "botadero autorizado.",
      medicion_pago:
        "Se medirá en metros cúbicos (m³) de material retirado o por camión de volteo " +
        "según lo indicado. Incluye carguío, transporte y disposición final.",
    },
  },

  // ── OBRAS CIVILES ─────────────────────────────────────────────────────────
  RB: {
    titulo: "Movimiento de Tierras",
    normas: [
      "NCh 1534/1 Of.2008", "NCh 1534/2 Of.1978", "NCh 1515 Of.1979",
      "NCh 1516.M2010", "ASTM 4253-00", "ASTM 4254-00",
    ],
    secciones: {
      descripcion:
        "Los trabajos de movimiento de tierras comprenden el escarpe y retiro de capa " +
        "vegetal, excavaciones para fundaciones y obras de pavimentación, rellenos " +
        "compactados, provisión de material de relleno y transporte a botadero de " +
        "materiales excedentes. Se incluyen todos los trabajos de preparación y " +
        "nivelación del terreno natural según cotas indicadas en proyecto.",
      materiales:
        "Material de relleno: grava arenosa limpia, libre de grumos de arcilla, materia " +
        "orgánica y partículas mayores a 50mm. CBR mínimo según proyecto (generalmente " +
        "CBR ≥ 60% para bases de pavimento, CBR ≥ 30% para rellenos generales). " +
        "Agua para compactación en cantidad suficiente para alcanzar humedad óptima.",
      ejecucion:
        "Escarpe: se retirará la capa vegetal y terreno orgánico hasta alcanzar el " +
        "terreno natural compacto, profundidad mínima 0.20m o según proyecto. " +
        "Excavaciones: se ejecutarán con maquinaria o a mano hasta las cotas indicadas " +
        "en proyecto, penetrando en terreno firme. El fondo de excavación será aprobado " +
        "por ITO antes de iniciar hormigonado. " +
        "Rellenos: se ejecutarán en capas sucesivas de máximo 0.20m, regadas y " +
        "compactadas hasta alcanzar densidad no inferior al 95% de la Densidad Máxima " +
        "Compactada Seca (DMCS) obtenida en ensayo Proctor Modificado (NCh 1534/2). " +
        "Se prohíbe usar material con piedras mayores a 15cm, basuras o materia orgánica.",
      medicion_pago:
        "Escarpe: m² de superficie escarificada. Excavaciones: m³ de material excavado " +
        "medido en banco. Rellenos: m³ de material colocado y compactado. " +
        "Transporte: m³ x km o por camión según lo indicado. El precio incluye carguío, " +
        "transporte y disposición.",
    },
  },

  RA: {
    titulo: "Demoliciones y Fajas",
    normas: ["DFL 411/1948", "OGUC"],
    secciones: {
      descripcion:
        "Comprende la demolición y retiro de pavimentos existentes (hormigón, asfalto, " +
        "baldosas), soleras, cordones y otros elementos de urbanización, incluyendo " +
        "transporte a botadero.",
      materiales:
        "Equipos de corte y demolición: disco diamantado, martillo neumático, " +
        "retroexcavadora con martillo. Camiones de retiro.",
      ejecucion:
        "Se delimitará el área con señalética de seguridad vial. El corte de pavimentos " +
        "se realizará con disco diamantado para obtener bordes rectos. " +
        "Los residuos serán retirados el mismo día. Se preservarán las redes de " +
        "servicios existentes (agua, electricidad, gas, teléfono).",
      medicion_pago:
        "m² de pavimento demolido, ml de soleras retiradas, m³ de escombros " +
        "transportados, según itemizado.",
    },
  },

  RC: {
    titulo: "Sub-bases y Bases Granulares",
    normas: [
      "NCh 1534/2 Of.1978", "NCh 1369 Of.78", "Manual de Pavimentación SERVIU",
    ],
    secciones: {
      descripcion:
        "Los trabajos comprenden la provisión, transporte, extensión y compactación " +
        "de material granular para conformar sub-bases y bases de pavimentación, " +
        "de acuerdo a los espesores y especificaciones indicados en proyecto.",
      materiales:
        "Base estabilizada: material granular tipo grava arenosa, libre de grumos de " +
        "arcilla y materias orgánicas. Valor CBR ≥ 60% compactado al 95% DMCS. " +
        "Granulometría: pasante tamiz Nº40 ≤ 50%, tamiz Nº200 ≤ 12%. " +
        "Límite líquido ≤ 25%, índice de plasticidad ≤ 6%. " +
        "Sub-base: material CBR ≥ 30%, compactado al 95% DMCS.",
      ejecucion:
        "Preparar la subrasante escarificando y recompactando a 95% DMCS. " +
        "Extender el material en capas uniformes de máximo 0.20m con motoniveladora. " +
        "Regar hasta alcanzar humedad óptima de compactación. " +
        "Compactar con rodillo vibratorio hasta alcanzar 95% DMCS (Proctor NCh 1534/2). " +
        "Controlar densidad in situ según NCh 1516. " +
        "No se permitirá colocar la capa siguiente antes de aprobar densidad.",
      medicion_pago:
        "m² de base compactada por espesor, o m³ de material colocado y compactado. " +
        "Precio incluye provisión del material, transporte, extensión, riego y compactación.",
    },
  },

  RE: {
    titulo: "Estructuras y Obras Anexas",
    normas: [
      "NCh 170 Of.2013", "NCh 163 Of.79", "NCh 148 Of.68",
      "NCh 429 Of.", "NCh 430 Of.", "NCh 172 Of.", "OGUC Art. 5.5",
    ],
    secciones: {
      descripcion:
        "Los trabajos comprenden la ejecución de todas las obras de hormigón armado y " +
        "simple que forman parte de la estructura del edificio: emplantillados, cimientos " +
        "corridos y aislados, sobrecimientos, cadenas, pilares, vigas, losas y radier, " +
        "de acuerdo a planos y cálculo estructural del proyecto. " +
        "Incluye moldajes, enfierradura, hormigonado, curado y control de calidad.",
      materiales:
        "Cemento: Portland normal NCh 148, de envase intacto, almacenado en bodega seca. " +
        "Áridos: áridos limpios sin material orgánico, NCh 163. Arena lavada granulometría " +
        "continua. Ripio sin partículas mayores a 1/5 de la dimensión mínima del elemento. " +
        "Agua: potable, sin sales ni ácidos. " +
        "Acero de refuerzo: " +
        "· A37-24ES (grado 24) barras lisas para estribos y mallas. " +
        "· A44-28H (grado 28) barras corrugadas para enfierradura principal. " +
        "Hormigones: " +
        "· H-5 (emplantillado): dosificación mínima 150 kg cem/m³. " +
        "· H-15 (cimientos ciclopeos): dosificación mínima 200 kg cem/m³, hasta 20% bolón máx 20cm Ø. " +
        "· H-20 (estructural general): dosificación mínima 300 kg cem/m³, fc=20 MPa a 28 días. " +
        "· H-25 (cadenas y pilares): dosificación mínima 350 kg cem/m³, fc=25 MPa a 28 días. " +
        "Moldaje: madera de pino máximo 3 usos, limpia y humedecida antes de hormigonado.",
      ejecucion:
        "Emplantillado: ejecutar con hormigón H-5 espesor mínimo 5 cm sobre fondo de " +
        "excavación apisonado y aprobado por ITO. " +
        "Cimientos: excavar hasta terreno firme (mín 0.60m de profundidad o según proyecto). " +
        "El fondo debe ser aprobado por ITO antes de hormigonar. Enfierradura según planos. " +
        "Sobrecimientos: moldaje limpio bien apuntalado. Aplicar impermeabilizante en cara " +
        "exterior del sobrecimiento. Curado mínimo 7 días antes de desencofrar. " +
        "Radier: colocar polietileno 0.2mm sobre base compactada antes de hormigonar. " +
        "Espesor mínimo 0.10m. Afinar a grano perdido con endurecedor superficial. " +
        "Curado en piscinas de arena húmeda mínimo 7 días. " +
        "Hormigonado: preparación mecánica obligatoria (hormigonera o mixer). " +
        "Vibrado mecánico para eliminar vacíos. " +
        "Control de calidad: tomar probetas cilíndricas Ø150x300mm según NCh 1024: " +
        "mínimo 3 muestras en fundaciones, 2 en pavimentos, 3 en elementos de contención. " +
        "Ensayar a 7 y 28 días en laboratorio certificado. " +
        "No se aceptarán resistencias inferiores a las especificadas.",
      medicion_pago:
        "Emplantillado y radier: m² de superficie. Cimientos y sobrecimientos: m³ de " +
        "hormigón vaciado. Pilares y vigas: m³ de hormigón. " +
        "El precio unitario incluye materiales (cemento, áridos, agua, acero), moldajes, " +
        "hormigonado, vibrado, curado y muestras de control de calidad.",
    },
  },

  RD: {
    titulo: "Revestimientos y Pavimentos Exteriores",
    normas: [
      "NCh 170 Of.2013", "NCh 1498 Of.1982", "NCh 1019 Of.2009",
      "NCh 163 Of.79", "Manual de Pavimentación y Aguas Lluvias SERVIU", "REDEVU",
    ],
    secciones: {
      descripcion:
        "Los trabajos comprenden la construcción de veredas, aceras y pavimentos exteriores " +
        "en hormigón simple, baldosa microvibrada o adoquines, según lo indicado en proyecto, " +
        "incluyendo bases granulares, soleras de confinamiento, dispositivos de rodado para " +
        "accesibilidad universal y obras complementarias.",
      materiales:
        "Hormigón para veredas: resistencia a la flexotracción Rmf ≥ 5 MPa (Rmf=5MPa) " +
        "a 28 días, elaborado con cemento Portland NCh 148, áridos NCh 163, agua potable. " +
        "Baldosa microvibrada: 40x40 cm, espesor 0.036m, resistencia ≥ 30 MPa. " +
        "Baldosa táctil: 40x40 cm con guía de podotáctiles, color contrastante (amarillo). " +
        "Mortero de pega: dosificación 382.5 kg cem/m³ (mezcla 1:4 cemento:arena), " +
        "arena máx 5mm, NCh 163. " +
        "Soleras tipo A: prefabricadas de hormigón, sección 0.15x0.30m, emplantillado " +
        "dosificación 170 kg cem/m³. " +
        "Soleras rebajadas: mismas características, con remate a nivel de calzada para " +
        "accesibilidad universal (plinto cero).",
      ejecucion:
        "Base granular: extender y compactar CBR ≥ 60% al 95% DMCS en espesor indicado " +
        "(generalmente 0.05m a 0.10m para veredas peatonales). " +
        "Soleras: instalar previo a la losa de vereda, sobre emplantillado 170 kg cem/m³. " +
        "Vereda hormigón: ejecutar con espesor uniforme según proyecto (0.07m peatonal / " +
        "0.10m acceso unifamiliar / 0.14m acceso comercial o industrial). " +
        "Sistema de compactación corriente (no vibrado). " +
        "Pendiente transversal mínima 2% hacia la calzada. " +
        "Pastellones de máximo 2.5m x 2.5m separados por juntas de contracción de 5mm. " +
        "Bordes de pastellones terminados a canto redondeado con rebaje de 5mm. " +
        "Curado: mantener húmedo mínimo 7 días con arena húmeda o membrana de curado. " +
        "Baldosa microvibrada: instalar sobre mortero de pega de 3-4 cm, juntas de 5mm " +
        "rellenadas con mortero fluido. " +
        "Dispositivos de rodado: colocar soleras rebajadas a 0% en esquinas y accesos, " +
        "baldosa táctil de alerta y guía según REDEVU.",
      medicion_pago:
        "Veredas hormigón: m² por espesor. Baldosa microvibrada: m². Mortero de pega: m³. " +
        "Soleras: ml por tipo. Dispositivos de rodado: UN. " +
        "El precio incluye base granular, mortero de pega, material de vereda, " +
        "instalación, juntas y curado.",
    },
  },

  // ── HORMIGONES Y AISLACIÓN ────────────────────────────────────────────────
  AA: {
    titulo: "Hormigones y Aislación Térmica",
    normas: [
      "NCh 170 Of.2013", "NCh 163 Of.79", "NCh 148 Of.68", "NCh 1498 Of.1982",
    ],
    secciones: {
      descripcion:
        "Comprende la provisión y colocación de hormigones de distintos grados para " +
        "elementos no estructurales, rellenos de hormigón, aislaciones térmicas y " +
        "acústicas en muros, cielos, solerillas de hormigón y obras menores.",
      materiales:
        "Hormigón H-5 (emplantillado): cemento + áridos + agua, dosificación mínima " +
        "150 kg cem/m³, uso en emplantillados bajo fundaciones. " +
        "Hormigón H-15 (ciclopeo): dosificación mínima 200 kg cem/m³, con hasta 20% de " +
        "bolón de diámetro máximo 20 cm. " +
        "Aislación térmica lana mineral: densidad ≥ 10 kg/m³, espesor según proyecto " +
        "(generalmente 80mm en muros, 80-100mm en cielos). " +
        "Poliestireno expandido EPS: densidad 10-15 kg/m³, espesor según proyecto. " +
        "Aislapol: planchas de poliestireno, espesor indicado en proyecto. " +
        "Fieltro asfáltico: 15 lbs (2.5 kg/m²), barrera de vapor en cubiertas.",
      ejecucion:
        "Hormigón emplantillado: colocar sobre fondo de excavación apisonado, " +
        "espesor mínimo 5 cm, nivelado. " +
        "Aislación térmica en muros Metalcon: colocar entre perfiles, sin huecos ni " +
        "puentes térmicos, fijada con grapas o adhesivo. " +
        "Aislación en cielos: colocar sobre cielo falso o estructura antes de cerrar, " +
        "con traslapes mínimos de 50mm. " +
        "Fieltro asfáltico: instalar con traslapes de 150mm mínimo, grapado sobre " +
        "OSB o estructura, previo a la cubierta.",
      medicion_pago:
        "Hormigón: m³ vaciado. Aislación térmica: m² por tipo y espesor. " +
        "Fieltro asfáltico: m². El precio incluye provisión, transporte y colocación.",
    },
  },

  // ── CUBIERTAS ─────────────────────────────────────────────────────────────
  I: {
    titulo: "Cubiertas",
    normas: ["NCh 819 Of. (madera)", "OGUC Art. 4.1.10", "NCh 170 Of.2013"],
    secciones: {
      descripcion:
        "Los trabajos comprenden la ejecución completa de las cubiertas, incluyendo " +
        "estructura de cerchas y costaneras, aislación térmica, barrera de vapor, " +
        "cubierta propiamente tal y hojalatería (canales, bajadas, tapacanes, " +
        "remates y terminaciones).",
      materiales:
        "Estructura: cerchas y costaneras de madera pino impregnado C16, " +
        "dimensiones según cálculo estructural. Perfil metálico Metalcon según proyecto. " +
        "OSB: placa 9.5mm o 11.1mm para entablado base de cubierta. " +
        "Fieltro asfáltico: 15 lbs (ASTM D 226), colocado sobre OSB con traslapes 150mm. " +
        "Cubierta zinc-aluminio: plancha PV4 prepintada Cintac o equivalente, " +
        "espesor mínimo 0.40mm, color según proyecto. " +
        "Cubierta fibrocemento: plancha ondulada 4mm Pizarreño o Eterboard. " +
        "Fijaciones: ganchos gancho o tornillos galvanizados con arandela neopreno. " +
        "Hojalatería: zinc-aluminio 0.40mm, canales PVC o galvanizadas DN 100mm mínimo. " +
        "Bajadas: PVC DN 75mm o DN 110mm según caudal de proyecto.",
      ejecucion:
        "Cerchas: instalar según plano de montaje estructural, plomadas y alineadas. " +
        "Espaciamiento de costaneras según fabricante de la cubierta (máx 1.00m para " +
        "zinc-aluminio y 0.80m para fibrocemento). " +
        "OSB: fijar con tornillos 38mm @150mm en apoyos. " +
        "Fieltro: instalar de abajo hacia arriba con traslapes mínimos 150mm horizontal " +
        "y 300mm en cumbrera. Grapar cada 0.30m. " +
        "Cubierta zinc-aluminio: instalar de abajo hacia arriba, traslape mínimo 1 onda " +
        "lateral y 200mm longitudinal. " +
        "Pendiente mínima: 10° para zinc-aluminio, 12° para fibrocemento. " +
        "Hojalatería: pendiente mínima de canales 1% hacia bajadas. Sellado de encuentros " +
        "con silicona neutra o masilla elastomérica.",
      medicion_pago:
        "Cubierta: m² de superficie inclinada. Canales: ml por diámetro. " +
        "Bajadas: ml. El precio unitario incluye estructura, aislación, fieltro, " +
        "cubierta, hojalatería, fijaciones y sellados.",
    },
  },

  IA: {
    titulo: "Cubiertas de Fibrocemento",
    normas: ["NCh 170 Of.2013", "OGUC Art. 4.1.10"],
    secciones: {
      descripcion:
        "Comprende el suministro y colocación de planchas onduladas de fibrocemento " +
        "sobre estructura de costaneras de madera o metálicas.",
      materiales:
        "Plancha fibrocemento ondulada: Pizarreño o Eterboard, espesor 4mm o 6mm " +
        "según proyecto. Tornillos de fijación galvanizados con arandela de neopreno. " +
        "Cumbrera prefabricada de fibrocemento o zinc-aluminio. Sellante para remates.",
      ejecucion:
        "Costaneras espaciadas según especificación del fabricante. Instalación de abajo " +
        "hacia arriba con traslape de 1 onda lateral y mínimo 200mm longitudinal. " +
        "Pendiente mínima 12°. Cubierta fijada cada 2 costaneras como mínimo.",
      medicion_pago:
        "m² de cubierta instalada, medida en proyección horizontal. Incluye cumbreras, " +
        "fijaciones y sellados perimetrales.",
    },
  },

  IB: {
    titulo: "Cubiertas de Fierro Galvanizado / Zinc-Aluminio",
    normas: ["OGUC Art. 4.1.10"],
    secciones: {
      descripcion:
        "Comprende el suministro e instalación de planchas metálicas zinc-aluminio " +
        "prepintadas tipo PV4 o PV5, sobre estructura de costaneras.",
      materiales:
        "Plancha zinc-aluminio PV4 o PV5 Cintac o equivalente, espesor mínimo 0.40mm, " +
        "prepintada color según proyecto. Tornillos autorroscantes galvanizados con " +
        "arandela neopreno. Cumbreras, limahoyas y remates en mismo material.",
      ejecucion:
        "Costaneras a distancia según fabricante, máximo 1.00m. Tendido de abajo hacia " +
        "arriba, traslape mínimo 1.5 ondas lateral y 200mm longitudinal. Pendiente " +
        "mínima 10°. Hojalatería en zinc-aluminio con sellante en encuentros.",
      medicion_pago:
        "m² de cubierta instalada. Incluye cumbreras, limas, bajadas de aguas lluvias " +
        "y hojalatería de remate.",
    },
  },

  // ── INSTALACIONES DOMICILIARIAS ───────────────────────────────────────────
  PA: {
    titulo: "Agua Potable Domiciliaria",
    normas: [
      "NCh 1462 Of.", "NCh 691 Of.", "NCh 2485 Of.", "OGUC Art. 4.2",
      "DS 50/2015 MINVU", "Reglamento SISS",
    ],
    secciones: {
      descripcion:
        "Los trabajos comprenden el diseño, ejecución y tramitación ante la empresa " +
        "sanitaria de la instalación de agua potable fría y caliente del edificio, " +
        "desde el medidor hasta los artefactos, incluyendo redes interiores, " +
        "colectores, válvulas, llaves de paso, calentador y todos sus accesorios.",
      materiales:
        "Tuberías: cobre según NCh 691 (tipo L o K según presión) para agua caliente " +
        "y conexiones visibles. PVC presión clase 10 para redes enterradas de agua fría. " +
        "Diámetros según proyecto: alimentador general generalmente 3/4\" a 1\", " +
        "distribución interior 1/2\" y 3/4\". " +
        "Llaves de paso: bronce cromado, presión de trabajo ≥ 10 bar. " +
        "Accesorios: codos, tees, uniones en cobre o PVC según tramo. " +
        "Sellante de juntas: teflón o pasta sellante aprobada para agua potable. " +
        "Calentador: termo eléctrico mural o calefón según proyecto.",
      ejecucion:
        "La instalación se ejecutará conforme al proyecto aprobado por la empresa " +
        "sanitaria y OGUC. Todas las tuberías embutidas en muros irán en manga " +
        "protectora. Las tuberías de cobre se fijarán con abrazaderas cada 1.5m. " +
        "Prueba de presión: se realizará prueba hidrostática a 1.5 veces la presión " +
        "de trabajo durante mínimo 2 horas, sin pérdida de presión. " +
        "Se tramitará la recepción definitiva ante la empresa sanitaria.",
      medicion_pago:
        "ml de tubería instalada por diámetro, o por partida global (GL) según proyecto. " +
        "El precio incluye tuberías, accesorios, llaves de paso, pruebas y tramitación.",
    },
  },

  PB: {
    titulo: "Alcantarillado Domiciliario",
    normas: [
      "NCh 1671 Of.", "NCh 2485 Of.", "OGUC Art. 4.2", "DS 50/2015 MINVU",
      "Reglamento SISS",
    ],
    secciones: {
      descripcion:
        "Comprende la ejecución del sistema de evacuación de aguas servidas y aguas " +
        "lluvia del edificio, desde los artefactos hasta el empalme a la red pública " +
        "o fosa séptica, según corresponda. Incluye tuberías de desagüe, ventilaciones, " +
        "cámaras de inspección y foso de inspección.",
      materiales:
        "Tuberías PVC sanitario Tigre o equivalente: " +
        "· DN 50mm: desagüe lavamanos y lavaplatos. " +
        "· DN 75mm: desagüe ducha y tina. " +
        "· DN 110mm: desagüe WC y colectores principales. " +
        "Adhesivo para PVC sanitario (pegamento de contacto certificado). " +
        "Sifones: PVC integrado en artefactos. " +
        "Cámara de inspección: PVC DN 315mm o albañilería ladrillo consultar proyecto.",
      ejecucion:
        "Las tuberías de desagüe se instalarán con pendiente mínima 1% (horizontal) " +
        "para asegurar escurrimiento. Todas las tuberías llevarán sifón hidráulico. " +
        "Las ventilaciones irán en tubería PVC DN 50mm hasta sobre cubierta. " +
        "Tuberías enterradas: zanja mínima 0.40m de ancho, cama de arena 0.10m, " +
        "relleno compactado. Prueba de estanqueidad: llenar el sistema a presión " +
        "hidrostática 0.5 bar durante 30 min sin pérdida. " +
        "Tramitar recepción ante empresa sanitaria.",
      medicion_pago:
        "ml de tubería por diámetro, UN de cámaras de inspección. " +
        "Precio incluye tuberías, accesorios, sifones, pruebas y tramitación.",
    },
  },

  PC: {
    titulo: "Electricidad Domiciliaria",
    normas: [
      "NCh Elec. 4/2003", "NSEG 5/71 Of.", "NSEG 6/71 Of.", "NSEG 15 E.n.78",
      "Reglamento SEC", "IEC 60502",
    ],
    secciones: {
      descripcion:
        "Los trabajos comprenden el diseño, ejecución y tramitación ante la Superintendencia " +
        "de Electricidad y Combustibles (SEC) de la instalación eléctrica del edificio, " +
        "incluyendo empalme, medidor, tablero de distribución, circuitos de alumbrado, " +
        "enchufes, fuerza, luces de emergencia, puesta a tierra y todos sus accesorios. " +
        "La instalación se tramitará mediante TE1 ante la SEC.",
      materiales:
        "Conductores: " +
        "· Alimentadores: cable XLPE o XTZ N°10 AWG mínimo, libre de halógenos. " +
        "· Alumbrado: EVA 1.5mm² libre de halógenos, color según código NCh Elec. 4/2003. " +
        "· Enchufes y fuerza: EVA 2.5mm² libre de halógenos. " +
        "· Puesta a tierra: EVA 4mm² verde/amarillo. " +
        "Código de colores NCh Elec. 4/2003: Fase A=Rojo, Fase B=Azul, Fase C=Negro, " +
        "Neutro=Blanco o Celeste, Tierra=Verde/Amarillo. " +
        "Canalización: " +
        "· Tubería conduit PVC 3/4\" y 1\" para instalaciones embutidas. " +
        "· Conduit EMT 3/4\" y 1\" para instalaciones expuestas. " +
        "· Máximo 2 curvas de 90° entre cajas de paso. " +
        "Tablero: caja metálica con pintura electrostatica, interruptores termomagnéticos " +
        "y diferenciales según NCh Elec. 4/2003 tabla 6.2. " +
        "· Interruptor general diferencial: 2x25A o 3x25A según sistema. " +
        "· Protecciones por circuito: unipolares 10A alumbrado, 16A enchufes. " +
        "· Diferencial 30mA por cada 8 circuitos de fuerza. " +
        "Luminarias: fluorescentes estancos 2x36W o 2x18W, LED equivalente. " +
        "Luces de emergencia: 2 focos 2x12W, autonomía mínima 90 min. " +
        "Enchufes: dobles 10A a 1.30m de piso o 0.40m sobre mesón. " +
        "Interruptores: a 1.50m de piso.",
      ejecucion:
        "La instalación se ejecutará conforme a NCh Elec. 4/2003 y proyecto aprobado " +
        "por SEC. " +
        "Tuberías conduit: curvas hechas en terreno con dobladora, sin aplastar. " +
        "Espaciado soportes: ≤ 1.5m para diámetros hasta 1\", ≤ 2.0m para 1-1/4\" a 2-1/2\". " +
        "Tendido de conductores: ordenado sin cruces, sin empalmes en tuberías, " +
        "sólo en cajas de paso. Empalmes: por compresión con terminales prensados. " +
        "Identificación: anillos termocontráctiles en todos los conductores. " +
        "Puesta a tierra: conductor EVA 4mm², barras Coperwell 5/8\" x 1.5m enterradas " +
        "en suelo húmedo. Resistencia máxima de puesta a tierra: 10 Ω medidos con " +
        "telurómetro. " +
        "Pruebas: medición de aislamiento ≥ 1000 Ω/V entre conductores activos y tierra " +
        "con megóhmetro (Megger), según art. 9.2.2.3 NCh Elec. 4/2003. " +
        "Tramitación: presentar TE1 completo con planos As Built ante SEC. " +
        "Presentar planos finales en AutoCAD + PDF dentro de 15 días de terminada la obra.",
      medicion_pago:
        "Circuitos: ml de tubería por diámetro, ml de conductor por sección. " +
        "Tablero: UN. Enchufes e interruptores: UN. Luminarias: UN. " +
        "O por partida global (GL) según contrato. " +
        "El precio incluye materiales, mano de obra, pruebas y tramitación SEC.",
    },
  },

  PD: {
    titulo: "Gas Domiciliario",
    normas: ["NSEG 11 E.n.82", "Reglamento SEC", "NCh 1965 Of.", "OGUC Art. 4.2"],
    secciones: {
      descripcion:
        "Comprende el diseño, ejecución y tramitación ante la SEC del proyecto de " +
        "instalación de gas domiciliario (red natural o licuado), desde el medidor " +
        "o gabinete de cilindros hasta los artefactos, incluyendo la prueba de " +
        "estanqueidad y recepción.",
      materiales:
        "Tuberías: cobre tipo L según NCh 691, o acero negro cédula 40 según proyecto. " +
        "Diámetros según cálculo. Accesorios: cobre o acero según tramo. " +
        "Llave de corte: bronce cromado, una por artefacto. " +
        "Gabinete para cilindros GLP: metálico galvanizado, ventilado, con rejillas. " +
        "Calefón o caldera: marca y modelo según proyecto.",
      ejecucion:
        "Instalación conforme al proyecto aprobado por SEC. Tuberías vistas pintadas " +
        "con pintura amarilla. Tuberías embutidas en manga de protección. " +
        "Prueba de presión: neumática a 2 veces la presión de trabajo durante 1 hora. " +
        "Tramitar autorización de funcionamiento ante SEC.",
      medicion_pago:
        "ml de tubería por diámetro, UN de artefactos (calefón, caldera). " +
        "Incluye tramitación SEC.",
    },
  },

  // ── PUERTAS Y VENTANAS ────────────────────────────────────────────────────
  KA: {
    titulo: "Puertas",
    normas: ["NCh 2369 Of. (sismos)", "OGUC Art. 4.1.7", "DS 50/2015"],
    secciones: {
      descripcion:
        "Los trabajos comprenden el suministro e instalación de todas las puertas del " +
        "proyecto, incluyendo marcos, contramarcos, hojas, quincallería y accesorios " +
        "según lo indicado en planos y cuadro de carpintería.",
      materiales:
        "Puertas interiores: hoja HDF Sinfonía o MDF lacado, espesor 35mm, marco " +
        "MDF o pino finger-joint, tapamarcos MDF 65mm. " +
        "Puertas exteriores: hoja metálica o madera sólida según proyecto, " +
        "resistencia ≥ 30 min al fuego donde indique norma. " +
        "Marcos: aluminio anodizado o pino finger-joint según tipo de puerta. " +
        "Quincallería: " +
        "· Bisagras: 3 unidades por hoja, tipo 3\"x3\" en acero inoxidable. " +
        "· Cerradura: tipo POLI o equivalente, con llave en accesos exteriores, " +
        "  con llave de un lado en bodegas, tiradores en puertas internas. " +
        "· Barra antipánico: en salidas de emergencia según DS 594. " +
        "· Salvadedos: en puertas de acceso a recintos de niños. " +
        "Malla insectera: en puertas de cocina y bodegas donde indique proyecto.",
      ejecucion:
        "Marcos: instalar aplomados y nivelados, fijados a la obra gruesa con tarugos " +
        "y tornillos galvanizados cada 0.60m. Sellado perimetral con espuma poliuretano " +
        "y masilla. " +
        "Hojas: colgar con bisagras instaladas a 200mm del extremo superior e inferior " +
        "y en punto medio. Juego entre hoja y marco: 3mm laterales, 5mm inferior. " +
        "Cerradura: a 1.00m del piso eje de manilla. " +
        "Ajuste final: verificar apertura y cierre suave, sin interferencias. " +
        "Acabado: pintura esmalte o barniz según tipo, mínimo 2 manos.",
      medicion_pago:
        "UN por hoja de puerta instalada completa con marco y quincallería. " +
        "El precio incluye todos los materiales, instalación y terminaciones.",
    },
  },

  KB: {
    titulo: "Ventanas",
    normas: [
      "NCh 133 Of. (vidrios)", "NCh 132 Of.", "ASTM B221 (aluminio 6063 T-5)",
      "OGUC Art. 4.1.7",
    ],
    secciones: {
      descripcion:
        "Los trabajos comprenden el suministro e instalación de ventanas de aluminio " +
        "anodizado o pintado con vidrios simples o dobles herméticos, incluyendo " +
        "marcos, contramarcos, quincallería, sellos y malla insectera donde corresponda.",
      materiales:
        "Marco y batiente: aluminio extruido aleación 6063 T-5 según ASTM B221, " +
        "anodizado natural 15 micrones mínimo o pintado al horno. " +
        "Línea de perfil según proyecto: línea 5000 (económica) o línea termopanel. " +
        "Vidrio: " +
        "· Simple: 6mm flotado incoloro NCh 133 para ventanas menores a 1.5m². " +
        "· Doble hermético (DVH): 4+6+4mm o 6+12+6mm para zonas frías y recintos " +
        "  acondicionados. " +
        "Sellos: burlete de PVC o EPDM en todo el perímetro. " +
        "Silicona neutra en encuentros con albañilería. " +
        "Malla insectera: aluminio o fibra de vidrio en baños y cocinas.",
      ejecucion:
        "Contramarco: instalar aplomado y nivelado previo a terminaciones, fijado a " +
        "la obra gruesa. " +
        "Marco: asentar sobre contramarco con calzas niveladoras, fijado con tornillos " +
        "autorroscantes. " +
        "Sellado perimetral interior y exterior con silicona neutra. " +
        "Vidrios: instalar con calzas en perfil inferior, sellados con silicona neutra. " +
        "Verificar que todas las hojas abran y cierren sin interferencias, " +
        "con mecanismo de cierre funcionando correctamente.",
      medicion_pago:
        "UN por ventana instalada completa, o m² de superficie de ventana. " +
        "El precio incluye marco, contramarco, vidrios, quincallería, sellos y malla.",
    },
  },

  // ── REVESTIMIENTOS ────────────────────────────────────────────────────────
  GA: {
    titulo: "Revestimientos de Muros",
    normas: ["NCh 2369 Of.", "OGUC Art. 4.1.7"],
    secciones: {
      descripcion:
        "Comprende la ejecución de todos los revestimientos de muros interiores y " +
        "exteriores indicados en proyecto, incluyendo estuco, planchas de yeso-cartón, " +
        "Volcansiding, cerámicos y otros materiales según cuadro de terminaciones.",
      materiales:
        "Revestimiento exterior Volcansiding: planchas de fibrocemento Volcansiding " +
        "HZ 12mm, color según proyecto. Pintura látex acrílica exterior: sellador " +
        "base + 2 manos Ceresita o equivalente (colores según tabla de proyecto). " +
        "Yeso-cartón zonas secas: Volcanita Estándar 12.5mm o 15mm. " +
        "Yeso-cartón zonas húmedas (baños, cocinas): Volcanita RH 15mm resistente " +
        "a la humedad. " +
        "Placa OSB 11.1mm: en cara exterior de tabiques Metalcon bajo Volcansiding. " +
        "Cerámico muro: 20x30 cm o 30x60 cm, marca Cordillera u similar, " +
        "en baños y cocinas hasta altura indicada en proyecto. " +
        "Mortero de pega: proporción 1:4 (cemento:arena), espesor 8-10mm.",
      ejecucion:
        "Yeso-cartón: fijar a perfiles Metalcon con tornillos autoperforantes cada " +
        "300mm en campo y 150mm en bordes. Juntas tapadas con cinta de papel y " +
        "masilla Tajamar. Lija y terminación llana lista para pintura. " +
        "OSB: fijar con tornillos cada 150mm en bordes y 300mm en campo. " +
        "Volcansiding: instalar con traslape mínimo 30mm, fijado con tornillos " +
        "galvanizados. Pintura: 1 mano selladora + 2 manos esmalte acrílico. " +
        "Cerámico: preparar superficie con pasta niveladora, instalar con adhesivo " +
        "cerámico o mortero de pega, juntas de 3-5mm rellenadas con fragüe. " +
        "Esquinas: guardacantos metálicos o de PVC.",
      medicion_pago:
        "m² por tipo de revestimiento. Precio incluye preparación de superficie, " +
        "material de revestimiento, fijaciones y terminaciones.",
    },
  },

  GB: {
    titulo: "Revestimientos de Cielos",
    normas: ["OGUC Art. 4.1.7", "NCh 2369 Of."],
    secciones: {
      descripcion:
        "Comprende la ejecución de cielos falsos con yeso-cartón, OSB o Volcanita, " +
        "sobre entramado de perfiles metálicos o madera, incluyendo aislación térmica " +
        "cuando se indique.",
      materiales:
        "Entramado: perfiles metálicos omega o canal para cielo, galvanizados, " +
        "o costaneras de madera 2x2\" según proyecto. " +
        "Yeso-cartón cielo zona seca: Volcanita Estándar 10mm. " +
        "Yeso-cartón cielo zona húmeda: Volcanita RH 15mm. " +
        "Aislación térmica en cielo: lana mineral Aislanglas R-188 espesor 80mm " +
        "o poliestireno Aislapol espesor indicado. " +
        "Cinta y masilla: para tapado de juntas y terminación.",
      ejecucion:
        "Entramado: instalar según modulación de placas (generalmente 400mm o 600mm), " +
        "nivelado con nivel láser o hilo. Fijar a estructura con golillas y tornillos. " +
        "Placas: fijar con tornillos autoperforantes cada 300mm. " +
        "Juntas: cubrir con cinta de papel + masilla, lija fina y terminación lista " +
        "para pintura. Aislación: colocar sobre cielo sin dejar puentes térmicos.",
      medicion_pago:
        "m² de cielo terminado. Incluye entramado, placa, aislación, masillado " +
        "y terminación.",
    },
  },

  // ── PAVIMENTOS ────────────────────────────────────────────────────────────
  HA: {
    titulo: "Pavimentos Cerámicos",
    normas: ["NCh 163 Of.79"],
    secciones: {
      descripcion:
        "Comprende el suministro e instalación de pavimentos cerámicos en interiores, " +
        "incluyendo preparación de la superficie, mortero de pega, cerámico y fragüe.",
      materiales:
        "Cerámico piso: 20x20cm o 30x30cm, antideslizante en baños y circulaciones. " +
        "Cerámico marca Cordillera, Porcelanato o equivalente, primera calidad. " +
        "Adhesivo cementicio tipo C1 (interior seco) o C2 (húmedo). " +
        "Fragüe: acrílico para juntas 3mm, color coordinado con cerámico. " +
        "Rodón de esquina: perfil de aluminio o PVC.",
      ejecucion:
        "Superficie base: radier afinado, sin irregularidades > 3mm bajo regla de 2m. " +
        "Fraguar fisuras con mortero epoxi. " +
        "Adhesivo: extender con llana dentada 10mm, en capas de 5-8mm. " +
        "Cerámico: instalar con juntas de 3-5mm, verificar horizontalidad con nivel. " +
        "Fragüe: aplicar 48 horas después de instalación del cerámico. " +
        "Proteger con cartón durante la construcción.",
      medicion_pago:
        "m² de cerámico instalado. Incluye preparación de superficie, adhesivo, " +
        "instalación, fragüe y rodones.",
    },
  },

  HC: {
    titulo: "Pavimentos de Madera y Vinílicos",
    normas: ["NCh 819 Of. (madera)"],
    secciones: {
      descripcion:
        "Comprende la instalación de palmetas vinílicas o parquet de madera sobre " +
        "radier afinado, en salas, oficinas y recintos secos según cuadro de terminaciones.",
      materiales:
        "Palmeta vinílica: MAWIZA tile 30.4x30 cm, espesor 3.2mm, co-polímero PVC, " +
        "o similar primera calidad. " +
        "Adhesivo: de contacto acrílico apto para PVC, con tiempo de trabajo ≥ 15 min. " +
        "Temperatura de instalación: mínima 10°C. " +
        "Rodón PVC o madera: 20x20mm en encuentro piso-muro.",
      ejecucion:
        "Radier base: plano, sin ondulaciones > 2mm bajo regla de 2m. Secar mínimo " +
        "28 días antes de instalar. Aplicar sellador si humedad > 3%. " +
        "Adhesivo: extender sobre radier y dorso de palmeta, esperar 10 min, " +
        "instalar cuando adhesivo esté pegajoso al tacto. " +
        "Palmetas: instalar en junta topo o con offset 50% entre filas, desde el " +
        "centro del recinto hacia los bordes. Juntas selladas con silicona.",
      medicion_pago:
        "m² de pavimento instalado. Incluye adhesivo, instalación y rodones.",
    },
  },

  HE: {
    titulo: "Pavimentos de Caucho y Alfombras",
    normas: [],
    secciones: {
      descripcion:
        "Comprende el suministro e instalación de pavimentos de caucho continuo o " +
        "baldosas de caucho en salas de juego, gimnasios y zonas de tráfico intenso.",
      materiales:
        "Caucho continuo espesor 4-6mm, o baldosa 50x50cm espesor 10mm para exterior. " +
        "Adhesivo epoxi o adhesivo de contacto según fabricante. " +
        "Zócalo de caucho o PVC.",
      ejecucion:
        "Radier base limpio, libre de polvo y grasa. Aplicar adhesivo en partes y " +
        "tender el caucho eliminando burbujas con rodillo. Sellar juntas con adhesivo.",
      medicion_pago: "m² de pavimento instalado.",
    },
  },

  // ── PINTURAS Y BARNICES ───────────────────────────────────────────────────
  FA: {
    titulo: "Pinturas y Barnices",
    normas: ["OGUC Art. 4.1.7"],
    secciones: {
      descripcion:
        "Los trabajos comprenden la preparación de superficies y aplicación de pinturas " +
        "y barnices en todos los elementos del proyecto que lo requieran: muros " +
        "interiores y exteriores, cielos, puertas, ventanas y estructuras metálicas, " +
        "según tabla de colores y terminaciones del proyecto.",
      materiales:
        "Muros y cielos interiores: pasta muro Tajamar F-15 para empaste de juntas " +
        "y reparaciones, lija N°180. Pintura: esmalte acrílico o látex lavable " +
        "Ceresita o Sipa, colores según tabla. " +
        "Muros exteriores Volcansiding/fibrocemento: sellador base acrílico, " +
        "pintura látex exterior 100% acrílico, mínimo 2 manos. " +
        "Metálicos (puertas, estructuras, barandas): " +
        "· Limpieza mecánica a metal limpio (ST-2 SSPC). " +
        "· 1 mano anticorrosivo alquídico epóxico. " +
        "· 2 manos esmalte sintético o pintura epoxi. " +
        "Pintura intumescente: en estructura metálica donde indique proyecto, " +
        "espesor de capa según certificación RF del fabricante. " +
        "Barniz marino: en maderas exteriores (pilares, pérgolas), mínimo 3 manos.",
      ejecucion:
        "Preparación superficies: lijar, tapar fisuras, sanar manchas. " +
        "Yeso-cartón: empaste con Tajamar F-15 en juntas y cabezas de tornillo, " +
        "lija fina, imprimación. " +
        "Concreto: limpiar polvo, tratar eflorescencias con ácido muriático 10%, " +
        "aplicar sellador penetrante. " +
        "Pintura: 1 mano imprimación/sellador + 2 manos de terminación. " +
        "No aplicar en condiciones de lluvia, temperatura < 5°C o > 35°C, " +
        "ni humedad relativa > 85%. " +
        "Metálicos: decapar óxido, aplicar wash primer o epóxico, 2 manos esmalte.",
      medicion_pago:
        "m² de superficie pintada por tipo de terminación. " +
        "El precio incluye preparación, materiales y todas las manos indicadas.",
    },
  },

  // ── ARTEFACTOS SANITARIOS ─────────────────────────────────────────────────
  PE: {
    titulo: "Artefactos Sanitarios",
    normas: ["NCh 2485 Of.", "Reglamento SISS", "DS 50/2015 MINVU"],
    secciones: {
      descripcion:
        "Comprende el suministro e instalación de todos los artefactos sanitarios " +
        "indicados en proyecto: lavamanos, WC, tinas, duchas, lavaplatos, urinarios " +
        "y sus respectivas griferías, conexiones y accesorios.",
      materiales:
        "WC: modelo silencioso Fanaloza o Trebol, instalación fijada a piso, " +
        "con tapa y asiento. " +
        "Lavamanos: Fanaloza Valencia o similar, con pedestal o ménsula. " +
        "Lavamanos discapacitados: altura de instalación 0.80m, espacio libre inferior " +
        "mínimo 0.68m, Fanaloza o similar. " +
        "Tina: Fanaloza 70x105cm o según proyecto. " +
        "Grifería monomando lavamanos: Nibsa modelo Rosario o similar, " +
        "70% ahorro energético (MINVU DS 50). " +
        "Grifería universal: Fas Texas Cromo o equivalente. " +
        "Sello: Sikaflex color blanco entre artefacto y muro/piso. " +
        "Barras de apoyo: acero inoxidable Ø38mm, fijadas a estructura resistente.",
      ejecucion:
        "Instalar artefactos una vez terminadas todas las terminaciones de muros y pisos. " +
        "WC: fijado al piso con pernos de anclaje galvanizados, unión con pieza especial. " +
        "Lavamanos: fijado a muro con taquetes de expansión. " +
        "Sellado perimetral con Sikaflex. " +
        "Grifería: apriete final con llave de cadena, sin exceder 20 Nm. " +
        "Prueba: verificar funcionamiento de todos los artefactos, sin pérdidas.",
      medicion_pago:
        "UN por artefacto instalado completo con grifería. " +
        "Precio incluye artefacto, grifería, conexiones y sellado.",
    },
  },

  PF: {
    titulo: "Accesorios de Baño",
    normas: ["DS 50/2015 MINVU", "OGUC Art. 4.1.7"],
    secciones: {
      descripcion:
        "Comprende el suministro e instalación de los accesorios de baño: " +
        "porta toallas, jaboneras, portarrollos, espejos, cortinas de ducha, " +
        "barras de apoyo y otros accesorios indicados en proyecto.",
      materiales:
        "Porta toallas, jabonera, portarrollos: acero inoxidable AISI 304 o " +
        "aluminio anodizado. " +
        "Espejo: vidrio flotado 6mm, marco de aluminio anodizado, " +
        "pegado con silicona neutra. " +
        "Barra cortina: acero inoxidable Ø19mm con anillas. " +
        "Cortina: PVC lavable, con forro antihongos.",
      ejecucion:
        "Instalar con tacos de expansión en muro, a altura indicada en proyecto. " +
        "Verificar nivel y aplome. Sellado con silicona neutra en bordes.",
      medicion_pago:
        "UN por accesorio instalado. Incluye fijaciones y sellado.",
    },
  },

  // ── ESCALERAS Y BARANDAS ─────────────────────────────────────────────────
  S: {
    titulo: "Escaleras y Barandas",
    normas: ["OGUC Art. 4.1.9", "NCh 2369 Of.", "DS 594 MINSAL (seguridad)"],
    secciones: {
      descripcion:
        "Comprende la ejecución de escaleras de hormigón armado, metálicas o madera, " +
        "y la instalación de barandas y pasamanos, de acuerdo a planos y cálculo " +
        "estructural. Incluye rampas de acceso para personas con discapacidad.",
      materiales:
        "Escaleras hormigón armado: H-25, enfierradura A44-28H. " +
        "Escaleras metálicas: perfiles estructurales, soldadas, con pintura anticorrosiva. " +
        "Huella: nariz de grada de aluminio antideslizante o cinta antideslizante 50mm. " +
        "Barandas: tubo acero inoxidable AISI 304 Ø38mm para pasamanos. " +
        "Balaustres: cuadrado acero 20x20mm @100mm máximo. " +
        "Altura baranda: mínimo 1.05m para diferencias de nivel > 1.00m. " +
        "Rampas: pendiente máxima 8%, ancho mínimo 0.90m, pavimento antideslizante.",
      ejecucion:
        "Escaleras hormigón: moldaje con madera cepillada para obtener superficie lisa. " +
        "Vibrado cuidadoso para evitar segregación. Curado 14 días mínimo. " +
        "Barandas metálicas: soldadas a placa de base anclada con pernos a estructura. " +
        "Toda la estructura con pintura anticorrosiva y 2 manos esmalte. " +
        "Nariz de grada: fijada con remaches o adhesivo epoxi en arista de huella. " +
        "Verificar estabilidad de baranda con carga horizontal de 100 kg/m.",
      medicion_pago:
        "Escaleras: ml o m² de huella. Barandas y pasamanos: ml. " +
        "El precio incluye estructura, pintura y todos los accesorios.",
    },
  },

  // ── MOBILIARIO ────────────────────────────────────────────────────────────
  W: {
    titulo: "Mobiliario",
    normas: ["OGUC Art. 4.1.7", "DS 548 (jardines infantiles si aplica)"],
    secciones: {
      descripcion:
        "Comprende el suministro e instalación del mobiliario fijo y equipamiento " +
        "indicado en proyecto: muebles de cocina, closets, estantes, bancas, " +
        "mesones de trabajo, casilleros y otros elementos.",
      materiales:
        "Mueble de cocina: cuerpo en MDF 18mm melaminado, puertas en MDF " +
        "o Fórmica, herrajes soft-close. " +
        "Mesón: postformado o granito según proyecto. " +
        "Estantes: MDF 18mm melaminado, soportes metálicos regulables. " +
        "Closet: MDF melaminado 18mm, puertas correderas. " +
        "Bancas: madera sólida o pino impregnado acabado barniz.",
      ejecucion:
        "Instalar al término de todas las terminaciones. Fijar a muro con tarugos " +
        "y tornillos galvanizados. Verificar nivel y aplome. " +
        "Ajustar puertas y cajones. Instalar tiradores y herrajes.",
      medicion_pago:
        "UN por mueble o ml lineal de mueble. Precio incluye materiales, " +
        "fabricación, transporte e instalación.",
    },
  },

  // ── OBRAS DE URBANIZACIÓN ─────────────────────────────────────────────────
  O: {
    titulo: "Obras de Urbanización",
    normas: [
      "Ley 18.695 Orgánica Municipalidades", "DFL 458/75 LGUC",
      "OGUC", "Manual de Pavimentación SERVIU", "REDEVU",
    ],
    secciones: {
      descripcion:
        "Los trabajos de urbanización comprenden la ejecución de veredas, aceras, " +
        "solerillas, dispositivos de rodado para accesibilidad universal, " +
        "pavimentos exteriores de acceso, cierros, señalética y demás obras " +
        "de urbanización indicadas en el plano de obras exteriores. " +
        "Se dará especial atención al cumplimiento de la normativa de accesibilidad " +
        "universal (REDEVU) en todos los elementos.",
      materiales:
        "Ver especificaciones de partidas RD (veredas y pavimentos) para materiales " +
        "de pavimentación. " +
        "Soleras tipo A y C: prefabricadas de hormigón vibrado, " +
        "resistencia mínima 35 MPa, sección según proyecto. " +
        "Letrero de obra: panel 4.0x2.5m, estructura ASTM A36 — perfil cajón 80x40x2mm, " +
        "diagonales ángulo 40x40x3mm, fundaciones 0.5x0.5x0.6m, gigantografía PVC " +
        "300 dpi. Altura mínima 2.50m sobre terreno.",
      ejecucion:
        "Instalación de faenas: habilitar cierre perimetral, acceso controlado, " +
        "bodega, baño químico y letrero de obra según especificaciones. " +
        "Replanteo: materializar puntos fijos con estacas y niveletas antes de " +
        "iniciar cualquier trabajo. " +
        "Soleras: fijar con emplantillado de hormigón 170 kg cem/m³, verificar " +
        "alineamiento con hilo y nivel de escuadra. " +
        "Veredas: ejecutar según especificación RD. " +
        "Pendiente transversal 2% hacia la calzada. " +
        "Dispositivos de rodado (rampas accesibilidad): soleras rebajadas a plinto " +
        "cero en todas las esquinas y accesos, baldosa táctil color amarillo.",
      medicion_pago:
        "Por tipo de obra: m² veredas, ml soleras, UN dispositivos de rodado, " +
        "GL instalación de faenas, GL letrero de obra. " +
        "El precio incluye todos los materiales, mano de obra y medidas de seguridad vial.",
    },
  },

  // ── QUINCALLERÍA ─────────────────────────────────────────────────────────
  N: {
    titulo: "Quincallería",
    normas: ["OGUC Art. 4.1.7"],
    secciones: {
      descripcion:
        "Comprende el suministro e instalación de toda la quincallería no incluida " +
        "en puertas y ventanas: cerrojos, candados, picaportes, tiradores, " +
        "bisagras especiales, seguros y herrajes varios.",
      materiales:
        "Cerraduras: POLI o equivalente, cilindro doble leva, llaves de seguridad. " +
        "Bisagras: acero inoxidable 3\"x3\" para puertas hasta 50kg. " +
        "Picaportes y cerrojos: acero inoxidable o latón cromado. " +
        "Tiradores: aluminio o acero inoxidable.",
      ejecucion:
        "Instalar quincallería según indicaciones de fabricante. Verificar " +
        "funcionamiento correcto antes de entrega final.",
      medicion_pago:
        "UN por elemento instalado, o GL por quincallería completa del proyecto.",
    },
  },
};

/**
 * Retorna los templates correspondientes a las familias presentes en el proyecto.
 * @param {Array} partidas - Array de partidas del proyecto (con .familia o .codigo)
 * @returns {Array} - Array de { codigo, data } en orden constructivo
 */
export function getTemplatesParaProyecto(partidas) {
  const familias = new Set();
  partidas.forEach(p => {
    const fam = (p.familia || p.codigo || "").toUpperCase();
    // Buscar match directo o por prefijo
    Object.keys(EETT_TEMPLATES).forEach(key => {
      if (fam === key || fam.startsWith(key)) familias.add(key);
    });
  });

  // Orden constructivo
  const ORDEN = ["V","VA","VB","VC","RB","RA","RC","RE","RD","AA","I","IA","IB",
                 "PA","PB","PC","PD","KA","KB","GA","GB","HA","HC","HE","FA","PE","PF","S","W","N","O"];

  return ORDEN
    .filter(k => familias.has(k) && EETT_TEMPLATES[k])
    .map((k, idx) => ({ codigo: k, capitulo: idx + 1, data: EETT_TEMPLATES[k] }));
}
