import { useState } from 'react'
import type { Run } from './core'
import { buildGroundReport } from './report'
import { saveGroundPacket } from './storage'
import { crewOf, localDemoUser, responsePackets } from './mission'
import { useGroundInbox, type InboxSource } from './useGroundInbox'

export default function CrewExchange({ run, recordBusy = false, initialSource = 'demo' }: { run: Run; recordBusy?: boolean; initialSource?: InboxSource }) {
  const [source, setSource] = useState<InboxSource>(initialSource)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const inbox = useGroundInbox(source, run.demoBatchId ?? 'legacy')
  const replies = responsePackets(inbox.packets).filter(p => p.report.crewId === crewOf(run) && p.runId === run.id)
  return <section className="crew-exchange"><h3>Ground exchange</h3>
    <p className="help">Local demo sharing stays in this browser. Use Save and send snapshot below for the authenticated cloud inbox.</p>
    <button disabled={busy || recordBusy} onClick={async () => {
      if (recordBusy) return
      setBusy(true); setMessage('')
      try {
        await saveGroundPacket({ id: crypto.randomUUID(), runId: run.id, userId: localDemoUser, state: 'demo',
          demoReceivedAt: new Date().toISOString(), report: buildGroundReport(run) })
        setMessage('Snapshot shared with the local demo ground inbox.'); await inbox.refresh()
      } catch { setMessage('The demo snapshot could not be saved. Try again.') } finally { setBusy(false) }
    }}>Share with demo ground</button>
    {message && <p role="status">{message}</p>}
    <label htmlFor="crew-ground-source">Ground responses from</label><select id="crew-ground-source" value={source} onChange={e => setSource(e.target.value as InboxSource)}>
      <option value="demo">Local demo inbox</option><option value="cloud">Cloud inbox · Same demo account</option></select>
    {source === 'cloud' && !inbox.userId && <p className="help">Sign in to the ground archive below to retrieve cloud responses.</p>}
    {inbox.error && <p role="alert">{inbox.error}</p>}
    {replies.length ? replies.map(packet => <article className="report ground-response" key={packet.id}>
      <strong>{packet.report.response!.action === 'reviewed' ? 'Ground confirmed viewing this snapshot' : 'Ground requests an update'}</strong>
      <p>{packet.report.response!.message}</p><small>{packet.report.response!.reviewer} · {new Date(packet.report.response!.at).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC · Report {packet.report.response!.packetId.slice(0, 8)}</small>
    </article>) : <p className="help">No received ground responses for this member’s current replay.</p>}
  </section>
}
