import { useEffect, useRef, useState } from 'react'
import { assess, time, type Run } from './core'
import { indicatorDefinitions, indicatorOf, type Indicator } from './indicators'

const chartDomains: Record<Indicator, [number, number]> = {
  heart_rate: [40, 180], spo2: [80, 100], respiratory_rate: [8, 32],
  systolic_bp: [70, 150], diastolic_bp: [40, 100], body_temperature: [35, 40], sleep_duration: [0, 10],
}
export default function TrendChart({ run, indicator = 'heart_rate' }: { run: Run; indicator?: Indicator }) {
  const figure = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(600)
  const definition = indicatorDefinitions[indicator]
  const assessment = assess(run)
  const observations = assessment.measurements.filter(record => indicatorOf(record) === indicator)
  const last = observations.at(-1)
  useEffect(() => {
    if (!figure.current) return
    const observer = new ResizeObserver(entries => setWidth(Math.max(260, entries[0].contentRect.width)))
    observer.observe(figure.current)
    return () => observer.disconnect()
  }, [])
  const end = Date.parse(run.now)
  const start = Math.min(end - 60000, observations[0] ? Date.parse(observations[0].measuredAt) : end - 60000)
  const domain = chartDomains[indicator]
  const low = Math.min(domain[0], ...observations.map(record => record.value))
  const high = Math.max(domain[1], ...observations.map(record => record.value))
  const x = (date: string) => 45 + (Date.parse(date) - start) / (end - start) * (width - 65)
  const y = (value: number) => 192 - (value - low) / (high - low) * 150
  const segments: string[][] = [[]]
  observations.forEach((record, index) => {
    const previous = observations[index - 1]
    if (previous && (Date.parse(record.measuredAt) - Date.parse(previous.measuredAt) >
      definition.freshnessMinutes * 60000 || previous.context !== record.context || previous.source !== record.source)) segments.push([])
    segments.at(-1)!.push(x(record.measuredAt) + ',' + y(record.value))
  })
  const markers = assessment.events.filter(event => ['symptom_report', 'sensor_disconnected', 'handoff_acknowledged'].includes(event.type) &&
    Date.parse(event.at) >= start).filter((event, index, all) => all.findIndex(item => item.at === event.at && item.type === event.type) === index)
  const markerLabel = (type: string) => type === 'symptom_report' ? 'Crew report' : type === 'sensor_disconnected' ? 'Sensor lost' : 'Handoff'
  return <figure className="chart trend-chart" ref={figure}>
    {!last ? <div className="empty-chart"><strong>No readings yet</strong><span>A recorded measurement will appear here.</span></div> :
      <svg viewBox={'0 0 ' + width + ' 238'} role="img" aria-label={definition.name + ' trend in ' + definition.unit + '. Time is UTC. Gaps and context changes are not connected.'}>
        {[0, 1, 2, 3].map(index => {
          const tick = low + (high - low) * index / 3
          return <g key={index}><line className="gridline" x1="45" y1={y(tick)} x2={width - 20} y2={y(tick)} />
            <text x="33" y={y(tick) + 4} textAnchor="end">{Number(tick.toFixed(indicator === 'body_temperature' ? 1 : 0))}</text></g>
        })}
        {markers.map(event => <line key={event.id} className="event-marker" x1={x(event.at)} x2={x(event.at)} y1="34" y2="192" />)}
        {segments.map((points, index) => <polyline key={index} className="data-line" points={points.join(' ')} />)}
        {observations.map(record => <circle key={record.id} className="data-point" cx={x(record.measuredAt)} cy={y(record.value)} r={record.id === last.id ? 4 : 2}>
          <title>{time(record.measuredAt)} UTC · {record.value} {definition.unit} · {record.context.replaceAll('_', ' ')}</title></circle>)}
        {[0, .5, 1].map(fraction => <text key={fraction} x={45 + fraction * (width - 65)} y="224" textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'}>
          {time(new Date(start + fraction * (end - start)).toISOString())}</text>)}
        <text x="6" y="18">{definition.unit}</text>
      </svg>}
    <figcaption>{observations.length} received {observations.length === 1 ? 'reading' : 'readings'} · UTC
      {observations.some(record => record.source === 'manual') ? ' · Includes manual entries' : ' · Simulated device'}</figcaption>
    {markers.length > 0 && <ul className="chart-events">{markers.slice(-3).map(event =>
      <li key={event.id}><time>{time(event.at)}</time> {markerLabel(event.type)}</li>)}</ul>}
  </figure>
}
