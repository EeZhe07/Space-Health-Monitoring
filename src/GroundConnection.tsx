import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase, uploadPacket } from './cloud'
import { buildGroundReport } from './report'
import { listGroundPackets, saveGroundPacket, type GroundPacket } from './storage'
import { time, type Run } from './core'
import { metricStates } from './MeasurementExplorer'

type RemotePacket = { id: string; created_at: string; report: ReturnType<typeof buildGroundReport> }
export default function GroundConnection({ run }: { run: Run }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [local, setLocal] = useState<GroundPacket[]>([])
  const [remote, setRemote] = useState<RemotePacket[]>([])
  const working = useRef(false)
  const activeUser = useRef<string | null>(null)
  async function refresh(id: string) {
    const packets = await listGroundPackets()
    if (activeUser.current !== id) return
    setLocal(packets.filter(packet => packet.userId === id))
    if (navigator.onLine && supabase) {
      const result = await supabase.from('crew_health_packets').select('id, created_at, report')
        .order('created_at', { ascending: false }).limit(10)
      if (result.error) throw result.error
      if (activeUser.current !== id) return
      setRemote(result.data ?? [])
    }
  }
  function showError(error: unknown) {
    const detail = error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error)
    setMessage('Could not complete the cloud operation. ' + detail +
      (detail.includes('schema cache') || detail.includes('does not exist') ? ' Ask the project owner to run supabase/setup.sql.' : ''))
  }
  useEffect(() => {
    if (!supabase) return
    let disposed = false
    let authEventReceived = false
    void supabase.auth.getSession().then(({ data }) => {
      if (disposed || authEventReceived) return
      activeUser.current = data.session?.user.id ?? null
      setUserId(activeUser.current)
    }).catch(showError)
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true
      const nextUser = session?.user.id ?? null
      if (activeUser.current !== nextUser) { setRemote([]); setLocal([]); setMessage('') }
      activeUser.current = nextUser
      setUserId(nextUser)
    })
    return () => { disposed = true; activeUser.current = null; data.subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    if (!userId) return
    void listGroundPackets().then(packets => {
      if (activeUser.current !== userId) return
      setLocal(packets.filter(packet => packet.userId === userId))
      if (packets.some(packet => packet.userId === userId && packet.state === 'pending')) void syncQueued()
      else void refresh(userId).catch(error => { if (activeUser.current === userId) showError(error) })
    }).catch(error => { if (activeUser.current === userId) showError(error) })
  }, [userId])

  async function sendPending(id: string) {
    const packets = await listGroundPackets()
    for (const packet of packets.filter(item => item.userId === id && item.state === 'pending')) {
      if (activeUser.current !== id) return
      const receipt = await uploadPacket(packet, id)
      await saveGroundPacket({ ...packet, state: 'stored', serverStoredAt: receipt.created_at })
    }
    if (activeUser.current !== id) return
    await refresh(id)
    if (activeUser.current === id) setMessage('Stored on server. Medical review has not been confirmed.')
  }
  function releaseOperation(id: string) {
    working.current = false; setBusy(false)
    if (activeUser.current && activeUser.current !== id) void syncQueued(activeUser.current)
  }
  async function syncQueued(id = userId) {
    if (!id || activeUser.current !== id || working.current || !supabase) return
    working.current = true; setBusy(true); setMessage('')
    try {
      if (!navigator.onLine) { setMessage('Offline. Queued packets remain saved on this device.'); return }
      await sendPending(id)
    } catch (error) {
      if (activeUser.current === id) showError(error)
      const packets = await listGroundPackets()
      if (activeUser.current === id) setLocal(packets.filter(packet => packet.userId === id))
    } finally { releaseOperation(id) }
  }
  useEffect(() => {
    const reconnect = () => { void syncQueued() }
    window.addEventListener('online', reconnect)
    return () => window.removeEventListener('online', reconnect)
  }, [userId])

  async function signIn(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setMessage('')
    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      if (result.error) throw result.error
      setPassword('')
    } catch (error) { showError(error) } finally { if (!working.current) setBusy(false) }
  }
  async function queue() {
    if (!userId || working.current) return
    working.current = true; setBusy(true); setMessage('')
    try {
      const report = buildGroundReport(run)
      const packet: GroundPacket = {
        id: crypto.randomUUID(), runId: run.id, userId,
        report, state: 'pending',
      }
      await saveGroundPacket(packet)
      const packets = await listGroundPackets()
      if (activeUser.current === userId) {
        setLocal(packets.filter(item => item.userId === userId))
        setMessage('Snapshot saved on this device. Waiting for a connection.')
        if (navigator.onLine) await sendPending(userId)
      }
    } catch (error) { if (activeUser.current === userId) showError(error) } finally { releaseOperation(userId) }
  }

  return <details className="cloud-connection"><summary>Ground connection and queued packets</summary>
    <p className="help">An account-scoped Supabase archive for synthetic reports. Another device signed into the same account can retrieve stored packets. Crew acknowledgement and medical review remain separate.</p>
    {!supabase ? <p>Configure the project URL and publishable key to enable cloud storage.</p> :
      !userId ? <form onSubmit={signIn} className="cloud-form">
        <label>Supabase demo account email<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        <p className="help">The project owner must first run the SQL setup and create a confirmed demo user in Supabase Auth.</p>
        <button disabled={busy}>Sign in to ground archive</button>
      </form> : <>
        <div className="button-row"><button className="primary" disabled={busy} onClick={() => void queue()}>{busy ? 'Saving…' : 'Save and send snapshot'}</button>
          <button disabled={busy || !local.some(packet => packet.state === 'pending')} onClick={() => void syncQueued()}>Retry pending packets</button>
          <button disabled={busy} onClick={() => void refresh(userId).catch(showError)}>Refresh server archive</button>
          <button disabled={busy} onClick={() => { void supabase!.auth.signOut({ scope: 'local' }).then(({ error }) => { if (error) showError(error) }) }}>Sign out</button></div>
        <h3>On this device</h3>
        <p className="help">Snapshots save here first. Pending packets retry when this section is loaded or the connection returns.</p>
        {local.filter(packet => packet.runId === run.id).length ? <ul>{local.filter(packet => packet.runId === run.id).map(packet =>
          <li key={packet.id}>{time(packet.report.asOf)} UTC snapshot · {packet.state === 'stored' ? 'Stored on server' : 'Pending upload'} <small>({packet.id.slice(0, 8)})</small></li>)}</ul> : <p>No saved snapshots for this replay.</p>}
        <h3>Server archive</h3>
        {remote.length ? remote.map(packet => <details className="archived-packet" key={packet.id}><summary>Scenario {packet.report.scenario} · {time(packet.report.asOf)} UTC snapshot</summary>
          <div className="facts"><div><span>Crew report</span><strong>{packet.report.symptoms.map(symptom => symptom.symptom).join(', ') || 'No open symptoms'}</strong></div>
            <div><span>Onboard handoff</span><strong>{packet.report.handoff ? packet.report.handoff.actor + ' · ' + time(packet.report.handoff.at) + ' UTC' : 'Not acknowledged'}</strong></div>
            <div><span>Server receipt</span><strong>{new Date(packet.created_at).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</strong></div></div>
          <h3>Measurements in this snapshot</h3>
          {packet.report.assessment.indicators.filter(metric => metric.observation).map(metric => <p key={metric.indicator}>
            <strong>{metric.name}</strong> · {metric.observation!.value} {metric.unit} · {metricStates[metric.state]}<br />
            <small>{time(metric.observation!.measuredAt)} UTC · {metric.observation!.context.replaceAll('_', ' ')}</small></p>)}
          {packet.report.timeline.filter(event => event.type === 'handoff_note' || event.type === 'handoff_acknowledged').map(event =>
            <p className="report" key={event.id}><strong>{event.actor} · {time(event.at)} UTC</strong><br />{event.description || 'Reviewed the record and acknowledged handoff.'}</p>)}
          <p className="help">Synthetic report · Server storage confirms receipt. Medical review is unconfirmed.</p>
          <details><summary>Technical packet (JSON)</summary><pre className="packet-json">{JSON.stringify(packet.report, null, 2)}</pre></details>
        </details>) : <p>No server packets loaded.</p>}
      </>}
    {message && <p role="status" className="cloud-message">{message}</p>}
  </details>
}
