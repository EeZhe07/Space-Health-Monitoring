# References, NASA Data and AI Disclosure

All crew data in this project is **synthetic**. No real astronaut data is used.
Where a value is based on NASA or space agency material, it is listed below with what it was used for.
All other values are labelled **demo settings** (see `data/rules/thresholds.json`) and are not clinical guidance.

## NASA resources: heart-rate data and rules

1. Ploutz-Snyder, L. (~2009). *An Evidence-Based Approach to Exercise Prescriptions on ISS.*
   NASA Technical Reports Server (NTRS) 20090013286.
   https://ntrs.nasa.gov/api/citations/20090013286/downloads/20090013286.pdf
   **Used for:** ISS aerobic exercise of 30–40 min at 70–85% of max heart rate, giving the exercise zone of 122–148 bpm.

2. Norcross, J., Bentley, J. R., Hagan, R. D., & Moore, A. D. (2007).
   *Comparison of the U.S. and Russian Cycle Ergometers.* NASA/TP-2007-214760, NTRS 20070023931.
   https://ntrs.nasa.gov/api/citations/20070023931/downloads/20070023931.pdf
   **Used for:** age-predicted max heart rate = 220 − age.

3. English, K. L., et al. (2020). High intensity training during spaceflight:
   results from the NASA Sprint Study. *npj Microgravity* 6, 21.
   https://link.springer.com/article/10.1038/s41526-020-00111-x
   **Used for:** crew age 46 (control-group mean), giving max heart rate 174 bpm.

## NASA resources: radiation

4. NASA Office of the Chief Health & Medical Officer. *NASA-STD-3001 Technical Brief: Design for Ionizing Radiation Protection* (OCHMO-TB-020).
   https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf
   **Used for:** typical ISS exposure of about 0.5 mSv per day, the basis for the radiation card's normal daily dose and the solar-event alert ("about three times a normal day").

5. NASA NTRS 20250006168 (ASCEND paper, Simonsen et al.).
   https://ntrs.nasa.gov/api/citations/20250006168/downloads/ASCEND%20Simonsen%20draft%201.pdf
   **Used for:** ISS effective dose of about 0.2–0.5 mSv/day (supporting range for the radiation baseline).

## NASA Human Research Program: hazards and app design

6. NASA HRP. *Five Hazards of Human Spaceflight.* https://www.nasa.gov/hrp/hazards/
   **Used for:** the Guide page's five hazards and which indicators to watch for each.

7. NASA HRP hazard pages, used for the Guide text and features:
   - Space radiation: https://www.nasa.gov/hrp/radiation/space-radiation-miniseries/
   - Isolation and confinement: https://www.nasa.gov/hrp/hazard-isolation-and-confinement/ (sleep, mood, daily check-in)
   - Distance from Earth: https://www.nasa.gov/hrp/hazard-distance-from-earth/ (crew must assess and act first; comms delay shown in the app)
   - Gravity fields: https://www.nasa.gov/hrp/hazard-gravity-fields/ (fluid shift, heart, blood pressure)
   - Hostile, closed environments: https://www.nasa.gov/hrp/hazard-hostile-closed-environments/ (temperature, immune stress)

8. NASA TechPort project 23201 and the related ISS attention study (see the root README).
   https://techport.nasa.gov/projects/23201
   **Used for:** the optional attention task (exploratory only; not a validated clinical test).

## Other resources

- MedlinePlus: general adult vital-sign reference ranges (root app).
- React Bits (Particles starfield), Uiverse (tab bar layout), Inter font (Google Fonts), lucide icons (`ui/` app).

## AI disclosure

AI tools were used to help write code, documentation and synthetic-data scripts:
- Claude Code: the `ui/` visual app
- OpenAI Codex: the root crew and ground app
- Claude: the synthetic data notebook and documentation

All AI output was reviewed and tested by the team (`npm run check` 7/7 and `npm test` 31/31 passing).
