import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import HoloCard, { type HoloPreset } from "@/components/HoloCard/HoloCard";
import { drawBadgeCard, drawCardBack, drawCrewCard, type BadgeId, type CrewCardData } from "@/lib/cardArt";
import { indicatorList, indicators, type IndicatorId, type Level } from "@/lib/indicators";
import { formatDelay } from "@/lib/environments";
import { TODAY } from "@/lib/history";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Renders card art asynchronously and caches it by its inputs. */
const artCache = new Map<string, string>();
function useArt(key: string, draw: () => Promise<string>) {
  const [src, setSrc] = useState<string | undefined>(artCache.get(key));
  useEffect(() => {
    let live = true;
    const hit = artCache.get(key);
    if (hit) {
      setSrc(hit);
      return;
    }
    draw().then((url) => {
      artCache.set(key, url);
      if (live) setSrc(url);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return src;
}

export function useCardBack() {
  return useArt("back", drawCardBack);
}

const shortName: Record<IndicatorId, string> = {
  heart_rate: "Heart rate",
  blood_pressure: "Blood pressure",
  blood_sugar: "Blood sugar",
  temperature: "Temperature",
  sleep: "Sleep",
  mood: "Mood",
  radiation: "Radiation",
};
const score: Record<Level, number> = { steady: 100, watch: 62, act: 28 };

/** Rarity climbs with the streak: plain glitter → stars → cosmos → rainbow. */
function rarityFor(streak: number): { name: string; stars: number; preset: HoloPreset; intensity: number; scale: number } {
  // Intensities stay modest: the foil covers the whole face, so text must stay readable.
  if (streak >= 30) return { name: "Legendary", stars: 4, preset: "rainbow", intensity: 0.55, scale: 1 };
  if (streak >= 10) return { name: "Rare holo", stars: 3, preset: "cosmos", intensity: 0.42, scale: 1.6 };
  if (streak >= 3) return { name: "Holo", stars: 2, preset: "stars", intensity: 0.45, scale: 1.4 };
  return { name: "Common", stars: 1, preset: "glitter", intensity: 0.3, scale: 1 };
}

export function useCrewCard() {
  const { levelOf, latest, env, streak, level, dueToday } = useStore();
  const levels = indicatorList.map((i) => [i.id, levelOf(i.id)] as const).filter((x): x is readonly [IndicatorId, Level] => !!x[1]);
  const readiness = Math.round(levels.reduce((s, [, l]) => s + score[l], 0) / Math.max(1, levels.length));
  const rank = { act: 0, watch: 1, steady: 2 };
  const sorted = [...levels].sort((a, b) => rank[a[1]] - rank[b[1]]);
  const worst = sorted.find(([id, l]) => l !== "steady" && id !== "heart_rate");
  const strongest = sorted.reverse().find(([id, l]) => l === "steady" && id !== "heart_rate");
  const hr = latest("heart_rate");
  const focusReading = worst && latest(worst[0]);
  const rarity = rarityFor(streak);
  const allDone = dueToday.length === 0;

  const data: CrewCardData = {
    crew: "CM-2",
    readiness,
    env: env.id,
    envName: env.name,
    gravity: env.gravity,
    delay: formatDelay(env.delaySec),
    day: TODAY,
    heartRate: hr?.value ?? 0,
    heartLevel: levelOf("heart_rate") ?? "steady",
    focus:
      worst && focusReading
        ? { name: shortName[worst[0]], value: `${indicators[worst[0]].format(focusReading)} ${indicators[worst[0]].unit}`, tip: indicators[worst[0]].todo[worst[1]], level: worst[1] }
        : null,
    weakness: worst ? shortName[worst[0]] : "None",
    strength: strongest ? shortName[strongest[0]] : "Heart rate",
    level,
    streak,
    rarity: allDone ? `${rarity.name}, gold` : rarity.name,
    stars: rarity.stars,
  };
  const image = useArt(`crew:${JSON.stringify(data)}`, () => drawCrewCard(data));
  return { data, image, rarity, allDone };
}

export function CrewCard({ width = 260 }: { width?: number }) {
  const { data, image, rarity, allDone } = useCrewCard();
  const back = useCardBack();
  const [big, setBig] = useState(false);
  const card = (w: number) => (
    <HoloCard
      image={image}
      backImage={back}
      alt={`Crew card for ${data.crew}: readiness ${data.readiness}, ${data.rarity}. Select to flip.`}
      preset={rarity.preset}
      intensity={rarity.intensity}
      scale={rarity.scale}
      foilColor={allDone ? "#f3d27a" : "#e2e6ec"}
      width={w}
      radius={Math.round(w * 0.045)}
    />
  );
  return (
    <figure className="flex flex-col items-center gap-3">
      {card(width)}
      <button type="button" onClick={() => setBig(true)} className="liquid-glass rounded-full px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors">
        View large
      </button>
      <CardViewer open={big} onClose={() => setBig(false)} title={`Crew card for ${data.crew}`}>
        {card(Math.min(380, typeof innerWidth === "number" ? innerWidth - 64 : 380))}
      </CardViewer>
      <figcaption className="text-center text-xs text-white/60">
        {rarity.name} card{allDone ? " with gold foil" : ""}. Tilt it, or select it to flip.
        <span className="block">{allDone ? "All check-ins done today." : "Finish today's check-ins to unlock gold foil."}</span>
      </figcaption>
    </figure>
  );
}

const badgePreset: Record<BadgeId, HoloPreset> = {
  streak7: "stars",
  "first-log": "shards",
  "full-day": "swirl",
  surgeon: "cosmos",
  streak30: "gold",
};

function BadgeCard({ b, index, total, width, onOpen }: { b: { id: string; name: string; detail: string; earned: boolean }; index: number; total: number; width: number; onOpen?: () => void }) {
  const id = b.id as BadgeId;
  const image = useArt(`badge:${id}:${b.earned}`, () => drawBadgeCard({ id, name: b.name, detail: b.detail, earned: b.earned, index, total }));
  const card = (
    <HoloCard
      image={image}
      alt={`${b.name} badge, ${b.earned ? "earned" : "locked"}: ${b.detail}`}
      preset={badgePreset[id]}
      intensity={b.earned ? 0.55 : 0}
      edgeSparkle={b.earned ? 0.8 : 0.15}
      glare={b.earned ? 0.5 : 0.2}
      idle={b.earned}
      width={width}
      radius={Math.round(width * 0.045)}
      tiltMax={b.earned ? 14 : 6}
    />
  );
  if (!onOpen) return card;
  return (
    <button type="button" onClick={onOpen} className={cn("rounded-2xl transition-opacity", !b.earned && "opacity-70 hover:opacity-100")} aria-label={`Open ${b.name} badge`}>
      {card}
    </button>
  );
}

export function BadgeCollection() {
  const { badges } = useStore();
  const [open, setOpen] = useState<number | null>(null);
  const earned = badges.filter((b) => b.earned).length;
  return (
    <section className="panel mt-5 p-6" aria-labelledby="badges-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="badges-title" className="text-lg font-black">Badge collection</h2>
        <span className="text-sm text-white/60 tabular">
          {earned} of {badges.length} collected
        </span>
      </div>
      <ul className="mt-5 grid grid-cols-2 justify-items-center gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {badges.map((b, i) => (
          <li key={b.id} className="flex flex-col items-center gap-2">
            <BadgeCard b={b} index={i} total={badges.length} width={150} onOpen={() => setOpen(i)} />
            <span className={cn("text-xs", b.earned ? "text-white/80" : "text-white/50")}>{b.earned ? b.name : "Locked"}</span>
          </li>
        ))}
      </ul>
      <CardViewer open={open !== null} onClose={() => setOpen(null)} title={open !== null ? badges[open].name : ""}>
        {open !== null && <BadgeCard b={badges[open]} index={open} total={badges.length} width={340} />}
      </CardViewer>
    </section>
  );
}

/** Full-screen viewer for one card, closes on Escape or a click outside. */
export function CardViewer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);
  // Portal to <body>: blurred/transformed ancestors would otherwise trap position: fixed.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div initial={{ scale: 0.8, y: 30, rotate: -4 }} animate={{ scale: 1, y: 0, rotate: 0 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className="flex flex-col items-center gap-4">
            {children}
            <p className="text-sm text-white/70">Move your pointer over the card to tilt it. Flippable cards turn over when selected.</p>
          </motion.div>
          <button ref={closeRef} type="button" onClick={onClose} className="liquid-glass absolute right-5 top-5 grid size-11 place-items-center rounded-full text-white hover:bg-white/5" aria-label="Close">
            <X size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
