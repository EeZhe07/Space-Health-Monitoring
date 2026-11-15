import { describe, it, expect } from 'vitest'
import { dailyStatus, analyseAttention, attentionProtocol, type AttentionSession } from './wellbeing'
import type { Run } from './core'
import { buildGroundReport } from './report'

const at = '2027-07-18T14:00:00Z'
const wall = '2026-11-15T06:00:00Z'
const base: Run = { id: 'test', scenario: 'default', now: at, events: [], observations: [] }
function session(id: string, ms = 300): AttentionSession {
  return { id, at, recordedAt: wall, protocol: attentionProtocol, input: 'keyboard',
    responses: Array(12).fill(ms), earlyInputs: 0 }
}
describe('20-hour daily reminder', () => {
  it('is initially due, respects both clocks, and never counts a future mission entry', () => {
    expect(dailyStatus(base, Date.parse(wall)).due).toBe(true)
    const run: Run = { ...base, dailyCheckIns: [{ id: 'd', at, recordedAt: wall, moodRating: 3, discomfort: false }] }
    expect(dailyStatus(run, Date.parse(wall) + 20 * 3600000 - 1).due).toBe(false)
    expect(dailyStatus(run, Date.parse(wall) + 20 * 3600000).due).toBe(true)
    expect(dailyStatus({ ...run, now: '2027-07-19T10:00:00Z' }, Date.parse(wall)).due).toBe(true)
    expect(dailyStatus({ ...run, now: '2027-07-18T13:00:00Z' }, Date.parse(wall)).latest).toBeUndefined()
    expect(JSON.stringify(buildGroundReport(run))).not.toContain('moodRating')
  })
})
describe('exploratory task signal', () => {
  const prior = ['a','b','c'].map(id => session(id))
  it('does not infer a state without personal evidence, or treat missing responses as fast reactions', () => {
    expect(analyseAttention(session('current'), []).state).toBe('baseline')
    expect(analyseAttention({ ...session('current'), responses: Array(12).fill(null) }, prior).state).toBe('insufficient')
  })
  it('flags measured change with reasons and rejects incompatible or future baselines', () => {
    const changed = analyseAttention(session('current', 500), prior)
    expect(changed.state).toBe('changed')
    expect(changed.reasons.length).toBeGreaterThan(0)
    expect(analyseAttention(session('current'), prior).state).toBe('similar')
    expect(analyseAttention(session('current'), prior.map(s => ({ ...s, input: 'touch' as const }))).state).toBe('baseline')
    expect(analyseAttention(session('current'), prior.map(s => ({ ...s, at: '2027-07-19T14:00:00Z' }))).state).toBe('baseline')
    expect(analyseAttention(session('current'), [...prior, session('current', 900)]).state).toBe('similar')
  })
  it('flags extra misses and early inputs without treating the threshold boundary as a slowdown', () => {
    expect(analyseAttention({ ...session('x'), responses: [...Array(10).fill(300), null, null] }, prior).state).toBe('changed')
    expect(analyseAttention({ ...session('x'), earlyInputs: 3 }, prior).state).toBe('changed')
    expect(analyseAttention(session('x', 375), prior).state).toBe('similar')
  })
})
