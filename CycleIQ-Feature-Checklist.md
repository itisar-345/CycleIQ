# CycleIQ — Feature Implementation Checklist

**Product:** CycleIQ — Period & Symptom Tracker  
**Version:** 2.0  
**Last Updated:** June 2026  
**Storage:** All data stored locally on device (no account, no server, no sync)  
**Status Key:** `[ ]` Not started · `[~]` In progress · `[x]` Complete

---

## 1. Onboarding

- [x] Goal selection screen (track cycle / unpredictable / diagnosed condition)
- [x] Onboarding progress indicator (step bar on all onboarding screens)
- [x] Condition selection screen (PCOS / PCOD / endo)
- [x] Cycle history input (average length, last period date)
- [x] Privacy & data consent screen with first-prediction preview (confidence bar + mode-specific qualifier)
- [x] Seed initial cycle data to SQLite on onboarding complete (`seedInitialCycleFromOnboarding`)
- [x] Set active period automatically if last period was within 7 days of onboarding
- [x] PCOS / PCOD / Endo condition setup forms (diagnosis, pattern, management)
- [x] Notification permission request (contextual, post first period log)
- [x] Post-pill mode option ("I recently came off hormonal contraception")
- [x] Age declaration (teen mode trigger for under 18)
- [x] Gender / language preference selection (deferred to Profile after setup)

---

## 2. Period & Cycle Tracking

- [x] Log period start (one-tap from home screen)
- [x] Log period end
- [x] Log flow intensity per day (none / spotting / light / medium / heavy / very heavy)
- [x] Log clots toggle + size chips (shown during active period)
- [x] Edit existing cycle (start date, end date, notes)
- [x] Delete cycle with confirmation dialog
- [x] Delete cycle triggers prediction retrain (invalidates stale engine output)
- [x] Compute cycle length (start-to-start)
- [x] Compute period length (end minus start + 1)
- [x] Cycle history list (all past cycles with lengths and period lengths)
- [x] Cycle history auto-refreshes on tab focus
- [x] Cycle detail view (day-by-day symptom summary for that cycle)
- [x] Calendar view — shaded period day ranges
- [x] Calendar view — cycle phase labels (menstrual / follicular / ovulatory / luteal)
- [x] Calendar view — pain score heat-map overlay
- [x] Calendar view — predicted period window with confidence fade
- [x] Calendar view — month navigation (‹ ›) and "Jump to today"
- [x] Calendar view — tap day for detail panel (pain/mood/energy + log CTA)
- [x] Calendar view — today highlight ring
- [x] Calendar view — pull-to-refresh
- [x] Flare active indicator on calendar days (endo users)

---

## 3. Daily Symptom & Pain Logging

- [x] Quick-entry log screen (Log Hub tab)
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
- [x] Safeguarding threshold constants centralized in `constants/safeguarding.ts`
- [x] Clinical review checklist documented in `docs/CLINICAL_REVIEW.md`
- [ ] **Clinical sign-off required** before public release (`SAFEGUARDING_CLINICAL_REVIEW_REQUIRED = true`)

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
- [x] PCOS insights copy template library (condition-specific correlation pairs implemented)
- [x] PCOS-specific prediction model: wide prior, no regularity assumption
- [x] 90-day no-period gentle prompt ("It's been a while — is everything okay?")
- [x] 120-day no-period doctor suggestion prompt (care-framed, not alarming)
- [x] PCOS specialist report: cycle irregularity chart with variance statistics
- [x] PCOS specialist report: symptom frequency heatmap by cycle phase
- [x] PCOS specialist report: insulin/metabolic proxy section (cravings, energy crashes, weight trend)
- [x] PCOS specialist report: medication log with symptom overlays
- [x] Explicit Home-screen copy explaining wide prediction windows for PCOS (currently shows label + confidence bar only)

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
- [x] Predictive flare warning notification (1–2 days ahead, confidence >= 0.7)
- [x] Red-flag prompt: pain score >= 8 for 3+ consecutive days
- [x] Red-flag prompt: bowel + shoulder pain + heavy flow on same day
- [x] Red-flag prompt cooldown (no repeat within 30 days per trigger type)
- [x] Red-flag prompts logged locally and included in exported report
- [x] Endo specialist report: flare calendar with severity and duration
- [x] Endo specialist report: pain score trajectory (3-month rolling average)
- [x] Endo specialist report: bowel and bladder symptom log
- [x] Endo specialist report: heavy flow and clot log
- [x] Endo specialist report: functional impairment days (limited / bed-bound)
- [x] Endo specialist report: user-authored appointment notes section

---

## 7. Cycle Predictions

- [x] Tiered on-device engine: Tier 1 (<2 cycles) → none; Tier 2 (2–4) Bayesian blend; Tier 3 (5–11) adaptive EW; Tier 4 (12+) full rules + GPR
- [x] "Not enough data" state for users with fewer than 2 cycles
- [x] Single predicted date + confidence window display
- [x] Gaussian Process Regression (GPR) model computed on-device (12+ cycles)
- [x] GPR features: cycle length history, variance, period length, condition type, symptom burden score, day-of-week, seasonal index
- [x] Confidence range output and display ("likely Apr 4 – Apr 18")
- [x] Confidence range visualised as gradient fade on calendar
- [x] Model retrained locally after each confirmed cycle (create / close / edit)
- [x] Model retrained on cycle delete
- [x] Explicit invalidation policy: `recompute-on-read` (`utils/predictionInvalidation.ts`)
- [x] Dirty flag set on all cycle write paths; cleared after successful retrain
- [x] `getCyclePredictions()` documented as always recomputing from live cycles
- [x] Concurrent retrain deduplication (mutex prevents double-write race)
- [x] Prediction save deduplication (skip INSERT when output identical to latest)
- [x] Audit trail bounded to last 30 rows in `cycle_predictions`
- [x] Model evaluation — MAE tracked locally after each confirmed cycle
- [x] Prediction shown on home screen and calendar
- [x] Perimenopause model: extended cycle variance thresholds (up to 120+ days)
- [x] Post-pill mode: predictions suppressed for first 90 days, replaced with baseline-building message
- [x] Explicit UI copy when `widePredictionWindow` is true ("Your cycles vary — this wider window is normal")

---

## 8. Lifestyle & Trigger Analysis

- [x] Standard correlation pairs: sleep vs pain, sleep vs mood, exercise vs mood, exercise vs energy, stress vs pain, stress vs bloating, stress vs cycle length, cycle day vs brain fog, cycle day vs energy
- [x] PCOS-specific correlation pairs: sleep vs acne, stress vs acne, cravings vs cycle day
- [x] Endo-specific correlation pairs: sleep vs flare severity, stress vs flare onset
- [x] Minimum thresholds enforced: n >= 20, |r| > 0.3 (Spearman), p < 0.05
- [x] Sample size always displayed on every insight card
- [x] HealthKit integration (iOS) — read sleep hours and auto-fill (opt-in; JS bridge contract implemented; toggle in Settings → Health Data Import)
- [x] HealthKit integration (iOS) — read steps and activity (opt-in; JS bridge contract implemented; toggle in Settings → Health Data Import)
- [x] Health Connect integration (Android) — read sleep hours (opt-in; JS bridge contract implemented; toggle in Settings → Health Data Import)
- [x] Health Connect integration (Android) — read steps and activity (opt-in; JS bridge contract implemented; toggle in Settings → Health Data Import)
- [x] Source tag displayed on auto-filled entries ("from Apple Health")

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
- [x] All insights labelled "Patterns we've noticed" — not medical advice
- [x] No causal language in any insight copy ("linked to" / "tend to" only — never "causes")
- [x] Mental health correlation disclaimer copy on relevant insight cards

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
- [x] Content versioned with review date displayed on each article
- [x] 24-month content review flag system
- [x] No affiliate links, supplement recommendations, or product endorsements permitted (no such content in bundled articles)

---

## 11. Medical & Diagnostic Tools

- [x] Report generation runs fully on-device (no network call required)
- [x] PDF rendering using on-device library (expo-print)
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
- [x] Report list screen showing locally saved reports
- [x] Appointment prep tool — structured questionnaire auto-populated from local logs
- [x] Appointment prep one-page PDF export saved locally

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
- [x] OS permission check on every cold launch and foreground (`hasNotificationPermission` — never prompts)
- [x] In-app `notificationsEnabled` synced to false when OS permission revoked
- [x] `requestNotificationPermission()` reserved for explicit user actions only

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

---

## 15. Home Screen & Navigation

- [x] Home screen — today's cycle day and phase label
- [x] Home screen — period active banner with flow logging shortcut
- [x] Home screen — next predicted period window (date + confidence bar + window range)
- [x] Home screen — quick-log button and quick-action tiles (Log / Calendar / Insights)
- [x] Home screen — pull-to-refresh
- [x] Home screen — loading state while dashboard data loads
- [x] Home screen — auto-refresh on tab focus
- [x] Home screen — empty state for users with no cycles ("Log my last period")
- [x] Home screen — profile completion banner (deferred onboarding items)
- [x] Home screen — latest insight teaser
- [x] Home screen — contextual pain management card (during active period with cramping)
- [x] Home screen — flare active banner with timer (endo users in flare)
- [x] Home screen — post-pill baseline progress bar
- [x] Bottom navigation: Home / Log Hub / Calendar / Education / History / Insights / Profile (7 tabs)
- [x] Tab bar icons — correct per tab (home, edit, calendar, books, history, chart, person)
- [x] Haptic feedback on tab press (iOS)
- [x] Calendar tab — month view with cycle shading, phase labels, pain heat-map, day detail panel
- [x] Insights tab — coaching cards, trend charts, cycle-phase overlays
- [x] History tab — cycle list and entry log
- [x] Profile tab — condition, language, notifications, data & privacy, exports

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

- [x] SQLCipher encryption for all local SQLite data on device
- [x] AES-256-GCM encryption for sensitive free-text fields (diet notes, medication logs, notes)
- [x] Encryption key stored in device secure enclave / Keychain — never leaves device
- [x] Plain-language privacy policy accessible in-app
- [x] No data ever leaves the device without explicit user action (e.g. sharing a report)
- [x] Data export: full local data export as JSON or CSV (saved to device or shared via share sheet)
- [x] Data wipe: one-tap "Delete all my data" — removes all local SQLite data and files
- [x] Data wipe: confirmation dialog before irreversible deletion
- [x] No analytics SDKs that transmit personal or health data off-device
- [x] No third-party crash reporting SDKs that include health data in payloads
- [x] Boot gate: routing waits for both DB init and Zustand AsyncStorage hydration
- [x] Zustand persist encrypted at rest (AES-256-GCM via `utils/encryptedPersistStorage.ts`)
- [x] Legacy plaintext AsyncStorage blobs migrated to encrypted on next save
- [x] Sensitive prefs mirrored to encrypted SQLite (`pcos_data`, `endo_data`, age, gender, onboarding flag)
- [ ] FDA regulatory counsel review — SaMD classification risk assessment
- [ ] Teen mode parental consent — US COPPA and EU GDPR-K compliance review

---

## 18. Local Data Architecture

- [x] Local SQLite database (SQLCipher) as sole health data store
- [x] cycles table — start/end dates, cycle_length, period_length, notes_encrypted
- [x] symptom_entries table — core fields + extended_symptoms JSON for mode-specific data
- [x] cycle_predictions table — audit trail (predicted dates, confidence, model version); UI reads via recompute-on-read
- [x] user_correlations table — locally computed correlations with generated_at
- [x] prediction_feedback table — actual vs predicted for bias correction
- [x] red_flag_prompt_logs table — red-flag alert history for reports
- [x] app_settings table — condition, language, notification prefs, dismissed insights (partial Zustand mirror)
- [x] schema_migrations table — versioned migration framework (dbSchemaVersion = 3)
- [x] All health data read/written from local SQLite only — no network calls for core features
- [x] Database migration framework for app update schema changes
- [x] Local backup: export full encrypted database to file on demand (via share sheet)
- [x] Local restore: import from previously exported backup file (JSON snapshot + DocumentPicker)
- [x] Web stub guarded: banner comment + one-time `console.warn` in `database/index.web.ts`

---

## 19. Mobile Client Architecture

- [x] React Native (Expo managed workflow) — iOS and Android single codebase
- [x] Expo Router file-based navigation (Stack + Tabs)
- [x] Zustand state management (condition, flare state, notification prefs, onboarding flags)
- [x] Zustand hydration gate before route guard (`waitForStoreHydration`)
- [x] SQLite local repository layer via expo-sqlite (async API, WAL mode, migrations)
- [x] App loading overlay during DB init + store hydration
- [x] Onboarding progress component (shared step bar)
- [x] On-device tiered prediction engine (Bayesian → EW → full rules → GPR)
- [x] On-device correlation engine (Spearman, runs after sufficient entries)
- [x] Local push notifications via Expo Notifications (no server required)
- [x] OS notification permission re-sync on AppState foreground
- [ ] Native biometric auth module (FaceID / TouchID / Fingerprint) for app lock
- [ ] Native HealthKit module (JS bridge contract exists; native module pending)
- [ ] Native Health Connect module (JS bridge contract exists; native module pending)
- [ ] iOS 16+ compatibility verified on device
- [ ] Android 10+ compatibility verified on device
- [ ] iOS App Store submission and listing
- [ ] Android Play Store submission and listing

---

## 20. Quality Assurance

- [ ] Unit tests: all correlation computation logic
- [x] Unit tests: cycle length and period length computation
- [x] Unit tests: GPR prediction accuracy against held-out cycle data
- [x] Unit tests: safeguarding threshold detection (3 consecutive mood = 1)
- [x] Unit tests: red-flag prompt trigger logic
- [ ] Unit tests: prediction retrain on cycle delete
- [ ] Unit tests: prediction save deduplication
- [ ] Unit tests: SQLite migration scripts (each version upgrade)
- [ ] Integration tests: full symptom log → correlation computation → insight display flow
- [ ] Integration tests: onboarding → seedInitialCycleFromOnboarding → Home dashboard flow
- [ ] Integration tests: period start → prediction update flow
- [ ] Integration tests: flare start → flare end → flare pattern analysis
- [ ] Integration tests: local backup export → restore
- [ ] Performance test: calendar render with 12 months of dense symptom data
- [ ] Performance test: on-device GPR model retraining time (<2 seconds target)
- [ ] Performance test: correlation computation on 90 days of entries (<3 seconds target)
- [ ] Accessibility audit (WCAG 2.1 AA) before launch
- [ ] User research sessions with PCOS community members
- [ ] User research sessions with endometriosis community members
- [ ] Clinical review: safeguarding thresholds and resource destinations

---

\_Last updated: June 2026
