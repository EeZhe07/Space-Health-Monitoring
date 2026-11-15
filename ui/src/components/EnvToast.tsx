import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Globe2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatDelay, type Environment } from "@/lib/environments";

function radiationText(f: number) {
  if (f === 1) return "radiation at the station's usual level";
  return f > 1 ? `radiation ${f.toFixed(1)}× the station's usual dose` : `radiation a little below the station's usual dose`;
}

/** Says what changed when the crew picks a different mission environment. */
export function EnvToast() {
  const { env } = useStore();
  const prev = useRef(env.id);
  const [shown, setShown] = useState<Environment | null>(null);

  useEffect(() => {
    // Compare with the last environment (not a "first run" flag, which StrictMode's double effect would use up).
    if (prev.current === env.id) return;
    prev.current = env.id;
    setShown(env);
    const t = setTimeout(() => setShown(null), 3000);
    return () => clearTimeout(t);
  }, [env]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <AnimatePresence>
        {shown && (
          <motion.div
            key={shown.id}
            role="status"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="pointer-events-auto flex max-w-xl items-start gap-3 rounded-2xl bg-[#0c111c]/95 p-4 text-sm shadow-2xl ring-1 ring-white/15 backdrop-blur"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-steady/15 text-steady">
              <Globe2 size={16} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-white">Now at {shown.name}</span>
              <span className="mt-0.5 block text-white/75">
                Messages to Earth take {formatDelay(shown.delaySec)} each way, gravity {shown.gravity.toLowerCase().replace(/^moon, /, "")}, {radiationText(shown.doseFactor)}.
              </span>
              <span className="mt-1 block text-white/55">{shown.note}</span>
            </span>
            <button type="button" onClick={() => setShown(null)} aria-label="Dismiss" className="shrink-0 rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white">
              <X size={16} aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
