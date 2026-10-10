# Changelog

All notable changes to CycleIQ are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
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
