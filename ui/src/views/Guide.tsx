import { useState } from "react";
import { ChevronDown, Globe2, Orbit, Radiation, ShieldAlert, Users, ExternalLink } from "lucide-react";
import { indicatorList, levelMeta, type IndicatorId, type Level } from "@/lib/indicators";
import { Explainer, Page } from "@/components/shared";
import { cn } from "@/lib/utils";

// NASA Human Research Program's five hazards of human spaceflight.
const hazards = [
  { icon: Radiation, name: "Space radiation", text: "Higher doses outside Earth's magnetic field damage cells and raise long-term risk.", affects: ["radiation", "temperature"] },
  { icon: Users, name: "Isolation and confinement", text: "Months with a small crew in a small space wear on sleep, mood and teamwork.", affects: ["mood", "sleep"] },
  { icon: Globe2, name: "Distance from Earth", text: "Help from the ground is minutes away, so the crew has to assess and act first.", affects: [] },
  { icon: Orbit, name: "Gravity fields", text: "Weightlessness and gravity changes shift fluids and weaken bones, muscles and the heart.", affects: ["heart_rate", "blood_pressure"] },
  { icon: ShieldAlert, name: "Hostile, closed environment", text: "Recycled air, noise, CO₂ and microbes in a sealed cabin stress the immune system.", affects: ["temperature", "blood_sugar"] },
] as const;

const resources = [
  { name: "NASA: 5 hazards of human spaceflight", href: "https://www.nasa.gov/hrp/hazards/" },
  { name: "NASA: risks of human spaceflight", href: "https://www.nasa.gov/hrp/risks/" },
  { name: "NASA: ongoing HRP research in space", href: "https://www.nasa.gov/hrp/ongoing-hrp-research/" },
  { name: "CSA: monitoring radiation for astronaut health", href: "https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp" },
];

export function Guide() {
  const [open, setOpen] = useState<IndicatorId | null>("heart_rate");
  return (
    <Page title="Guide" intro="You don't need medical training to use this. Here's how each measurement works, what it tells you, and how space changes it.">
      <section aria-labelledby="hazards-title">
        <h2 id="hazards-title" className="text-xl font-black">The five hazards of spaceflight</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {hazards.map((h) => (
            <li key={h.name} className="panel p-5">
              <h.icon size={22} strokeWidth={1.6} aria-hidden />
              <h3 className="mt-3 font-bold">{h.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{h.text}</p>
              {h.affects.length > 0 && (
                <p className="mt-3 text-xs text-white/55">
                  Watch: {h.affects.map((a) => indicatorList.find((i) => i.id === a)!.name.toLowerCase()).join(", ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="ref-title">
          <h2 id="ref-title" className="text-xl font-black">Measurements</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {indicatorList.map((ind) => {
              const isOpen = open === ind.id;
              return (
                <li key={ind.id} className="panel">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`ref-${ind.id}`}
                      onClick={() => setOpen(isOpen ? null : ind.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span>
                        <span className="block font-semibold">{ind.name}</span>
                        <span className="block text-sm text-white/60">
                          Steady {ind.band[0]}–{ind.band[1]} {ind.unit}, {ind.scheduleHint.toLowerCase()}
                        </span>
                      </span>
                      <ChevronDown size={18} className={cn("shrink-0 transition-transform", isOpen && "rotate-180")} aria-hidden />
                    </button>
                  </h3>
                  {isOpen && (
                    <div id={`ref-${ind.id}`} className="grid gap-6 border-t border-white/10 px-5 py-5 md:grid-cols-2">
                      <Explainer id={ind.id} />
                      <div className="flex flex-col gap-3">
                        <p className="text-sm font-semibold">What each colour means for you</p>
                        {(["steady", "watch", "act"] as Level[]).map((l) => (
                          <div key={l} className={cn("rounded-xl p-3 text-sm", levelMeta[l].bg)}>
                            <span className={cn("font-medium", levelMeta[l].text)}>{levelMeta[l].label}. </span>
                            <span className="text-white/85">{ind.todo[l]}</span>
                            {ind.escalate[l] && (
                              <span className="mt-1 block text-xs text-white/60">{ind.escalate[l] === "flight_surgeon" ? "Contact the flight surgeon." : "Tell a crewmate."}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="flex flex-col gap-5">
          <section className="panel p-6" aria-labelledby="when-title">
            <h2 id="when-title" className="text-lg font-black">When to bring someone in</h2>
            <dl className="mt-4 flex flex-col gap-4 text-sm leading-relaxed">
              <div>
                <dt className="font-semibold text-steady">Handle it yourself</dt>
                <dd className="text-white/70">Steady readings, or a single watch reading you can re-check soon.</dd>
              </div>
              <div>
                <dt className="font-semibold text-watch">Tell a crewmate</dt>
                <dd className="text-white/70">Any symptom, a missing reading you can't take, or watch readings that keep repeating. The Live check handoff alerts the crew.</dd>
              </div>
              <div>
                <dt className="font-semibold text-act">Message the flight surgeon</dt>
                <dd className="text-white/70">An act-now reading that doesn't settle after you re-check. On Mars, act on crew protocol first: the reply can take over 20 minutes.</dd>
              </div>
            </dl>
          </section>
          <section className="panel p-6" aria-labelledby="src-title">
            <h2 id="src-title" className="text-lg font-black">Sources</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {resources.map((r) => (
                <li key={r.href}>
                  <a href={r.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-white/80 underline decoration-white/30 hover:text-white">
                    {r.name} <ExternalLink size={13} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-white/55">Thresholds in this demo are illustrative and use synthetic data. They are not medical advice.</p>
          </section>
        </aside>
      </div>
    </Page>
  );
}
