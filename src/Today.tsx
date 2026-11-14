import { assess, time, type Run } from './core'
import { metricStates } from './MeasurementExplorer'
import TrendChart from './TrendChart'

export default function Today({ run, onReport, onHandoff, onMeasurements }: {
  run: Run; onReport: () => void; onHandoff: () => void; onMeasurements: () => void
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
    <section className="panel overview-panel">
      <div className="panel-heading"><h2>Latest measurements</h2><button onClick={onMeasurements}>
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
      <section className="panel next-actions"><h2>Next steps</h2>
        {concern ? <><p>{acknowledged ? 'Add follow-up observations in the handoff record.' : 'Let a teammate review the crew report and confirm taking over.'}</p>
          <button onClick={onHandoff}>Review handoff card</button></> :
          <><p>Report any new discomfort. Earlier measurements stay available for context.</p><button onClick={onReport}>Start self-check</button></>}
        <div className="next-step"><h3>{result.available ? 'Measurement available' : 'Current heart rate unknown'}</h3>
          <p>{result.available ? 'Keep measurement context in mind when reviewing the trend.' :
            result.last ? 'The previous reading is historical. A fresh measurement can add information.' :
            'No heart-rate measurement is available. You can still request assistance.'}</p>
          <button onClick={onMeasurements}>Review available measurements</button></div>
      </section>
    </div>
  </>
}
