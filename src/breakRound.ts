import type { Run } from './core'

export const moods = ['Calm', 'Content', 'Mixed', 'Tense', 'Low', 'Not sure'] as const
export type Mood = typeof moods[number]
export type MoodCheckIn = { id: string; at: string; mood: Mood }
export const visibleMoods = (run: Run) => [...(run.moodCheckIns ?? [])].reverse()
  .filter(entry => Date.parse(entry.at) <= Date.parse(run.now))
  .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
