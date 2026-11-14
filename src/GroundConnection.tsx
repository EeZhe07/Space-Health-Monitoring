import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase, uploadPacket } from './cloud'
import { buildGroundReport } from './report'
import { listGroundPackets, saveGroundPacket, type GroundPacket } from './storage'
import type { Run } from './core'

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
    if (userId) void refresh(userId).catch(showError)
  }, [userId])

  async function syncQueued() {
    if (!userId || working.current || !supabase) return
    working.current = true; setBusy(true); setMessage('')
    try {
      if (!navigator.onLine) { setMessage('Offline. Queued packets remain saved on this device.'); return }
      const packets = await listGroundPackets()
      for (const packet of packets.filter(item => item.userId === userId && item.state === 'pending')) {
        const receipt = await uploadPacket(packet, userId)
        await saveGroundPacket({ ...packet, state: 'stored', serverStoredAt: receipt.created_at })
      }
      await refresh(userId)
      setMessage('Queue checked. Server storage confirms receipt by Supabase; medical review is still unconfirmed.')
    } catch (error) {
      showError(error)
      const packets = await listGroundPackets()
      if (activeUser.current === userId) setLocal(packets.filter(packet => packet.userId === userId))
    } finally { working.current = false; setBusy(false) }
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
    } catch (error) { showError(error) } finally { setBusy(false) }
  }
  async function queue() {
    if (!userId) return
    setBusy(true)
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
        setMessage('Snapshot queued on this device. Use Sync queued packets to upload it.')
      }
    } catch (error) { showError(error) } finally { setBusy(false) }
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
        <div className="button-row"><button disabled={busy} onClick={() => void queue()}>Queue this snapshot</button>
          <button disabled={busy} onClick={() => void syncQueued()}>Sync queued packets</button>
          <button disabled={busy} onClick={() => void refresh(userId).catch(showError)}>Refresh server archive</button>
          <button disabled={busy} onClick={() => { void supabase!.auth.signOut({ scope: 'local' }).then(({ error }) => { if (error) showError(error) }) }}>Sign out</button></div>
        <h3>On this device</h3>
        {local.length ? <ul>{local.filter(packet => packet.runId === run.id).map(packet =>
          <li key={packet.id}>{packet.id.slice(0, 8)} · {packet.state === 'stored' ? 'Stored on server at ' + packet.serverStoredAt : 'Queued locally'}</li>)}</ul> : <p>No locally queued packets for this account.</p>}
        <h3>Server archive</h3>
        {remote.length ? remote.map(packet => <details key={packet.id}><summary>Day {packet.report.missionDay} · Scenario {packet.report.scenario} · {packet.created_at}</summary>
          <p>{packet.report.symptoms.map(symptom => symptom.symptom).join(', ') || 'No symptoms reported'}</p>
          <p>{packet.report.handoff ? 'Teammate: ' + packet.report.handoff.actor : 'Handoff not acknowledged in this snapshot'}</p>
          <pre className="packet-json">{JSON.stringify(packet.report, null, 2)}</pre>
        </details>) : <p>No server packets loaded.</p>}
      </>}
    {message && <p role="status" className="cloud-message">{message}</p>}
  </details>
}
