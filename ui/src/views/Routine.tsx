import { motion } from "motion/react";
import { Check, Flame, Radio, RotateCcw, Unplug } from "lucide-react";
import { indicatorList } from "@/lib/indicators";
import { useStore } from "@/lib/store";
import { TODAY } from "@/lib/history";
import { LevelBadge, Page } from "@/components/shared";
import { AnimatedNumber, itemVariants, listVariants } from "@/components/motion";
import { PreventionPlan } from "@/components/PreventionPlan";
import { SensorHealth } from "@/components/SensorHealth";
import { cn } from "@/lib/utils";

/** Today's plan: nothing to enter. What synced, what to do, and rewards. */
export function Routine() {
  const s = useStore();
  return (
    <Page
      title="Today's plan"
      intro={`Mission day ${TODAY}. Nothing to enter: your sensors sync on their own. Here is what came in today and the habits that keep you healthy. You earn XP for finishing the plan.`}
      aside={
        <button type="button" onClick={s.resetDemo} className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors">
          <RotateCcw size={15} aria-hidden /> Reset demo
        </button>
      }
    >
      <div className="grid items-start gap-5 lg:grid-cols-[320px_1fr_300px]">
        <Synced />
        <PreventionPlan className="mt-0" />
        <div className="flex flex-col gap-5">
          <SensorHealth />
          <Progress />
        </div>
      </div>
    </Page>
  );
}

/** Every reading for today, with where it came from. A dropped sensor shows as Unknown. */
function Synced() {
  const { latest, levelOf, freshness } = useStore();
  const synced = indicatorList.filter((i) => !freshness(i.id).unknown).length;
  return (
    <section className="panel h-fit p-5" aria-labelledby="synced-title">
      <div className="flex items-baseline justify-between">
        <h2 id="synced-title" className="text-lg">Synced today</h2>
        <span className="text-sm text-white/70 tabular">
          {synced} of {indicatorList.length}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={indicatorList.length} aria-valuenow={synced} aria-label="Readings synced">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-[#7ff5e6] to-[#9fbaff]" animate={{ width: `${(synced / indicatorList.length) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 30 }} />
      </div>
      <motion.ul variants={listVariants} initial="hidden" animate="show" className="mt-4 flex flex-col gap-1">
        {indicatorList.map((ind) => {
          const r = latest(ind.id);
          const fresh = freshness(ind.id);
          return (
            <motion.li key={ind.id} variants={itemVariants}>
              <a href="#/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/8">
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", fresh.unknown ? "border border-watch/60 text-watch" : "bg-white text-black")}>
                  {fresh.unknown ? <Unplug size={12} aria-hidden /> : <Check size={14} aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{ind.name}</span>
                  <span className={cn("flex items-center gap-1 text-xs", fresh.unknown ? "text-watch" : "text-white/55")}>
                    <Radio size={11} aria-hidden /> {fresh.unknown ? fresh.reason : `${ind.source}${r ? `, ${r.at.slice(11, 16)}` : ""}`}
                  </span>
                </span>
                <LevelBadge level={levelOf(ind.id)} unknown={fresh.unknown} />
              </a>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}

function Progress() {
  const { xp, level, streak } = useStore();
  const into = xp % 500;
  return (
    <section className="panel p-5 flex flex-col gap-5 h-fit" aria-labelledby="progress-title">
      <h2 id="progress-title" className="text-lg font-black">Your progress</h2>
      <div className="flex items-center gap-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-white text-black">
          <motion.span key={level} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 16 }} className="text-xl font-black tabular">{level}</motion.span>
        </div>
        <div className="flex-1">
          <p className="text-sm">Level {level}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-white" animate={{ width: `${(into / 500) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 30 }} />
          </div>
          <p className="mt-1.5 text-xs text-white/60 tabular">
            <AnimatedNumber value={into} format={(n) => String(Math.round(n))} /> / 500 XP to level {level + 1}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-white/6 p-4">
        <motion.span animate={{ scale: [1, 1.12, 1], rotate: [0, -4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} className="text-watch"><Flame size={22} aria-hidden /></motion.span>
        <div>
          <p className="text-sm font-medium tabular"><AnimatedNumber value={streak} format={(n) => String(Math.round(n))} />-day streak</p>
          <p className="text-xs text-white/60">Finish your prevention plan to keep it going</p>
        </div>
      </div>
    </section>
  );
}
