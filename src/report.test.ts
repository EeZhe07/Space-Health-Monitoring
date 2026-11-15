import { expect, it } from 'vitest'
import { buildGroundReport } from './report'
import type { Run } from './core'

it('packages handoff findings, visible observations and relevant references for ground review', () => {
  const run: Run = {
    id: 'run', scenario: 'C', now: '2027-07-18T14:10:00Z',
    observations: [{
      id: 'future', value: 80, unit: 'bpm', context: 'rest', source: 'simulated_device',
      quality: 'ok', synthetic: true, measuredAt: '2027-07-18T14:11:00Z', receivedAt: '2027-07-18T14:11:05Z',
    }],
    events: [
      { id: 'symptom', type: 'symptom_report', at: '2027-07-18T14:08:00Z', symptom: 'dizziness', actor: 'CM-2' },
      { id: 'ack', type: 'handoff_acknowledged', at: '2027-07-18T14:09:00Z', actor: 'CM-1',
        description: 'Reviewed the crew report; fresh measurement unavailable.' },
    ],
  }
  const report = buildGroundReport(run)
  expect(report.deliveryStatus).toBe('local_only')
  expect(report.observations).toHaveLength(0)
  expect(report.handoff?.actor).toBe('CM-1')
  expect(report.handoff?.description).toContain('fresh measurement')
  expect(report.references.some(source => source.title.includes('Clinical Decision Support'))).toBe(true)
  expect(report.references.some(source => source.title.includes('radiation'))).toBe(false)
  expect(report.timeline).toHaveLength(2)
})
