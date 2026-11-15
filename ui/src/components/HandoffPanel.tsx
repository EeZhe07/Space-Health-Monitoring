import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Hand, ShieldCheck, Stethoscope, Undo2 } from "lucide-react";
import type { Assessment } from "@/lib/types";
import { hhmm } from "@/lib/engine";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

const steps = [
  { key: "not_needed", label: "Nobody needed" },
  { key: "pending", label: "Crew alerted" },
  { key: "acknowledged", label: "Crewmate responding" },
] as const;

const SYMPTOMS = ["dizziness", "nausea", "headache", "chest discomfort", "shortness of breath"];

export function HandoffPanel({
  assessment: a,
  onReportSymptom,
  onRequestHelp,
  onAcknowledge,
  onUndo,
  canUndo,
}: {
  assessment: Assessment;
  onReportSymptom: (symptom: string) => void;
  onRequestHelp: () => void;
  onAcknowledge: () => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  const [picking, setPicking] = useState(false);
  const current = steps.findIndex((s) => s.key === a.handoff.status);
  const helpAsked = a.actions_taken.some((x) => x.startsWith("assistance requested"));

  return (
    <section aria-labelledby="handoff-title" className="panel p-6 sm:p-8 flex flex-col gap-6">
      <div>
        <h2 id="handoff-title" className="text-[22px] font-black tracking-[-0.01em]">Crew handoff</h2>
        <p className="mt-1 text-sm text-ink-2">Opens on its own when a symptom is reported or help is asked for.</p>
      </div>

      {/* Progress: a real sequence, so it's drawn as one */}
      <ol className="grid grid-cols-3 gap-2" aria-label="Handoff progress">
        {steps.map((s, i) => {
          const done = i < current || (i === current && i === 2);
          const active = i === current;
          const color = s.key === "acknowledged" ? "bg-navy" : s.key === "pending" ? "bg-rose" : "bg-sage";
          return (
            <li key={s.key} aria-current={active ? "step" : undefined} className="flex flex-col gap-2">
              <div className="relative h-1.5 overflow-hidden rounded-full bg-sunken">
                {(active || i < current) && (
                  <motion.div layoutId={i === current ? "handoff-fill" : undefined} className={cn("absolute inset-0 rounded-full", i < current ? "bg-ink-3/40" : color)} />
                )}
              </div>
              <span className={cn("text-sm leading-tight", active ? "text-ink font-medium" : "text-ink-3")}>
                {done && <Check className="mr-1 inline size-3.5" aria-hidden />}
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        {a.handoff.status === "acknowledged" ? (
          <motion.div key="ack" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-[14px] bg-navy/12 border border-navy/40 p-4">
            <ShieldCheck className="size-6 text-navy shrink-0" aria-hidden />
            <p>
              <span className="font-black">{a.handoff.by}</span> acknowledged at {hhmm(a.handoff.at!)}.
            </p>
          </motion.div>
        ) : a.handoff.status === "pending" ? (
          <motion.div key="pending" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-rose/10 border border-rose/40 p-4">
            <p className="flex items-center gap-3">
              <span className="relative flex size-3" aria-hidden>
                <span className="absolute inset-0 animate-ping rounded-full bg-rose opacity-60" />
                <span className="relative size-3 rounded-full bg-rose" />
              </span>
              Waiting for a crewmate
            </p>
            <Button size="sm" variant="handoff" onClick={onAcknowledge}>
              <ShieldCheck className="size-4" aria-hidden /> Respond as CM-3
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {picking ? (
            <motion.fieldset key="pick" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-[14px] border border-line p-4">
              <legend className="px-1 text-sm text-ink-2">What are you feeling?</legend>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    className="capitalize"
                    onClick={() => {
                      onReportSymptom(s);
                      setPicking(false);
                    }}
                  >
                    {s}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" onClick={() => setPicking(false)}>Cancel</Button>
              </div>
            </motion.fieldset>
          ) : (
            <motion.div key="btns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setPicking(true)}>
                <Stethoscope className="size-4" aria-hidden /> Report a symptom
              </Button>
              <Button variant="attention" onClick={onRequestHelp} disabled={helpAsked}>
                <Hand className="size-4" aria-hidden /> {helpAsked ? "Help requested" : "Ask for help"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        {canUndo && (
          <Button size="sm" variant="ghost" onClick={onUndo} className="self-start">
            <Undo2 className="size-4" aria-hidden /> Undo my last action
          </Button>
        )}
      </div>

      {/* Log */}
      <div>
        <h3 className="text-sm text-ink-2">Actions so far</h3>
        {a.actions_taken.length ? (
          <ol className="mt-2 flex flex-col">
            {a.actions_taken.map((act) => {
              const [what, time] = act.split(" at ");
              return (
                <li key={act} className="flex justify-between gap-4 border-b border-line py-2 last:border-0">
                  <span className="first-letter:uppercase">{what}</span>
                  <span className="text-ink-2 tabular">{time}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-2 text-ink-3">Nothing yet.</p>
        )}
      </div>
    </section>
  );
}
