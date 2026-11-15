import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Page } from "@/components/shared";
import { CircleCheck, CircleAlert, FlaskConical } from "lucide-react";
import { scenarios, scenarioNames } from "@/lib/scenarios";
import { diffAssessment, evaluate, eventTime, ms } from "@/lib/engine";
import type { Assessment, CrewEvent, Scenario } from "@/lib/types";
import { StatusPanel, type Reason } from "@/components/StatusPanel";
import { Timeline } from "@/components/Timeline";
import { HandoffPanel } from "@/components/HandoffPanel";
import { cn } from "@/lib/utils";

const STEP = 30_000;

function range(s: Scenario) {
  const evalAt = s.expected ? ms(s.expected.evaluated_at) : null;
  const times = [...s.readings.map((r) => ms(r.measured_at)), ...s.events.map((e) => ms(eventTime(e)))];
  const end = evalAt ?? (times.length ? Math.max(...times) + 60_000 : Date.now());
  const start = s.readings.length ? ms(s.readings[0].measured_at) : end - 40 * 60_000;
  return { start, end };
}

/** Links each reason sentence to the reading/event it is about, for timeline highlighting. */
function linkReasons(a: Assessment, events: CrewEvent[]): Reason[] {
  const idsOf = (type: CrewEvent["type"]) => events.filter((e) => e.type === type && a.contributing_ids.includes(e.event_id)).map((e) => e.event_id);
  const readingId = a.current_hr.last_reliable ? a.contributing_ids.slice(0, 1) : [];
  return a.reasons.map((text) => {
    if (text.startsWith("Last re")) return { text, ids: readingId };
    if (text.startsWith("Open symptom")) return { text, ids: idsOf("symptom_report") };
    if (text.startsWith("Wrist sensor")) return { text, ids: idsOf("sensor_disconnected") };
    if (text.startsWith("Assistance")) return { text, ids: idsOf("assistance_requested") };
    if (text.startsWith("Handoff")) return { text, ids: idsOf("handoff_acknowledged") };
    return { text, ids: [] };
  });
}

export function LiveCheck() {
  const [scenarioId, setScenarioId] = useState(scenarios.find((s) => s.id === "C")?.id ?? scenarios[0]?.id);
  const scenario = scenarios.find((s) => s.id === scenarioId)!;
  const { start, end } = useMemo(() => range(scenario), [scenario]);

  const [added, setAdded] = useState<Record<string, CrewEvent[]>>({});
  const [playhead, setPlayhead] = useState(end);
  const [playing, setPlaying] = useState(false);
  const [highlight, setHighlight] = useState<string[]>([]);

  useEffect(() => {
    setPlayhead(end);
    setPlaying(false);
  }, [scenarioId, end]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setPlayhead((t) => {
        if (t + STEP >= end) {
          setPlaying(false);
          return end;
        }
        return t + STEP;
      });
    }, 320);
    return () => clearInterval(id);
  }, [playing, end]);

  const myEvents = added[scenarioId] ?? [];
  const events = useMemo(() => [...scenario.events, ...myEvents], [scenario, myEvents]);
  const iso = new Date(playhead).toISOString().replace(".000Z", "Z");
  const assessment = useMemo(
    () => evaluate({ readings: scenario.readings, events }, iso, { crewId: scenario.expected?.crew_id, missionDay: scenario.expected?.mission_day }),
    [scenario, events, iso],
  );
  const reasons = useMemo(() => linkReasons(assessment, events), [assessment, events]);

  const atEvaluation = scenario.expected && playhead === ms(scenario.expected.evaluated_at) && myEvents.length === 0;
  const mismatch = atEvaluation ? diffAssessment(assessment, scenario.expected!) : null;

  function add(e: Omit<CrewEvent, "event_id" | "crew_id">) {
    const ev = { ...e, event_id: `UI-${Date.now().toString(36)}`, crew_id: "CM-2", source: "crew_input", synthetic: true, user_added: true } as CrewEvent;
    setAdded((m) => ({ ...m, [scenarioId]: [...(m[scenarioId] ?? []), ev] }));
  }

  return (
    <Page
      title="Live check"
      intro="Replays the team's heart-rate scenarios minute by minute. The app only trusts a reading for 2 minutes, shows what it can't confirm, and opens a crew handoff when a symptom is reported or help is asked for."
      aside={
        <dl className="panel flex gap-6 px-5 py-3 text-sm">
          <div>
            <dt className="text-white/60">Crew member</dt>
            <dd className="font-medium">{assessment.crew_id}</dd>
          </div>
          <div>
            <dt className="text-white/60">Mission day</dt>
            <dd className="font-medium tabular">{assessment.mission_day}</dd>
          </div>
          <div>
            <dt className="text-white/60">Ship time</dt>
            <dd className="font-medium tabular">{iso.slice(11, 16)} UTC</dd>
          </div>
        </dl>
      }
    >
        <nav aria-label="Demo scenarios" className="mb-6">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div role="group" aria-label="Scenario" className="liquid-glass inline-flex gap-1 rounded-xl p-2">
              {scenarios.map((s) => {
                const name = scenarioNames[s.id] ?? { title: `Scenario ${s.id}`, detail: "" };
                const on = s.id === scenarioId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    title={name.detail}
                    onClick={() => setScenarioId(s.id)}
                    className={cn(
                      "relative flex shrink-0 items-center gap-2.5 rounded-md py-1 pl-1 pr-4 text-sm min-h-11 transition-colors",
                      on ? "text-ink font-black" : "text-ink-3 hover:text-ink",
                    )}
                  >
                    {on && (
                      <motion.span
                        layoutId="scenario-pill"
                        className="absolute inset-0 rounded-full bg-paper shadow-[0_0_0_.5px_rgb(42_39_35/8%),0_3px_10px_rgb(42_39_35/12%)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        aria-hidden
                      />
                    )}
                    <span className={cn("relative grid size-8 place-items-center rounded-full text-[13px] font-black transition-colors", on ? "bg-navy text-white" : "bg-sunken text-ink-2")}>{s.id}</span>
                    <span className="relative">{name.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-2">{scenarioNames[scenarioId]?.detail}</p>
        </nav>

        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-5 lg:row-span-2">
            <StatusPanel assessment={assessment} reasons={reasons} onHighlight={setHighlight} />
          </div>
          <div className="lg:col-span-7 min-w-0">
            <Timeline
              readings={scenario.readings}
              events={events}
              start={start}
              end={end}
              playhead={playhead}
              onSeek={(t) => {
                setPlaying(false);
                setPlayhead(t);
              }}
              playing={playing}
              onTogglePlay={() => {
                if (!playing && playhead >= end) setPlayhead(start);
                setPlaying((p) => !p);
              }}
              highlight={highlight}
            />
          </div>
          <div className="lg:col-span-7">
            <HandoffPanel
              assessment={assessment}
              onReportSymptom={(symptom) =>
                add({ type: "symptom_report", symptom, reporter: "self", reported_at: iso, onset_at: iso, onset_certainty: "approximate", status: "open" } as Omit<CrewEvent, "event_id" | "crew_id">)
              }
              onRequestHelp={() => add({ type: "assistance_requested", by: "CM-2", time: iso } as Omit<CrewEvent, "event_id" | "crew_id">)}
              onAcknowledge={() => add({ type: "handoff_acknowledged", by: "CM-3", time: iso } as Omit<CrewEvent, "event_id" | "crew_id">)}
              onUndo={() => setAdded((m) => ({ ...m, [scenarioId]: (m[scenarioId] ?? []).slice(0, -1) }))}
              canUndo={myEvents.length > 0}
            />
          </div>
        </div>

        <footer className="mt-8 flex flex-wrap items-center gap-3 text-sm text-ink-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1">
            <FlaskConical className="size-4" aria-hidden /> Synthetic data
          </span>
          <span className="rounded-full border border-line px-3 py-1">Illustrative demo rules, version {assessment.rule_version}</span>
          {mismatch && (
            <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1", mismatch.length ? "text-rose border border-rose/40" : "text-sage-ink border border-sage/40")}>
              {mismatch.length ? <CircleAlert className="size-4" aria-hidden /> : <CircleCheck className="size-4" aria-hidden />}
              {mismatch.length ? `Differs from scenario_${scenarioId}_expected.json: ${mismatch.join(", ")}` : `Matches scenario_${scenarioId}_expected.json`}
            </span>
          )}
        </footer>
    </Page>
  );
}
