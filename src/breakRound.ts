import type { Run } from './core'

export const moods = ['Calm', 'Content', 'Mixed', 'Tense', 'Low', 'Not sure'] as const
export type Mood = typeof moods[number]
export type MoodCheckIn = { id: string; at: string; mood: Mood }
export const visibleMoods = (run: Run) => [...(run.moodCheckIns ?? [])].reverse()
  .filter(entry => Date.parse(entry.at) <= Date.parse(run.now))
  .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))

const symbols = ['Moon', 'Sun', 'Star', 'Comet', 'Ringed planet'] as const
export type SymbolName = typeof symbols[number]
function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}
export function makeDeck() {
  const pairs = shuffle([...symbols]).slice(0, 3)
  return shuffle([...pairs, ...pairs])
}
type Round = { deck: SymbolName[]; open: number[]; matched: number[] }
export const startRound = (deck = makeDeck()): Round => ({ deck, open: [], matched: [] })
export function turnCard(round: Round, index: number): Round {
  if (!round.deck[index] || round.matched.includes(index)) return round
  const first = round.open.length === 1 ? round.open[0] : undefined
  if (first === index) return round
  if (first === undefined) return { ...round, open: [index] }
  if (round.deck[first] === round.deck[index])
    return { ...round, open: [], matched: [...round.matched, first, index] }
  return { ...round, open: [first, index] }
}
