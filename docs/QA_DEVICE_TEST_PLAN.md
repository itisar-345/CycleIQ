# Device Test Plan — iOS 16+ and Android 10+

Covers the checklist items *"iOS 16+ compatibility verified on device"*, *"Android 10+ compatibility verified on device"* and the release smoke test. Automated checks (`npm run check`, CI) must already be green.

## Builds

```bash
npx expo prebuild                      # set ios.bundleIdentifier / android.package first
eas build --profile qa --platform all  # internal QA build (Android APK + iOS ad-hoc)
APP_ID=<bundle id> npm run e2e         # Maestro flows in .maestro/
```

Expo Go **cannot** be used: SQLCipher, app lock, Health import and the date picker need a native build.

## Device matrix (minimum)

| Platform | OS | Device | Notes |
|----------|----|--------|-------|
| iOS | 16.x | iPhone SE (2nd gen) or 8 | Smallest screen, Touch ID |
| iOS | 17/18 (latest) | iPhone with Face ID | |
| Android | 10 | Any 2019–2020 phone | Oldest supported; Health Connect needs the separate app |
| Android | 14/15 (latest) | Pixel | Health Connect built in |

Record OS build, device, app version and tester for every run.

## Test cases

### A. Install & upgrade (data safety)
| # | Steps | Expected |
|---|-------|----------|
| A1 | Fresh install → onboarding → log a day | Works; Profile shows "whole database encrypted" |
| A2 | Install the **previous release**, add 2 periods + 10 logs + notes. Upgrade to this build | All data present; notes readable; Profile shows encrypted (plaintext DB migrated) |
| A3 | A2, then force-quit and relaunch twice | No data loss, no lock-out |
| A4 | Export JSON → Delete all data → Restore JSON | Data back after restart |

### B. Core flows (also automated in Maestro)
| # | Steps | Expected |
|---|-------|----------|
| B1 | Onboarding (each of the 3 paths) | Prediction shown on the last step matches Home |
| B2 | Log a day with mood, pain, exercise "yoga" | Saved; values visible in Calendar day detail |
| B3 | Period start → period end | Day counter, prediction updates |
| B4 | Edit a cycle's dates with the native picker | Picker opens; can't pick future dates or end before start |
| B5 | Switch mode in Profile to PCOS (no setup yet) | Setup screen opens, "Next" returns to Profile |

### C. Privacy & security
| # | Steps | Expected |
|---|-------|----------|
| C1 | Enable app lock | Asks for biometrics once; the current session stays open |
| C2 | Leave app < 1 min, return | No prompt; app-switcher thumbnail shows the lock cover |
| C3 | Leave app > 1 min, return | Prompt appears; Cancel → lock screen with Unlock button |
| C4 | Export / share sheet / restore picker | Not locked out mid-flow |
| C5 | Enable discreet notifications; trigger a reminder | Lock screen shows only "CycleIQ — you've got a reminder" |

### D. Notifications & Health
| # | Steps | Expected |
|---|-------|----------|
| D1 | Allow notifications; set daily reminder time to now + 2 min | Arrives in chosen tone; quiet hours respected |
| D2 | Switch tone chill ↔ classic | Next notifications use the new wording |
| D3 | Enable Apple Health / Health Connect sleep + activity | Permission sheet; Log screen pre-fills with "synced from…" |
| D4 | Deny Health permission | App keeps working; clear message on Android |

### E. Display
| # | Steps | Expected |
|---|-------|----------|
| E1 | Dark mode on every tab | No white cards, all text readable |
| E2 | Largest text size (Dynamic Type / Font size) | Nothing clipped or overlapping on Log, Home, Profile |
| E3 | Reduce Motion on | Home ring doesn't pulse; buttons don't scale |
| E4 | Small screen (iPhone SE) | Tab bar labels fit; no horizontal scrolling |

## Sign-off

| Platform / OS | Device | Build | Tester | Date | Pass (Y/N) | Issues |
|---------------|--------|-------|--------|------|------------|--------|
| | | | | | | |
