import type { Run } from './core'
import { crewOf, responsePackets, selectLatest } from './mission'
import { useGroundInbox, type InboxSource } from './useGroundInbox'

export default function CrewGroundNotice({ run, onOpen }: { run: Run; onOpen: (source: InboxSource) => void }) {
  const local = useGroundInbox('demo', run.demoBatchId ?? 'legacy')
  const cloud = useGroundInbox('cloud', run.demoBatchId ?? 'legacy')
  return <>{([{ source: 'demo', inbox: local }, { source: 'cloud', inbox: cloud }] as const).map(({ source, inbox }) => {
    const latest = selectLatest(inbox.packets.filter(p => p.runId === run.id), crewOf(run))
    const requests = latest ? responsePackets(inbox.packets, latest.id).filter(p => p.report.response?.action === 'request_update') : []
    if (!requests.length) return null
    return <section key={source} className="panel crew-ground-notice"><h2>Ground requests an update</h2>
      <p>{requests[0].report.response!.message}</p><p className="help">{source === 'demo' ? 'Local demo inbox' : 'Same-account cloud inbox'} · Linked to your latest shared snapshot.</p>
      <button onClick={() => onOpen(source)}>Open ground request</button></section>
  })}</>
}
