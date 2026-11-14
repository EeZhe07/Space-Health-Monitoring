import { useEffect, useRef, useState } from 'react'
import type { Run } from './core'
import { analyseAttention, attentionLabels, attentionProtocol, type AttentionSession, type TaskInput, visibleAttention } from './wellbeing'

type Phase = 'intro' | 'wait' | 'signal' | 'feedback' | 'finished' | 'stopped'
export default function SignalWatch({ run, onSave, onSelfCheck }: {
  run: Run; onSave: (session: AttentionSession) => Promise<boolean>; onSelfCheck: () => void
}) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [input, setInput] = useState<TaskInput>(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse')
  const [practice, setPractice] = useState(true)
  const [responses, setResponses] = useState<(number | null)[]>([])
  const [early, setEarly] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [result, setResult] = useState<AttentionSession | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const origin = useRef({ id: '', at: run.now })
  const responseArea = useRef<HTMLButtonElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const signalAt = useRef<number | null>(null)
  const responded = useRef(false)
  const attemptedSave = useRef('')
  const saving = useRef(false)
  const total = practice ? 3 : 12
  const active = ['wait', 'signal', 'feedback'].includes(phase)
  function begin(isPractice: boolean) {
    origin.current = { id: crypto.randomUUID(), at: run.now }
    setPractice(isPractice); setResponses([]); setEarly(0); setResult(null); setSaveState('idle')
    signalAt.current = null; responded.current = false; setPhase('wait')
    requestAnimationFrame(() => responseArea.current?.focus({ preventScroll: true }))
  }
  function finishTrial(value: number | null) {
    if (responded.current) return
    responded.current = true
    setResponses(current => [...current, value])
    setFeedback(value === null ? 'Signal missed. The next one will follow.' : 'Response recorded.')
    setPhase('feedback')
  }
  function respond(mode: TaskInput) {
    if (!active || phase === 'feedback') return
    if (mode !== input) { setPhase('stopped'); setFeedback('Input mode changed. This round was not saved. Choose your control before starting again.'); return }
    if (phase === 'wait') {
      setEarly(count => count + 1); setFeedback('Early input. Wait until SIGNAL appears.'); setPhase('feedback')
    } else if (signalAt.current !== null) {
      finishTrial(Math.max(1, Math.round(performance.now() - signalAt.current)))
    }
  }
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined, frame: number | undefined
    if (phase === 'wait') {
      signalAt.current = null; responded.current = false
      timer = setTimeout(() => setPhase('signal'), 1200 + Math.random() * 1600)
    } else if (phase === 'signal') {
      frame = requestAnimationFrame(() => {
        signalAt.current = performance.now()
        timer = setTimeout(() => finishTrial(null), 2000)
      })
    } else if (phase === 'feedback') {
      timer = setTimeout(() => setPhase(responses.length === total ? 'finished' : 'wait'), 650)
    } else if (phase === 'finished' && !practice) {
      setResult(current => current ?? { ...origin.current, protocol: attentionProtocol, input,
        recordedAt: new Date().toISOString(), responses, earlyInputs: early })
    }
    return () => { clearTimeout(timer); if (frame !== undefined) cancelAnimationFrame(frame) }
  }, [phase, practice, total, responses.length])
  useEffect(() => {
    if (!active) return
    const stop = () => { if (document.hidden) { setPhase('stopped'); setFeedback('The page was hidden. This round was not saved.') } }
    document.addEventListener('visibilitychange', stop)
    return () => document.removeEventListener('visibilitychange', stop)
  }, [active])
  useEffect(() => {
    if (active && origin.current.at !== run.now) {
      setPhase('stopped'); setFeedback('The mission clock changed. This round was not saved.')
    }
  }, [run.now, active])
  async function persist(session: AttentionSession) {
    if (saving.current) return
    saving.current = true; setSaveState('saving')
    try { setSaveState(await onSave(session) ? 'saved' : 'failed') } catch { setSaveState('failed') }
    finally { saving.current = false }
  }
  useEffect(() => {
    if (result && attemptedSave.current !== result.id) {
      attemptedSave.current = result.id; void persist(result)
    }
  }, [result])
  useEffect(() => {
    if (phase === 'finished' && (practice || result)) resultHeading.current?.focus({ preventScroll: true })
  }, [phase, practice, result])
  const analysis = result ? analyseAttention(result, visibleAttention(run)) : null
  return <section className="panel signal-watch"><div className="panel-heading"><h2>Signal Watch</h2><span>Exploratory attention task</span></div>
    <p>Wait for <strong>SIGNAL</strong>, then respond once. Follow 12 signals to record a short round.</p>
    <p className="help">For CM-2. A saved round includes response times, missed signals and early inputs on this shared tablet. Ground reports exclude these records.</p>
    {(phase === 'intro' || phase === 'stopped') && <>
      <label htmlFor="signal-input">Response control</label><select id="signal-input" value={input} onChange={e => setInput(e.target.value as TaskInput)}>
        <option value="mouse">Mouse click</option><option value="touch">Touch screen</option><option value="keyboard">Space or Enter key</option>
      </select>
      <div className="signal-preview" aria-hidden="true"><span>WAIT</span><svg viewBox="0 0 80 60"><circle cx="40" cy="30" r="20"/><path d="M40 4v12m0 28v12M14 30h12m28 0h12"/></svg><strong>SIGNAL</strong></div>
      {phase === 'stopped' && <p role="status">{feedback}</p>}
      <div className="button-row"><button onClick={() => begin(true)}>Practice · 3 signals</button><button className="primary" onClick={() => begin(false)}>Start recorded round</button></div>
      <p className="help">Use the same device and control for comparisons. Completed recorded rounds save automatically. You can end a round at any time.</p>
    </>}
    {active && <><div className="signal-progress"><strong>{practice ? 'Practice' : 'Recorded round'} · {responses.length} of {total} signals</strong></div>
      <button ref={responseArea} type="button" className={'signal-response is-' + phase} aria-label="Signal Watch response area"
        onBlur={() => { if (active) { setPhase('stopped'); setFeedback('The response area lost focus. This interrupted round was not saved.') } }}
        onPointerDown={e => respond(e.pointerType === 'mouse' ? 'mouse' : 'touch')}
        onKeyDown={e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); if (!e.repeat) respond('keyboard') } }}
        onClick={e => { if (e.detail === 0) respond('keyboard') }}>
        <svg aria-hidden="true" viewBox="0 0 80 60"><circle cx="40" cy="30" r="20"/><path d="M40 4v12m0 28v12M14 30h12m28 0h12"/></svg>
        <strong>{phase === 'signal' ? 'SIGNAL' : phase === 'feedback' ? 'NEXT SIGNAL' : 'WAIT'}</strong>
        <span>{phase === 'signal' ? input === 'keyboard' ? 'Press Space or Enter now' : 'Respond now' : 'Respond only when SIGNAL appears'}</span>
      </button><p className="signal-feedback" role="status">{phase === 'feedback' ? feedback : 'Keep the response area in view.'}</p>
      <button onClick={() => { setPhase('stopped'); setFeedback('Round ended. No task result was saved.') }}>End round</button></>}
    {phase === 'finished' && practice && <div className="signal-result"><h3 ref={resultHeading} tabIndex={-1}>Practice complete</h3><p>Practice responses are not saved or compared.</p>
      <div className="button-row"><button onClick={() => begin(true)}>Practice again</button><button className="primary" onClick={() => begin(false)}>Start recorded round</button></div></div>}
    {phase === 'finished' && analysis && result && <div className="signal-result">
      <h3 ref={resultHeading} tabIndex={-1}>{attentionLabels[analysis.state]}</h3>
      <div className="signal-stats"><div><strong>{analysis.medianMs === null ? '—' : analysis.medianMs + ' ms'}</strong><span>Median response</span></div>
        <div><strong>{analysis.misses}</strong><span>Missed signals</span></div><div><strong>{result.earlyInputs}</strong><span>Early inputs</span></div></div>
      <ul>{analysis.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
      <p>Comparison: {analysis.baselineCount} earlier rounds · {result.input}{analysis.baselineMs !== null ? ' · Median ' + analysis.baselineMs + ' ms' : ''}.</p>
      <p className="help">This short prototype cannot diagnose mental health or establish fitness for duty. Fatigue, distraction, practice and device timing can affect performance.</p>
      <p role="status">{saveState === 'saved' ? 'Round saved on this tablet.' : saveState === 'failed' ? 'Round not saved. Retry to keep this result.' : 'Saving completed round…'}</p>
      <div className="button-row">{saveState === 'failed' && <button onClick={() => void persist(result)}>Retry saving round</button>}
        <button onClick={onSelfCheck}>Report how I feel</button><button disabled={saveState !== 'saved'} onClick={() => setPhase('intro')}>New round</button></div>
    </div>}
    <details><summary>How to read the result</summary><p>NASA’s Reaction Self Test combines vigilance performance and subjective reports. This 12-signal browser task is an unvalidated prototype, not the validated three-minute PVT.</p>
      <p>After three earlier comparable rounds, this demo flags a median response more than 25% AND 75 ms slower, two extra missed signals, or three extra early inputs. These are illustrative product rules, not NASA medical limits. At least eight usable responses are required. A similar result cannot rule out a concern.</p>
      <a href="https://techport.nasa.gov/projects/23201" target="_blank" rel="noreferrer">NASA Reaction Self Test project</a><br/>
      <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC8919197/" target="_blank" rel="noreferrer">ISS sleep and neurobehavioral performance study</a>
    </details>
  </section>
}
