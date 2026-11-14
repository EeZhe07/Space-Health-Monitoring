# Challenge coverage

How the UI answers the NASA Space Apps 2026 brief, "Create Health Monitoring
Software for Astronauts on Space Missions". All data is synthetic and every
threshold is an illustrative demo rule, not medical guidance.

| Brief asks for | Where it lives |
|---|---|
| Gather health indicators (BP, heart rate, blood sugar, temperature, sleep, mood) | Suit sensors stream readings automatically, compared with each crew member's NASA pre-flight baseline. **Daily check-in** covers the self-reported mood score and a manual fallback when a sensor is offline |
| Help astronauts assess their own health | **Status** (the first page): every indicator colour-coded (steady / watch / act) with a plain-language reading |
| Guidance on treatments and health improvements | Each indicator's detail shows *What to do now* for its current status |
| When a result needs the crew or flight surgeons | Status rules mark *Tell a crewmate* / *Message flight surgeon*; the message shows the comms delay for the current environment |
| Which measurements can be done in space, why, how hazards affect them | **Guide**: per-indicator *How to measure*, *Why it matters*, *In space* sections, plus the five HRP hazards |
| Clickable human figure showing function and status | **Vitals → Body map**: brain, eyes, heart, metabolism, immune system, bones and muscles, whole-body radiation; the heart beats at the latest logged heart rate |
| Dynamic charts over time | **Vitals → Trends**: 30 mission days per indicator with the safe band shaded (the line draws in and dots pop in when you switch indicators) |
| Colour coding at a glance | Steady (green), watch (amber), act (red) everywhere, always paired with an icon and a word |
| Prompt measurements as part of the mission routine | **Routine**: today's checklist with due times; overdue items are flagged |
| Gamification | **Routine**: streak, XP and level; a holographic Crew card built from your vitals whose foil gets rarer with your streak; badges as a collectible holo-card set |
| Different environments (spacecraft, station, rover, Moon/Mars base) | Environment switcher in the navbar; changes comms delay, gravity and radiation dose rate |
| Don't assume astronauts know how to assess themselves | Every indicator has short instructions and a "why" in place, not hidden in a manual |

## Built on the team's data work

**Vitals → Live check** replays the team's scenarios in `data/scenarios`
(A–D on main, E–F once PR #3 is merged): heart rate validity window, sensor
disconnects, symptom reports, assistance requests and crew handoff. The demo
engine in `src/lib/engine.ts` reproduces every `*_expected.json` exactly
(`npm run check`).
