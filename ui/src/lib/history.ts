// Synthetic mission history for CM-2, mission days 111–140, matching the team's
// scenarios (mission day 140 = 2027-07-18). Seeded, so it's identical on every load.
// Every reading arrives automatically; nothing is entered by hand.
// Story: sleep slips over the last week, mood follows, a solar event spikes
// radiation on day 133, and blood pressure creeps up slightly.

import type { IndicatorId, Reading } from "./indicators";
import { restingReadings } from "./teamData";

export const TODAY = 140;
export const FIRST_DAY = 111;
const DAY0 = Date.parse("2027-07-18T00:00:00Z") - TODAY * 86_400_000;

export const dayToIso = (day: number, hour: number) => new Date(DAY0 + day * 86_400_000 + hour * 3_600_000).toISOString();

/** "Now" in the demo: ship time on mission day 140, matching the team's Live check scenarios. */
export const NOW_ISO = new Date(DAY0 + TODAY * 86_400_000 + (14 + 10 / 60) * 3_600_000).toISOString();

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

export function syntheticHistory(): Reading[] {
  const r = rng(42);
  const n = (mean: number, spread: number) => mean + (r() - 0.5) * 2 * spread;
  const out: Reading[] = [];
  const push = (indicator: IndicatorId, day: number, hour: number, value: number, value2?: number) =>
    out.push({ id: `SYN-${indicator}-${day}`, indicator, value, value2, at: dayToIso(day, hour), missionDay: day, source: "synthetic" });

  for (let d = FIRST_DAY; d <= TODAY; d++) {
    const late = Math.max(0, d - 133); // last week
    push("sleep", d, 6, Math.max(4.5, n(7.4 - late * 0.27, 0.35)));
    // Wrist pulse oximeter and chest strap: steady, a touch lower and faster after short nights.
    push("spo2", d, 7.1, Math.round(Math.min(100, n(97.6 - late * 0.12, 0.8))));
    push("respiratory_rate", d, 7.15, Math.round(n(14 + late * 0.25, 1.2)));
    push("blood_pressure", d, 7.2, n(116 + (d - FIRST_DAY) * 0.35, 4), n(75 + (d - FIRST_DAY) * 0.2, 3));
    push("blood_sugar", d, 7.4, n(88, 7));
    push("temperature", d, 7.5, d === 124 ? 37.6 : n(36.7, 0.25));
    // Dosimeter reports a running total; today's value so far.
    push("radiation", d, d === TODAY ? 7.6 : 22, d === 133 ? 1.62 : d === 134 ? 0.96 : n(0.48, 0.07));
    // Mood is estimated from heart-rate variability and sleep; nothing is self-reported.
    push("mood", d, d === TODAY ? 6.5 : 20, Math.round(Math.min(5, Math.max(1, n(4.4 - late * 0.22, 0.5)))));
  }
  // Resting heart rate comes from the team's history file (days 1-140).
  return [...out, ...restingReadings];
}
