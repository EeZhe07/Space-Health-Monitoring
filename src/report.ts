import { assess, type Run } from './core'
import { sources } from './content'
import { deviceReference } from './indicators'
import { crewOf, missionId, type GroundResponse } from './mission'
import { visibleDaily, visibleAttention, analyseAttention } from './wellbeing'
import { visibleMoods } from './breakRound'

export function buildGroundReport(run: Run) {
  const assessment = assess(run)
  const task = visibleAttention(run)[0]
  const wellbeing = run.shareWellbeing ? { shared: true as const,
    daily: visibleDaily(run)[0] ?? null, mood: visibleMoods(run)[0] ?? null,
    attention: task ? { ...analyseAttention(task, visibleAttention(run)), at: task.at, recordedAt: task.recordedAt,
      input: task.input, protocol: task.protocol, earlyInputs: task.earlyInputs } : null } : undefined
  const background = sources.filter((source, index) =>
    index === 0 || index === 3 || ((assessment.last || assessment.symptoms.length) && (index === 1 || index === 2)))
  const references = [...new Map([...background,
    ...(wellbeing?.attention ? [{ title: 'NASA Reaction Self Test project', organisation: 'NASA',
      url: 'https://techport.nasa.gov/projects/23201', use: 'Research context; this short browser task is not the validated NASA test.' },
      { title: 'ISS sleep and neurobehavioral performance study', organisation: 'Sleep (2022)',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8919197/', use: 'Primary research on performance and self-report; not validation of this prototype.' }] : []),
    ...(assessment.measurements.length ? [deviceReference] : []),
    ...assessment.metrics.filter(metric => metric.last && metric.reference).map(metric => metric.reference!),
  ].map(source => [source.url, source])).values()]
  return {
    reportVersion: '0.2',
    kind: 'crew_report' as 'crew_report' | 'ground_response',
    response: null as GroundResponse | null,
    missionId,
    demoBatchId: run.demoBatchId ?? 'legacy',
    wellbeing,
    runId: run.id,
    scenario: run.scenario,
    crewId: crewOf(run),
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
