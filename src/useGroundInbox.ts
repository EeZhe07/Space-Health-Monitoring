import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, uploadPacket } from './cloud'
import { cacheGroundPackets, listGroundPackets, loadActiveDemoBatch, saveGroundPacket, type GroundPacket } from './storage'
import { localDemoUser } from './mission'

export type InboxSource = 'demo' | 'cloud'
export function useGroundInbox(source: InboxSource, batch?: string | null) {
  const [userId, setUserId] = useState<string | null>(null)
  const [data, setData] = useState<{ scope: string; packets: GroundPacket[]; batches: { id: string; label: string }[]; activeBatch: string }>({ scope: '', packets: [], batches: [], activeBatch: 'legacy' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [limited, setLimited] = useState(false)
  const scope = source + ':' + (userId ?? '') + ':' + (batch ?? 'active')
  const current = useRef(scope)
  current.current = scope
  useEffect(() => {
    if (!supabase) return
    let disposed = false, authChanged = false
    void supabase.auth.getSession().then(({ data }) => { if (!disposed && !authChanged) setUserId(data.session?.user.id ?? null) })
      .catch(() => { if (!disposed) setError('The cloud session could not be opened.') })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { authChanged = true; setUserId(session?.user.id ?? null) })
    return () => { disposed = true; data.subscription.unsubscribe() }
  }, [])
  const refresh = useCallback(async () => {
    const expected = scope
    const active = () => current.current === expected
    setError(''); setLoading(true)
    try {
      const cached = await listGroundPackets()
      const activeDemo = await loadActiveDemoBatch()
      if (!active()) return
      const own = cached.filter(p => source === 'demo' ? p.userId === localDemoUser && p.state === 'demo' : userId && p.userId === userId && p.state === 'stored')
      function publish(packets: GroundPacket[]) {
        const batches = [...new Map(packets.map(p => [p.report.demoBatchId ?? 'legacy', {
          id: p.report.demoBatchId ?? 'legacy', label: (p.report.demoBatchId ?? 'legacy') === 'legacy' ? 'Individual demos' : 'Team demo · ' + (p.report.demoBatchId ?? '').slice(0, 8) }])).values()]
        const latestCrew = [...packets].filter(p => p.report.kind !== 'ground_response').sort((a, b) => Date.parse(b.serverStoredAt ?? b.demoReceivedAt ?? b.report.preparedAt) - Date.parse(a.serverStoredAt ?? a.demoReceivedAt ?? a.report.preparedAt))[0]
        const chosen = batch ?? (source === 'demo' ? activeDemo : latestCrew?.report.demoBatchId ?? 'legacy')
        setData({ scope: expected, packets: packets.filter(p => (p.report.demoBatchId ?? 'legacy') === chosen), batches, activeBatch: chosen })
      }
      publish(own)
      if (source !== 'cloud' || !userId || !supabase || !navigator.onLine) return
      const records: GroundPacket[] = []
      let hitLimit = false
      for (let offset = 0; offset < 2000; offset += 200) {
        if (!active()) return
        const result = await supabase.from('crew_health_packets').select('id, run_id, created_at, report')
          .eq('owner_id', userId).order('created_at', { ascending: false }).range(offset, offset + 199)
        if (result.error) throw result.error
        for (const row of result.data ?? []) {
          if (!row.report?.crewId || !Number.isFinite(Date.parse(row.report.asOf)) || !Number.isFinite(Date.parse(row.report.preparedAt)) ||
            !Array.isArray(row.report.symptoms) || !Array.isArray(row.report.observations) || !Array.isArray(row.report.timeline) ||
            !Array.isArray(row.report.assessment?.indicators)) continue
          records.push({ id: row.id, runId: row.run_id ?? row.report.runId, userId, report: row.report, state: 'stored', serverStoredAt: row.created_at })
        }
        if ((result.data?.length ?? 0) < 200) break
        if (offset === 1800) hitLimit = true
      }
      if (!active()) return
      await cacheGroundPackets(records)
      if (active()) { publish(records); setLimited(hitLimit) }
    } catch (error) {
      if (active()) setError('Inbox could not be refreshed. Cached records remain visible. ' + (error instanceof Error ? error.message : 'Check the connection.'))
    } finally { if (active()) setLoading(false) }
  }, [scope, source, userId, batch])
  useEffect(() => {
    void refresh()
    const channel = new BroadcastChannel('crew-health-updates')
    const update = () => { void refresh() }
    channel.addEventListener('message', update); window.addEventListener('online', update)
    const timer = setInterval(update, source === 'cloud' ? 15000 : 5000)
    return () => { channel.close(); clearInterval(timer); window.removeEventListener('online', update) }
  }, [refresh, source])
  async function retryPending() {
    if (!userId || source !== 'cloud' || !navigator.onLine) return
    const expected = scope
    for (const packet of (await listGroundPackets()).filter(p => p.userId === userId && p.state === 'pending')) {
      if (current.current !== expected) return
      const receipt = await uploadPacket(packet, userId)
      await saveGroundPacket({ ...packet, state: 'stored', serverStoredAt: receipt.created_at })
    }
    await refresh()
  }
  return { userId, packets: data.scope === scope ? data.packets : [], batches: data.scope === scope ? data.batches : [],
    activeBatch: data.activeBatch, error, loading, limited, refresh, retryPending, scope,
    isActive: (expected: string) => current.current === expected }
}
