import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AnimatePresence, motion } from "motion/react";
import { EcgTrace, SplitText, SwapText, motionOff } from "@/components/motion";
import ParticleText from "@/components/ParticleText/ParticleText";
import { useStore } from "@/lib/store";
import { go, type Route } from "@/lib/router";
import { indicators, indicatorList } from "@/lib/indicators";
import { formatDelay } from "@/lib/environments";
import { TODAY } from "@/lib/history";
import "./portal.css";

const BASE = "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P";
const MARS_BG = `${BASE}/3c83091e-4046-4fd6-adbb-2edb728be79a.mp4`;
const TO_EARTH = `${BASE}/fc3ded42-e845-41f3-a830-5cab512d79cd.mp4`;
const TO_MARS = `${BASE}/5fc5651c-3b5d-4171-b507-87f7e635d1b4.mp4`;

const HOLD_MS = 1600;
let preloaderPlayed = false;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
function animateValue(set: (v: number) => void, duration: number) {
  return new Promise<void>((resolve) => {
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      set(ease(t));
      t < 1 ? requestAnimationFrame(step) : resolve();
    };
    requestAnimationFrame(step);
  });
}
function retrigger(el: Element, cls: string) {
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

export function PortalHome({ active = true }: { active?: boolean }) {
  const activeRef = useRef(active);
  activeRef.current = active;
  const activateRef = useRef<(on: boolean) => void>(() => {});
  useEffect(() => activateRef.current(active), [active]);
  const { env, levelOf, latest, dueToday, streak, level } = useStore();
  const root = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0); // 0..1 while holding, for the readout
  const [phase, setPhase] = useState<"idle" | "holding" | "entering">("idle");
  const [revealed, setRevealed] = useState(false);

  // Today's status rows: each one is a shortcut into the app.
  const needs = indicatorList.find((i) => levelOf(i.id) === "act") ?? indicatorList.find((i) => levelOf(i.id) === "watch");
  const needsReading = needs && latest(needs.id);
  const rows: { k: string; v: string; to: Route }[] = [
    { k: "Due today:", v: dueToday.length ? `${dueToday.length} of ${indicatorList.length} check-ins: ${dueToday.map((d) => indicators[d].name.toLowerCase()).slice(0, 2).join(", ")}${dueToday.length > 2 ? "…" : ""}` : "All check-ins done", to: "routine" },
    { k: "Needs attention:", v: needs && needsReading ? `${needs.name}, ${needs.format(needsReading)} ${needs.unit}` : "Nothing right now", to: needs?.id === "heart_rate" ? "overview" : "trends" },
    { k: "Streak:", v: `${streak} days, level ${level}`, to: "routine" },
    { k: "Ground delay:", v: `${formatDelay(env.delaySec)} at ${env.name.toLowerCase()}`, to: "guide" },
  ];

  useEffect(() => {
    const exp = root.current!;
    const $ = <T extends HTMLElement>(id: string) => exp.querySelector<T>(`#${id}`)!;
    const canvas = $<HTMLCanvasElement>("portal-canvas");
    const ctx = canvas.getContext("2d")!;
    const portal = $<HTMLButtonElement>("portal");
    const portalVideo = $<HTMLVideoElement>("portal-video");
    const preVideo = $<HTMLVideoElement>("preloader-video");
    const preloader = $<HTMLDivElement>("preloader");
    const count = $<HTMLDivElement>("preloader-count");
    const countValue = $<HTMLSpanElement>("preloader-value");
    const logo = $<HTMLElement>("floating-logo");
    const cursor = exp.querySelector<HTMLDivElement>(".custom-cursor")!;
    const orbit = cursor.querySelector<HTMLElement>(".cursor-orbit")!;
    const dot = cursor.querySelector<HTMLElement>(".cursor-dot")!;
    const label = cursor.querySelector<HTMLElement>(".cursor-label")!;
    const reduce = motionOff();

    let alive = true;
    let ready = false; // portal revealed and interactive
    let entering = false;
    let flash = 0; // bright ring pulse at 100%
    let booted = false;
    let rotX = 0, rotY = 0, targetX = 0, targetY = 0;
    let expansion = 0, maskScale = 0;
    let hold = 0; // 0..1
    let holding = false;
    let last = performance.now();

    function resizeCanvas() {
      const d = Math.min(devicePixelRatio || 1, 2);
      canvas.width = innerWidth * d;
      canvas.height = innerHeight * d;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    function drawCover(media: HTMLVideoElement) {
      const mw = media.videoWidth, mh = media.videoHeight;
      if (!mw || !mh) return;
      const sc = Math.max(innerWidth / mw, innerHeight / mh);
      const w = mw * sc, h = mh * sc;
      try {
        ctx.drawImage(media, (innerWidth - w) / 2, (innerHeight - h) / 2, w, h);
      } catch {
        /* not ready */
      }
    }
    function roundedRectPoints(w: number, h: number, r: number) {
      r = Math.min(r, w / 2, h / 2);
      const corners: [number, number, number, number][] = [
        [w / 2 - r, -h / 2 + r, -Math.PI / 2, 0],
        [w / 2 - r, h / 2 - r, 0, Math.PI / 2],
        [-w / 2 + r, h / 2 - r, Math.PI / 2, Math.PI],
        [-w / 2 + r, -h / 2 + r, Math.PI, Math.PI * 1.5],
      ];
      const pts: [number, number][] = [];
      for (const [cx, cy, a0, a1] of corners)
        for (let i = 0; i <= 10; i++) {
          const a = a0 + ((a1 - a0) * i) / 10;
          pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
      return pts;
    }
    function project([x, y]: [number, number], cx: number, cy: number, rx: number, ry: number): [number, number] {
      const ax = (rx * Math.PI) / 180, ay = (ry * Math.PI) / 180;
      const xx = x * Math.cos(ay), yy = y * Math.cos(ax);
      const z = x * Math.sin(ay) - y * Math.sin(ax);
      const p = 850 / (850 + z);
      return [cx + xx * p, cy + yy * p];
    }

    function draw(now: number) {
      if (!alive) return;
      const rawDt = Math.min(600, now - last);
      const dt = Math.min(40, rawDt);
      last = now;
      rotX += (targetX - rotX) * Math.min(1, dt * 0.009);
      rotY += (targetY - rotY) * Math.min(1, dt * 0.009);

      // Hold progress fills while pressed and drains quickly when released.
      if (!activeRef.current) {
        // Home is hidden behind another page: idle cheaply until it comes back.
        last = now;
        requestAnimationFrame(draw);
        return;
      }
      flash = Math.max(0, flash - dt / 700);
      if (!entering) {
        const before = hold;
        hold = holding ? Math.min(1, hold + rawDt / HOLD_MS) : Math.max(0, hold - rawDt / 450);
        if (hold !== before) setProgress(hold);
        if (hold >= 1 && holding) enter();
      }

      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const rect = portal.getBoundingClientRect();
      const e = expansion;
      const rcx = rect.left + rect.width / 2, rcy = rect.top + rect.height / 2;
      const cx = rcx + (innerWidth / 2 - rcx) * e;
      const cy = rcy + (innerHeight / 2 - rcy) * e;
      // The window breathes in slightly as you hold.
      const press = 1 - 0.04 * ease(Math.min(1, hold * 1.4)) + (holding && !reduce ? 0.012 * Math.sin(now / 140) * hold : 0);
      const baseW = rect.width + (innerWidth - rect.width) * e;
      const baseH = rect.height + (innerHeight - rect.height) * e;
      const sc = e ? 1 : maskScale * press;
      const w = baseW * sc, h = baseH * sc;
      const radius = parseFloat(getComputedStyle(portal).borderTopLeftRadius) || 90;
      const r = radius * (1 - e) * sc;
      const rx = rotX * (1 - e), ry = rotY * (1 - e);
      if (w > 1 && h > 1) {
        const pts = roundedRectPoints(w, h, r).map((p) => project(p, cx, cy, rx, ry));
        ctx.save();
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = "#030303";
        ctx.fillRect(0, 0, innerWidth, innerHeight);
        drawCover(portalVideo);
        // teal wash grows with the hold
        if (hold > 0 && e < 1) {
          ctx.fillStyle = `rgba(79, 227, 210, ${0.18 * hold * (1 - e)})`;
          ctx.fillRect(0, 0, innerWidth, innerHeight);
        }
        ctx.restore();

        // Progress ring traced around the window, starting top-centre.
        if (hold > 0.001 && e < 0.98) {
          const start = 0; // first point is top edge just right of the top-left corner run
          const ring = [...pts.slice(start), ...pts.slice(0, start), pts[start]];
          const lens = [0];
          for (let i = 1; i < ring.length; i++) lens.push(lens[i - 1] + Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]));
          const target = lens[lens.length - 1] * hold;
          ctx.save();
          ctx.globalAlpha = 1 - e;
          ctx.lineWidth = 3 + 5 * flash;
          ctx.lineCap = "round";
          ctx.strokeStyle = "#ffffff";
          ctx.shadowColor = "rgba(127, 245, 230, 0.9)";
          ctx.shadowBlur = 18 + 30 * flash;
          ctx.beginPath();
          ctx.moveTo(ring[0][0], ring[0][1]);
          for (let i = 1; i < ring.length; i++) {
            if (lens[i] <= target) ctx.lineTo(ring[i][0], ring[i][1]);
            else {
              const f = (target - lens[i - 1]) / (lens[i] - lens[i - 1]);
              ctx.lineTo(ring[i - 1][0] + (ring[i][0] - ring[i - 1][0]) * f, ring[i - 1][1] + (ring[i][1] - ring[i - 1][1]) * f);
              break;
            }
          }
          ctx.stroke();
          ctx.restore();
        }
      }
      requestAnimationFrame(draw);
    }

    // Cursor
    let px = innerWidth / 2, py = innerHeight / 2, ox = px, oy = py;
    function cursorLoop() {
      if (!alive) return;
      ox += (px - ox) * 0.2;
      oy += (py - oy) * 0.2;
      orbit.style.translate = `${ox}px ${oy}px`;
      dot.style.translate = `${px}px ${py}px`;
      label.style.translate = `${ox}px ${oy}px`;
      requestAnimationFrame(cursorLoop);
    }
    const onMove = (ev: PointerEvent) => {
      px = ev.clientX;
      py = ev.clientY;
      cursor.classList.add("is-visible");
      if (entering || ev.pointerType === "touch") return;
      targetY = (ev.clientX / innerWidth - 0.5) * 37.4;
      targetX = (ev.clientY / innerHeight - 0.5) * -33;
    };
    const onLeaveDoc = () => {
      cursor.classList.remove("is-visible");
      targetX = targetY = 0;
      stopHold();
    };

    // Fade the cursor label out, change the word, fade it back in.
    let labelTimer = 0;
    function setLabel(text: string) {
      if (label.dataset.text === text) return;
      label.dataset.text = text;
      label.classList.add("is-swapping");
      clearTimeout(labelTimer);
      labelTimer = window.setTimeout(() => {
        label.textContent = text;
        label.classList.remove("is-swapping");
      }, 140);
    }

    function startHold() {
      if (!ready || entering) return;
      holding = true;
      setPhase("holding");
      cursor.classList.add("is-holding");
      setLabel("Keep holding");
    }
    function stopHold() {
      if (entering || !holding) return;
      holding = false;
      setPhase("idle");
      cursor.classList.remove("is-holding");
      setLabel("Hold to enter");
    }
    const onDown = (ev: PointerEvent) => {
      ev.preventDefault();
      try {
        portal.setPointerCapture(ev.pointerId);
      } catch {
        /* synthetic or already-released pointer */
      }
      startHold();
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if ((ev.key === " " || ev.key === "Enter") && !ev.repeat) {
        ev.preventDefault();
        startHold();
      }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.key === " " || ev.key === "Enter") stopHold();
    };
    const onEnter = () => cursor.classList.add("is-enter");
    const onLeave = () => cursor.classList.remove("is-enter");

    async function enter(skip = false) {
      if (entering) return;
      entering = true;
      holding = false;
      hold = 1;
      setProgress(1);
      setPhase("entering");
      setLabel("Entering");
      targetX = targetY = 0;
      navigator.vibrate?.(30);
      flash = 1;
      if (!skip && !reduce) {
        // 1. the ring flashes and the heading reads "Pulse synced"
        await wait(420);
        // 2. the chrome blurs away and the window opens to fill the screen
        exp.classList.add("is-entering");
        await animateValue((v) => (expansion = v), 1300);
        await wait(180);
      } else exp.classList.add("is-entering");
      // 3. Home fades out over the vitals page (see .home-layer in App)
      go("overview");
    }
    exp.addEventListener("crew-enter", () => enter(true));

    async function revealMask() {
      retrigger(exp, "mask-revealing");
      maskScale = 0;
      await animateValue((v) => (maskScale = v), 1050);
    }
    function loadable(v: HTMLVideoElement) {
      return new Promise<void>((resolve) => {
        if (v.readyState >= 2) return resolve();
        v.addEventListener("loadeddata", () => resolve(), { once: true });
        v.addEventListener("error", () => resolve(), { once: true });
        setTimeout(resolve, 4000);
      });
    }
    async function startExperience() {
      portalVideo.play().catch(() => {});
      await loadable(portalVideo);
      await revealMask();
      ready = true;
      exp.classList.add("intro-ready");
      await wait(500);
      retrigger(exp, "content-revealing");
      setRevealed(true);
    }

    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      preloaderPlayed = true;
      countValue.textContent = "100";
      count.classList.add("is-leaving");
      logo.classList.add("is-docked");
      preloader.classList.add("is-background");
      exp.classList.add("preload-complete");
      startExperience();
      setTimeout(() => count.remove(), 750);
      setTimeout(() => logo.classList.add("is-settled"), 2000);
      setTimeout(() => preloader.classList.add("is-gone"), 1200);
    }
    function runPreloader() {
      if (preloaderPlayed) {
        count.remove();
        logo.classList.add("is-docked", "is-settled");
        preloader.classList.add("is-background", "is-gone");
        exp.classList.add("preload-complete");
        startExperience();
        return;
      }
      const tick = () => {
        if (finished || !alive) return;
        if (preVideo.duration) countValue.textContent = String(Math.round((preVideo.currentTime / preVideo.duration) * 100));
        requestAnimationFrame(tick);
      };
      const start = () => {
        preVideo.playbackRate = Math.max(0.25, preVideo.duration / 3);
        preVideo.play().then(() => requestAnimationFrame(tick), finish);
      };
      if (preVideo.readyState >= 1) start();
      else preVideo.addEventListener("loadedmetadata", start, { once: true });
      preVideo.addEventListener("ended", finish, { once: true });
      preVideo.addEventListener("error", finish, { once: true });
      setTimeout(finish, 12000);
    }

    portal.addEventListener("pointerdown", onDown);
    portal.addEventListener("pointerup", stopHold);
    portal.addEventListener("pointercancel", stopHold);
    portal.addEventListener("lostpointercapture", stopHold);
    portal.addEventListener("keydown", onKeyDown);
    portal.addEventListener("keyup", onKeyUp);
    portal.addEventListener("blur", stopHold);
    portal.addEventListener("pointerenter", onEnter);
    portal.addEventListener("pointerleave", onLeave);
    portal.addEventListener("contextmenu", (e) => e.preventDefault());
    addEventListener("pointermove", onMove);
    exp.addEventListener("pointerleave", onLeaveDoc);
    addEventListener("resize", resizeCanvas);

    const bg = exp.querySelector<HTMLVideoElement>(".background")!;
    bg.loop = true;
    function boot() {
      if (booted) return;
      booted = true;
      bg.play().catch(() => {});
      runPreloader();
    }
    activateRef.current = (on: boolean) => {
      if (!on) {
        // Leaving Home: keep everything loaded but stop the videos.
        bg.pause();
        portalVideo.pause();
        preVideo.pause();
        cursor.classList.remove("is-visible", "is-enter", "is-holding");
        holding = false;
        return;
      }
      if (!booted) return boot();
      // Back on Home: reset the portal and reveal it again.
      bg.play().catch(() => {});
      portalVideo.play().catch(() => {});
      entering = false;
      hold = 0;
      flash = 0;
      expansion = 0;
      targetX = targetY = 0;
      setProgress(0);
      setPhase("idle");
      setLabel("Hold to enter");
      exp.classList.remove("is-entering");
      if (ready) {
        revealMask();
        retrigger(exp, "content-revealing");
      }
    };
    resizeCanvas();
    requestAnimationFrame(draw);
    requestAnimationFrame(cursorLoop);
    if (activeRef.current) boot();

    return () => {
      alive = false;
      removeEventListener("pointermove", onMove);
      exp.removeEventListener("pointerleave", onLeaveDoc);
      removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const pct = Math.round(progress * 100);

  return (
    <main ref={root} className="experience">
      <div className="backgrounds" aria-hidden="true">
        <video id="mars-background" className="background is-visible" src={MARS_BG} muted playsInline preload="auto" />
      </div>
      <div className="preloader" id="preloader" aria-label="Loading">
        <video id="preloader-video" src={TO_MARS} muted playsInline preload="auto" />
        <div className="preloader-shade" />
      </div>
      <svg className="floating-logo" id="floating-logo" viewBox="0 0 32 32" role="img" aria-label="Crew Health">
        <circle cx="16" cy="16" r="15" fill="rgb(255 255 255 / 10%)" stroke="#fff" strokeWidth="1.2" />
        <path d="M5 17h6l3-7 4 13 3-6h6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="preloader-count" id="preloader-count" aria-live="polite">
        <span className="label">Connecting to your suit</span>
        <span id="preloader-value">0</span>
        <span className="percent">%</span>
      </div>
      <div className="shade" aria-hidden="true" />

      <header className="header chrome">
        <Navbar route="home" dockedLogo />
      </header>

      <canvas id="portal-canvas" className="portal-canvas" aria-hidden="true" />
      <section className="portal-wrap chrome" aria-label="Enter Crew Health">
        <div className="portal-heading">
          <SwapText text={phase === "entering" ? (progress >= 1 ? "Pulse synced" : "Opening your vitals") : phase === "holding" ? "Syncing your pulse" : "Hold to enter"} />
          <strong className="tabular relative inline-grid overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={phase === "idle" ? "day" : "pct"}
                className="col-start-1 row-start-1 text-right"
                initial={{ opacity: 0, y: "70%", filter: "blur(6px)" }}
                animate={{ opacity: 1, y: "0%", filter: "blur(0px)" }}
                exit={{ opacity: 0, y: "-70%", filter: "blur(6px)" }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              >
                {phase === "idle" ? `Day ${TODAY}` : `${pct}%`}
              </motion.span>
            </AnimatePresence>
          </strong>
        </div>
        <button
          className="portal"
          id="portal"
          type="button"
          aria-label="Press and hold to enter your vitals"
          aria-describedby="portal-hint"
        >
          <video id="portal-video" src={TO_EARTH} muted playsInline preload="auto" loop />
          <span className={`portal-sync ${phase !== "idle" ? "is-on" : ""}`} aria-hidden="true">
            <EcgTrace bpm={60 + progress * 50} className="h-10 w-[70%] text-white" />
            <span className="tabular text-4xl font-light">{pct}</span>
          </span>
        </button>
        <p className="portal-hint" id="portal-hint">
          Press and hold the window.{" "}
          <button type="button" className="underline decoration-white/40 hover:text-white" onClick={() => root.current?.dispatchEvent(new Event("crew-enter"))}>
            Enter without holding
          </button>
        </p>
      </section>

      <section className="planet-content chrome" aria-label="Today">
        <div>
          <p className="greeting">
            <SplitText text="Welcome back, CM-2" show={revealed} delay={0.05} />
          </p>
          <h1 id="planet-title" className="sr-only">Today</h1>
          <div aria-hidden className="today-particles">
            {revealed && (
              <ParticleText
                text="TODAY"
                align="left"
                fontSize="clamp(96px, 13vw, 200px)"
                fontWeight={900}
                fontFamily="Inter"
                particleSize={2.2}
                density={4}
                maxParticles={7000}
                color="#ffffff"
                highlightColor="#7ff5e6"
                intro="gather"
                scatter={220}
                gatherDuration={1600}
                stagger={420}
                pointerRepel={40}
                repelRadius={120}
                idleDrift={0.7}
                trigger="hover"
                glow
                className="!min-h-0"
              />
            )}
          </div>
        </div>
        <div className="side">
          <ul id="facts" className="facts">
            {rows.map((r) => (
              <li key={r.k} className="fact">
                <a href={`#/${r.to}`} className="fact-link">
                  <span className="fact-k">{r.k}</span>
                  <span className="fact-v">
                    {r.v}
                    <ArrowUpRight size={16} className="fact-arrow" aria-hidden />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="custom-cursor" aria-hidden="true">
        <span className="cursor-orbit" />
        <span className="cursor-dot" />
        <span className="cursor-label">Hold to enter</span>
      </div>
    </main>
  );
}
