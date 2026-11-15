// Demo rules engine: turns heart-rate readings + crew events into an Assessment
// at any moment in time. It mirrors the expected outputs in data/scenarios so
// the UI can replay a scenario minute by minute. Illustrative rules only.

import type { Assessment, CrewEvent, HrReading, OpenSymptom, Scenario } from "./types.ts";

export const RULE_VERSION = "0.1-demo";
export const VALIDITY_WINDOW_MIN = 2;
const MIN = 60_000;

export const ms = (iso: string) => Date.parse(iso);
export const hhmm = (iso: string) => new Date(iso).toISOString().slice(11, 16);

export function eventTime(e: CrewEvent): string {
  return e.type === "symptom_report" ? e.reported_at : e.time;
}

export function evaluate(scenario: Pick<Scenario, "readings" | "events">, atIso: string, opts: { crewId?: string; missionDay?: number } = {}): Assessment {
  const at = ms(atIso);
  const readings = scenario.readings.filter((r) => r.quality === "ok" && ms(r.measured_at) <= at);
  const events = scenario.events
    .filter((e) => ms(eventTime(e)) <= at)
    .sort((a, b) => ms(eventTime(a)) - ms(eventTime(b)));

  const last: HrReading | undefined = readings[readings.length - 1];
  const disconnect = events.findLast((e) => e.type === "sensor_disconnected");
  const sensorDisconnected = !!disconnect && (!last || ms(last.measured_at) < ms(eventTime(disconnect)));

  const sensor: Assessment["sensor"] = !last ? "no_data" : sensorDisconnected ? "disconnected" : "connected";
  const ageMin = last ? Math.round((at - ms(last.measured_at)) / MIN) : Infinity;
  const hrCurrent = !!last && ageMin <= VALIDITY_WINDOW_MIN;

  const openSymptoms: OpenSymptom[] = events
    .filter((e) => e.type === "symptom_report" && e.status === "open")
    .map((e) => {
      const s = e as Extract<CrewEvent, { type: "symptom_report" }>;
      return { symptom: s.symptom, reported_at: s.reported_at, onset_at: s.onset_at, onset_certainty: s.onset_certainty, reporter: s.reporter };
    });

  const assistance = events.find((e) => e.type === "assistance_requested");
  const ack = events.findLast((e) => e.type === "handoff_acknowledged") as Extract<CrewEvent, { type: "handoff_acknowledged" }> | undefined;

  const reasons: string[] = [];
  const unknowns: string[] = [];

  if (!last) {
    reasons.push("No reliable heart rate data available.");
  } else if (!hrCurrent) {
    reasons.push(`Last reliable heart rate was ${ageMin} min ago (demo validity window: ${VALIDITY_WINDOW_MIN} min).`);
    if (last.context === "exercise") {
      reasons.push("Last reading was taken during exercise; it is not compared with resting values.");
    }
  }
  if (!hrCurrent) unknowns.push("current heart rate");

  for (const s of openSymptoms) {
    const onset = s.onset_at ? `, onset ${s.onset_certainty === "approximate" ? "~" : ""}${hhmm(s.onset_at)}${s.onset_certainty ? ` (${s.onset_certainty})` : ""}` : "";
    reasons.push(`Open symptom: ${s.symptom} reported ${hhmm(s.reported_at)}${onset}.`);
  }
  if (openSymptoms.length && last?.context === "exercise") {
    reasons.push("No blood pressure has been recorded since exercise ended.");
    unknowns.push("post-exercise blood pressure");
  }
  if (sensor === "disconnected") reasons.push("Wrist sensor disconnected; no readings since then.");
  if (assistance) reasons.push("Assistance was requested; the handoff card opens immediately.");

  const needsHandoff = openSymptoms.length > 0 || !!assistance;
  const handoff: Assessment["handoff"] = ack
    ? { status: "acknowledged", by: ack.by, at: ack.time }
    : { status: needsHandoff ? "pending" : "not_needed", by: null, at: null };
  if (ack) reasons.push(`Handoff acknowledged by ${ack.by} at ${hhmm(ack.time)}.`);

  const actions_taken: string[] = [];
  for (const e of events) {
    if (e.type === "symptom_report") actions_taken.push(`symptom report at ${hhmm(e.reported_at)}`);
    if (e.type === "assistance_requested") actions_taken.push(`assistance requested at ${hhmm(e.time)}`);
    if (e.type === "handoff_acknowledged") actions_taken.push(`handoff acknowledged at ${hhmm(e.time)}`);
  }

  return {
    crew_id: opts.crewId ?? last?.crew_id ?? events[0]?.crew_id ?? "CM-2",
    mission_day: opts.missionDay ?? 140,
    evaluated_at: new Date(at).toISOString().replace(".000Z", "Z"),
    rule_version: RULE_VERSION,
    symptom_status: openSymptoms.length ? "open" : "none_open",
    open_symptoms: openSymptoms,
    current_hr: {
      status: hrCurrent ? "current" : "unknown",
      last_reliable: last ? { value: last.value, unit: last.unit, measured_at: last.measured_at, context: last.context } : null,
    },
    sensor,
    unknowns,
    actions_taken,
    assistance: "available",
    handoff,
    reasons,
    contributing_ids: [...(last ? [last.record_id] : []), ...events.map((e) => e.event_id)],
    labels: ["synthetic data", "illustrative demo rules"],
  };
}

/** Field-by-field comparison with an expected file. Returns the names of fields that differ. */
export function diffAssessment(actual: Assessment, expected: Assessment): string[] {
  const keys = Object.keys(expected) as (keyof Assessment)[];
  return keys.filter((k) => JSON.stringify(actual[k]) !== JSON.stringify(expected[k]));
}

/** Overall state the UI leads with. */
export type Headline = "acknowledged" | "pending" | "unknown" | "nominal";
export function headline(a: Assessment): Headline {
  if (a.handoff.status === "acknowledged") return "acknowledged";
  if (a.handoff.status === "pending") return "pending";
  if (a.current_hr.status === "unknown") return "unknown";
  return "nominal";
}
