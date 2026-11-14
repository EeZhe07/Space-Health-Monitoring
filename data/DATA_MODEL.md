# Crew Health: Data Model

All data in this repository is **synthetic** (made up for the demo). No real astronaut data is used.
Rule values are labelled **demo setting** or **NASA-sourced** in `data/rules/thresholds.json`.

## 1. Folder layout

```
data/
  README.md
  sample_input_hr.csv, sample_events.json, sample_assessment.json   ← first H4 sample (= Scenario C)
  scenarios/      scenario_{A–F}_hr.csv · _events.json · _expected.json
  history/        resting_hr_days_1_140.csv
  rules/          thresholds.json · resting_assessment_day140.json
```

## 2. The five objects

```
Measurements (resting, days 1–14, quality ok) ──► Reference (median, n)
                                                        │
Measurements (today) + Events + Thresholds ─────────────┴──► Assessment
```

An **assessment** is calculated by the rule engine. It records which measurements and events it used (`contributing_ids`) and which rules it used (`rule_version`).

### 2.1 Measurement: one sensor reading
Files: `scenarios/*_hr.csv`, `history/resting_hr_days_1_140.csv`

| Field | Type | Example | Notes |
|---|---|---|---|
| `record_id` | text | `HR-140-036` | Unique within a dataset (see §4) |
| `crew_id` | text | `CM-2` | Fictional crew member |
| `indicator` | text | `heart_rate` | Only heart rate in this prototype |
| `value` | integer | `142` | |
| `unit` | text | `bpm` | |
| `measured_at` | timestamp (UTC) | `2027-07-18T14:06:00Z` | When the reading was taken |
| `context` | text | `exercise` | `exercise` · `post_exercise` · `resting`. **Readings are only compared with readings of the same context** |
| `source` | text | `simulated_device` | |
| `quality` | text | `ok` | `ok` · `suspect` (e.g. loose strap). Rules use only `ok` |
| `synthetic` | boolean | `True` | CSV writes `True`/`False`; JSON uses `true`/`false` |
| `received_at` | timestamp (UTC) | `2027-07-18T14:06:05Z` | When the app received it (kept separate from `measured_at`) |

### 2.2 Event: something that happened (not a measurement)
Files: `scenarios/*_events.json`

Common fields: `event_id`, `crew_id`, `type`, `source`, `synthetic`, plus a time field.

| `type` | Extra fields | Example |
|---|---|---|
| `sensor_disconnected` | `time` | Wrist sensor lost at 14:06:30 |
| `symptom_report` | `symptom`, `description`, `reporter`, `reported_at`, `onset_at`, `onset_certainty` (`just_now` · `approximate` · `uncertain`), `status` (`open` · closed later by a person) | Dizziness reported 14:08, onset ~14:07 |
| `assistance_requested` | `by`, `time` | Crew member pressed Request assistance |
| `handoff_acknowledged` | `by`, `time` | Teammate CM-3 takes over. **Only the first acknowledgement counts** |

### 2.3 Threshold: a rule setting
File: `rules/thresholds.json`. Every setting has a `description` and an `evidence` label.

| Key | Value | Evidence |
|---|---|---|
| `resting_hr_reference` | days 1–14, median, ≥ 7 valid readings | demo setting (team plan) |
| `resting_hr_change_flag` | flag if ≥ 15 % above reference | demo setting |
| `exercise_hr_zone` | 122–148 bpm (70–85 % of 220 − 46) | NASA-sourced (NTRS 20090013286, 20070023931) |
| `hr_validity_window` | reading older than 2 min = not current | demo setting |
| `exercise_hr_above_zone` | uses `exercise_hr_zone.zone_bpm[1]` | demo setting |

Each number lives in **one place only**. Change it here, not in code.

### 2.4 Reference: the astronaut's personal normal (comparison data)
Calculated from resting measurements. Example (inside `rules/resting_assessment_day140.json`):

```json
{"window_days": [1, 14], "method": "median", "n_used": 13, "value": 62.0, "unit": "bpm"}
```

The reference window is **fixed**, so new abnormal values never shift the "normal" automatically.

### 2.5 Assessment: the engine's result
Files: `scenarios/*_expected.json` (handoff assessment), `rules/resting_assessment_day140.json` (morning resting check)

Handoff assessment fields, in the order of the handoff card:

| Section | Fields |
|---|---|
| Header | `crew_id`, `mission_day`, `evaluated_at`, `rule_version` |
| 1. What was reported | `symptom_status` (`open` · `none_open`), `open_symptoms` |
| 2. What devices know | `current_hr.status` (`current` · `unknown`), `current_hr.last_reliable` (or `null`), `sensor` (`connected` · `disconnected` · `no_data`) |
| 3. What is unknown | `unknowns` (e.g. `current heart rate`, `post-exercise blood pressure`) |
| 4. What has been done | `actions_taken`, `assistance` (always `available`), `handoff.status` (`not_needed` · `pending` · `acknowledged`), `handoff.by`, `handoff.at` |
| Traceability | `reasons`, `contributing_ids`, `labels` |

Resting assessment: `status` (`normal_for_you` · `flagged` · `unknown`), `reference`, `today`, `change_percent`, `reason`.

## 3. Scenarios (day 140, evaluated 14:09–14:11)

| | Story | Handoff | Key result |
|---|---|---|---|
| A | Routine exercise + recovery | not_needed | HR current |
| B | Sensor drops, feels fine | not_needed | HR unknown, sensor disconnected |
| C | Dizziness after exercise + sensor gap | pending | symptom open, BP unknown |
| D | Assistance requested, no HR data | pending | sensor no_data, last_reliable null |
| E | C + CM-3 takes over | acknowledged | symptom **still open** |
| F | D + CM-3 takes over | acknowledged | sensor no_data |

## 4. Conventions
- **Times:** ISO 8601 in UTC (`…Z`). Fictional mission day 140 = 2027-07-18.
- **Record IDs:** unique per dataset; the prefix shows the origin and has no meaning for code:
  `HR-140-` (C/E) · `A-EX1-`, `A-REC-` (A) · `B-EX1-`… (B) · `REST-` (resting history).
- **Missing ≠ normal:** no data gives `unknown` / `no_data`, never a healthy-looking value.
- **Rule version:** `0.1-demo`. Logic lives in the notebook (`assess()`, `assess_resting()`) and will be ported to JavaScript (`engine.js`).

## 5. How to use these files

| Who | Use |
|---|---|
| Frontend | Charts from `*_hr.csv` (show the gap after `sensor_disconnected`); timeline from `*_events.json`; handoff card from `*_expected.json`; trend chart from `history/`; zone shading and labels from `thresholds.json`; scenario picker A–F |
| Database (Supabase / local) | One table per object: `measurements`, `events`, `thresholds`, `references`, `assessments`. Load the files as seed data |
| Testing | Load a scenario in the app and compare what's shown with `*_expected.json` (the answer key) |
| Slides / project page | Data provenance: synthetic values; exercise zone from NASA ISS prescription; all other thresholds are demo settings |
