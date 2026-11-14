import { AnimatePresence, motion } from "motion/react";
import { Check, Coffee, Droplet, Dumbbell, HeartPulse, Moon, Phone, ShieldHalf, Soup, Sparkles, SprayCan, Sun } from "lucide-react";
import { useStore } from "@/lib/store";
import { AnimatedNumber, itemVariants, listVariants } from "./motion";
import { cn } from "@/lib/utils";

type Item = { id: string; label: string; why: string; icon: typeof Dumbbell; from?: string };

// Countermeasures: the daily habits that prevent problems, plus extras added by
// the pattern alerts and the mission environment.
const extras: Record<string, Omit<Item, "id" | "from">> = {
  "no-caffeine": { label: "No caffeine after 12:00", why: "Caffeine lasts 6+ hours and cuts into sleep.", icon: Coffee },
  "dim-lights": { label: "Dim cabin lights at 21:00", why: "Darkness tells your body clock it's night.", icon: Moon },
  "water-extra": { label: "Extra 500 ml of water", why: "Dehydration raises resting heart rate.", icon: Droplet },
  "low-salt": { label: "Keep salt under 3 g today", why: "Salty food pushes blood pressure up.", icon: Soup },
  connect: { label: "Call home or share a crew meal", why: "Contact with people you care about lifts mood.", icon: Phone },
  shelter: { label: "Sleep in the shielded crew quarters", why: "Extra shielding cuts your overnight dose.", icon: ShieldHalf },
  wipe: { label: "Wipe shared surfaces", why: "Stops an infection spreading around the cabin.", icon: SprayCan },
};

export function PreventionPlan({ className }: { className?: string }) {
  const { alerts, env, plan, togglePlan, waterMl, addWater } = useStore();
  const base: Item[] = [
    { id: "resistance", label: "Resistance exercise, 60 min", why: "Loads bones and muscles so they don't waste away.", icon: Dumbbell },
    { id: "cardio", label: "Treadmill or bike, 45 min", why: "Keeps the heart and blood vessels fit.", icon: HeartPulse },
    { id: "sleep-window", label: "Sleep window 22:00 to 06:00", why: "A fixed schedule steadies your body clock.", icon: Moon },
  ];
  if (env.id === "mars") base.push({ id: "daylight", label: "30 min under the daylight lamp", why: "A Martian day is 39 minutes longer; bright light keeps your clock in step.", icon: Sun });
  const added: Item[] = [];
  for (const a of alerts) for (const id of a.plan) if (extras[id] && !added.some((x) => x.id === id)) added.push({ id, ...extras[id], from: a.title });
  if (env.doseFactor >= 1.5 && !added.some((x) => x.id === "shelter")) added.push({ id: "shelter", ...extras.shelter, from: `${env.name}: higher radiation` });

  const items = [...base, ...added];
  const target = added.some((x) => x.id === "water-extra") ? 3000 : 2500;
  const done = items.filter((i) => plan[i.id]).length + (waterMl >= target ? 1 : 0);
  const total = items.length + 1;

  return (
    <section className={cn("panel mt-5 p-6", className)} aria-labelledby="plan-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 id="plan-title" className="text-xl">Prevention plan</h2>
          <p className="mt-1 text-sm text-white/60">
            Daily habits that stop problems before they start. Items with a spark were added because of a pattern in your readings.
          </p>
        </div>
        <span className="text-sm text-white/70 tabular">
          <AnimatedNumber value={done} format={(n) => String(Math.round(n))} /> of {total} done
        </span>
      </div>

      <div className="mt-5 grid gap-5">
        <motion.ul variants={listVariants} initial="hidden" animate="show" className="grid gap-2 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {items.map((it) => {
              const on = !!plan[it.id];
              return (
                <motion.li key={it.id} variants={itemVariants} layout exit={{ opacity: 0, scale: 0.95 }}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePlan(it.id)}
                    className={cn("flex h-full w-full items-start gap-3 rounded-2xl p-3.5 text-left transition-colors", on ? "bg-steady/12" : "bg-white/5 hover:bg-white/8")}
                  >
                    <motion.span
                      key={String(on)}
                      initial={on ? { scale: 0.5 } : false}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18 }}
                      className={cn("grid size-8 shrink-0 place-items-center rounded-full", on ? "bg-steady text-black" : "bg-white/10 text-white")}
                    >
                      {on ? <Check size={16} aria-hidden /> : <it.icon size={16} aria-hidden />}
                    </motion.span>
                    <span className="min-w-0">
                      <span className={cn("flex items-center gap-1.5 text-sm font-semibold", on && "text-white/70 line-through decoration-white/30")}>
                        {it.from && <Sparkles size={13} className="shrink-0 text-watch" aria-label="Added from a pattern" />}
                        {it.label}
                      </span>
                      <span className="block text-xs text-white/55">
                        {it.from ? `Because: ${it.from.toLowerCase()}. ` : ""}
                        {it.why}
                      </span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>

        <div className="rounded-2xl bg-white/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Droplet size={16} className="text-info" aria-hidden /> Water
          </p>
          <p className="mt-2 text-3xl font-black tabular">
            <AnimatedNumber value={waterMl / 1000} format={(n) => n.toFixed(2)} />{" "}
            <span className="text-base font-normal text-white/60">of {(target / 1000).toFixed(1)} L</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={waterMl} aria-label="Water today">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#9fbaff] to-[#7ff5e6]"
              animate={{ width: `${Math.min(100, (waterMl / target) * 100)}%` }}
              transition={{ type: "spring", stiffness: 180, damping: 26 }}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => addWater(250)} className="flex-1 rounded-full bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90">
              + 250 ml
            </button>
            <button type="button" onClick={() => addWater(-250)} className="liquid-glass rounded-full px-3 py-2 text-sm text-white hover:bg-white/5" aria-label="Remove 250 ml">
              −
            </button>
          </div>
          <p className="mt-3 text-xs text-white/55">In weightlessness thirst is weaker, so drinking on a schedule matters.</p>
        </div>
      </div>
    </section>
  );
}
