# Crew Health

A shared-tablet astronaut health prototype for NASA Space Apps 2026. English interface built with React, TypeScript and Vite. All bundled crew data is synthetic.

## Run locally

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

For offline verification, use the production build:

```sh
npm run build
npm run preview -- --port 4173
```

Open http://127.0.0.1:4173 while online once, allow the service worker to finish caching, then reopen offline. Service workers require localhost or HTTPS. The development server does not provide offline caching.

## Main flow

Today shows received heart-rate readings, their context and the crew report. Self-check records symptoms or a manually entered measurement. Handoff lets another crew member acknowledge taking over on the same tablet. History records the timeline, separate replay runs and a JSON export.

Handoff findings and subsequent teammate updates are saved as events. Handoff and History include a ground-review packet preview and JSON export combining reports, received reliable observations, event history, assessment reasons and relevant research references. Reference material is kept out of Today. The packet is saved/exported locally; transmission and ground receipt remain future integrations. The packet snapshot excludes measurements and events later than the current replay time.

## Expanded measurements

Measurements supports heart rate, SpO2, respiratory rate, paired systolic/diastolic pressure, body temperature and sleep duration. Scenarios A-C include a separate synthetic panel; scenario D remains empty. Existing saved runs stay intact and can display missing indicators. Start a fresh replay to load the expanded fixtures, or use Simulate multi-indicator changes.

Comparison profiles cite general resting-adult vital-sign references and pulse-oximetry information from MedlinePlus. They are separate from NASA device-capability references and do not claim mission-specific clinical thresholds. Sleep has no configured clinical cut-off. Context mismatches, stale values and absent measurements remain explicit. Detailed references and comparison metadata appear in ground-review packets.

Self-check supports grouped, multiple symptom selections with optional reported impact. Each selected symptom creates its own event in one saved transaction. Input records retain source, time, unit, context and synthetic labels.

## Supabase ground archive setup

1. Copy `.env.example` to `.env.local` and set the project URL and browser-safe publishable key.
2. Run `supabase/setup.sql` in the intended project's SQL Editor. It creates `crew_health_packets`, enables RLS, revokes anonymous access and allows authenticated users to insert/read their own packets.
3. Create a confirmed demo user in Supabase Auth. In Handoff or History, expand Ground connection and sign in with that account's email/password.
4. Queue a snapshot locally, then sync queued packets. Pending packets are retried on the next online event while this panel is mounted. A second device signed into the same account can refresh the server archive.

Cloud uploads are immutable packet snapshots, not live two-way synchronization of the running episode. The queue is stored in IndexedDB and survives reload. Upload retries reuse the packet ID. Server receipt is shown separately from crew acknowledgement or clinical review. Distinct-user team sharing requires an additional membership/permission model. This session could verify the project/key but could not create its missing table through the connected management tool; hosted end-to-end verification is pending owner setup.

Demo controls load scenarios A-D, move the simulated clock, disconnect or reconnect the sensor and start a fresh replay. The previous replay stays saved. A sensor reconnect does not generate a measurement or resolve a symptom.

## Data and assessment

- `data/scenarios/` contains original teammate fixtures. Expected JSONs describe intended results; the app calculates its assessments from CSV inputs and events.
- `src/core.ts` contains types, fixture validation and deterministic assessment rules.
- `src/scenarios.ts` adapts original fixtures. Scenario A is evaluated ten seconds later than its original snapshot so its last measurement has arrived.
- `src/storage.ts` atomically saves each run and the active-run pointer in IndexedDB. Runs currently contain observations and event histories as a single document.
- `src/content.ts` provides bundled source explanations and official reference links.
- `scripts/build-offline.mjs` precaches the production assets.

The two-minute measurement-validity window is an illustrative setting. The prototype supports measurement review and onboard coordination. Clinical diagnosis, treatment protocols and cloud synchronization need separate work. Only fictional records should be entered in the public demo.

Records are scoped to this browser and website origin. Clearing site data removes them; export JSON to keep a copy. Browser storage is not an access-control system. Crew IDs in the interface identify simulated participants without authenticating them.

## Verification

```sh
npm test
npm run build
```

With Chrome installed and the production preview running on port 4173:

```sh
npm run test:browser
```

The browser check covers symptom entry, manual measurements, acknowledgement persistence, independent runs, JSON export, offline reload/reopen and tablet/phone overflow. Screenshots are written to ignored `playwright-results/`.

Product and visual decisions are in `PRODUCT.md` and `DESIGN.md`. Research references are available inside the application. Implementation, documentation and checks were prepared with AI assistance.
