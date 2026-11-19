import { validActivity } from './activities'
import { calculate, initialValues, isMoneyField, newDraft, stepIndex, type Field } from './pricing'

const oldKey = 'worth-my-time:draft:v1'
const draftKey = 'worth-my-time:draft:v2'

export function loadDraft() {
  const draft = newDraft()
  try {
    const current = localStorage.getItem(draftKey)
    const legacy = current === null
    const stored = current ?? localStorage.getItem(oldKey)
    if (stored === null) return { draft, ok: true }
    const data = JSON.parse(stored)
    if (data?.kind === 'product' || data?.kind === 'service') draft.kind = data.kind
    if (data?.rateMode === 'monthly') draft.rateMode = data.rateMode
    if (data?.location === 'client') draft.location = data.location
    draft.activity = validActivity(draft.kind, data?.activity)
    if (draft.kind && Number.isInteger(data.step) && data.step >= 0 && data.step <= stepIndex.summary) {
      draft.step = legacy && data.step > 0 ? stepIndex.activity
        : !draft.activity && data.step > stepIndex.activity ? stepIndex.activity : data.step
    }
    for (const field of Object.keys(initialValues) as Field[]) {
      if (typeof data?.values?.[field] !== 'string') continue
      const value = data.values[field].slice(0, 32)
      // V1 accepted a dot as a decimal, but never accepted thousands separators.
      draft.values[field] = legacy && isMoneyField(field) ? value.replace('.', ',') : value
    }
    if (draft.step === stepIndex.summary && !calculate(draft)) draft.step = stepIndex.rate
    return { draft, ok: true }
  } catch (error) {
    console.warn('No se pudo leer el borrador local.', error)
    return { draft: newDraft(), ok: false }
  }
}

export function saveDraft(draft: ReturnType<typeof newDraft>) {
  try {
    localStorage.setItem(draftKey, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function registerOffline() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js').catch(error => {
    console.warn('No se pudo preparar la calculadora para usar sin conexión.', error)
  })
}
