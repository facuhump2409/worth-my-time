const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
const smallArs = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumSignificantDigits: 2 })

export function money(value: number, whole = false) {
  return whole ? ars.format(value).replace(/,00$/, '') : (value > 0 && value < 0.01 ? smallArs : ars).format(value)
}

function moneyParts(text: string) {
  const cleaned = text.trim().replace(/^(?:ARS\s*)?\$\s*|^ARS\s+/i, '')
  const matched = /^(?:(\d+|[1-9]\d{0,2}(?:\.\d{3})+)(?:,(\d+))?|,(\d+))$/.exec(cleaned)
  if (!matched) return null
  const whole = (matched[1] ?? '0').replaceAll('.', '').replace(/^0+(?=\d)/, '')
  const fraction = matched[2] ?? matched[3] ?? ''
  return { whole, fraction }
}

export function parseMoney(text: string): number | null {
  const parts = moneyParts(text)
  if (!parts) return null
  const value = Number(`${parts.whole}.${parts.fraction}`)
  return Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER ? value : null
}

export function formatMoneyInput(text: string): string {
  const parts = moneyParts(text)
  if (!parts || parseMoney(text) === null) return text
  const whole = parts.whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${whole},${parts.fraction.padEnd(2, '0')}`
}
