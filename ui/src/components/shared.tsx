import type { ReactNode } from "react";
import { motion } from "motion/react";
import { AnimatedNumber, BeatingHeart, EcgTrace, SplitText } from "./motion";
import { AlertTriangle, CheckCircle2, CircleHelp, Eye, MessageSquareShare, Plug, Send, Unplug, Users } from "lucide-react";
import { indicators, levelMeta, type IndicatorId, type Level, type Reading } from "@/lib/indicators";
import { useNow, useStore } from "@/lib/store";
import { formatDelay } from "@/lib/environments";
import { go } from "@/lib/router";
import { cn } from "@/lib/utils";
import { assessRestingValue, restingRef, thresholds } from "@/lib/teamData";

export function Page({ title, intro, aside, children }: { title: string; intro: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <main className="relative z-10 mx-auto max-w-[1320px] px-4 sm:px-8 pt-28 pb-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-white text-3xl sm:text-4xl lg:text-6xl font-black leading-[1.04] tracking-[-0.04em]">
            <SplitText text={title} delay={0} stagger={0.025} />
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
            <SplitText text={intro} delay={0.1} stagger={0.006} />
          </p>
        </div>
        {aside && (
          <motion.div initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}>
            {aside}
          </motion.div>
        )}
      </header>
      {children}
    </main>
  );
}

const levelIcon = { steady: CheckCircle2, watch: Eye, act: AlertTriangle };

export function LevelBadge({ level, unknown = false, className }: { level: Level | null; unknown?: boolean; className?: string }) {
  if (unknown)
    return (
      <span className={cn("relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-watch/50 px-2.5 py-1 text-xs font-semibold text-watch", className)}>
        <span className="hatch absolute inset-0 opacity-30" aria-hidden />
        <CircleHelp size={13} className="relative" aria-hidden />
        <span className="relative">Unknown</span>
      </span>
    );
  if (!level) return <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70", className)}>Not logged</span>;
  const m = levelMeta[level];
  const Icon = levelIcon[level];
  return (
    <motion.span
      key={level}
      initial={{ opacity: 0, scale: 0.85, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", m.bg, m.text, className)}
    >
      <Icon size={13} aria-hidden />
      {m.label}
    </motion.span>
  );
}

export function Sparkline({ id, days = 14, className }: { id: IndicatorId; days?: number; className?: string }) {
  const { readings } = useStore();
  const ind = indicators[id];
  const rs = readings.filter((r) => r.indicator === id).slice(-days);
  if (rs.length < 2) return <div className={cn("h-10", className)} />;
  const W = 160, H = 40;
  const [lo, hi] = ind.chart;
  const x = (i: number) => (i / (rs.length - 1)) * W;
  const y = (v: number) => H - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * H;
  const d = rs.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r.value).toFixed(1)}`).join("");
  const last = rs[rs.length - 1];
  const lvl = ind.level(last);
  return (
    <svg viewBox={`-3 -3 ${W + 6} ${H + 6}`} className={cn("h-10 w-full", className)} aria-hidden preserveAspectRatio="none">
      <rect x={0} y={y(ind.band[1])} width={W} height={Math.max(0, y(ind.band[0]) - y(ind.band[1]))} fill="rgb(255 255 255 / 6%)" />
      <motion.path d={d} fill="none" stroke="rgb(255 255 255 / 75%)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }} />
      <motion.circle cx={x(rs.length - 1)} cy={y(last.value)} r={3} className={levelMeta[lvl].text} fill="currentColor" initial={{ scale: 0 }} animate={{ scale: [0, 1.6, 1] }} transition={{ duration: 0.6, delay: 1.1 }} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
    </svg>
  );
}

/** Message the flight surgeon or alert a crewmate, depending on what the status calls for. */
export function Escalate({ id, level }: { id: IndicatorId; level: Level | null }) {
  const { env, messages, sendMessage, latest } = useStore();
  const now = useNow();
  if (!level) return null;
  const who = indicators[id].escalate[level];
  if (!who) return null;
  if (who === "crewmate") {
    return (
      <button type="button" onClick={() => go("live")} className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5 transition-colors">
        <Users size={16} aria-hidden /> Tell a crewmate
      </button>
    );
  }
  const sent = messages.findLast((m) => m.about === id);
  if (sent) {
    const left = Math.max(0, Math.ceil((sent.arrivesAt - now) / 1000));
    return (
      <p role="status" className="inline-flex items-center gap-2 rounded-full bg-info/15 px-4 py-2.5 text-sm text-info">
        <Send size={15} aria-hidden />
        {left > 0 ? `Sent. Reaches the ground in ${formatDelay(left)}` : "Delivered to the flight surgeon"}
      </p>
    );
  }
  const r = latest(id);
  return (
    <button
      type="button"
      onClick={() => sendMessage(id, `${indicators[id].name}: ${r ? indicators[id].format(r) : "?"} ${indicators[id].unit} (${levelMeta[level].label})`)}
      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
    >
      <MessageSquareShare size={16} aria-hidden /> Message flight surgeon
      <span className="text-black/60">· {formatDelay(env.delaySec)} delay</span>
    </button>
  );
}

export function IndicatorDetail({ id, compact = false }: { id: IndicatorId; compact?: boolean }) {
  const { latest, levelOf, freshness, setOffline, offline } = useStore();
  const ind = indicators[id];
  const r = latest(id);
  const level = levelOf(id);
  const fresh = freshness(id);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black tracking-tight">{ind.name}</h3>
          <p className="mt-1 text-sm text-white/60">
            {r ? `${r.source === "crew_input" ? "Entered by you" : ind.source}, mission day ${r.missionDay}, ${r.at.slice(11, 16)}` : ind.auto ? `Waiting for the ${ind.source.toLowerCase()}` : "Not checked in yet today"}
          </p>
        </div>
        <LevelBadge level={level} unknown={fresh.unknown} />
      </div>
      {fresh.unknown && (
        <div className="relative overflow-hidden rounded-2xl border border-watch/40 p-4">
          <span className="hatch absolute inset-0 opacity-10" aria-hidden />
          <div className="relative">
            <p className="flex items-center gap-2 text-sm font-semibold text-watch">
              <Unplug size={15} aria-hidden /> We can't confirm your {ind.name.toLowerCase()} right now
            </p>
            <p className="mt-1 text-sm text-white/85">
              {fresh.reason}.{r ? ` The last trusted reading was ${ind.format(r)} ${ind.unit} at ${r.at.slice(11, 16)}; treat it as history, not as how you are now.` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <p className="basis-full text-sm text-white/70">Reattach or replace the sensor, or ask a crewmate to help. The reading fills in again by itself.</p>
              {offline[id] && (
                <button type="button" onClick={() => setOffline(id, false)} className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 transition-colors">
                  <Plug size={14} aria-hidden /> Sensor reconnected
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {r && !fresh.unknown && (
        <p className="tabular">
          <Value r={r} id={id} className="text-5xl font-black tracking-[-0.04em]" /> <span className="text-white/60">{ind.unit}</span>
          <span className="ml-3 text-sm text-white/60">
            Steady range {ind.band[0]}–{ind.band[1]} {ind.unit}
          </span>
        </p>
      )}
      {id !== "radiation" && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-white/6 px-4 py-3 text-sm">
          <span>
            <span className="text-white/60">{id === "heart_rate" ? "Your normal " : "Pre-flight baseline "}</span>
            <span className="font-semibold tabular">
              {ind.format(ind.baseline)} {ind.unit}
            </span>
          </span>
          {baselineDelta(id, r) && <span className="text-white/80">{baselineDelta(id, r)}</span>}
          <span className="basis-full text-xs text-white/50">
            {id === "heart_rate" && restingRef
              ? `Median of ${restingRef.n_used} resting readings, mission days ${restingRef.window_days[0]}-${restingRef.window_days[1]}`
              : "Synthetic demo baseline"}
          </span>
          {id === "heart_rate" && r && !fresh.unknown && (
            <span className="basis-full pt-1 text-sm text-white/85">{assessRestingValue(r.value, r.at)?.reason}</span>
          )}
          {id === "heart_rate" && (
            <span className="basis-full text-xs text-white/50">
              Exercise zone {thresholds.exercise_hr_zone.zone_bpm[0]}-{thresholds.exercise_hr_zone.zone_bpm[1]} bpm ({thresholds.exercise_hr_zone.zone_percent_of_max[0]}-{thresholds.exercise_hr_zone.zone_percent_of_max[1]}% of max, NASA ISS guidance)
            </span>
          )}
        </div>
      )}
      {id === "heart_rate" && r && !fresh.unknown && <HeartStrip bpm={r.value} />}
      {ind.auto && !offline[id] && (
        <button type="button" onClick={() => setOffline(id, true)} className="self-start text-xs text-white/50 underline decoration-white/20 hover:text-white">
          Demo: simulate the {ind.source.toLowerCase()} disconnecting
        </button>
      )}
      {level && (
        <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className={cn("rounded-2xl p-4", levelMeta[level].bg)}>
          <p className={cn("text-sm font-semibold", levelMeta[level].text)}>What to do now</p>
          <p className="mt-1 text-sm leading-relaxed text-white/90">{ind.todo[level]}</p>
          <div className="mt-3">
            <Escalate id={id} level={level} />
          </div>
        </motion.div>
      )}
      {!compact && <Explainer id={id} />}
    </div>
  );
}

export function Explainer({ id }: { id: IndicatorId }) {
  const ind = indicators[id];
  return (
    <dl className="grid gap-4 text-sm leading-relaxed">
      <div>
        <dt className="font-semibold">How to measure</dt>
        <dd className="mt-1 text-white/70">
          <ol className="list-decimal pl-5 space-y-1">
            {ind.howTo.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </dd>
      </div>
      <div>
        <dt className="font-semibold">Why it matters</dt>
        <dd className="mt-1 text-white/70">{ind.why}</dd>
      </div>
      <div>
        <dt className="font-semibold">In space</dt>
        <dd className="mt-1 text-white/70">{ind.inSpace}</dd>
      </div>
    </dl>
  );
}

export const latestValue = (r: Reading | undefined, id: IndicatorId) => (r ? indicators[id].format(r) : "–");

/** How a reading compares with the crew member's pre-flight baseline, e.g. "+8 vs baseline". */
export function baselineDelta(id: IndicatorId, r: Reading | undefined) {
  if (!r || id === "radiation") return null;
  const ind = indicators[id];
  // Heart rate uses the team's rule: percent change from your normal.
  if (id === "heart_rate") {
    const pct = Math.round(((r.value - ind.baseline.value) / ind.baseline.value) * 100);
    return pct === 0 ? "At your normal" : `${pct > 0 ? "+" : ""}${pct}% vs your normal`;
  }
  const d = r.value - ind.baseline.value;
  if (Math.abs(d) < (ind.chart[1] - ind.chart[0]) * 0.015) return "At your baseline";
  const step = id === "temperature" || id === "sleep" ? d.toFixed(1) : String(Math.round(d));
  return `${d > 0 ? "+" : ""}${step} ${ind.unit} vs baseline`;
}

/** Indicator value that counts smoothly when it changes. */
export function Value({ r, id, className }: { r: Reading | undefined; id: IndicatorId; className?: string }) {
  if (!r) return <span className={className}>–</span>;
  const ind = indicators[id];
  if (id === "blood_pressure")
    return (
      <span className={className}>
        <AnimatedNumber value={r.value} format={(n) => String(Math.round(n))} />/<AnimatedNumber value={r.value2 ?? 0} format={(n) => String(Math.round(n))} />
      </span>
    );
  return <AnimatedNumber className={className} value={r.value} format={(n) => ind.format({ value: n })} />;
}

/** Live heart strip: beating heart plus an ECG trace paced to the latest heart rate. */
export function HeartStrip({ bpm, className }: { bpm: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BeatingHeart bpm={bpm} className="shrink-0 text-act" />
      <EcgTrace bpm={bpm} className="h-8 w-full text-act" />
    </div>
  );
}
