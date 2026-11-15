# Challenge coverage

How the UI answers the NASA Space Apps 2026 brief, "Create Health Monitoring
Software for Astronauts on Space Missions". All data is synthetic and every
threshold is an illustrative demo rule, not medical guidance.

| Brief asks for | Where it lives |
|---|---|
| Gather health indicators (BP, heart rate, blood sugar, temperature, sleep, mood) | Nine indicators: the six asked for plus blood oxygen (SpO2), breathing rate and radiation dose. No manual entry: suit sensors stream every reading, compared with each crew member's synthetic demo baseline (NASA is used as a reference only); mood is estimated from heart-rate variability and sleep. **Today's plan** shows what synced and flags any sensor that dropped out |
| Help astronauts assess their own health | **Status** (the first page): every indicator colour-coded (steady / watch / act) with a plain-language reading |
| Guidance on treatments and health improvements | Each indicator's detail shows *What to do now* for its current status |
| When a result needs attention, from patterns not single values | **Status → Patterns to watch**: alerts such as "blood pressure trending higher" or "sleep debt building", each with why it matters and what to do |
| Fast response in an emergency or accident | Red **Emergency** button on every page opens an instant screen: crew alerted, vitals sent to the flight surgeon with the delay shown, and step-by-step prompts for the situation |
| Keeping automatic data reliable | **Plan → Sensor health**: connection, battery and last sync for every suit sensor, with low-battery warnings |
| When a result needs the crew or flight surgeons | Status rules mark *Tell a crewmate* / *Message flight surgeon*; the message shows the comms delay for the current environment |
| Which measurements can be done in space, why, how hazards affect them | **Guide**: per-indicator *How to measure*, *Why it matters*, *In space* sections, plus the five HRP hazards |
| Clickable human figure showing function and status | **Vitals → Body map**: brain, eyes, heart, metabolism, immune system, bones and muscles, whole-body radiation; the heart beats at the latest logged heart rate |
| Dynamic charts over time | **Vitals → Trends**: 30 mission days per indicator with the safe band shaded (the line draws in and dots pop in when you switch indicators) |
| Colour coding at a glance | Steady (green), watch (amber), act (red) everywhere, always paired with an icon and a word |
| Actions that prevent a critical condition | **Daily check-in → Prevention plan**: exercise, sleep window, water, plus extra countermeasures added automatically from your patterns and environment |
| Prompt measurements as part of the mission routine | Sensors measure on their own; **Plan → Sensor health** flags low batteries and dropped sensors before data goes missing |
| Gamification | **Plan**: XP and level, and a streak for days the prevention plan is finished |
| Works far from Earth | **Offline mode**: the build saves every file on the first visit, so the app keeps working with no connection; Settings shows whether it's ready and a navbar badge shows when the link is down |
| Different environments (spacecraft, station, rover, Moon/Mars base) | Environment switcher in the navbar; changes comms delay, gravity and radiation dose rate |
| Don't assume astronauts know how to assess themselves | Every indicator has short instructions and a "why" in place, not hidden in a manual |

## Built on the team's data work

**Resting heart rate** uses the team's history (`data/history/resting_hr_days_1_140.csv`)
and rules (`data/rules/thresholds.json`): your normal is the median of mission days
1–14, and a reading more than 15% above it is flagged. The app reproduces
`data/rules/resting_assessment_day140.json` exactly (74 bpm, +19.4%, flagged), and
the detail panel shows the NASA-sourced exercise zone (122–148 bpm).


The Live check idea of being honest about what is not known now runs through
the app: when a sensor drops out, its Status card shows **Unknown** with the
last trusted value and the reason, instead of an old number.


**Vitals → Live check** replays the team's scenarios A–F in `data/scenarios`:
heart rate validity window, sensor
disconnects, symptom reports, assistance requests and crew handoff. The demo
engine in `src/lib/engine.ts` reproduces every `*_expected.json` exactly
(`npm run check`).
