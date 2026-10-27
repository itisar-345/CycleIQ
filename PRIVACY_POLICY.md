# CycleIQ Privacy Policy

**Effective date:** 27 October 2026

CycleIQ is a period and symptom tracker. It is built so that your health information stays on your device. This policy explains what the app handles, where it is kept, and your choices. The same information appears in the app under **You → Privacy**.

## Summary

- Everything you log is stored **only on your device**. CycleIQ has no server and no accounts.
- We (the developer) **cannot see, collect or receive** your data.
- There are **no analytics, advertising, tracking or third-party crash reporting** tools in the app.
- Data leaves the app only when **you** choose to share or export it.

## Information the app stores on your device

- **Cycle and symptom logs:** period dates, flow, pain, mood, energy, sleep, activity, food and drink answers, condition-specific symptoms (PCOS, endometriosis, perimenopause), notes and medications you enter.
- **Settings and profile answers:** the tracking mode you choose, age range, onboarding answers, reminder preferences and tone.
- **Derived information:** cycle predictions, patterns, suggestions and the reports you generate.

All of this is kept in a database on your device. The database is encrypted (SQLCipher), and private notes are additionally encrypted with a key held in the device's secure storage (Android Keystore / iOS Keychain).

## Health Connect and Apple Health

If you turn on health import, CycleIQ asks for **read-only** access to:

- **Health Connect (Android):** sleep sessions, steps and exercise sessions.
- **Apple Health (iOS):** sleep, steps and exercise minutes.

This data is used **only to pre-fill your daily log on your device**. It is never transferred off the device, never shared with or sold to anyone, and never used for advertising, credit or insurance decisions, or any purpose other than providing this feature. CycleIQ never writes data to Health Connect or Apple Health. You can revoke access at any time in Health Connect or the Health app, or turn import off in CycleIQ.

CycleIQ's use of information received from Health Connect adheres to the [Health Connect Permissions policy](https://support.google.com/googleplay/android-developer/answer/12991134), including the Limited Use requirements.

## Notifications

Reminders (for example, period predictions and tips) are scheduled **locally on your device**. No push notification service is used, and no data is sent to create them. Discreet mode hides health details from your lock screen.

## When data leaves the app

Only when you choose to:

- **Share a report** (for example, a PDF for your doctor) through your device's share sheet.
- **Export or back up** your data as a file.

Where that file goes is decided by you and the app you share it with; their privacy policies then apply.

## Permissions

| Permission | Why |
|---|---|
| Notifications | To show the reminders you turn on |
| Health Connect: read sleep, steps, exercise | Optional health import (above) |
| Biometric / fingerprint | Optional app lock |
| Internet | Required by the app framework; CycleIQ does not send your data anywhere |

## Children and teenagers

CycleIQ is not directed at children under 13. Teen mode for users aged 13–17 shows age-appropriate content and no supplement or food-tracking content. Because no data is collected, none is collected from minors.

## Data retention and deletion

Your data stays on your device until you delete it. **You → Delete all data** permanently erases everything CycleIQ has stored. Uninstalling the app also removes it. Because we never receive your data, there is nothing for us to delete on our side and no account to close.

## Medical disclaimer

CycleIQ is not a medical device and does not provide medical advice or diagnosis. Predictions are estimates and must not be used for contraception.

## Changes to this policy

Changes will be published at this address with a new effective date and noted in the app's release notes.

## Contact

Questions about this policy: open an issue at [github.com/itisar-345/CycleIQ/issues](https://github.com/itisar-345/CycleIQ/issues). For anything sensitive, use GitHub's private reporting described in [SECURITY.md](SECURITY.md). Please don't include real health data.
