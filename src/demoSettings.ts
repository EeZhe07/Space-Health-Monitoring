import type { Scenario } from './core'
import { scenarioNames } from './scenarios'

export type DemoSettings = { startupScenario: Scenario; resumeLastRun: boolean }
export const defaultDemoSettings: DemoSettings = { startupScenario: 'default', resumeLastRun: true }
export function parseDemoSettings(value: unknown): DemoSettings {
  if (!value || typeof value !== 'object') return { ...defaultDemoSettings }
  const item = value as Record<string, unknown>
  return {
    startupScenario: typeof item.startupScenario === 'string' && Object.hasOwn(scenarioNames, item.startupScenario)
      ? item.startupScenario as Scenario : defaultDemoSettings.startupScenario,
    resumeLastRun: typeof item.resumeLastRun === 'boolean' ? item.resumeLastRun : defaultDemoSettings.resumeLastRun,
  }
}
export const scenarioDescriptions: Record<Scenario, string> = {
  default: 'Routine readings at rest, no reported symptoms, and no pending handoff.',
  A: 'Review measurements from a routine exercise recovery.',
  B: 'See how interrupted sensor data is marked as historical.',
  C: 'A dizziness report remains open while the wrist sensor is disconnected.',
  D: 'Request and acknowledge assistance without any measurements.',
  E: 'CM-3 has taken over; the dizziness report remains open for follow-up.',
  F: 'CM-3 has taken over even though no measurements are available.',
}
