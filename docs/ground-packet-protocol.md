# Ground packet protocol 0.2

The existing Supabase `crew_health_packets` table remains an account-owned, immutable JSON envelope archive. No RLS change or new table is required. Every envelope keeps `synthetic: true`, `runId`, `crewId`, `missionId`, `demoBatchId` and a full report context.

- `kind: crew_report` is an astronaut snapshot. Legacy envelopes without `kind` are crew reports.
- `kind: ground_response` carries `response: { packetId, action, message, reviewer, at }`. It references the immutable crew report, and is not a new health measurement or updated patient snapshot.
- Crew-archive queries filter crew reports before applying their row limit. Ground analysis filters response envelopes from its member-version selection.
- Latest member state is selected by mission `asOf`, then receipt time. Reading freshness additionally considers elapsed wall time and other received mission timestamps. No unshared crew record is inspected by the ground page.
- `wellbeing` is absent unless the member explicitly opted in. It contains the latest self-report and exploratory task summary, never raw reaction arrays.

Local demonstration packets use IndexedDB `groundPackets`, a reserved `local-demo` owner and `demo` state. They are never submitted to Supabase by the pending-upload worker. BroadcastChannel refreshes other same-origin tabs. Separate demo batches prevent an earlier team setup's packets from overriding a restarted presentation; archived batches stay selectable.

Cloud packets and replies use the authenticated account ID, stable UUIDs and the existing insert/select RLS. Queued envelopes remain pending until a server receipt is recorded. Both demo roles intentionally use one account; reviewer text and crew-profile selectors are not authorization claims. Distinct-account missions need real membership/role policies before use.

The ground viewer paginates up to 2,000 packets and displays a limit notice. Cached data is scoped to the authenticated account and selected demo batch. Signing out/switching accounts hides the previous account immediately. Older clients that do not understand response envelopes should be updated before using the combined archive.
