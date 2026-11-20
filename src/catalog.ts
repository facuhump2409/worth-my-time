import { parseMoney } from './money.ts'
import { parseNumber } from './pricing.ts'

export interface Supply {
  id: string
  name: string
  cost: string
  minutes: string
}

export interface Ingredient {
  supplyId: string
  quantity: string
}

export interface Product {
  id: string
  name: string
  materials: string
  minutes: string
  ingredients: Ingredient[]
}

export interface QuoteItem extends Omit<Product, 'ingredients'> {
  quantity: string
  markup: string
  ingredients: (Supply & { quantity: string })[]
}

export interface Workspace {
  id: string
  name: string
  hourly: string
}

export interface CatalogState {
  version: 2
  supplies: Supply[]
  products: Product[]
  workspaces: Workspace[]
  quote: { name: string; hourly: string; markup: string; items: QuoteItem[]; workspace: Workspace | null }
}

export const uid = () => crypto.randomUUID()
const validAmount = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER
const positiveQuantity = (text: string, integer = false) => {
  const value = parseNumber(text)
  return value !== null && value > 0 && (!integer || Number.isSafeInteger(value)) ? value : null
}

export function newCatalog(): CatalogState {
  const supplies = [
    ['Escarapela compleja', '40'], ['Escarapela simple', '5'], ['Aplastada común', '1'],
    ['Hoja', '2'], ['Mostasilla', '2'], ['Rulo grande', '5'], ['Flor', '10'],
  ].map(([name, minutes], index) => ({ id: `capsula-${index}`, name, minutes, cost: '0' }))
  const products = [
    ['Escarapela', '350', '1'], ['Hebilla hojas', '800', '2'], ['Hebilla común', '800', '1'],
    ['Vincha', '700', '20'], ['Collar rulos', '800', '20'], ['Aros flor', '300', '2'],
    ['Collar mostasillas', '1250', '10'], ['Collar círculos', '800', '10'],
    ['Anillo', '600', '1'], ['Gargantilla', '1000', '1'],
  ].map(([name, materials, minutes], index) => ({
    id: `producto-${index}`, name, materials, minutes,
    ingredients: index === 3 ? [{ supplyId: 'capsula-3', quantity: '13' }] : [],
  }))
  return { version: 2, supplies, products, workspaces: [], quote: { name: '', hourly: '9500', markup: '200', items: [], workspace: null } }
}

export function productItem(product: Product, supplies: Supply[]): QuoteItem {
  return {
    ...product, id: uid(), quantity: '1', markup: '',
    ingredients: product.ingredients.map(ingredient => {
      const supply = supplies.find(item => item.id === ingredient.supplyId)
      if (!supply) throw new Error('El producto contiene un insumo que ya no existe.')
      return { ...supply, quantity: ingredient.quantity }
    }),
  }
}

export function itemCosts(item: QuoteItem) {
  let materials = parseMoney(item.materials)
  let minutes = parseNumber(item.minutes)
  if (!item.name.trim() || !validAmount(materials) || !validAmount(minutes)) return null
  for (const ingredient of item.ingredients) {
    const cost = parseMoney(ingredient.cost)
    const time = parseNumber(ingredient.minutes)
    const quantity = positiveQuantity(ingredient.quantity)
    if (!ingredient.name.trim() || !validAmount(cost) || !validAmount(time) || quantity === null) return null
    materials += cost * quantity
    minutes += time * quantity
  }
  return validAmount(materials) && validAmount(minutes) ? { materials, minutes } : null
}

export function calculateQuote(quote: CatalogState['quote']) {
  const hourly = parseMoney(quote.hourly)
  const generalMarkup = parseNumber(quote.markup)
  const workspaceRate = quote.workspace === null ? 0 : parseMoney(quote.workspace.hourly)
  if (!validAmount(hourly) || hourly === 0 || !validAmount(generalMarkup) || !validAmount(workspaceRate) ||
      (quote.workspace !== null && !quote.workspace.name.trim()) || !quote.items.length) return null
  const lines = []
  for (const item of quote.items) {
    const costs = itemCosts(item)
    const quantity = positiveQuantity(item.quantity, true)
    const markup = item.markup.trim() === '' ? generalMarkup : parseNumber(item.markup)
    if (!costs || quantity === null || !validAmount(markup)) return null
    const labor = costs.minutes / 60 * hourly
    const workspaceCost = costs.minutes / 60 * workspaceRate
    const cost = costs.materials + labor + workspaceCost
    const profit = cost * markup / 100
    const unit = cost + profit
    const total = unit * quantity
    const minutes = costs.minutes * quantity
    if (![labor, workspaceCost, cost, profit, unit, total, minutes].every(validAmount)) return null
    lines.push({ id: item.id, name: item.name, quantity, markup, ...costs, labor, workspaceCost, cost, profit, unit, total, totalMinutes: minutes })
  }
  const total = lines.reduce((sum, line) => sum + line.total, 0)
  const minutes = lines.reduce((sum, line) => sum + line.totalMinutes, 0)
  const cost = lines.reduce((sum, line) => sum + line.cost * line.quantity, 0)
  const profit = lines.reduce((sum, line) => sum + line.profit * line.quantity, 0)
  const workspaceCost = lines.reduce((sum, line) => sum + line.workspaceCost * line.quantity, 0)
  return [total, minutes, cost, profit, workspaceCost].every(validAmount)
    ? { lines, total, minutes, cost, profit, workspaceCost, workspaceRate } : null
}

// Keep incomplete input drafts, but reject malformed storage before rendering it.
export function isCatalogState(value: unknown): value is CatalogState {
  const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
  const text = (v: unknown) => typeof v === 'string' && v.length <= 160
  const strings = (v: Record<string, unknown>, keys: string[]) => keys.every(key => text(v[key]))
  const id = (v: unknown) => typeof v === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(v)
  const supply = (v: unknown) => object(v) && id(v.id) && strings(v, ['name', 'cost', 'minutes'])
  const workspace = (v: unknown) => object(v) && id(v.id) && strings(v, ['name', 'hourly'])
  const product = (v: unknown): v is Record<string, unknown> & { ingredients: unknown[] } =>
    object(v) && id(v.id) && strings(v, ['name', 'materials', 'minutes']) && Array.isArray(v.ingredients)
  if (!object(value) || value.version !== 2 || !Array.isArray(value.supplies) || !Array.isArray(value.products) ||
      !Array.isArray(value.workspaces) || !value.workspaces.every(workspace) ||
      !object(value.quote) || !Array.isArray(value.quote.items)) return false
  if (!value.supplies.every(supply) || !strings(value.quote, ['name', 'hourly', 'markup']) ||
      (value.quote.workspace !== null && !workspace(value.quote.workspace))) return false
  const ids = value.supplies.map(item => item.id)
  return new Set(ids).size === ids.length &&
    new Set(value.workspaces.map(item => item.id)).size === value.workspaces.length &&
    new Set(value.products.map(item => object(item) ? item.id : null)).size === value.products.length &&
    new Set(value.quote.items.map(item => object(item) ? item.id : null)).size === value.quote.items.length &&
    value.products.every(item => product(item) && item.ingredients.every(ingredient =>
      object(ingredient) && strings(ingredient, ['supplyId', 'quantity']) && ids.includes(ingredient.supplyId))) &&
    value.quote.items.every(item => product(item) && strings(item, ['quantity', 'markup']) &&
      item.ingredients.every(ingredient => supply(ingredient) && object(ingredient) && text(ingredient.quantity)))
}

const key = 'worth-my-time:catalog:v1'

export function loadCatalog(): { state: CatalogState; ok: boolean } {
  try {
    const stored = localStorage.getItem(key)
    if (stored === null) return { state: newCatalog(), ok: true }
    let state: unknown = JSON.parse(stored)
    if (typeof state === 'object' && state !== null && 'version' in state && state.version === 1 &&
        !('workspaces' in state) && 'quote' in state && typeof state.quote === 'object' && state.quote !== null &&
        !('workspace' in state.quote)) {
      state = { ...state, version: 2, workspaces: [], quote: { ...state.quote, workspace: null } }
    }
    if (!isCatalogState(state)) throw new Error('El catálogo guardado tiene un formato inválido.')
    return { state, ok: true }
  } catch (error) {
    console.warn('No se pudo leer el catálogo local.', error)
    return { state: newCatalog(), ok: false }
  }
}

export function saveCatalog(state: CatalogState) {
  try {
    localStorage.setItem(key, JSON.stringify(state))
    return true
  } catch (error) {
    console.warn('No se pudo guardar el catálogo local.', error)
    return false
  }
}
