import { useLayoutEffect, useRef, useState } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { motion } from "motion/react";
import { AnimatedNumber } from "@/components/motion";
import { indicatorList, indicators, levelMeta, type IndicatorId, type Reading } from "@/lib/indicators";
import { useStore } from "@/lib/store";
import { FIRST_DAY, TODAY } from "@/lib/history";
import { LevelBadge, Page } from "@/components/shared";
import { cn } from "@/lib/utils";

const M = { top: 20, right: 20, bottom: 32, left: 48 };
const H = 340;

function avg(rs: Reading[]) {
  return rs.length ? rs.reduce((s, r) => s + r.value, 0) / rs.length : NaN;
}

export function Trends() {
  const { readings, levelOf } = useStore();
  const [id, setId] = useState<IndicatorId>("sleep");
  const [hover, setHover] = useState<Reading | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const ind = indicators[id];
  const rs = readings.filter((r) => r.indicator === id && r.missionDay >= FIRST_DAY);
  const [lo, hi] = ind.chart;
  const iw = Math.max(200, width - M.left - M.right);
  const ih = H - M.top - M.bottom;
  const x = (day: number) => M.left + ((day - FIRST_DAY) / (TODAY - FIRST_DAY)) * iw;
  const y = (v: number) => M.top + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * ih;
  const dayOf = (r: Reading) => r.missionDay + (Number(r.at.slice(11, 13)) - 7) / 48;
  const line = (get: (r: Reading) => number) => rs.map((r, i) => `${i ? "L" : "M"}${x(dayOf(r)).toFixed(1)},${y(get(r)).toFixed(1)}`).join("");

  const last7 = rs.filter((r) => r.missionDay > TODAY - 7);
  const prev7 = rs.filter((r) => r.missionDay <= TODAY - 7 && r.missionDay > TODAY - 14);
  const delta = avg(last7) - avg(prev7);
  const flat = Math.abs(delta) < (hi - lo) * 0.03;
  const Trend = flat ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const outOfRange = last7.filter((r) => ind.level(r) !== "steady").length;
  const ticksY = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);

  return (
    <Page title="Trends" intro="Thirty mission days for each indicator. The shaded band is the steady range; each dot is coloured by its status. Hover or focus a dot for the exact reading.">
      <div role="group" aria-label="Indicator" className="liquid-glass mb-5 inline-flex max-w-full flex-wrap gap-1 rounded-xl p-2">
        {indicatorList.map((i) => (
          <button
            key={i.id}
            type="button"
            aria-pressed={id === i.id}
            onClick={() => setId(i.id)}
            className={cn("flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors", id === i.id ? "bg-white/15 text-white" : "text-white/70 hover:text-white")}
          >
            <span className={cn("size-2 rounded-full", levelOf(i.id) ? levelMeta[levelOf(i.id)!].dot : "bg-white/40")} aria-hidden />
            {i.name}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="panel p-5 sm:p-6" aria-labelledby="trend-title">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="trend-title" className="text-xl font-black">
              {ind.name} <span className="text-white/60 text-base">({ind.unit})</span>
            </h2>
            <span className="text-sm text-white/60">Mission days {FIRST_DAY}–{TODAY}</span>
          </div>
          <div ref={wrap} className="relative mt-4">
            <svg width={width} height={H} role="img" aria-label={`${ind.name} over 30 days. Last 7-day average ${avg(last7).toFixed(1)} ${ind.unit}.`} onMouseLeave={() => setHover(null)}>
              <motion.rect x={M.left} width={iw} fill="rgb(127 224 168 / 9%)" initial={false} animate={{ y: y(ind.band[1]), height: y(ind.band[0]) - y(ind.band[1]) }} transition={{ type: "spring", stiffness: 180, damping: 26 }} />
              <text x={M.left + iw - 6} y={y(ind.band[1]) + 14} textAnchor="end" className="fill-steady text-[11px]">Steady range</text>
              {ticksY.map((v) => (
                <g key={v}>
                  <line x1={M.left} x2={M.left + iw} y1={y(v)} y2={y(v)} stroke="rgb(255 255 255 / 10%)" strokeDasharray="2 4" />
                  <text x={M.left - 8} y={y(v) + 4} textAnchor="end" className="fill-white/55 text-[11px] tabular">{Number.isInteger(v) ? v : v.toFixed(1)}</text>
                </g>
              ))}
              {[FIRST_DAY, 118, 125, 132, TODAY].map((d) => (
                <text key={d} x={x(d)} y={H - 8} textAnchor="middle" className="fill-white/55 text-[11px] tabular">Day {d}</text>
              ))}
              {id === "blood_pressure" && <motion.path key={`${id}-d`} d={line((r) => r.value2 ?? 0)} fill="none" stroke="rgb(255 255 255 / 45%)" strokeWidth={1.5} strokeDasharray="4 3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.6 }} />}
              <motion.path key={id} d={line((r) => r.value)} fill="none" stroke="#fff" strokeWidth={2} strokeLinejoin="round" initial={{ pathLength: 0, opacity: 0.4 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }} />
              {rs.map((r, i) => {
                const lvl = ind.level(r);
                return (
                  <motion.circle
                    key={`${id}-${r.id}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.25 + (i / rs.length) * 1.1 }}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                    cx={x(dayOf(r))}
                    cy={y(r.value)}
                    r={hover === r ? 7 : r.source === "crew_input" ? 6 : 4.5}
                    tabIndex={0}
                    role="img"
                    aria-label={`Day ${r.missionDay}: ${ind.format(r)} ${ind.unit}, ${levelMeta[lvl].label}`}
                    className={cn(levelMeta[lvl].text, "outline-none cursor-pointer")}
                    fill="currentColor"
                    stroke="#0c111c"
                    strokeWidth={r.source === "crew_input" ? 2.5 : 1.5}
                    onMouseEnter={() => setHover(r)}
                    onFocus={() => setHover(r)}
                    onBlur={() => setHover(null)}
                  />
                );
              })}
            </svg>
            {hover && (
              <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-black/80 px-3 py-2 text-sm shadow-xl backdrop-blur" style={{ left: x(dayOf(hover)), top: y(hover.value) - 12 }}>
                <div className="font-medium tabular">
                  {ind.format(hover)} {ind.unit}
                </div>
                <div className="whitespace-nowrap text-white/70">
                  Day {hover.missionDay}, {levelMeta[ind.level(hover)].label}
                  {hover.source === "crew_input" && ", logged by you"}
                </div>
              </div>
            )}
          </div>
          {id === "blood_pressure" && <p className="mt-2 text-xs text-white/60">Solid line: systolic. Dashed line: diastolic. Band shows the steady systolic range.</p>}
        </section>

        <aside className="panel p-6 flex flex-col gap-5 h-fit">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Latest status</span>
            <LevelBadge level={levelOf(id)} />
          </div>
          <div>
            <p className="text-sm text-white/70">Last 7 days average</p>
            <p className="mt-1 text-3xl font-black tracking-[-0.04em] tabular">
              {id === "blood_pressure" ? (
                <>
                  <AnimatedNumber value={avg(last7)} format={(n) => String(Math.round(n))} />/<AnimatedNumber value={avg(last7.map((r) => ({ ...r, value: r.value2 ?? 0 })))} format={(n) => String(Math.round(n))} />
                </>
              ) : (
                <AnimatedNumber value={avg(last7)} format={(n) => ind.format({ value: n })} />
              )}{" "}
              <span className="text-base text-white/60">{ind.unit}</span>
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
              <Trend size={16} aria-hidden />
              {flat ? "About the same as the week before" : `${delta > 0 ? "Up" : "Down"} ${Math.abs(delta).toFixed(id === "temperature" || id === "radiation" || id === "sleep" ? 2 : 0)} ${ind.unit} on the week before`}
            </p>
          </div>
          <p className="text-sm leading-relaxed text-white/70">
            {outOfRange === 0 ? "Every reading this week was in the steady range." : `${outOfRange} of ${last7.length} readings this week were outside the steady range.`}
          </p>
          <p className="text-sm leading-relaxed">{ind.inSpace}</p>
          <a href="#/overview" className="text-sm text-white/70 underline hover:text-white">What to do about it</a>
        </aside>
      </div>
    </Page>
  );
}
