import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { itemVariants, listVariants } from "@/components/motion";
import { AlertTriangle, ChevronDown, Eye, Globe2, LineChart, Radio, Weight } from "lucide-react";
import { indicatorList, indicators, levelMeta, type IndicatorId, type Level } from "@/lib/indicators";
import { useStore } from "@/lib/store";
import { formatDelay } from "@/lib/environments";
import { TODAY } from "@/lib/history";
import { HeartStrip, IndicatorDetail, LevelBadge, Page, Sparkline, Value, baselineDelta } from "@/components/shared";
import { cn } from "@/lib/utils";

export function Overview() {
  const { env, latest, levelOf, dueToday, freshness } = useStore();
  const levels = indicatorList.map((i) => levelOf(i.id));
  const count = (l: Level) => levels.filter((x) => x === l).length;
  const worst = indicatorList.find((i) => levelOf(i.id) === "act") ?? indicatorList.find((i) => levelOf(i.id) === "watch");
  const [selected, setSelected] = useState<IndicatorId>(worst?.id ?? "heart_rate");

  const summary =
    count("act") > 0
      ? `${count("act")} ${count("act") === 1 ? "reading needs" : "readings need"} action now.`
      : count("watch") > 0
        ? `Nothing urgent. ${count("watch")} to keep an eye on.`
        : "Everything is steady.";

  return (
    <Page
      title={summary}
      intro={`CM-2, mission day ${TODAY}. Live from your suit sensors, compared with your pre-flight baseline. Select a reading for what to do.`}
      aside={
        <div className="panel flex gap-6 px-5 py-4 text-sm">
          <Stat icon={Globe2} label="Environment" value={env.name} />
          <Stat icon={Weight} label="Gravity" value={env.gravity} />
          <Stat icon={Radio} label="Ground delay" value={formatDelay(env.delaySec)} />
        </div>
      }
    >
      <TrendAlerts />
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <motion.ul variants={listVariants} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Indicators">
          {indicatorList.map((ind) => {
            const r = latest(ind.id);
            const lvl = levelOf(ind.id);
            const fresh = freshness(ind.id);
            const on = selected === ind.id;
            const due = dueToday.includes(ind.id);
            return (
              <motion.li key={ind.id} variants={itemVariants}>
                <motion.button
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelected(ind.id)}
                  className={cn("panel w-full p-5 text-left transition-[background-color,box-shadow] hover:bg-white/5 hover:shadow-[0_18px_40px_-18px_rgb(127_224_168/35%)]", on && "!bg-white/12 ring-1 ring-white/40")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{ind.name}</span>
                    <LevelBadge level={lvl} unknown={fresh.unknown} />
                  </div>
                  <p className="mt-3 tabular">
                    {fresh.unknown ? (
                      <span className="text-3xl font-black tracking-[-0.04em] text-watch">Unknown</span>
                    ) : (
                      <>
                        <Value r={r} id={ind.id} className="text-3xl font-black tracking-[-0.04em]" />{" "}
                        <span className="text-sm text-white/60">{ind.unit}</span>
                      </>
                    )}
                  </p>
                  {fresh.unknown ? <div className="hatch mt-3 h-10 rounded-lg opacity-25" aria-hidden /> : ind.id === "heart_rate" && r ? <HeartStrip bpm={r.value} className="mt-3 h-10" /> : <Sparkline id={ind.id} className="mt-3" />}
                  <p className={cn("mt-2 flex justify-between gap-2 text-xs", due ? "text-watch" : "text-white/55")}>
                    <span className={cn(fresh.unknown && "text-watch")}>{fresh.unknown ? fresh.reason : due ? `Check-in due: ${ind.scheduleHint.toLowerCase()}` : r?.source === "crew_input" ? "Entered by you" : ind.source}</span>
                    {!due && !fresh.unknown && baselineDelta(ind.id, r) && <span className="text-white/70">{baselineDelta(ind.id, r)}</span>}
                  </p>
                </motion.button>
              </motion.li>
            );
          })}
        </motion.ul>
        <aside className="panel p-6 h-fit lg:sticky lg:top-6" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={selected} initial={{ opacity: 0, x: 16, filter: "blur(6px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} exit={{ opacity: 0, x: -10, filter: "blur(4px)", transition: { duration: 0.15 } }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <IndicatorDetail id={selected} />
            </motion.div>
          </AnimatePresence>
        </aside>
      </div>
      <Legend />
    </Page>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Globe2; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-white/60">
        <Icon size={14} aria-hidden />
        {label}
      </div>
      <div className="mt-0.5 font-semibold">{value}</div>
    </div>
  );
}

export function Legend() {
  return (
    <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70" aria-label="Colour key">
      {(Object.keys(levelMeta) as Level[]).map((l) => (
        <li key={l} className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full", levelMeta[l].dot)} aria-hidden />
          <span className={levelMeta[l].text}>{levelMeta[l].label}</span>
          <span className="text-white/50">
            {l === "steady" ? "inside the safe range" : l === "watch" ? "drifting, re-check soon" : "act and tell someone"}
          </span>
        </li>
      ))}
      <li className="text-white/50">Synthetic data, illustrative demo thresholds. Not medical advice.</li>
    </ul>
  );
}

export { indicators };

/** Pattern alerts: runs of readings that deserve attention, not single values. */
function TrendAlerts() {
  const { alerts } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  if (!alerts.length) return null;
  return (
    <section className="mb-6" aria-labelledby="patterns-title">
      <h2 id="patterns-title" className="mb-3 flex items-center gap-2 text-lg">
        <LineChart size={18} aria-hidden /> Patterns to watch
        <span className="text-sm font-normal text-white/55">from the last few days of readings</span>
      </h2>
      <motion.ul variants={listVariants} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2">
        {alerts.map((a) => {
          const m = levelMeta[a.level];
          const Icon = a.level === "act" ? AlertTriangle : Eye;
          const isOpen = open === a.id;
          return (
            <motion.li key={a.id} variants={itemVariants} className={cn("panel overflow-hidden border-l-4", a.level === "act" ? "border-l-act" : "border-l-watch")}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : a.id)} className="flex w-full items-start gap-3 p-4 text-left">
                <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", m.bg, m.text)}>
                  <Icon size={16} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{a.title}</span>
                  <span className="mt-0.5 block text-sm text-white/70">{a.detail}</span>
                </span>
                <ChevronDown size={18} className={cn("mt-1 shrink-0 text-white/60 transition-transform", isOpen && "rotate-180")} aria-hidden />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                    <dl className="grid gap-3 border-t border-white/10 px-4 py-4 pl-15 text-sm">
                      <div>
                        <dt className="font-semibold">Why it matters</dt>
                        <dd className="text-white/70">{a.why}</dd>
                      </div>
                      <div>
                        <dt className={cn("font-semibold", m.text)}>What to do</dt>
                        <dd className="text-white/85">{a.action}</dd>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <a href="#/trends" className="liquid-glass rounded-full px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/5">See the trend</a>
                        <a href="#/routine" className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-white/90">Open prevention plan</a>
                      </div>
                    </dl>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}
