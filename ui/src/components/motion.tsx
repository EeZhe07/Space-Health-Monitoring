import { useEffect, useRef } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform, type Variants } from "motion/react";
import { useStore } from "@/lib/store";

/** True when the crew member has switched animation off in the navbar. */
export function useMotionOff() {
  return useStore().motionPref === "reduced";
}

/** Same check for code outside React (canvas loops). */
export const motionOff = () => document.documentElement.dataset.motion === "reduced";
import { cn } from "@/lib/utils";

/** Counts smoothly from the previous value to the new one. */
export function AnimatedNumber({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const reduce = useMotionOff();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(v));
  const first = useRef(true);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    // First mount counts up from a little below so the number "arrives".
    const from = first.current ? value * 0.6 : mv.get();
    first.current = false;
    const c = animate(mv, value, { from, duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [value, reduce, mv]);
  return <motion.span className={cn("tabular", className)}>{text}</motion.span>;
}

/** A heart that beats at the given rate. */
export function BeatingHeart({ bpm, className, size = 18 }: { bpm: number; className?: string; size?: number }) {
  const reduce = useMotionOff();
  const period = 60 / Math.max(30, Math.min(200, bpm));
  return (
    <motion.svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
      animate={reduce ? undefined : { scale: [1, 1.22, 0.96, 1.1, 1] }}
      transition={reduce ? undefined : { duration: period, times: [0, 0.14, 0.28, 0.42, 1], repeat: Infinity, ease: "easeOut" }}
    >
      <path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.2 4.5 6 4.5c2.2 0 3.6 1.3 6 3.6 2.4-2.3 3.8-3.6 6-3.6 3.8 0 5.6 3.9 4 7.2C19.5 16.4 12 21 12 21z" fill="currentColor" />
    </motion.svg>
  );
}

/**
 * Scrolling ECG trace. One PQRST complex per beat, so the speed of the
 * trace follows the heart rate.
 */
export function EcgTrace({ bpm, className, color = "currentColor" }: { bpm: number; className?: string; color?: string }) {
  const reduce = useMotionOff();
  const beats = 4;
  const W = 60; // width of one beat in viewBox units
  const one = (x: number) =>
    `L${x + 8},20 Q${x + 12},15 ${x + 16},20 L${x + 22},20 L${x + 24},24 L${x + 27},2 L${x + 30},32 L${x + 33},20 L${x + 40},20 Q${x + 46},12 ${x + 52},20 L${x + 60},20`;
  let d = "M0,20";
  for (let i = 0; i < beats * 2; i++) d += " " + one(i * W);
  const period = (60 / Math.max(30, Math.min(200, bpm))) * beats;
  return (
    <svg viewBox={`0 0 ${W * beats} 36`} preserveAspectRatio="none" className={cn("overflow-hidden", className)} aria-hidden>
      <defs>
        <linearGradient id="ecg-fade" x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="0.25" stopColor={color} stopOpacity="0.9" />
          <stop offset="1" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <motion.path
        d={d}
        fill="none"
        stroke="url(#ecg-fade)"
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        animate={reduce ? undefined : { x: [0, -W * beats] }}
        transition={reduce ? undefined : { duration: period, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  );
}

/** Staggered entrance for lists of cards. */
export const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.025, delayChildren: 0 } },
};
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

const softEase = [0.22, 1, 0.36, 1] as const;

/**
 * Reveals text word by word (or letter by letter) with a soft blur-and-rise.
 * Re-runs whenever the text changes. Screen readers get the plain text once.
 */
export function SplitText({
  text,
  by = "word",
  delay = 0,
  stagger,
  className,
  show = true,
}: {
  text: string;
  by?: "word" | "char";
  delay?: number;
  stagger?: number;
  className?: string;
  show?: boolean;
}) {
  const reduce = useMotionOff();
  const parts = by === "char" ? Array.from(text) : text.split(/(\s+)/);
  const step = stagger ?? (by === "char" ? 0.045 : 0.06);
  let i = 0;
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {parts.map((p, k) => {
        if (/^\s+$/.test(p)) return <span key={`${text}-s${k}`} aria-hidden> </span>;
        const n = i++;
        return (
          <motion.span
            key={`${text}-${k}`}
            aria-hidden
            className="inline-block will-change-transform"
            initial={reduce ? false : { opacity: 0, y: "0.45em", filter: "blur(10px)" }}
            animate={show ? { opacity: 1, y: "0em", filter: "blur(0px)" } : { opacity: 0, y: "0.45em", filter: "blur(10px)" }}
            transition={{ duration: by === "char" ? 0.5 : 0.4, ease: softEase, delay: show ? delay + n * step : 0 }}
          >
            {p}
          </motion.span>
        );
      })}
    </span>
  );
}

/** Cross-fades between short labels: the old one lifts away, the new one rises in. */
export function SwapText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("relative inline-grid overflow-hidden align-bottom", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          className="col-start-1 row-start-1 whitespace-nowrap"
          initial={{ opacity: 0, y: "70%", filter: "blur(6px)" }}
          animate={{ opacity: 1, y: "0%", filter: "blur(0px)" }}
          exit={{ opacity: 0, y: "-70%", filter: "blur(6px)" }}
          transition={{ duration: 0.38, ease: softEase }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
