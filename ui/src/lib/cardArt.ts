// Draws Crew Health trading-card faces on a canvas and returns them as data
// URLs for <HoloCard />. Original artwork: an astronaut crew card, badge cards
// and a shared card back. Layout units are a 630 x 880 card (63:88).

import type { EnvironmentId } from "./environments";
import type { Level } from "./indicators";

const W = 630;
const H = 880;
const S = 1.5; // render scale for crisp text when the card is shown large
const FRAME = 25; // 4% of the width: the sparkly silver border HoloCard lights up

type Ctx = CanvasRenderingContext2D;

const palettes: Record<EnvironmentId, { top: string; bottom: string; planet: string; planet2: string }> = {
  mars: { top: "#2b0d08", bottom: "#8f3218", planet: "#d4683c", planet2: "#7a2a14" },
  station: { top: "#06182f", bottom: "#1d5c95", planet: "#3f8fd8", planet2: "#2f9e6a" },
  spacecraft: { top: "#110a2c", bottom: "#4a2ea6", planet: "#b48cff", planet2: "#4fe3d2" },
  moon: { top: "#11141c", bottom: "#4a5262", planet: "#cfd3da", planet2: "#8b919c" },
  rover: { top: "#11141c", bottom: "#4a5262", planet: "#cfd3da", planet2: "#8b919c" },
};

const levelColor: Record<Level, string> = { steady: "#7fe0a8", watch: "#f4c56e", act: "#ff8a7a" };

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

function silver(c: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#f2f4f7");
  g.addColorStop(0.45, "#b9bfca");
  g.addColorStop(0.7, "#eceff3");
  g.addColorStop(1, "#a9b0bc");
  return g;
}

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function wrap(c: Ctx, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 3) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (c.measureText(test).width > maxW && line) {
      c.fillText(lines === maxLines - 1 ? `${line}…` : line, x, y + lines * lh);
      lines++;
      if (lines >= maxLines) return;
      line = words[i];
    } else line = test;
  }
  if (line) c.fillText(line, x, y + lines * lh);
}

const font = (weight: number, size: number) => `${weight} ${size}px Inter, "Segoe UI", Arial, sans-serif`;

async function canvas() {
  await Promise.all([document.fonts.load(font(900, 40)), document.fonts.load(font(900, 40)), document.fonts.load(font(500, 20)), document.fonts.load(font(400, 16))]).catch(() => {});
  const el = document.createElement("canvas");
  el.width = W * S;
  el.height = H * S;
  const c = el.getContext("2d")!;
  c.scale(S, S);
  c.textBaseline = "alphabetic";
  // Silver frame
  rr(c, 0, 0, W, H, 28);
  c.fillStyle = silver(c, 0, 0, W, H);
  c.fill();
  return { el, c };
}

function stars(c: Ctx, x: number, y: number, w: number, h: number, seed: number, n = 70) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    c.globalAlpha = 0.35 + r() * 0.65;
    c.fillStyle = r() < 0.15 ? "#bff7ef" : "#ffffff";
    c.beginPath();
    c.arc(x + r() * w, y + r() * h, 0.6 + r() * 1.6, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
}

function astronaut(c: Ctx, cx: number, base: number, planet: string) {
  // suit shoulders
  const suit = c.createLinearGradient(cx - 140, 0, cx + 140, 0);
  suit.addColorStop(0, "#9aa2b2");
  suit.addColorStop(0.35, "#eef1f6");
  suit.addColorStop(0.7, "#ffffff");
  suit.addColorStop(1, "#aab1bf");
  rr(c, cx - 135, base - 112, 270, 170, 80);
  c.fillStyle = suit;
  c.fill();
  c.strokeStyle = "rgba(60,70,90,.45)";
  c.lineWidth = 2;
  c.stroke();
  // shoulder patch
  rr(c, cx + 78, base - 78, 34, 22, 4);
  c.fillStyle = "#3d6df2";
  c.fill();
  // chest panel with a heartbeat
  rr(c, cx - 46, base - 82, 92, 52, 9);
  c.fillStyle = "#dde3ec";
  c.fill();
  c.stroke();
  c.strokeStyle = "#e5484d";
  c.lineWidth = 3;
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(cx - 36, base - 56);
  c.lineTo(cx - 16, base - 56);
  c.lineTo(cx - 8, base - 70);
  c.lineTo(cx + 2, base - 42);
  c.lineTo(cx + 10, base - 60);
  c.lineTo(cx + 36, base - 56);
  c.stroke();
  // neck ring
  const ring = c.createLinearGradient(cx - 70, 0, cx + 70, 0);
  ring.addColorStop(0, "#5c6577");
  ring.addColorStop(0.5, "#f5f8fc");
  ring.addColorStop(1, "#6b7486");
  rr(c, cx - 70, base - 132, 140, 32, 14);
  c.fillStyle = ring;
  c.fill();
  // helmet
  const hy = base - 222;
  const helmet = c.createRadialGradient(cx - 30, hy - 40, 10, cx, hy, 100);
  helmet.addColorStop(0, "#ffffff");
  helmet.addColorStop(0.7, "#e4e8ef");
  helmet.addColorStop(1, "#a7afbd");
  c.beginPath();
  c.arc(cx, hy, 96, 0, Math.PI * 2);
  c.fillStyle = helmet;
  c.fill();
  c.strokeStyle = "rgba(60,70,90,.5)";
  c.lineWidth = 2;
  c.stroke();
  // visor with the planet reflected in it
  c.save();
  c.beginPath();
  c.ellipse(cx, hy + 6, 72, 60, 0, 0, Math.PI * 2);
  const visor = c.createLinearGradient(cx - 60, hy - 50, cx + 60, hy + 60);
  visor.addColorStop(0, "#3d5a8a");
  visor.addColorStop(1, "#070d1f");
  c.fillStyle = visor;
  c.fill();
  c.clip();
  c.beginPath();
  c.arc(cx + 40, hy + 70, 60, 0, Math.PI * 2);
  c.fillStyle = planet;
  c.globalAlpha = 0.75;
  c.fill();
  c.globalAlpha = 1;
  stars(c, cx - 72, hy - 54, 144, 80, 3, 14);
  c.restore();
  c.strokeStyle = "rgba(255,255,255,.85)";
  c.lineWidth = 6;
  c.lineCap = "round";
  c.beginPath();
  c.arc(cx, hy + 6, 58, Math.PI * 1.08, Math.PI * 1.38);
  c.stroke();
  // helmet light
  c.beginPath();
  c.arc(cx + 78, hy - 52, 9, 0, Math.PI * 2);
  c.fillStyle = "#f4c56e";
  c.fill();
}

function planetDisc(c: Ctx, x: number, y: number, r: number, col: string, col2: string) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.15, col);
  g.addColorStop(0.75, col2);
  g.addColorStop(1, "#05060d");
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = g;
  c.fill();
}

function circleIcon(c: Ctx, x: number, y: number, r: number, fill: string, glyph: string) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = "rgba(255,255,255,.9)";
  c.lineWidth = 2;
  c.stroke();
  c.fillStyle = "#0c111c";
  c.font = font(900, r * 1.05);
  c.textAlign = "center";
  c.fillText(glyph, x, y + r * 0.38);
  c.textAlign = "left";
}

export interface CrewCardData {
  crew: string;
  readiness: number;
  env: EnvironmentId;
  envName: string;
  gravity: string;
  delay: string;
  day: number;
  heartRate: number;
  heartLevel: Level;
  focus: { name: string; value: string; tip: string; level: Level } | null;
  weakness: string;
  strength: string;
  level: number;
  streak: number;
  rarity: string;
  stars: number;
}

export async function drawCrewCard(d: CrewCardData) {
  const { el, c } = await canvas();
  const pal = palettes[d.env];

  // body
  rr(c, FRAME, FRAME, W - FRAME * 2, H - FRAME * 2, 18);
  const body = c.createLinearGradient(0, FRAME, 0, H);
  body.addColorStop(0, pal.top);
  body.addColorStop(1, pal.bottom);
  c.fillStyle = body;
  c.fill();
  const glow = c.createRadialGradient(W * 0.75, 120, 10, W * 0.75, 120, 420);
  glow.addColorStop(0, "rgba(255,255,255,.14)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = glow;
  c.fill();

  // header
  rr(c, 46, 44, 86, 26, 13);
  c.fillStyle = silver(c, 46, 44, 132, 70);
  c.fill();
  c.fillStyle = "#1b2233";
  c.font = font(900, 14);
  c.fillText("CREW", 66, 62);
  c.fillStyle = "#fff";
  c.font = font(900, 44);
  c.fillText(d.crew, 146, 82);
  c.textAlign = "right";
  c.font = font(900, 50);
  c.fillText(String(d.readiness), 520, 84);
  const numW = c.measureText(String(d.readiness)).width;
  c.font = font(600, 14);
  c.fillText("READY", 520 - numW - 8, 82);
  c.textAlign = "left";
  planetDisc(c, 562, 66, 22, pal.planet, pal.planet2);
  c.strokeStyle = "#fff";
  c.lineWidth = 2;
  c.beginPath();
  c.arc(562, 66, 22, 0, Math.PI * 2);
  c.stroke();

  // art window
  const ax = 52, ay = 104, aw = W - 104, ah = 336;
  c.save();
  rr(c, ax, ay, aw, ah, 10);
  c.clip();
  const space = c.createLinearGradient(0, ay, 0, ay + ah);
  space.addColorStop(0, "#04050d");
  space.addColorStop(1, pal.top);
  c.fillStyle = space;
  c.fillRect(ax, ay, aw, ah);
  stars(c, ax, ay, aw, ah, d.env.length * 7 + 1, 90);
  planetDisc(c, ax + aw - 60, ay + ah - 10, 150, pal.planet, pal.planet2);
  astronaut(c, ax + aw * 0.42, ay + ah + 26, pal.planet);
  c.restore();
  rr(c, ax, ay, aw, ah, 10);
  c.strokeStyle = silver(c, ax, ay, ax + aw, ay + ah);
  c.lineWidth = 6;
  c.stroke();

  // info strip
  rr(c, 64, 452, W - 128, 28, 14);
  c.fillStyle = silver(c, 64, 452, W - 64, 480);
  c.fill();
  c.fillStyle = "#222936";
  c.font = font(500, 14);
  c.textAlign = "center";
  c.fillText(`Crew medic  ·  Mission day ${d.day}  ·  ${d.envName}`, W / 2, 471);
  c.textAlign = "left";

  // ability 1: heart rate
  circleIcon(c, 82, 526, 18, levelColor[d.heartLevel], "♥");
  c.fillStyle = "#fff";
  c.font = font(900, 24);
  c.fillText("Resting heart rate", 112, 534);
  c.textAlign = "right";
  c.font = font(900, 34);
  c.fillText(`${Math.round(d.heartRate)}`, 548, 536);
  c.font = font(500, 14);
  c.fillText("bpm", 576, 536);
  c.textAlign = "left";
  c.fillStyle = "rgba(255,255,255,.82)";
  c.font = font(400, 16);
  c.fillText(d.heartLevel === "steady" ? "Steady at rest. Safe range is 50 to 100 bpm." : "Outside the steady range. Re-check after resting.", 112, 560);

  // ability 2: focus
  if (d.focus) {
    circleIcon(c, 82, 604, 18, levelColor[d.focus.level], "!");
    c.fillStyle = "#fff";
    c.font = font(900, 24);
    c.fillText(`Focus: ${d.focus.name}`, 112, 612);
    c.textAlign = "right";
    c.font = font(900, 30);
    c.fillText(d.focus.value, 576, 612);
    c.textAlign = "left";
    c.fillStyle = "rgba(255,255,255,.82)";
    c.font = font(400, 16);
    wrap(c, d.focus.tip, 112, 638, 460, 20, 2);
  } else {
    circleIcon(c, 82, 604, 18, levelColor.steady, "✓");
    c.fillStyle = "#fff";
    c.font = font(900, 24);
    c.fillText("All systems steady", 112, 612);
  }

  // stat row
  c.strokeStyle = "rgba(255,255,255,.35)";
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(56, 676);
  c.lineTo(W - 56, 676);
  c.stroke();
  const cols: [string, string][] = [["weakness", d.weakness], ["strength", d.strength], ["ground delay", d.delay]];
  cols.forEach(([k, v], i) => {
    const x = 62 + i * 178;
    c.fillStyle = "rgba(255,255,255,.65)";
    c.font = font(500, 13);
    c.fillText(k, x, 700);
    c.fillStyle = "#fff";
    c.font = font(900, 18);
    c.fillText(v, x, 724);
  });
  c.beginPath();
  c.moveTo(56, 742);
  c.lineTo(W - 56, 742);
  c.stroke();

  // footer
  c.fillStyle = "#fff";
  c.font = font(900, 16);
  c.fillText(`Level ${d.level}`, 62, 772);
  c.fillStyle = "rgba(255,255,255,.8)";
  c.font = font(400, 15);
  c.fillText(`${d.streak}-day streak`, 62, 794);
  c.font = font(400, 14);
  c.fillStyle = "rgba(255,255,255,.75)";
  wrap(c, `Logs vitals before breakfast and keeps steady at ${d.gravity.toLowerCase()}.`, 300, 772, 270, 18, 2);
  c.font = font(500, 13);
  c.fillStyle = "rgba(255,255,255,.7)";
  c.fillText(`${d.day}/365`, 62, 832);
  c.textAlign = "center";
  c.fillStyle = "#fff";
  c.fillText(`${"★".repeat(d.stars)}${"☆".repeat(4 - d.stars)}  ${d.rarity}`, W / 2, 832);
  c.textAlign = "right";
  c.fillStyle = "rgba(255,255,255,.7)";
  c.fillText("Crew Health", W - 62, 832);
  c.textAlign = "left";

  return el.toDataURL("image/png");
}

export type BadgeId = "streak7" | "first-log" | "full-day" | "surgeon" | "streak30";
const badgeLook: Record<BadgeId, { top: string; bottom: string; accent: string }> = {
  streak7: { top: "#0b1a3a", bottom: "#2952a3", accent: "#7fb4ff" },
  "first-log": { top: "#0b2a26", bottom: "#1f8a72", accent: "#7fe0c4" },
  "full-day": { top: "#2a0b2f", bottom: "#8a2f9c", accent: "#e3a6ff" },
  surgeon: { top: "#0f1d2a", bottom: "#2e6f8f", accent: "#9fe6ff" },
  streak30: { top: "#2a1a05", bottom: "#a8701c", accent: "#ffd889" },
};

function emblem(c: Ctx, id: BadgeId, x: number, y: number, col: string) {
  c.strokeStyle = col;
  c.fillStyle = col;
  c.lineWidth = 8;
  c.lineCap = "round";
  c.lineJoin = "round";
  if (id === "streak7") {
    c.beginPath();
    c.arc(x, y, 52, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(x, y, 120, 38, -0.35, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.arc(x + 104, y - 40, 12, 0, Math.PI * 2);
    c.fillStyle = "#fff";
    c.fill();
  } else if (id === "first-log") {
    rr(c, x - 70, y - 90, 140, 180, 16);
    c.stroke();
    rr(c, x - 34, y - 104, 68, 30, 10);
    c.fill();
    c.beginPath();
    c.moveTo(x - 36, y + 4);
    c.lineTo(x - 8, y + 32);
    c.lineTo(x + 42, y - 24);
    c.stroke();
  } else if (id === "full-day") {
    c.beginPath();
    c.arc(x, y, 96, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(x - 46, y + 2);
    c.lineTo(x - 12, y + 38);
    c.lineTo(x + 52, y - 34);
    c.lineWidth = 14;
    c.stroke();
  } else if (id === "surgeon") {
    c.beginPath();
    c.arc(x - 20, y + 20, 70, Math.PI * 0.9, Math.PI * 1.9);
    c.stroke();
    c.beginPath();
    c.moveTo(x - 20, y + 20);
    c.lineTo(x + 30, y - 30);
    c.stroke();
    for (const r of [40, 72]) {
      c.beginPath();
      c.arc(x + 30, y - 30, r, -Math.PI * 0.45, Math.PI * 0.05);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(x - 20, y + 20);
    c.lineTo(x - 20, y + 100);
    c.stroke();
  } else {
    c.beginPath();
    c.arc(x + 40, y - 40, 40, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 10;
    for (const [dx, dy, len] of [[0, 0, 150], [-24, 26, 110], [26, -24, 110]]) {
      c.beginPath();
      c.moveTo(x + 10 + dx, y - 10 + dy);
      c.lineTo(x + 10 + dx - len * 0.7, y - 10 + dy + len * 0.7);
      c.globalAlpha = 0.7;
      c.stroke();
      c.globalAlpha = 1;
    }
  }
}

export async function drawBadgeCard(b: { id: BadgeId; name: string; detail: string; earned: boolean; index: number; total: number }) {
  const { el, c } = await canvas();
  const look = b.earned ? badgeLook[b.id] : { top: "#15181f", bottom: "#3a3f4a", accent: "#7b8190" };
  rr(c, FRAME, FRAME, W - FRAME * 2, H - FRAME * 2, 18);
  const body = c.createLinearGradient(0, FRAME, 0, H);
  body.addColorStop(0, look.top);
  body.addColorStop(1, look.bottom);
  c.fillStyle = body;
  c.fill();

  rr(c, 46, 44, 96, 26, 13);
  c.fillStyle = silver(c, 46, 44, 142, 70);
  c.fill();
  c.fillStyle = "#1b2233";
  c.font = font(900, 14);
  c.fillText("BADGE", 66, 62);

  // emblem window
  const cx = W / 2, cy = 320;
  const halo = c.createRadialGradient(cx, cy, 10, cx, cy, 210);
  halo.addColorStop(0, b.earned ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.08)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = halo;
  c.beginPath();
  c.arc(cx, cy, 210, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(cx, cy, 178, 0, Math.PI * 2);
  c.strokeStyle = silver(c, cx - 178, cy - 178, cx + 178, cy + 178);
  c.lineWidth = 8;
  c.stroke();
  stars(c, cx - 170, cy - 170, 340, 340, b.index * 13 + 5, 30);
  emblem(c, b.id, cx, cy, look.accent);
  if (!b.earned) {
    rr(c, cx - 46, cy + 70, 92, 74, 14);
    c.fillStyle = "#c9ced8";
    c.fill();
    c.beginPath();
    c.arc(cx, cy + 70, 30, Math.PI, 0);
    c.strokeStyle = "#c9ced8";
    c.lineWidth = 12;
    c.stroke();
  }

  c.fillStyle = "#fff";
  c.textAlign = "center";
  c.font = font(900, 40);
  c.fillText(b.name, cx, 590);
  c.fillStyle = "rgba(255,255,255,.82)";
  c.font = font(400, 20);
  wrap(c, b.detail, cx, 632, 460, 26, 2);

  rr(c, cx - 70, 718, 140, 38, 19);
  c.fillStyle = b.earned ? "#ffffff" : "rgba(255,255,255,.15)";
  c.fill();
  c.fillStyle = b.earned ? "#0c111c" : "#d6dae2";
  c.font = font(900, 16);
  c.fillText(b.earned ? "Earned" : "Locked", cx, 743);

  c.font = font(500, 13);
  c.fillStyle = "rgba(255,255,255,.7)";
  c.fillText(`Badge ${b.index + 1}/${b.total}`, cx, 832);
  c.textAlign = "left";
  return el.toDataURL("image/png");
}

export async function drawCardBack() {
  const { el, c } = await canvas();
  rr(c, FRAME, FRAME, W - FRAME * 2, H - FRAME * 2, 18);
  const body = c.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 520);
  body.addColorStop(0, "#1a2a55");
  body.addColorStop(1, "#05070f");
  c.fillStyle = body;
  c.fill();
  stars(c, FRAME, FRAME, W - FRAME * 2, H - FRAME * 2, 99, 120);
  c.strokeStyle = "rgba(159,186,255,.35)";
  c.lineWidth = 2;
  for (const r of [120, 180, 250]) {
    c.beginPath();
    c.ellipse(W / 2, H / 2, r * 1.3, r * 0.5, -0.3, 0, Math.PI * 2);
    c.stroke();
  }
  c.beginPath();
  c.arc(W / 2, H / 2, 86, 0, Math.PI * 2);
  c.fillStyle = "rgba(255,255,255,.08)";
  c.fill();
  c.strokeStyle = "#fff";
  c.lineWidth = 4;
  c.stroke();
  c.lineWidth = 9;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  const k = 5.4, ox = W / 2 - 16 * k, oy = H / 2 - 16 * k;
  [[5, 17], [11, 17], [14, 10], [18, 23], [21, 17], [27, 17]].forEach(([x, y], i) => (i ? c.lineTo(ox + x * k, oy + y * k) : c.moveTo(ox + x * k, oy + y * k)));
  c.stroke();
  c.fillStyle = "#fff";
  c.textAlign = "center";
  c.font = font(900, 40);
  c.fillText("CREW HEALTH", W / 2, H / 2 + 170);
  c.font = font(500, 16);
  c.fillStyle = "rgba(255,255,255,.7)";
  c.fillText("Mission card", W / 2, H / 2 + 200);
  c.textAlign = "left";
  return el.toDataURL("image/png");
}
