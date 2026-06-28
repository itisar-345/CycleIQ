# CycleIQ — Period & Symptom Tracker

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**CycleIQ** is a privacy-first, fully local period and symptom tracker for PCOS, endometriosis, irregular cycles, and standard tracking. All health data stays on-device in encrypted SQLite — no accounts, servers, or cloud sync.

## ✨ Features (v2.0)

- **Core tracking** — Period start/end, flow/clots, pain, mood, energy, brain fog, lifestyle triggers
- **Condition flows** — PCOS, PCOD, endometriosis, perimenopause, teen, post-pill modes with tailored log fields
- **Predictions** — Tiered on-device engine (Bayesian blend → adaptive EW → full rules → GPR); wide priors for PCOS/peri
- **Insights** — Spearman correlations, cycle-phase overlays, dismissible coaching cards
- **Flare management** — Endo flare timer, reflection prompts, pattern analysis
- **Safeguards** — In-app mood alerts (3+ low days), red-flag prompts (pain 8+ × 3 days)
- **Privacy** — SQLCipher database, AES-256-GCM for sensitive notes, no analytics SDKs
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
| Database | expo-sqlite + SQLCipher PRAGMA key |
| Encryption | AES-256-GCM for diet/medication/notes fields |
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
components/    Shared UI (loading, onboarding progress, icons)
constants/     Theme colors
database/      SQLite layer (+ index.web.ts stub)
store/         Zustand global state
utils/         Predictions, stats, notifications, reports, encryption
data/          Bundled education articles
```

## 🔮 Roadmap

- [ ] Clinical safeguarding sign-off ([docs/CLINICAL_REVIEW.md](docs/CLINICAL_REVIEW.md))
- [ ] IAP tiers (Care / Clinical)
- [ ] Native HealthKit / Health Connect bridge (JS contract exists; native module pending)
- [ ] Biometric app lock
- [ ] App Store / Play Store submission

## 🤝 Contributing

1. Fork and open a PR against `main`
2. Follow [CycleIQ-Feature-Checklist.md](CycleIQ-Feature-Checklist.md) for feature scope
3. Test on **native** targets (`npx expo start --ios` / `--android`) — not web alone
4. Run `npm run lint` before submitting

## 📄 License

MIT — fully open-source.

---

**Built for the 1 in 10 with PCOS/Endo — track privately, understand patterns.**
