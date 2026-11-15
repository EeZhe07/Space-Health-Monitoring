// The team's data files from /data, loaded at build time.
import historyCsv from "../../../data/history/resting_hr_days_1_140.csv?raw";
import thresholdsJson from "../../../data/rules/thresholds.json";
import { parseHrCsv } from "./parse";
import { assessResting, missionDayOf, restingReference, type Thresholds } from "./resting";
import type { Reading } from "./indicators";

export const thresholds = thresholdsJson as unknown as Thresholds;

/** Morning resting heart rate, mission days 1–140 (team's synthetic history). */
export const restingHistory = parseHrCsv(historyCsv);

/** Personal normal: median of days 1–14, per the team's rule. */
export const restingRef = restingReference(restingHistory, thresholds);

/** The history as app readings. */
export const restingReadings: Reading[] = restingHistory.map((r) => ({
  id: r.record_id,
  indicator: "heart_rate",
  value: r.value,
  at: r.measured_at,
  missionDay: missionDayOf(r.measured_at),
  source: "synthetic",
}));

/** Assess any resting value (e.g. a new sensor reading) against the personal normal. */
export function assessRestingValue(value: number, at: string, id = "LIVE") {
  return assessResting(restingHistory, { record_id: id, crew_id: "CM-2", value, unit: "bpm", measured_at: at, context: "resting", quality: "ok" }, thresholds);
}
