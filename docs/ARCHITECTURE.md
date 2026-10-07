# Architecture

CycleIQ is a local-only Expo app: every screen, calculation and byte of health data lives on the device. This document explains how the pieces fit together.

```
┌──────────────────────────────────────────────────────────────┐
│  Screens — Expo Router (app/)                                │
│  onboarding/ · (tabs)/ Home Log Calendar Insights You        │
│  cycle/[id] · report · reports · appointment-prep · privacy  │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
┌───────────────▼───────────────┐ ┌────────────▼───────────────┐
│ App state — store/ (Zustand)  │ │ Logic — utils/             │
│ mode, tone, active period,    │ │ predictions · statistics   │
│ flare, prefs, app lock        │ │ safetyRules · notifications│
│ persisted AES-256-GCM         │ │ reports · health/ bridges  │
└───────────────┬───────────────┘ └────────────┬───────────────┘
                │                              │
┌───────────────▼──────────────────────────────▼───────────────┐
│ Data — database/ (the only health-data store)                │
│ connection → schema/migrations → cycles · symptoms ·         │
│ predictionStore · insights · phases · redFlags · privacy     │
│ expo-sqlite + SQLCipher (device) · sql.js in memory (web)    │
└──────────────────────────────────────────────────────────────┘
```

## Boot sequence

`app/_layout.tsx`:

1. `initDb()` opens the database and creates or migrates tables. If it fails, a retry screen is shown (never a silent hang).
2. The Zustand store rehydrates from encrypted storage (`waitForStoreHydration`).
3. Routing: not onboarded → `/onboarding/goal`, otherwise the tabs.
4. Notifications are re-synced with the OS permission on launch and every foreground.
5. `AppLockGate` asks for biometrics/passcode if app lock is on (60-second grace when switching apps).

## Data model

| Table | Holds |
|---|---|
| `cycles` | One row per period start: `start_date`, `end_date` (period end), `period_length`, `cycle_length` (gap to the next start; `NULL` for the current cycle), `is_confirmed` (0 = the estimate made from onboarding answers), `notes_encrypted` |
| `symptom_entries` | One row per log: scores, tags, flow, sleep, exercise, health-import sources, `extended_symptoms` JSON for condition-specific fields, encrypted free text. `cycle_id` = the cycle whose dates contain the log's local day |
| `cycle_predictions` | Audit trail of predictions shown (de-duplicated by a fingerprint of the cycles) |
| `prediction_feedback` | Actual vs. predicted start for each completed cycle, used for bias correction |
| `user_correlations` | Insights found, so they can be retired after 90 days |
| `red_flag_prompt_logs` | Safety prompts shown, included in doctor reports |
| `app_settings` | Mirror of key settings (mode, condition answers) |
| `schema_migrations` | Applied migration ids |

### Invariants

Every cycle write calls `recomputeCycleLengths`, which keeps three things true:

- Each completed cycle's length is the gap to the next start. The latest cycle has no length.
- Every symptom entry belongs to the cycle its **local** day falls in.
- Deleting a period keeps the logs; they move to the previous cycle.

Migrations in `database/schema.ts` are forward-only and recorded in `schema_migrations`. Restoring a backup re-runs them, so old backups are upgraded too.

## Predictions & insights

- **Predictions** are recomputed from `cycles` on every read (`utils/predictionInvalidation.ts`), so the UI can't show a stale date. The engine is pure (`utils/predictions.ts`) and fully described in [PREDICTION_ENGINE.md](PREDICTION_ENGINE.md).
- **Insights** (`database/insights.ts`) use Spearman correlations over the last 90 logs. A pair needs at least 20 days where both were logged, survives Benjamini–Hochberg correction at FDR 10%, and has |ρ| > 0.3. Unlogged values are never treated as zero.
- **Phases** (`database/phaseMath.ts`): menstrual is days 1–5; ovulation is 14 days before the next period; follicular and luteal fill the rest. Calendar, Insights and reports share this one implementation.

## Privacy design

| Layer | Protection |
|---|---|
| Database file | SQLCipher, random 256-bit key generated on first launch, stored in Keychain / Keystore (`utils/secureKey.ts`). A plaintext database from older versions is migrated with `sqlcipher_export` |
| Free text | AES-256-GCM with a fresh IV per value, `enc:v1:` prefix (`utils/fieldEncryption.ts`) |
| App state | Zustand persisted via `utils/encryptedPersistStorage.ts` (AES-256-GCM) |
| Lock screen | Discreet notifications replace every title/body with a neutral reminder |
| App switcher | App lock covers the screen while the app is in the background |
| Deletion | `wipeLocalDataAndFiles` removes the database rows, saved reports, scheduled notifications and persisted state |

There is no networking code for user data. Apple Health / Health Connect are read-only and opt-in.

## Platforms

| Target | Database | Notes |
|---|---|---|
| iOS / Android dev or store build | SQLCipher-encrypted file | Full feature set |
| Expo Go | Plaintext file | No SQLCipher or health import; Profile states this |
| Web preview | sql.js, in memory | `database/connection.web.ts`; for development and screenshots. `npm run web:demo` adds sample data from `database/demoData.ts` |

Metro picks `connection.web.ts` on web through platform extensions, so every other database module is shared.

## Copy & tone

User-facing text is written twice: `tx(chill, classic)` (`utils/tone.ts`). Shared labels and option lists are in `constants/copy.ts`. Option *values* are stored data and never change with tone.

## Testing layers

| Layer | Tool | Where |
|---|---|---|
| Engine & statistics | tsx + node:assert | `tests/run-tests.ts` |
| Prediction accuracy gate | Walk-forward backtest vs. baselines | `tests/backtest.ts` |
| Database | Real modules on better-sqlite3 behind an expo-sqlite stand-in | `tests/database.test.ts`, `tests/support/` |
| Screens | Jest + React Native Testing Library, incl. automatic accessibility-label check | `tests/ui/` |
| End-to-end | Maestro | `.maestro/` |
| CI | GitHub Actions: typecheck, lint, all tests, expo-doctor, bundle export | `.github/workflows/ci.yml` |
