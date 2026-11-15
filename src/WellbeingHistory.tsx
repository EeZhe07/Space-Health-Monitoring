import type { Run } from './core'
import { crewOf } from './mission'
import { analyseAttention, attentionLabels, visibleAttention, visibleDaily, moodRatings } from './wellbeing'
const stamp = (date: string) => new Date(date).toISOString().replace('T', ' ').replace('.000Z', ' UTC')
export default function WellbeingHistory({ run }: { run: Run }) {
  const daily = visibleDaily(run), attention = visibleAttention(run)
  if (!daily.length && !attention.length) return null
  return <section className="panel wellbeing-history"><h2>Daily and attention records · This tablet</h2>
    <p className="help">{crewOf(run)}’s self-reports and task observations are different kinds of information. Latest summaries are shared only when wellbeing sharing is enabled.</p>
    <details><summary>Daily self-checks ({daily.length})</summary>{daily.map(entry => <div className="report" key={entry.id}>
      <strong>{entry.moodRating}/5 · {moodRatings[entry.moodRating - 1]}</strong><p>{entry.discomfort ? 'Discomfort reported' : 'No uncomfortable feelings reported'}</p>
      <p className="help">Mission: {stamp(entry.at)}<br/>Saved: {stamp(entry.recordedAt)}</p>
    </div>)}</details>
    <details><summary>Signal Watch rounds ({attention.length})</summary>{attention.map(entry => {
      const result = analyseAttention(entry, attention)
      return <div className="report" key={entry.id}><h3>{attentionLabels[result.state]}</h3>
        <p>Median {result.medianMs === null ? 'unavailable' : result.medianMs + ' ms'} · {result.misses} missed · {entry.earlyInputs} early inputs · {entry.input}</p>
        <ul>{result.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
        <p className="help">{result.baselineCount} comparison rounds · {entry.protocol}<br/>Mission: {stamp(entry.at)}<br/>Saved: {stamp(entry.recordedAt)}</p>
      </div>
    })}</details>
  </section>
}
