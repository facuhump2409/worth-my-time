import type { Activity } from './activities.ts'
import { money } from './money.ts'

interface Reference {
  activity?: Activity
  type: 'income' | 'salary' | 'service' | 'product'
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
    type: 'income',
    category: 'Ingreso laboral · Mediana',
    title: 'Ocupación principal',
    price: `${money(900_000, true)} por mes`,
    scope: '31 aglomerados urbanos · Abril–junio de 2026 · Publicado: 1 oct 2026',
    context: 'La mitad de las personas ocupadas con ingresos quedó por debajo de ese monto o en él. Incluye distintas formas de empleo: no es una mediana de sueldos registrados ni cubre todo el país.',
    url: incomeSource,
    source: 'INDEC (EPH), cifras reproducidas por Infobae',
  },
  {
    type: 'salary',
    category: 'Sueldo · Promedio',
    title: 'Personas asalariadas',
    price: `${money(1_161_833, true)} por mes`,
    scope: '31 aglomerados urbanos · Abril–junio de 2026 · Publicado: 1 oct 2026',
    context: 'Promedio de ingresos de personas asalariadas (con y sin descuento jubilatorio). No es una mediana ni una tarifa para trabajar por cuenta propia.',
    url: incomeSource,
    source: 'INDEC (EPH), cifras reproducidas por Infobae',
  },
  {
    activity: 'cooking',
    type: 'salary',
    category: 'Cocina · Básico de convenio',
    title: 'Cocinero/a, categoría 6',
    price: `${money(1_292_026, true)} a ${money(1_524_806, true)} brutos por mes`,
    scope: 'Establecimientos alcanzados por el CCT 389/04 en Argentina · Septiembre de 2026 · Publicado: 22 ago 2026',
    context: 'Escala UTHGRA–FEHGRA, según tipo de local. No incluye adicionales ni la gratificación del mes; no es una cotización por cocinar a domicilio.',
    url: 'https://www.infozona.com.ar/paritaria-de-gastronomicos-escala-salarial/',
    source: 'Escala de convenio reproducida por Infozona',
  },
  {
    activity: 'cooking',
    type: 'service',
    category: 'Cocina a domicilio · Precio medio anunciado',
    title: 'Servicio privado para 6 personas',
    price: `aprox. ${money(48 * 1_580, true)} por persona`,
    scope: 'Buenos Aires · Página y tipo de cambio consultados: 18 nov 2026',
    context: `La plataforma muestra USD 48 por comensal o USD 288 por el grupo, con ingredientes, traslado y limpieza. Al cambio de ${money(1_580, true)} por dólar (Banco Nación), el total equivale a unos ${money(288 * 1_580, true)}. No es el precio cobrado en pesos ni una tarifa por hora.`,
    url: 'https://www.takeachef.com/es-ar/chef-a-domicilio/buenos-aires',
    source: 'Take a Chef · precio publicado en USD',
    additionalSource: {
      label: 'Cotización de Banco Nación publicada por Infobae',
      url: 'https://www.infobae.com/economia/2026/11/18/el-dolar-volvio-a-subir-las-acciones-cayeron-por-el-contagio-externo-y-el-riesgo-pais-perforo-los-850-puntos/',
    },
  },
  {
    activity: 'earrings',
    type: 'product',
    category: 'Aros · Precio de lista',
    title: 'Aros pasantes de media luna',
    price: `${money(6_900, true)} por presentación`,
    scope: 'Tienda online de Argentina · Consultada: 18 nov 2026',
    context: 'Una ficha minorista de bijouterie importada (SKU 84705701), con impuestos nacionales y sin envío. Compará modelos y materiales similares: no representa el precio de los aros artesanales ni un promedio.',
    url: 'https://ar.todomoda.com/aros-84705701.html',
    source: 'TodoModa Argentina · ficha de producto',
  },
  {
    activity: 'earrings',
    type: 'product',
    category: 'Aros de plata · Relevamiento periodístico',
    title: 'Aros de plata 925',
    price: `${money(70_000, true)} a ${money(200_000, true)}`,
    scope: 'Joyerías de Mendoza · Publicado: 18 ene 2026',
    context: 'Rango observado en comercios según diseño y piedras. La nota no indica tamaño de muestra ni si cada importe es por pieza o por par.',
    url: 'https://www.sitioandino.com.ar/economia/en-pleno-auge-del-oro-cuanto-cuestan-hoy-las-joyas-metales-preciosos-mendoza-n5715781',
    source: 'Sitio Andino · relevamiento local',
  },
]

export function referencesFor(activity: Activity | null, purpose: 'pricing' | 'salary') {
  return references.filter(ref => purpose === 'pricing'
    ? activity !== null && ref.activity === activity && (ref.type === 'service' || ref.type === 'product')
    : (ref.type === 'income' || ref.type === 'salary') && (ref.activity === undefined || ref.activity === activity),
  ).sort((a, b) => Number(Boolean(b.activity)) - Number(Boolean(a.activity)))
}

function referenceCards(entries: Reference[]) {
  return `<div class="ref-list">${entries.map(ref => `<section class="ref-item">
    <p class="ref-meta">${ref.category}</p><h3>${ref.title} · ${ref.price}</h3>
    <p class="ref-meta">${ref.scope}</p><p>${ref.context}</p>
    <a href="${ref.url}" target="_blank" rel="noopener noreferrer">${ref.source} ↗</a>
    ${ref.additionalSource ? `<br><a href="${ref.additionalSource.url}" target="_blank" rel="noopener noreferrer">${ref.additionalSource.label} ↗</a>` : ''}
  </section>`).join('')}</div>`
}

export function activityGuidance(activity: Activity | null) {
  if (!activity) return ''
  const entries = referencesFor(activity, 'pricing')
  if (entries.length === 0) return `<p class="callout">No tenemos un precio de mercado verificado para este rubro. Igual podés estimar cuánto cobrar con tu tiempo, tus costos y tu ganancia.</p>`
  const note = activity === 'cooking'
    ? 'Es un ejemplo de una plataforma para un servicio específico, no una tarifa por hora ni una mediana del rubro.'
    : 'Son ejemplos publicados, no precios de venta verificados ni una mediana de aros artesanales.'
  return `<div class="activity-guidance"><h2>Cuánto se publica en tu rubro</h2>
    <p class="hint">${note} Los precios pueden haber cambiado. No se aplican automáticamente a tu cotización.</p>
    ${referenceCards(entries)}</div>`
}

export function salaryGuidance(activity: Activity | null) {
  return `<details class="salary-guidance"><summary>Referencias de ingresos para estimar tu hora</summary>
    <p class="hint">Son ingresos laborales, no precios para clientes. Si usás uno como objetivo mensual personal, la estimación por hora surge de dividirlo por las horas que podés cobrar por mes.</p>
    ${referenceCards(referencesFor(activity, 'salary'))}</details>`
}

export const benchmarkContent = `
  <p class="hint">Usá estas cifras como contexto, no como una tarifa recomendada. Los importes en pesos argentinos son nominales y pueden quedar desactualizados. Verificá en la fuente la fecha, la zona y qué incluye cada precio.</p>
  ${referenceCards(references)}
  <p class="hint">No contamos con medianas nacionales verificadas para tarifas de cocina independiente ni para ventas de aros. Un sueldo no equivale a una tarifa independiente y los precios publicados no prueban ventas. Las referencias no modifican tu cotización ni se actualizan automáticamente.</p>`
