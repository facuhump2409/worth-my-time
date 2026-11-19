export type Kind = 'product' | 'service'
export type RateMode = 'direct' | 'monthly'
export type Location = 'own' | 'client'

export const initialValues = {
  hourly: '', income: '', billable: '', hours: '', units: '1', materials: '',
  fixed: '', local: '', travel: '', travelHours: '', markup: '',
}
export type Field = keyof typeof initialValues

export interface Draft {
  kind: Kind | null
  rateMode: RateMode
  location: Location
  step: number
  values: Record<Field, string>
}

export function newDraft(): Draft {
  return { kind: null, rateMode: 'direct', location: 'own', step: 0, values: { ...initialValues } }
}

// No thousands separators: a single comma or dot always means decimals.
export function parseNumber(text: string): number | null {
  const cleaned = text.trim()
  if (!/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(cleaned)) return null
  const number = Number(cleaned.replace(',', '.'))
  return Number.isFinite(number) && number <= Number.MAX_SAFE_INTEGER ? number : null
}

function amount(text: string): number | null {
  return text.trim() === '' ? 0 : parseNumber(text)
}

export function hourlyRate(draft: Draft): number | null {
  const { hourly, income, billable } = draft.values
  if (draft.rateMode === 'direct') return parseNumber(hourly)
  const pay = parseNumber(income)
  const hours = parseNumber(billable)
  return pay !== null && hours && pay / hours <= Number.MAX_SAFE_INTEGER ? pay / hours : null
}

export function activeFields(draft: Draft, step: number): Field[] {
  switch (step) {
    case 1: return draft.rateMode === 'direct' ? ['hourly'] : ['income', 'billable']
    case 2: return draft.kind === 'product' ? ['hours', 'units'] : ['hours']
    case 3: return ['materials', 'fixed', ...(draft.rateMode === 'direct' && amount(draft.values.fixed) ? ['billable' as const] : [])]
    case 4: return draft.location === 'own' ? ['local'] : ['local', 'travel', 'travelHours']
    case 5: return ['markup']
    default: return []
  }
}

export function validateField(field: Field, text: string): string {
  const required = ['hourly', 'income', 'billable', 'hours', 'units'].includes(field)
  const value = required ? parseNumber(text) : amount(text)
  if (value === null) return 'Ingresá un número sin separador de miles, mayor o igual a cero.'
  if (required && value <= 0) return 'Ingresá un valor mayor a cero.'
  if (field === 'units' && !Number.isSafeInteger(value)) return 'Ingresá una cantidad entera de unidades.'
  return ''
}

export function canCalculate(draft: Draft): boolean {
  return draft.kind !== null && [1, 2, 3, 4, 5].every(step =>
    activeFields(draft, step).every(field => !validateField(field, draft.values[field])),
  )
}

export function calculate(draft: Draft) {
  if (!canCalculate(draft)) return null
  const rate = hourlyRate(draft)
  if (rate === null || rate <= 0) return null
  const read = (field: Field) => amount(draft.values[field]) ?? 0
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
