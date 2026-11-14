import { useEffect, useRef, useState, type FormEvent } from 'react'
import { assess, time, ruleVersion, type CrewEvent, type Run, type Scenario } from './core'
import { createRun, scenarioNames } from './scenarios'
import { listRuns, loadRun, saveRun } from './storage'
import { buildGroundReport } from './report'
import { indicatorDefinitions, indicatorOf, simulatedPanel, type Indicator } from './indicators'
import { symptomGroups } from './symptoms'
import GroundConnection from './GroundConnection'

type View = 'Today' | 'Measurements' | 'Self-check' | 'Handoff' | 'History'
const views: View[] = ['Today', 'Measurements', 'Self-check', 'Handoff', 'History']
const metricStates = {
  missing: 'Not measured', stale: 'Needs updating', context_needed: 'Context differs',
  within_reference: 'Within reference', review: 'Review reading', recorded: 'Recorded',
}
const eventNames: Record<CrewEvent['type'], string> = {
  sensor_disconnected: 'Wrist sensor disconnected', sensor_connected: 'Wrist sensor reconnected',
  symptom_report: 'Symptom reported', symptom_updated: 'Symptom updated',
  assistance_requested: 'Assistance requested', handoff_acknowledged: 'Teammate took over',
  measurement_recorded: 'Manual measurement recorded',
  handoff_note: 'Teammate report updated',
}
function advance(iso: string, seconds = 5) {
  return new Date(Date.parse(iso) + seconds * 1000).toISOString()
}
function Chart({ run }: { run: Run }) {
  const result = assess(run)
  const figure = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    if (!figure.current) return
    const observer = new ResizeObserver(entries => setWidth(Math.max(280, entries[0].contentRect.width)))
    observer.observe(figure.current)
    return () => observer.disconnect()
  }, [])
  const start = Date.parse('2027-07-18T13:30:00Z')
  const end = Math.max(Date.parse(run.now), start + 60000)
  const plotWidth = width - 64
  const minimum = Math.min(40, ...result.observations.map(o => Math.floor(o.value / 20) * 20))
  const maximum = Math.max(180, ...result.observations.map(o => Math.ceil(o.value / 20) * 20))
  const x = (iso: string) => 44 + ((Date.parse(iso) - start) / (end - start)) * plotWidth
  const y = (value: number) => 184 - ((value - minimum) / (maximum - minimum)) * 150
  const segments: string[][] = [[]]
  result.observations.forEach((o, i, all) => {
    if (i && Date.parse(o.measuredAt) - Date.parse(all[i - 1].measuredAt) > 120000) segments.push([])
    segments.at(-1)!.push(x(o.measuredAt) + ',' + y(o.value))
  })
  return <figure className="chart" ref={figure}>
    {!result.observations.length ? <div className="empty-chart">No reliable readings received</div> :
    <svg viewBox={'0 0 ' + width + ' 230'} role="img" aria-label="Recorded heart rate over mission time in UTC. Gaps indicate unavailable measurements.">
      {[0, 1, 2, 3].map(i => Math.round((minimum + (maximum - minimum) * i / 3) / 20) * 20).map(tick => <g key={tick}>
        <line x1="44" y1={y(tick)} x2={width - 20} y2={y(tick)} className="gridline" />
        <text x="30" y={y(tick) + 4} textAnchor="end">{tick}</text>
      </g>)}
      {segments.map((points, i) => <polyline key={i} points={points.join(' ')} className="data-line" />)}
      {result.last && <circle cx={x(result.last.measuredAt)} cy={y(result.last.value)} r="4" className="data-point" />}
      {[0, 0.5, 1].map(f => <text key={f} x={44 + f * plotWidth} y="216" textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}>
        {time(new Date(start + f * (end - start)).toISOString())}
      </text>)}
      <text x="5" y="18">bpm</text>
    </svg>}
    <figcaption>Mission time (UTC) · {result.observations.length} received readings · {
      result.observations.some(o => o.source === 'manual') ? 'Includes manual entries' : 'Simulated device'}</figcaption>
  </figure>
}

export default function App() {
  const [run, setRun] = useState<Run | null>(null)
  const [view, setView] = useState<View>('Today')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [savedAt, setSavedAt] = useState('')
  const [archives, setArchives] = useState<Run[]>([])
  const [reset, setReset] = useState(false)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe' | 'unsure'>('unsure')
  const [onset, setOnset] = useState('now')
  const [note, setNote] = useState('')
  const [reporter, setReporter] = useState('CM-2')
  const [actor, setActor] = useState('CM-1')
  const [handoffNote, setHandoffNote] = useState('')
  const [measurement, setMeasurement] = useState('')
  const [measurementKind, setMeasurementKind] = useState<Indicator | 'blood_pressure'>('heart_rate')
  const [diastolic, setDiastolic] = useState('')
  const [context, setContext] = useState('post_exercise')
  const [replaySeconds, setReplaySeconds] = useState<number | null>(null)
  const pending = useRef<Run | null>(null)
  const saving = useRef(false)

  async function initialise() {
    setError('')
    try {
      const stored = await loadRun()
      const initial = stored ?? createRun('C')
      if (!stored) await saveRun(initial)
      setRun(initial); setSavedAt('Saved on this device')
      setArchives(await listRuns())
    } catch {
      setError('Local storage could not be opened. Allow site storage, then retry.')
    }
  }
  useEffect(() => { void initialise() }, [])
  useEffect(() => {
    setSelectedSymptoms([]); setSeverity('unsure'); setOnset('now'); setNote(''); setReporter('CM-2')
    setActor('CM-1'); setMeasurement(''); setContext('post_exercise'); setReplaySeconds(null)
    setReset(false); setHandoffNote(''); setMeasurementKind('heart_rate'); setDiastolic('')
  }, [run?.id])
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  async function commit(next: Run) {
    if (saving.current) return false
    saving.current = true; setBusy(true); setError(''); pending.current = next
    try {
      await saveRun(next)
      setRun(next); pending.current = null; setSavedAt('Saved on this device')
      setArchives(await listRuns())
      return true
    } catch {
      setError('This action could not be saved. Your previous record is intact. Retry saving.')
      return false
    } finally { saving.current = false; setBusy(false) }
  }
  async function append(event: Omit<CrewEvent, 'id' | 'at'>) {
    if (!run) return false
    const now = advance(run.now)
    return commit({ ...run, now, events: [...run.events, { ...event, id: crypto.randomUUID(), at: now }] })
  }
  async function requestAssistance() {
    if (!run) return
    setView('Handoff')
    const current = assess(run)
    if (!current.assistanceRequested || current.handoff === 'acknowledged') {
      await append({ type: 'assistance_requested', actor: reporter })
    }
  }
  async function submitSymptom(e: FormEvent) {
    e.preventDefault()
    if (!run) return
    if (!selectedSymptoms.length) {
      setError('Select at least one symptom, or use Request assistance.'); return
    }
    const began = onset === 'uncertain' ? undefined : onset === 'earlier' ?
      new Date(Date.parse(run.now) - 600000).toISOString() : run.now
    const now = advance(run.now)
    const reports: CrewEvent[] = selectedSymptoms.map(symptom => ({
      type: 'symptom_report', id: crypto.randomUUID(), at: now, actor: reporter, symptom,
      severity, onset: began, certainty: onset === 'uncertain' ? 'uncertain' : 'approximate',
      description: note.trim() || symptom + ' reported',
    }))
    if (await commit({ ...run, now, events: [...run.events, ...reports] })) {
      setView('Handoff'); setNote('')
    }
  }
  async function recordMeasurement(e: FormEvent) {
    e.preventDefault()
    if (!run || measurement.trim() === '') return
    const definition = indicatorDefinitions[measurementKind === 'blood_pressure' ? 'systolic_bp' : measurementKind]
    const value = Number(measurement)
    if (!Number.isFinite(value) || value < definition.minimum || value > definition.maximum) {
      setError('The value is outside the supported input limits. Check the number and unit.'); return
    }
    if (measurementKind === 'blood_pressure' && (diastolic.trim() === '' || !Number.isFinite(Number(diastolic)) ||
      Number(diastolic) < 0 || Number(diastolic) > 250 || Number(diastolic) >= value)) {
      setError('Enter both pressures in mmHg, with systolic greater than diastolic.'); return
    }
    const now = advance(run.now)
    const groupId = crypto.randomUUID()
    const values: [Indicator, number][] = measurementKind === 'blood_pressure' ?
      [['systolic_bp', value], ['diastolic_bp', Number(diastolic)]] : [[measurementKind, value]]
    const observations = values.map(([indicator, number]) => ({
      id: crypto.randomUUID(), indicator, groupId, value: number, unit: indicatorDefinitions[indicator].unit,
      measuredAt: now, receivedAt: now, context: indicator === 'sleep_duration' ? 'previous_sleep_period' : context,
      source: 'manual', quality: 'ok', synthetic: true,
    }))
    if (await commit({ ...run, now, observations: [...run.observations, ...observations],
      events: [...run.events, { id: crypto.randomUUID(), at: now, type: 'measurement_recorded',
        actor: reporter, description: (measurementKind === 'blood_pressure' ? value + '/' + diastolic : value) +
          ' ' + definition.unit + ' · ' + context.replaceAll('_', ' ') }] })) {
      setMeasurement(''); setDiastolic('')
    }
  }
  function exportRun() {
    if (!run) return
    const blob = new Blob([JSON.stringify(buildGroundReport(run), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'crew-health-' + run.scenario + '-' + run.id.slice(0, 8) + '.json'
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  if (!run) return <main className="loading"><h1>Crew Health</h1><p role="status">{error || 'Opening the local record…'}</p>
    {error && <button onClick={() => void initialise()}>Retry local storage</button>}</main>
  const result = assess(run)
  const groundReport = buildGroundReport(run)
  const concern = result.symptoms.length > 0 || result.assistanceRequested
  const acknowledged = result.handoff === 'acknowledged'
  const title = view === 'Today' ? 'Crew status' : view === 'Measurements' ? 'Measurements' : view === 'Self-check' ? 'Report how you feel' :
    view === 'Handoff' ? 'Onboard handoff' : 'Episode history'
  const narrative = result.symptoms.length ? 'A crew member reported feeling unwell.' :
    result.assistanceRequested ? 'A crew member has requested assistance.' :
    result.sensor === 'disconnected' ? 'The wrist sensor has stopped updating.' : 'No symptoms have been reported.'
  const episodeTime = result.events.find(e => e.type === 'symptom_report' || e.type === 'assistance_requested')?.at
  const reviewCount = result.metrics.filter(metric => metric.state === 'review').length
  const summary = <div className="facts">
    <div><span>Reported symptoms</span><strong>{result.symptoms.length ? result.symptoms.map(s => s.symptom).join(', ') : 'None reported'}</strong></div>
    <div><span>Current heart rate</span><strong>{result.available ? result.last!.value + ' bpm' : 'Unknown'}</strong></div>
    <div><span>Last reliable reading</span><strong>{result.last ? result.last.value + ' bpm at ' + time(result.last.measuredAt) : 'No measurement'}</strong></div>
    <div><span>Measurement context</span><strong>{result.last?.context.replaceAll('_', ' ') ?? 'Unavailable'}</strong></div>
    <div><span>Onboard handoff</span><strong>{acknowledged ? result.acknowledgement!.actor + ' acknowledged at ' + time(result.acknowledgement!.at) :
      concern ? 'Awaiting a teammate' : 'Available if needed'}</strong></div>
  </div>
  return <div className="app">
    <header className="topbar">
      <a className="brand" href="#today" onClick={() => setView('Today')}>Crew Health<span>CM-2 · Mission day 140</span></a>
      <div className="connection"><span className={'dot ' + (online ? 'connected' : '')} />{online ? 'Device online' : 'Device offline'}<small>Local record</small></div>
      <button className="assistance" onClick={() => void requestAssistance()} disabled={busy}>Request assistance</button>
    </header>
    <nav aria-label="Main navigation">{views.map(v => <button key={v} aria-current={view === v ? 'page' : undefined}
      onClick={() => setView(v)}>{v}{v === 'Handoff' && concern && !acknowledged ? ' · Pending' : ''}</button>)}</nav>
    <main>
      <div className="page-heading"><div><h1>{title}</h1><p>{view === 'Today' ? narrative :
        view === 'Measurements' ? 'Available readings, their times and what needs review.' :
        view === 'Self-check' ? 'Your report stays visible alongside device measurements.' :
        view === 'Handoff' ? 'Pass this tablet to an onboard teammate.' : 'Measurements, crew reports and recorded actions.'}</p></div>
        <div className="clock"><strong>{time(run.now)} <small>UTC</small></strong><span>Simulated mission clock</span></div>
      </div>
      {error && <div role="alert" className="error"><p>{error}</p>{pending.current &&
        <button disabled={busy} onClick={() => void commit(pending.current!)}>Retry last action</button>}</div>}
      <div className="demo-notice">Synthetic demonstration · {scenarioNames[run.scenario]}<span>{busy ? 'Saving…' : savedAt}</span></div>

      {view === 'Today' && <>
        <div className="status-strip">
          <div><span>Current heart rate</span><strong>{result.available ? result.last!.value : 'Unknown'}{result.available && <small> bpm</small>}</strong></div>
          <div><span>Wrist sensor</span><strong>{result.sensor.replaceAll('_', ' ')}</strong></div>
          <div><span>Crew report</span><strong>{result.symptoms.length ? 'Open concern' : 'None reported'}</strong></div>
          <button className="primary" onClick={() => setView('Self-check')}>Report a symptom</button>
        </div>
        <div className="workspace">
          <section className="panel"><div className="panel-heading"><h2>Heart-rate record</h2><span>Exercise and recovery</span></div>
            <Chart run={run} /><div className="chart-note">{result.last ? 'Last reliable reading: ' + result.last.value + ' bpm at ' +
              time(result.last.measuredAt) + ' UTC · ' + result.last.context.replaceAll('_', ' ') : 'No measurement has been received in this scenario.'}</div>
          </section>
          <section className="panel"><h2>What needs attention</h2>
            <p className={concern ? 'attention' : ''}>{narrative}</p>
            {result.symptoms.map(s => <div className="report" key={s.id}><strong>{s.description}</strong>
              <p>Reported {time(s.at)} UTC by {s.actor}. Onset {s.onset ? 'about ' + time(s.onset) + ' UTC' : 'uncertain'}.</p></div>)}
            <p>{result.available ? 'A recent reading is available. No configured health diagnosis is produced.' :
              result.last ? 'Current heart rate is unknown. Earlier measurements remain available for context.' :
              'No heart-rate measurement is available. You can still report a concern or request assistance.'}</p>
            <button onClick={() => setView(concern ? 'Handoff' : 'Self-check')}>{concern ? 'Open handoff' : 'Start self-check'}</button>
          </section>
        </div>
        <section className="panel guidance"><h2>Before the next step</h2><p>{concern ?
          'An onboard teammate can review your report now. A new reading can add information; it does not close your concern.' :
          'Report how you feel whenever you need to. Assistance remains available even when no measurements are present.'}</p>
          <div className="button-row"><button onClick={() => setView('Handoff')}>Review handoff card</button><button onClick={() => setView('History')}>View timeline</button></div>
          <p className="measurement-link"><button onClick={() => setView('Measurements')}>View all measurements{reviewCount ? ' · ' + reviewCount + ' to review' : ''}</button></p>
        </section>
      </>}

      {view === 'Measurements' && <section className="panel">
        <div className="panel-heading"><h2>Available measurements</h2><button onClick={() => setView('Self-check')}>Record a measurement</button></div>
        <p className="help">Values are synthetic. Reference comparisons use a general-adult illustration; detailed sources and limitations accompany the ground-review packet.</p>
        <div className="measurement-list">{result.metrics.map(metric => <div className="measurement-row" key={metric.indicator}>
          <div><strong>{metric.name}</strong><span>{metric.last ? time(metric.last.measuredAt) + ' UTC · ' +
            metric.last.context.replaceAll('_', ' ') : 'Awaiting a measurement'}</span></div>
          <strong>{metric.last ? metric.last.value + ' ' + metric.unit : '—'}</strong>
          <div><strong className={metric.state === 'review' ? 'attention' : ''}>{metricStates[metric.state]}</strong><span>{metric.reason}</span></div>
        </div>)}</div>
        <div className="button-row"><button onClick={() => setView('Self-check')}>Report a symptom</button><button onClick={() => setView('Handoff')}>Review handoff</button></div>
      </section>}

      {view === 'Self-check' && <div className="workspace">
        <section className="panel"><h2>Your report</h2><form onSubmit={submitSymptom}>
          <label>Who is reporting?<select value={reporter} onChange={e => setReporter(e.target.value)}><option value="CM-2">CM-2 · Reporting for myself</option><option value="CM-1">CM-1 · Reporting for CM-2</option></select></label>
          <fieldset><legend>What are you experiencing?</legend><p className="help">Select all that apply. You can request assistance at any time.</p>
            <div className="symptom-groups">{symptomGroups.map(group => <div key={group.name}><h3>{group.name}</h3>
              {group.symptoms.map(symptom => <label className="symptom-choice" key={symptom}>
                <input type="checkbox" checked={selectedSymptoms.includes(symptom)} onChange={e =>
                  setSelectedSymptoms(current => e.target.checked ? [...current, symptom] : current.filter(value => value !== symptom))} />
                {symptom}
              </label>)}</div>)}</div>
          </fieldset>
          <label>How much is this affecting you?<select value={severity} onChange={e => setSeverity(e.target.value as typeof severity)}>
            <option value="unsure">Not sure</option><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
          </select></label>
          <fieldset><legend>When did it begin?</legend><div className="choices">{[
            ['now', 'Around now'], ['earlier', 'About 10 minutes ago'], ['uncertain', 'Not sure'],
          ].map(([value, label]) => <label key={value}><input type="radio" name="onset" value={value} checked={onset === value} onChange={() => setOnset(value)} />{label}</label>)}</div>
          <p className="help">Onset helps a teammate distinguish measurements taken before and after your symptoms.</p></fieldset>
          <label>Anything a teammate should know? <span className="optional">Optional</span><textarea maxLength={500} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Describe how you feel in your own words" /></label>
          <button className="primary" disabled={busy}>Save report and open handoff</button>
        </form></section>
        <section className="panel"><h2>Measurements available</h2>{summary}<div className="guidance-text"><h3>Why collect a fresh reading?</h3><p>A measurement from exercise describes that moment. Record the time and context of any new measurement so a teammate can interpret it.</p><p className="help">Request assistance whenever needed. You can continue without adding a measurement.</p></div>
          <form onSubmit={recordMeasurement}>
            <label>Measurement type<select value={measurementKind} onChange={e => {
              setMeasurementKind(e.target.value as typeof measurementKind); setMeasurement(''); setDiastolic('')
            }}>
              {Object.entries(indicatorDefinitions).filter(([key]) => !key.endsWith('_bp')).map(([key, definition]) =>
                <option key={key} value={key}>{definition.name} ({definition.unit})</option>)}
              <option value="blood_pressure">Blood pressure (mmHg)</option>
            </select></label>
            <label>{measurementKind === 'heart_rate' ? 'Record a heart rate already measured (bpm)' :
              measurementKind === 'blood_pressure' ? 'Systolic pressure (mmHg)' :
              'Value (' + indicatorDefinitions[measurementKind].unit + ')'}
              <input type="number" step="any" value={measurement} onChange={e => setMeasurement(e.target.value)} required /></label>
            {measurementKind === 'blood_pressure' && <label>Diastolic pressure (mmHg)<input type="number" step="1" value={diastolic} onChange={e => setDiastolic(e.target.value)} required /></label>}
            <label>Measurement context<select value={context} onChange={e => setContext(e.target.value)}><option value="post_exercise">After exercise</option><option value="rest">At rest</option><option value="exercise">During exercise</option></select></label>
            <p className="help">Uses the current mission clock. Values entered in this demo are synthetic.</p><button disabled={busy}>Save measurement</button></form>
        </section>
      </div>}

      {view === 'Handoff' && <div className="workspace">
        <section className="panel"><div className="panel-heading"><h2>CM-2 · Episode summary</h2><span>{episodeTime ? 'Opened ' + time(episodeTime) + ' UTC' : 'No concern reported'}</span></div>
          {summary}
          {result.symptoms.map(s => <div className="report" key={s.id}><h3>{s.description}</h3><p>Reported by {s.actor} at {time(s.at)} UTC.</p>
            <p>Onset {s.onset ? 'approximately ' + time(s.onset) + ' UTC' : 'uncertain'}.</p>
            {s.severity && <p>Reported impact: {s.severity}.</p>}
            <button disabled={busy} onClick={() => void append({ type: 'symptom_updated', relatedId: s.id, resolved: true,
              actor: reporter, description: s.symptom + ': crew reports symptom has resolved' })}>Record that this symptom has resolved</button>
          </div>)}
          <h3>What remains uncertain</h3><p>{result.available ? 'The cause of any reported symptom remains unassessed.' :
            'Current heart rate is unavailable. The cause of any reported symptom remains unassessed.'}</p>
          <h3>Other measurements</h3><div className="facts">{result.metrics.filter(metric => metric.indicator !== 'heart_rate').map(metric =>
            <div key={metric.indicator}><span>{metric.name}</span><strong>{metric.last ? metric.last.value + ' ' + metric.unit : 'Not measured'} · {metricStates[metric.state]}</strong></div>)}</div>
        </section>
        <section className="panel"><h2>{acknowledged ? 'Handoff acknowledged' : 'Teammate taking over'}</h2>
          {acknowledged ? <><p className="acknowledged">{result.acknowledgement!.actor} acknowledged at {time(result.acknowledgement!.at)} UTC.</p><p>The symptom report remains in this episode until explicitly updated.</p>
            <form onSubmit={e => { e.preventDefault(); if (handoffNote.trim()) {
              void append({ type: 'handoff_note', actor: result.acknowledgement!.actor,
                description: handoffNote.trim() }).then(ok => { if (ok) setHandoffNote('') })
            } }}>
              <label>Update for ground review<textarea rows={3} maxLength={1000} value={handoffNote} onChange={e => setHandoffNote(e.target.value)} required /></label>
              <button disabled={busy}>Save teammate update</button>
            </form></> :
            <><p>Confirm on this tablet when you have reviewed the record and are taking over.</p><label>Your crew identifier<select value={actor} onChange={e => setActor(e.target.value)}><option>CM-1</option><option>CM-3</option><option>CM-4</option></select></label>
              <label>Handoff findings <span className="optional">Optional</span><textarea rows={3} maxLength={1000} value={handoffNote} onChange={e => setHandoffNote(e.target.value)} placeholder="What you observed and what you have done" /></label>
              <button className="primary" disabled={busy || !concern} onClick={() => void append({ type: 'handoff_acknowledged', actor,
                description: handoffNote.trim() || undefined }).then(ok => { if (ok) setHandoffNote('') })}>Acknowledge handoff</button>
              {!concern && <p className="help">Use Request assistance to open a handoff without reporting symptoms.</p>}</>}
          <div className="guidance-text"><h3>Local record</h3><p>{savedAt}. Sharing currently means passing this tablet. Cloud synchronization has not been connected.</p>
            </div>
          <details><summary>Why this information is shown</summary><ul>{result.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><p>Rule version {ruleVersion}. Measurement validity window: 2 minutes, an illustrative demo setting.</p></details>
        </section>
      </div>}

      {view === 'History' && <>
        <div className="workspace">
          <section className="panel"><div className="panel-heading"><h2>Event timeline</h2><span>UTC · Current replay</span></div>
            {result.events.length ? <ol className="timeline">{result.events.map(event => <li key={event.id}>
              <time>{time(event.at)}</time><div><strong>{eventNames[event.type]}</strong>
                <p>{event.description || (event.actor ? 'Recorded by ' + event.actor : 'Simulated wrist sensor')}</p>
                {event.onset && <p>Reported onset about {time(event.onset)} UTC</p>}
              </div></li>)}</ol> : <p>No crew or device events have occurred at this replay time.</p>}
          </section>
          <section className="panel"><h2>Saved replays</h2><p className="help">Each replay keeps its own actions. Opening one restores its mission clock.</p><ul className="saved-runs">
            {archives.map(archive => <li key={archive.id}><div><strong>Scenario {archive.scenario} · {scenarioNames[archive.scenario]}</strong><span>{time(archive.now)} UTC · {archive.id.slice(0, 8)}</span></div>
              <button disabled={busy || archive.id === run.id} onClick={() => void commit(archive)}>{archive.id === run.id ? 'Current' : 'Open'}</button></li>)}
          </ul></section>
        </div>
        <section className="panel"><h2>Received measurements</h2><div className="table-scroll"><table><thead><tr><th>Measured (UTC)</th><th>Received (UTC)</th><th>Value</th><th>Indicator</th><th>Context</th><th>Source</th></tr></thead>
          <tbody>{[...result.measurements].reverse().slice(0, 15).map(o => <tr key={o.id}><td>{time(o.measuredAt)}</td><td>{time(o.receivedAt)}</td><td>{o.value} {o.unit}</td><td>{indicatorDefinitions[indicatorOf(o)].name}</td><td>{o.context.replaceAll('_', ' ')}</td><td>{o.source === 'manual' ? 'Manual reading' : o.source.replaceAll('_', ' ')}</td></tr>)}</tbody></table></div>
          {!result.measurements.length && <p>No reliable measurements received.</p>}<p className="help">Showing up to 15 most recent reliable readings.</p></section>
      </>}

      {(view === 'Handoff' || view === 'History') && <section className="panel ground-report">
        <div className="panel-heading"><h2>Ground-review packet</h2><span>Local preview · Not transmitted</span></div>
        <p>Combines the crew report, available measurements, missing information and the teammate's handoff record for review on the ground.</p>
        <div className="facts">
          <div><span>Record as of</span><strong>{time(groundReport.asOf)} UTC</strong></div>
          <div><span>Teammate acknowledgement</span><strong>{groundReport.handoff ? groundReport.handoff.actor + ' · ' + time(groundReport.handoff.at) + ' UTC' : 'Pending'}</strong></div>
        </div>
        {groundReport.timeline.filter(e => e.type === 'handoff_acknowledged' || e.type === 'handoff_note').map(e =>
          <div className="report" key={e.id}><strong>{e.actor} · {time(e.at)} UTC</strong><p>{e.description || 'Reviewed the record and acknowledged handoff.'}</p></div>)}
        <details><summary>Supporting references for ground review</summary>
          <p className="help">Background and workflow references are included with this packet. Source links require connectivity.</p>
          <div className="source-list">{groundReport.references.map(source => <div key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer">{source.organisation} · {source.title}</a><p>{source.use}</p>
          </div>)}</div>
          <h3>Indicator comparisons used in this packet</h3>
          {groundReport.assessment.indicators.filter(metric => metric.observation).map(metric =>
            <div className="report" key={metric.indicator}><strong>{metric.name} · {metricStates[metric.state]}</strong>
              <p>{metric.reason}</p>
              <p>{metric.referenceRange ? 'Reference ' + metric.referenceRange.lower + '–' + metric.referenceRange.upper + ' ' + metric.unit + '. ' : ''}{metric.referenceProfile}</p>
              <p className="help">Freshness window: {metric.freshnessMinutes} minutes. {metric.freshnessBasis}</p>
            </div>)}
        </details>
        <button onClick={exportRun}>Export ground-review packet (JSON)</button>
        <GroundConnection run={run} />
      </section>}

      <details className="demo-controls"><summary>Demo controls <span>Scenario {run.scenario} · Synthetic data</span></summary>
        <div className="controls-body">
          <label>Load a separate scenario<select disabled={busy} value={run.scenario} onChange={e => {
            void commit(createRun(e.target.value as Scenario)).then(ok => { if (ok) { setView('Today'); setNote(''); setMeasurement('') } })
          }}>{Object.entries(scenarioNames).map(([id, name]) => <option key={id} value={id}>{id} · {name}</option>)}</select></label>
          <label>Replay time · {time(run.now)} UTC<input aria-label="Replay time" type="range" min="0" max="2700" step="5" disabled={busy}
            value={replaySeconds ?? (Date.parse(run.now) - Date.parse('2027-07-18T13:30:00Z')) / 1000}
            onChange={e => setReplaySeconds(Number(e.target.value))}
            onPointerUp={e => { void commit({ ...run, now: new Date(Date.parse('2027-07-18T13:30:00Z') + Number(e.currentTarget.value) * 1000).toISOString() }).then(() => setReplaySeconds(null)) }}
            onKeyUp={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
              void commit({ ...run, now: new Date(Date.parse('2027-07-18T13:30:00Z') + Number(e.currentTarget.value) * 1000).toISOString() }).then(() => setReplaySeconds(null))
            } }}
            onBlur={e => { if (replaySeconds !== null) {
              void commit({ ...run, now: new Date(Date.parse('2027-07-18T13:30:00Z') + Number(e.currentTarget.value) * 1000).toISOString() }).then(() => setReplaySeconds(null))
            } }} /></label>
          <div className="button-row"><button disabled={busy} onClick={() => void append({ type: result.sensor === 'disconnected' ? 'sensor_connected' : 'sensor_disconnected' })}>
            {result.sensor === 'disconnected' ? 'Reconnect sensor' : 'Disconnect sensor'}</button>
            <button disabled={busy} onClick={() => void commit({ ...run, now: advance(run.now, 60) })}>Advance 1 minute</button>
            <button onClick={() => setReset(true)}>Start a fresh replay</button>
            <button disabled={busy} onClick={() => {
              const now = advance(run.now)
              void commit({ ...run, now, observations: [...run.observations, ...simulatedPanel(now, true)] }).then(ok => { if (ok) setView('Measurements') })
            }}>Simulate multi-indicator changes</button>
          </div>
          {reset && <div className="reset-confirm"><p>Start a fresh Scenario {run.scenario}? The existing replay stays saved in History.</p>
            <button disabled={busy} onClick={() => void commit(createRun(run.scenario)).then(ok => { if (ok) { setReset(false); setView('Today') } })}>Start fresh</button>
            <button onClick={() => setReset(false)}>Cancel</button></div>}
          <p className="help">Sensor controls change connection state only. Add a fresh manual measurement in Self-check to update the reading. The mission date is fictional: 18 July 2027.</p>
        </div>
      </details>
      <footer><span>Crew Health · Shared-tablet prototype</span><span>{ruleVersion} · Synthetic data</span></footer>
    </main>
  </div>
}
