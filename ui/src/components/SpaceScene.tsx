import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { motionOff } from "./motion";

/**
 * Animated background drawn in code (replaces the stock video):
 * a teal-and-violet planet with swirling clouds, two light beams crossing
 * behind it, a twinkling starfield, and a spacesuit glove reaching up toward
 * the planet. Decorative only. Motion stops when reduced motion is requested.
 */
export function SpaceScene({ dim = false }: { dim?: boolean }) {
  return (
    <div aria-hidden className="space-scene fixed inset-0 overflow-hidden">
      <Stars />
      <div className="beam beam-teal" />
      <div className="beam beam-violet" />
      <div className="planet-wrap">
        <div className="planet">
          <div className="planet-swirl" />
          <div className="planet-bands" />
          <div className="planet-shade" />
          <div className="planet-shine" />
        </div>
      </div>
      <Glove />
      <div className={cn("absolute inset-0 transition-colors duration-500", dim ? "bg-gradient-to-b from-black/65 via-black/50 to-black/75" : "bg-gradient-to-t from-black/55 via-transparent to-black/20")} />
    </div>
  );
}

function Stars() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const reduce = motionOff();
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const stars = Array.from({ length: 260 }, () => ({ x: rnd(), y: rnd(), r: 0.3 + rnd() * 1.3, p: rnd() * Math.PI * 2, s: 0.4 + rnd() * 1.4, hue: rnd() < 0.2 ? (rnd() < 0.5 ? 175 : 265) : 220 }));
    let raf = 0;
    const size = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const s of stars) {
        const a = reduce ? 0.7 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s.s + s.p));
        const x = ((s.x * innerWidth + (reduce ? 0 : t * 0.004 * s.r)) % innerWidth);
        ctx.fillStyle = `hsla(${s.hue}, 90%, 88%, ${a})`;
        ctx.beginPath();
        ctx.arc(x, s.y * innerHeight, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    size();
    draw(0);
    if (!reduce) raf = requestAnimationFrame(draw);
    addEventListener("resize", size);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", size);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

/** EVA glove and sleeve, index finger reaching up. */
function Glove() {
  return (
    <div className="glove">
      <svg viewBox="0 0 420 640" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="suit" x1="0" x2="1">
            <stop offset="0" stopColor="#8f97a8" />
            <stop offset="0.35" stopColor="#e9edf3" />
            <stop offset="0.7" stopColor="#f7f8fb" />
            <stop offset="1" stopColor="#a9b0be" />
          </linearGradient>
          <linearGradient id="gloveFill" x1="0" x2="1" y1="0" y2="0.3">
            <stop offset="0" stopColor="#9aa2b2" />
            <stop offset="0.4" stopColor="#eef1f6" />
            <stop offset="1" stopColor="#b3bac7" />
          </linearGradient>
          <linearGradient id="ring" x1="0" x2="1">
            <stop offset="0" stopColor="#5c6577" />
            <stop offset="0.45" stopColor="#dfe5ee" />
            <stop offset="0.6" stopColor="#f5f8fc" />
            <stop offset="1" stopColor="#6b7486" />
          </linearGradient>
          <linearGradient id="rim" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#7ff5e6" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="#a78bff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#a78bff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rubber" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#8a93a6" />
            <stop offset="1" stopColor="#4b5263" />
          </linearGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <g className="glove-float">
          {/* sleeve */}
          <path d="M118 360 C112 430 104 520 96 660 L330 660 C318 520 306 430 298 360 Z" fill="url(#suit)" />
          <path d="M140 420 C170 432 246 432 278 418 M128 500 C170 516 252 516 292 500 M120 580 C168 598 258 598 302 580" stroke="#6f7788" strokeOpacity="0.35" strokeWidth="3" fill="none" />
          <path d="M206 372 L200 660" stroke="#6f7788" strokeOpacity="0.3" strokeWidth="2" />
          {/* wrist ring with suit-blue band */}
          <rect x="112" y="318" width="192" height="52" rx="16" fill="url(#ring)" />
          <rect x="112" y="336" width="192" height="10" fill="#3d6df2" opacity="0.85" />
          <rect x="112" y="318" width="192" height="52" rx="16" fill="none" stroke="#1d2433" strokeOpacity="0.5" strokeWidth="2" />

          {/* glove: palm and gauntlet */}
          <path d="M124 326 C114 282 116 236 130 204 C150 186 272 184 292 204 C304 238 304 284 296 326 Z" fill="url(#gloveFill)" stroke="#5f6779" strokeOpacity="0.4" strokeWidth="2" />
          {/* curled ring finger (behind) */}
          <path d="M242 228 C238 196 246 170 264 160 C282 150 304 162 302 186 C300 206 296 220 290 236 Z" fill="url(#gloveFill)" stroke="#5f6779" strokeOpacity="0.45" strokeWidth="2" />
          <path d="M262 162 C276 152 300 160 302 182 C290 188 270 184 262 162 Z" fill="url(#rubber)" />
          {/* curled middle finger */}
          <path d="M200 226 C194 184 200 142 218 126 C236 112 264 122 264 148 C264 178 260 204 258 228 Z" fill="url(#gloveFill)" stroke="#5f6779" strokeOpacity="0.45" strokeWidth="2" />
          <path d="M216 128 C232 112 262 120 264 146 C250 152 224 148 216 128 Z" fill="url(#rubber)" />
          {/* thumb, angled out to the left */}
          <path d="M138 276 C108 268 82 244 72 216 C64 192 84 176 104 186 C124 198 146 216 166 236 Z" fill="url(#gloveFill)" stroke="#5f6779" strokeOpacity="0.45" strokeWidth="2" />
          <path d="M72 214 C64 192 82 176 102 186 C100 202 88 214 72 214 Z" fill="url(#rubber)" />
          {/* index finger, extended and reaching */}
          <path d="M148 230 C140 172 142 100 152 50 C158 18 210 16 214 50 C220 104 216 172 212 230 Z" fill="url(#gloveFill)" stroke="#5f6779" strokeOpacity="0.45" strokeWidth="2" />
          <path d="M152 50 C158 16 210 14 214 50 C204 66 162 66 152 50 Z" fill="url(#rubber)" />
          {/* knuckle creases, fabric folds and back-of-hand pad */}
          <path d="M152 124 C166 132 198 132 212 124 M150 174 C166 182 198 182 212 174 M204 176 C216 184 244 184 258 176" stroke="#5f6779" strokeOpacity="0.4" strokeWidth="3" fill="none" />
          <path d="M136 300 C170 292 250 292 288 300" stroke="#5f6779" strokeOpacity="0.3" strokeWidth="3" fill="none" />
          <rect x="164" y="240" width="100" height="48" rx="16" fill="#d3d9e2" stroke="#5f6779" strokeOpacity="0.35" strokeWidth="2" />
          <path d="M180 254 h68 M180 266 h68" stroke="#7a8395" strokeOpacity="0.35" strokeWidth="2" />

          {/* planet light on the top edges */}
          <g filter="url(#soft)" opacity="0.9" style={{ mixBlendMode: "screen" }}>
            <path d="M152 50 C158 16 210 14 214 50" stroke="url(#rim)" strokeWidth="12" fill="none" />
            <path d="M216 128 C232 112 262 120 264 146" stroke="url(#rim)" strokeWidth="10" fill="none" />
            <path d="M262 162 C276 152 300 160 302 182" stroke="url(#rim)" strokeWidth="9" fill="none" />
            <path d="M72 214 C64 192 82 176 102 186" stroke="url(#rim)" strokeWidth="9" fill="none" />
            <path d="M112 330 C160 316 256 316 304 330" stroke="url(#rim)" strokeWidth="8" fill="none" />
          </g>
          {/* fingertip glow where it nearly touches the light */}
          <circle cx="183" cy="18" r="30" fill="#7ff5e6" opacity="0.35" filter="url(#soft)" className="tip-glow" />
        </g>
      </svg>
    </div>
  );
}
