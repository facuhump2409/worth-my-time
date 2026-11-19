import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculate, newDraft, parseNumber, type Draft } from './pricing.ts'
import { formatMoneyInput, money, parseMoney } from './money.ts'
import { validActivity } from './activities.ts'
import { activityGuidance, referencesFor } from './references.ts'

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
