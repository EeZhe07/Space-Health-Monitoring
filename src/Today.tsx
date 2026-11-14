import { assess, time, type Run } from './core'
import { metricStates } from './MeasurementExplorer'
import TrendChart from './TrendChart'
import type { Indicator } from './indicators'
import type { ReactNode } from 'react'

export default function Today({ run, onReport, onHandoff, onMeasurements, onBreak, dailyCheckIn }: {
  run: Run; onReport: () => void; onHandoff: () => void; onMeasurements: (indicator?: Indicator) => void; onBreak: () => void
  dailyCheckIn?: ReactNode
}) {
  const result = assess(run)
  const concern = result.symptoms.length > 0 || result.assistanceRequested
  const acknowledged = result.handoff === 'acknowledged'
  const reviewCount = result.metrics.filter(metric => metric.state === 'review').length
  const otherMetrics = result.metrics.filter(metric => metric.indicator !== 'diastolic_bp')
  return <>
    <section className={'panel episode-banner ' + (concern ? 'has-concern' : '')}>
      <div><h2>{acknowledged ? result.acknowledgement!.actor + ' has taken over' :
        concern ? 'A teammate is needed' : 'No crew concerns reported'}</h2>
        <p>{result.symptoms.length ? result.symptoms.map(symptom => symptom.symptom).join(', ') + ' reported. ' :
          result.assistanceRequested ? 'Assistance was requested. ' : 'You can report a change whenever you need to. '}
          {acknowledged ? 'The crew report remains available for follow-up.' :
            concern ? 'Pass this tablet to an onboard teammate.' : 'Your received measurements are below.'}</p>
        <div className="button-row"><button className="primary" onClick={concern ? onHandoff : onReport}>{concern ? 'Open handoff' : 'Report a symptom'}</button>
          {concern && <button onClick={onReport}>Add a symptom</button>}</div>
      </div>
      <div className="episode-state"><span>Onboard handoff</span><strong>{acknowledged ? 'Acknowledged' : concern ? 'Awaiting a teammate' : 'Available if needed'}</strong>
        <small>{acknowledged ? result.acknowledgement!.actor + ' · ' + time(result.acknowledgement!.at) + ' UTC' : 'CM-2 · Shared tablet'}</small>
      </div>
    </section>
    {dailyCheckIn}
    <section className="panel overview-panel">
      <div className="panel-heading"><h2>Latest measurements</h2><button onClick={() => onMeasurements(result.metrics.find(m => m.state === 'review')?.indicator)}>
        {reviewCount ? reviewCount + ' readings to review' : 'View measurements'}</button></div>
      <div className="overview-readings status-strip">{otherMetrics.map(metric => {
        const lower = result.metrics.find(item => item.indicator === 'diastolic_bp')!
        const isPressure = metric.indicator === 'systolic_bp'
        const pairMatches = metric.last && lower.last && metric.last.groupId && metric.last.groupId === lower.last.groupId
        const displayState = isPressure && pairMatches ?
          metric.state === 'stale' || lower.state === 'stale' ? 'stale' :
            metric.state === 'review' || lower.state === 'review' ? 'review' :
              metric.state === 'context_needed' || lower.state === 'context_needed' ? 'context_needed' : metric.state : metric.state
        return <div key={metric.indicator}>
          <span>{isPressure ? 'Blood pressure' : metric.name}</span>
          <strong>{metric.state === 'stale' || (isPressure && lower.state === 'stale') ? 'Unknown' : isPressure ? pairMatches ? metric.last!.value + '/' + lower.last!.value : '—' :
            metric.state === 'missing' ? '—' : metric.last!.value}
            {metric.last && metric.state !== 'stale' && (!isPressure || (pairMatches && lower.state !== 'stale')) && <small> {metric.unit}</small>}
          </strong>
          <span className={displayState === 'review' ? 'attention' : ''}>{isPressure && metric.last && !pairMatches ? 'Paired reading unavailable' : metricStates[displayState]}</span>
          {metric.last && <small>Last recorded {time(metric.last.measuredAt)} UTC</small>}
        </div>
      })}</div>
    </section>
    <div className="workspace overview-bottom">
      <section className="panel"><div className="panel-heading"><h2>Heart-rate record</h2><span>Wrist sensor · {result.sensor.replaceAll('_', ' ')}</span></div>
        <TrendChart run={run} />
        <div className="chart-note">{result.last ? 'Last reliable reading: ' + result.last.value + ' bpm at ' +
          time(result.last.measuredAt) + ' UTC · ' + result.last.context.replaceAll('_', ' ') : 'No measurement has been received in this scenario.'}</div>
      </section>
      <section className="panel next-actions"><h2>Optional attention check</h2>
        <p>Try Signal Watch to record reaction performance, or log your mood directly.</p>
        <button onClick={onBreak}>Open crew break</button>
      </section>
    </div>
  </>
}
