import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { indicators, indicatorList, sensorOf, type IndicatorId, type Level, type Reading } from "./indicators";
import { environments, type Environment, type EnvironmentId } from "./environments";
import { syntheticHistory, TODAY, dayToIso, NOW_ISO } from "./history";
import { computeAlerts, type TrendAlert } from "./trends";

export interface Message {
  id: string;
  to: "flight_surgeon";
  about: IndicatorId | "general";
  text: string;
  sentAt: number;
  arrivesAt: number;
}

export type MotionPref = "full" | "reduced";

interface Store {
  motionPref: MotionPref;
  setMotionPref: (m: MotionPref) => void;
  env: Environment;
  setEnv: (id: EnvironmentId) => void;
  readings: Reading[];
  addReading: (indicator: IndicatorId, value: number, value2?: number) => Reading;
  latest: (id: IndicatorId) => Reading | undefined;
  levelOf: (id: IndicatorId) => Level | null;
  dueToday: IndicatorId[];
  xp: number;
  level: number;
  streak: number;
  messages: Message[];
  sendMessage: (about: Message["about"], text: string) => void;
  resetDemo: () => void;
  /** Sensors reported offline, with the time they dropped. */
  offline: Partial<Record<IndicatorId, string>>;
  setOffline: (id: IndicatorId, on: boolean) => void;
  /** Whether the current value can be trusted, and why not. */
  freshness: (id: IndicatorId) => { unknown: boolean; reason: string | null };
  alerts: TrendAlert[];
  plan: Record<string, boolean>;
  togglePlan: (id: string) => void;
  waterMl: number;
  addWater: (ml: number) => void;
  /** Emergency screen: one tap, opens instantly and alerts crew and ground. */
  emergency: { open: boolean; startedAt: number };
  startEmergency: () => void;
  endEmergency: () => void;
}

const Ctx = createContext<Store | null>(null);
const KEY = "crew-health-demo-v1";
// Stored on its own key. v2 resets everyone to "animations on" once, because the
// old unlabelled pause button was easy to switch off without noticing.
const MOTION_KEY = "crew-health-motion-v2";
const savedMotion = (): MotionPref => (localStorage.getItem(MOTION_KEY) === "reduced" ? "reduced" : "full");

const base = syntheticHistory();

export function StoreProvider({ children }: { children: ReactNode }) {
  const saved = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {
      return {};
    }
  }, []);
  if (typeof document !== "undefined") document.documentElement.dataset.motion = savedMotion();
  const [envId, setEnvId] = useState<EnvironmentId>(saved.envId ?? "station");
  const [mine, setMine] = useState<Reading[]>(saved.mine ?? []);
  const [messages, setMessages] = useState<Message[]>(saved.messages ?? []);
  // Demo: the glucose monitor dropped out this morning, so one card shows "Unknown".
  const [offline, setOfflineMap] = useState<Partial<Record<IndicatorId, string>>>(saved.offline ?? { blood_sugar: dayToIso(TODAY, 7 + 40 / 60) });
  const [plan, setPlan] = useState<Record<string, boolean>>(saved.plan ?? { resistance: true });
  const [waterMl, setWaterMl] = useState<number>(saved.waterMl ?? 1000);
  const [emergency, setEmergency] = useState({ open: false, startedAt: 0 });
  // Animation is on by default; crew can switch it off in the navbar.
  const [motionPref, setMotionPref] = useState<MotionPref>(savedMotion);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ envId, mine, messages, offline, plan, waterMl }));
  }, [envId, mine, messages, offline, plan, waterMl]);

  useEffect(() => {
    localStorage.setItem(MOTION_KEY, motionPref);
  }, [motionPref]);

  useEffect(() => {
    document.documentElement.dataset.motion = motionPref;
  }, [motionPref]);

  const env = environments.find((e) => e.id === envId)!;

  const readings = useMemo(() => {
    const all = [...base, ...mine].map((r) => (r.indicator === "radiation" && r.source === "synthetic" ? { ...r, value: r.value * env.doseFactor } : r));
    return all.sort((a, b) => a.at.localeCompare(b.at));
  }, [mine, env]);

  const latest = (id: IndicatorId) => readings.findLast((r) => r.indicator === id);
  // A value is only trusted if its sensor is online (or it was entered by hand
  // after the sensor dropped) and it is less than a day old.
  const freshness = (id: IndicatorId) => {
    const ind = indicators[id];
    const r = latest(id);
    const since = offline[sensorOf(id)];
    if (ind.auto && since && !(r && r.source === "crew_input" && r.at > since)) {
      return { unknown: true, reason: `${ind.source} disconnected at ${since.slice(11, 16)}` };
    }
    if (r && Date.parse(NOW_ISO) - Date.parse(r.at) > 30 * 3_600_000) {
      return { unknown: true, reason: `No reading for ${Math.round((Date.parse(NOW_ISO) - Date.parse(r.at)) / 3_600_000)} h` };
    }
    return { unknown: false, reason: null };
  };
  const levelOf = (id: IndicatorId) => {
    const r = latest(id);
    if (!r || freshness(id).unknown) return null;
    return indicators[id].level(r);
  };
  const alerts = useMemo(() => computeAlerts(readings), [readings]);
  const dueToday = indicatorList.map((i) => i.id).filter((id) => !readings.some((r) => r.indicator === id && r.missionDay === TODAY));
  // Gamification: XP for activity and a streak of days with the prevention plan done.
  const xp = 1240 + mine.length * 25 + Object.values(plan).filter(Boolean).length * 10;
  const level = Math.floor(xp / 500) + 1;
  // The daily habits that count toward the streak.
  const planDone = ["resistance", "cardio", "sleep-window"].every((k) => plan[k]) && waterMl >= 2500;
  const streak = 12 + (planDone ? 1 : 0);
  const value: Store = {
    motionPref,
    setMotionPref,
    env,
    setEnv: setEnvId,
    readings,
    addReading: (indicator, value, value2) => {
      // Hand entries are stamped "now" (ship time), a minute apart.
      const hour = 14 + 10 / 60 + mine.filter((m) => m.missionDay === TODAY).length / 60;
      const r: Reading = { id: `CREW-${Date.now().toString(36)}`, indicator, value, value2, at: dayToIso(TODAY, hour), missionDay: TODAY, source: "crew_input" };
      setMine((m) => [...m, r]);
      return r;
    },
    latest,
    levelOf,
    dueToday,
    xp,
    level,
    streak,
    messages,
    sendMessage: (about, text) => {
      const now = Date.now();
      setMessages((m) => [...m, { id: `MSG-${now.toString(36)}`, to: "flight_surgeon", about, text, sentAt: now, arrivesAt: now + env.delaySec * 1000 }]);
    },
    resetDemo: () => {
      setMine([]);
      setMessages([]);
      setOfflineMap({ blood_sugar: dayToIso(TODAY, 7 + 40 / 60) });
      setPlan({ resistance: true });
      setWaterMl(1000);
    },
    offline,
    setOffline: (id, on) =>
      setOfflineMap((m) => {
        const next = { ...m };
        if (on) next[id] = NOW_ISO;
        else delete next[id];
        return next;
      }),
    freshness,
    alerts,
    plan,
    togglePlan: (id) => setPlan((p) => ({ ...p, [id]: !p[id] })),
    waterMl,
    addWater: (ml) => setWaterMl((w) => Math.max(0, Math.min(4000, w + ml))),
    emergency,
    startEmergency: () => setEmergency((e) => (e.open ? e : { open: true, startedAt: Date.now() })),
    endEmergency: () => setEmergency({ open: false, startedAt: 0 }),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

/** Re-renders every second, for live countdowns. */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}
