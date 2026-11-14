import { motion } from "motion/react";
import { BatteryFull, BatteryLow, BatteryMedium, Plug, Unplug } from "lucide-react";
import { indicators, type IndicatorId } from "@/lib/indicators";
import { useStore } from "@/lib/store";
import { itemVariants, listVariants } from "./motion";
import { cn } from "@/lib/utils";

// The suit sensors behind every reading. Battery levels are synthetic for the demo.
const sensors: { id: IndicatorId; name: string; battery: number; feeds: string }[] = [
  { id: "heart_rate", name: "Wrist sensor", battery: 82, feeds: "Heart rate, mood estimate" },
  { id: "blood_pressure", name: "Arm cuff", battery: 64, feeds: "Blood pressure" },
  { id: "blood_sugar", name: "Glucose monitor", battery: 41, feeds: "Blood sugar" },
  { id: "temperature", name: "Skin patch", battery: 17, feeds: "Body temperature" },
  { id: "sleep", name: "Sleep tracker", battery: 91, feeds: "Sleep" },
  { id: "radiation", name: "Dosimeter", battery: 77, feeds: "Radiation dose" },
];

/** Connection, battery and last sync for each sensor, so problems are fixed before data goes missing. */
export function SensorHealth() {
  const { offline, setOffline, latest } = useStore();
  const issues = sensors.filter((s) => offline[s.id] || s.battery < 20).length;

  return (
    <section className="panel h-fit p-5" aria-labelledby="sensors-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="sensors-title" className="text-lg">Sensor health</h2>
        <span className={cn("text-sm", issues ? "text-watch" : "text-steady")}>{issues ? `${issues} need attention` : "All good"}</span>
      </div>
      <motion.ul variants={listVariants} initial="hidden" animate="show" className="mt-3 flex flex-col gap-1">
        {sensors.map((s) => {
          const down = offline[s.id];
          const low = s.battery < 20;
          const Battery = s.battery < 20 ? BatteryLow : s.battery < 60 ? BatteryMedium : BatteryFull;
          const r = latest(s.id);
          return (
            <motion.li key={s.id} variants={itemVariants} className="rounded-xl px-3 py-2.5 hover:bg-white/5">
              <div className="flex items-center gap-3">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", down ? "bg-watch/15 text-watch" : "bg-steady/15 text-steady")}>
                  {down ? <Unplug size={14} aria-hidden /> : <Plug size={14} aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{s.name}</span>
                  <span className={cn("block text-xs", down ? "text-watch" : "text-white/55")}>
                    {down ? `Disconnected at ${down.slice(11, 16)}` : `Synced ${r ? r.at.slice(11, 16) : "today"} · ${s.feeds}`}
                  </span>
                </span>
                <span className={cn("flex items-center gap-1 text-xs font-semibold tabular", low ? "text-act" : "text-white/70")} aria-label={`Battery ${s.battery}%`}>
                  <Battery size={16} aria-hidden /> {s.battery}%
                </span>
              </div>
              {(down || low) && (
                <div className="mt-2 flex flex-wrap items-center gap-2 pl-10 text-xs">
                  {down && (
                    <button type="button" onClick={() => setOffline(s.id, false)} className="rounded-full bg-white px-3 py-1 font-semibold text-black hover:bg-white/90">
                      Reconnect
                    </button>
                  )}
                  {low && <span className="text-act">Battery low: charge it before your sleep period so {indicators[s.id].name.toLowerCase()} keeps coming in.</span>}
                </div>
              )}
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}
