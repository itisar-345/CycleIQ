# Changelog

All notable changes to CycleIQ are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Optional **Food & drink** card in the Daily Log (adults): fruit & veg portions, wholegrains / iron / calcium / oily fish / red & processed meat / fried food / sugary drinks, caffeine and alcohol, with no calories or weights. It powers personal food suggestions on Insights, graded and sourced like the activity ones (WHO, WCRF, EFSA, NHS targets; endometriosis, PMS and PCOS links). It also adds a hot-flush trigger check for perimenopause and an iron-food note on the iron warning. The lifestyle notification now rotates daily between suggestions.
- Evidence-based lifestyle suggestions on the Insights tab ("Suggestions for you"), built from your own logs: weekly activity (WHO / PCOS guideline targets), strength training, daily steps (~7,000), sleep, heavy periods and iron (with an iron-check warning when heavy flow and tiredness occur together), period pain, premenstrual low mood, and condition-specific food and treatment facts for PCOS, endometriosis and perimenopause. Each card shows its evidence grade and links to its sources. One suggestion at a time can arrive as a notification (new setting, on by default). Research summary in `docs/EVIDENCE_REVIEW.md`; pending clinical review (`docs/CLINICAL_REVIEW.md` §5).
- Open-source project files: MIT license, contributing guide, code of conduct, security policy, issue and PR templates, Dependabot.
- README screenshots and light/dark tab-tour GIFs, regenerated with `npm run screenshots`.
- Working web preview: the real database code runs on sql.js in memory; `npm run web:demo` adds sample data.
- Architecture and prediction-engine docs; release-QA packs (device test plan, accessibility audit, regulatory brief, store submission, user research guide).
- Tone setting (chill / classic) across the app and notifications; discreet notifications; app lock.
- Native date picker; five-tab layout (Home, Log, Calendar, Insights, You).
- Accessibility pass: screen-reader labels and states, 44 pt targets, WCAG AA colours, Reduce Motion.
- Post-pill mode switch in Profile and a post-pill question in onboarding.
- Jest + React Native Testing Library screen tests with an automatic accessibility check, Maestro flows, GitHub Actions CI, EAS build profiles.

### Changed
- Seven notification tips reworded to match the evidence (Epsom salts, magnesium, turmeric, inositol, spearmint, rosemary oil, "anti-inflammatory" foods).
- Prediction engine v5: the tiered rules are replaced by one Bayesian model (a robust Kalman filter on cycle length with a damped trend, averaged over noise and drift settings). The date, 80% window and confidence now come from one predictive distribution. Lower error than v4 in 6 of 7 backtest profiles, at least 80% window coverage everywhere, PCOS windows about 10 days narrower, and confidence that tracks the real ±2-day hit rate. The CI backtest gate is stricter to match.
- The cycle length reported during onboarding sets the prediction prior instead of counting as a logged cycle.
- "Past predictions were off by" no longer counts cycles the model treats as outliers (mostly missed logs).
- Prediction feedback is still recorded but no longer shifts future dates: backtests showed the shift made predictions worse on top of the new model.
- Cycle writes (start, edit, delete, onboarding seed) and the length / log-ownership upkeep now run in a single transaction.
- Emoji removed from the interface, notifications and insights; Lucide icons now used throughout (tab bar, Log cards, mood faces, onboarding, Home, Profile, Support).
- Symptom logs belong to the whole cycle they fall in, not only period days (migration 5). Phase charts, reports and insights now use every day.
- Deleting a period keeps its logs.
- "Delete all my data" also clears settings, condition answers and scheduled reminders, and returns to setup.
- The cycle estimated from onboarding answers is no longer shown as a logged period.

### Fixed
- Calendar: first day of a finished period not shaded; days shifted in time zones away from UTC; phase colours counted from the oldest cycle; markers clipping the phase letter.
- Tab bar labels clipped on devices without a bottom inset.
- Report cycle days off by one around midnight.
- Database setup failing outside WAL mode; a retry screen replaces the endless spinner when the database can't open.
- Web build crashing on `import.meta`.
- Support screen assuming 911 for unknown regions.
- "Not for contraception" caution now shown with ovulation estimates in both voices.

## Earlier history

- `c79e47c`: Prediction engine v4 (tiered, backtest-calibrated), privacy hardening (SQLCipher, AES-GCM), Apple Health / Health Connect import, UI and copy refresh.
- `0103b22`: Flow, UI/UX, privacy and architecture fixes.
- `b80069e`: Restructured the app flow.
- `c4dc675`: Privacy, data security and local data architecture features.
