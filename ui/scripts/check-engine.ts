// Runs the demo engine on every scenario in ../data/scenarios and compares it
// with the scenario's *_expected.json. Usage: npm run check
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { evaluate, diffAssessment } from "../src/lib/engine.ts";
import { parseHrCsv } from "../src/lib/parse.ts";

const dir = process.argv[2] ?? join(import.meta.dirname, "..", "..", "data", "scenarios");
const ids = [...new Set(readdirSync(dir).map((f) => f.match(/^scenario_([A-Z])_/)?.[1]).filter(Boolean))].sort() as string[];
let failed = 0;
for (const id of ids) {
  const f = (s: string) => join(dir, `scenario_${id}_${s}`);
  if (!existsSync(f("expected.json"))) continue;
  const expected = JSON.parse(readFileSync(f("expected.json"), "utf8"));
  const readings = existsSync(f("hr.csv")) ? parseHrCsv(readFileSync(f("hr.csv"), "utf8")) : [];
  const events = existsSync(f("events.json")) ? JSON.parse(readFileSync(f("events.json"), "utf8")) : [];
  const actual = evaluate({ readings, events }, expected.evaluated_at, { crewId: expected.crew_id, missionDay: expected.mission_day });
  const diff = diffAssessment(actual, expected);
  if (diff.length) {
    failed++;
    console.log(`✗ ${id}: ${diff.join(", ")}`);
    for (const k of diff) console.log(`   ${k}\n     expected ${JSON.stringify(expected[k])}\n     actual   ${JSON.stringify((actual as any)[k])}`);
  } else console.log(`✓ ${id}`);
}
process.exit(failed ? 1 : 0);
