# CycleIQ — Feature Implementation Checklist

**Product:** CycleIQ — Period & Symptom Tracker  
**Version:** 2.0  
**Last Updated:** March 21, 2026  
**Storage:** All data stored locally on device (no account, no server, no sync)  
**Status Key:** `[ ]` Not started · `[~]` In progress · `[x]` Complete

---

## 1. Onboarding

- [x] Condition selection screen (PCOS / endo / irregular / standard)
- [x] Cycle history input (average length, last period date)
- [x] Privacy & data consent screen
- [x] Notification permission request
- [x] Post-pill mode option ("I recently came off hormonal contraception")
- [x] Age declaration (teen mode trigger for under 18)
- [x] Gender / language preference selection

---

## 2. Period & Cycle Tracking

- [x] Log period start (one-tap from home screen)
- [x] Log period end
- [x] Log flow intensity per day (none / spotting / light / medium / heavy / very heavy)
- [x] Log clots toggle + size chips (shown during active period)
- [x] Edit existing cycle (start date, end date, notes)
- [x] Delete cycle with confirmation dialog
- [x] Compute cycle length (start-to-start)
- [x] Compute period length (end minus start + 1)
- [x] Cycle history list (all past cycles with lengths and period lengths)
- [x] Cycle detail view (day-by-day symptom summary for that cycle)
- [x] Calendar view — shaded period day ranges
- [x] Calendar view — cycle phase labels (menstrual / follicular / ovulatory / luteal)
- [x] Calendar view — pain score heat-map overlay
- [x] Calendar view — predicted period window with confidence fade
- [x] Flare active indicator on calendar days (endo users)

---

## 3. Daily Symptom & Pain Logging

- [x] Quick-entry log screen (loads on app open)
- [x] Auto-fill yesterday's defaults (opt-in setting)
- [x] Pain score slider (0–10)
- [x] Pain location multi-select chips (pelvic, lower back, head, legs, neck, chest, other)
- [x] Pain type multi-select chips (cramping, stabbing, aching, burning, pressure, throbbing)
- [x] Mood score selector (5-face UI, 1–5)
- [x] Mood tags multi-select (anxious, irritable, low, hopeful, stable, overwhelmed, calm, tearful, dissociated, angry)
- [x] Brain fog score slider (0–10)
- [x] Energy score slider (0–10)
- [x] Stress score selector (1–5)
- [x] Bloating scale (none / mild / moderate / severe)
- [x] Nausea toggle
- [x] Headache toggle
- [x] Fatigue score slider (0–10, distinct from energy score)
- [x] Spotting toggle
- [x] Flow intensity (shown during active period only)
- [x] Clots toggle (shown during active period only)
- [x] Sleep hours input (slider 0–12, 0.5hr steps)
- [x] Sleep quality rating (1–5 stars)
- [x] Exercise type (free text + preset chips: walking, yoga, running, cycling, strength, none)
- [x] Exercise duration (stepper in 5-minute increments)
- [x] Diet notes (free text, stored locally encrypted)
- [x] Medication log (structured + free text, stored locally encrypted)
- [x] Save entry to local SQLite (SQLCipher) immediately on "Done"
- [x] Entry visible in history immediately after save

---

## 4. Mental Health & Cognitive Tracking

- [x] Cycle-phase mood overlay on Insights screen
- [x] Cycle-phase energy overlay on Insights screen
- [x] Cycle-phase brain fog overlay on Insights screen
- [x] "Building your pattern — keep logging" placeholder for users with fewer than 3 confirmed cycles
- [x] Safeguarding threshold: detect mood_score = 1 for 3+ consecutive days
- [x] Safeguarding prompt UI (dismissable, non-clinical, signposting only)
- [x] Safeguarding prompt cooldown (no repeat within 14 days)
- [x] Mental health resource list screen (crisis lines, therapy directories)
- [x] Resources list localised by user region

---

## 5. PCOS Condition Flow

- [x] PCOS onboarding setup (diagnosis status, cycle pattern type, known comorbidities, current management)
- [x] Extended symptom palette: acne/skin severity (0–3) + location chips (face, back, chest)
- [x] Extended symptom palette: hair thinning toggle + optional severity note
- [x] Extended symptom palette: hirsutism toggle
- [x] Extended symptom palette: weight change direction chip (gaining / losing / stable) + note
- [x] Extended symptom palette: craving/hunger intensity (0–3) + type chips (sugar, carbs, salty, general)
- [x] Extended symptom palette: pelvic pressure toggle + pain score
- [x] Extended symptom palette: sleep disruption toggle + type chips
- [x] Extended symptom palette: anxiety spike toggle (distinct from mood tags)
- [x] PCOS fields shown only when condition = pcos
- [x] Condition switch activates extended fields within the same session
- [x] PCOS correlation pairs: sleep hours vs acne severity
- [x] PCOS correlation pairs: stress score vs acne severity
- [x] PCOS correlation pairs: stress score vs cycle length
- [x] PCOS correlation pairs: craving intensity vs cycle day
- [x] PCOS correlation pairs: sleep hours vs anxiety spike
- [ ] PCOS insights copy template library
- [x] PCOS-specific prediction model: wide prior, no regularity assumption
- [x] 90-day no-period gentle prompt ("It's been a while — is everything okay?")
- [x] 120-day no-period doctor suggestion prompt (care-framed, not alarming)
- [x] PCOS specialist report: cycle irregularity chart with variance statistics
- [x] PCOS specialist report: symptom frequency heatmap by cycle phase
- [x] PCOS specialist report: insulin/metabolic proxy section (cravings, energy crashes, weight trend)
- [x] PCOS specialist report: medication log with symptom overlays

---

## 6. Endometriosis Condition Flow

- [x] Endo onboarding setup (diagnosis + stage, flare frequency, pre-selected pain locations, current management)
- [x] Extended symptom palette: endo flare toggle (one-tap declaration)
- [x] Extended symptom palette: clots toggle + size chips
- [x] Extended symptom palette: bowel symptoms multi-select (constipation, diarrhoea, painful BMs, rectal bleeding, bloating)
- [x] Extended symptom palette: bladder symptoms multi-select (painful urination, frequency, urgency, blood in urine)
- [x] Extended symptom palette: referred/shoulder pain toggle + side (left / right / both)
- [x] Extended symptom palette: dyspareunia toggle (opt-in, shown only after user enables in settings)
- [x] Extended symptom palette: nausea/vomiting toggle + severity
- [x] Flare mode — condensed 3-field log (pain score, nausea, movement ability: normal / limited / bed-bound)
- [x] Flare mode — "Flare active" persistent home screen banner with live duration timer
- [x] Flare start timestamp recorded on cycle entry
- [x] Flare end timestamp and duration computed on exit
- [x] Post-flare reflection prompt ("What helped? What made it worse?" — stored locally encrypted)
- [x] Flare calendar view (all flares with severity, duration, cycle-day position)
- [x] Flare pattern analysis — triggers after 5+ logged flares
- [x] Flare pattern: most common cycle-day of flare onset
- [x] Flare pattern: sleep, stress, dietary correlates with flare severity
- [ ] Predictive flare warning notification (1–2 days ahead, confidence >= 0.7)
- [x] Red-flag prompt: pain score >= 8 for 3+ consecutive days
- [x] Red-flag prompt: bowel + shoulder pain + heavy flow on same day
- [x] Red-flag prompt cooldown (no repeat within 30 days per trigger type)
- [ ] Red-flag prompts logged locally and included in exported report
- [x] Endo specialist report: flare calendar with severity and duration
- [x] Endo specialist report: pain score trajectory (3-month rolling average)
- [x] Endo specialist report: bowel and bladder symptom log
- [x] Endo specialist report: heavy flow and clot log
- [x] Endo specialist report: functional impairment days (limited / bed-bound)
- [x] Endo specialist report: user-authored appointment notes section

---

## 7. Cycle Predictions

- [x] Rule-based engine: rolling median of observed cycle lengths (fallback for <5 cycles)
- [x] "Not enough data" state for users with fewer than 2 cycles
- [x] Single predicted date (basic mode, <5 cycles)
- [x] Gaussian Process Regression (GPR) model computed on-device (5+ cycles)
- [x] GPR features: cycle length history, variance, period length, condition type, symptom burden score, day-of-week, seasonal index
- [x] Confidence range output and display ("likely April 4–18")
- [ ] Confidence range visualised as gradient fade on calendar
- [ ] Model retrained locally after each confirmed cycle (<10KB stored on device)
- [ ] Model evaluation — MAE tracked locally after each confirmed cycle
- [x] Prediction shown on home screen and calendar
- [ ] Prediction updated immediately when a cycle is confirmed or edited
- [x] Perimenopause model: extended cycle variance thresholds (up to 120+ days)
- [x] Post-pill mode: predictions suppressed for first 90 days, replaced with baseline-building message

---

## 8. Lifestyle & Trigger Analysis

- [x] Standard correlation pairs: sleep vs pain, sleep vs mood, exercise vs mood, exercise vs energy, stress vs pain, stress vs bloating, stress vs cycle length, cycle day vs brain fog, cycle day vs energy
- [x] PCOS-specific correlation pairs: sleep vs acne, stress vs acne, cravings vs cycle day
- [x] Endo-specific correlation pairs: sleep vs flare severity, stress vs flare onset
- [x] Minimum thresholds enforced: n >= 20, |r| > 0.3 (Spearman), p < 0.05
- [x] Sample size always displayed on every insight card
- [ ] HealthKit integration (iOS) — read sleep hours and auto-fill (opt-in)
- [ ] HealthKit integration (iOS) — read steps and activity (opt-in)
- [ ] Health Connect integration (Android) — read sleep hours (opt-in)
- [ ] Health Connect integration (Android) — read steps and activity (opt-in)
- [ ] Source tag displayed on auto-filled entries ("from Apple Health")

---

## 9. Symptom Correlation & Smart Coaching

- [x] Weekly correlation computation job (runs locally, triggers after 30+ entries)
- [x] Spearman correlation computation for all applicable pairs
- [x] Filtering by statistical thresholds (n, |r|, p-value)
- [x] Ranking by |r| descending — strongest correlations shown first
- [x] Condition-specific insight copy template engine
- [x] Correlations stored locally in SQLite with generated_at timestamp
- [x] Insights screen — coaching cards ranked by correlation strength
- [x] "How we calculated this" tooltip on every insight card
- [x] Dismiss insight permanently (per insight, stored locally)
- [x] Dismissed insights excluded from all future computation runs
- [x] Insights older than 90 days re-evaluated and retired if correlation weakened
- [x] Local notification on new strong insight (|r| > 0.5)
- [ ] All insights labelled "Patterns we've noticed" — not medical advice
- [ ] No causal language in any insight copy ("linked to" / "tend to" only — never "causes")
- [ ] Mental health correlation disclaimer copy on relevant insight cards

---

## 10. Evidence-Based Pain Management

- [x] Pain management content section in education hub
- [x] Content categories: heat therapy, anti-inflammatory diet, movement and rest, medication timing, complementary approaches, when to seek urgent care
- [x] Personalisation: PCOS users see metabolic and hormonal content first
- [x] Personalisation: endo users see inflammatory and nerve-pain content first
- [x] Contextual surfacing: heat therapy card on home screen during active period with cramping logged
- [x] Medication timing guidance suppressed if user already logged medication today
- [x] Evidence grade label on every suggestion (RCT-supported / limited evidence / anecdotal)
- [x] Content bundled with app (fully offline, updated via app releases)
- [ ] Content versioned with review date displayed on each article
- [ ] 24-month content review flag system
- [ ] No affiliate links, supplement recommendations, or product endorsements permitted

---

## 11. Medical & Diagnostic Tools

- [x] Report generation runs fully on-device (no network call required)
- [x] PDF rendering using on-device library (e.g. react-native-html-to-pdf)
- [x] Standard report: cover page (date range, generated date)
- [x] Standard report: cycle history table (lengths, period lengths, regularity score)
- [x] Standard report: symptom frequency heatmap by cycle day
- [x] Standard report: pain score timeline chart
- [x] Standard report: mood and energy trends with cycle-phase overlay
- [x] Standard report: medication log timeline
- [x] Standard report: user-authored notes section
- [x] PCOS report additions (cycle irregularity chart, symptom heatmap, insulin proxy section, medication log)
- [x] Endo report additions (flare calendar, pain trajectory, bowel/bladder log, functional impact days)
- [x] Generated PDF saved to device local storage
- [x] Report share sheet (share to email, print, Files app / local downloads)
- [ ] Report list screen showing locally saved reports
- [ ] Appointment prep tool — structured questionnaire auto-populated from local logs
- [ ] Appointment prep one-page PDF export saved locally

---

## 12. Support & Education Hub

- [x] Article library screen with category filter
- [x] Categories: cycle basics, PCOS, endometriosis, pain management, mental health, perimenopause, when to see a doctor, navigating healthcare
- [x] Article detail screen with source citations
- [x] All content bundled with app (available fully offline)
- [x] Content personalised by condition type (on-device filter)
- [x] Search across article titles and tags
- [x] Content versioned with review date visible on each article

---

## 13. Notifications & Engagement

- [x] Period prediction reminder (2 days before predicted start)
- [x] Daily log reminder (user-configured time, default 8 PM local)
- [x] Insight available notification (on new strong correlation computed locally)
- [x] Ovulation window notification (24h before predicted ovulation)
- [x] Flare pattern warning notification (1–2 days before predicted flare — endo users)
- [x] Mood alert — in-app only, not push (triggered by safeguarding threshold)
- [x] Notification preferences screen (per-type enable/disable)
- [x] Quiet hours configuration (default 10 PM – 8 AM)
- [x] All notification preferences stored locally

---

## 14. Inclusivity & Specialised Life Stages

- [x] Language preset selector: Default / Gender-neutral / Custom
- [x] Gender-neutral preset replaces gendered terms throughout all in-app copy
- [x] Custom terminology: user sets preferred terms for cycle, flow, and body references
- [x] All in-app copy uses dynamic terminology tokens (not hardcoded strings)
- [x] Perimenopause mode: extended variability thresholds (120+ day cycles not flagged)
- [x] Perimenopause tracking fields: hot flashes (frequency, severity, time of day)
- [x] Perimenopause tracking fields: night sweats toggle
- [x] Perimenopause tracking fields: vaginal changes toggle
- [x] Perimenopause tracking fields: cognitive symptoms (memory, concentration)
- [x] Perimenopause-tailored prediction model (wide prior, computed on-device)
- [x] Perimenopause education content bundled with app
- [x] Post-pill mode: predictions suppressed for 90 days
- [x] Post-pill mode: baseline-building progress bar
- [x] Post-pill education content (hormonal rebalancing timelines)
- [x] Teen mode: simplified UI and reduced field set
- [x] Teen mode: age-appropriate education content only
- [x] Teen mode: no fertility-related features or content shown
- [ ] Teen mode: parental consent flow (US COPPA and EU GDPR-K compliant)

---

## 15. Home Screen & Navigation

- [x] Home screen — today's cycle day and phase label
- [x] Home screen — period active banner with flow logging shortcut
- [x] Home screen — next predicted period window
- [x] Home screen — quick-log button (opens symptom entry)
- [x] Home screen — latest insight teaser
- [x] Home screen — contextual pain management card (during active period with cramping)
- [x] Home screen — flare active banner with timer (endo users in flare)
- [x] Bottom navigation: Home / Calendar / Log / Insights / Settings
- [x] Calendar tab — month view with cycle shading, phase labels, pain heat-map
- [x] Insights tab — coaching cards, trend charts, cycle-phase overlays
- [x] History tab — cycle list and entry log
- [x] Settings tab — condition, language, notifications, data & privacy

---

## 16. Monetisation & In-App Purchases

- [ ] Free tier feature gating (symptom fields, prediction type, insights)
- [ ] Care tier: $7.99/month or $59.99/year
- [ ] Clinical tier: $15.99/month or $119.99/year
- [ ] Apple App Store in-app purchase (StoreKit 2)
- [ ] Google Play Billing integration
- [ ] Purchase receipt validation on-device
- [ ] In-app upgrade flow: max 3 screens from prompt to payment confirmation
- [ ] 14-day free trial of Care tier (no credit card, shown at day 7 post-install)
- [ ] Insight upgrade prompt — shown after 30+ entries when insights first become available
- [ ] Prediction upgrade prompt — shown when cycle variance > 5 days
- [ ] Condition mode upgrade prompt — shown to PCOS/endo users on free tier
- [ ] Annual plan savings prompt (shown to monthly subscribers at 3-month mark)
- [ ] Subscription management screen (upgrade, downgrade, cancel via App Store / Play Store)
- [ ] Graceful downgrade — data retained locally, features locked on tier drop

---

## 17. Privacy & Data Security

- [ ] SQLCipher encryption for all local SQLite data on device
- [ ] AES-256-GCM encryption for sensitive free-text fields (diet notes, medication logs, notes)
- [ ] Encryption key stored in device secure enclave / Keychain — never leaves device
- [ ] Plain-language privacy policy accessible in-app
- [ ] No data ever leaves the device without explicit user action (e.g. sharing a report)
- [ ] Data export: full local data export as JSON or CSV (saved to device or shared via share sheet)
- [ ] Data wipe: one-tap "Delete all my data" — removes all local SQLite data and files
- [ ] Data wipe: confirmation dialog before irreversible deletion
- [ ] No analytics SDKs that transmit personal or health data off-device
- [ ] No third-party crash reporting SDKs that include health data in payloads
- [ ] FDA regulatory counsel review — SaMD classification risk assessment
- [ ] Teen mode parental consent — US COPPA and EU GDPR-K compliance review

---

## 18. Local Data Architecture

- [x] Local SQLite database (SQLCipher) as sole data store
- [ ] cycles table — local schema with all fields
- [ ] symptom_entries table — all core and condition-specific fields, indexed on logged_date DESC
- [ ] cycle_predictions table — predicted dates, confidence, model version
- [ ] user_correlations table — locally computed correlations with generated_at
- [ ] app_settings table — condition, language, notification prefs, tier, dismissed insights
- [ ] All data read and written from local SQLite only — no network calls for core features
- [ ] Database migration framework for app update schema changes
- [ ] Local backup: export full encrypted database to file on demand (via share sheet)
- [ ] Local restore: import from previously exported backup file

---

## 19. Mobile Client Architecture

- [ ] React Native (Expo managed workflow) — iOS and Android single codebase
- [ ] Zustand state management (condition, today's entry, cycles, insights, UI state)
- [ ] SQLite local repository layer via expo-sqlite + SQLCipher
- [ ] On-device GPR prediction model (compiled to WASM or TFLite)
- [ ] On-device correlation engine (runs as background JS task)
- [ ] Local push notifications via Expo Notifications (no server required)
- [ ] Native biometric auth module (FaceID / TouchID / Fingerprint) for app lock
- [ ] HealthKit integration (iOS) — read-only, opt-in
- [ ] Health Connect integration (Android) — read-only, opt-in
- [ ] iOS 16+ compatibility
- [ ] Android 10+ compatibility
- [ ] iOS App Store submission and listing
- [ ] Android Play Store submission and listing

---

## 20. Quality Assurance

- [ ] Unit tests: all correlation computation logic
- [ ] Unit tests: cycle length and period length computation
- [ ] Unit tests: GPR prediction accuracy against held-out cycle data
- [ ] Unit tests: safeguarding threshold detection (3 consecutive mood = 1)
- [ ] Unit tests: red-flag prompt trigger logic
- [ ] Unit tests: SQLite migration scripts (each version upgrade)
- [ ] Integration tests: full symptom log → correlation computation → insight display flow
- [ ] Integration tests: period start → prediction update flow
- [ ] Integration tests: flare start → flare end → flare pattern analysis
- [ ] Integration tests: local backup export → restore
- [ ] Performance test: calendar render with 12 months of dense symptom data
- [ ] Performance test: on-device GPR model retraining time (<2 seconds target)
- [ ] Performance test: correlation computation on 90 days of entries (<3 seconds target)
- [ ] Accessibility audit (WCAG 2.1 AA) before launch
- [ ] User research sessions with PCOS community members
- [ ] User research sessions with endometriosis community members

---

_Last updated: March 21, 2026 — v2.0 (no-account, fully local on-device architecture)_
