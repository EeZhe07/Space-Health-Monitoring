import { assess, type Run } from './core'
import type { GroundPacket } from './storage'

export const missionId = 'demo-mission-140'
export const roster = ['CM-1', 'CM-2', 'CM-3', 'CM-4']
export const localDemoUser = 'local-demo'
export const crewOf = (run: Run) => run.crewId ?? 'CM-2'
export type GroundResponse = { packetId: string; action: 'reviewed' | 'request_update'; message: string; reviewer: string; at: string }
export const isCrewPacket = (packet: GroundPacket) => packet.report.kind !== 'ground_response' && !packet.report.response
export const receivedAt = (packet: GroundPacket) => packet.demoReceivedAt ?? packet.serverStoredAt ?? packet.report.preparedAt
export function selectLatest(packets: GroundPacket[], crewId: string) {
  return packets.filter(p => isCrewPacket(p) && p.report.crewId === crewId && (p.report.missionId ?? missionId) === missionId)
    .sort((a, b) => Date.parse(b.report.asOf) - Date.parse(a.report.asOf) || Date.parse(receivedAt(b)) - Date.parse(receivedAt(a)))[0]
}
export function analysePacket(packet: GroundPacket, missionNow: string, wallNow = Date.now()) {
  const report = packet.report
  const elapsed = Math.max(0, wallNow - Date.parse(report.preparedAt))
  const now = new Date(Math.max(Date.parse(missionNow), Date.parse(report.asOf) + (Number.isFinite(elapsed) ? elapsed : 0))).toISOString()
  const run: Run = { id: report.runId, crewId: report.crewId, scenario: report.scenario, now,
    observations: report.observations, events: report.timeline }
  return { ...assess(run), run }
}
export function responsePackets(packets: GroundPacket[], packetId?: string) {
  return packets.filter(p => p.report.kind === 'ground_response' && p.report.response && (!packetId || p.report.response.packetId === packetId))
    .sort((a, b) => Date.parse(b.report.response!.at) - Date.parse(a.report.response!.at))
}
