// Pattern alerts: flight surgeons look at runs of readings, not single values.
// Each rule looks back over recent mission days. Illustrative demo rules.

import { indicators, type IndicatorId, type Level, type Reading } from "./indicators";
import { TODAY } from "./history";

export interface TrendAlert {
  id: string;
  indicator: IndicatorId;
  level: Exclude<Level, "steady">;
  title: string;
  detail: string;
  why: string;
  action: string;
  /** Plan items this alert adds to the prevention plan. */
  plan: string[];
}

function lastDays(readings: Reading[], id: IndicatorId, days: number) {
  return readings.filter((r) => r.indicator === id && r.missionDay > TODAY - days);
}
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);

export function computeAlerts(readings: Reading[]): TrendAlert[] {
  const out: TrendAlert[] = [];

  const sleep = lastDays(readings, "sleep", 4);
  const shortNights = sleep.filter((r) => r.value < 6).length;
  if (shortNights >= 3) {
    out.push({
      id: "sleep-debt",
      indicator: "sleep",
      level: "act",
      title: "Sleep debt is building",
      detail: `${shortNights} of the last ${sleep.length} nights were under 6 hours (average ${avg(sleep.map((r) => r.value)).toFixed(1)} h).`,
      why: "A few short nights in a row slow reaction time and judgement as much as being tired from a long shift.",
      action: "Protect tonight's sleep and avoid critical tasks if you can. Raise it at your next private conference.",
      plan: ["no-caffeine", "dim-lights"],
    });
  }

  const hr = lastDays(readings, "heart_rate", 5);
  const hrBase = indicators.heart_rate.baseline.value;
  const highHr = hr.filter((r) => r.value >= hrBase + 8).length;
  if (highHr >= 4) {
    out.push({
      id: "hr-rising",
      indicator: "heart_rate",
      level: "watch",
      title: "Resting heart rate is creeping up",
      detail: `${highHr} of the last ${hr.length} mornings were 8+ bpm above your pre-flight baseline of ${hrBase} bpm.`,
      why: "A rising resting heart rate often comes with poor sleep, dehydration, stress or an infection starting.",
      action: "Drink more water and check your sleep. If it keeps rising, tell the flight surgeon.",
      plan: ["water-extra"],
    });
  }

  const bp = lastDays(readings, "blood_pressure", 7);
  const bpBase = indicators.blood_pressure.baseline.value;
  const sysAvg = avg(bp.map((r) => r.value));
  if (bp.length >= 5 && sysAvg >= bpBase + 8) {
    out.push({
      id: "bp-trend",
      indicator: "blood_pressure",
      level: "watch",
      title: "Blood pressure is trending higher",
      detail: `Your 7-day average systolic is ${Math.round(sysAvg)} mmHg, ${Math.round(sysAvg - bpBase)} above your baseline of ${bpBase}.`,
      why: "Spaceflight changes how the body controls blood pressure, and space food is often salty.",
      action: "Keep salt low for a few days and keep up cardio exercise.",
      plan: ["low-salt"],
    });
  }

  const mood = lastDays(readings, "mood", 6);
  const lowMood = mood.filter((r) => r.value <= 3).length;
  if (lowMood >= 3) {
    out.push({
      id: "mood-low",
      indicator: "mood",
      level: "watch",
      title: "Mood has been lower this week",
      detail: `${lowMood} of the last ${mood.length} daily estimates were 3 or below.`,
      why: "Isolation and confinement wear people down slowly. Spotting a trend early makes it easier to turn around.",
      action: "Plan something you enjoy today and talk to a crewmate you trust.",
      plan: ["connect"],
    });
  }

  const rad = lastDays(readings, "radiation", 8);
  const spike = rad.find((r) => r.value > 1.5);
  if (spike) {
    out.push({
      id: "rad-spike",
      indicator: "radiation",
      level: "watch",
      title: "Solar event raised your dose this week",
      detail: `Day ${spike.missionDay} reached ${spike.value.toFixed(2)} mSv, about three times a normal day.`,
      why: "Radiation adds up over a career. Extra shielding for a few days keeps the total down.",
      action: "Sleep in the shielded crew quarters and watch for space weather alerts.",
      plan: ["shelter"],
    });
  }

  const temp = lastDays(readings, "temperature", 3);
  if (temp.filter((r) => r.value >= 37.3).length >= 2) {
    out.push({
      id: "temp-run",
      indicator: "temperature",
      level: "watch",
      title: "Temperature has been raised",
      detail: "Two of the last three readings were 37.3 °C or higher.",
      why: "A low fever over several days can be the first sign of an infection, which spreads easily in a closed cabin.",
      action: "Rest, wipe shared surfaces, and tell the flight surgeon if it continues.",
      plan: ["wipe"],
    });
  }

  const order = { act: 0, watch: 1 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}
