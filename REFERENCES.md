# References, NASA Data and AI Disclosure

All crew data in this project is **synthetic**. No real astronaut data is used.
Where a value or feature is based on NASA or space agency material, it is listed below with what it was used for.
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
   **Used for:** the radiation card's statement that NASA limits career exposure to 600 mSv.
   The brief's typical ISS exposure of about 0.5 mSv per day is consistent with the app's synthetic daily baseline (0.45 mSv), which is a demo setting.

## NASA Human Research Program: Guide page

5. NASA HRP. *Five Hazards of Human Spaceflight.* https://www.nasa.gov/hrp/hazards/
   **Used for:** the Guide page's five hazards and which indicators to watch for each.

6. NASA HRP. *Risks of Human Spaceflight.* https://www.nasa.gov/hrp/risks/
   **Used for:** background for choosing indicators (linked from the Guide page).

7. NASA HRP. *Ongoing HRP Research in Space.* https://www.nasa.gov/hrp/ongoing-hrp-research/
   **Used for:** background reading (linked from the Guide page).

## NASA resources: attention task

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
- Claude: the synthetic data and documentation

All AI output was reviewed and tested by the team (`npm run check` 7/7 and `npm test` 31/31 passing).

