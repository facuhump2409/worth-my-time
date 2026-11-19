import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculate, newDraft, parseNumber, type Draft } from './pricing.ts'

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
