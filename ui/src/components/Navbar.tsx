import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Infinity, Menu, Pause, Sparkles, X } from "lucide-react";
import { go, type Route } from "@/lib/router";
import { useStore } from "@/lib/store";
import { environments, formatDelay } from "@/lib/environments";
import { indicatorList } from "@/lib/indicators";
import { cn } from "@/lib/utils";

type NavLink = { label: string; route?: Route; dropdown?: { label: string; route: Route; detail: string }[] };

const navLinks: NavLink[] = [
  { label: "Home", route: "home" },
  {
    label: "Vitals",
    dropdown: [
      { label: "Overview", route: "overview", detail: "Every indicator at a glance" },
      { label: "Body map", route: "body", detail: "Tap a body part to see its status" },
      { label: "Trends", route: "trends", detail: "30 mission days, charted" },
      { label: "Live check", route: "live", detail: "Heart rate replay and crew handoff" },
    ],
  },
  { label: "Routine", route: "routine" },
  { label: "Guide", route: "guide" },
];

const isActive = (l: NavLink, route: Route) => l.route === route || !!l.dropdown?.some((d) => d.route === route);

/** Closes a popover on outside click or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("pointerdown", onDown);
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("pointerdown", onDown);
      removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

export function Navbar({ route, dockedLogo = false }: { route: Route; dockedLogo?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const vitalsRef = useDismiss(vitalsOpen, () => setVitalsOpen(false));
  const envRef = useDismiss(envOpen, () => setEnvOpen(false));
  const { env, setEnv, motionPref, setMotionPref, dueToday, levelOf } = useStore();
  const actCount = indicatorList.filter((i) => levelOf(i.id) === "act").length;
  const activeIndex = Math.max(0, navLinks.findIndex((l) => isActive(l, route)));
  // Flag the tab bar while the glider travels, so CSS can play its stretch.
  const [moving, setMoving] = useState(false);
  const prevIndex = useRef(activeIndex);
  useEffect(() => {
    if (prevIndex.current === activeIndex) return;
    prevIndex.current = activeIndex;
    setMoving(true);
    const t = setTimeout(() => setMoving(false), 560);
    return () => clearTimeout(t);
  }, [activeIndex]);
  const motionOn = motionPref === "full";
  const toggleMotion = () => setMotionPref(motionOn ? "reduced" : "full");

  useEffect(() => setMenuOpen(false), [route]);

  const navigate = (r: Route) => {
    setVitalsOpen(false);
    setMenuOpen(false);
    go(r);
  };

  return (
    <>
      <nav aria-label="Main" className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 sm:px-8 py-5">
        <a href="#/" className="flex items-center gap-2 text-white font-black tracking-tight text-base">
          {dockedLogo ? <span className="inline-block size-9" aria-hidden /> : <Infinity size={22} strokeWidth={1.5} aria-hidden />}
          <span>Crew Health</span>
        </a>

        {/* Tab bar (style from Uiverse.io by Pradeepsaranbishnoi): a glider slides behind the active tab. */}
        <div className="nav-tabs hidden md:flex" data-moving={moving ? "" : undefined} style={{ ["--active" as string]: activeIndex }}>
          <span className="nav-glider" aria-hidden />
          {navLinks.map((l, i) => {
            const on = i === activeIndex;
            const badge = l.label === "Routine" ? dueToday.length : l.label === "Vitals" ? actCount : 0;
            const badgeEl = badge > 0 && (
              <span className="nav-notification" aria-label={l.label === "Routine" ? `${badge} check-ins due` : `${badge} need action`}>
                {badge}
              </span>
            );
            return l.dropdown ? (
              <div key={l.label} ref={vitalsRef} className="relative">
                <button
                  type="button"
                  aria-expanded={vitalsOpen}
                  aria-haspopup="true"
                  onClick={() => setVitalsOpen((o) => !o)}
                  className={cn("nav-tab", on && "is-active")}
                >
                  {l.label}
                  <ChevronDown size={12} className={cn("ml-0.5 transition-transform", vitalsOpen && "rotate-180")} aria-hidden />
                  {badgeEl}
                </button>
                {vitalsOpen && (
                  <div className="liquid-glass absolute left-1/2 top-[calc(100%+18px)] w-64 -translate-x-1/2 rounded-xl p-1.5 bg-black/60">
                    {l.dropdown.map((d) => (
                      <a
                        key={d.route}
                        href={`#/${d.route}`}
                        onClick={() => setVitalsOpen(false)}
                        aria-current={route === d.route ? "page" : undefined}
                        className={cn("block rounded-lg px-3 py-2.5 transition-colors", route === d.route ? "bg-white/15" : "hover:bg-white/10")}
                      >
                        <span className="block text-sm font-semibold text-white">{d.label}</span>
                        <span className="block text-xs text-white/60">{d.detail}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <a key={l.label} href={l.route === "home" ? "#/" : `#/${l.route}`} aria-current={on ? "page" : undefined} className={cn("nav-tab", on && "is-active")}>
                {l.label}
                {badgeEl}
              </a>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMotion}
            aria-pressed={!motionOn}
            title={motionOn ? "Reduce motion" : "Turn animation back on"}
            className="liquid-glass grid size-10 place-items-center rounded-full text-white hover:bg-white/5 transition-colors"
          >
            {motionOn ? <Pause size={16} aria-hidden /> : <Sparkles size={16} aria-hidden />}
            <span className="sr-only">Reduce motion</span>
          </button>
          <div ref={envRef} className="relative">
            <button
              type="button"
              aria-expanded={envOpen}
              aria-haspopup="listbox"
              aria-label={`Mission environment: ${env.name}. Change`}
              onClick={() => setEnvOpen((o) => !o)}
              className="liquid-glass flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2.5 rounded-full hover:bg-white/5 transition-colors"
            >
              {env.short}
              <ChevronDown size={13} className="mt-px" aria-hidden />
            </button>
            {envOpen && <EnvMenu onPick={() => setEnvOpen(false)} className="absolute right-0 top-[calc(100%+10px)] w-72" />}
          </div>
          <button type="button" onClick={() => go("routine")} className="bg-white text-black text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-white/90 transition-colors">
            Begin check-in
          </button>
        </div>

        <button
          type="button"
          className="md:hidden liquid-glass text-white p-2 rounded-lg"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="absolute top-[72px] left-4 right-4 z-30 md:hidden liquid-glass rounded-2xl p-4 flex flex-col gap-1 bg-black/75">
          {navLinks.flatMap((l) =>
            l.dropdown
              ? l.dropdown.map((d) => (
                  <button
                    key={d.route}
                    type="button"
                    onClick={() => navigate(d.route)}
                    className={cn("flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm", route === d.route ? "bg-white/15 text-white" : "text-white/70 hover:text-white")}
                  >
                    <span>
                      <span className="text-white/50">Vitals · </span>
                      {d.label}
                    </span>
                  </button>
                ))
              : [
                  <button
                    key={l.label}
                    type="button"
                    onClick={() => navigate(l.route!)}
                    className={cn("flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm", route === l.route ? "bg-white/15 text-white" : "text-white/70 hover:text-white")}
                  >
                    {l.label}
                  </button>,
                ],
          )}
          <div className="mt-2 pt-3 border-t border-white/10">
            <p className="px-1 pb-2 text-xs text-white/60">Mission environment</p>
            <div className="flex flex-wrap gap-2">
              {environments.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={env.id === e.id}
                  onClick={() => setEnv(e.id)}
                  className={cn("rounded-full px-3 py-2 text-sm transition-colors", env.id === e.id ? "bg-white text-black" : "liquid-glass text-white hover:bg-white/5")}
                >
                  {e.short}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={toggleMotion}
            aria-pressed={!motionOn}
            className="mt-2 flex items-center justify-between rounded-lg px-4 py-3 text-sm text-white/80 hover:text-white border-t border-white/10"
          >
            Reduce motion
            <span className={cn("relative h-6 w-11 rounded-full transition-colors", motionOn ? "bg-white/20" : "bg-white")}>
              <span className={cn("absolute top-1 size-4 rounded-full transition-[left,background-color]", motionOn ? "left-1 bg-white" : "left-6 bg-black")} />
            </span>
          </button>
          <div className="flex gap-2 mt-2 pt-3 border-t border-white/10">
            <button type="button" onClick={() => navigate("guide")} className="flex-1 liquid-glass text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-white/5 transition-colors">
              Guide
            </button>
            <button type="button" onClick={() => navigate("routine")} className="flex-1 bg-white text-black text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-white/90 transition-colors">
              Begin check-in
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function EnvMenu({ onPick, className }: { onPick: () => void; className?: string }) {
  const { env, setEnv } = useStore();
  return (
    <div role="listbox" aria-label="Mission environment" className={cn("liquid-glass z-30 rounded-xl p-1.5 bg-black/50", className)}>
      {environments.map((e) => (
        <button
          key={e.id}
          type="button"
          role="option"
          aria-selected={env.id === e.id}
          onClick={() => {
            setEnv(e.id);
            onPick();
          }}
          className={cn("flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", env.id === e.id ? "bg-white/15" : "hover:bg-white/10")}
        >
          <span className="mt-0.5 w-4 shrink-0">{env.id === e.id && <Check size={16} aria-hidden />}</span>
          <span>
            <span className="block text-sm text-white">{e.name}</span>
            <span className="block text-xs text-white/60">
              {e.gravity}, ground delay {formatDelay(e.delaySec)}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
