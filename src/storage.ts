import { calculate, initialValues, newDraft, type Field } from './pricing'

const draftKey = 'worth-my-time:draft:v1'

export function loadDraft() {
  const draft = newDraft()
  try {
    const stored = localStorage.getItem(draftKey)
    if (stored === null) return { draft, ok: true }
    const data = JSON.parse(stored)
    if (data?.kind === 'product' || data?.kind === 'service') draft.kind = data.kind
    if (data?.rateMode === 'monthly') draft.rateMode = data.rateMode
    if (data?.location === 'client') draft.location = data.location
    if (draft.kind && Number.isInteger(data.step) && data.step >= 0 && data.step <= 6) draft.step = data.step
    for (const field of Object.keys(initialValues) as Field[]) {
      if (typeof data?.values?.[field] === 'string') draft.values[field] = data.values[field].slice(0, 32)
    }
    if (draft.step === 6 && !calculate(draft)) draft.step = 1
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
