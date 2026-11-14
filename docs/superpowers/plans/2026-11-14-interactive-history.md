# Interactive measurement history

Requested: inspect historical records directly from the heart-rate chart and all other charts. Extend the existing shared SVG component; keep the current visual style and data/assessment rules.

Use pointer inspection and a native range control with previous/next buttons. Show the selected actual observation's value, exact UTC date/time, received time, source, context and quality. Default to the latest received reliable observation; reset safely on an indicator/run change or a replay rewind. Keep the selected detail visible after pointer exit. Render no inspection controls for an empty chart. No interpolation, new thresholds, cloud changes or saved-record mutations.

- [x] Add and run a browser check that fails because history inspection is absent.
- [x] Implement the shared responsive inspector and keyboard/touch controls.
- [x] Verify all indicators, pointer, touch, keyboard, empty states and replay isolation; inspect screenshots and review the change.
- [x] Document and publish the verified branch.

Evidence: the initial browser run failed because the history slider did not exist. The completed check passes hover, tap (including the first point on a narrow screen), slider/step controls, all seven indicators, exact timestamps, scenario reset, replay rewind, empty state, unchanged replay clock and phone overflow. Desktop/mobile screenshots were inspected. Production build, existing 21 tests and the existing reporting/offline browser journey passed. Independent read-only review found no blockers. Inspection uses the existing reliable, received-as-of measurement filter and adds no data or clinical rules.
