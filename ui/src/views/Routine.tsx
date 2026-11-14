import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Award, Check, Clock, Dumbbell, Flame, Lock, RotateCcw, Sparkles } from "lucide-react";
import { indicatorList, indicators, levelMeta, type IndicatorId, type Reading } from "@/lib/indicators";
import { useStore } from "@/lib/store";
import { TODAY } from "@/lib/history";
import { Escalate, LevelBadge, Page, Value } from "@/components/shared";
import { AnimatedNumber } from "@/components/motion";
import { BadgeCollection, CrewCard } from "@/components/CrewCards";
import { cn } from "@/lib/utils";

const MOODS = ["Very low", "Low", "Okay", "Good", "Great"];

export function Routine() {
  const s = useStore();
  const [active, setActive] = useState<IndicatorId>(s.dueToday[0] ?? "heart_rate");
  const [exercised, setExercised] = useState(false);
  const done = indicatorList.length - s.dueToday.length + (exercised ? 1 : 0);
  const total = indicatorList.length + 1;

  return (
    <Page
      title="Today's check-in"
      intro={`Mission day ${TODAY}. Work down the list: each check takes a minute or two and comes with instructions. You earn XP for every entry.`}
      aside={
        <button type="button" onClick={s.resetDemo} className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors">
          <RotateCcw size={15} aria-hidden /> Reset demo
        </button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[320px_1fr_300px]">
        {/* Checklist */}
        <section className="panel p-5 h-fit" aria-labelledby="list-title">
          <div className="flex items-baseline justify-between">
            <h2 id="list-title" className="text-lg font-black">Checklist</h2>
            <span className="text-sm text-white/70 tabular">
              {done} of {total}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Check-ins done">
            <motion.div className="h-full rounded-full bg-white" animate={{ width: `${(done / total) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 30 }} />
          </div>
          <ul className="mt-4 flex flex-col gap-1">
            {indicatorList.map((ind) => {
              const isDone = !s.dueToday.includes(ind.id);
              return (
                <li key={ind.id}>
                  <button
                    type="button"
                    onClick={() => setActive(ind.id)}
                    aria-current={active === ind.id ? "step" : undefined}
                    className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", active === ind.id ? "bg-white/15" : "hover:bg-white/8")}
                  >
                    <motion.span key={String(isDone)} initial={isDone ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 18 }} className={cn("grid size-6 shrink-0 place-items-center rounded-full", isDone ? "bg-white text-black" : "border border-white/40")}>{isDone && <Check size={14} aria-hidden />}</motion.span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm font-black tracking-tight", isDone && "text-white/60 line-through decoration-white/30")}>{ind.name}</span>
                      <span className="flex items-center gap-1 text-xs text-white/55">
                        <Clock size={11} aria-hidden /> {ind.scheduleHint}
                      </span>
                    </span>
                    {isDone ? <LevelBadge level={s.levelOf(ind.id)} /> : <span className="text-xs text-watch">Due</span>}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                aria-pressed={exercised}
                onClick={() => setExercised((e) => !e)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/8 transition-colors"
              >
                <motion.span key={String(exercised)} initial={exercised ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 18 }} className={cn("grid size-6 shrink-0 place-items-center rounded-full", exercised ? "bg-white text-black" : "border border-white/40")}>{exercised && <Check size={14} aria-hidden />}</motion.span>
                <span className="flex-1">
                  <span className={cn("block text-sm font-black tracking-tight", exercised && "text-white/60 line-through decoration-white/30")}>Exercise, about 2 hours</span>
                  <span className="flex items-center gap-1 text-xs text-white/55">
                    <Dumbbell size={11} aria-hidden /> Keeps bones and muscles strong
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </section>

        {/* Log a measurement */}
        <LogForm key={active} id={active} onDone={() => setActive(s.dueToday.find((d) => d !== active) ?? active)} />

        {/* Gamification */}
        <Progress />
      </div>
      <BadgeCollection />
    </Page>
  );
}

function LogForm({ id, onDone }: { id: IndicatorId; onDone: () => void }) {
  const { addReading, dueToday } = useStore();
  const ind = indicators[id];
  const [vals, setVals] = useState<string[]>(ind.input.map(() => ""));
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Reading | null>(null);
  const alreadyDone = !dueToday.includes(id);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const nums = vals.map(Number);
    for (let i = 0; i < ind.input.length; i++) {
      const f = ind.input[i];
      if (vals[i] === "" || Number.isNaN(nums[i])) return setError(`Enter ${f.label.toLowerCase()}.`);
      if (nums[i] < f.min || nums[i] > f.max) return setError(`${f.label} should be between ${f.min} and ${f.max} ${ind.unit}. Check the reading and try again.`);
    }
    setError(null);
    setResult(addReading(id, nums[0], nums[1]));
  }

  return (
    <section className="panel p-6 sm:p-7" aria-labelledby="log-title">
      <AnimatePresence mode="wait" initial={false}>
        {result ? (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5" role="status">
            <div className="relative flex items-center gap-2 text-sm text-white/70">
              <Sparkles size={16} aria-hidden /> Logged.
              <motion.span
                className="rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-black"
                initial={{ opacity: 0, y: 14, scale: 0.6 }}
                animate={{ opacity: [0, 1, 1], y: [14, -4, 0], scale: [0.6, 1.15, 1] }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                +25 XP
              </motion.span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="tabular">
                <Value r={result} id={id} className="text-5xl font-black tracking-[-0.04em]" /> <span className="text-white/60">{ind.unit}</span>
              </p>
              <LevelBadge level={ind.level(result)} />
            </div>
            <div className={cn("rounded-2xl p-4", levelMeta[ind.level(result)].bg)}>
              <p className={cn("text-sm font-black", levelMeta[ind.level(result)].text)}>What to do now</p>
              <p className="mt-1 text-sm leading-relaxed">{ind.todo[ind.level(result)]}</p>
              <div className="mt-3">
                <Escalate id={id} level={ind.level(result)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={onDone} className="bg-white text-black text-sm font-black px-5 py-2.5 rounded-full hover:bg-white/90 transition-colors">
                Next check-in
              </button>
              <button type="button" onClick={() => setResult(null)} className="liquid-glass text-white text-sm font-black px-5 py-2.5 rounded-full hover:bg-white/5 transition-colors">
                Log another
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onSubmit={submit} noValidate className="flex flex-col gap-6">
            <div>
              <h2 id="log-title" className="text-2xl font-black tracking-tight">Log {ind.name.toLowerCase()}</h2>
              <p className="mt-1 text-sm text-white/70">{alreadyDone ? "Already logged today. You can add another reading." : ind.scheduleHint}</p>
            </div>
            <ol className="flex flex-col gap-3">
              {ind.howTo.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/12 text-xs font-medium">{i + 1}</span>
                  <span className="text-white/85">{step}</span>
                </li>
              ))}
            </ol>

            {id === "mood" ? (
              <fieldset>
                <legend className="text-sm font-black">How have you felt today?</legend>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {MOODS.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={vals[0] === String(i + 1)}
                      onClick={() => setVals([String(i + 1)])}
                      className={cn("flex flex-col items-center gap-1 rounded-xl py-3 text-xs transition-colors", vals[0] === String(i + 1) ? "bg-white text-black" : "liquid-glass text-white hover:bg-white/5")}
                    >
                      <span className="text-lg font-medium">{i + 1}</span>
                      {m}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : (
              <div className={cn("grid gap-4", ind.input.length > 1 && "sm:grid-cols-2")}>
                {ind.input.map((f, i) => (
                  <label key={f.label} className="flex flex-col gap-2 text-sm font-medium">
                    {f.label} <span className="sr-only">in {ind.unit}</span>
                    <span className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={f.min}
                        max={f.max}
                        step={f.step}
                        value={vals[i]}
                        placeholder={f.placeholder}
                        onChange={(e) => setVals((v) => v.map((x, j) => (j === i ? e.target.value : x)))}
                        aria-invalid={!!error}
                        aria-describedby={error ? "log-error" : undefined}
                        className="w-full rounded-xl bg-white/8 px-4 py-3 pr-16 text-lg font-normal tabular text-white placeholder:text-white/35 outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-white/70"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-normal text-white/55">{ind.unit}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {error && (
              <p id="log-error" role="alert" className="-mt-2 text-sm text-act">
                {error}
              </p>
            )}
            <div>
              <button type="submit" className="bg-white text-black text-sm sm:text-base font-black px-6 py-3 rounded-full hover:bg-white/90 transition-colors">
                Save reading
              </button>
              <p className="mt-3 text-xs text-white/50">You'll see right away whether it's steady and what to do next.</p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}

function Progress() {
  const { xp, level, streak } = useStore();
  const into = xp % 500;
  return (
    <section className="panel p-5 flex flex-col gap-5 h-fit" aria-labelledby="progress-title">
      <h2 id="progress-title" className="text-lg font-black">Your crew card</h2>
      <CrewCard width={252} />
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
          <p className="text-xs text-white/60">Finish every check-in to keep it going</p>
        </div>
      </div>
    </section>
  );
}
