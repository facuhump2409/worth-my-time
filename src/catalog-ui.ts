import { calculateQuote, itemCosts, loadCatalog, productItem, saveCatalog, uid, type Product, type QuoteItem, type Supply, type Workspace } from './catalog'
import { formatMoneyInput, money, parseMoney } from './money'
import { parseNumber } from './pricing'

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })
const loaded = loadCatalog()
const state = loaded.state
let storageOk = loaded.ok
let tab: 'quote' | 'products' | 'supplies' | 'workspaces' = 'quote'
let editor: Product | Supply | Workspace | null = null
let message = ''

function catalogEntries() {
  return tab === 'products' ? state.products : tab === 'workspaces' ? state.workspaces : state.supplies
}

function input(label: string, value: string, attributes: string, monetary = false, text = false) {
  return `<label class="catalog-field"><span>${label}</span><input type="text" ${text ? '' : 'inputmode="decimal"'} ${monetary ? 'data-money' : ''}
    maxlength="${text ? 160 : 32}" value="${escape(value)}" ${attributes}></label>`
}

function options() {
  return state.supplies.map(supply => {
    const cost = parseMoney(supply.cost)
    return `<option value="${escape(supply.id)}">${escape(supply.name)} · ${cost === null ? 'Revisá el costo' : money(cost)} · ${escape(supply.minutes)} min</option>`
  }).join('')
}

function quoteResults() {
  const result = calculateQuote(state.quote)
  if (!state.quote.items.length) return '<p class="callout">Agregá un producto, un insumo o un ítem nuevo para armar tu presupuesto.</p>'
  if (!result) return '<p class="error" role="alert">Revisá los valores: nombres completos, tarifa mayor a cero, cantidades enteras mayores a cero e importes, minutos y porcentajes válidos sin valores negativos. Para importes usá punto de miles y coma decimal; para minutos y porcentajes, sin separador de miles.</p>'
  return `<div class="quote"><span>Total del presupuesto · ARS</span><strong>${money(result.total)}</strong>
    <p>Tiempo total: <b>${number.format(result.minutes)} min</b> (${number.format(result.minutes / 60)} h)</p></div>
    <div class="quote-table"><table><caption>Detalle del presupuesto</caption><thead><tr><th>Ítem</th><th>Cant.</th><th>Min/u.</th>${state.quote.workspace ? '<th>Espacio/u.</th>' : ''}<th>Ganancia</th><th>Precio/u.</th><th>Subtotal</th></tr></thead>
    <tbody>${result.lines.map(line => `<tr><th scope="row">${escape(line.name)}</th><td>${line.quantity}</td><td>${number.format(line.minutes)}</td>${state.quote.workspace ? `<td>${money(line.workspaceCost)}</td>` : ''}<td>${number.format(line.markup)}%</td><td>${money(line.unit)}</td><td>${money(line.total)}</td></tr>`).join('')}</tbody></table></div>
    <dl class="subtotal">${state.quote.workspace ? `<div class="breakdown-row"><dt>Espacio: ${escape(state.quote.workspace.name)} · ${money(result.workspaceRate)}/h</dt><dd>${money(result.workspaceCost)}</dd></div>` : ''}
    <div class="breakdown-row"><dt>Costo (insumos + trabajo${state.quote.workspace ? ' + espacio' : ''})</dt><dd>${money(result.cost)}</dd></div>
    <div class="breakdown-row"><dt>Ganancia total</dt><dd>${money(result.profit)}</dd></div></dl>
    <p class="hint">Tiempo por unidad = minutos propios + tiempo de cada insumo × cantidad. Costo = materiales adicionales + insumos + tiempo × (tu tarifa + costo horario del espacio elegido). La ganancia es un recargo sobre ese costo, incluido el espacio. No incluye impuestos ni otros gastos que no hayas cargado.</p>`
}

function workspacePicker() {
  const selected = state.quote.workspace
  const saved = state.workspaces.some(workspace => workspace.id === selected?.id)
  const hourly = selected ? parseMoney(selected.hourly) : null
  return `<section class="catalog-card"><h2>Mi espacio para este presupuesto</h2>
    <label class="catalog-field"><span>Espacio de trabajo</span><select data-quote-workspace>
      <option value="" ${selected === null ? 'selected' : ''}>Sin costo de espacio</option>
      ${state.workspaces.map(workspace => {
        const current = workspace.id === selected?.id
        return `<option value="${escape(workspace.id)}" ${current ? 'selected' : ''}>${escape(current ? selected.name : workspace.name)}</option>`
      }).join('')}
      ${selected && !saved ? `<option value="${escape(selected.id)}" selected>${escape(selected.name)} (solo en este presupuesto)</option>` : ''}
    </select></label>
    ${selected ? `<p class="${hourly === null ? 'error' : 'hint'}">${escape(selected.name)}: ${hourly === null ? 'Revisá el costo horario del espacio.' : `${money(hourly)} por hora de producción, además de tu trabajo. Se usa el tiempo de todos los ítems, incluidos sus insumos y cantidades.`}</p>
      ${saved ? '<button class="secondary" data-catalog-action="refresh-workspace">Actualizar con los valores del catálogo</button>' : ''}` : '<p class="hint">Sin espacio elegido no se agrega ningún costo de lugar.</p>'}
    <p class="hint">Creá y editá tus lugares en Mis espacios. Cada presupuesto usa un solo espacio y conserva su nombre y tarifa, aunque luego lo edites o elimines del catálogo. No cargues aquí gastos que ya incluiste en los insumos.</p>
    <button class="text-button" data-tab="workspaces">Administrar mis espacios</button></section>`
}

function quoteItem(item: QuoteItem) {
  const id = escape(item.id)
  return `<section class="catalog-card" data-item="${id}">
    <div class="group-heading"><h2>Ítem del presupuesto</h2><button class="secondary" data-remove-item="${id}">Quitar ítem</button></div>
    <div class="catalog-grid">
      ${input('Nombre', item.name, 'data-item-field="name"', false, true)}
      ${input('Cantidad de productos', item.quantity, 'data-item-field="quantity"')}
      ${input('Ganancia propia (%) · vacío = general', item.markup, 'data-item-field="markup"')}
    </div>
    <details><summary>Editar tiempo e insumos de este ítem</summary>
      <p class="hint">Estos cambios son solo para este presupuesto; no modifican el catálogo.</p>
      <div class="catalog-grid">${input('Tiempo propio / ensamble por unidad (min)', item.minutes, 'data-item-field="minutes"')}
      ${input('Materiales adicionales por unidad (ARS)', item.materials, 'data-item-field="materials"', true)}</div>
      ${item.ingredients.map((ingredient, index) => `<div class="ingredient" data-ingredient="${index}">
        ${input('Insumo', ingredient.name, 'data-part-field="name"', false, true)}
        ${input('Cantidad por producto', ingredient.quantity, 'data-part-field="quantity"')}
        ${input('Costo por insumo (ARS)', ingredient.cost, 'data-part-field="cost"', true)}
        ${input('Tiempo por insumo (min)', ingredient.minutes, 'data-part-field="minutes"')}
        <button class="secondary" data-remove-part="${index}">Quitar insumo</button></div>`).join('')}
      <label class="catalog-field"><span>Agregar insumo del catálogo</span><select data-add-part="${id}"><option value="">Elegí un insumo</option>${options()}</select></label>
      <button class="secondary" data-custom-part="${id}">Crear insumo solo para este ítem</button>
    </details>
    <p class="hint" data-item-time="${id}"></p>
  </section>`
}

function quoteView() {
  return `<h1 tabindex="-1">Tu <em>presupuesto.</em></h1>
    <p class="lead">Combiná productos del catálogo e ítems a medida, con su tiempo, insumos y ganancia.</p>
    <div class="catalog-grid">
      ${input('Nombre del presupuesto', state.quote.name, 'data-quote-field="name"', false, true)}
      ${input('Tu tarifa por hora (ARS)', state.quote.hourly, 'data-quote-field="hourly"', true)}
      ${input('Ganancia general sobre costos (%)', state.quote.markup, 'data-quote-field="markup"')}
    </div>
    <p class="hint">La ganancia general se usa salvo que el ítem tenga una propia. Un 0% propio anula la general para ese ítem.</p>
    ${workspacePicker()}
    <div class="catalog-toolbar"><label class="catalog-field"><span>Agregar al presupuesto</span><select data-add-item><option value="">Elegí del catálogo</option>
      <optgroup label="Productos">${state.products.map(product => `<option value="product:${escape(product.id)}">${escape(product.name)}</option>`).join('')}</optgroup>
      <optgroup label="Insumos">${state.supplies.map(supply => `<option value="supply:${escape(supply.id)}">${escape(supply.name)}</option>`).join('')}</optgroup>
    </select></label><button class="primary" data-catalog-action="custom">Crear ítem solo para este presupuesto</button></div>
    <div class="quote-items">${state.quote.items.map(quoteItem).join('')}</div>
    <section id="quote-results" aria-live="polite">${quoteResults()}</section>
    <div class="actions"><button class="secondary" data-catalog-action="new-quote">Nuevo presupuesto</button></div>`
}

function editorView() {
  if (!editor) return ''
  const entry = editor
  if ('hourly' in entry) return `<form id="catalog-editor" class="catalog-card" novalidate>
    <h2>Espacio de trabajo</h2>
    <div class="catalog-grid">${input('Nombre del espacio', entry.name, 'data-editor-field="name"', false, true)}
      ${input('Costo del espacio por hora (ARS)', entry.hourly, 'data-editor-field="hourly"', true)}</div>
    <p class="hint">Incluí solo el costo de usar este lugar, sin tu trabajo ni insumos. Se aplicará a las horas de producción del presupuesto.</p>
    <p class="error" id="editor-error" role="alert" hidden></p>
    <div class="actions"><button type="button" class="secondary" data-catalog-action="cancel">Cancelar</button><button type="submit" class="primary">Guardar en catálogo</button></div>
  </form>`
  const product = 'ingredients' in entry
  return `<form id="catalog-editor" class="catalog-card" novalidate>
    <h2>${product ? 'Producto y receta' : 'Insumo reutilizable'}</h2>
    <div class="catalog-grid">${input('Nombre', entry.name, 'data-editor-field="name"', false, true)}
      ${input(product ? 'Materiales adicionales por unidad (ARS)' : 'Costo por unidad (ARS)', product ? entry.materials : entry.cost, `data-editor-field="${product ? 'materials' : 'cost'}"`, true)}
      ${input(product ? 'Tiempo propio / ensamble por unidad (min)' : 'Tiempo por unidad (min)', entry.minutes, 'data-editor-field="minutes"')}
    </div>
    ${product ? `<p class="hint">El tiempo propio se suma al tiempo de los insumos. No dupliques sus costos en materiales adicionales.</p>
      ${entry.ingredients.map((ingredient, index) => `<div class="ingredient"><strong>${escape(state.supplies.find(supply => supply.id === ingredient.supplyId)!.name)}</strong>
        ${input('Cantidad por producto', ingredient.quantity, `data-recipe-quantity="${index}"`)}
        <button type="button" class="secondary" data-remove-recipe="${index}">Quitar insumo</button></div>`).join('')}
      <label class="catalog-field"><span>Agregar insumo a la receta</span><select data-recipe-add><option value="">Elegí un insumo</option>${options()}</select></label>` : ''}
    <p class="error" id="editor-error" role="alert" hidden></p>
    <div class="actions"><button type="button" class="secondary" data-catalog-action="cancel">Cancelar</button><button type="submit" class="primary">Guardar en catálogo</button></div>
  </form>`
}

function catalogView() {
  if (tab === 'workspaces') return `<h1 tabindex="-1">Mis <em>espacios.</em></h1>
    <p class="lead">Guardá varios lugares con su costo por hora y elegí uno para cada presupuesto.</p>
    ${editor ? editorView() : '<div class="actions"><button class="primary" data-catalog-action="create">Crear espacio</button></div>'}
    ${state.workspaces.length ? '' : '<p class="callout">Todavía no creaste espacios. Podés cotizar sin costo de lugar o crear el primero.</p>'}
    <div class="catalog-list">${state.workspaces.map(workspace => {
      const hourly = parseMoney(workspace.hourly)
      return `<section class="catalog-card"><h2>${escape(workspace.name)}</h2>
        <p>${hourly === null ? 'Revisá el costo horario' : `${money(hourly)} por hora`}</p>
        <div class="actions"><button class="secondary" data-catalog-edit="${escape(workspace.id)}">Editar</button><button class="secondary" data-catalog-delete="${escape(workspace.id)}">Eliminar</button></div></section>`
    }).join('')}</div>`
  const products = tab === 'products'
  return `<h1 tabindex="-1">${products ? 'Tus <em>productos.</em>' : 'Tus <em>insumos.</em>'}</h1>
    <p class="lead">${products ? 'Guardá productos con su tiempo propio y una receta de uno o varios insumos.' : 'Guardá el costo y los minutos que lleva preparar cada unidad de un insumo.'}</p>
    <p class="callout">Datos iniciales de Cotizador Cápsulas. Los modelos de cápsula solo tienen tiempo: su costo está en 0 porque el Excel no lo detalla. Los productos tienen costo de materia prima y ensamble. Solo Vincha incluye la receta conocida (13 hojas); completá las demás antes de cotizar. La tarifa inicial de $9.500/h y la ganancia de 200% (×3) también son ejemplos editables del Excel.</p>
    ${editor ? editorView() : `<div class="actions"><button class="primary" data-catalog-action="create">Crear ${products ? 'producto' : 'insumo'}</button></div>`}
    <div class="catalog-list">${(products ? state.products : state.supplies).map(entry => {
      const costs = itemCosts('ingredients' in entry ? productItem(entry, state.supplies)
        : { id: entry.id, name: entry.name, materials: entry.cost, minutes: entry.minutes, ingredients: [], quantity: '1', markup: '' })
      return `<section class="catalog-card"><h2>${escape(entry.name)}</h2>
        <p>${costs ? `${money(costs.materials)} en materiales · ${number.format(costs.minutes)} min por unidad` : 'Revisá la receta'}</p>
        ${'ingredients' in entry ? `<p class="hint">Ensamble: ${escape(entry.minutes)} min · ${entry.ingredients.map(part => `${escape(part.quantity)} × ${escape(state.supplies.find(supply => supply.id === part.supplyId)!.name)}`).join(' + ') || 'Sin insumos en la receta'}</p>` : ''}
        <div class="actions"><button class="secondary" data-catalog-edit="${escape(entry.id)}">Editar</button><button class="secondary" data-catalog-delete="${escape(entry.id)}">Eliminar</button></div>
      </section>`
    }).join('')}</div>`
}

export function mountCatalog(host: HTMLElement) {
  const persist = () => {
    // A failed read must not overwrite the original data without explicit consent.
    if (!loaded.ok && !window.confirm('No se pudo leer el catálogo guardado. ¿Reemplazarlo con los datos que ves ahora?')) return
    loaded.ok = true
    storageOk = saveCatalog(state)
    const note = host.querySelector<HTMLElement>('#catalog-storage-note')
    if (note) note.hidden = storageOk
  }
  const feedback = () => {
    const results = host.querySelector('#quote-results')
    if (results) results.innerHTML = quoteResults()
    for (const item of state.quote.items) {
      const text = host.querySelector<HTMLElement>(`[data-item-time="${item.id}"]`)
      const costs = itemCosts(item)
      const quantity = parseNumber(item.quantity)
      if (text) text.textContent = costs && quantity !== null
        ? `Tiempo por producto: ${number.format(costs.minutes)} min · Tiempo para ${number.format(quantity)}: ${number.format(costs.minutes * quantity)} min`
        : 'Revisá el tiempo y los insumos de este producto.'
    }
  }
  const render = () => {
    const expanded = [...host.querySelectorAll<HTMLDetailsElement>('[data-item] details[open]')]
      .map(details => details.closest<HTMLElement>('[data-item]')!.dataset.item)
    host.innerHTML = `<div id="catalog-workspace">
      <nav class="catalog-tabs" aria-label="Catálogo y presupuesto">${([['quote', 'Presupuesto'], ['products', 'Productos'], ['supplies', 'Insumos'], ['workspaces', 'Mis espacios']] as const).map(([value, label]) =>
        `<button class="${tab === value ? 'primary' : 'secondary'}" data-tab="${value}" ${tab === value ? 'aria-current="page"' : ''}>${label}</button>`).join('')}</nav>
      <p class="hint">Guardado solo en este navegador. El catálogo y el presupuesto se conservan por separado de la calculadora paso a paso.</p>
      <p id="catalog-storage-note" class="error" role="status" ${storageOk ? 'hidden' : ''}>No se pudo leer o guardar el catálogo. Los cambios actuales pueden perderse al cerrar la página.</p>
      <p class="callout" role="status" ${message ? '' : 'hidden'}>${escape(message)}</p>
      ${tab === 'quote' ? quoteView() : catalogView()}</div>`
    for (const id of expanded) {
      const details = host.querySelector<HTMLDetailsElement>(`[data-item="${id}"] details`)
      if (details) details.open = true
    }
    feedback()
  }
  host.addEventListener('focusout', ({ target }) => {
    if (target instanceof HTMLInputElement && target.hasAttribute('data-money')) target.value = formatMoneyInput(target.value)
  })
  host.oninput = ({ target }) => {
    if (!(target instanceof HTMLInputElement)) return
    const { quoteField, itemField, partField, editorField, recipeQuantity } = target.dataset
    const item = state.quote.items.find(item => item.id === target.closest<HTMLElement>('[data-item]')?.dataset.item)
    if (quoteField === 'name' || quoteField === 'hourly' || quoteField === 'markup') state.quote[quoteField] = target.value
    else if (item && (itemField === 'name' || itemField === 'quantity' || itemField === 'markup' || itemField === 'minutes' || itemField === 'materials')) item[itemField] = target.value
    else if (item && (partField === 'name' || partField === 'quantity' || partField === 'cost' || partField === 'minutes')) {
      const index = Number(target.closest<HTMLElement>('[data-ingredient]')!.dataset.ingredient)
      item.ingredients[index][partField] = target.value
    } else if (editor && editorField === 'name') editor.name = target.value
    else if (editor && 'minutes' in editor && editorField === 'minutes') editor.minutes = target.value
    else if (editor && 'hourly' in editor && editorField === 'hourly') editor.hourly = target.value
    else if (editor && 'cost' in editor && editorField === 'cost') editor.cost = target.value
    else if (editor && 'materials' in editor && editorField === 'materials') editor.materials = target.value
    else if (editor && 'ingredients' in editor && recipeQuantity !== undefined) editor.ingredients[Number(recipeQuantity)].quantity = target.value
    if (editorField !== undefined || recipeQuantity !== undefined) return
    persist()
    feedback()
  }
  host.onchange = ({ target }) => {
    if (!(target instanceof HTMLSelectElement)) return
    if (target.hasAttribute('data-quote-workspace')) {
      state.quote.workspace = target.value === '' ? null : structuredClone(state.workspaces.find(workspace => workspace.id === target.value)!)
      persist()
      render()
      return
    }
    const supply = state.supplies.find(supply => supply.id === target.value)
    if (target.hasAttribute('data-add-item')) {
      const [type, id] = target.value.split(':')
      if (!id) return
      if (type === 'product') {
        const product = state.products.find(product => product.id === id)!
        state.quote.items.push(productItem(product, state.supplies))
      } else {
        const supply = state.supplies.find(supply => supply.id === id)!
        state.quote.items.push({ id: uid(), name: supply.name, materials: '0', minutes: '0', quantity: '1', markup: '', ingredients: [{ ...supply, quantity: '1' }] })
      }
      persist()
    } else if (supply && target.dataset.addPart) {
      state.quote.items.find(item => item.id === target.dataset.addPart)!.ingredients.push({ ...supply, quantity: '1' })
      persist()
    } else if (supply && target.hasAttribute('data-recipe-add') && editor && 'ingredients' in editor) editor.ingredients.push({ supplyId: supply.id, quantity: '1' })
    else return
    render()
  }
  host.onclick = event => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest<HTMLButtonElement>('button')
    if (!button) return
    const { tab: nextTab, catalogAction: action, catalogEdit, catalogDelete, removeItem, removePart, customPart, removeRecipe } = button.dataset
    const item = state.quote.items.find(item => item.id === button.closest<HTMLElement>('[data-item]')?.dataset.item)
    message = ''
    if (nextTab === 'quote' || nextTab === 'products' || nextTab === 'supplies' || nextTab === 'workspaces') {
      if (editor && !window.confirm('¿Descartar los cambios sin guardar del catálogo?')) return
      tab = nextTab
      editor = null
    } else if (action === 'custom') {
      state.quote.items.push({ id: uid(), name: 'Nuevo ítem', materials: '0', minutes: '0', ingredients: [], quantity: '1', markup: '' })
      persist()
    } else if (action === 'new-quote') {
      if (!window.confirm('¿Vaciar este presupuesto? El catálogo se conserva.')) return
      state.quote.items = []
      state.quote.name = ''
      state.quote.workspace = null
      persist()
    } else if (action === 'refresh-workspace') {
      const workspace = state.workspaces.find(workspace => workspace.id === state.quote.workspace?.id)
      if (!workspace) return
      state.quote.workspace = structuredClone(workspace)
      persist()
    } else if (action === 'create') {
      editor = tab === 'products' ? { id: uid(), name: '', materials: '0', minutes: '0', ingredients: [] }
        : tab === 'workspaces' ? { id: uid(), name: '', hourly: '0' }
          : { id: uid(), name: '', cost: '0', minutes: '0' }
    } else if (action === 'cancel') editor = null
    else if (catalogEdit) {
      if (editor && !window.confirm('¿Descartar los cambios sin guardar del catálogo?')) return
      editor = structuredClone(catalogEntries().find(entry => entry.id === catalogEdit)!)
    }
    else if (catalogDelete) {
      if (tab === 'supplies' && state.products.some(product => product.ingredients.some(part => part.supplyId === catalogDelete))) {
        message = 'Este insumo se usa en un producto. Quitalo de sus recetas antes de eliminarlo.'
      } else {
        if (!window.confirm('¿Eliminar del catálogo? Los datos ya agregados al presupuesto se conservan.')) return
        if (tab === 'products') state.products = state.products.filter(entry => entry.id !== catalogDelete)
        else if (tab === 'workspaces') state.workspaces = state.workspaces.filter(entry => entry.id !== catalogDelete)
        else state.supplies = state.supplies.filter(entry => entry.id !== catalogDelete)
        if (editor?.id === catalogDelete) editor = null
        persist()
      }
    } else if (removeItem) {
      state.quote.items = state.quote.items.filter(item => item.id !== removeItem)
      persist()
    } else if (item && removePart !== undefined) {
      item.ingredients.splice(Number(removePart), 1)
      persist()
    } else if (customPart) {
      state.quote.items.find(item => item.id === customPart)!.ingredients.push({ id: uid(), name: 'Nuevo insumo', cost: '0', minutes: '0', quantity: '1' })
      persist()
    } else if (editor && 'ingredients' in editor && removeRecipe !== undefined) editor.ingredients.splice(Number(removeRecipe), 1)
    else return
    render()
  }
  host.onsubmit = event => {
    event.preventDefault()
    if (!editor) return
    const valid = editor.name.trim() && ('hourly' in editor ? parseMoney(editor.hourly) !== null
      : 'ingredients' in editor ? itemCosts(productItem(editor, state.supplies)) !== null
        : parseMoney(editor.cost) !== null && parseNumber(editor.minutes) !== null)
    if (!valid) {
      const error = host.querySelector<HTMLElement>('#editor-error')!
      error.textContent = 'Completá el nombre y usá costos (incluido el costo horario) y minutos mayores o iguales a cero, y cantidades de insumos mayores a cero. Revisá también que los totales no estén fuera de rango.'
      error.hidden = false
      return
    }
    editor.name = editor.name.trim()
    if ('hourly' in editor) {
      const index = state.workspaces.findIndex(entry => entry.id === editor!.id)
      if (index < 0) state.workspaces.push(editor)
      else state.workspaces[index] = editor
    } else if ('ingredients' in editor) {
      const index = state.products.findIndex(entry => entry.id === editor!.id)
      if (index < 0) state.products.push(editor)
      else state.products[index] = editor
    } else {
      const index = state.supplies.findIndex(entry => entry.id === editor!.id)
      if (index < 0) state.supplies.push(editor)
      else state.supplies[index] = editor
    }
    editor = null
    message = 'Guardado en catálogo. El presupuesto mantiene sus valores anteriores: volvé a agregar los ítems o usá Actualizar con los valores del catálogo para el espacio elegido.'
    persist()
    render()
  }
  render()
}
