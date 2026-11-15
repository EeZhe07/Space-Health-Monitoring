# Crew Health usability pass

User authorised autonomous improvements to visualisation, usability and crew workflow. Keep the existing simple visual system. Gamification is reserved for a later discussion.

- [x] Shorten symptom entry with common symptoms first, additional symptoms on disclosure, optional timing/notes, and no inferred symptom onset.
- [x] Add responsive metric trends and a clear measurement detail panel, preserving stale and context-mismatched values.
- [x] Bring actionable concerns and handoff state forward on Today; remove repeated content and redundant panels.
- [x] Expose E/F fixtures and test recovery, direct assistance and new concerns after acknowledgement.
- [x] Replace raw cloud JSON with a readable report viewer; improve queue/reconnect state while preserving local-first storage and account isolation.
- [x] Verify tests/build, browser workflows, responsive widths including a 200%-zoom-equivalent reflow width, keyboard and offline persistence; capture final screens; independent review.
- [x] Push the verified branch.

Live verification before changes: a signed-in fictional Scenario C packet was queued, uploaded to the intended Supabase project and returned from its server archive. This confirms server storage, not clinical review or cross-account sharing.

Verification: 21 unit/render checks; production TypeScript/Vite build and offline cache; main Chrome workflow; separate mocked Supabase browser journey. Screenshots reviewed at desktop and phone widths. The mock checks cover offline reopening with a pending packet, failed upload/retry with a stable ID, recovery after a lost local receipt, and an auth change while another account's request is in flight. The mocked transport does not mutate hosted data.

Independent review found and prompted fixes for combined blood-pressure status, hidden pending packets after an offline reload, and missed retry after an account switch. Follow-up review confirmed these three findings were addressed with no remaining blocking issue in those fixes. Gamification remains deferred.

Before publishing, a remote fetch revealed the team's separate `ui/` frontend newly merged into `origin/main` at 8ddcd93. This pass remains on `codex/crew-health-prototype`; it does not combine the two frontends. Integration is a separate team decision, and the teammate frontend has not been tested by this pass.
