// Mission environments. Comms delay and dose rates are rounded public figures
// used for the demo, not mission planning values.

export type EnvironmentId = "station" | "spacecraft" | "rover" | "moon" | "mars";

export interface Environment {
  id: EnvironmentId;
  name: string;
  short: string;
  gravity: string;
  /** One-way delay to ground, in seconds. */
  delaySec: number;
  /** Multiplier on the station's typical daily dose. */
  doseFactor: number;
  note: string;
}

export const environments: Environment[] = [
  { id: "station", name: "Space station", short: "Station", gravity: "Microgravity", delaySec: 0.5, doseFactor: 1, note: "Ground support is a few seconds away." },
  { id: "spacecraft", name: "Deep-space spacecraft", short: "Spacecraft", gravity: "Microgravity", delaySec: 90, doseFactor: 1.8, note: "Outside Earth's magnetic field. Expect higher radiation." },
  { id: "rover", name: "Pressurized rover", short: "Rover", gravity: "Moon, 0.16 g", delaySec: 1.3, doseFactor: 1.3, note: "Limited supplies on board. Return to base if something is wrong." },
  { id: "moon", name: "Lunar base", short: "Moon base", gravity: "0.16 g", delaySec: 1.3, doseFactor: 1.4, note: "About a 3-second round trip to ground." },
  { id: "mars", name: "Mars base", short: "Mars base", gravity: "0.38 g", delaySec: 12 * 60, doseFactor: 0.9, note: "Messages take up to 24 minutes each way. The crew acts first." },
];

export function formatDelay(sec: number) {
  if (sec < 5) return `${sec.toFixed(1)} s`;
  if (sec < 120) return `${Math.round(sec)} s`;
  return `${Math.round(sec / 60)} min`;
}
