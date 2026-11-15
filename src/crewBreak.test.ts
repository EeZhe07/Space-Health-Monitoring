import { describe, expect, it } from 'vitest'
import { visibleMoods } from './breakRound'
import { buildGroundReport } from './report'
import type { Run } from './core'

describe('optional crew break', () => {
  it('keeps local self-reports out of the ground packet and hides entries after the replay clock', () => {
    const run: Run = { id: 'sample', scenario: 'A', now: '2027-07-18T14:08:00Z', observations: [], events: [],
      moodCheckIns: [{ id: 'm1', at: '2027-07-18T13:55:00Z', mood: 'Mixed' }, { id: 'm2', at: '2027-07-18T14:09:00Z', mood: 'Calm' }] }
    expect(visibleMoods(run).map(m => m.id)).toEqual(['m1'])
    const packet = JSON.stringify(buildGroundReport(run))
    expect(packet).not.toContain('Mixed')
    expect(packet).not.toContain('moodCheckIns')
    expect(visibleMoods({ ...run, moodCheckIns: undefined })).toEqual([])
  })
})
