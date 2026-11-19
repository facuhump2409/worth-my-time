import type { Kind } from './pricing.ts'

const productActivities = [
  { id: 'earrings', label: 'Aros y accesorios' },
  { id: 'food', label: 'Comida y repostería' },
  { id: 'other', label: 'Otro rubro' },
] as const
const serviceActivities = [
  { id: 'cooking', label: 'Cocina a domicilio' },
  { id: 'other', label: 'Otro rubro' },
] as const

export type Activity = (typeof productActivities | typeof serviceActivities)[number]['id']

export function activitiesFor(kind: Kind | null) {
  return kind === 'product' ? productActivities : kind === 'service' ? serviceActivities : []
}

export function validActivity(kind: Kind | null, value: unknown): Activity | null {
  return activitiesFor(kind).find(activity => activity.id === value)?.id ?? null
}
