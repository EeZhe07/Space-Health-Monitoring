export type Scenario = 'default' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export type EventType = 'sensor_disconnected' | 'sensor_connected' | 'symptom_report' |
  'symptom_updated' | 'assistance_requested' | 'handoff_acknowledged' | 'handoff_note' | 'measurement_recorded'

export interface Observation {
  id: string
  value: number
  indicator?: Indicator
  unit: string
  measuredAt: string
  receivedAt: string
  context: string
  source: string
  quality: string
  synthetic: boolean
  groupId?: string
  method?: string
}
export interface CrewEvent {
  id: string
  type: EventType
  at: string
  actor?: string
  symptom?: string
  description?: string
  onset?: string
  certainty?: string
  relatedId?: string
  resolved?: boolean
  severity?: 'mild' | 'moderate' | 'severe' | 'unsure'
}
export interface Run {
  crewId?: string
  demoBatchId?: string
  shareWellbeing?: boolean
  dailyCheckIns?: import('./wellbeing').DailyCheckIn[]
  attentionSessions?: import('./wellbeing').AttentionSession[]
  moodCheckIns?: import('./breakRound').MoodCheckIn[]
  id: string
  scenario: Scenario
  now: string
  observations: Observation[]
  events: CrewEvent[]
}
export const ruleVersion = '0.1-demo'
export const validityMs = 120_000

// The repository fixtures are simple, unquoted CSVs, not a general upload format.
export function parseMeasurements(csv: string): Observation[] {
  const [header, ...lines] = csv.trim().split(/\r?\n/)
  const keys = header.split(',')
  return lines.filter(Boolean).map(line => {
    const record = Object.fromEntries(line.split(',').map((value, i) => [keys[i], value.trim()]))
    if (!record.record_id || !record.value || !Number.isFinite(Number(record.value)) ||
      record.unit !== 'bpm' || !Number.isFinite(Date.parse(record.measured_at)) ||
      !Number.isFinite(Date.parse(record.received_at))) {
      throw new Error('The scenario contains an invalid heart-rate observation.')
    }
    return {
      id: record.record_id, value: Number(record.value), unit: 'bpm',
      measuredAt: record.measured_at, receivedAt: record.received_at, context: record.context,
      source: record.source, quality: record.quality,
      synthetic: record.synthetic?.toLowerCase() === 'true',
    }
  })
}

export function assess(run: Run) {
  const now = Date.parse(run.now)
  const measurements = run.observations.filter(o => o.quality === 'ok' &&
    Date.parse(o.measuredAt) <= now && Date.parse(o.receivedAt) <= now)
    .sort((a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt))
  const observations = measurements.filter(o => indicatorOf(o) === 'heart_rate')
  const last = observations.at(-1) ?? null
  const events = run.events.filter(e => Date.parse(e.at) <= now)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const sensorEvent = events.filter(e => e.type === 'sensor_disconnected' || e.type === 'sensor_connected').at(-1)
  const sensor = sensorEvent?.type === 'sensor_disconnected' ? 'disconnected' :
    sensorEvent?.type === 'sensor_connected' || observations.some(o => o.source === 'simulated_device') ? 'connected' : 'no_data'
  const available = Boolean(last && now - Date.parse(last.measuredAt) <= validityMs &&
    (last.source === 'manual' || sensor !== 'disconnected'))
  const symptoms = events.filter(e => e.type === 'symptom_report').filter(report => {
    const update = events.filter(e => e.type === 'symptom_updated' && e.relatedId === report.id).at(-1)
    return !update?.resolved
  })
  const assistanceRequested = events.some(e => e.type === 'assistance_requested')
  const latestConcern = events.filter(e => e.type === 'symptom_report' || e.type === 'assistance_requested').at(-1)
  const acknowledgement = events.filter(e => e.type === 'handoff_acknowledged' &&
    (!latestConcern || Date.parse(e.at) >= Date.parse(latestConcern.at))).at(-1) ?? null
  const handoff = acknowledgement ? 'acknowledged' :
    assistanceRequested || symptoms.length ? 'pending' : 'not_needed'
  const reasons: string[] = []
  if (!last) reasons.push('No reliable heart-rate measurement is available.')
  else if (!available) reasons.push('Current heart rate is unknown. The last reliable measurement remains in the history.')
  if (last) reasons.push('The last reading was collected ' +
    (last.context === 'exercise' ? 'during exercise' : last.context.replaceAll('_', ' ')) +
    '. Measurement context is preserved.')
  if (sensor === 'disconnected') reasons.push('The wrist sensor is disconnected.')
  if (symptoms.length) reasons.push('A reported symptom remains open, independently of the sensor status.')
  if (assistanceRequested) reasons.push('The crew requested assistance. Onboard handoff is available immediately.')
  const metrics = assessIndicators(run, sensor)
  return { last, available, sensor, symptoms, assistanceRequested, acknowledgement,
    handoff, events, observations, measurements, metrics, reasons, ruleVersion }
}

export function time(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}
import { assessIndicators, indicatorOf, type Indicator } from './indicators'
