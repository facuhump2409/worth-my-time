import './style.css'
import { activeFields, calculate, hourlyRate, newDraft, validateField, type Draft, type Field } from './pricing'
import { benchmarkContent } from './references'
import { loadDraft, registerOffline, saveDraft } from './storage'

const root = document.querySelector<HTMLDivElement>('#app')!
const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
const smallCurrency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumSignificantDigits: 2 })
const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 4 })
const money = (value: number) => (value > 0 && value < 0.01 ? smallCurrency : currency).format(value)

const icons = {
  mark: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5h4M4 20h4"/>',
  box: '<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4m-9 4v10M7.5 5l9 4"/>',
  service: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M3 13h18m-10 0v2h2v-2"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 3v4"/>',
  chart: '<path d="M4 4v16h16M8 15l4-4 3 2 5-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
}
const icon = (name: keyof typeof icons) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`

const steps = ['Tu hora', 'Tu tiempo', 'Insumos y gastos', 'Lugar de trabajo', 'Ganancia']
const fields: Record<Field, [string, string, string, string?]> = {
  hourly: ['¿Cuánto querés cobrar por hora?', 'ARS', 'Ej. 8000', 'Es lo que querés pagarte por trabajar, sin contar gastos ni ganancia.'],
  income: ['¿Cuánto querés cobrar por mes por tu trabajo?', 'ARS', 'Ej. 800000', 'Ingresá tu objetivo de remuneración personal antes de gastos del negocio.'],
  billable: ['Horas que podés cobrar por mes', 'h', 'Ej. 100', 'Contá solo las horas que podés asignar a trabajos, no todo tu tiempo disponible. Incluí traslados si los cobrás.'],
  hours: ['Horas de trabajo', 'h', 'Ej. 2,5', 'Contá preparación, producción o ejecución y cierre. El traslado se carga aparte.'],
  units: ['Unidades listas para vender', 'u.', 'Ej. 10', 'Contá tal como vendés: si vendés aros de a pares, cada par es una unidad.'],
  materials: ['Materiales e insumos', 'ARS', '0', 'Sumá lo que usás para este trabajo: por ejemplo, ingredientes, piezas, empaques o consumibles.'],
  fixed: ['Gastos fijos por mes', 'ARS', '0', 'Sumá alquiler, suscripciones u otros gastos del negocio. Se distribuyen según las horas del trabajo y de traslado, si lo hay.'],
  local: ['Gastos extra del lugar', 'ARS', '0', 'Solo los costos de este trabajo que no incluiste antes, como alquiler puntual de un espacio o un consumo extra.'],
  travel: ['Gastos de traslado', 'ARS', '0', 'Sumá ida y vuelta: transporte, combustible, peajes o estacionamiento.'],
  travelHours: ['Tiempo de traslado', 'h', '0', 'Sumá ida y vuelta. Estas horas también se pagan a tu tarifa.'],
  markup: ['Ganancia sobre tus costos', '%', '0', 'Es un recargo, no un margen sobre el precio final. Si tu costo es $100 y agregás 20%, cobrás $120.'],
}

const loaded = loadDraft()
let draft: Draft = loaded.draft
let storageOk = loaded.ok
let editing = false
let showErrors = false
let installEvent: (Event & { prompt(): Promise<unknown> }) | null = null

const stage = () => draft.kind === 'product' ? 'esta tanda' : 'este servicio'
const field = (name: Field) => {
  const [label, unit, placeholder, hint] = fields[name]
  return `<div class="field"><label for="${name}">${label}</label>
    <div class="input-shell"><input id="${name}" name="${name}" type="text" inputmode="${name === 'units' ? 'numeric' : 'decimal'}"
      maxlength="32" autocomplete="off" placeholder="${placeholder}" aria-describedby="${name}-hint ${name}-error">
      <span class="unit">${unit}</span></div>
    <p class="hint" id="${name}-hint">${hint}</p><p class="error" id="${name}-error" hidden></p></div>`
}

function choices(name: 'rateMode' | 'location', label: string, a: [string, string], b: [string, string]) {
  return `<fieldset class="segmented"><legend class="sr-only">${label}</legend>
    ${[a, b].map(([value, text]) => `<label><input type="radio" name="${name}" value="${value}" ${draft[name] === value ? 'checked' : ''}><span>${text}</span></label>`).join('')}</fieldset>`
}

const referenceButton = (text: string) => `<button type="button" class="text-button references" data-action="references">${icon('chart')}${text}</button>`

function intro() {
  return `<div class="eyebrow"><span class="dot"></span> CALCULADORA DE PRECIOS</div>
    <h1 tabindex="-1">Tu trabajo tiene <em>valor.</em></h1>
    <p class="lead">Poné un precio que cubra tus costos, pague tu tiempo y deje la ganancia que buscás.</p>
    <h2 class="choice-heading">¿Qué querés cotizar?</h2>
    <div class="start-options">
      <button class="start-option" data-kind="product"><span class="option-icon product">${icon('box')}</span>
        <span><strong>Un producto</strong><small>Por ejemplo, aros, pan o una prenda.</small></span><span class="option-arrow">${icon('arrow')}</span></button>
      <button class="start-option" data-kind="service"><span class="option-icon service">${icon('service')}</span>
        <span><strong>Un servicio</strong><small>Por ejemplo, cocina a domicilio o un arreglo.</small></span><span class="option-arrow">${icon('arrow')}</span></button>
    </div>
    <p class="privacy">${icon('lock')} <span>Sin cuenta. Tu borrador queda en este dispositivo.</span></p>`
}

function wizard() {
  const step = draft.step
  const titles = ['', '¿Cuánto vale tu hora?', '¿Cuánto tiempo lleva?', '¿Qué gastos tenés?', '¿Dónde vas a trabajar?', '¿Qué ganancia querés sumar?']
  const descriptions = [
    '', 'Elegí si ya sabés tu tarifa o si preferís estimarla con un objetivo mensual.',
    draft.kind === 'product' ? 'Ingresá el tiempo total de la tanda y cuántas unidades vendibles salen.' : 'Estimá cuántas horas le vas a dedicar al servicio completo.',
    `Sumá los materiales de ${stage()} y la parte de los gastos mensuales que le corresponde.`,
    'Incluí solo los gastos extra que genera el lugar. Si no tenés ninguno, dejalos en blanco.',
    'Tu tiempo ya está incluido en el costo. La ganancia es un extra para tu negocio y puede ser cero.',
  ]
  const selectedFields = activeFields(draft, step)
  return `<div class="eyebrow">${draft.kind === 'product' ? 'PRODUCTO' : 'SERVICIO'} <span aria-hidden="true">/</span> PASO ${step} DE ${steps.length}</div>
    <div class="progress" aria-hidden="true">${steps.map((_, i) => `<span class="${i < step ? 'filled' : ''}"></span>`).join('')}</div>
    <h1 tabindex="-1">${titles[step]}</h1><p class="lead">${descriptions[step]}</p>
    <form novalidate>
      ${step === 1 ? choices('rateMode', 'Cómo calcular tu hora', ['direct', 'Ingresar mi tarifa'], ['monthly', 'Estimar mi tarifa']) : ''}
      ${step === 4 ? choices('location', 'Lugar de trabajo', ['own', 'En mi espacio'], ['client', 'En lo del cliente']) : ''}
      <div class="fields">${selectedFields.map(field).join('')}</div>
      ${step === 1 && draft.rateMode === 'monthly' ? '<p class="rate-preview callout" aria-live="polite"></p>' : ''}
      ${step === 1 ? referenceButton('Ver referencias de sueldos y precios en Argentina') : ''}
      ${step === 5 ? `<p class="callout">Estimado ahora${draft.kind === 'product' ? ' (total de la tanda)' : ''}: <strong id="estimate" aria-live="polite"></strong></p>` : ''}
      <p class="form-error error" role="alert" hidden></p>
      <div class="actions"><button type="button" class="secondary" data-action="back">${icon('back')} Atrás</button>
      ${editing ? '<button type="submit" class="primary">Volver al resumen</button>' : `<button type="submit" class="primary">${step === 5 ? 'Ver mi precio' : 'Continuar'} ${icon('arrow')}</button>`}</div>
    </form>`
}

function summary() {
  const result = calculate(draft)
  if (!result) return '<h1 tabindex="-1">Revisá los importes</h1><p class="lead">No pudimos calcular el precio con estos valores.</p><button class="secondary" data-action="back">Volver a editar</button>'
  const product = draft.kind === 'product'
  const { labor, rate, travelLabor, materials, overhead, local, travel, cost, markup, profit, total, unit, units } = result
  const row = (label: string, value: number) => `<div class="breakdown-row"><dt>${label}</dt><dd>${money(value)}</dd></div>`
  const edit = (step: number, label: string) => `<button class="edit" data-edit="${step}" aria-label="Editar ${label}">Editar</button>`
  const group = (title: string, body: string, step: number) => `<section class="summary-group">
    <div class="group-heading"><h3>${title}</h3>${edit(step, title.toLowerCase())}</div><dl>${body}</dl></section>`
  return `<div class="eyebrow"><span class="dot"></span> TU COTIZACIÓN · ARS</div>
    <h1 tabindex="-1">Ya tenés tu <em>precio.</em></h1>
    <p class="lead">Este precio parte de tus propios costos y objetivos. Podés ajustar cualquier dato y ver el nuevo total.</p>
    <div class="quote"><span>${product ? 'Precio sugerido por unidad' : 'Precio sugerido por el servicio'}</span>
      <strong>${money(product ? unit : total)}</strong>
      ${product ? `<p>Total de la tanda de ${number.format(units)} ${units === 1 ? 'unidad' : 'unidades'}: <b>${money(total)}</b></p>` : ''}
    </div>
    <div class="group-heading details-heading"><h2>Cómo se arma el precio</h2>${edit(1, 'tarifa por hora')}</div>
    ${group('Tu trabajo', row(`Tiempo de trabajo · ${money(rate)}/h`, labor), 2)}
    ${group('Materiales y gastos fijos', row('Materiales e insumos', materials) + row('Parte de los gastos fijos', overhead), 3)}
    ${group('Lugar y traslados', row('Gastos del lugar', local) + (draft.location === 'client' ? row('Gastos de traslado', travel) + row('Tu tiempo de traslado', travelLabor) : ''), 4)}
    <dl class="subtotal">${row('Costo total', cost)}</dl>
    ${group('Ganancia', row(`${number.format(markup)}% sobre el costo`, profit), 5)}
    <p class="hint summary-note">No incluye impuestos ni comisiones salvo los que hayas cargado como gastos. Los importes se redondean para mostrar; el precio por unidad se calcula con el total sin redondear.</p>
    ${referenceButton('Comparar con referencias de Argentina')}
    <div class="actions"><button type="button" class="secondary" data-action="restart">Nueva cotización</button></div>`
}

function aside() {
  if (draft.step === 0) return `<aside class="guide intro-guide" aria-label="Sobre la calculadora">
    <div class="guide-top"><span class="guide-index">01 — GUÍA DE PRECIOS</span><span class="guide-spark" aria-hidden="true">✦</span></div>
    <div class="illustration" aria-hidden="true">
      <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
      <div class="ticket ticket-back"></div><div class="ticket ticket-front">
        <span class="ticket-kicker">TU COTIZACIÓN</span><span class="ticket-dollar">$</span>
        <span class="ticket-line"></span><span class="ticket-line short"></span><span class="ticket-check">${icon('check')}</span>
      </div><span class="illustration-star star-one">✧</span><span class="illustration-star star-two">✦</span>
    </div>
    <div class="guide-copy"><h2>Que tu precio cuente <em>todo.</em></h2>
      <p>Tu tiempo, tus gastos y lo que querés ganar. Sin fórmulas complicadas.</p>
      <div class="guide-footer"><span>5 pasos</span><span aria-hidden="true">·</span><span>En pesos argentinos</span></div>
    </div></aside>`
  return `<aside class="guide step-guide" aria-label="Pasos de la cotización">
    <div class="guide-top"><span class="guide-index">TU RECORRIDO</span><span class="guide-spark" aria-hidden="true">✦</span></div>
    <ol>${steps.map((label, index) => {
      const step = index + 1
      return `<li ${step === draft.step ? 'aria-current="step"' : ''}>
        <span class="step-number">${step < draft.step ? icon('check') : step}</span>${label}</li>`
    }).join('')}</ol>
  </aside>`
}

function render(focusHeading = false) {
  root.innerHTML = `<header class="site-header"><div class="header-inner">
    <div class="brand"><span class="brand-icon">${icon('mark')}</span><span>Cuánto vale <b>mi tiempo</b></span></div>
    <div class="header-actions">${installEvent ? '<button class="text-button" data-action="install">Instalar</button>' : ''}
      ${referenceButton('Referencias <span class="wide-only">de Argentina</span>')}</div>
    </div></header>
    <main class="layout ${draft.step === 0 ? 'landing' : ''} ${draft.step === 6 ? 'summary' : ''}">
      <article class="main-card">${draft.step === 0 ? intro() : draft.step === 6 ? summary() : wizard()}
      <p id="storage-note" class="hint" role="status" ${storageOk ? 'hidden' : ''}>No se pudo guardar el borrador en este navegador. Podés seguir mientras no cierres esta página.</p></article>
      ${aside()}
    </main>
    <footer class="site-footer"><span>Hecho para quienes trabajan por su cuenta.</span><span>Argentina · ARS</span></footer>
    <dialog id="references-dialog" aria-labelledby="references-title"><div class="dialog-body">
      <div class="group-heading"><span class="eyebrow">ARGENTINA · ARS</span><button class="icon-button" data-action="close" aria-label="Cerrar referencias">${icon('close')}</button></div>
      <h2 id="references-title">Referencias de mercado</h2>${benchmarkContent}
    </div></dialog>`
  for (const name of activeFields(draft, draft.step)) {
    const input = document.getElementById(name) as HTMLInputElement
    input.value = draft.values[name]
  }
  updateFeedback()
  if (focusHeading) {
    root.querySelector('h1')?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }
}

function persist() {
  storageOk = saveDraft(draft)
  const note = document.querySelector<HTMLElement>('#storage-note')
  if (note) note.hidden = storageOk
}

function updateFeedback() {
  for (const name of activeFields(draft, draft.step)) {
    const error = document.getElementById(`${name}-error`)!
    const text = showErrors ? validateField(name, draft.values[name]) : ''
    error.textContent = text
    error.hidden = !text
    document.getElementById(name)?.setAttribute('aria-invalid', String(Boolean(text)))
  }
  const preview = document.querySelector('.rate-preview')
  const rate = hourlyRate(draft)
  if (preview) preview.textContent = rate && rate > 0
    ? `Tu hora estimada: ${money(rate)}`
    : 'Tu objetivo mensual ÷ horas que podés cobrar = valor de tu hora.'
  const estimate = document.querySelector('#estimate')
  const result = estimate && calculate(draft)
  if (estimate) estimate.textContent = result ? money(result.total) : '—'
}

function go(step: number) {
  draft.step = step
  showErrors = false
  persist()
  render(true)
}

root.addEventListener('input', ({ target }) => {
  if (!(target instanceof HTMLInputElement) || target.type !== 'text') return
  const name = target.name as Field
  const previous = activeFields(draft, draft.step)
  draft.values[name] = target.value
  persist()
  const current = activeFields(draft, draft.step)
  if (name === 'fixed' && previous.length !== current.length) {
    if (current.includes('billable')) {
      root.querySelector('.fields')?.insertAdjacentHTML('beforeend', field('billable'))
      const billable = document.getElementById('billable') as HTMLInputElement
      billable.value = draft.values.billable
    } else document.getElementById('billable')?.closest('.field')?.remove()
  }
  updateFeedback()
})

root.addEventListener('change', ({ target }) => {
  if (!(target instanceof HTMLInputElement) || target.type !== 'radio') return
  if (target.name === 'rateMode') draft.rateMode = target.value === 'monthly' ? 'monthly' : 'direct'
  if (target.name === 'location') draft.location = target.value === 'client' ? 'client' : 'own'
  persist()
  showErrors = false
  render()
  root.querySelector<HTMLInputElement>(`input[name="${target.name}"]:checked`)?.focus({ preventScroll: true })
})

root.addEventListener('submit', event => {
  event.preventDefault()
  const invalid = activeFields(draft, draft.step).find(name => validateField(name, draft.values[name]))
  if (invalid) {
    showErrors = true
    updateFeedback()
    document.getElementById(invalid)?.focus()
    return
  }
  const error = root.querySelector<HTMLElement>('.form-error')!
  if (draft.step === 1 && !hourlyRate(draft)) {
    error.textContent = 'La tarifa calculada está fuera de rango. Revisá los valores ingresados.'
    error.hidden = false
    return
  }
  if (editing || draft.step === 5) {
    const invalidStep = [1, 2, 3, 4, 5].find(step =>
      activeFields(draft, step).some(name => validateField(name, draft.values[name])),
    )
    if (invalidStep) {
      go(invalidStep)
      return
    }
    if (!calculate(draft)) {
      error.textContent = 'El precio está fuera de rango. Revisá las horas, los importes o el porcentaje.'
      error.hidden = false
      return
    }
    editing = false
    go(6)
  } else go(draft.step + 1)
})

root.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return
  const button = event.target.closest<HTMLButtonElement>('button')
  if (!button) return
  const { action, kind, edit } = button.dataset
  if (kind === 'product' || kind === 'service') {
    draft.kind = kind
    go(1)
  } else if (edit) {
    editing = true
    go(Number(edit))
  } else if (action === 'back') {
    if (editing && calculate(draft)) {
      editing = false
      go(6)
      return
    }
    editing = false
    go(draft.step - 1)
  } else if (action === 'restart') {
    if (!window.confirm('¿Empezar de cero? Se borrarán los datos de esta cotización.')) return
    draft = newDraft()
    editing = false
    go(0)
  } else if (action === 'references' || action === 'close') {
    const dialog = root.querySelector<HTMLDialogElement>('#references-dialog')!
    if (action === 'references') dialog.showModal()
    else dialog.close()
  } else if (action === 'install') {
    void installEvent?.prompt().catch(console.warn)
  }
})

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault()
  if ('prompt' in event && typeof event.prompt === 'function') {
    installEvent = event as NonNullable<typeof installEvent>
    const actions = document.querySelector('.header-actions')
    if (!actions?.querySelector('[data-action="install"]')) {
      actions?.insertAdjacentHTML('afterbegin', '<button class="text-button" data-action="install">Instalar</button>')
    }
  }
})
window.addEventListener('appinstalled', () => {
  installEvent = null
  document.querySelector('[data-action="install"]')?.remove()
})

render()
registerOffline()
