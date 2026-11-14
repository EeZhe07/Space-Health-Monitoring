// Resting heart rate vs the astronaut's personal normal, following the team's
// rules in data/rules/thresholds.json. Pure functions, shared by the app and
// scripts/check-engine.ts.

import type { HrReading } from "./types.ts";

export interface Thresholds {
  resting_hr_reference: { window_days: [number, number]; method: "median"; min_valid_readings: number };
  resting_hr_change_flag: { flag_if_above_percent: number };
  exercise_hr_zone: { zone_bpm: [number, number]; zone_percent_of_max: [number, number]; age_years: number };
  hr_validity_window: { minutes: number };
}

/** Mission day 1 is 2027-03-01 in the team's history (day 140 = 2027-07-18). */
const DAY1 = Date.parse("2027-03-01T00:00:00Z");
export const missionDayOf = (iso: string) => Math.floor((Date.parse(iso) - DAY1) / 86_400_000) + 1;

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Personal normal: median of valid resting readings in the reference window. */
export function restingReference(history: HrReading[], t: Thresholds) {
  const [from, to] = t.resting_hr_reference.window_days;
  const used = history.filter((r) => r.context === "resting" && r.quality === "ok" && missionDayOf(r.measured_at) >= from && missionDayOf(r.measured_at) <= to);
  if (used.length < t.resting_hr_reference.min_valid_readings) return null;
  return { window_days: [from, to] as [number, number], method: "median" as const, n_used: used.length, value: median(used.map((r) => r.value)), unit: "bpm" };
}

export interface RestingAssessment {
  indicator: "heart_rate";
  context: "resting";
  rule_version: string;
  reference: NonNullable<ReturnType<typeof restingReference>>;
  today: { value: number; measured_at: string; record_id: string };
  change_percent: number;
  status: "flagged" | "normal";
  reason: string;
}

/** Same shape as data/rules/resting_assessment_day140.json. */
export function assessResting(history: HrReading[], today: HrReading, t: Thresholds): RestingAssessment | null {
  const ref = restingReference(history, t);
  if (!ref) return null;
  const change = Math.round(((today.value - ref.value) / ref.value) * 1000) / 10;
  const flagged = change > t.resting_hr_change_flag.flag_if_above_percent;
  const [from, to] = ref.window_days;
  return {
    indicator: "heart_rate",
    context: "resting",
    rule_version: "0.1-demo",
    reference: ref,
    today: { value: today.value, measured_at: today.measured_at, record_id: today.record_id },
    change_percent: change,
    status: flagged ? "flagged" : "normal",
    reason: flagged
      ? `Resting HR ${today.value} bpm is ${Math.round(change)}% above your normal of ${ref.value} bpm (days ${from}-${to}).`
      : `Resting HR ${today.value} bpm is within ${t.resting_hr_change_flag.flag_if_above_percent}% of your normal of ${ref.value} bpm (days ${from}-${to}).`,
  };
}
