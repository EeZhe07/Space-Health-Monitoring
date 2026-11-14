import { describe, expect, it } from 'vitest'
import { makeDeck, turnCard, startRound, visibleMoods } from './breakRound'
import { buildGroundReport } from './report'
import type { Run } from './core'

describe('optional crew break', () => {
  it('deals three distinct pairs, ignores a repeated card, and allows another try after a mismatch', () => {
    const deck = makeDeck()
    expect(deck).toHaveLength(6)
    expect(new Set(deck).size).toBe(3)
    for (const symbol of deck) expect(deck.filter(x => x === symbol)).toHaveLength(2)
    const round = startRound(['Moon', 'Sun', 'Moon', 'Star', 'Sun', 'Star'])
    const first = turnCard(round, 0)
    expect(turnCard(first, 0)).toBe(first)
    const miss = turnCard(first, 1)
    expect(miss.open).toEqual([0, 1])
    const next = turnCard(miss, 2)
    expect(next.open).toEqual([2])
    const pair = turnCard(next, 0)
    expect(pair.matched).toEqual([2, 0])
    expect(turnCard(pair, 2)).toBe(pair)
    expect([1, 4, 3, 5].reduce(turnCard, pair).matched).toHaveLength(6)
  })
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
