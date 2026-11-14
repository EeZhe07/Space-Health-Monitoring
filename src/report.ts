import { assess, type Run } from './core'
import { sources } from './content'
import { deviceReference } from './indicators'

export function buildGroundReport(run: Run) {
  const assessment = assess(run)
  const background = sources.filter((source, index) =>
    index === 0 || index === 3 || ((assessment.last || assessment.symptoms.length) && (index === 1 || index === 2)))
  const references = [...new Map([...background,
    ...(assessment.measurements.length ? [deviceReference] : []),
    ...assessment.metrics.filter(metric => metric.last && metric.reference).map(metric => metric.reference!),
  ].map(source => [source.url, source])).values()]
  return {
    reportVersion: '0.1',
    runId: run.id,
    scenario: run.scenario,
    crewId: 'CM-2',
    missionDay: 140,
    asOf: run.now,
    preparedAt: new Date().toISOString(),
    synthetic: true,
    deliveryStatus: 'local_only',
    symptoms: assessment.symptoms,
    observations: assessment.measurements,
    timeline: assessment.events,
    handoff: assessment.acknowledgement,
    assessment: {
      currentHeartRate: assessment.available ? assessment.last?.value : null,
      lastReliable: assessment.last,
      sensor: assessment.sensor,
      handoffStatus: assessment.handoff,
      reasons: assessment.reasons,
      ruleVersion: assessment.ruleVersion,
      ruleContext: 'Illustrative two-minute measurement-validity window.',
      indicators: assessment.metrics.map(metric => ({
        indicator: metric.indicator, name: metric.name, unit: metric.unit, observation: metric.last,
        state: metric.state, reason: metric.reason,
        referenceRange: metric.lower === null ? null : { lower: metric.lower, upper: metric.upper },
        reference: metric.reference, referenceProfile: metric.referenceProfile,
        freshnessMinutes: metric.freshnessMinutes, freshnessBasis: metric.freshnessBasis,
      })),
    },
    references,
    referencePurpose: 'Background and workflow references for ground reviewers. Clinical action thresholds require separately reviewed sources.',
  }
}
