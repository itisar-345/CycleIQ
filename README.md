# CycleIQ — Period & Symptom Tracker

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**CycleIQ** is a privacy-first, fully local period and symptom tracker for PCOS, endometriosis, irregular cycles, and standard tracking. All data stored on-device (SQLite encrypted, no servers/accounts/sync).

## ✨ Features (v2.0)

✅ **Core Tracking**: Period log, flow/clots, pain/mood/energy/brain fog, lifestyle triggers.  
✅ **Condition Flows**: Full PCOS/Endo palettes (acne, cravings, flares, bowel/bladder, dyspareunia opt-in).  
✅ **Insights**: Cycle-phase overlays, Spearman correlations (sleep vs pain/acne, stress vs flares).  
✅ **Predictions**: On-device GPR (wide prior for PCOS/peri), confidence ranges.  
✅ **Flare Management**: Endo flare timer, reflection prompts, pattern analysis.  
✅ **Safeguards**: Mood alerts, red-flags (pain 8+ x3, no-period 90/120d).  
✅ **Privacy**: SQLCipher, no analytics/server. Export/share reports as PDF.  
✅ **Onboarding**: Condition setup, post-pill/teen/peri modes.

See [CycleIQ-Feature-Checklist.md](CycleIQ-Feature-Checklist.md) for complete spec (Sec1-6 ✅).

## 🛠 Tech Stack

- **Framework**: Expo Router (React Native, iOS/Android/web).
- **State**: Zustand (persistent).
- **DB**: expo-sqlite (local, indexed, encrypted fields).
- **Styling**: NativeWind/Tailwind.
- **Utils**: date-fns, Spearman on-device.

## 🚀 Quick Start

1. **Install & Run**:

   ```bash
   npm install
   npx expo start
   ```

2. **Test Modes**:
   - Onboard → Select PCOS/Endo.
   - Home → Log period.
   - Log → Symptoms/flare (fields conditional).
   - Calendar/Analytics → Phases/insights.

3. **Data Inspect** (VSCode Expo SQLite ext):
   - Query `symptom_entries` for `extended_symptoms` JSON.

## 📱 Screenshots

_(Add post-dev)_

## 🔮 Roadmap

- IAP tiers (clinical reports).
- HealthKit/Connect integration.
- On-device ML retrain.
- App Store submission.

## 🤝 Contributing

1. Fork & PR.
2. Follow checklist for features.
3. Test local DB (`npx expo start`).

## 📄 License

MIT. Fully open-source.

---

**Built for the 1 in 10 with PCOS/Endo — track privately, understand patterns.**

⭐ Star if helpful!
