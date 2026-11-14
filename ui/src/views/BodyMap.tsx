import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMotionOff } from "@/components/motion";
import { indicators, levelMeta, type IndicatorId, type Level } from "@/lib/indicators";
import { useStore } from "@/lib/store";
import { IndicatorDetail, LevelBadge, Page } from "@/components/shared";
import { cn } from "@/lib/utils";

type RegionId = "brain" | "eyes" | "heart" | "metabolism" | "immune" | "musculoskeletal" | "radiation";

interface Region {
  id: RegionId;
  name: string;
  does: string;
  inSpace: string;
  indicators: IndicatorId[];
  /** For parts with no daily number, what keeps them healthy. */
  routine?: string;
}

const regions: Region[] = [
  {
    id: "brain",
    name: "Brain and mind",
    does: "Controls attention, memory, mood and the sleep–wake cycle.",
    inSpace: "Isolation, confinement and a disrupted day–night cycle wear down sleep and mood over months.",
    indicators: ["sleep", "mood"],
  },
  {
    id: "eyes",
    name: "Eyes",
    does: "Turn light into the signals you see with.",
    inSpace: "Fluid shifting toward the head can swell the optic nerve and flatten the back of the eye, blurring vision on long missions.",
    indicators: [],
    routine: "Weekly vision check with the eye chart and the onboard imaging device. Report any blurring straight away.",
  },
  {
    id: "heart",
    name: "Heart and blood vessels",
    does: "Pump blood and oxygen to every part of the body.",
    inSpace: "With no gravity to pump against, the heart can shrink slightly and blood pressure control weakens.",
    indicators: ["heart_rate", "blood_pressure"],
  },
  {
    id: "metabolism",
    name: "Metabolism",
    does: "Turns food into energy and keeps blood sugar steady.",
    inSpace: "Less movement and changes in hormones can make the body less sensitive to insulin.",
    indicators: ["blood_sugar"],
  },
  {
    id: "immune",
    name: "Immune system",
    does: "Lymph nodes and white blood cells find and fight infection.",
    inSpace: "Stress and radiation weaken immune responses; dormant viruses can wake up. A fever is often the first sign.",
    indicators: ["temperature"],
  },
  {
    id: "musculoskeletal",
    name: "Bones and muscles",
    does: "Hold you up, let you move, and store calcium.",
    inSpace: "Without load, bones can lose 1–2% of their mass per month and leg and back muscles shrink.",
    indicators: [],
    routine: "About 2 hours of resistance and cardio exercise every day. Log it in Routine.",
  },
  {
    id: "radiation",
    name: "Whole body: radiation",
    does: "Every cell can be damaged by radiation, adding to long-term cancer risk.",
    inSpace: "Outside Earth's magnetic field, cosmic rays and solar storms raise the dose sharply.",
    indicators: ["radiation"],
  },
];

const rank: Record<Level, number> = { steady: 0, watch: 1, act: 2 };
const fill: Record<Level | "none", string> = {
  steady: "var(--color-steady)",
  watch: "var(--color-watch)",
  act: "var(--color-act)",
  none: "rgb(255 255 255 / 55%)",
};

export function BodyMap() {
  const { levelOf, latest } = useStore();
  const reduce = useMotionOff();
  const bpm = latest("heart_rate")?.value ?? 70;
  const beat = 60 / bpm;
  const [sel, setSel] = useState<RegionId>("brain");
  const [hover, setHover] = useState<RegionId | null>(null);

  const levelOfRegion = (r: Region): Level | null =>
    r.indicators.map(levelOf).reduce<Level | null>((w, l) => (l && (!w || rank[l] > rank[w]) ? l : w), null);

  const region = regions.find((r) => r.id === sel)!;
  const props = (id: RegionId) => {
    const r = regions.find((x) => x.id === id)!;
    const lvl = levelOfRegion(r);
    const active = sel === id || hover === id;
    return {
      role: "button",
      tabIndex: 0,
      "aria-label": `${r.name}: ${lvl ? levelMeta[lvl].label : "no daily reading"}`,
      "aria-pressed": sel === id,
      onClick: () => setSel(id),
      onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(id)),
      onMouseEnter: () => setHover(id),
      onMouseLeave: () => setHover(null),
      style: { color: fill[lvl ?? "none"] },
      className: cn("body-region cursor-pointer outline-none transition-[opacity,filter] duration-300 focus-visible:opacity-100", active ? "opacity-100 drop-shadow-[0_0_10px_currentColor]" : "opacity-70", lvl === "act" && sel !== id && "region-pulse"),
    } as const;
  };

  return (
    <Page title="Body map" intro="Tap a part of the body to see what it does, how spaceflight affects it, and its latest readings. Colours show the worst status in that area.">
      <div className="grid gap-5 lg:grid-cols-[minmax(320px,440px)_1fr]">
        <div className="panel p-6 flex flex-col items-center">
          <svg viewBox="0 0 240 520" className="h-[min(70vh,560px)] w-auto" role="group" aria-label="Human figure">
            {/* radiation aura, whole-body */}
            <g {...props("radiation")}>
<g fill="rgb(255 255 255 / 0.001)" stroke="currentColor" strokeWidth={sel === "radiation" ? 2.4 : 1.4} strokeDasharray="3 5" transform="translate(120 280) scale(1.1) translate(-120 -280)">
                <circle cx="120" cy="58" r="40" />
                <path d="M70 120c10-8 30-12 50-12s40 4 50 12l8 160c-14 16-40 22-58 22s-44-6-58-22z" />
                <path d="M70 124c-18 6-26 20-28 38l-12 110c-1 10 12 13 16 3l18-96z" />
                <path d="M170 124c18 6 26 20 28 38l12 110c1 10-12 13-16 3l-18-96z" />
                <path d="M76 292c14 10 30 14 40 14l-4 170c0 16-28 16-30 0z" />
                <path d="M164 292c-14 10-30 14-40 14l4 170c0 16 28 16 30 0z" />
              </g>
            </g>
            {/* silhouette */}
            <g fill="rgb(255 255 255 / 7%)" stroke="rgb(255 255 255 / 35%)" strokeWidth={1.2}>
              <circle cx="120" cy="58" r="40" />
              <rect x="106" y="94" width="28" height="22" rx="8" />
              <path d="M70 120c10-8 30-12 50-12s40 4 50 12l8 160c-14 16-40 22-58 22s-44-6-58-22z" />
              <path d="M70 124c-18 6-26 20-28 38l-12 110c-1 10 12 13 16 3l18-96z" />
              <path d="M170 124c18 6 26 20 28 38l12 110c1 10-12 13-16 3l-18-96z" />
            </g>
            {/* bones and muscles: legs and arms */}
            <g {...props("musculoskeletal")}>
              <path d="M76 292c14 10 30 14 40 14l-4 170c0 16-28 16-30 0z" fill="currentColor" fillOpacity={0.22} stroke="currentColor" strokeWidth={1.4} />
              <path d="M164 292c-14 10-30 14-40 14l4 170c0 16 28 16 30 0z" fill="currentColor" fillOpacity={0.22} stroke="currentColor" strokeWidth={1.4} />
              <path d="M52 168l-8 92M188 168l8 92" stroke="currentColor" strokeWidth={6} strokeLinecap="round" opacity={0.55} />
            </g>
            {/* brain */}
            <g {...props("brain")}>
              <path d="M88 52c0-20 14-30 32-30s32 10 32 30c0 6-2 10-4 12H92c-2-2-4-6-4-12z" fill="currentColor" fillOpacity={0.3} stroke="currentColor" strokeWidth={1.4} />
              <path d="M120 24v38M104 34c6 4 6 12 0 16M136 34c-6 4-6 12 0 16" stroke="currentColor" strokeWidth={1.2} fill="none" />
            </g>
            {/* eyes */}
            <g {...props("eyes")}>
              <ellipse cx="106" cy="74" rx="8" ry="5" fill="currentColor" fillOpacity={0.35} stroke="currentColor" strokeWidth={1.4} />
              <ellipse cx="134" cy="74" rx="8" ry="5" fill="currentColor" fillOpacity={0.35} stroke="currentColor" strokeWidth={1.4} />
            </g>
            {/* heart */}
            <g {...props("heart")}>
              <motion.path
                d="M132 150c6-10 22-8 22 6 0 14-22 26-22 26s-22-12-22-26c0-14 16-16 22-6z"
                fill="currentColor"
                fillOpacity={0.4}
                stroke="currentColor"
                strokeWidth={1.4}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                animate={reduce ? undefined : { scale: [1, 1.18, 0.97, 1.08, 1] }}
                transition={reduce ? undefined : { duration: beat, times: [0, 0.14, 0.28, 0.42, 1], repeat: Infinity }}
              />
              <path d="M110 200h12l5-10 6 18 5-8h12" stroke="currentColor" strokeWidth={1.4} fill="none" />
            </g>
            {/* metabolism */}
            <g {...props("metabolism")}>
              <ellipse cx="120" cy="248" rx="34" ry="20" fill="currentColor" fillOpacity={0.22} stroke="currentColor" strokeWidth={1.4} />
              <path d="M98 248c8-6 14 6 22 0s14 6 22 0" stroke="currentColor" strokeWidth={1.2} fill="none" />
            </g>
            {/* immune: lymph nodes */}
            <g {...props("immune")}>
              {[
                [104, 108], [136, 108], [84, 140], [156, 140], [100, 292], [140, 292],
              ].map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={6} fill="currentColor" fillOpacity={0.45} stroke="currentColor" strokeWidth={1.2} />
              ))}
            </g>
          </svg>
          <ul className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Body regions">
            {regions.map((r) => {
              const lvl = levelOfRegion(r);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    aria-pressed={sel === r.id}
                    onClick={() => setSel(r.id)}
                    className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors", sel === r.id ? "bg-white/15 text-white" : "text-white/70 hover:text-white")}
                  >
                    <span className={cn("size-2 rounded-full", lvl ? levelMeta[lvl].dot : "bg-white/50")} aria-hidden />
                    {r.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <section className="panel p-6 sm:p-8" aria-live="polite" aria-labelledby="region-title">
          <AnimatePresence mode="wait" initial={false}>
          <motion.div key={sel} className="flex flex-col gap-6" initial={{ opacity: 0, y: 14, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: 0.15 } }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 id="region-title" className="text-2xl font-black tracking-tight">{region.name}</h2>
            <LevelBadge level={levelOfRegion(region)} />
          </div>
          <dl className="grid gap-4 sm:grid-cols-2 text-sm leading-relaxed">
            <div>
              <dt className="font-semibold">What it does</dt>
              <dd className="mt-1 text-white/70">{region.does}</dd>
            </div>
            <div>
              <dt className="font-semibold">In space</dt>
              <dd className="mt-1 text-white/70">{region.inSpace}</dd>
            </div>
          </dl>
          {region.routine && (
            <div className="rounded-2xl bg-white/6 p-4 text-sm">
              <p className="font-medium">No daily number for this one</p>
              <p className="mt-1 text-white/70">{region.routine}</p>
            </div>
          )}
          {region.indicators.map((id) => (
            <div key={id} className="border-t border-white/10 pt-6">
              <IndicatorDetail id={id} compact />
            </div>
          ))}
          {region.indicators.length > 0 && (
            <p className="text-xs text-white/50">
              Learn how to measure {region.indicators.map((i) => indicators[i].name.toLowerCase()).join(" and ")} in the <a className="underline hover:text-white" href="#/guide">Guide</a>.
            </p>
          )}
          </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </Page>
  );
}
