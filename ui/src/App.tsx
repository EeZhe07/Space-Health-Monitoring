import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useRoute } from "@/lib/router";
import { Navbar } from "@/components/Navbar";
import { PortalHome } from "@/views/PortalHome";
import { Overview } from "@/views/Overview";
import { BodyMap } from "@/views/BodyMap";
import { Trends } from "@/views/Trends";
import { LiveCheck } from "@/views/LiveCheck";
import { Routine } from "@/views/Routine";
import { Guide } from "@/views/Guide";
import { SpaceScene } from "@/components/SpaceScene";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const views = { overview: Overview, body: BodyMap, trends: Trends, live: LiveCheck, routine: Routine, guide: Guide };

export default function App() {
  const route = useRoute();
  const { motionPref } = useStore();
  const isHome = route === "home";
  const View = isHome ? null : views[route];

  return (
    <MotionConfig reducedMotion={motionPref === "reduced" ? "always" : "never"}>
      <div className={cn("relative w-full", isHome ? "h-screen overflow-hidden" : "min-h-screen")}>
        {!isHome && (
          <>
            <SpaceScene dim />
            <Navbar route={route} />
            <AnimatePresence mode="wait">
              <motion.div
                key={route}
                initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(6px)", transition: { duration: 0.18 } }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {View && <View />}
              </motion.div>
            </AnimatePresence>
          </>
        )}
        {/* Home stays mounted (videos stay loaded) and crossfades with the other pages. */}
        <div className={cn("home-layer", !isHome && "is-hidden")} inert={!isHome}>
          <PortalHome key={motionPref} active={isHome} />
        </div>
      </div>
    </MotionConfig>
  );
}
