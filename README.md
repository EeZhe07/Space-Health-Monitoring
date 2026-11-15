# Crew Health

A crew-tablet and ground-review prototype for NASA Space Apps 2026. English interface built with React, TypeScript and Vite. All bundled crew data is synthetic.

## Merged teammate UI

The latest `ui/status-dashboard` branch (through `3261052`) is merged into this branch. It adds the separate visual demo under `ui/` plus shared resting-heart-rate history and rule files under `data/`. The root app retains crew profiles, daily checks, Signal Watch, IndexedDB/Supabase packets and Ground Review. The visual demo currently has its own localStorage state; merging the source does not connect those two state models.

Run the visual demo independently with `npm ci --prefix ui`, `npm run build --prefix ui`, then `npm run preview --prefix ui -- --host 127.0.0.1 --port 4174 --strictPort`. Use port 4173 for the root app as described below. Validate the incoming demo using `npm run check --prefix ui`. With both previews running, `node scripts/check-ui-merge.cjs` checks the visual routes, narrow layout and offline reload.

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

**Team demonstration:** Open **Demo setup → Load team demonstration**, then **Open Ground Review**. Four independent fictional crew profiles are created: CM-1 routine, CM-2 reporting dizziness, CM-3 with interrupted sensor data, and CM-4 awaiting receipt of a report. Three snapshots are shared in the **Local demo inbox**. Switch **Demo crew profile** on the crew tablet to operate each person's records. Start a second tab at `/#ground` to show both sides. Repeating the team demonstration creates a separate session; archived sessions remain selectable in Ground Review.

Ground Review provides the whole-crew overview, each member’s evidence and interactive historical graphs, source references, shared wellbeing summaries, an exportable crew summary and per-snapshot acknowledgements/update requests. It reads received snapshots, not unshared local runs. No received report means unknown status. Late old packets do not supersede newer mission-time reports. Ground requests appear on the matching member/replay’s home page and Handoff. Acknowledgement does not erase an update request or certify medical fitness.

In Handoff or History, **Share with demo ground** publishes a browser-local snapshot. **Save and send snapshot** uses Supabase. Ground Review's **Cloud inbox** uses the same signed-in demo account and the existing ownership RLS, with cached offline reads. Cloud replies queue locally if offline and can be sent using **Retry pending deliveries**. This is a simulated workspace switch, not production crew/ground role authorization or different-account team sharing.

Wellbeing sharing is off by default. Enable **Include my latest wellbeing summary in future shared reports** to include only the latest daily answer, momentary mood and attention summary; raw reaction arrays stay local. Sharing changes affect future packets. Previous received snapshots remain immutable. Each crew member’s active replay, private check-ins and personal task baseline stay separate; legacy runs without a crew ID belong to CM-2.

Use **Demo setup** beside the save status to choose **Default app** or scenarios A–F. Default app contains routine synthetic readings at rest with no reported concern. **Start selected setup** starts a fresh replay and saves the startup choice locally. On reload, choose whether to resume the last saved run or start the selected preset fresh. **Restore app defaults** starts a fresh Default app and restores resume-on-reload. Existing runs stay in History; snapshots and ground-archive sign-in are retained. Existing installations initially resume their saved run.

Today prioritizes the crew concern and handoff state, followed by six measurement groups. Missing or stale readings remain explicit. Measurements provides a selectable trend for every indicator, with time, context, provenance and crew-event markers. Trends break at gaps and changes of context or source. Self-check shows six common symptoms first, with more symptoms and optional details on disclosure. Handoff lets another crew member acknowledge taking over on the same tablet. History records the timeline, separate replay runs and a JSON export.

Every measurement chart supports historical inspection. Hover or tap the plot to select the nearest actual reading, or use the range control and Previous/Next buttons. The range supports native keyboard navigation. Selected details remain visible after pointer exit and show value, exact UTC measured/received times, source, context, recorded quality and record ID. Inspection does not edit the episode or advance its clock; no value is fabricated between observations. Empty charts have no inspection controls.

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

The two-minute heart-rate validity window and other indicator freshness windows are illustrative settings. The prototype supports measurement review and onboard coordination. Clinical diagnosis, treatment protocols, real device adapters, mission connectivity and distinct-user ground-team permissions need separate work. Only fictional records should be entered in the public demo.

**Daily self-check:** Today asks CM-2 for a mood rating (1–5) and whether there are uncomfortable feelings. Nothing is preselected. Mood 1–2 or discomfort opens Self-check after saving; the private daily answer is shown separately from the exported symptom note. Existing concerns stay open until explicitly resolved. The reminder becomes due initially and after 20 hours on either the real elapsed clock or simulated mission clock. It refreshes each minute while open and on offline reload; it does not send OS notifications. Demo controls include **Advance 20 hours · Daily reminder**.

**Crew break:** Signal Watch replaces the matching game. Practice three signals, then optionally start a 12-signal recorded round. Use one selected mouse/touch/keyboard control, responding only to SIGNAL. Completed rounds automatically save reaction times, missed signals, early inputs and protocol/input metadata to the run. Leaving the response area, hiding the page, ending a round or changing the mission clock cancels an incomplete round. The separate mood question remains available without playing.

The task compares a round only after three earlier usable rounds with matching input/protocol in this browser. At least eight of twelve responses are needed. A median slowdown exceeding both 25% and 75 ms, two extra misses, or three extra early inputs are illustrative product flags, not NASA clinical thresholds. No psychological label or fitness judgment is inferred. Device timing, fatigue, practice and distraction can affect results. The short task has not inherited the validation of NASA's three-minute PVT-B. See [NASA project](https://techport.nasa.gov/projects/23201) and [primary ISS study](https://pmc.ncbi.nlm.nih.gov/articles/PMC8919197/).

Daily entries, completed task records and legacy mood entries appear in the current member’s local History as of the replay clock. Ground exports and Supabase packets exclude them unless the member enables wellbeing-summary sharing. No database migration or network connection is needed for the local demo after the app is cached.

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
npm run test:chart-browser
npm run test:break-browser
npm run test:daily-browser
npm run test:demo-browser
npm run test:ground-browser
```

The main browser check covers symptom entry, manual measurements, acknowledgement persistence, metric trends, A-F replays, JSON export, offline reload/reopen, keyboard operation and responsive reflow. The cloud check requires a build with Supabase configuration, intercepts every Supabase request, and covers offline queue visibility, failed uploads, reconnect retries, stable IDs, lost-receipt recovery and account changes during an upload. Screenshots are written to ignored `playwright-results/`.

The chart check covers pointer and touch inspection, range and step controls, all seven indicator charts, exact timestamps, selection reset, replay rewind, empty charts, clock isolation and phone overflow.

Product and visual decisions are in `PRODUCT.md` and `DESIGN.md`. Research references are available inside the application. Implementation, documentation and checks were prepared with AI assistance.
