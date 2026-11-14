# Crew Health Implementation Plan

**Goal:** Deliver the approved shared-tablet Day 140 prototype.

**Spec:** ../../../../output/pdf/Crew_Health_48h_Team_Plan_EN.pdf

**Architecture:** React and TypeScript, a deterministic assessment function, scenario fixtures and IndexedDB. The build precaches its assets for offline reopening. All fixture records remain labelled synthetic.

**Tech stack:** Vite, React, TypeScript, idb, Vitest, vite-plugin-pwa.

## Delivery steps

- [x] Define observation/event/run types and a fixture adapter. Test arrival timing, no-data assistance and persistent symptoms across sensor restoration.
- [x] Implement assessment and atomic local run saving. Preserve source fixtures and evaluate at the simulated clock. Raw records remain in the timeline; follow-up reports append events.
- [x] Build Today, Self-check, Handoff and History with simple flat panels, Source Sans 3, navy text and teal chart colour. Keep assistance reachable and source content available offline.
- [x] Implement replay controls, scenario reset, recovery, JSON export and explicit storage errors.
- [x] Run type checks, core tests and production build; inspect desktop, tablet and phone; verify reload, repeat acknowledgement, export and offline reopen in a browser.

## Verification and decisions

Twelve core tests cover time filtering, unknown values, source booleans, independent manual readings and handoff invalidation by later concerns. Chrome checks exercise new symptom entry, manual input, saved acknowledgement, independent scenario runs, JSON export, offline reload and reopen, and 768/390px overflow.

Review corrected three material issues: fresh concerns reopen handoff, drafts reset when run ID changes, and chart provenance reflects manual entries. Replay persistence occurs after pointer release or keyboard changes.

Local storage uses one run document with nested observations and events, atomically saved with its active pointer. This keeps the prototype small; normalized cloud tables and synchronization remain subsequent work. The Impeccable engine was unavailable, so written guidance and the taste inspector were used. Different-height content panels deliberately keep their natural size rather than stretching empty space.

## Review focus

Readings received in the future stay hidden. Missing readings never become zero. No reported symptoms differs from explicit denial. Scenario runs do not share actions. Late or restored readings do not close reported symptoms. Supabase is a later integration requiring a shared-device workflow and credentials.
