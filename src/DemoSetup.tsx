import { useEffect, useId, useRef, useState } from 'react'
import { scenarioNames } from './scenarios'
import { defaultDemoSettings, scenarioDescriptions, type DemoSettings } from './demoSettings'
import type { Scenario } from './core'

export default function DemoSetup({ currentScenario, settings, busy, onStart, onClose }: {
  currentScenario: Scenario; settings: DemoSettings; busy: boolean
  onStart: (settings: DemoSettings) => void; onClose: () => void
}) {
  const [scenario, setScenario] = useState(currentScenario)
  const [resume, setResume] = useState(settings.resumeLastRun)
  const descriptionId = useId()
  const reloadHintId = useId()
  const setupId = useId()
  const reloadId = useId()
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => { title.current?.focus({ preventScroll: true }) }, [])
  return <section id="demo-setup" className="panel demo-setup" aria-labelledby="demo-title">
    <div className="panel-heading"><div><h2 ref={title} tabIndex={-1} id="demo-title">Demo setup</h2>
      <p>Start a fresh setup for your presentation. Previous runs stay in History.</p></div>
      <button type="button" onClick={onClose}>Close setup</button></div>
    <form onSubmit={e => { e.preventDefault(); onStart({ startupScenario: scenario, resumeLastRun: resume }) }}>
      <fieldset disabled={busy} className="setup-fields"><legend className="visually-hidden">Demo options</legend>
        <div><label htmlFor={setupId}>Choose a setup</label><select id={setupId} value={scenario} aria-describedby={descriptionId} onChange={e => setScenario(e.target.value as Scenario)}>
          {Object.entries(scenarioNames).map(([key, name]) => <option key={key} value={key}>{key === 'default' ? name : key + ' · ' + name}</option>)}
        </select><p className="help" id={descriptionId}>{scenarioDescriptions[scenario]}</p></div>
        <div><label htmlFor={reloadId}>When the app reloads</label><select id={reloadId} value={resume ? 'resume' : 'fresh'} aria-describedby={reloadHintId} onChange={e => setResume(e.target.value === 'resume')}>
          <option value="resume">Resume the last saved run</option>
          <option value="fresh">Start this setup fresh each time</option>
        </select><p className="help" id={reloadHintId}>Applies to this browser, including offline launches.</p></div>
        <div className="button-row"><button className="primary" type="submit">Start selected setup</button>
          <button type="button" onClick={() => onStart({ ...defaultDemoSettings })}>Restore app defaults</button></div>
      </fieldset>
    </form>
    <p className="help">Default app starts with routine readings and resumes on reload. Starting a setup saves your startup choices. Saved reports and the ground-archive sign-in are kept.</p>
  </section>
}
