import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Bandage, Check, Flame, HeartPulse, HelpCircle, Radiation, Send, Siren, UserX, Users } from "lucide-react";
import { indicators, type IndicatorId } from "@/lib/indicators";
import { useNow, useStore } from "@/lib/store";
import { formatDelay } from "@/lib/environments";
import { cn } from "@/lib/utils";

type Kind = "unsure" | "injury" | "chest" | "unconscious" | "fire" | "radiation";

// Short prompts that sit alongside the crew's real emergency procedures.
// Illustrative for the demo, not medical instructions.
const situations: Record<Kind, { label: string; icon: typeof Siren; steps: string[] }> = {
  unsure: {
    label: "Not sure",
    icon: HelpCircle,
    steps: ["Make yourself safe first: stop, anchor yourself.", "The crew and ground are already alerted.", "Get the medical kit.", "Stay with the person who is hurt and keep talking to them.", "Follow the flight surgeon's instructions when they arrive."],
  },
  injury: {
    label: "Injury or bleeding",
    icon: Bandage,
    steps: [
      "Anchor yourself and the injured crewmate.",
      "Press firmly on any bleeding with gauze from the medical kit. Don't let go to look.",
      "If the neck or back could be hurt, don't move them.",
      "Note the time of the injury.",
      "Describe the injury to the flight surgeon as soon as the line is open.",
    ],
  },
  chest: {
    label: "Chest pain or can't breathe",
    icon: HeartPulse,
    steps: [
      "Stop all activity. Sit or anchor in place.",
      "Put on an oxygen mask from the medical kit.",
      "Loosen anything tight around the chest and neck.",
      "A crewmate takes heart rate and blood pressure every 5 minutes.",
      "Get the defibrillator (AED) ready. Medication only on the flight surgeon's advice.",
    ],
  },
  unconscious: {
    label: "Crewmate unconscious",
    icon: UserX,
    steps: [
      "Call their name and tap their shoulders.",
      "Check for breathing for 10 seconds.",
      "Not breathing: start CPR using the restraint position and fetch the AED.",
      "Breathing: keep the airway open and watch them continuously.",
      "Keep the line open to the ground and report every change.",
    ],
  },
  fire: {
    label: "Fire, smoke or toxic air",
    icon: Flame,
    steps: [
      "Put on an oxygen mask or breathing apparatus now.",
      "Alert the whole crew and move to a safe module.",
      "Cut power and ventilation to the affected area if it is safe.",
      "Use the extinguisher only if you are trained and it is safe.",
      "Account for every crew member.",
    ],
  },
  radiation: {
    label: "Radiation storm",
    icon: Radiation,
    steps: ["Go to the storm shelter or the most shielded area now.", "Take your dosimeter and note the reading.", "Stay until the alert is cleared.", "Report your dose to the flight surgeon."],
  },
};

const VITALS: IndicatorId[] = ["heart_rate", "spo2", "respiratory_rate", "blood_pressure", "temperature", "radiation"];

export function EmergencyScreen() {
  const { emergency, endEmergency, latest, freshness, sendMessage, env } = useStore();
  const now = useNow(500);
  const [kind, setKind] = useState<Kind>("unsure");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const sentAt = useRef(0);
  const endRef = useRef<HTMLButtonElement>(null);

  // The moment the screen opens: alert the flight surgeon with a vitals snapshot.
  useEffect(() => {
    if (!emergency.open) return;
    setKind("unsure");
    setConfirmEnd(false);
    sentAt.current = Date.now();
    const snap = VITALS.map((id) => {
      const r = latest(id);
      return r && !freshness(id).unknown ? `${indicators[id].name} ${indicators[id].format(r)} ${indicators[id].unit}` : `${indicators[id].name} unknown`;
    }).join(", ");
    sendMessage("general", `EMERGENCY from CM-2 at ${env.name}. ${snap}`);
    endRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emergency.open]);

  if (!emergency.open) return null;

  const elapsed = Math.max(0, Math.floor((now - emergency.startedAt) / 1000));
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const crew = [
    { who: "CM-3", text: "On the way to you", at: 3 },
    { who: "CM-1", text: "Bringing the medical kit and AED", at: 7 },
    { who: "CM-4", text: "Opening the line to ground", at: 11 },
  ];
  const groundArrive = Math.ceil(env.delaySec) - elapsed;
  const replyIn = Math.ceil(env.delaySec * 2) + 20 - elapsed;
  const s = situations[kind];

  return createPortal(
    <div role="alertdialog" aria-modal="true" aria-labelledby="sos-title" className="fixed inset-0 z-[100] overflow-y-auto bg-[#160505]/97 text-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-act px-5 py-3 text-black sm:px-8">
        <h2 id="sos-title" className="flex items-center gap-3 text-xl font-black tracking-tight">
          <span className="relative flex size-3">
            <span className="absolute inset-0 animate-ping rounded-full bg-black/60" />
            <span className="relative size-3 rounded-full bg-black" />
          </span>
          EMERGENCY ACTIVE
          <span className="tabular text-base font-semibold">{mmss}</span>
        </h2>
        {confirmEnd ? (
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold">End the emergency?</span>
            <button type="button" onClick={endEmergency} className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
              Yes, everyone is safe
            </button>
            <button type="button" onClick={() => setConfirmEnd(false)} className="rounded-full border border-black/40 px-4 py-2 text-sm font-semibold">
              Keep it open
            </button>
          </span>
        ) : (
          <button ref={endRef} type="button" onClick={() => setConfirmEnd(true)} className="rounded-full border-2 border-black px-4 py-2 text-sm font-semibold hover:bg-black/10">
            End emergency
          </button>
        )}
      </div>

      <div className="mx-auto grid max-w-[1200px] gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[260px_1fr_320px]">
        {/* What happened */}
        <section aria-labelledby="sos-kind">
          <h3 id="sos-kind" className="mb-3 text-sm font-semibold text-white/70">What's happening?</h3>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {(Object.keys(situations) as Kind[]).map((k) => {
              const Icon = situations[k].icon;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className={cn("flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left text-sm font-semibold transition-colors", kind === k ? "bg-white text-black" : "bg-white/8 hover:bg-white/14")}
                >
                  <Icon size={20} aria-hidden className="shrink-0" />
                  {situations[k].label}
                </button>
              );
            })}
          </div>
        </section>

        {/* What to do */}
        <section aria-labelledby="sos-steps" className="rounded-3xl bg-white/6 p-6">
          <h3 id="sos-steps" className="text-2xl font-black tracking-tight">{s.label === "Not sure" ? "Do this now" : s.label}</h3>
          <ol className="mt-5 flex flex-col gap-4">
            {s.steps.map((step, i) => (
              <li key={`${kind}-${i}`} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-act text-lg font-black text-black">{i + 1}</span>
                <span className="pt-1 text-lg leading-snug">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-xs text-white/50">Summary prompts only. Follow your crew emergency procedures and the flight surgeon.</p>
        </section>

        {/* Who's coming, and the vitals ground can see */}
        <section className="flex flex-col gap-4" aria-label="Alerts and vitals">
          <div className="rounded-3xl bg-white/6 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Users size={16} aria-hidden /> Crew alerted
            </h3>
            <ul className="mt-3 flex flex-col gap-2.5" aria-live="polite">
              {crew.map((c) => {
                const done = elapsed >= c.at;
                return (
                  <li key={c.who} className="flex items-center gap-3 text-sm">
                    {done ? (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }} className="grid size-6 place-items-center rounded-full bg-steady text-black">
                        <Check size={14} aria-hidden />
                      </motion.span>
                    ) : (
                      <span className="size-6 animate-pulse rounded-full border-2 border-white/30" aria-hidden />
                    )}
                    <span className="font-semibold">{c.who}</span>
                    <span className="text-white/70">{done ? c.text : "Alert sent, waiting…"}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-3xl bg-white/6 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Send size={16} aria-hidden /> Flight surgeon
            </h3>
            <p className="mt-2 text-sm text-white/80" aria-live="polite">
              {groundArrive > 0 ? `Your vitals reach the ground in ${formatDelay(groundArrive)}.` : "Your vitals have reached the ground."}{" "}
              {replyIn > 0 ? `Expect a reply in about ${formatDelay(replyIn)}.` : "The flight surgeon is on the line."}
            </p>
            {env.delaySec > 60 && <p className="mt-2 text-xs text-watch">Long delay at {env.name.toLowerCase()}: act on the steps now, don't wait for the reply.</p>}
          </div>

          <div className="rounded-3xl bg-white/6 p-5">
            <h3 className="text-sm font-semibold">Latest vitals sent</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              {VITALS.map((id) => {
                const r = latest(id);
                const unknown = freshness(id).unknown || !r;
                return (
                  <div key={id}>
                    <dt className="text-xs text-white/60">{indicators[id].name}</dt>
                    <dd className={cn("text-lg font-black tabular", unknown && "text-watch")}>
                      {unknown ? "Unknown" : `${indicators[id].format(r!)} `}
                      {!unknown && <span className="text-xs font-normal text-white/60">{indicators[id].unit}</span>}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
