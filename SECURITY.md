# Security & Privacy Policy

CycleIQ stores menstrual and reproductive health data. We treat any way that data could leak, whether to another app, another person or the network, as a security vulnerability.

## Supported versions

Only the latest release on `main` receives security fixes.

## Reporting a vulnerability

**Please don't open a public issue.** Instead use GitHub's private reporting:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the problem, how to reproduce it, and what data could be exposed.

Please **don't include real health data** in your report; sample data is enough.

We aim to acknowledge reports within 7 days and to agree a fix and disclosure timeline with you. We're happy to credit you in the release notes if you'd like.

## What counts

Examples we especially want to hear about:

- Health data leaving the device without the user's explicit action (export or share)
- Data readable without the encryption key (database, encrypted notes, persisted app state)
- Weaknesses in key generation or storage (`utils/secureKey.ts`, `utils/fieldEncryption.ts`)
- App lock bypasses (`components/app-lock.tsx`)
- Health details shown on the lock screen while discreet notifications are on
- "Delete all my data" leaving anything behind
- Dependencies that phone home or add tracking

## Our privacy design

| Protection | How |
|---|---|
| Database | SQLCipher (AES-256) with a random key in the iOS Keychain / Android Keystore (development and store builds) |
| Free-text fields | Notes, medication logs and reflections are additionally AES-256-GCM encrypted |
| App state | Zustand persistence encrypted with AES-256-GCM |
| Network | No servers, accounts, analytics, ads or crash reporters. Nothing is sent anywhere. |
| Lock screen | Optional discreet notifications; optional biometric / passcode app lock |
| Control | Export (JSON / CSV / PDF) and one-tap delete of everything |

Known limitations:

- **Expo Go** can't use SQLCipher. The database is plaintext there, and Profile says so.
- The **web preview** is unencrypted and in-memory, for development only. It loads sql.js from a CDN.
- Data **you export** is outside CycleIQ's protection once shared.
