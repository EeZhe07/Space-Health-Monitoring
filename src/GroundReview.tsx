import { useEffect, useRef, useState } from 'react'
import { analysePacket, isCrewPacket, localDemoUser, missionId, receivedAt, responsePackets, roster, selectLatest } from './mission'
import { useGroundInbox, type InboxSource } from './useGroundInbox'
import { saveGroundPacket, type GroundPacket } from './storage'
import { supabase, uploadPacket } from './cloud'
import { metricStates } from './MeasurementExplorer'
import { indicatorDefinitions, type Indicator } from './indicators'
import { attentionLabels, moodRatings } from './wellbeing'
import TrendChart from './TrendChart'

const stamp = (iso: string) => new Date(iso).toISOString().replace('T', ' ').replace('Z', ' UTC')
function wellbeingText(packet?: GroundPacket) {
  if (!packet) return 'Unknown'
  const summary = packet.report.wellbeing
  if (!summary) return 'Not shared'
  const parts: string[] = []
  if (summary.daily) parts.push('Self-report ' + summary.daily.moodRating + '/5' + (summary.daily.discomfort ? ' · Discomfort' : ''))
  if (summary.mood) parts.push('Mood: ' + summary.mood.mood)
  if (summary.attention) parts.push(attentionLabels[summary.attention.state])
  return parts.join('; ') || 'No wellbeing records in this shared summary'
}
export default function GroundReview({ onCrew }: { onCrew: () => void }) {
  const [source, setSource] = useState<InboxSource>('demo')
  const [batch, setBatch] = useState<string | null>(null)
  const inbox = useGroundInbox(source, batch)
  const [selectedCrew, setSelectedCrew] = useState('CM-2')
  const [snapshotId, setSnapshotId] = useState('')
  const [indicator, setIndicator] = useState<Indicator>('heart_rate')
  const [now, setNow] = useState(Date.now)
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [note, setNote] = useState(''), [reviewer, setReviewer] = useState('Ground demo operator')
  const [message, setMessage] = useState(''), [working, setWorking] = useState(false)
  const saving = useRef(false)
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => { title.current?.focus(); const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer) }, [])
  useEffect(() => { setSnapshotId(''); setNote(''); setMessage(''); setPassword('') }, [inbox.scope])
  const packets = inbox.packets.filter(p => (p.report.missionId ?? missionId) === missionId)
  const snapshots = packets.filter(p => isCrewPacket(p) && p.report.crewId === selectedCrew)
    .sort((a, b) => Date.parse(b.report.asOf) - Date.parse(a.report.asOf) || Date.parse(receivedAt(b)) - Date.parse(receivedAt(a)))
  const selected = snapshots.find(p => p.id === snapshotId) ?? snapshots[0]
  const clock = packets.length ? new Date(Math.max(...packets.map(p => Date.parse(p.report.asOf)))).toISOString() : '2027-07-18T14:10:10Z'
  const rows = roster.map(id => {
    const packet = selectLatest(packets, id)
    return { id, packet, assessment: packet ? analysePacket(packet, clock, now) : null }
  })
  const analysis = selected ? analysePacket(selected, clock, now) : null
  const replies = selected ? responsePackets(packets, selected.id) : []
  async function sendResponse(action: 'reviewed' | 'request_update') {
    if (!selected || saving.current || !reviewer.trim()) return
    if (source === 'cloud' && !inbox.userId) { setMessage('Sign in before sending a cloud response.'); return }
    const scope = inbox.scope
    saving.current = true; setWorking(true); setMessage('')
    try {
      const packet: GroundPacket = { id: crypto.randomUUID(), runId: selected.runId,
        userId: source === 'demo' ? localDemoUser : inbox.userId!, state: source === 'demo' ? 'demo' : 'pending',
        ...(source === 'demo' ? { demoReceivedAt: new Date().toISOString() } : {}),
        report: { ...selected.report, kind: 'ground_response', preparedAt: new Date().toISOString(),
          response: { packetId: selected.id, action, message: note.trim() || 'Viewed this snapshot.',
            reviewer: reviewer.trim(), at: new Date().toISOString() } } }
      await saveGroundPacket(packet)
      if (!inbox.isActive(scope)) return
      if (source === 'cloud' && navigator.onLine) {
        const receipt = await uploadPacket(packet, inbox.userId!)
        await saveGroundPacket({ ...packet, state: 'stored', serverStoredAt: receipt.created_at })
      }
      if (inbox.isActive(scope)) { setNote(''); setMessage(source === 'demo' ? 'Response delivered to the local crew demo.' :
        navigator.onLine ? 'Response stored in the cloud inbox.' : 'Response queued on this device. Retry pending deliveries when connected.') }
      await inbox.refresh()
    } catch {
      if (inbox.isActive(scope)) setMessage('Response could not be delivered. A saved cloud response remains queued; use Retry pending deliveries.')
    } finally { saving.current = false; setWorking(false) }
  }
  function exportSummary() {
    const lines = ['CREW HEALTH — DEMO GROUND SUMMARY', 'Generated: ' + new Date().toISOString(),
      'Source: ' + (source === 'demo' ? 'Local demo inbox' : 'Same-account cloud inbox'),
      'Observations and prototype comparison rules do not establish clinical fitness.', '',
      ...rows.flatMap(row => !row.packet ? [row.id + ': No received report in this inbox.', ''] : [
        row.id + ' — report ' + row.packet.id, 'Snapshot: ' + stamp(row.packet.report.asOf),
        'Received: ' + stamp(receivedAt(row.packet)), 'Crew symptoms: ' + (row.assessment!.symptoms.map(s => s.symptom).join(', ') || 'None reported'),
        'Handoff: ' + row.assessment!.handoff, ...row.assessment!.metrics.map(m => m.name + ': ' + (m.last ? m.last.value + ' ' + m.unit + ', measured ' + stamp(m.last.measuredAt) : 'Not measured') + ' — ' + metricStates[m.state]),
        'Wellbeing: ' + (row.packet.report.wellbeing ? 'Explicitly shared summary' : 'Not shared'),
        ...(row.packet.report.wellbeing?.daily ? ['Self-reported mood: ' + row.packet.report.wellbeing.daily.moodRating + '/5; discomfort: ' + row.packet.report.wellbeing.daily.discomfort] : []),
        ...(row.packet.report.wellbeing?.attention ? ['Exploratory task: ' + attentionLabels[row.packet.report.wellbeing.attention.state], ...row.packet.report.wellbeing.attention.reasons] : []),
        ...responsePackets(packets, row.packet.id).map(p => 'Ground ' + p.report.response!.action + ': ' + p.report.response!.message), '',
      ])]
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'crew-summary.txt'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <div className="ground-app"><header className="topbar"><div className="brand">Crew Health<span>Earth Control Centre · Demo</span></div>
    <button onClick={onCrew}>Crew tablet</button></header><main>
    <div className="page-heading"><div><h1 ref={title} tabIndex={-1}>Ground Review</h1><p>Whole-crew reports, evidence and follow-up. Received snapshots are not a live feed.</p></div></div>
    <section className="panel ground-toolbar"><label htmlFor="ground-source">Inbox source</label><select id="ground-source" value={source} disabled={working} onChange={e => { setSource(e.target.value as InboxSource); setBatch(null) }}>
      <option value="demo">Local demo inbox · This browser</option><option value="cloud">Cloud inbox · Same demo account</option></select>
      {inbox.batches.length > 0 && <><label htmlFor="ground-batch">Demo session</label><select id="ground-batch" value={batch ?? 'active'} disabled={working} onChange={e => setBatch(e.target.value === 'active' ? null : e.target.value)}>
        <option value="active">Follow current demo session</option>{inbox.batches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
      </select></>}
      <div className="button-row"><button onClick={() => void inbox.refresh()} disabled={inbox.loading}>Refresh inbox</button>
        <button onClick={exportSummary}>Export crew summary (TXT)</button>
        {source === 'cloud' && inbox.userId && <><button disabled={working} onClick={() => void inbox.retryPending().catch(() => setMessage('Pending deliveries could not be sent. Try again when connected.'))}>Retry pending deliveries</button>
          <button disabled={working} onClick={() => void supabase?.auth.signOut({ scope: 'local' })}>Sign out</button></>}</div>
      <p className="help">{source === 'demo' ? 'Demo packets and responses stay on this browser. Load team demonstration in Demo setup, or share a snapshot from a crew handoff.' :
        'This prototype uses the existing account-owned archive. Both demo roles use the same account; separate crew/ground authorization is not configured.'}</p>
      <p className="help">Mission times use the fictional 2027 scenario clock. Receipt times use actual UTC.</p>
      {source === 'cloud' && !inbox.userId && (supabase ? <form className="cloud-form" onSubmit={async e => {
        e.preventDefault(); if (!supabase) return; setWorking(true); setMessage('')
        try { const result = await supabase.auth.signInWithPassword({ email, password }); if (result.error) throw result.error; setPassword('') }
        catch { setMessage('Sign-in failed. Check the demo email and password.') } finally { setWorking(false) }
      }}><label>Ground demo account email<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required/></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required/></label>
        <button disabled={working}>Sign in to ground inbox</button></form> : <p>Cloud archive is not configured for this build.</p>)}
      {inbox.error && <p role="alert">{inbox.error}</p>}
      {inbox.limited && <p role="status">Showing the latest 2,000 account packets. Earlier reports may be outside this view.</p>}
      {source === 'cloud' && !navigator.onLine && <p role="status">Offline · Showing only this account’s cached receipts.</p>}
    </section>
    <section className="panel crew-overview"><div className="panel-heading"><h2>Crew overview</h2><span>{rows.filter(r => r.packet).length} of {roster.length} members have a received report</span></div>
      <p>{rows.filter(r => r.assessment?.symptoms.length).length} members report symptoms · {rows.filter(r => r.assessment?.handoff === 'pending').length} pending onboard handoffs · {rows.filter(r => !r.packet).length} without a received report.</p>
      <p className="table-scroll-hint help">Scroll the table sideways to see every column.</p>
      <div className="table-scroll"><table><thead><tr><th>Member</th><th>Crew report</th><th>Reading review</th><th>Wellbeing (shared)</th><th>Mission snapshot / Actual receipt (UTC)</th><th>Ground follow-up</th></tr></thead><tbody>
        {rows.map(row => <tr key={row.id}><td><button aria-pressed={selectedCrew === row.id} onClick={() => { setSelectedCrew(row.id); setSnapshotId(''); setNote(''); setIndicator('heart_rate') }}>{row.id}</button></td>
          <td>{row.packet ? row.assessment!.symptoms.map(s => s.symptom).join(', ') || (row.assessment!.assistanceRequested ? 'Assistance requested' : 'No symptoms reported') : 'No received report'}</td>
          <td>{!row.packet ? 'Unknown' : row.assessment!.metrics.filter(m => m.state === 'review').length + ' outside reference; ' + row.assessment!.metrics.filter(m => ['missing','stale'].includes(m.state)).length + ' unavailable'}</td>
          <td>{wellbeingText(row.packet)}</td>
          <td>{row.packet ? <><time>{stamp(row.packet.report.asOf)}</time><small>Received {stamp(receivedAt(row.packet))}</small></> : 'Awaiting sharing or synchronization'}</td>
          <td>{row.packet ? responsePackets(packets, row.packet.id).some(p => p.report.response?.action === 'request_update') ? 'Update requested' : responsePackets(packets, row.packet.id).length ? 'Snapshot viewed' : 'Not viewed' : 'No snapshot to review'}</td>
        </tr>)}
      </tbody></table></div>
    </section>
    {!selected || !analysis ? <section className="panel"><h2>{selectedCrew} · Individual analysis</h2><p>No report received in this inbox. Health status cannot be inferred from missing data.</p></section> :
      <section className="panel ground-detail"><div className="panel-heading"><h2>{selectedCrew} · Individual analysis</h2><span>Report {selected.id.slice(0, 8)}</span></div>
        <label htmlFor="ground-snapshot">Shared snapshot</label><select id="ground-snapshot" value={selected.id} onChange={e => { setSnapshotId(e.target.value); setNote('') }}>
          {snapshots.map(p => <option key={p.id} value={p.id}>{stamp(p.report.asOf)} · {p.id.slice(0, 8)}</option>)}</select>
        <p className="help">Received {stamp(receivedAt(selected))}. Freshness is re-evaluated against the demo mission clock and elapsed time; the original report is preserved.</p>
        <div className="ground-analysis-grid"><section><h3>Crew report and onboard response</h3>
          {selected.report.symptoms.length ? selected.report.symptoms.map(s => <article key={s.id} className="report"><strong>{s.symptom}</strong><p>{s.description}</p>
            <small>Reported by {s.actor} · {stamp(s.at)}{s.severity ? ' · Reported impact: ' + s.severity : ''}</small></article>) : <p>{analysis.assistanceRequested ? 'The crew requested assistance without a symptom report.' : 'No open symptoms were reported in this snapshot.'}</p>}
          <p>Onboard handoff: {analysis.acknowledgement ? analysis.acknowledgement.actor + ' acknowledged' : analysis.handoff === 'pending' ? 'Awaiting a teammate' : 'Not requested'}.</p>
          {selected.report.timeline.filter(e => ['handoff_note','handoff_acknowledged'].includes(e.type)).map(e => <p key={e.id}><strong>{e.actor}</strong> · {e.description || 'Acknowledged taking over.'}</p>)}
          <h3>Shared wellbeing summary</h3>
          {!selected.report.wellbeing ? <p>Not shared. No mental-health conclusion can be drawn.</p> : <>
            <p><strong>Self-report:</strong> {selected.report.wellbeing.daily ? selected.report.wellbeing.daily.moodRating + '/5 · ' + moodRatings[selected.report.wellbeing.daily.moodRating - 1] + ' · ' + (selected.report.wellbeing.daily.discomfort ? 'Discomfort reported' : 'No uncomfortable feelings reported') : 'No daily answer in this summary'}.</p>
            {selected.report.wellbeing.daily && <p className="help">Daily answer recorded at mission {stamp(selected.report.wellbeing.daily.at)}.</p>}
            {selected.report.wellbeing.mood && <p>Momentary mood: {selected.report.wellbeing.mood.mood}. <small>Mission {stamp(selected.report.wellbeing.mood.at)}</small></p>}
            {selected.report.wellbeing.attention ? <><p><strong>Exploratory task:</strong> {attentionLabels[selected.report.wellbeing.attention.state]}.</p>
              <p>{selected.report.wellbeing.attention.medianMs ?? '—'} ms median · {selected.report.wellbeing.attention.misses} missed · {selected.report.wellbeing.attention.baselineCount} personal comparison rounds.</p>
              <p className="help">Task recorded at mission {stamp(selected.report.wellbeing.attention.at)}.</p>
              <ul>{selected.report.wellbeing.attention.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></> : <p>No completed attention result shared.</p>}
            <p className="help">Explicitly shared at snapshot time. Task comparisons are unvalidated prototype rules, not a diagnosis or crew ranking.</p>
          </>}
        </section><section><h3>Measurements and freshness</h3><div className="facts">{analysis.metrics.map(m => <div key={m.indicator}><span>{m.name}</span><strong>{m.last ? m.last.value + ' ' + m.unit : 'Not measured'} · {metricStates[m.state]}</strong></div>)}</div>
          <label htmlFor="ground-indicator">History indicator</label><select id="ground-indicator" value={indicator} onChange={e => setIndicator(e.target.value as Indicator)}>
            {Object.entries(indicatorDefinitions).map(([key, def]) => <option key={key} value={key}>{def.name}</option>)}</select>
          <TrendChart key={selected.id} run={analysis.run} indicator={indicator}/>
          <details><summary>Assessment reasons and sources</summary><ul>{analysis.metrics.map(m => <li key={m.indicator}>{m.name}: {m.reason}</li>)}</ul>
            <div className="source-list">{selected.report.references.map(ref => <div key={ref.url}><a href={ref.url} target="_blank" rel="noreferrer">{ref.organisation} · {ref.title}</a><p>{ref.use}</p></div>)}</div></details>
        </section></div>
        <section className="ground-follow-up"><h3>Ground acknowledgement and request</h3><p className="help">A simulated operator response to this exact snapshot. Viewing a report does not certify medical fitness.</p>
          <label>Reviewer identifier<input value={reviewer} maxLength={80} onChange={e => setReviewer(e.target.value)}/></label>
          <label>Follow-up message<textarea rows={3} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder="What should the crew clarify or measure?"/></label>
          <div className="button-row"><button disabled={working || !reviewer.trim()} onClick={() => void sendResponse('reviewed')}>Confirm snapshot viewed</button>
            <button disabled={working || !note.trim() || !reviewer.trim()} onClick={() => void sendResponse('request_update')}>Request crew update</button></div>
          {replies.map(p => <article key={p.id} className="report"><strong>{p.report.response!.action === 'reviewed' ? 'Snapshot viewed' : 'Update requested'} · {p.report.response!.reviewer}</strong>
            <p>{p.report.response!.message}</p><small>{stamp(p.report.response!.at)}</small></article>)}
        </section>
      </section>}
    {message && <p role="status" className="ground-operation-status">{message}</p>}
    <footer><span>Demo mission 140 · {source === 'demo' ? 'Local browser exchange' : 'Account-scoped cloud exchange'}</span><span>Synthetic data · Demo roles</span></footer>
  </main></div>
}
