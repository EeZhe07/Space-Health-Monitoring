// Loads every scenario in /data/scenarios at build time. New scenario files
// (e.g. E and F once their PR is merged) show up automatically.
import type { Assessment, CrewEvent, Scenario } from "./types";
import { parseHrCsv } from "./parse";

const files = import.meta.glob("../../../data/scenarios/scenario_*", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const byId = new Map<string, Partial<Record<"hr" | "events" | "expected", string>>>();
for (const [path, text] of Object.entries(files)) {
  const m = path.match(/scenario_([A-Z])_(hr|events|expected)\.(csv|json)$/);
  if (!m) continue;
  const entry = byId.get(m[1]) ?? {};
  entry[m[2] as "hr" | "events" | "expected"] = text;
  byId.set(m[1], entry);
}

export const scenarios: Scenario[] = [...byId.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, f]) => ({
    id,
    readings: f.hr ? parseHrCsv(f.hr) : [],
    events: f.events ? (JSON.parse(f.events) as CrewEvent[]) : [],
    expected: f.expected ? (JSON.parse(f.expected) as Assessment) : null,
  }));

/** Short plain-language names for the scenario picker. */
export const scenarioNames: Record<string, { title: string; detail: string }> = {
  A: { title: "Normal cooldown", detail: "Exercise ends, heart rate settles, sensor stays on." },
  B: { title: "Sensor drops", detail: "Wrist sensor disconnects mid-exercise. No symptoms." },
  C: { title: "Dizzy, no sensor", detail: "Sensor drops, then dizziness is reported." },
  D: { title: "No data, help asked", detail: "No readings at all. Crew member asks for help." },
  E: { title: "C, then a crewmate responds", detail: "Same as C, CM-3 acknowledges the handoff." },
  F: { title: "D, then a crewmate responds", detail: "Same as D, CM-3 acknowledges the handoff." },
};
