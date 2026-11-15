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

When running alongside the root crew/ground app, use a separate preview port:
`npm run preview -- --host 127.0.0.1 --port 4174 --strictPort`.
This visual demo has independent localStorage state. Crew profiles, daily
self-checks, Signal Watch and Supabase Ground Review currently run in the
root app; their state has not been connected to this interface.

The production build now generates a versioned offline precache of its
HTML, JavaScript and CSS before activation. Its cache namespace is separate
from the root app, and preview-server Vary headers do not prevent offline hits.

## What's on screen

- **Status (first page)**: opens straight onto the crew member's health status.
  No welcome page and no setup: each person has a synthetic demo baseline (NASA
  is a reference, not a data source), and in-mission readings stream in from suit sensors
  (wrist sensor with pulse oximeter, chest strap, arm cuff, glucose monitor, skin
  patch, sleep tracker, dosimeter). Every card shows its source and how it compares with the baseline.
- **Inner pages** sit over an animated space scene drawn in code
  (`src/components/SpaceScene.tsx`) with a 3D starfield from React Bits
  Particles: it drifts in depth, shifts with the cursor and ripples on click.
- **Motion**: numbers count up, the heart beats and an ECG trace scrolls at the
  logged heart rate, charts draw in, cards stagger in, pages cross-fade.
  Titles reveal word by word and labels cross-fade. Animation is on by default;
  the pause button in the navbar (or "Reduce motion" in the mobile menu) turns
  it off and is remembered.
- **Status**: all nine indicators (heart rate, blood oxygen (SpO2), breathing
  rate, blood pressure, blood sugar, temperature, sleep, mood, radiation) colour-coded steady / watch / act,
  with what to do now and a flight-surgeon message that shows the comms delay.
- **Emergency button** (always in the navbar): one tap opens an instant
  emergency screen that alerts the crew, sends the latest vitals to the flight
  surgeon with the comms delay shown, and gives step-by-step prompts for injury,
  chest pain, an unconscious crewmate, fire or a radiation storm.
- **Patterns, unknowns, prevention**: Status shows pattern alerts and marks
  readings "Unknown" when a sensor is offline; Plan has a prevention plan that
  adds countermeasures from your patterns.
- **Body map**: clickable figure; each region shows what it does, how
  spaceflight affects it and its latest readings.
- **Trends**: 30 mission days per indicator with the steady band shaded.
- **Live check**: the team's heart-rate scenarios (validity window, sensor drops,
  symptoms, crew handoff) replayed minute by minute.
- **Plan**: nothing to enter. What synced from each sensor, the prevention plan,
  **Sensor health** (connection, battery and last sync for each suit sensor, with
  low-battery warnings and reconnect), and your level and streak.
- **Guide**: the five hazards of spaceflight and how to measure each indicator.
- **Offline mode**: the production build caches itself on the first visit, so the
  tablet keeps working with no link to Earth. An "Offline" badge appears in the navbar
  when the connection drops. Try it:

  ```bash
  npm run build
  npm run preview
  ```

  Open http://localhost:4173 once, then stop the server (or go offline) and reload.
  The dev server (`npm run dev`) doesn't cache, on purpose.
- **Settings** (gear in the navbar): mission environment (station, spacecraft,
  rover, Moon or Mars base) and the animation switch.

See [FEATURES.md](FEATURES.md) for how each feature maps to the challenge brief.
Entries you log are kept in the browser's localStorage; use *Reset demo* on the
Routine page to clear them.

## Team data and rules

Resting heart rate comes from `data/history/resting_hr_days_1_140.csv` and is
assessed with `data/rules/thresholds.json` (personal normal = median of days 1–14,
flag above +15%) in `src/lib/resting.ts`. `npm run check` also compares the app
with `data/rules/resting_assessment_day140.json`.

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
