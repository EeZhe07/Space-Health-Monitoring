import { expect, it } from 'vitest'
import { assess } from './core'
import { simulatedPanel } from './indicators'
import { createRun } from './scenarios'

it('keeps legacy heart-rate fixtures separate from the added measurement panel', () => {
  const result = assess(createRun('C'))
  expect(result.observations).toHaveLength(37)
  expect(result.measurements).toHaveLength(43)
  expect(result.last?.value).toBe(142)
  expect(result.metrics.find(metric => metric.indicator === 'spo2')?.last?.value).toBe(98)
})
it('does not compare exercise heart rate with the resting reference', () => {
  expect(assess(createRun('A')).metrics.find(metric => metric.indicator === 'heart_rate')?.state).toBe('context_needed')
})
it('identifies illustrative multi-indicator changes while preserving open symptoms', () => {
  const run = createRun('C')
  run.observations.push(...simulatedPanel(run.now, true))
  const result = assess(run)
  expect(result.metrics.filter(metric => metric.state === 'review').map(metric => metric.indicator))
    .toEqual(['spo2', 'respiratory_rate', 'body_temperature'])
  expect(result.symptoms).toHaveLength(1)
})
it('never turns an unmeasured panel into normal readings', () => {
  expect(assess(createRun('D')).metrics.every(metric => metric.state === 'missing')).toBe(true)
})
it('stores the two pressures from one simulated reading under the same group', () => {
  const bp = simulatedPanel('2027-07-18T14:10:00Z').filter(observation => observation.indicator?.endsWith('_bp'))
  expect(bp).toHaveLength(2)
  expect(bp[0].groupId).toBe(bp[1].groupId)
})
it('records sleep without deriving a diagnosis from a scheduled sleep opportunity', () => {
  const run = createRun('C')
  run.observations.push(...simulatedPanel(run.now, true))
  const sleep = assess(run).metrics.find(metric => metric.indicator === 'sleep_duration')
  expect(sleep?.state).toBe('recorded')
  expect(sleep?.reference).toBeNull()
})
