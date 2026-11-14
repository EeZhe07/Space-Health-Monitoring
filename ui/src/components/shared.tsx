import type { ReactNode } from "react";
import { motion } from "motion/react";
import { AnimatedNumber, BeatingHeart, EcgTrace, SplitText } from "./motion";
import ParticleText from "./ParticleText/ParticleText";
import { AlertTriangle, CheckCircle2, Eye, MessageSquareShare, Send, Users } from "lucide-react";
import { indicators, levelMeta, type IndicatorId, type Level, type Reading } from "@/lib/indicators";
import { useNow, useStore } from "@/lib/store";
import { formatDelay } from "@/lib/environments";
import { go } from "@/lib/router";
import { cn } from "@/lib/utils";

export function Page({ title, intro, aside, children }: { title: string; intro: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <main className="relative z-10 mx-auto max-w-[1320px] px-4 sm:px-8 pt-28 pb-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="sr-only">{title}</h1>
          {/* Particle title: gathers in, scatters from the cursor, bursts on click. */}
          <div aria-hidden className="h-[clamp(56px,7vw,92px)] w-[min(86vw,860px)] -ml-0.5 text-white">
            <ParticleText
              text={title}
              align="left"
              fontSize="clamp(2.25rem, 5.2vw, 4rem)"
              fontWeight={900}
              fontFamily="Inter"
              particleSize={1.5}
              density={2}
              maxParticles={9000}
              color="#ffffff"
              highlightColor="#7ff5e6"
              intro="gather"
              scatter={90}
              gatherDuration={1300}
              stagger={360}
              pointerRepel={22}
              repelRadius={70}
              idleDrift={0.25}
              trigger="hover"
              glow
              className="!min-h-0"
            />
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
            <SplitText text={intro} delay={0.35} stagger={0.015} />
          </p>
        </div>
        {aside && (
          <motion.div initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            {aside}
          </motion.div>
        )}
      </header>
      {children}
    </main>
  );
}

const levelIcon = { steady: CheckCircle2, watch: Eye, act: AlertTriangle };

export function LevelBadge({ level, className }: { level: Level | null; className?: string }) {
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
      <button type="button" onClick={() => go("live")} className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-white hover:bg-white/5 transition-colors">
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
      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-black text-black hover:bg-white/90 transition-colors"
    >
      <MessageSquareShare size={16} aria-hidden /> Message flight surgeon
      <span className="text-black/60">· {formatDelay(env.delaySec)} delay</span>
    </button>
  );
}

export function IndicatorDetail({ id, compact = false }: { id: IndicatorId; compact?: boolean }) {
  const { latest, levelOf } = useStore();
  const ind = indicators[id];
  const r = latest(id);
  const level = levelOf(id);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black tracking-tight">{ind.name}</h3>
          <p className="mt-1 text-sm text-white/60">{r ? `Last logged mission day ${r.missionDay}, ${r.at.slice(11, 16)}` : "Not logged yet"}</p>
        </div>
        <LevelBadge level={level} />
      </div>
      {r && (
        <p className="tabular">
          <Value r={r} id={id} className="text-5xl font-black tracking-[-0.04em]" /> <span className="text-white/60">{ind.unit}</span>
          <span className="ml-3 text-sm text-white/60">
            Steady range {ind.band[0]}–{ind.band[1]} {ind.unit}
          </span>
        </p>
      )}
      {id === "heart_rate" && r && <HeartStrip bpm={r.value} />}
      {level && (
        <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className={cn("rounded-2xl p-4", levelMeta[level].bg)}>
          <p className={cn("text-sm font-black", levelMeta[level].text)}>What to do now</p>
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
        <dt className="font-black">How to measure</dt>
        <dd className="mt-1 text-white/70">
          <ol className="list-decimal pl-5 space-y-1">
            {ind.howTo.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </dd>
      </div>
      <div>
        <dt className="font-black">Why it matters</dt>
        <dd className="mt-1 text-white/70">{ind.why}</dd>
      </div>
      <div>
        <dt className="font-black">In space</dt>
        <dd className="mt-1 text-white/70">{ind.inSpace}</dd>
      </div>
    </dl>
  );
}

export const latestValue = (r: Reading | undefined, id: IndicatorId) => (r ? indicators[id].format(r) : "–");

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
