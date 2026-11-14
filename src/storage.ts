import { openDB } from 'idb'
import type { Run } from './core'
import type { buildGroundReport } from './report'

export interface GroundPacket {
  id: string
  runId: string
  userId: string
  report: ReturnType<typeof buildGroundReport>
  state: 'pending' | 'stored'
  serverStoredAt?: string
}

const database = () => openDB('crew-health', 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('runs')) db.createObjectStore('runs', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings')
    if (!db.objectStoreNames.contains('groundPackets')) db.createObjectStore('groundPackets', { keyPath: 'id' })
  },
})
export async function loadRun(): Promise<Run | undefined> {
  const db = await database()
  const id = await db.get('settings', 'activeRun')
  return id ? db.get('runs', id) : undefined
}
export async function saveRun(run: Run) {
  const db = await database()
  const tx = db.transaction(['runs', 'settings'], 'readwrite')
  await tx.objectStore('runs').put(run)
  await tx.objectStore('settings').put(run.id, 'activeRun')
  await tx.done
}
export async function listRuns(): Promise<Run[]> {
  return (await database()).getAll('runs')
}
export async function saveGroundPacket(packet: GroundPacket) {
  await (await database()).put('groundPackets', packet)
}
export async function listGroundPackets(): Promise<GroundPacket[]> {
  return (await database()).getAll('groundPackets')
}
