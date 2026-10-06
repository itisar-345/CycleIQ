# App Store & Play Store Submission Pack

Everything needed to submit, except what only the account owner can do (marked **owner**).

## 1. Before the first build (owner)

- [ ] Choose permanent identifiers and add them to `app.json`:
      `ios.bundleIdentifier` (e.g. `com.<company>.cycleiq`) and `android.package`. **These can't be changed after release.**
- [ ] Apple Developer Program and Google Play Console accounts.
- [ ] `eas login` → `eas build:configure` (links the project; `eas.json` is already set up with `development`, `qa`, `production` profiles).
- [ ] Host the privacy policy at a public URL (Apple requires it for HealthKit apps). The in-app text is in `app/privacy.tsx`.
- [ ] Clinical sign-off (`docs/CLINICAL_REVIEW.md`) and counsel review (`docs/REGULATORY_BRIEF.md`) completed.
- [ ] Device test plan (`docs/QA_DEVICE_TEST_PLAN.md`) and accessibility audit (`docs/ACCESSIBILITY_AUDIT.md`) signed off.

## 2. Build & submit

```bash
eas build --profile production --platform all
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

## 3. Privacy disclosures

**Apple App Privacy ("nutrition label"):** *Data Not Collected* — the app stores data only on the device and has no server, analytics or ads. (Health data read from HealthKit is used on-device only.)

**Google Play Data safety:** No data collected; no data shared. Data is encrypted (on device). Users can request deletion (in-app "delete all my data").

**HealthKit / Health Connect justification (review notes):**
"CycleIQ reads sleep, steps and exercise minutes, only after the user opts in, to pre-fill their daily symptom log on the device. Nothing is written to Health, nothing leaves the device, and the data is not used for advertising."

**Health Connect declaration (Play):** read access to SleepSession, Steps, ExerciseSession; purpose: pre-filling the user's on-device symptom log.

## 4. Listing copy (draft — confirm with counsel before use)

**Name:** CycleIQ — Period & Symptom Tracker
**Subtitle (iOS, 30 chars):** Private cycle & symptom tracker

**Short description (Play, 80 chars):**
Private period, PCOS & endo tracker. Your data never leaves your phone.

**Description:**
> Track your cycle your way — privately.
>
> CycleIQ keeps everything on your phone. No account, no cloud, no trackers.
>
> • Period predictions that learn your rhythm — with an honest window and confidence
> • 30-second daily log: mood, pain, energy, sleep, stress
> • Modes for PCOS, PCOD, endometriosis and perimenopause
> • Personal patterns, like how sleep affects your pain
> • Doctor-ready PDF reports and appointment prep
> • App lock, discreet notifications, encrypted storage
> • Pick your vibe: casual or classic wording
>
> CycleIQ is not a medical device and does not provide medical advice. Predictions are estimates and must not be used for contraception.

**Keywords (iOS):** period,cycle,pcos,endometriosis,ovulation,symptom,tracker,private,pms,perimenopause
**Category:** Health & Fitness (iOS) · Health & Fitness (Play)
**Age rating:** answer the questionnaire honestly — medical/treatment information: yes (infrequent/mild). Revisit after the teen-mode review.

## 5. Screenshots (owner)

6.7" and 5.5" iPhone, plus Android phone. Suggested set: Home prediction · Daily log · Calendar · Insights · Privacy/app lock · Doctor report. Use demo data only.

## 6. Review notes for Apple / Google

"No login required. To see predictions immediately, complete onboarding with any dates. Health import is optional and appears under You → sync your Health app. App lock can be tested under You → your privacy."
