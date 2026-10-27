# App Store & Play Store Submission Pack

Everything needed to submit. Items only the account owner can do are marked **owner**.

## 1. Already done in the repo (Android)

| Item | Where |
|---|---|
| Application ID `io.github.itisar345.cycleiq` (**permanent** once uploaded) | `app.json` → `android.package` |
| Target / compile SDK 36 (Play requires recent API levels for new apps and updates) | React Native 0.81 version catalog; `minSdkVersion` 26 for Health Connect |
| Release format: Android App Bundle; version code auto-incremented by EAS | `eas.json` → `production` |
| Unused permissions removed: `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` | `app.json` → `android.blockedPermissions` |
| Android Auto Backup **off**, so the health database is never copied to Google Drive (matches "no data collected") | `app.json` → `android.allowBackup: false` |
| Health Connect privacy-policy link opens the in-app privacy policy (Android 13 intent filter and Android 14+ `ViewPermissionUsageActivity`) | `plugins/withHealthConnectRationale.js` |
| Notification small icon (monochrome) and accent colour | `app.json` → `expo-notifications` plugin |
| Branded launcher, adaptive, monochrome and splash icons | `assets/images/` (regenerate: `npm run icons`) |
| Public privacy policy | [`PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) → URL below |
| Play listing graphics: 512×512 icon, 1024×500 feature graphic, 7 phone screenshots (1080×1920) in light and dark | `docs/store/play/` (regenerate: `npm run store-assets`) |
| `android/` and `ios/` ignored: they're generated from `app.json`, and committing them would make EAS skip the config plugins | `.gitignore` |

Final permissions in the release manifest: `INTERNET`, `VIBRATE`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` (re-arms scheduled reminders after a restart), `USE_BIOMETRIC` / `USE_FINGERPRINT` (app lock), and `health.READ_SLEEP` / `READ_STEPS` / `READ_EXERCISE`.

**Privacy policy URL:** `https://github.com/itisar-345/CycleIQ/blob/main/PRIVACY_POLICY.md` (works once this file is pushed to `main`; the repo must stay public).

## 2. Before the first build (owner)

- [ ] Google Play Console developer account (one-time US$25 fee). Identity verification can take a few days.
- [ ] **New personal accounts:** Google requires a **closed test with at least 12 testers opted in for 14 consecutive days** before you can apply for production access. Plan for this; organisation accounts are exempt.
- [ ] `npm i -g eas-cli` → `eas login` → `eas init` (links the project; adds `extra.eas.projectId` to `app.json`).
- [ ] Push `main` so the privacy policy URL resolves.
- [ ] Clinical sign-off (`docs/CLINICAL_REVIEW.md`, including the supplement tips in `docs/EVIDENCE_REVIEW.md` §6) and counsel review (`docs/REGULATORY_BRIEF.md`).
- [ ] Device test plan (`docs/QA_DEVICE_TEST_PLAN.md`) on a real Android 13 and Android 14+ phone. Include: notification permission prompt, reminders after a reboot, Health Connect connect → tap "privacy policy" in its dialog → CycleIQ's privacy screen opens, app lock, export/share.

## 3. Build & submit (Android)

```bash
eas build --platform android --profile production   # signed .aab; EAS creates and stores the upload key
```

1. **First upload is manual** (Google's API can't create a new app): Play Console → Create app → Testing → Internal testing → Create release → upload the `.aab` from the EAS build page. Accept **Play App Signing** (default).
2. For later releases, automate it: create a Google Cloud service account with Play Console release access, save its key as `play-service-account.json` in the repo root (gitignored), then:

```bash
eas submit --platform android --profile production   # → internal track, as a draft
```

3. Promote internal → closed testing (12+ testers, 14 days) → production.

## 4. Play Console: App content (Policy → App content)

| Declaration | Answer |
|---|---|
| Privacy policy | URL from §1 |
| App access | All functionality available without special access (no login) |
| Ads | No ads |
| Content rating (IARC) | Category: Reference, News or Educational / Health. Answer honestly: no violence, sexual content, gambling or user-generated content; contains **health and medical information**. Expected: Everyone / PEGI 3 or Teen, depending on answers |
| Target audience | **13–15, 16–17, 18+**. Not under 13 (avoids the Families policy). Teen mode serves 13–17 with age-appropriate content |
| News app | No |
| Health apps declaration | Select **Period / menstrual tracking** and **Health & fitness / wellness**. The app is not a medical device; the disclaimer is in the description and in-app |
| Health Connect permissions | Declare read access to **Sleep, Steps, Exercise**. Use case: "pre-fill the user's on-device daily symptom log (sleep, activity) to correlate with cycle symptoms". Confirm data is not shared, sold, or used for ads. Provide a short video if asked: You → sync your Health app → grant → Daily Log pre-filled |
| Data safety | **No data collected, no data shared** (all processing on device; nothing transmitted; Auto Backup disabled). Security practices: data is encrypted; users can delete their data in-app |
| Financial features / government / COVID | None / No / No |

Review notes: "No login required. Complete onboarding with any dates to see predictions. Health import (optional) is under You → sync your Health app. In the Health Connect permission dialog, 'privacy policy' opens CycleIQ's privacy screen. App lock: You → your privacy."

## 5. Store listing (Grow → Store presence → Main store listing)

Draft; confirm health claims with counsel before publishing.

**App name (≤ 30):** CycleIQ: Period & PCOS Tracker
**Short description (≤ 80):** Private period, PCOS & endo tracker. Your data never leaves your phone.

**Full description (≤ 4,000):**
> Track your cycle your way, privately.
>
> CycleIQ keeps everything on your phone. No account, no cloud, no trackers.
>
> • Period predictions that learn your rhythm, with an honest window and confidence
> • 30-second daily log: mood, pain, energy, sleep, stress, food
> • Modes for PCOS, PCOD, endometriosis and perimenopause
> • Personal patterns, like how sleep affects your pain
> • Evidence-graded tips on activity, food and supplements, each with its sources
> • Doctor-ready PDF reports and appointment prep
> • App lock, discreet notifications, encrypted storage
> • Pick your vibe: casual or classic wording
>
> CycleIQ is not a medical device and does not provide medical advice. Predictions are estimates and must not be used for contraception.

**Category:** Health & Fitness · **Tags:** Period tracker, Women's health, Health tracker
**Contact email:** required by Play and shown publicly (**owner**: use a dedicated address).
**Graphics** (`docs/store/play/`): `icon-512.png`, `feature-graphic.png`, and 2–8 phone screenshots. Suggested order: `03-home`, `04-log`, `06-insights`, `05-calendar`, `02-first-prediction`, `07-profile` (light set; dark set as an alternative).

## 6. iOS (later)

- [ ] Choose `ios.bundleIdentifier` (permanent), Apple Developer Program membership.
- [ ] `eas build --platform ios --profile production` → `eas submit --platform ios`.
- **App Privacy label:** Data Not Collected. **HealthKit review note:** "CycleIQ reads sleep, steps and exercise minutes, only after the user opts in, to pre-fill their daily symptom log on the device. Nothing is written to Health, nothing leaves the device, and the data is not used for advertising."
- **Subtitle (30):** Private cycle & symptom tracker · **Keywords:** period,cycle,pcos,endometriosis,ovulation,symptom,tracker,private,pms,perimenopause
- Screenshots: 6.7" and 6.5" iPhone (the 1080×1920 Play set is the wrong size for Apple).
