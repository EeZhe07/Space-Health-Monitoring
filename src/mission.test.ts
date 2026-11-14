import { describe, expect, it } from 'vitest'
import { createRun } from './scenarios'
import { buildGroundReport } from './report'
import { crewOf, selectLatest, analysePacket } from './mission'
import type { GroundPacket } from './storage'

function packet(scenario: 'default' | 'C', crewId = 'CM-2', id = 'p'): GroundPacket {
  return { id, runId: id, userId: 'local-demo', state: 'demo',
    demoReceivedAt: new Date().toISOString(), report: buildGroundReport({ ...createRun(scenario), crewId }) }
}
describe('mission data separation', () => {
  it('retains legacy CM-2 and identifies the actual subject in every report', () => {
    expect(crewOf(createRun('C'))).toBe('CM-2')
    expect(buildGroundReport({ ...createRun('default'), crewId: 'CM-3' }).crewId).toBe('CM-3')
  })
  it('selects newer mission data over late-arriving old packets and never selects a reply as a health update', () => {
    const old = packet('C'), latest = packet('default', 'CM-2', 'new')
    const reply = { ...latest, id: 'reply', report: { ...latest.report, kind: 'ground_response' as const } }
    old.demoReceivedAt = '2099-01-01T00:00:00Z'
    expect(selectLatest([old, latest, reply], 'CM-2')?.id).toBe('new')
    expect(selectLatest([old], 'CM-1')).toBeUndefined()
    expect(analysePacket(latest, latest.report.asOf).symptoms).toHaveLength(0)
    expect(analysePacket(old, old.report.asOf).symptoms.length).toBeGreaterThan(0)
  })
  it('keeps wellbeing private by default and includes an explicit shareable summary only on consent', () => {
    const run = { ...createRun('default'), dailyCheckIns: [{ id: 'private', at: '2027-07-18T14:00:00Z', recordedAt: new Date().toISOString(), moodRating: 1, discomfort: true }] }
    expect(buildGroundReport(run).wellbeing).toBeUndefined()
    expect(buildGroundReport({ ...run, shareWellbeing: true }).wellbeing?.daily?.moodRating).toBe(1)
  })
})
