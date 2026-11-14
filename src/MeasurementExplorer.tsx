import { useState } from 'react'
import { assess, time, type Run } from './core'
import type { Indicator } from './indicators'
import TrendChart from './TrendChart'

export const metricStates = {
  missing: 'Not measured', stale: 'Needs updating', context_needed: 'Context differs',
  within_reference: 'Within reference', review: 'Review reading', recorded: 'Recorded',
}
export default function MeasurementExplorer({ run, onRecord }: { run: Run; onRecord: (indicator: Indicator) => void }) {
  const [selected, setSelected] = useState<Indicator>('heart_rate')
  const result = assess(run)
  const metric = result.metrics.find(item => item.indicator === selected)!
  return <div className="measurement-explorer">
    <section className="panel measurement-picker"><h2>Available measurements</h2>
      <div className="measurement-options">{result.metrics.map(item => <button key={item.indicator} aria-pressed={selected === item.indicator}
        onClick={() => setSelected(item.indicator)}>
        <span>{item.name}<small>{item.last ? time(item.last.measuredAt) + ' UTC' : 'No reading'}</small></span>
        <span><strong>{item.last ? item.last.value : '—'}</strong> {item.last && <small>{item.unit}</small>}
          <small className={item.state === 'review' ? 'attention' : ''}>{metricStates[item.state]}</small></span>
      </button>)}</div>
    </section>
    <section className="panel measurement-detail" aria-live="polite">
      <div className="panel-heading"><h2>{metric.name}</h2><span className={metric.state === 'review' ? 'attention' : ''}>{metricStates[metric.state]}</span></div>
      <p className="measurement-value">{metric.last ? metric.last.value : '—'} <span>{metric.last ? metric.unit : 'No measurement'}</span></p>
      <p className="reading-context">{metric.last ? 'Collected ' + time(metric.last.measuredAt) + ' UTC · ' + metric.last.context.replaceAll('_', ' ') +
        ' · ' + (metric.last.source === 'manual' ? 'Manual entry' : 'Simulated device') :
        'A measurement is needed to show this trend.'}</p>
      <TrendChart run={run} indicator={selected} />
      <div className="next-step"><h3>{metric.state === 'review' ? 'Review this reading' : metric.state === 'stale' ? 'Keep the timing in mind' : 'Measurement context'}</h3>
        <p>{metric.reason}</p>
        <button onClick={() => onRecord(selected)}>Record {metric.name.toLowerCase()}</button>
      </div>
      <p className="help">Research sources and comparison details are included in the ground-review packet.</p>
    </section>
  </div>
}
