import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { indicators, indicatorList, type IndicatorId, type Level, type Reading } from "./indicators";
import { environments, type Environment, type EnvironmentId } from "./environments";
import { syntheticHistory, TODAY, dayToIso } from "./history";

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
  badges: { id: string; name: string; detail: string; earned: boolean }[];
  messages: Message[];
  sendMessage: (about: Message["about"], text: string) => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);
const KEY = "crew-health-demo-v1";

const base = syntheticHistory();

export function StoreProvider({ children }: { children: ReactNode }) {
  const saved = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {
      return {};
    }
  }, []);
  if (typeof document !== "undefined") document.documentElement.dataset.motion = saved.motionPref ?? "full";
  const [envId, setEnvId] = useState<EnvironmentId>(saved.envId ?? "station");
  const [mine, setMine] = useState<Reading[]>(saved.mine ?? []);
  const [messages, setMessages] = useState<Message[]>(saved.messages ?? []);
  // Animation is on by default; crew can switch it off in the navbar.
  const [motionPref, setMotionPref] = useState<MotionPref>(saved.motionPref ?? "full");

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ envId, mine, messages, motionPref }));
  }, [envId, mine, messages, motionPref]);

  useEffect(() => {
    document.documentElement.dataset.motion = motionPref;
  }, [motionPref]);

  const env = environments.find((e) => e.id === envId)!;

  const readings = useMemo(() => {
    const all = [...base, ...mine].map((r) => (r.indicator === "radiation" && r.source === "synthetic" ? { ...r, value: r.value * env.doseFactor } : r));
    return all.sort((a, b) => a.at.localeCompare(b.at));
  }, [mine, env]);

  const latest = (id: IndicatorId) => readings.findLast((r) => r.indicator === id);
  const levelOf = (id: IndicatorId) => {
    const r = latest(id);
    return r ? indicators[id].level(r) : null;
  };
  const dueToday = indicatorList.map((i) => i.id).filter((id) => !readings.some((r) => r.indicator === id && r.missionDay === TODAY));

  // Gamification: XP for every check-in, streak of complete days, a few badges.
  const xp = 1240 + mine.length * 25;
  const level = Math.floor(xp / 500) + 1;
  const streak = 12 + (dueToday.length === 0 ? 1 : 0);
  const badges = [
    { id: "streak7", name: "Steady orbit", detail: "7 days of complete check-ins", earned: true },
    { id: "first-log", name: "First entry", detail: "Log a measurement yourself", earned: mine.length > 0 },
    { id: "full-day", name: "Full sweep", detail: "Finish every check-in today", earned: dueToday.length === 0 },
    { id: "surgeon", name: "Kept ground in the loop", detail: "Send a flight surgeon update", earned: messages.length > 0 },
    { id: "streak30", name: "Long haul", detail: "30-day streak", earned: false },
  ];

  const value: Store = {
    motionPref,
    setMotionPref,
    env,
    setEnv: setEnvId,
    readings,
    addReading: (indicator, value, value2) => {
      const hour = 7 + mine.filter((m) => m.missionDay === TODAY).length * 0.5;
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
    badges,
    messages,
    sendMessage: (about, text) => {
      const now = Date.now();
      setMessages((m) => [...m, { id: `MSG-${now.toString(36)}`, to: "flight_surgeon", about, text, sentAt: now, arrivesAt: now + env.delaySec * 1000 }]);
    },
    resetDemo: () => {
      setMine([]);
      setMessages([]);
    },
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
