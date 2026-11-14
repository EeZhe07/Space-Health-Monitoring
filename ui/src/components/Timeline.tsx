import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Hand, Pause, Play, RotateCcw, ShieldCheck, Stethoscope, Unplug } from "lucide-react";
import type { CrewEvent, HrReading } from "@/lib/types";
import { eventTime, hhmm, ms, VALIDITY_WINDOW_MIN } from "@/lib/engine";
import { Button } from "./Button";
import { cn, contextLabel } from "@/lib/utils";

const STEP = 30_000;
const M = { top: 44, right: 20, bottom: 30, left: 44 };
const H = 300;
const Y_MIN = 40;
const Y_MAX = 180;

const eventMeta: Record<CrewEvent["type"], { icon: typeof Hand; label: (e: CrewEvent) => string; tone: string }> = {
  sensor_disconnected: { icon: Unplug, label: () => "Wrist sensor disconnected", tone: "border-gold text-amber" },
  symptom_report: {
    icon: Stethoscope,
    label: (e) => (e.type === "symptom_report" ? `Symptom reported: ${e.symptom}` : ""),
    tone: "border-rose text-rose",
  },
  assistance_requested: { icon: Hand, label: (e) => `Help requested by ${"by" in e ? e.by : ""}`, tone: "border-rose text-rose" },
  handoff_acknowledged: { icon: ShieldCheck, label: (e) => `Handoff acknowledged by ${"by" in e ? e.by : ""}`, tone: "border-navy text-navy" },
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(720);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function Timeline({
  readings,
  events,
  start: fullStart,
  end,
  playhead,
  onSeek,
  playing,
  onTogglePlay,
  highlight,
}: {
  readings: HrReading[];
  events: CrewEvent[];
  start: number;
  end: number;
  playhead: number;
  onSeek: (t: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
  highlight: string[];
}) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<HrReading | null>(null);
  const [zoom, setZoom] = useState<"recent" | "all">("recent");
  const recentStart = Math.max(fullStart, end - 15 * 60_000);
  const canZoom = recentStart > fullStart;
  // Expand automatically if the playhead moves before the recent window.
  const start = zoom === "recent" && playhead >= recentStart ? recentStart : fullStart;
  const dragging = useRef(false);

  const innerW = Math.max(200, width - M.left - M.right);
  const innerH = H - M.top - M.bottom;
  const x = (t: number) => M.left + ((t - start) / (end - start)) * innerW;
  const y = (v: number) => M.top + (1 - (Math.min(Math.max(v, Y_MIN), Y_MAX) - Y_MIN) / (Y_MAX - Y_MIN)) * innerH;
  const tAt = (px: number) => {
    const t = start + ((px - M.left) / innerW) * (end - start);
    return Math.min(end, Math.max(start, Math.round((t - start) / STEP) * STEP + start));
  };

  const past = readings.filter((r) => ms(r.measured_at) <= playhead);
  const last = past[past.length - 1];
  const validUntil = last ? ms(last.measured_at) + VALIDITY_WINDOW_MIN * 60_000 : start;
  const unknownFrom = last ? Math.min(validUntil, playhead) : start;
  const unknownMin = Math.round((playhead - (last ? validUntil : start)) / 60_000);

  // Contiguous runs of the same context (exercise / post_exercise) become background bands.
  const bands = useMemo(() => {
    const out: { context: string; from: number; to: number }[] = [];
    readings.forEach((r, i) => {
      const t = ms(r.measured_at);
      const next = readings[i + 1] ? ms(readings[i + 1].measured_at) : t + 60_000;
      const prev = out[out.length - 1];
      if (prev && prev.context === r.context) prev.to = next;
      else out.push({ context: r.context, from: t, to: next });
    });
    return out;
  }, [readings]);

  const path = (rs: HrReading[]) => rs.map((r, i) => `${i ? "L" : "M"}${x(ms(r.measured_at)).toFixed(1)},${y(r.value).toFixed(1)}`).join("");
  const futureFrom = readings.findIndex((r) => ms(r.measured_at) > playhead);
  const future = futureFrom >= 0 ? readings.slice(Math.max(0, futureFrom - 1)) : [];

  const ticks = useMemo(() => {
    const out: number[] = [];
    const every = end - start > 20 * 60_000 ? 600_000 : 120_000;
    const first = Math.ceil(start / every) * every;
    for (let t = first; t <= end; t += every) out.push(t);
    return out;
  }, [start, end]);

  function pointer(e: React.PointerEvent<SVGSVGElement>, type: "down" | "move" | "up") {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    if (type === "down") {
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (type === "up") dragging.current = false;
    if (dragging.current) onSeek(tAt(px));
    // nearest reading for the tooltip
    let best: HrReading | null = null;
    let bestD = 24;
    for (const r of readings) {
      const d = Math.abs(x(ms(r.measured_at)) - px);
      if (d < bestD) (best = r), (bestD = d);
    }
    setHover(best);
  }

  const lit = new Set(highlight);
  const sortedEvents = [...events].sort((a, b) => ms(eventTime(a)) - ms(eventTime(b)));

  return (
    <section aria-labelledby="timeline-title" className="panel p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="timeline-title" className="text-[22px] font-black tracking-[-0.01em]">Heart rate</h2>
          <p className="mt-1 text-sm text-ink-2 max-w-[56ch]">
            The line stops at the last trusted reading. Hatching shows time with no trusted value.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {canZoom && (
            <div role="group" aria-label="Time range" className="inline-flex rounded-full bg-white/8 p-1 text-sm">
              {(["recent", "all"] as const).map((z) => (
                <button
                  key={z}
                  type="button"
                  aria-pressed={zoom === z}
                  onClick={() => setZoom(z)}
                  className={cn("relative rounded-full px-3 h-9 transition-colors", zoom === z ? "text-ink font-black" : "text-ink-3 hover:text-ink")}
                >
                  {zoom === z && <motion.span layoutId="zoom-pill" className="absolute inset-0 rounded-full bg-white/15" transition={{ type: "spring", stiffness: 380, damping: 30 }} aria-hidden />}
                  <span className="relative">{z === "recent" ? "Last 15 min" : "Whole session"}</span>
                </button>
              ))}
            </div>
          )}
          <Legend />
        </div>
      </div>

      <div ref={wrapRef} className="relative mt-6 select-none touch-none">
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`Heart rate from ${hhmm(new Date(start).toISOString())} to ${hhmm(new Date(end).toISOString())}. ${last ? `Last trusted reading ${last.value} bpm at ${hhmm(last.measured_at)}.` : "No readings."}`}
          className="block cursor-ew-resize"
          onPointerDown={(e) => pointer(e, "down")}
          onPointerMove={(e) => pointer(e, "move")}
          onPointerUp={(e) => pointer(e, "up")}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <clipPath id="plot">
              <rect x={M.left} y={0} width={innerW} height={H} />
            </clipPath>
            <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="2.2" height="7" fill="var(--color-gold)" opacity="0.45" />
            </pattern>
            <linearGradient id="valid" x1="0" x2="1">
              <stop offset="0" stopColor="var(--color-sage)" stopOpacity="0.22" />
              <stop offset="1" stopColor="var(--color-sage)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g clipPath="url(#plot)">
          {/* context bands */}
          {bands.map((b) => (
            <g key={b.from}>
              <rect x={x(b.from)} y={M.top} width={Math.max(0, x(b.to) - x(b.from))} height={innerH} fill={b.context === "exercise" ? "rgb(255 255 255 / 4%)" : "rgb(127 224 168 / 6%)"} />
              <text x={x(b.from) + 8} y={M.top + 18} className="fill-ink-3 text-[12px]">
                {b.context === "exercise" ? "Exercise" : b.context === "post_exercise" ? "Cooldown" : contextLabel[b.context] ?? b.context}
              </text>
            </g>
          ))}

          </g>
          {/* grid */}
          {[60, 100, 140, 180].map((v) => (
            <g key={v}>
              <line x1={M.left} x2={M.left + innerW} y1={y(v)} y2={y(v)} stroke="rgb(255 255 255 / 14%)" strokeDasharray={v === 180 ? undefined : "2 4"} />
              <text x={M.left - 10} y={y(v) + 4} textAnchor="end" className="fill-ink-3 text-[12px] tabular">{v}</text>
            </g>
          ))}
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={H - 8} textAnchor="middle" className="fill-ink-3 text-[12px] tabular">
              {hhmm(new Date(t).toISOString())}
            </text>
          ))}

          <g clipPath="url(#plot)">
          {/* validity window + unknown zone */}
          {last && (
            <rect x={x(ms(last.measured_at))} y={M.top} width={Math.max(0, x(Math.min(validUntil, Math.max(playhead, ms(last.measured_at)))) - x(ms(last.measured_at)))} height={innerH} fill="url(#valid)" />
          )}
          {playhead > (last ? validUntil : start) && (
            <g>
              <motion.rect
                x={x(unknownFrom)}
                y={M.top}
                height={innerH}
                fill="url(#hatch)"
                initial={false}
                animate={{ width: Math.max(0, x(playhead) - x(unknownFrom)) }}
                transition={{ type: "spring", stiffness: 260, damping: 32 }}
              />
              <line x1={x(unknownFrom)} x2={x(unknownFrom)} y1={M.top} y2={M.top + innerH} stroke="var(--color-gold)" strokeWidth={1.5} />
              {x(playhead) - x(unknownFrom) > 70 && (
                <text x={(x(unknownFrom) + x(playhead)) / 2} y={M.top + innerH / 2} textAnchor="middle" className="fill-amber text-[13px] font-black">
                  {last ? `Unknown for ${unknownMin} min` : "No readings"}
                </text>
              )}
            </g>
          )}

          {/* trace */}
          {future.length > 1 && <path d={path(future)} fill="none" stroke="var(--color-ink-3)" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="3 4" />}
          {past.length > 1 && <path d={path(past)} fill="none" stroke="#ffffff" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />}
          {past.map((r) => {
            const isLast = r === last;
            const isLit = lit.has(r.record_id);
            if (!isLast && !isLit && hover !== r) return null;
            return (
              <g key={r.record_id}>
                {isLit && (
                  <><circle cx={x(ms(r.measured_at))} cy={y(r.value)} r={10} fill="#ffffff" fillOpacity={0.18} stroke="#ffffff" strokeWidth={1.5} /><circle className="hl-ring" cx={x(ms(r.measured_at))} cy={y(r.value)} r={13} fill="none" stroke="#ffffff" strokeWidth={2} /></>
                )}
                <circle cx={x(ms(r.measured_at))} cy={y(r.value)} r={isLast ? 5.5 : 4} fill="#0c111c" stroke="#ffffff" strokeWidth={2.25} />
              </g>
            );
          })}

          </g>
          {/* playhead */}
          <line x1={x(playhead)} x2={x(playhead)} y1={M.top - 8} y2={M.top + innerH} stroke="#ffffff" strokeWidth={1.5} />
        </svg>

        {/* playhead time chip */}
        <div className="pointer-events-none absolute -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-xs font-black text-black tabular" style={{ left: x(playhead), top: M.top - 30 }}>
          {hhmm(new Date(playhead).toISOString())}
        </div>

        {/* event pins: real buttons so they're reachable by keyboard */}
        {sortedEvents.map((e, i) => {
          const t = ms(eventTime(e));
          const meta = eventMeta[e.type];
          const Icon = meta.icon;
          const isPast = t <= playhead;
          if (t < start) return null;
          return (
            <button
              key={e.event_id + i}
              type="button"
              onClick={() => onSeek(t)}
              title={`${meta.label(e)} at ${hhmm(eventTime(e))}`}
              aria-label={`${meta.label(e)} at ${hhmm(eventTime(e))}. Jump here.`}
              className={cn(
                "absolute -translate-x-1/2 grid size-8 place-items-center rounded-full border-2 bg-paper transition-[opacity,transform,box-shadow] hover:scale-110",
                meta.tone,
                !isPast && "opacity-35",
                lit.has(e.event_id) && "scale-125 shadow-[0_0_0_6px_rgba(255,255,255,0.18)]",
              )}
              style={{ left: x(t), top: M.top + innerH - 40 - (i % 2) * 40 }}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          );
        })}

        {/* hover tooltip */}
        {hover && ms(hover.measured_at) >= start && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[10px] border border-line-strong bg-paper px-3 py-2 text-sm shadow-xl"
            style={{ left: x(ms(hover.measured_at)), top: y(hover.value) - 14 }}
          >
            <div className="font-black tabular">{hover.value} bpm</div>
            <div className="text-ink-2 whitespace-nowrap">
              {hhmm(hover.measured_at)}, {contextLabel[hover.context] ?? hover.context}
              {ms(hover.measured_at) > playhead && " (not yet received)"}
            </div>
          </div>
        )}
      </div>

      {/* replay controls */}
      <div className="mt-5 flex items-center gap-3">
        <Button size="icon" variant="solid" onClick={onTogglePlay} aria-label={playing ? "Pause replay" : playhead >= end ? "Replay from start" : "Play replay"}>
          {playing ? <Pause className="size-5" /> : playhead >= end ? <RotateCcw className="size-5" /> : <Play className="size-5 translate-x-px" />}
        </Button>
        <label className="flex-1">
          <span className="sr-only">Replay time</span>
          <input
            type="range"
            min={fullStart}
            max={end}
            step={STEP}
            value={playhead}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-valuetext={hhmm(new Date(playhead).toISOString())}
            className="scrubber w-full"
            style={{ ["--p" as string]: `${((playhead - fullStart) / (end - fullStart)) * 100}%` }}
          />
        </label>
        <span className="text-sm text-ink-2 tabular w-[96px] text-right">
          {hhmm(new Date(playhead).toISOString())} UTC
        </span>
      </div>
    </section>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2" aria-label="Legend">
      <li className="flex items-center gap-2">
        <span className="h-0.5 w-5 bg-white" aria-hidden /> Trusted readings
      </li>
      <li className="flex items-center gap-2">
        <span className="h-3 w-5 rounded-sm bg-gradient-to-r from-sage/40 to-transparent" aria-hidden /> Valid for {VALIDITY_WINDOW_MIN} min
      </li>
      <li className="flex items-center gap-2">
        <span className="hatch h-3 w-5 rounded-sm ring-1 ring-gold/60" aria-hidden /> No trusted value
      </li>
    </ul>
  );
}
