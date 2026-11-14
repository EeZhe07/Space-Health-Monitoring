# Crew Health demo data (synthetic)

All values are made up for the demo. No real astronaut data is used.
Full field-by-field documentation: [DATA_MODEL.md](DATA_MODEL.md)

## Folders
- `scenarios/`: day-140 handoff scenarios A–F (input, events, expected engine output)
- `history/`: one morning resting heart rate per day, days 1–140
- `rules/`: rule settings (`thresholds.json`) and the day-140 resting comparison result
- `sample_*`: the first sample (same as Scenario C)

## How the synthetic heart-rate values were chosen
- **Fictional crew member:** age 46 (typical of ISS crews in published studies [3]).
- **Max heart rate estimate:** 220 − age = 174 bpm (age-predicted formula used in NASA exercise testing [2]).
- **Exercise intensity:** NASA ISS aerobic sessions run 30–40 min at 70–85% of max HR [1] → 122–148 bpm.
  Our exercise plateau (~140–146 bpm, 30–36 min) is within this range.
- **Resting heart rate:** around 62 bpm with small daily variation (demo value). Day 140 is set to 74 bpm on purpose to demonstrate the comparison rule. About 4% of days are marked `suspect` (loose strap) to test that bad readings are skipped.
- **Validity window (2 min)** and other rule thresholds are demo settings, not NASA values.

## Sources
1. NASA NTRS 20090013286: ISS exercise countermeasures presentation. https://ntrs.nasa.gov/api/citations/20090013286/downloads/20090013286.pdf
2. NASA NTRS 20070023931: Veloergometer and CEVIS comparison. https://ntrs.nasa.gov/api/citations/20070023931/downloads/20070023931.pdf
3. English et al. (2020), npj Microgravity: ISS exercise countermeasures study. https://link.springer.com/article/10.1038/s41526-020-00111-x
