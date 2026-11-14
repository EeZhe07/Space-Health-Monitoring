// Health indicators the brief names, with illustrative demo thresholds and
// plain-language guidance. Not medical advice; values are for the demo only.

export type Level = "steady" | "watch" | "act";
export type IndicatorId = "heart_rate" | "blood_pressure" | "blood_sugar" | "temperature" | "sleep" | "mood" | "radiation";

export interface Reading {
  id: string;
  indicator: IndicatorId;
  /** Main value. For blood pressure this is systolic. */
  value: number;
  /** Diastolic, for blood pressure only. */
  value2?: number;
  at: string; // ISO
  missionDay: number;
  source: "synthetic" | "crew_input";
}

export interface Indicator {
  id: IndicatorId;
  name: string;
  unit: string;
  /** Shown on the chart as the steady band. */
  band: [number, number];
  chart: [number, number];
  /** Classify one reading. */
  level: (r: Pick<Reading, "value" | "value2">) => Level;
  format: (r: Pick<Reading, "value" | "value2">) => string;
  howTo: string[];
  why: string;
  inSpace: string;
  todo: Record<Level, string>;
  escalate: Partial<Record<Level, "crewmate" | "flight_surgeon">>;
  input: { label: string; min: number; max: number; step: number; placeholder: string }[];
  scheduleHint: string;
  /** Where in-mission readings come from. */
  source: string;
  /** True when a suit sensor sends the reading; false when the crew member reports it. */
  auto: boolean;
  /** Personal pre-flight baseline from the crew member's NASA medical exam (synthetic). */
  baseline: { value: number; value2?: number };
}

export const indicators: Record<IndicatorId, Indicator> = {
  heart_rate: {
    id: "heart_rate",
    name: "Resting heart rate",
    unit: "bpm",
    band: [50, 100],
    chart: [35, 130],
    level: ({ value: v }) => (v >= 50 && v <= 100 ? "steady" : v >= 42 && v <= 115 ? "watch" : "act"),
    format: ({ value }) => `${Math.round(value)}`,
    howTo: [
      "Sit or float still for 5 minutes before measuring.",
      "Use the wrist sensor, or count your pulse at the wrist for 30 seconds and double it.",
      "Don't measure within 30 minutes of exercise.",
    ],
    why: "Shows how hard your heart is working at rest. A steady rise over days can point to stress, illness, dehydration or poor sleep.",
    inSpace: "Without gravity, fluid shifts toward your head and the heart has less work to do, so it can lose some fitness. Daily exercise keeps it strong.",
    todo: {
      steady: "Nothing to do. Keep your exercise and sleep routine.",
      watch: "Rest, drink water and measure again in 30 minutes. Note any symptoms.",
      act: "Stop activity, sit or anchor yourself, and tell a crewmate now. Measure again in 5 minutes.",
    },
    escalate: { act: "flight_surgeon", watch: "crewmate" },
    input: [{ label: "Heart rate", min: 25, max: 220, step: 1, placeholder: "e.g. 64" }],
    scheduleHint: "Morning, before exercise",
    source: "Wrist sensor",
    auto: true,
    baseline: { value: 58 },
  },
  blood_pressure: {
    id: "blood_pressure",
    name: "Blood pressure",
    unit: "mmHg",
    band: [90, 130],
    chart: [80, 170],
    level: ({ value: s, value2: d = 80 }) =>
      s < 90 || s >= 140 || d >= 90 ? "act" : s >= 130 || d >= 85 ? "watch" : "steady",
    format: ({ value, value2 }) => `${Math.round(value)}/${Math.round(value2 ?? 0)}`,
    howTo: [
      "Rest for 5 minutes with feet anchored and arm supported at heart level.",
      "Wrap the cuff on bare upper arm, two fingers above the elbow.",
      "Stay still and quiet while it inflates. Take two readings 1 minute apart.",
    ],
    why: "High pressure strains the heart and vessels; low pressure can make you dizzy or faint, especially when standing up after landing.",
    inSpace: "Fluid shifts change how your body controls pressure. After a long mission or a gravity change, pressure can drop when you stand.",
    todo: {
      steady: "Nothing to do.",
      watch: "Cut salt in the next meals, hydrate and measure again tonight.",
      act: "Sit or anchor yourself. Measure again in 5 minutes; if it stays out of range, contact the flight surgeon.",
    },
    escalate: { act: "flight_surgeon" },
    input: [
      { label: "Systolic (top)", min: 60, max: 240, step: 1, placeholder: "e.g. 118" },
      { label: "Diastolic (bottom)", min: 30, max: 150, step: 1, placeholder: "e.g. 76" },
    ],
    scheduleHint: "Morning, seated and rested",
    source: "Automatic arm cuff",
    auto: true,
    baseline: { value: 114, value2: 74 },
  },
  blood_sugar: {
    id: "blood_sugar",
    name: "Blood sugar",
    unit: "mg/dL",
    band: [70, 99],
    chart: [40, 180],
    level: ({ value: v }) => (v >= 70 && v <= 99 ? "steady" : v >= 60 && v <= 125 ? "watch" : "act"),
    format: ({ value }) => `${Math.round(value)}`,
    howTo: [
      "Measure fasting: before breakfast, at least 8 hours after eating.",
      "Clean the fingertip, prick the side, and touch the strip to the drop.",
      "Capture the lancet and strip right away so nothing floats off.",
    ],
    why: "Your energy source. Too low causes shakiness and confusion; staying high over time can signal changes in how your body handles sugar.",
    inSpace: "Long missions can make the body less sensitive to insulin, especially with less activity. Diet and exercise help keep it steady.",
    todo: {
      steady: "Nothing to do.",
      watch: "Check your last meal and activity. Measure again tomorrow morning, fasting.",
      act: "If below 70: take 15 g of fast sugar now and re-check in 15 minutes. If high: tell a crewmate and contact the flight surgeon.",
    },
    escalate: { act: "flight_surgeon" },
    input: [{ label: "Blood sugar", min: 20, max: 500, step: 1, placeholder: "e.g. 88" }],
    scheduleHint: "Before breakfast",
    source: "Continuous glucose monitor",
    auto: true,
    baseline: { value: 86 },
  },
  temperature: {
    id: "temperature",
    name: "Body temperature",
    unit: "°C",
    band: [36.1, 37.2],
    chart: [35, 39.5],
    level: ({ value: v }) => (v >= 36.1 && v <= 37.2 ? "steady" : v >= 35.5 && v <= 38 ? "watch" : "act"),
    format: ({ value }) => value.toFixed(1),
    howTo: [
      "Wait 15 minutes after eating, drinking or exercise.",
      "Use the forehead or ear thermometer and hold it steady until it beeps.",
    ],
    why: "A fever is often the first sign of infection, which spreads fast in a closed cabin.",
    inSpace: "The immune system changes in spaceflight and dormant viruses can reactivate. Body heat also escapes more slowly without convection, so you may run warmer during exercise.",
    todo: {
      steady: "Nothing to do.",
      watch: "Rest, hydrate and measure again in 2 hours. Wash hands and wipe shared surfaces.",
      act: "Tell the crew, limit close contact, and contact the flight surgeon about treatment.",
    },
    escalate: { act: "flight_surgeon", watch: "crewmate" },
    input: [{ label: "Temperature", min: 30, max: 43, step: 0.1, placeholder: "e.g. 36.7" }],
    scheduleHint: "Morning",
    source: "Skin temperature patch",
    auto: true,
    baseline: { value: 36.6 },
  },
  sleep: {
    id: "sleep",
    name: "Sleep",
    unit: "h",
    band: [7, 9],
    chart: [3, 10],
    level: ({ value: v }) => (v >= 7 ? "steady" : v >= 6 ? "watch" : "act"),
    format: ({ value }) => value.toFixed(1),
    howTo: [
      "Log the hours you actually slept, not the time in your sleeping bag.",
      "Count the night that ended this morning.",
    ],
    why: "Sleep drives reaction time, mood and decision-making. Fatigue is a leading cause of errors on missions.",
    inSpace: "Sunrise every 90 minutes in orbit, noise and a shifted schedule all disrupt your body clock. Crews often sleep under 6 hours.",
    todo: {
      steady: "Nothing to do.",
      watch: "Dim lights an hour before bed, use the eye mask and earplugs, and avoid caffeine after midday.",
      act: "Tell a crewmate and avoid critical tasks if you can. Ask the flight surgeon about adjusting your schedule.",
    },
    escalate: { act: "crewmate" },
    input: [{ label: "Hours slept", min: 0, max: 16, step: 0.25, placeholder: "e.g. 7.5" }],
    scheduleHint: "On waking",
    source: "Sleep tracker",
    auto: true,
    baseline: { value: 7.6 },
  },
  mood: {
    id: "mood",
    name: "Mood",
    unit: "/ 5",
    band: [4, 5],
    chart: [1, 5],
    level: ({ value: v }) => (v >= 4 ? "steady" : v >= 3 ? "watch" : "act"),
    format: ({ value }) => `${Math.round(value)}`,
    howTo: ["Pick the face that best matches how you've felt today, from 1 (very low) to 5 (great).", "There's no wrong answer. It's only useful if it's honest."],
    why: "Isolation and confinement wear people down slowly. Tracking mood shows a trend before it becomes a problem.",
    inSpace: "Months in a small space with the same few people, far from family, raises the risk of low mood, irritability and conflict.",
    todo: {
      steady: "Nothing to do.",
      watch: "Take a break you enjoy, call home if you can, and check in again tomorrow.",
      act: "Talk to a crewmate you trust today. You can also request a private conference with the psychological support team.",
    },
    escalate: { act: "flight_surgeon" },
    input: [{ label: "Mood", min: 1, max: 5, step: 1, placeholder: "1 to 5" }],
    scheduleHint: "Evening",
    source: "Daily check-in",
    auto: false,
    baseline: { value: 4 },
  },
  radiation: {
    id: "radiation",
    name: "Radiation dose",
    unit: "mSv/day",
    band: [0, 0.8],
    chart: [0, 2],
    level: ({ value: v }) => (v <= 0.8 ? "steady" : v <= 1.5 ? "watch" : "act"),
    format: ({ value }) => value.toFixed(2),
    howTo: ["Read today's dose from your personal dosimeter and enter it.", "During a solar storm alert, read it every hour."],
    why: "Radiation damage adds up over a career and raises long-term cancer risk. Spikes during solar storms need shelter fast.",
    inSpace: "Outside Earth's magnetic field there's far more radiation. NASA limits career exposure to 600 mSv.",
    todo: {
      steady: "Nothing to do.",
      watch: "Spend more time in the most shielded area and check for space weather alerts.",
      act: "Move to the storm shelter now and stay until the alert clears. Tell the crew.",
    },
    escalate: { act: "flight_surgeon", watch: "crewmate" },
    input: [{ label: "Dose today", min: 0, max: 50, step: 0.01, placeholder: "e.g. 0.45" }],
    scheduleHint: "End of day",
    source: "Personal dosimeter",
    auto: true,
    baseline: { value: 0.45 },
  },
};

export const indicatorList = Object.values(indicators);

export const levelMeta: Record<Level, { label: string; text: string; bg: string; dot: string }> = {
  steady: { label: "Steady", text: "text-steady", bg: "bg-steady/15", dot: "bg-steady" },
  watch: { label: "Watch", text: "text-watch", bg: "bg-watch/15", dot: "bg-watch" },
  act: { label: "Act now", text: "text-act", bg: "bg-act/15", dot: "bg-act" },
};
