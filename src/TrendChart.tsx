import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { assess, time, type Run } from './core'
import { indicatorDefinitions, indicatorOf, type Indicator } from './indicators'

const chartDomains: Record<Indicator, [number, number]> = {
  heart_rate: [40, 180], spo2: [80, 100], respiratory_rate: [8, 32],
  systolic_bp: [70, 150], diastolic_bp: [40, 100], body_temperature: [35, 40], sleep_duration: [0, 10],
}
const recordTime = (iso: string) => new Date(iso).toISOString().replace('.000Z', 'Z').replace('T', ' · ').replace('Z', ' UTC')
const sourceNames: Record<string, string> = {
  simulated_device: 'Simulated wrist sensor', simulated_medical_monitor: 'Simulated medical monitor',
  simulated_actigraphy: 'Simulated actigraphy', manual: 'Manual entry',
}
export default function TrendChart({ run, indicator = 'heart_rate' }: { run: Run; indicator?: Indicator }) {
  const figure = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(600)
  const [selection, setSelection] = useState<{ scope: string; id: string } | null>(null)
  const instructionId = useId()
  const scope = run.id + ':' + indicator
  const definition = indicatorDefinitions[indicator]
  const assessment = assess(run)
  const observations = assessment.measurements.filter(record => indicatorOf(record) === indicator)
  const last = observations.at(-1)
  const selected = (selection?.scope === scope && observations.find(record => record.id === selection.id)) || last
  const selectedIndex = selected ? observations.indexOf(selected) : -1
  function select(index: number) {
    const record = observations[Math.max(0, Math.min(observations.length - 1, index))]
    if (record) setSelection({ scope, id: record.id })
  }
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
  function inspectPointer(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const plotX = (event.clientX - bounds.left) / bounds.width * width
    const plotY = (event.clientY - bounds.top) / bounds.height * 238
    // Allow edge-point taps and fractional coordinate rounding at responsive sizes.
    if (plotX < 37 || plotX > width - 12 || plotY < 26 || plotY > 200 || !observations.length) return
    // Select an actual observation; gaps never produce an interpolated reading.
    const nearest = observations.reduce((best, record, index) =>
      Math.abs(x(record.measuredAt) - plotX) < Math.abs(x(observations[best].measuredAt) - plotX) ? index : best, 0)
    select(nearest)
  }
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
      <svg viewBox={'0 0 ' + width + ' 238'} role="img" aria-label={definition.name + ' trend in ' + definition.unit + '. Time is UTC. Gaps and context changes are not connected.'}
        onPointerMove={event => { if (event.pointerType === 'mouse') inspectPointer(event) }} onPointerDown={inspectPointer}>
        {[0, 1, 2, 3].map(index => {
          const tick = low + (high - low) * index / 3
          return <g key={index}><line className="gridline" x1="45" y1={y(tick)} x2={width - 20} y2={y(tick)} />
            <text x="33" y={y(tick) + 4} textAnchor="end">{Number(tick.toFixed(indicator === 'body_temperature' ? 1 : 0))}</text></g>
        })}
        {markers.map(event => <line key={event.id} className="event-marker" x1={x(event.at)} x2={x(event.at)} y1="34" y2="192" />)}
        {segments.map((points, index) => <polyline key={index} className="data-line" points={points.join(' ')} />)}
        {selected && <line className="inspection-line" x1={x(selected.measuredAt)} x2={x(selected.measuredAt)} y1="34" y2="192" />}
        {observations.map(record => <circle key={record.id} className="data-point" cx={x(record.measuredAt)} cy={y(record.value)} r={record.id === last.id ? 4 : 2}>
          <title>{time(record.measuredAt)} UTC · {record.value} {definition.unit} · {record.context.replaceAll('_', ' ')}</title></circle>)}
        {selected && <circle className="selected-point" cx={x(selected.measuredAt)} cy={y(selected.value)} r="6" />}
        {[0, .5, 1].map(fraction => <text key={fraction} x={45 + fraction * (width - 65)} y="224" textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'}>
          {time(new Date(start + fraction * (end - start)).toISOString())}</text>)}
        <text x="6" y="18">{definition.unit}</text>
      </svg>}
    <figcaption>{observations.length} received {observations.length === 1 ? 'reading' : 'readings'} · UTC
      {observations.some(record => record.source === 'manual') ? ' · Includes manual entries' : ' · Simulated device'}</figcaption>
    {selected && <div className="chart-inspector" role="group" aria-label={definition.name + ' historical reading'}>
      <div className="history-controls">
        <button type="button" onClick={() => select(selectedIndex - 1)} disabled={selectedIndex === 0} aria-label="Previous reading">Previous</button>
        <span className="reading-position">Reading {selectedIndex + 1} of {observations.length}</span>
        <button type="button" onClick={() => select(selectedIndex + 1)} disabled={selectedIndex === observations.length - 1} aria-label="Next reading">Next</button>
      </div>
      <label className="history-scrubber"><span>Inspect history</span>
        <input type="range" aria-label={'Inspect ' + definition.name.toLowerCase() + ' history'} aria-describedby={instructionId}
          min="0" max={observations.length - 1} step="1" value={selectedIndex} disabled={observations.length === 1}
          aria-valuetext={selected.value + ' ' + definition.unit + ' at ' + recordTime(selected.measuredAt) + ', ' + selected.context.replaceAll('_', ' ')}
          onChange={event => select(Number(event.target.value))} />
      </label>
      <p id={instructionId} className="help inspection-help">{observations.length > 1 ? 'Hover or tap the plot, drag the slider, or use its arrow keys to inspect a recorded reading.' : 'One recorded reading is available.'}</p>
      <div className="reading-detail">
        <div className="reading-detail-heading"><h3>Historical reading</h3><span>{selected.synthetic ? 'Synthetic' : 'Recorded data'}</span></div>
        <p className="inspected-value"><strong>{selected.value} <small>{definition.unit}</small></strong><time dateTime={selected.measuredAt}>{recordTime(selected.measuredAt)}</time></p>
        <dl className="reading-metadata">
          <div><dt>Context</dt><dd>{selected.context.replaceAll('_', ' ')}</dd></div>
          <div><dt>Source</dt><dd>{sourceNames[selected.source] ?? selected.source.replaceAll('_', ' ')}</dd></div>
          <div><dt>Received</dt><dd><time dateTime={selected.receivedAt}>{recordTime(selected.receivedAt)}</time></dd></div>
          <div><dt>Recorded quality</dt><dd>{selected.quality}</dd></div>
          {selected.method && <div className="reading-method"><dt>Method</dt><dd>{selected.method}</dd></div>}
        </dl>
        <p className="help record-identifier">Record {selected.id}</p>
      </div>
    </div>}
    {markers.length > 0 && <ul className="chart-events">{markers.slice(-3).map(event =>
      <li key={event.id}><time>{time(event.at)}</time> {markerLabel(event.type)}</li>)}</ul>}
  </figure>
}
