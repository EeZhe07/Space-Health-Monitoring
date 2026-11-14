import { parseMeasurements, type CrewEvent, type Run, type Scenario, type EventType } from './core'
import { simulatedPanel } from './indicators'

const csvFiles = import.meta.glob('../data/scenarios/*_hr.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const eventFiles = import.meta.glob('../data/scenarios/*_events.json', { eager: true, import: 'default' }) as Record<string, Record<string, unknown>[]>

export const scenarioNames: Record<Scenario, string> = {
  default: 'Default app',
  A: 'Routine recovery',
  B: 'Sensor interruption',
  C: 'Dizziness + interruption',
  D: 'Assistance without readings',
  E: 'Dizziness · Teammate took over',
  F: 'No readings · Teammate took over',
}
export function createRun(scenario: Scenario, crewId = 'CM-2'): Run {
  if (scenario === 'default') {
    const measuredAt = '2027-07-18T14:10:00Z'
    return { id: crypto.randomUUID(), scenario, crewId, now: '2027-07-18T14:10:10Z', events: [],
      observations: [...simulatedPanel(measuredAt), { id: crypto.randomUUID(), indicator: 'heart_rate',
        value: 82, unit: 'bpm', measuredAt, receivedAt: measuredAt, context: 'rest',
        source: 'simulated_device', quality: 'ok', synthetic: true }] }
  }
  const rawEvents = eventFiles['../data/scenarios/scenario_' + scenario + '_events.json']
  const events: CrewEvent[] = rawEvents.map(e => ({
    id: String(e.event_id), type: e.type as EventType,
    at: String(e.time ?? e.reported_at),
    actor: String(e.by === crewId ? 'CM-1' === crewId ? 'CM-2' : 'CM-1' : e.by ?? (e.reporter === 'self' ? crewId : e.reporter ?? '')),
    symptom: e.symptom as string | undefined, description: e.description as string | undefined,
    onset: e.onset_at as string | undefined, certainty: e.onset_certainty as string | undefined,
  }))
  return {
    id: crypto.randomUUID(), scenario, crewId,
    // A's last fixture row arrives five seconds after its original expected time.
    now: scenario === 'A' ? '2027-07-18T14:10:10Z' :
      scenario === 'E' || scenario === 'F' ? '2027-07-18T14:11:00Z' : '2027-07-18T14:09:00Z',
    observations: [
      ...parseMeasurements(csvFiles['../data/scenarios/scenario_' + scenario + '_hr.csv']),
      ...(scenario === 'D' || scenario === 'F' ? [] : simulatedPanel('2027-07-18T14:08:00Z')),
    ],
    events,
  }
}
export function restartRun(scenario: Scenario, current: Run) {
  return { ...createRun(scenario, current.crewId ?? 'CM-2'), demoBatchId: current.demoBatchId }
}
