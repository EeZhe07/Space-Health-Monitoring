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

Today prioritizes the crew concern and handoff state, followed by six measurement groups. Missing or stale readings remain explicit. Measurements provides a selectable trend for every indicator, with time, context, provenance and crew-event markers. Trends break at gaps and changes of context or source. Self-check shows six common symptoms first, with more symptoms and optional details on disclosure. Handoff lets another crew member acknowledge taking over on the same tablet. History records the timeline, separate replay runs and a JSON export.

Handoff findings and subsequent teammate updates are saved as events. Handoff and History include a ground-review packet preview and JSON export combining reports, received reliable observations, event history, assessment reasons and relevant research references. Reference material is kept out of Today. Optional authenticated Supabase storage archives immutable snapshots. The packet snapshot excludes measurements and events later than the current replay time.

## Expanded measurements

Measurements supports heart rate, SpO2, respiratory rate, paired systolic/diastolic pressure, body temperature and sleep duration. Scenarios A-C and E include a separate synthetic panel; scenarios D and F remain empty. E/F begin with CM-3's handoff acknowledgement while retaining the crew concern. Existing saved runs stay intact and can display missing indicators. Start a fresh replay to load the expanded fixtures, or use Simulate multi-indicator changes.

Comparison profiles cite general resting-adult vital-sign references and pulse-oximetry information from MedlinePlus. They are separate from NASA device-capability references and do not claim mission-specific clinical thresholds. Sleep has no configured clinical cut-off. Context mismatches, stale values and absent measurements remain explicit. Detailed references and comparison metadata appear in ground-review packets.

Self-check supports grouped, multiple symptom selections with optional reported impact. Each selected symptom creates its own event in one saved transaction. Onset and manually entered measurement context default to unknown. Input records retain source, time, unit, context and synthetic labels. Manual entry is optional; the app does not measure physiological signals.

## Supabase ground archive setup

1. Copy `.env.example` to `.env.local` and set the project URL and browser-safe publishable key.
2. Run `supabase/setup.sql` in the intended project's SQL Editor. It creates `crew_health_packets`, enables RLS, revokes anonymous access and allows authenticated users to insert/read their own packets.
3. Create a confirmed demo user in Supabase Auth. In Handoff or History, expand Ground connection and sign in with that account's email/password.
4. Select Save and send snapshot. It saves locally first, then attempts an upload if online. Pending packets retry when the connection section mounts or an online event occurs while it is mounted. A second device signed into the same account can refresh the readable server archive.

Cloud uploads are immutable packet snapshots, not live two-way synchronization of the running episode. The queue is stored in IndexedDB and survives reload. Upload retries reuse the packet ID. Server receipt is shown separately from crew acknowledgement or clinical review. Distinct-user team sharing requires an additional membership/permission model. A signed-in synthetic packet was uploaded to the intended project and retrieved from its archive during manual verification on 14 November 2026, after the owner completed setup. Automated failure/retry checks use a mocked transport and do not change hosted data.

Demo controls load scenarios A-F, move the simulated clock, disconnect or reconnect the sensor and start a fresh replay. The previous replay stays saved. A sensor reconnect does not generate a measurement or resolve a symptom.

## Data and assessment

- `data/scenarios/` contains original teammate fixtures. Expected JSONs describe intended results; the app calculates its assessments from CSV inputs and events.
- `src/core.ts` contains types, fixture validation and deterministic assessment rules.
- `src/scenarios.ts` adapts original fixtures. Scenario A is evaluated ten seconds later than its original snapshot so its last measurement has arrived.
- `src/storage.ts` atomically saves each run and the active-run pointer in IndexedDB. Runs currently contain observations and event histories as a single document.
- `src/content.ts` provides bundled source explanations and official reference links.
- `scripts/build-offline.mjs` precaches the production assets.

The two-minute heart-rate validity window and other indicator freshness windows are illustrative settings. The prototype supports measurement review and onboard coordination. Clinical diagnosis, treatment protocols, real device adapters, mission connectivity and distinct-user ground-team permissions need separate work. Only fictional records should be entered in the public demo. Gamified check-ins remain a future design discussion.

Records are scoped to this browser and website origin. Clearing site data removes them; export JSON to keep a copy. Browser storage is not an access-control system. Crew IDs in the interface identify simulated participants without authenticating them.

## Verification

```sh
npm test
npm run build
```

With Chrome installed and the production preview running on port 4173:

```sh
npm run test:browser
npm run test:cloud-browser
```

The main browser check covers symptom entry, manual measurements, acknowledgement persistence, metric trends, A-F replays, JSON export, offline reload/reopen, keyboard operation and responsive reflow. The cloud check requires a build with Supabase configuration, intercepts every Supabase request, and covers offline queue visibility, failed uploads, reconnect retries, stable IDs, lost-receipt recovery and account changes during an upload. Screenshots are written to ignored `playwright-results/`.

Product and visual decisions are in `PRODUCT.md` and `DESIGN.md`. Research references are available inside the application. Implementation, documentation and checks were prepared with AI assistance.
