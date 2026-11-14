import type { Observation, Run } from './core'

export const indicatorDefinitions = {
  heart_rate: { name: 'Heart rate', unit: 'bpm', lower: 60, upper: 100, minimum: 0, maximum: 400, freshnessMinutes: 2, restingOnly: true },
  spo2: { name: 'Blood oxygen', unit: '%', lower: 95, upper: 100, minimum: 0, maximum: 100, freshnessMinutes: 2, restingOnly: false },
  respiratory_rate: { name: 'Breathing rate', unit: 'breaths/min', lower: 12, upper: 18, minimum: 0, maximum: 100, freshnessMinutes: 2, restingOnly: true },
  systolic_bp: { name: 'Systolic blood pressure', unit: 'mmHg', lower: 90, upper: 120, minimum: 0, maximum: 350, freshnessMinutes: 15, restingOnly: true },
  diastolic_bp: { name: 'Diastolic blood pressure', unit: 'mmHg', lower: 60, upper: 80, minimum: 0, maximum: 250, freshnessMinutes: 15, restingOnly: true },
  body_temperature: { name: 'Body temperature', unit: '°C', lower: 36.5, upper: 37.3, minimum: 20, maximum: 45, freshnessMinutes: 30, restingOnly: false },
  sleep_duration: { name: 'Sleep duration', unit: 'hours', lower: null, upper: null, minimum: 0, maximum: 24, freshnessMinutes: 2880, restingOnly: false },
} as const
export type Indicator = keyof typeof indicatorDefinitions
export function indicatorOf(observation: Observation): Indicator {
  return observation.indicator ?? 'heart_rate'
}
export const vitalReference = {
  title: 'MedlinePlus: Vital signs',
  organisation: 'U.S. National Library of Medicine',
  url: 'https://medlineplus.gov/ency/article/002341.htm',
  use: 'General resting-adult reference values. These ranges are not mission-specific medical escalation limits.',
}
export const oxygenReference = {
  title: 'MedlinePlus: Pulse oximetry',
  organisation: 'U.S. National Library of Medicine',
  url: 'https://medlineplus.gov/lab-tests/pulse-oximetry/',
  use: 'General oxygen-saturation reference; atmosphere, circulation, measurement limitations and clinical context affect interpretation.',
}
export const deviceReference = {
  title: 'Multifunctional Integrated Medical Devices',
  organisation: 'NASA',
  url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/human-health-performance/exploration-medical-technologies/multifunctional-integrated-medical-devices/',
  use: 'Device capability and demonstration evidence for combined vital-sign collection. The prototype uses synthetic input, without a real device connection.',
}

export function assessIndicators(run: Run, sensor: string) {
  const now = Date.parse(run.now)
  return Object.entries(indicatorDefinitions).map(([key, definition]) => {
    const indicator = key as Indicator
    const readings = run.observations.filter(o => indicatorOf(o) === indicator && o.quality === 'ok' &&
      Date.parse(o.measuredAt) <= now && Date.parse(o.receivedAt) <= now)
      .sort((a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt))
    const last = readings.at(-1) ?? null
    let state: 'missing' | 'stale' | 'context_needed' | 'within_reference' | 'review' | 'recorded' = 'missing'
    let reason = 'No reliable measurement received.'
    if (last) {
      const unavailable = now - Date.parse(last.measuredAt) > definition.freshnessMinutes * 60000 ||
        (last.source === 'simulated_device' && sensor === 'disconnected')
      if (unavailable) {
        state = 'stale'; reason = 'A fresh reliable measurement is unavailable.'
      } else if (definition.restingOnly && last.context !== 'rest') {
        state = 'context_needed'; reason = 'The reference applies at rest; this measurement has a different context.'
      } else if (definition.lower === null || definition.upper === null) {
        state = 'recorded'; reason = 'Recorded for context. No clinical cut-off is configured.'
      } else if (last.value < definition.lower || last.value > definition.upper) {
        state = 'review'; reason = 'Outside the selected general-adult reference. Review context and measurement quality.'
      } else {
        state = 'within_reference'; reason = 'Within the selected general-adult reference for this indicator.'
      }
    }
    return { indicator, ...definition, last, state, reason,
      reference: indicator === 'sleep_duration' ? null : indicator === 'spo2' ? oxygenReference : vitalReference,
      referenceProfile: 'General-adult illustration; mission-specific applicability requires review.',
      freshnessBasis: 'Illustrative prototype freshness setting.',
    }
  })
}

export function simulatedPanel(now: string, changed = false): Observation[] {
  const entries: [Indicator, number][] = [
    ['spo2', changed ? 92 : 98], ['respiratory_rate', changed ? 24 : 16],
    ['systolic_bp', 118], ['diastolic_bp', 76],
    ['body_temperature', changed ? 38 : 36.8], ['sleep_duration', changed ? 4.5 : 7.2],
  ]
  const bloodPressureGroup = crypto.randomUUID()
  return entries.map(([indicator, value]) => ({
    id: crypto.randomUUID(), indicator, value, unit: indicatorDefinitions[indicator].unit,
    measuredAt: now, receivedAt: now, context: indicator === 'sleep_duration' ? 'previous_sleep_period' : 'rest',
    source: indicator === 'sleep_duration' ? 'simulated_actigraphy' : 'simulated_medical_monitor',
    quality: 'ok', synthetic: true,
    groupId: indicator.endsWith('_bp') ? bloodPressureGroup : undefined,
    method: indicator === 'body_temperature' ? 'Synthetic body-temperature probe; site to be verified for real devices' : undefined,
  }))
}
