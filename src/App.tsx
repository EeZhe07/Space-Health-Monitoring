import { useEffect, useRef, useState, type FormEvent } from 'react'
import { assess, time, ruleVersion, type CrewEvent, type Run, type Scenario } from './core'
import { createRun, scenarioNames } from './scenarios'
import { listRuns, loadRun, saveRun, loadDemoSettings, saveDemoStart } from './storage'
import { buildGroundReport } from './report'
import { indicatorDefinitions, indicatorOf, simulatedPanel, type Indicator } from './indicators'
import { symptomGroups, commonSymptoms } from './symptoms'
import { lazy, Suspense } from 'react'
import MeasurementExplorer, { metricStates } from './MeasurementExplorer'
import Today from './Today'
import CrewBreak from './CrewWellbeing'
import DailyCheckIn from './DailyCheckIn'
import WellbeingHistory from './WellbeingHistory'
import { moodRatings, type DailyCheckIn as DailyEntry, type AttentionSession } from './wellbeing'
import { visibleMoods, type Mood } from './breakRound'
import DemoSetup from './DemoSetup'
import { defaultDemoSettings, type DemoSettings } from './demoSettings'
const GroundConnection = lazy(() => import('./GroundConnection'))

type View = 'Today' | 'Measurements' | 'Self-check' | 'Handoff' | 'History' | 'Crew break'
const views: View[] = ['Today', 'Measurements', 'Self-check', 'Handoff', 'History', 'Crew break']
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
export default function App() {
  const [run, setRun] = useState<Run | null>(null)
  const [view, setView] = useState<View>('Today')
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoSettings, setDemoSettings] = useState<DemoSettings>(defaultDemoSettings)
  const demoToggle = useRef<HTMLButtonElement>(null)
  const pendingSettings = useRef<DemoSettings | undefined>(undefined)
  const initialising = useRef(false)
  const [initialMetric, setInitialMetric] = useState<Indicator>('heart_rate')
  const heading = useRef<HTMLHeadingElement>(null)
  const previousView = useRef(view)
  useEffect(() => {
    if (previousView.current !== view) {
      previousView.current = view
      heading.current?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
    }
  }, [view])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [savedAt, setSavedAt] = useState('')
  const [archives, setArchives] = useState<Run[]>([])
  const [reset, setReset] = useState(false)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe' | 'unsure'>('unsure')
  const [onset, setOnset] = useState('uncertain')
  const [note, setNote] = useState('')
  const [notesOpen, setNotesOpen] = useState(false)
  const [dailyContext, setDailyContext] = useState('')
  const [reporter, setReporter] = useState('CM-2')
  const [actor, setActor] = useState('CM-1')
  const [handoffNote, setHandoffNote] = useState('')
  const [measurement, setMeasurement] = useState('')
  const [measurementKind, setMeasurementKind] = useState<Indicator | 'blood_pressure'>('heart_rate')
  const [diastolic, setDiastolic] = useState('')
  const [measurementOpen, setMeasurementOpen] = useState(false)
  const [context, setContext] = useState('unspecified')
  const [replaySeconds, setReplaySeconds] = useState<number | null>(null)
  const pending = useRef<Run | null>(null)
  const saving = useRef(false)

  async function initialise() {
    if (initialising.current) return
    initialising.current = true
    setError('')
    try {
      const preferences = await loadDemoSettings()
      const stored = await loadRun()
      const initial = preferences.resumeLastRun && stored ? stored : createRun(preferences.startupScenario)
      if (initial !== stored) await saveRun(initial)
      setDemoSettings(preferences)
      setRun(initial); setSavedAt('Saved on this device')
      setArchives(await listRuns())
    } catch {
      setError('Local storage could not be opened. Allow site storage, then retry.')
    } finally { initialising.current = false }
  }
  useEffect(() => { void initialise() }, [])
  useEffect(() => {
    setSelectedSymptoms([]); setSeverity('unsure'); setOnset('uncertain'); setNote(''); setReporter('CM-2'); setNotesOpen(false); setDailyContext('')
    setActor('CM-1'); setMeasurement(''); setContext('unspecified'); setReplaySeconds(null)
    setReset(false); setHandoffNote(''); setMeasurementKind('heart_rate'); setDiastolic(''); setMeasurementOpen(false)
  }, [run?.id])
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  async function commit(next: Run, retryInForm = false, preferences?: DemoSettings) {
    if (saving.current) return false
    saving.current = true; setBusy(true); setError(''); pending.current = retryInForm ? null : next
    pendingSettings.current = preferences
    try {
      if (preferences) await saveDemoStart(next, preferences)
      else await saveRun(next)
      setRun(next); pending.current = null; setSavedAt('Saved on this device')
      pendingSettings.current = undefined
      if (preferences) {
        setDemoSettings(preferences); setDemoOpen(false); setView('Today'); setInitialMetric('heart_rate')
        requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo(0, 0) })
      }
      setArchives(current => [next, ...current.filter(item => item.id !== next.id)])
      return true
    } catch {
      if (!retryInForm) setError('This action could not be saved. Your previous record is intact. Retry saving.')
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
  async function saveMood(mood: Mood) {
    if (!run) return false
    return commit({ ...run, moodCheckIns: [...(run.moodCheckIns ?? []), {
      id: crypto.randomUUID(), at: run.now, mood,
    }] }, true)
  }
  async function saveDaily(entry: DailyEntry) {
    if (!run) return false
    return commit({ ...run, dailyCheckIns: [...(run.dailyCheckIns ?? []), entry] }, true)
  }
  async function saveAttention(entry: AttentionSession) {
    if (!run) return false
    if (run.attentionSessions?.some(item => item.id === entry.id)) return true
    return commit({ ...run, attentionSessions: [...(run.attentionSessions ?? []), entry] }, true)
  }
  function followDaily(entry: DailyEntry) {
    const summary = 'Daily self-check: mood ' + entry.moodRating + '/5 (' + moodRatings[entry.moodRating - 1] +
      '); ' + (entry.discomfort ? 'discomfort reported.' : 'no uncomfortable feelings reported.')
    setDailyContext(summary + ' Select any symptoms or Another concern to explain how you feel. Your daily answers are not copied into the ground report.')
    setView('Self-check')
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
      setView('Handoff'); setNote(''); setSelectedSymptoms([]); setSeverity('unsure'); setOnset('uncertain'); setDailyContext(''); setNotesOpen(false)
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
          ' ' + definition.unit + ' · ' + (measurementKind === 'sleep_duration' ? 'previous sleep period' : context.replaceAll('_', ' ')) }] })) {
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
    view === 'Handoff' ? 'Onboard handoff' : view === 'Crew break' ? 'Crew break' : 'Episode history'
  const narrative = result.symptoms.length ? 'A crew member reported feeling unwell.' :
    result.assistanceRequested ? 'A crew member has requested assistance.' :
    result.sensor === 'disconnected' ? 'The wrist sensor has stopped updating.' : 'No symptoms have been reported.'
  const episodeTime = result.events.find(e => e.type === 'symptom_report' || e.type === 'assistance_requested')?.at
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
      onClick={() => { if (v === 'Measurements') setInitialMetric('heart_rate'); setView(v) }}>{v}{v === 'Handoff' && concern && !acknowledged ? ' · Pending' : ''}</button>)}</nav>
    <main>
      <div className="page-heading"><div><h1 ref={heading} tabIndex={-1}>{title}</h1><p>{view === 'Today' ? narrative :
        view === 'Measurements' ? 'Available readings, their times and what needs review.' :
        view === 'Self-check' ? 'Your report stays visible alongside device measurements.' :
        view === 'Handoff' ? 'Pass this tablet to an onboard teammate.' : view === 'Crew break' ? 'Take a short break or record how you feel. Both are optional.' : 'Measurements, crew reports and recorded actions.'}</p></div>
        <div className="clock"><strong>{time(run.now)} <small>UTC</small></strong><span>Simulated mission clock</span><span>{new Date(run.now).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</span></div>
      </div>
      {error && <div role="alert" className="error"><p>{error}</p>{pending.current &&
        <button disabled={busy} onClick={() => void commit(pending.current!, false, pendingSettings.current)}>Retry last action</button>}</div>}
      <div className="demo-notice"><span>Synthetic demonstration · {scenarioNames[run.scenario]}</span><div className="demo-status"><span role="status">{busy ? 'Saving…' : savedAt}</span>
        <button ref={demoToggle} aria-expanded={demoOpen} aria-controls="demo-setup" onClick={() => setDemoOpen(open => !open)}>Demo setup</button></div></div>
      {demoOpen && <DemoSetup currentScenario={run.scenario} settings={demoSettings} busy={busy}
        onClose={() => { setDemoOpen(false); demoToggle.current?.focus() }}
        onStart={preferences => { void commit(createRun(preferences.startupScenario), false, preferences) }} />}

      {view === 'Today' && <Today run={run} onReport={() => setView('Self-check')}
        dailyCheckIn={<DailyCheckIn key={run.id} run={run} busy={busy} onSave={saveDaily} onFollowUp={followDaily}/>}
        onHandoff={() => setView('Handoff')} onBreak={() => setView('Crew break')}
        onMeasurements={indicator => { setInitialMetric(indicator ?? 'heart_rate'); setView('Measurements') }} />}
      {view === 'Crew break' && <CrewBreak key={run.id} run={run} busy={busy} saveMood={saveMood} saveAttention={saveAttention}
        goBack={() => setView('Today')} onSelfCheck={() => setView('Self-check')} />}
      {view === 'Measurements' && <MeasurementExplorer run={run} initialMetric={initialMetric} onRecord={indicator => {
        setMeasurementKind(indicator.endsWith('_bp') ? 'blood_pressure' : indicator)
        setMeasurement(''); setDiastolic(''); setMeasurementOpen(true); setView('Self-check')
      }} />}

      {view === 'Self-check' && <div className="workspace">
        <section className="panel"><h2>Your report</h2><form onSubmit={submitSymptom}>
          {dailyContext && <p role="status" className="daily-context">{dailyContext}</p>}
          <fieldset><legend>What are you experiencing?</legend><p className="help">Select all that apply. You can request assistance at any time.</p>
            <div className="common-symptoms">{commonSymptoms.map(symptom => <label className="symptom-choice" key={symptom}>
              <input type="checkbox" checked={selectedSymptoms.includes(symptom)} onChange={e =>
                setSelectedSymptoms(current => e.target.checked ? [...current, symptom] : current.filter(value => value !== symptom))} />{symptom}
            </label>)}</div>
            <details className="more-symptoms"><summary>More symptoms</summary>
            <div className="symptom-groups">{symptomGroups.map(group => <div key={group.name}><h3>{group.name}</h3>
              {group.symptoms.filter(symptom => !commonSymptoms.includes(symptom)).map(symptom => <label className="symptom-choice" key={symptom}>
                <input type="checkbox" checked={selectedSymptoms.includes(symptom)} onChange={e =>
                  setSelectedSymptoms(current => e.target.checked ? [...current, symptom] : current.filter(value => value !== symptom))} />
                {symptom}
              </label>)}</div>)}</div>
            </details><p className="selection-count" role="status">{selectedSymptoms.length ? selectedSymptoms.length + ' symptom' + (selectedSymptoms.length === 1 ? '' : 's') + ' selected' : 'Choose the symptoms you want to report.'}</p>
          </fieldset>
          <label>How much is this affecting you?<select value={severity} onChange={e => setSeverity(e.target.value as typeof severity)}>
            <option value="unsure">Not sure</option><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
          </select></label>
          <details className="optional-details" open={notesOpen} onToggle={e => setNotesOpen(e.currentTarget.open)}><summary>Timing and notes <span className="optional">Optional</span></summary>
          <label>Who is reporting?<select value={reporter} onChange={e => setReporter(e.target.value)}><option value="CM-2">CM-2 · Reporting for myself</option><option value="CM-1">CM-1 · Reporting for CM-2</option></select></label>
          <fieldset><legend>When did it begin?</legend><div className="choices">{[
            ['now', 'Around now'], ['earlier', 'About 10 minutes ago'], ['uncertain', 'Not sure'],
          ].map(([value, label]) => <label key={value}><input type="radio" name="onset" value={value} checked={onset === value} onChange={() => setOnset(value)} />{label}</label>)}</div>
          <p className="help">Onset helps a teammate distinguish measurements taken before and after your symptoms.</p></fieldset>
          <label>Anything a teammate should know? <span className="optional">Optional</span><textarea maxLength={500} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Describe how you feel in your own words" /></label>
          </details>
          <div className="report-submit"><button className="primary" disabled={busy || !selectedSymptoms.length}>Save report and open handoff</button></div>
        </form></section>
        <section className="panel"><h2>Your current record</h2><p>{result.symptoms.length ? result.symptoms.map(s => s.symptom).join(', ') + ' · Reported' : 'No open symptoms reported.'}</p>
          <p className="help">Your words matter even when measurements are unavailable. You can submit a report without a new reading.</p>
          <details open={measurementOpen} onToggle={e => setMeasurementOpen(e.currentTarget.open)}><summary>Record an existing measurement</summary>
          <p className="help">Enter a reading from another device. This app does not take measurements.</p>
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
            {measurementKind !== 'sleep_duration' && <label>Measurement context<select value={context} onChange={e => setContext(e.target.value)}><option value="unspecified">Not sure</option><option value="post_exercise">After exercise</option><option value="rest">At rest</option><option value="exercise">During exercise</option></select></label>}
            <p className="help">Uses the current mission clock. Values entered in this demo are synthetic.</p><button disabled={busy}>Save measurement</button></form></details>
        </section>
      </div>}

      {view === 'Handoff' && <div className="workspace">
        <section className="panel"><div className="panel-heading"><h2>CM-2 · Episode summary</h2><span>{episodeTime ? 'Opened ' + time(episodeTime) + ' UTC' : 'No concern reported'}</span></div>
          {summary}
          {result.symptoms.map((s, index) => <div className="report" key={s.id}><h3>{s.symptom}</h3><p>Reported by {s.actor} at {time(s.at)} UTC.</p>
            {s.description && !result.symptoms.slice(0, index).some(previous => previous.description === s.description && previous.at === s.at) && <p>{s.description}</p>}
            <p>Onset {s.onset ? 'approximately ' + time(s.onset) + ' UTC' : 'uncertain'}.</p>
            {s.severity && <p>Reported impact: {s.severity}.</p>}
            <button disabled={busy} onClick={() => void append({ type: 'symptom_updated', relatedId: s.id, resolved: true,
              actor: reporter, description: s.symptom + ': crew reports symptom has resolved' })}>Record that this symptom has resolved</button>
          </div>)}
          <h3>What remains uncertain</h3><p>{result.available ? 'The cause of any reported symptom remains unassessed.' :
            'Current heart rate is unavailable. The cause of any reported symptom remains unassessed.'}</p>
          <details><summary>Other measurements</summary><div className="facts">{result.metrics.filter(metric => metric.indicator !== 'heart_rate').map(metric =>
            <div key={metric.indicator}><span>{metric.name}</span><strong>{metric.last ? metric.last.value + ' ' + metric.unit : 'Not measured'} · {metricStates[metric.state]}</strong></div>)}</div></details>
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
          <div className="guidance-text"><h3>Local record</h3><p>{savedAt}. Pass this tablet to a teammate. Use the ground connection below to archive a snapshot.</p>
            </div>
          <details><summary>Why this information is shown</summary><ul>{result.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><p>Rule version {ruleVersion}. Measurement validity window: 2 minutes, an illustrative demo setting.</p></details>
        </section>
      </div>}

      {view === 'History' && <>
        <WellbeingHistory run={run}/>
        {visibleMoods(run).length > 0 && <details className="panel mood-history"><summary>Mood check-ins · This tablet only ({visibleMoods(run).length})</summary>
          <p className="help">CM-2’s own words for this replay. Excluded from ground reports.</p>
          <ul>{visibleMoods(run).map(entry => <li key={entry.id}><time dateTime={entry.at}>{time(entry.at)} UTC</time> · {entry.mood}</li>)}</ul>
        </details>}
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
        <div className="panel-heading"><h2>Ground-review packet</h2><span>Current snapshot · Local preview</span></div>
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
        <Suspense fallback={<p role="status">Opening ground connection…</p>}><GroundConnection run={run} /></Suspense>
      </section>}

      <details className="demo-controls"><summary>Demo controls <span>Scenario {run.scenario} · Synthetic data</span></summary>
        <div className="controls-body">
          <label>Load a separate scenario<select disabled={busy} value={run.scenario} onChange={e => {
            void commit(createRun(e.target.value as Scenario)).then(ok => { if (ok) { setView('Today'); setNote(''); setMeasurement('') } })
          }}>{Object.entries(scenarioNames).map(([id, name]) => <option key={id} value={id}>{id} · {name}</option>)}</select></label>
          <label>Replay time · {time(run.now)} UTC<input aria-label="Replay time" type="range" min="0" max={Math.max(2700, (Date.parse(run.now) - Date.parse('2027-07-18T13:30:00Z')) / 1000)} step="5" disabled={busy}
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
            <button disabled={busy} onClick={() => void commit({ ...run, now: advance(run.now, 20 * 3600) })}>Advance 20 hours · Daily reminder</button>
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
