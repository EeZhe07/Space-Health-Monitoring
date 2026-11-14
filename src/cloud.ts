import { createClient } from '@supabase/supabase-js'
import type { GroundPacket } from './storage'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key) : null

export async function uploadPacket(packet: GroundPacket, userId: string) {
  if (!supabase || packet.userId !== userId) throw new Error('Sign in with the account that queued this packet.')
  const existing = await supabase.from('crew_health_packets').select('id, created_at').eq('id', packet.id).maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return existing.data
  const result = await supabase.from('crew_health_packets').insert({
    id: packet.id, owner_id: userId, run_id: packet.runId, report: packet.report,
  }).select('id, created_at').single()
  if (result.error) {
    if (result.error.code === '23505') {
      const retry = await supabase.from('crew_health_packets').select('id, created_at').eq('id', packet.id).single()
      if (!retry.error) return retry.data
    }
    throw result.error
  }
  return result.data
}
