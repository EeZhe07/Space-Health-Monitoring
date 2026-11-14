import type { Run } from './core'

export type DailyCheckIn = { id: string; at: string; recordedAt: string; moodRating: number; discomfort: boolean }
export const dailyIntervalMs = 20 * 60 * 60 * 1000
export const moodRatings = ['Very low', 'Low', 'Mixed', 'Good', 'Very good']
export const visibleDaily = (run: Run) => [...(run.dailyCheckIns ?? [])]
  .filter(entry => Date.parse(entry.at) <= Date.parse(run.now))
  .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || Date.parse(b.recordedAt) - Date.parse(a.recordedAt))
export function dailyStatus(run: Run, wallNow = Date.now()) {
  const latest = visibleDaily(run)[0]
  const elapsed = latest ? Math.max(0, wallNow - Date.parse(latest.recordedAt), Date.parse(run.now) - Date.parse(latest.at)) : Infinity
  return { latest, due: elapsed >= dailyIntervalMs, remainingMs: Math.max(0, dailyIntervalMs - elapsed) }
}
export const needsFollowUp = (entry: Pick<DailyCheckIn, 'moodRating' | 'discomfort'>) => entry.moodRating <= 2 || entry.discomfort
export type TaskInput = 'mouse' | 'touch' | 'keyboard'
export const attentionProtocol = 'signal-watch-12-v1'
export type AttentionSession = { id: string; at: string; recordedAt: string; protocol: string; input: TaskInput
  responses: (number | null)[]; earlyInputs: number }
export const visibleAttention = (run: Run) => [...(run.attentionSessions ?? [])]
  .filter(entry => Date.parse(entry.at) <= Date.parse(run.now)).reverse()
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2)
  return sorted.length ? sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2 : null
}
export function taskMetrics(session: AttentionSession) {
  const valid = session.responses.filter((r): r is number => typeof r === 'number' && Number.isFinite(r) && r > 0 && r <= 2000)
  return { medianMs: median(valid), misses: session.responses.length - valid.length, responses: valid.length }
}
export function analyseAttention(current: AttentionSession, previous: AttentionSession[]) {
  const metrics = taskMetrics(current)
  const baseline = previous.filter(s => s.id !== current.id && s.protocol === current.protocol && s.input === current.input &&
    Date.parse(s.at) <= Date.parse(current.at) && Date.parse(s.recordedAt) <= Date.parse(current.recordedAt) &&
    s.responses.length === 12 && taskMetrics(s).responses >= 8)
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt)).slice(0, 3)
  const reasons: string[] = []
  const baselineMs = median(baseline.map(s => taskMetrics(s).medianMs!))
  let state: 'insufficient' | 'baseline' | 'changed' | 'similar'
  if (metrics.responses < 8 || current.responses.length !== 12 || current.protocol !== attentionProtocol) {
    state = 'insufficient'; reasons.push('Too few usable responses for comparison. Distraction or input difficulty may affect the round.')
  } else if (baseline.length < 3) {
    state = 'baseline'; reasons.push('A comparison needs three earlier saved rounds with the same input mode.')
  } else {
    if (metrics.medianMs! > baselineMs! * 1.25 && metrics.medianMs! - baselineMs! > 75)
      reasons.push('Median response was more than 25% and 75 ms slower than your recent comparison.')
    if (metrics.misses >= median(baseline.map(s => taskMetrics(s).misses))! + 2)
      reasons.push('At least two more signals were missed than in your recent comparison.')
    if (current.earlyInputs >= median(baseline.map(s => s.earlyInputs))! + 3)
      reasons.push('At least three more early inputs occurred than in your recent comparison.')
    state = reasons.length ? 'changed' : 'similar'
    if (!reasons.length) reasons.push('No change crossed the illustrative comparison rules. This does not establish mental wellness or fitness for duty.')
  }
  return { ...metrics, state, reasons, baselineMs, baselineCount: baseline.length }
}
export const attentionLabels = { baseline: 'Building your comparison', insufficient: 'Not enough usable responses',
  changed: 'Possible attention change · Check in', similar: 'Task performance similar to recent rounds' }
