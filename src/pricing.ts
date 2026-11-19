import type { Activity } from './activities.ts'
import { parseMoney } from './money.ts'

export type Kind = 'product' | 'service'
export type RateMode = 'direct' | 'monthly'
export type Location = 'own' | 'client'

export const initialValues = {
  hourly: '', income: '', billable: '', hours: '', units: '1', materials: '',
  fixed: '', local: '', travel: '', travelHours: '', markup: '',
}
export type Field = keyof typeof initialValues

export function isMoneyField(field: Field) {
  return field === 'hourly' || field === 'income' || field === 'materials' || field === 'fixed' || field === 'local' || field === 'travel'
}

export const stepIndex = { intro: 0, activity: 1, rate: 2, time: 3, costs: 4, location: 5, profit: 6, summary: 7 } as const
export const pricingSteps = [stepIndex.rate, stepIndex.time, stepIndex.costs, stepIndex.location, stepIndex.profit]

export interface Draft {
  kind: Kind | null
  activity: Activity | null
  rateMode: RateMode
  location: Location
  step: number
  values: Record<Field, string>
}

export function newDraft(): Draft {
  return { kind: null, activity: null, rateMode: 'direct', location: 'own', step: stepIndex.intro, values: { ...initialValues } }
}

// No thousands separators: a single comma or dot always means decimals.
export function parseNumber(text: string): number | null {
  const cleaned = text.trim()
  if (!/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(cleaned)) return null
  const number = Number(cleaned.replace(',', '.'))
  return Number.isFinite(number) && number <= Number.MAX_SAFE_INTEGER ? number : null
}

function amount(field: Field, text: string): number | null {
  return text.trim() === '' ? 0 : (isMoneyField(field) ? parseMoney(text) : parseNumber(text))
}

export function hourlyRate(draft: Draft): number | null {
  const { hourly, income, billable } = draft.values
  if (draft.rateMode === 'direct') return parseMoney(hourly)
  const pay = parseMoney(income)
  const hours = parseNumber(billable)
  return pay !== null && hours && pay / hours <= Number.MAX_SAFE_INTEGER ? pay / hours : null
}

export function activeFields(draft: Draft, step: number): Field[] {
  switch (step) {
    case stepIndex.rate: return draft.rateMode === 'direct' ? ['hourly'] : ['income', 'billable']
    case stepIndex.time: return draft.kind === 'product' ? ['hours', 'units'] : ['hours']
    case stepIndex.costs: return ['materials', 'fixed', ...(draft.rateMode === 'direct' && amount('fixed', draft.values.fixed) ? ['billable' as const] : [])]
    case stepIndex.location: return draft.location === 'own' ? ['local'] : ['local', 'travel', 'travelHours']
    case stepIndex.profit: return ['markup']
    default: return []
  }
}

export function validateField(field: Field, text: string): string {
  const required = ['hourly', 'income', 'billable', 'hours', 'units'].includes(field)
  const value = required && text.trim() === '' ? null : amount(field, text)
  if (value === null) return isMoneyField(field)
    ? 'Ingresá un importe como 1.500,50: punto para miles y coma para decimales.'
    : 'Ingresá un número sin separador de miles, mayor o igual a cero.'
  if (required && value <= 0) return 'Ingresá un valor mayor a cero.'
  if (field === 'units' && !Number.isSafeInteger(value)) return 'Ingresá una cantidad entera de unidades.'
  return ''
}

export function canCalculate(draft: Draft): boolean {
  return draft.kind !== null && pricingSteps.every(step =>
    activeFields(draft, step).every(field => !validateField(field, draft.values[field])),
  )
}

export function calculate(draft: Draft) {
  if (!canCalculate(draft)) return null
  const rate = hourlyRate(draft)
  if (rate === null || rate <= 0) return null
  const read = (field: Field) => amount(field, draft.values[field]) ?? 0
  const hours = read('hours')
  const travelHours = draft.location === 'client' ? read('travelHours') : 0
  const labor = rate * hours
  const travelLabor = rate * travelHours
  const materials = read('materials')
  const fixed = read('fixed')
  const overhead = fixed ? (fixed / read('billable')) * (hours + travelHours) : 0
  const local = read('local')
  const travel = draft.location === 'client' ? read('travel') : 0
  const cost = labor + travelLabor + materials + overhead + local + travel
  const markup = read('markup')
  const profit = cost * (markup / 100)
  const total = cost + profit
  const units = draft.kind === 'product' ? read('units') : 1
  const unit = total / units
  const result = { rate, labor, travelLabor, materials, overhead, local, travel, cost, markup, profit, total, units, unit }
  return unit > 0 && Object.values(result).every(n => Number.isFinite(n) && n <= Number.MAX_SAFE_INTEGER) ? result : null
}
