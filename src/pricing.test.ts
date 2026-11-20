import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculate, newDraft, parseNumber, type Draft } from './pricing.ts'
import { formatMoneyInput, money, parseMoney } from './money.ts'
import { validActivity } from './activities.ts'
import { activityGuidance, referencesFor } from './references.ts'
import { calculateQuote, isCatalogState, itemCosts, loadCatalog, newCatalog, productItem, saveCatalog, type QuoteItem } from './catalog.ts'

function sample(values: Partial<Draft['values']> = {}): Draft {
  const draft = newDraft()
  return { ...draft, kind: 'product', values: { ...draft.values, hourly: '100', hours: '2', ...values } }
}

test('prices a batch with prorated overhead and markup on cost, not margin', () => {
  const result = calculate(sample({ materials: '50', fixed: '400', billable: '20', units: '4', markup: '25' }))
  assert.equal(result?.labor, 200)
  assert.equal(result?.overhead, 40)
  assert.equal(result?.profit, 72.5)
  assert.equal(result?.total, 362.5)
  assert.equal(result?.unit, 90.625)
})

test('monthly rate and client travel include both labor and overhead for travel hours', () => {
  const draft = sample({ hourly: 'error', income: '1000', billable: '20', fixed: '100', local: '10', travel: '20', travelHours: '1,5', units: 'error' })
  const result = calculate({ ...draft, kind: 'service', rateMode: 'monthly', location: 'client' })
  assert.equal(result?.rate, 50)
  assert.equal(result?.travelLabor, 75)
  assert.equal(result?.overhead, 17.5)
  assert.equal(result?.total, 222.5)
})

test('own workplace excludes stale travel and zero overhead does not require billable hours', () => {
  const result = calculate(sample({ local: '5', travel: '100', travelHours: 'error', billable: '0' }))
  assert.equal(result?.total, 205)
})

test('invalid active inputs or extreme totals cannot yield a quote', () => {
  for (const invalid of [{ units: '0' }, { units: '1,5' }, { hourly: '-1' }, { fixed: '30', billable: '0' }, { markup: '1e99' }, { hourly: '9007199254740991' }]) {
    assert.equal(calculate(sample(invalid)), null)
  }
  const draft = sample({ income: '100000', billable: '0' })
  assert.equal(calculate({ ...draft, rateMode: 'monthly' }), null)
})

test('accepts localized decimals without silently interpreting grouping or exponents', () => {
  assert.equal(parseNumber(' 1,25 '), 1.25)
  assert.equal(parseNumber('.5'), 0.5)
  for (const invalid of ['1.200,50', '1e4', 'Infinity', '-1', '50.']) assert.equal(parseNumber(invalid), null)
})

test('Argentine amounts preserve cents and interpret a period as thousands, not decimals', () => {
  assert.equal(parseMoney('1.500'), 1500)
  assert.equal(parseMoney('ARS $ 1.234.567,89'), 1234567.89)
  assert.equal(parseMoney(',05'), 0.05)
  assert.equal(formatMoneyInput('1500,5'), '1.500,50')
  assert.equal(formatMoneyInput('1.500,005'), '1.500,005')
  assert.equal(formatMoneyInput('1.500,'), '1.500,')
  assert.equal(formatMoneyInput(''), '')
  assert.equal(money(1500.5).replace(/\s/g, ''), '$1.500,50')
  for (const invalid of ['1.50', '1,500.99', '1,,50', '1.500,', '1e3']) assert.equal(parseMoney(invalid), null)
  assert.equal(calculate(sample({ hourly: '1.500,50', hours: '2', materials: '12,25' }))?.total, 3013.25)
})

test('activity guidance shows only comparable price data and never falls back to salary as a price', () => {
  assert.equal(validActivity('product', 'cooking'), null)
  assert.equal(validActivity('service', 'earrings'), null)
  assert.deepEqual(referencesFor('cooking', 'pricing').map(ref => ref.title), ['Servicio privado para 6 personas'])
  assert.equal(referencesFor('cooking', 'salary')[0].title, 'Cocinero/a, categoría 6')
  assert.deepEqual(referencesFor('earrings', 'pricing').map(ref => ref.title), ['Aros pasantes de media luna', 'Aros de plata 925'])
  assert.match(activityGuidance('food'), /No tenemos un precio de mercado verificado/)
  assert.deepEqual(referencesFor('other', 'pricing'), [])
  assert.match(activityGuidance('cooking'), /Buenos Aires.*18 nov 2026/)
})

test('workbook Vincha recipe reproduces 46 minutes and the suggested price of 23950', () => {
  const state = newCatalog()
  const vincha = state.products.find(product => product.name === 'Vincha')!
  const item = productItem(vincha, state.supplies)
  assert.deepEqual(itemCosts(item), { materials: 700, minutes: 46 })
  state.quote.items.push(item)
  const result = calculateQuote(state.quote)!
  assert.ok(Math.abs(result.lines[0].cost - 7983.333333333333) < 1e-9)
  assert.equal(result.total, 23950)
  assert.equal(result.minutes, 46)
})

test('multiple insumos include quantities, component preparation, and final assembly per product', () => {
  const state = newCatalog()
  const item: QuoteItem = {
    id: 'custom', name: 'Producto a medida', quantity: '3', materials: '12,50', minutes: '4,5', markup: '',
    ingredients: [
      { id: 'a', name: 'Pieza A', cost: '10', minutes: '2', quantity: '2' },
      { id: 'b', name: 'Pieza B', cost: '20', minutes: '1', quantity: '0,5' },
    ],
  }
  const result = calculateQuote({ ...state.quote, hourly: '600', markup: '20', items: [item] })!
  assert.equal(result.lines[0].materials, 42.5)
  assert.equal(result.lines[0].minutes, 9)
  assert.equal(result.lines[0].labor, 90)
  assert.equal(result.lines[0].unit, 159)
  assert.equal(result.total, 477)
  assert.equal(result.cost, 397.5)
  assert.equal(result.profit, 79.5)
  assert.equal(result.minutes, 27)
})

test('general ganancia is inherited only when blank, including explicit zero and per-item overrides', () => {
  const state = newCatalog()
  const base: QuoteItem = { id: 'base', name: 'Trabajo', materials: '100', minutes: '0', ingredients: [], quantity: '2', markup: '' }
  state.quote.hourly = '600'
  state.quote.markup = '50'
  state.quote.items = [base, { ...base, id: 'zero', markup: '0' }, { ...base, id: 'own', markup: '25' }]
  let result = calculateQuote(state.quote)!
  assert.deepEqual(result.lines.map(line => line.total), [300, 200, 250])
  assert.equal(result.total, 750)
  state.quote.markup = '100'
  result = calculateQuote(state.quote)!
  assert.deepEqual(result.lines.map(line => line.total), [400, 200, 250])
})

test('one workspace covers all product and ingredient time before each item ganancia', () => {
  const state = newCatalog()
  state.quote = {
    name: 'Pedido', hourly: '600', markup: '50',
    workspace: { id: 'studio', name: 'Taller', hourly: '1200' },
    items: [
      {
        id: 'first', name: 'Producto compuesto', materials: '10', minutes: '30', quantity: '2', markup: '',
        ingredients: [{ id: 'part', name: 'Pieza', cost: '0', minutes: '15', quantity: '2' }],
      },
      { id: 'second', name: 'Otro producto', materials: '20', minutes: '15', quantity: '1', markup: '0', ingredients: [] },
    ],
  }
  const result = calculateQuote(state.quote)!
  assert.equal(result.lines[0].minutes, 60)
  assert.equal(result.lines[0].labor, 600)
  assert.equal(result.lines[0].workspaceCost, 1200)
  assert.equal(result.lines[0].unit, 2715)
  assert.equal(result.lines[0].total, 5430)
  assert.equal(result.lines[1].workspaceCost, 300)
  assert.equal(result.lines[1].unit, 470)
  assert.equal(result.minutes, 135)
  assert.equal(result.workspaceCost, 2700)
  assert.equal(result.cost, 4090)
  assert.equal(result.profit, 1810)
  assert.equal(result.total, 5900)
})

test('switching or clearing the workspace replaces its rate rather than accumulating spaces', () => {
  const state = newCatalog()
  state.workspaces = [{ id: 'home', name: 'Mi casa', hourly: '100' }, { id: 'studio', name: 'Taller', hourly: '300' }]
  state.quote.hourly = '600'
  state.quote.markup = '20'
  state.quote.items = [{ id: 'item', name: 'Producto', materials: '100', minutes: '60', quantity: '1', markup: '', ingredients: [] }]
  state.quote.workspace = state.workspaces[0]
  assert.equal(calculateQuote(state.quote)!.total, 960)
  state.quote.workspace = state.workspaces[1]
  assert.equal(calculateQuote(state.quote)!.total, 1200)
  assert.equal(calculateQuote(state.quote)!.workspaceCost, 300)
  state.quote.workspace = null
  assert.equal(calculateQuote(state.quote)!.total, 840)
  assert.equal(calculateQuote(state.quote)!.workspaceCost, 0)
  state.quote.workspace = { id: 'free', name: 'Prestado', hourly: '0' }
  assert.equal(calculateQuote(state.quote)!.total, 840)
})

test('invalid workspace costs and overflowing space totals block the quote', () => {
  const quote = newCatalog().quote
  quote.hourly = '600'
  quote.markup = '0'
  quote.items = [{ id: 'item', name: 'Producto', materials: '0', minutes: '60', quantity: '1', markup: '', ingredients: [] }]
  for (const hourly of ['', '-1', '1.50', 'Infinity', '9007199254740991']) {
    assert.equal(calculateQuote({ ...quote, workspace: { id: 'studio', name: 'Taller', hourly } }), null)
  }
  assert.equal(calculateQuote({ ...quote, workspace: { id: 'studio', name: ' ', hourly: '100' } }), null)
})

test('quote snapshots do not change with catalog edits or deletion and local-only items do not enter catalog', () => {
  const state = newCatalog()
  const product = state.products.find(product => product.name === 'Vincha')!
  const snapshot = productItem(product, state.supplies)
  state.quote.items.push(snapshot)
  product.materials = '900'
  product.ingredients[0].quantity = '2'
  state.supplies.find(supply => supply.name === 'Hoja')!.minutes = '5'
  assert.deepEqual(itemCosts(snapshot), { materials: 700, minutes: 46 })
  assert.deepEqual(itemCosts(productItem(product, state.supplies)), { materials: 900, minutes: 30 })
  snapshot.ingredients[0].cost = '100'
  assert.equal(state.supplies.find(supply => supply.name === 'Hoja')!.cost, '0')
  state.products = []
  state.supplies = []
  assert.equal(calculateQuote(state.quote)!.minutes, 46)
  assert.equal(state.products.length, 0)
  assert.throws(() => productItem(product, []), /insumo que ya no existe/)
})

test('invalid quote entries and overflowing aggregate totals do not produce a price', () => {
  const quote = newCatalog().quote
  const base: QuoteItem = { id: 'item', name: 'Ítem', materials: '100', minutes: '1', ingredients: [], quantity: '1', markup: '' }
  assert.equal(calculateQuote(quote), null)
  for (const patch of [{ quantity: '0' }, { quantity: '1,5' }, { name: ' ' }, { minutes: '-1' }, { materials: 'error' }, { markup: '-2' }]) {
    assert.equal(calculateQuote({ ...quote, items: [{ ...base, ...patch }] }), null)
  }
  const badPart = { id: 'part', name: 'Pieza', cost: '20', minutes: '2', quantity: '0' }
  assert.equal(itemCosts({ ...base, ingredients: [badPart] }), null)
  const large = { ...base, materials: '9007199254740991', minutes: '0' }
  assert.equal(calculateQuote({ ...quote, markup: '0', items: [large, { ...large, id: 'second' }] }), null)
  assert.equal(calculateQuote({ ...quote, hourly: '0', items: [base] }), null)
  assert.equal(calculateQuote({ ...quote, markup: 'error', items: [base] }), null)
})

test('stored catalogs reject malformed recipes and IDs but preserve incomplete input drafts', () => {
  const state = newCatalog()
  assert.equal(isCatalogState(state), true)
  state.quote.items.push(productItem(state.products[3], state.supplies))
  state.quote.hourly = ''
  state.quote.items[0].quantity = 'bad input'
  assert.equal(isCatalogState(JSON.parse(JSON.stringify(state))), true)
  const malformed = structuredClone(state)
  malformed.products[3].ingredients[0].supplyId = 'missing'
  assert.equal(isCatalogState(malformed), false)
  assert.equal(isCatalogState({ ...state, supplies: [null] }), false)
  assert.equal(isCatalogState({ ...state, products: [...state.products, state.products[0]] }), false)
  assert.equal(isCatalogState({ ...state, workspaces: [{ id: 'studio', name: 'Taller', hourly: 1200 }] }), false)
  const workspace = { id: 'studio', name: 'Taller', hourly: '1200' }
  assert.equal(isCatalogState({ ...state, workspaces: [workspace, workspace] }), false)
  assert.equal(isCatalogState({ ...state, quote: { ...state.quote, workspace: { name: 'Sin costo' } } }), false)
  assert.equal(isCatalogState({ ...state, quote: { ...state.quote, workspace } }), true)
  state.quote.items[0].id = 'bad"]'
  assert.equal(isCatalogState(state), false)
})

test('local catalog storage migrates old drafts, round-trips workspace snapshots, and reports failures', t => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) },
  })
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  })
  const state = newCatalog()
  state.quote.items = [{ ...productItem(state.products[3], state.supplies), markup: '0', quantity: '3' }]
  const { workspaces, quote, version, ...legacyCatalog } = state
  const { workspace, ...legacyQuote } = quote
  values.set('worth-my-time:catalog:v1', JSON.stringify({ ...legacyCatalog, version: 1, quote: legacyQuote }))
  assert.deepEqual(loadCatalog(), { state, ok: true })
  state.workspaces = [{ id: 'home', name: 'Mi casa', hourly: '100' }, { id: 'studio', name: 'Taller', hourly: '1200' }]
  state.quote.workspace = structuredClone(state.workspaces[1])
  state.workspaces[1].hourly = '2000'
  assert.equal(saveCatalog(state), true)
  assert.deepEqual(loadCatalog(), { state, ok: true })
  assert.equal(calculateQuote(loadCatalog().state.quote)!.workspaceRate, 1200)
  state.workspaces = []
  assert.equal(saveCatalog(state), true)
  assert.deepEqual(loadCatalog(), { state, ok: true })
  assert.ok(Math.abs(calculateQuote(loadCatalog().state.quote)!.workspaceCost - 2760) < 1e-9)
  const warn = t.mock.method(console, 'warn', () => {})
  values.set('worth-my-time:catalog:v1', '{"version":1}')
  assert.equal(loadCatalog().ok, false)
  assert.equal(warn.mock.callCount(), 1)
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('Storage disabled') } })
  assert.equal(saveCatalog(state), false)
  assert.equal(loadCatalog().ok, false)
  assert.equal(warn.mock.callCount(), 3)
})
