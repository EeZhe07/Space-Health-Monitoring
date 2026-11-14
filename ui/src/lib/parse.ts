import type { HrReading } from "./types.ts";

/** Parses the heart-rate CSV format used in /data. Empty files give an empty list. */
export function parseHrCsv(text: string): HrReading[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = Object.fromEntries(header.map((h, i) => [h, cells[i]]));
    return {
      record_id: row.record_id,
      crew_id: row.crew_id,
      value: Number(row.value),
      unit: row.unit,
      measured_at: row.measured_at,
      context: row.context,
      quality: row.quality,
    };
  });
}
