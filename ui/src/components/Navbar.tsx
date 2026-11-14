import { useEffect, useRef, useState } from "react";
import { Check, Infinity, Menu, Settings2, Siren, X } from "lucide-react";
import { go, type Route } from "@/lib/router";
import { useStore } from "@/lib/store";
import { environments, formatDelay } from "@/lib/environments";
import { indicatorList } from "@/lib/indicators";
import { cn } from "@/lib/utils";

// Every page is one click away: no dropdowns.
const navLinks: { label: string; route: Route }[] = [
  { label: "Status", route: "home" },
  { label: "Body map", route: "body" },
  { label: "Trends", route: "trends" },
  { label: "Live check", route: "live" },
  { label: "Plan", route: "routine" },
  { label: "Guide", route: "guide" },
];

const isActive = (r: Route, route: Route) => r === route || (r === "home" && route === "overview");
const href = (r: Route) => (r === "home" ? "#/" : `#/${r}`);

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

export function Navbar({ route }: { route: Route }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useDismiss(settingsOpen, () => setSettingsOpen(false));
  const { levelOf, startEmergency } = useStore();
  const badges: Partial<Record<Route, number>> = {
    home: indicatorList.filter((i) => levelOf(i.id) === "act").length,
  };
  const activeIndex = Math.max(0, navLinks.findIndex((l) => isActive(l.route, route)));

  useEffect(() => setMenuOpen(false), [route]);

  return (
    <>
      <nav aria-label="Main" className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <a href="#/" className="flex shrink-0 items-center gap-2 text-base font-black tracking-tight text-white">
          <Infinity size={22} strokeWidth={1.5} aria-hidden />
          <span>Crew Health</span>
        </a>

        {/* Tab bar (layout from Uiverse.io by Pradeepsaranbishnoi): a highlight slides to the active tab. */}
        <div className="nav-tabs hidden lg:flex" style={{ ["--active" as string]: activeIndex }}>
          <span className="nav-glider" aria-hidden />
          {navLinks.map((l, i) => {
            const n = badges[l.route] ?? 0;
            return (
              <a key={l.route} href={href(l.route)} aria-current={i === activeIndex ? "page" : undefined} className={cn("nav-tab", i === activeIndex && "is-active")}>
                {l.label}
                {n > 0 && (
                  <span className="nav-notification" aria-label={`${n} need action`}>
                    {n}
                  </span>
                )}
              </a>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={startEmergency}
            className="flex h-10 items-center gap-2 rounded-full bg-act px-4 text-sm font-black text-black shadow-[0_0_20px_rgb(255_138_122/45%)] transition-transform hover:brightness-110 active:scale-95"
          >
            <Siren size={16} aria-hidden />
            <span className="hidden sm:inline">Emergency</span>
            <span className="sr-only sm:hidden">Emergency</span>
          </button>
          <div ref={settingsRef} className="relative hidden lg:block">
            <button
              type="button"
              aria-expanded={settingsOpen}
              aria-haspopup="dialog"
              aria-label="Settings"
              onClick={() => setSettingsOpen((o) => !o)}
              className="liquid-glass grid size-10 place-items-center rounded-full text-white transition-colors hover:bg-white/5"
            >
              <Settings2 size={17} aria-hidden />
            </button>
            {settingsOpen && <SettingsPanel className="absolute right-0 top-[calc(100%+10px)] w-80" />}
          </div>
          <button
            type="button"
            className="liquid-glass grid size-10 place-items-center rounded-full text-white lg:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="absolute left-4 right-4 top-[76px] z-30 flex flex-col gap-1 rounded-2xl bg-[#0c111c]/95 p-3 ring-1 ring-white/10 lg:hidden">
          {navLinks.map((l) => (
            <button
              key={l.route}
              type="button"
              onClick={() => {
                setMenuOpen(false);
                go(l.route);
              }}
              className={cn("flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm", isActive(l.route, route) ? "bg-white/12 font-semibold text-white" : "text-white/75 hover:text-white")}
            >
              {l.label}
              {(badges[l.route] ?? 0) > 0 && <span className="rounded-full bg-act px-2 text-xs font-bold text-black">{badges[l.route]}</span>}
            </button>
          ))}
          <SettingsPanel className="mt-2 border-t border-white/10 pt-2" inline />
        </div>
      )}
    </>
  );
}

/** Mission environment and the animation switch, kept out of the way. */
function SettingsPanel({ className, inline = false }: { className?: string; inline?: boolean }) {
  const { env, setEnv, motionPref, setMotionPref } = useStore();
  const motionOn = motionPref === "full";
  return (
    <div role="group" aria-label="Settings" className={cn(!inline && "z-30 rounded-2xl bg-[#0c111c]/95 p-2 ring-1 ring-white/10", className)}>
      <p className="px-3 pb-1 pt-2 text-xs font-semibold text-white/55">Mission environment</p>
      {environments.map((e) => (
        <button
          key={e.id}
          type="button"
          aria-pressed={env.id === e.id}
          onClick={() => setEnv(e.id)}
          className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors", env.id === e.id ? "bg-white/12" : "hover:bg-white/8")}
        >
          <span className="mt-0.5 w-4 shrink-0">{env.id === e.id && <Check size={15} aria-hidden />}</span>
          <span>
            <span className="block text-sm text-white">{e.name}</span>
            <span className="block text-xs text-white/55">
              {e.gravity}, ground delay {formatDelay(e.delaySec)}
            </span>
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => setMotionPref(motionOn ? "reduced" : "full")}
        aria-pressed={motionOn}
        className="mt-1 flex w-full items-center justify-between rounded-xl border-t border-white/10 px-3 py-3 text-sm text-white"
      >
        Animations
        <span className={cn("relative h-6 w-11 rounded-full transition-colors", motionOn ? "bg-steady" : "bg-white/20")}>
          <span className={cn("absolute top-1 size-4 rounded-full bg-white transition-[left]", motionOn ? "left-6" : "left-1")} />
        </span>
      </button>
    </div>
  );
}
