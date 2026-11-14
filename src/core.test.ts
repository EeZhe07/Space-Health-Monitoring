import { describe, expect, it } from 'vitest'
import { assess, parseMeasurements, type Run } from './core'

const observation = {
  id: 'HR-1', value: 142, unit: 'bpm' as const,
  measuredAt: '2027-07-18T14:06:00Z', receivedAt: '2027-07-18T14:06:05Z',
  context: 'exercise', source: 'simulated_device', quality: 'ok', synthetic: true,
}
function run(overrides: Partial<Run> = {}): Run {
  return { id: 'test', scenario: 'C', now: '2027-07-18T14:09:00Z',
    observations: [observation], events: [], ...overrides }
}
describe('measurement availability', () => {
  it('excludes measurements not yet received, even if already measured', () => {
    expect(assess(run({ now: '2027-07-18T14:06:00Z' })).last).toBeNull()
  })
  it('shows an old reading as historical and current heart rate as unknown', () => {
    const result = assess(run())
    expect(result.available).toBe(false)
    expect(result.last?.value).toBe(142)
  })
  it('does not fabricate a zero for an empty input', () => {
    expect(assess(run({ observations: [] })).last).toBeNull()
  })
  it('excludes poor-quality observations', () => {
    expect(assess(run({ observations: [{ ...observation, quality: 'poor' }] })).last).toBeNull()
  })
  it('accepts a fresh manual measurement while the wrist sensor is disconnected', () => {
    const result = assess(run({
      now: '2027-07-18T14:09:10Z',
      observations: [{ ...observation, source: 'manual', measuredAt: '2027-07-18T14:09:00Z',
        receivedAt: '2027-07-18T14:09:00Z', context: 'rest' }],
      events: [{ id: 'disconnect', type: 'sensor_disconnected', at: '2027-07-18T14:07:00Z' }],
    }))
    expect(result.available).toBe(true)
    expect(result.sensor).toBe('disconnected')
  })
})
describe('crew reports and handoff', () => {
  const report = { id: 'SYM-1', type: 'symptom_report' as const, at: '2027-07-18T14:08:00Z',
    symptom: 'dizziness', actor: 'CM-2', onset: '2027-07-18T14:07:00Z', certainty: 'approximate' }
  it('preserves a symptom when the sensor recovers', () => {
    const result = assess(run({ events: [report, {
      id: 'RESTORE', type: 'sensor_connected', at: '2027-07-18T14:08:30Z',
    }] }))
    expect(result.symptoms).toHaveLength(1)
    expect(result.sensor).toBe('connected')
  })
  it('allows assistance when there are no observations or symptoms', () => {
    const result = assess(run({ observations: [], events: [{
      id: 'HELP', type: 'assistance_requested', at: '2027-07-18T14:08:00Z', actor: 'CM-2',
    }] }))
    expect(result.assistanceRequested).toBe(true)
    expect(result.handoff).toBe('pending')
    expect(result.last).toBeNull()
  })
  it('acknowledges handoff while keeping the symptom open', () => {
    const result = assess(run({ events: [report, {
      id: 'ACK', type: 'handoff_acknowledged', at: '2027-07-18T14:09:00Z', actor: 'CM-1',
    }] }))
    expect(result.handoff).toBe('acknowledged')
    expect(result.symptoms).toHaveLength(1)
  })
  it('ignores events that have not happened in the replay yet', () => {
    expect(assess(run({ now: '2027-07-18T14:07:00Z', events: [report] })).symptoms).toHaveLength(0)
  })
  it('requires fresh acknowledgement when another concern arrives after handoff', () => {
    const result = assess(run({ now: '2027-07-18T14:12:00Z', events: [report,
      { id: 'ACK', type: 'handoff_acknowledged', at: '2027-07-18T14:09:00Z', actor: 'CM-1' },
      { id: 'NEW', type: 'symptom_report', at: '2027-07-18T14:11:00Z', symptom: 'headache', actor: 'CM-2' },
    ] }))
    expect(result.handoff).toBe('pending')
    expect(result.acknowledgement).toBeNull()
  })
})
describe('fixture parsing', () => {
  it('preserves zero and parses a false synthetic flag as false', () => {
    const csv = 'record_id,value,unit,measured_at,received_at,context,source,quality,synthetic\nX,0,bpm,2027-07-18T14:06:00Z,2027-07-18T14:06:05Z,exercise,manual,ok,False'
    const result = parseMeasurements(csv)
    expect(result[0].synthetic).toBe(false)
    expect(result[0].value).toBe(0)
  })
  it('rejects a missing numeric value instead of converting it to zero', () => {
    expect(() => parseMeasurements('record_id,value,unit,measured_at,received_at\nX,,bpm,2027-07-18T14:06:00Z,2027-07-18T14:06:05Z')).toThrow()
  })
})
