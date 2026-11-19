interface Reference {
  category: string
  title: string
  price: string
  scope: string
  context: string
  url: string
  source: string
  additionalSource?: { label: string; url: string }
}

const incomeSource = 'https://www.infobae.com/economia/2026/10/01/la-desigualdad-bajo-en-el-segundo-trimestre-pero-el-10-mas-rico-gana-13-veces-mas-que-el-sector-con-menos-recursos/'
const references: Reference[] = [
  {
    category: 'Ingreso laboral · Mediana',
    title: 'Ocupación principal',
    price: 'ARS 900.000 por mes',
    scope: '31 aglomerados urbanos · Abril–junio de 2026 · Publicado: 1 oct 2026',
    context: 'La mitad de las personas ocupadas con ingresos quedó por debajo de ese monto o en él. Incluye distintas formas de empleo: no es una mediana de sueldos registrados ni cubre todo el país.',
    url: incomeSource,
    source: 'INDEC (EPH), cifras reproducidas por Infobae',
  },
  {
    category: 'Sueldo · Promedio',
    title: 'Personas asalariadas',
    price: 'ARS 1.161.833 por mes',
    scope: '31 aglomerados urbanos · Abril–junio de 2026 · Publicado: 1 oct 2026',
    context: 'Promedio de ingresos de personas asalariadas (con y sin descuento jubilatorio). No es una mediana ni una tarifa para trabajar por cuenta propia.',
    url: incomeSource,
    source: 'INDEC (EPH), cifras reproducidas por Infobae',
  },
  {
    category: 'Cocina · Básico de convenio',
    title: 'Cocinero/a, categoría 6',
    price: 'ARS 1.292.026–1.524.806 brutos por mes',
    scope: 'Establecimientos alcanzados por el CCT 389/04 en Argentina · Septiembre de 2026 · Publicado: 22 ago 2026',
    context: 'Escala UTHGRA–FEHGRA, según tipo de local. No incluye adicionales ni la gratificación del mes; no es una cotización por cocinar a domicilio.',
    url: 'https://www.infozona.com.ar/paritaria-de-gastronomicos-escala-salarial/',
    source: 'Escala de convenio reproducida por Infozona',
  },
  {
    category: 'Cocina a domicilio · Precio medio anunciado',
    title: 'Servicio privado para 6 personas',
    price: 'aprox. ARS 75.840 por persona',
    scope: 'Buenos Aires · Página y tipo de cambio consultados: 18 nov 2026',
    context: 'La plataforma muestra USD 48 por comensal, o USD 288 por el grupo, con ingredientes, traslado y limpieza. Equivalencia ilustrativa a ARS 1.580 por dólar (Banco Nación): no es el precio cobrado en pesos, una tarifa por hora ni una mediana nacional.',
    url: 'https://www.takeachef.com/es-ar/chef-a-domicilio/buenos-aires',
    source: 'Take a Chef · precio publicado en USD',
    additionalSource: {
      label: 'Cotización de Banco Nación publicada por Infobae',
      url: 'https://www.infobae.com/economia/2026/11/18/el-dolar-volvio-a-subir-las-acciones-cayeron-por-el-contagio-externo-y-el-riesgo-pais-perforo-los-850-puntos/',
    },
  },
  {
    category: 'Aros · Precio de lista',
    title: 'Aros pasantes de media luna',
    price: 'ARS 6.900 por presentación',
    scope: 'Tienda online de Argentina · Consultada: 18 nov 2026',
    context: 'Una ficha minorista de bijouterie importada (SKU 84705701), con impuestos nacionales y sin envío. Compará modelos y materiales similares: no representa el precio de los aros artesanales ni un promedio.',
    url: 'https://ar.todomoda.com/aros-84705701.html',
    source: 'TodoModa Argentina · ficha de producto',
  },
  {
    category: 'Aros de plata · Relevamiento periodístico',
    title: 'Aros de plata 925',
    price: 'ARS 70.000–200.000',
    scope: 'Joyerías de Mendoza · Publicado: 18 ene 2026',
    context: 'Rango observado en comercios según diseño y piedras. La nota no indica tamaño de muestra ni si cada importe es por pieza o por par.',
    url: 'https://www.sitioandino.com.ar/economia/en-pleno-auge-del-oro-cuanto-cuestan-hoy-las-joyas-metales-preciosos-mendoza-n5715781',
    source: 'Sitio Andino · relevamiento local',
  },
]

export const benchmarkContent = `
  <p class="hint">Usá estas cifras como contexto, no como una tarifa recomendada. Los importes en pesos argentinos son nominales y pueden quedar desactualizados. Verificá en la fuente la fecha, la zona y qué incluye cada precio.</p>
  <div class="ref-list">${references.map(ref => `<section class="ref-item">
    <p class="ref-meta">${ref.category}</p><h3>${ref.title} · ${ref.price}</h3>
    <p class="ref-meta">${ref.scope}</p><p>${ref.context}</p>
    <a href="${ref.url}" target="_blank" rel="noopener noreferrer">${ref.source} ↗</a>
    ${ref.additionalSource ? `<br><a href="${ref.additionalSource.url}" target="_blank" rel="noopener noreferrer">${ref.additionalSource.label} ↗</a>` : ''}
  </section>`).join('')}</div>
  <p class="hint">No contamos con medianas nacionales verificadas para tarifas de cocina independiente ni para ventas de aros. Un sueldo no equivale a una tarifa independiente y los precios publicados no prueban ventas. Las referencias no modifican tu cotización ni se actualizan automáticamente.</p>`
