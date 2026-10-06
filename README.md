# CycleIQ — Period & Symptom Tracker

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**CycleIQ** is a privacy-first, fully local period and symptom tracker for PCOS, endometriosis, irregular cycles, and standard tracking. All health data stays on-device in encrypted SQLite — no accounts, servers, or cloud sync.

## ✨ Features (v2.0)

- **Core tracking** — Period start/end, flow/clots, pain, mood, energy, brain fog, lifestyle triggers
- **Condition flows** — PCOS, PCOD, endometriosis, perimenopause, teen, post-pill modes with tailored log fields
- **Predictions** — Tiered on-device engine (prior blend → adaptive EW → full rules) with backtest-calibrated windows; wide priors for PCOS/PCOD/peri
- **Insights** — Spearman correlations, cycle-phase overlays, dismissible coaching cards
- **Flare management** — Endo flare timer, reflection prompts, pattern analysis
- **Safeguards** — In-app mood alerts (3+ low days), red-flag prompts (pain 8+ × 3 days)
- **Privacy** — SQLCipher database, AES-256-GCM for sensitive notes, app lock (Face ID / fingerprint / passcode), discreet lock-screen notifications, no analytics SDKs
- **Two voices** — "chill" (casual, emoji) or "classic" (plain, calm); chosen at onboarding, switchable in Profile. Strings are written `tx(chill, classic)` (see `utils/tone.ts`, `constants/copy.ts`)
- **Accessibility** — WCAG AA contrast in light & dark, screen-reader labels/roles throughout, 44pt touch targets, respects Reduce Motion
- **Exports** — Doctor-ready PDF reports, appointment prep, JSON/CSV backup

See [CycleIQ-Feature-Checklist.md](CycleIQ-Feature-Checklist.md) for the full spec and open items.

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│  UI (Expo Router)                                       │
│  onboarding/ · (tabs)/ · cycle/[id]/ · report · privacy │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  State — Zustand + encrypted AsyncStorage (AES-256-GCM)   │
│  isOnboarded, mode, flare state, notification prefs       │
│  sensitive fields mirrored → app_settings in SQLite       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Data — expo-sqlite (SQLCipher)                         │
│  cycles · symptom_entries · cycle_predictions · …       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Logic — utils/                                         │
│  predictions · statistics · notifications · reports     │
└─────────────────────────────────────────────────────────┘
```

**Boot sequence:** DB init → Zustand hydration → route guard → notification sync.

**Prediction model:** Recomputed from live `cycles` on every read (`recompute-on-read` policy in `utils/predictionInvalidation.ts`). The `cycle_predictions` table is an audit trail only.

**Privacy:** Zustand prefs encrypted at rest via AES-256-GCM (`utils/encryptedPersistStorage.ts`). Condition profiles also mirrored to encrypted SQLite `app_settings`.

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo 56, React Native 0.75, React 19 |
| Routing | Expo Router (file-based) |
| State | Zustand + AsyncStorage (prefs/flags) |
| Database | expo-sqlite + SQLCipher (`useSQLCipher` build flag; requires a dev/production build, not Expo Go) |
| Encryption | AES-256-GCM (@noble/ciphers) for diet/medication/notes/flare-reflection fields |
| Charts | react-native-chart-kit |
| Dates | date-fns |

### Platform targets

| Platform | Status |
|----------|--------|
| **iOS** | First-class — full SQLite, notifications, secure store |
| **Android** | First-class — full SQLite, notifications, secure store |
| **Web** | Preview only — `database/index.web.ts` is a no-op stub |

> **Web note:** The web build renders UI for demo/preview but does **not** persist health data or run predictions. Do not add flows that assume SQLite on web. Test core features on iOS/Android simulators or devices.

## 🚀 Quick Start

```bash
npm install
npx expo start
```

Press `i` for iOS simulator, `a` for Android, or scan the QR code with Expo Go.

> **Expo Go limits:** SQLCipher encryption and Apple Health / Health Connect import need a
> development build (`npx expo prebuild` + `npx expo run:ios` / `run:android`, or EAS).
> Expo Go runs the app with a plaintext database and no health import, and Settings says so.

### Tests

```bash
npm test          # unit tests, prediction backtest gate, and database tests on real SQLite
npm run test:ui   # screen tests (Jest + React Native Testing Library), incl. accessibility labels
npm run check     # typecheck + lint + all tests — the same gate CI runs
npm run backtest  # prediction accuracy report vs simple baselines
APP_ID=<bundle id> npm run e2e   # Maestro end-to-end flows on a device/simulator build
```

CI (`.github/workflows/ci.yml`) also runs `expo-doctor` and exports iOS/Android bundles. Release QA that needs people — device testing, screen-reader audit, clinical and legal review, store submission, user research — is described in `docs/`.

The database tests run the real `database/` modules against SQLite (better-sqlite3) behind the
expo-sqlite API — see `tests/support/`. The stand-in rejects SQL that device builds of
expo-sqlite don't support (e.g. `UPDATE … LIMIT`).

### Suggested test flow

1. **Onboard** — Goal → cycle history → (condition setup) → consent → lands on Home with seeded cycle data
2. **Home** — Log period start, view prediction card, use quick-action tiles
3. **Log Hub** — Daily symptoms (fields vary by mode)
4. **Calendar** — Month navigation, tap a day for detail panel
5. **Insights** — Coaching cards after enough logged entries
6. **Profile** — Notifications, exports, doctor report PDF

### Inspect local data

Use the Expo SQLite extension or query `symptom_entries.extended_symptoms` for condition-specific JSON blobs.

## 📂 Project structure

```
app/           Screens & routing (Expo Router)
  (tabs)/      Home, Log, Calendar, Education, History, Insights, Profile
  onboarding/  First-run flow
  cycle/[id]/  Cycle detail & edit
components/    Shared UI (loading, onboarding progress, icons, log/ inputs & sections)
constants/     Theme colors
database/      SQLite layer: connection, schema, cycles, symptoms, predictionStore,
               insights, phases, settings, privacy, types (+ index.web.ts stub)
store/         Zustand global state
utils/         Predictions, stats, notifications, reports, encryption,
               health/ (HealthKit + Health Connect bridges)
tests/         Unit, backtest and database tests (support/ = native module stand-ins)
data/          Bundled education articles
```

## 🔮 Roadmap

- [ ] Clinical safeguarding sign-off ([docs/CLINICAL_REVIEW.md](docs/CLINICAL_REVIEW.md))
- [ ] IAP tiers (Care / Clinical)
- [ ] App Store / Play Store submission

## 🤝 Contributing

1. Fork and open a PR against `main`
2. Follow [CycleIQ-Feature-Checklist.md](CycleIQ-Feature-Checklist.md) for feature scope
3. Test on **native** targets (`npx expo start --ios` / `--android`) — not web alone
4. Run `npm test`, `npm run lint` and `npx tsc --noEmit` before submitting

## 📄 License

MIT — fully open-source.

---

**Built for the 1 in 10 with PCOS/Endo — track privately, understand patterns.**
