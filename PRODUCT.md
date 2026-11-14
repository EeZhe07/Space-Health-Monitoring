# Crew Health

One fictional astronaut, Day 140, one shared tablet. Current measurements, their provenance and the crew member's report remain distinct. The main task is to report a concern and let an onboard teammate take over while data or communication is unavailable. Use scenarios A-F already in the repository. The English team plan is the accepted basis for implementation.

Demo setup offers a routine Default app preset and scenarios A–F. Starting/restoring a preset creates a new saved replay, with prior runs retained in History. Browser-local startup settings support resuming the last run or creating a fresh selected preset on each reload. Restore defaults means a new routine run and resume mode; reports and archive authentication are kept.

The home screen prioritizes the next human action. Six common symptoms and optional details keep reporting short; neither symptom onset nor measurement context is assumed. Trends retain gaps and historical readings. Normal-looking readings do not close crew reports. Seven indicators are available, with paired blood pressure combined on Today and assessed using both values.

Ground handoff uses a local-first snapshot queue and authenticated Supabase archive. Receipt means server storage; clinical review remains unconfirmed. Archive access is scoped to one authenticated account. Live episode collaboration and real NASA/device connectivity are future integrations.

Today includes a daily self-check with explicit 1–5 mood and comfortable/uncomfortable choices. Low mood (1–2) or discomfort opens the symptom form after a successful local save. Private daily answers appear as separate context and are not automatically copied into symptom notes. Positive check-ins never clear an open concern. A 20-hour non-blocking reminder uses actual elapsed time or simulated mission elapsed time; existing reports are recomputed on reload offline.

Crew break now offers Signal Watch and the separate optional mood question. The task has three practice signals and 12 recorded signals, with random waits, early-input detection and a two-second response window. Practice/interrupted rounds are not saved. Completed recorded rounds save locally with raw observations. The task uses a same-input personal comparison of three prior usable rounds to flag exploratory attention changes; short rounds and the comparison rules are unvalidated and cannot diagnose mental health or establish fitness for duty. Backgrounding, lost focus or mission-clock changes cancel a round.

Daily self-checks, attention observations and legacy mood entries stay in local History, scoped to a fictional crew/replay. Ground packets exclude these wellbeing records. A user may explicitly describe their concerns in a symptom report as a separate action. NASA research motivates combining task performance with self-reports; this browser task is not the validated NASA Reaction Self Test.
