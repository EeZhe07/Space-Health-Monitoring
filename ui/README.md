# Crew Health UI

Interactive demo screen for the crew health self-check. It reads the synthetic
scenarios in `../data/scenarios` and replays them minute by minute.

## Run it

```bash
cd ui
npm install
npm run dev
```

Open http://localhost:5173.

## What's on screen

- **Home**: the way in. After a 3-second Mars-approach intro, a tilting window
  (follows the pointer) sits in the middle of the screen. **Press and hold** it:
  a glowing ring traces around the window while a pulse readout syncs, then the
  window expands to fill the screen and opens Vitals. Let go early and it rewinds.
  Space/Enter work too, and "Enter without holding" is always available. Below,
  a "Today" summary (check-ins due, what needs attention, streak, ground delay)
  links straight to each page. Code: `src/views/PortalHome.tsx`,
  `src/views/portal.css`. The videos stream from a CDN, so Home needs internet.
- **Inner pages** sit over an animated space scene drawn in code
  (`src/components/SpaceScene.tsx`).
- **Particle titles** (React Bits ParticleText, Inter Black): Home's "TODAY" and
  every page title gather from particles, scatter away from the cursor, burst on
  click and re-form on hover. Code: `src/components/ParticleText/` (adds
  `align` and `maxParticles` props).
- **Motion**: numbers count up, the heart beats and an ECG trace scrolls at the
  logged heart rate, charts draw in, cards stagger in, pages cross-fade.
  Titles reveal word by word and labels cross-fade. Animation is on by default;
  the pause button in the navbar (or "Reduce motion" in the mobile menu) turns
  it off and is remembered.
- **Vitals → Overview**: all seven indicators (heart rate, blood pressure, blood
  sugar, temperature, sleep, mood, radiation) colour-coded steady / watch / act,
  with what to do now and a flight-surgeon message that shows the comms delay.
- **Vitals → Body map**: clickable figure; each region shows what it does, how
  spaceflight affects it and its latest readings.
- **Vitals → Trends**: 30 mission days per indicator with the steady band shaded.
- **Vitals → Live check**: the team's heart-rate scenarios (validity window,
  sensor drops, symptoms, crew handoff) replayed minute by minute.
- **Routine**: today's checklist, guided measurement entry, XP and streak, plus a
  holographic **Crew card** (React Bits HoloCard) drawn from live data: readiness
  score, heart rate, the indicator to focus on, weakness/strength, ground delay.
  The foil gets rarer as the streak grows (glitter → stars → cosmos → rainbow) and
  turns gold when every check-in is done. Select it to flip; "View large" opens it
  full screen. Badges are a collectible set of holo cards (locked ones are plain).
  Card art is drawn in `src/lib/cardArt.ts`; the component is in
  `src/components/HoloCard/`.
- **Guide**: the five hazards of spaceflight and how to measure each indicator.
- **Environment switcher** (navbar): station, spacecraft, rover, Moon or Mars base.

See [FEATURES.md](FEATURES.md) for how each feature maps to the challenge brief.
Entries you log are kept in the browser's localStorage; use *Reset demo* on the
Routine page to clear them.

## Rules engine

`src/lib/engine.ts` is a small demo engine that turns readings + events into the
same assessment JSON as the `*_expected.json` files. Check it against them:

```bash
npm run check
```

The footer on screen also says whether the current view matches the scenario's
expected file (shown when you're at the evaluation time and haven't added actions).

## Stack

Vite, React, TypeScript, Tailwind CSS v4, Motion and lucide icons. Inter from
Google Fonts (Black 900 for headlines, regular weights for body text). The `.liquid-glass` class in `src/index.css` follows the design
brief exactly; `panel` is a darker variant used for reading surfaces.
