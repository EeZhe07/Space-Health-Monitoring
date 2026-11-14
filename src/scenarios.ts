import { parseMeasurements, type CrewEvent, type Run, type Scenario, type EventType } from './core'
import { simulatedPanel } from './indicators'

const csvFiles = import.meta.glob('../data/scenarios/*_hr.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const eventFiles = import.meta.glob('../data/scenarios/*_events.json', { eager: true, import: 'default' }) as Record<string, Record<string, unknown>[]>

export const scenarioNames: Record<Scenario, string> = {
  A: 'Routine recovery',
  B: 'Sensor interruption',
  C: 'Dizziness + interruption',
  D: 'Assistance without readings',
  E: 'Dizziness · Teammate took over',
  F: 'No readings · Teammate took over',
}
export function createRun(scenario: Scenario): Run {
  const rawEvents = eventFiles['../data/scenarios/scenario_' + scenario + '_events.json']
  const events: CrewEvent[] = rawEvents.map(e => ({
    id: String(e.event_id), type: e.type as EventType,
    at: String(e.time ?? e.reported_at),
    actor: String(e.by ?? (e.reporter === 'self' ? 'CM-2' : e.reporter ?? '')),
    symptom: e.symptom as string | undefined, description: e.description as string | undefined,
    onset: e.onset_at as string | undefined, certainty: e.onset_certainty as string | undefined,
  }))
  return {
    id: crypto.randomUUID(), scenario,
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
