import { AnimatePresence, motion } from "motion/react";
import { Activity, CircleHelp, HeartPulse, LifeBuoy, Stethoscope, Watch } from "lucide-react";
import type { Assessment } from "@/lib/types";
import { headline, hhmm, type Headline } from "@/lib/engine";
import { cn, contextLabel, minutesBetween } from "@/lib/utils";
import { AnimatedNumber, BeatingHeart } from "./motion";

export interface Reason {
  text: string;
  ids: string[];
}

const tone: Record<Headline, { color: string; ring: string; label: string }> = {
  nominal: { color: "text-sage-ink", ring: "bg-sage", label: "Readings current" },
  unknown: { color: "text-amber", ring: "hatch", label: "Can't confirm" },
  pending: { color: "text-rose", ring: "bg-rose", label: "Crewmate needed" },
  acknowledged: { color: "text-navy", ring: "bg-navy", label: "Crewmate responding" },
};

function copy(a: Assessment, h: Headline) {
  const last = a.current_hr.last_reliable;
  const age = last ? minutesBetween(last.measured_at, a.evaluated_at) : null;
  switch (h) {
    case "nominal":
      return {
        title: "Your readings are current",
        body: `Heart rate ${last!.value} bpm, measured ${age === 0 ? "just now" : `${age} min ago`} ${contextLabel[last!.context] ?? ""}. Nothing needs attention.`,
      };
    case "unknown":
      return {
        title: "Heart rate can't be confirmed",
        body: last
          ? `The last trusted reading is ${age} min old. Treat it as history, not as how you are now.`
          : "There are no trusted readings yet.",
      };
    case "pending":
      return {
        title: "A crewmate should check on you",
        body: "The handoff is open and the crew can see it. Stay where you are until someone responds.",
      };
    case "acknowledged":
      return {
        title: `${a.handoff.by} is responding`,
        body: `They acknowledged at ${hhmm(a.handoff.at!)}. Have the open items below ready to share.`,
      };
  }
}

export function StatusPanel({
  assessment: a,
  reasons,
  onHighlight,
}: {
  assessment: Assessment;
  reasons: Reason[];
  onHighlight: (ids: string[]) => void;
}) {
  const h = headline(a);
  const t = tone[h];
  const c = copy(a, h);
  const last = a.current_hr.last_reliable;
  const age = last ? minutesBetween(last.measured_at, a.evaluated_at) : null;

  return (
    <section aria-labelledby="status-title" className="panel p-6 sm:p-8 flex flex-col gap-8">
      {/* Headline: the one place the status is stated in words */}
      <div aria-live="polite" className="min-h-[148px]">
        <div className="flex items-center gap-3 text-sm text-ink-2">
          <span className={cn("size-3 rounded-full", t.ring, h === "unknown" && "ring-1 ring-gold")} aria-hidden />
          <span className={t.color}>{t.label}</span>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={h + c.title}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.12 } }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <h2 id="status-title" className="mt-3 text-[clamp(1.75rem,3.2vw,2.5rem)] leading-[1.08] font-medium tracking-[-0.02em] text-balance">
              {c.title}
            </h2>
            <p className="mt-3 max-w-[52ch] text-ink-2 leading-relaxed">{c.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* What we know */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
        <Fact
          icon={HeartPulse}
          term="Heart rate"
          state={a.current_hr.status === "current" ? "ok" : "unknown"}
          value={
            a.current_hr.status === "current" && last ? (
              <>
                <span className="inline-flex items-center gap-2">
                  <BeatingHeart bpm={last.value} size={20} className="text-act" />
                  <AnimatedNumber value={last.value} format={(n) => String(Math.round(n))} className="text-3xl font-black" />
                  <span className="text-ink-2">bpm</span>
                </span>
              </>
            ) : (
              <span className="text-3xl font-black text-amber">Unknown</span>
            )
          }
          note={last ? `Last trusted ${last.value} bpm at ${hhmm(last.measured_at)}, ${contextLabel[last.context] ?? last.context}` : "No readings received"}
          onFocus={() => last && onHighlight(a.contributing_ids.slice(0, 1))}
          onBlur={() => onHighlight([])}
        />
        <Fact
          icon={Watch}
          term="Wrist sensor"
          state={a.sensor === "connected" ? "ok" : "unknown"}
          value={<span className="text-xl font-black">{{ connected: "Connected", disconnected: "Disconnected", no_data: "No data" }[a.sensor]}</span>}
          note={a.sensor === "connected" ? `Reading age ${age} min, valid for 2` : "No new readings arriving"}
        />
        <Fact
          icon={Stethoscope}
          term="Symptoms"
          state={a.symptom_status === "open" ? "attention" : "ok"}
          value={
            <span className="text-xl font-black capitalize">
              {a.open_symptoms.length ? a.open_symptoms.map((s) => s.symptom).join(", ") : "None reported"}
            </span>
          }
          note={
            a.open_symptoms[0]
              ? `Reported ${hhmm(a.open_symptoms[0].reported_at)}${a.open_symptoms[0].onset_at ? `, started ${a.open_symptoms[0].onset_certainty === "approximate" ? "about " : ""}${hhmm(a.open_symptoms[0].onset_at)}` : ""}`
              : "Use Report a symptom if anything feels off"
          }
        />
        <Fact
          icon={LifeBuoy}
          term="Crew help"
          state={a.handoff.status === "acknowledged" ? "handoff" : a.handoff.status === "pending" ? "attention" : "ok"}
          value={<span className="text-xl font-black">{{ not_needed: "Not needed", pending: "Waiting", acknowledged: "On the way" }[a.handoff.status]}</span>}
          note={a.handoff.status === "acknowledged" ? `${a.handoff.by} at ${hhmm(a.handoff.at!)}` : "Assistance is available"}
        />
      </dl>

      {/* What we don't know */}
      {a.unknowns.length > 0 && (
        <div className="rounded-[14px] border border-gold/40 p-4">
          <div className="flex items-center gap-2 text-amber font-medium">
            <CircleHelp className="size-4" aria-hidden />
            Not known right now
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {a.unknowns.map((u) => (
              <li key={u} className="relative overflow-hidden rounded-full border border-gold/50 px-3 py-1 text-sm first-letter:uppercase">
                <span className="hatch absolute inset-0 opacity-25" aria-hidden />
                <span className="relative">{u}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Why */}
      <div>
        <h3 className="flex items-center gap-2 font-medium">
          <Activity className="size-4 text-ink-2" aria-hidden />
          Why the app says this
        </h3>
        {reasons.length ? (
          <ul className="mt-3 flex flex-col gap-1" onMouseLeave={() => onHighlight([])}>
            {reasons.map((r) => (
              <li key={r.text}>
                <button
                  type="button"
                  className="w-full text-left rounded-[10px] px-3 py-2 -mx-3 text-ink-2 hover:text-ink hover:bg-fill focus-visible:text-ink transition-colors leading-snug"
                  onMouseEnter={() => onHighlight(r.ids)}
                  onFocus={() => onHighlight(r.ids)}
                  onBlur={() => onHighlight([])}
                  aria-describedby={r.ids.length ? "reason-hint" : undefined}
                >
                  {r.text}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-ink-2">Every reading is inside its validity window and nothing has been reported.</p>
        )}
        <p id="reason-hint" className="sr-only">Highlights the related point on the heart rate timeline.</p>
      </div>
    </section>
  );
}

const stateDot = {
  ok: "bg-sage",
  unknown: "hatch ring-1 ring-gold",
  attention: "bg-rose",
  handoff: "bg-navy",
} as const;

function Fact({
  icon: Icon,
  term,
  value,
  note,
  state,
  onFocus,
  onBlur,
}: {
  icon: typeof HeartPulse;
  term: string;
  value: React.ReactNode;
  note: string;
  state: keyof typeof stateDot;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  return (
    <div onMouseEnter={onFocus} onMouseLeave={onBlur} className="min-w-0">
      <dt className="flex items-center gap-2 text-sm text-ink-2">
        <Icon className="size-4" aria-hidden />
        {term}
        <span className={cn("ml-auto size-2 rounded-full", stateDot[state])} aria-hidden />
      </dt>
      <dd className="mt-1.5">
        <div className="tabular leading-tight">{value}</div>
        <div className="mt-1 text-sm text-ink-3 leading-snug">{note}</div>
      </dd>
    </div>
  );
}
