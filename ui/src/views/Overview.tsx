import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { itemVariants, listVariants } from "@/components/motion";
import { Globe2, Radio, Weight } from "lucide-react";
import { indicatorList, indicators, levelMeta, type IndicatorId, type Level } from "@/lib/indicators";
import { useStore } from "@/lib/store";
import { formatDelay } from "@/lib/environments";
import { TODAY } from "@/lib/history";
import { HeartStrip, IndicatorDetail, LevelBadge, Page, Sparkline, Value } from "@/components/shared";
import { cn } from "@/lib/utils";

export function Overview() {
  const { env, latest, levelOf, dueToday } = useStore();
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
      intro={`CM-2, mission day ${TODAY}. ${dueToday.length ? `${dueToday.length} check-ins still due today.` : "All of today's check-ins are done."} Select any indicator for what it means and what to do.`}
      aside={
        <div className="panel flex gap-6 px-5 py-4 text-sm">
          <Stat icon={Globe2} label="Environment" value={env.name} />
          <Stat icon={Weight} label="Gravity" value={env.gravity} />
          <Stat icon={Radio} label="Ground delay" value={formatDelay(env.delaySec)} />
        </div>
      }
    >
      <p className="mb-6 -mt-2 text-sm text-white/60">{env.note}</p>
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <motion.ul variants={listVariants} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Indicators">
          {indicatorList.map((ind) => {
            const r = latest(ind.id);
            const lvl = levelOf(ind.id);
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
                    <span className="text-sm font-black tracking-tight text-white">{ind.name}</span>
                    <LevelBadge level={lvl} />
                  </div>
                  <p className="mt-3 tabular">
                    <Value r={r} id={ind.id} className="text-3xl font-black tracking-[-0.04em]" />{" "}
                    <span className="text-sm text-white/60">{ind.unit}</span>
                  </p>
                  {ind.id === "heart_rate" && r ? <HeartStrip bpm={r.value} className="mt-3 h-10" /> : <Sparkline id={ind.id} className="mt-3" />}
                  <p className={cn("mt-2 text-xs", due ? "text-watch" : "text-white/55")}>
                    {due ? `Due today: ${ind.scheduleHint.toLowerCase()}` : `Logged day ${r?.missionDay}`}
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
      <div className="mt-0.5 font-black">{value}</div>
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
