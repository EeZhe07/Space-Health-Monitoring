# Demo setup and defaults

Requested: switch scenarios and app defaults for presentations. Keep the existing crew workflow; put a visible Demo setup trigger in the synthetic-data notice. Provide Default app (routine readings at rest, no concern) and A–F. Add local resume/fresh launch preferences, start selected preset, and restore defaults. Starting a preset archives the prior run rather than deleting it. Restore does not remove reports or sign-in.

Implemented a new settings key in the existing IndexedDB store and an atomic run/active-pointer/preferences write with recovery. Missing or malformed settings fall back safely. Existing installations resume their current run. Fresh installations use Default app.

Verified production build, 25 unit tests, new Chrome demo workflow, plus the existing reporting, chart, game and mocked-cloud journeys. Demo checks include offline fresh launch, resume, defaults restore, historical mood preservation, failed settings writes with rollback/retry, and phone/tablet layout. Read-only review prompted explicit label associations and same-view focus restoration. Source screenshots inspected.
