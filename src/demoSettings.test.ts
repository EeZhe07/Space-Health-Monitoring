import { describe, it, expect } from 'vitest'
import { parseDemoSettings, defaultDemoSettings } from './demoSettings'
import { createRun } from './scenarios'
import { assess } from './core'

describe('demo defaults', () => {
  it('offers a routine baseline with fresh readings and no fictional concern', () => {
    const run = createRun('default')
    const result = assess(run)
    expect(result.available).toBe(true)
    expect(result.handoff).toBe('not_needed')
    expect(result.symptoms).toHaveLength(0)
    expect(result.metrics.some(metric => ['missing', 'stale', 'review', 'context_needed'].includes(metric.state))).toBe(false)
    expect(run.moodCheckIns ?? []).toHaveLength(0)
    expect(createRun('default').id).not.toBe(run.id)
  })
  it('validates stored preferences and falls back without trusting malformed storage', () => {
    expect(parseDemoSettings(undefined)).toEqual(defaultDemoSettings)
    expect(parseDemoSettings({ startupScenario: 'C', resumeLastRun: false })).toEqual({ startupScenario: 'C', resumeLastRun: false })
    expect(parseDemoSettings({ startupScenario: '__proto__', resumeLastRun: 'false' })).toEqual(defaultDemoSettings)
  })
})
