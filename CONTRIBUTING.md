# Contributing to CycleIQ

Thanks for helping! CycleIQ handles some of the most sensitive data a person has, so a few rules here are stricter than usual. Please read the **Privacy rules** section before writing code.

## Ways to help

- **Report a bug** or **suggest a feature**: [open an issue](https://github.com/itisar-345/CycleIQ/issues/new/choose).
- **Improve the docs**, e.g. setup steps that tripped you up.
- **Pick up an issue** labelled `good first issue` or `help wanted`.
- **Share lived experience.** If you live with PCOS, endometriosis or irregular cycles, feedback on questions and wording is valuable. See [docs/USER_RESEARCH_GUIDE.md](docs/USER_RESEARCH_GUIDE.md).

Found a security or privacy problem? **Don't open a public issue.** Follow [SECURITY.md](SECURITY.md).

## Setup

```bash
git clone https://github.com/<you>/CycleIQ.git
cd CycleIQ
npm install
npx expo start            # Expo Go / simulator
npm run web:demo          # quick look in the browser with sample data
```

Encryption (SQLCipher), Apple Health / Health Connect and Face ID need a development build: `npx expo run:ios` or `npx expo run:android`. Always test data and notification changes on iOS or Android. The web preview is in-memory and unencrypted.

## Before you open a PR

```bash
npm run check             # typecheck, lint, unit + database + UI tests
```

CI runs the same checks plus `expo-doctor` and an iOS/Android bundle export. If you changed screens, also:

- try the change in **light and dark** mode and at a **large text size**;
- regenerate screenshots if the README ones changed noticeably: `npm run screenshots` (needs Chrome).

## Privacy rules (non-negotiable)

1. **No network calls with user data.** No analytics, crash reporters, remote config or ads SDKs. If a feature needs the network, open an issue to discuss it first.
2. **Health data stays in the encrypted database.** Never write it to AsyncStorage, files, logs or `console.*` output. Free-text fields (notes, medication, reflections) go through `utils/fieldEncryption.ts`.
3. **Notifications must respect discreet mode.** Route all content through `resolveNotificationContent` in `utils/notifications.ts`.
4. **No made-up data.** An unanswered question is stored as `NULL`, never as a default score.
5. **Exports and deletes stay complete.** New tables must be included in `exportLocalDataSnapshot`, restore and `wipeLocalDatabase` (`database/privacy.ts`).

## Code conventions

### Two voices: every user-facing string

The app speaks in **chill** (casual, lowercase, emoji) or **classic** (plain, calm, no emoji). Write both:

```tsx
const tx = useTx();                      // in components
<Text>{tx("logged ✨", "Saved")}</Text>

const tx = currentTx();                  // outside React (notifications, alerts in utils)
```

Option lists live in `constants/copy.ts`. The **stored value** never changes with tone, only the label does: `opt("Severe", "full balloon 🎈")`. Safety and medical wording should carry the same information in both voices.

### Dates

A "day" is the user's **local** calendar day. Use `localDateKey` / `parseLocalDate` from `utils/dates.ts`, and never `iso.split("T")[0]` or `new Date("YYYY-MM-DD")` (both are UTC).

### Database

- Screens import from `@/database` only.
- Schema changes need a new, forward-only migration in `database/schema.ts` and a test in `tests/database.test.ts`.
- `UPDATE … ORDER BY / LIMIT` doesn't work on device builds; use a subquery. The test stand-in will reject it.
- Symptom logs belong to the cycle their day falls in. Cycle writes call `recomputeCycleLengths`, which keeps lengths and ownership right.

### Accessibility

- Every tappable element needs an `accessibilityRole` and, if its text isn't self-explanatory, an `accessibilityLabel`. The UI tests fail otherwise.
- Touch targets are at least 44×44 pt.
- Use colour tokens from `constants/theme.ts` (they meet WCAG AA in both themes).
- Respect Reduce Motion via `hooks/use-reduced-motion.ts`.

### Safety-related changes

Thresholds in `constants/safeguarding.ts`, red-flag rules in `utils/safetyRules.ts` and their wording are under clinical review. Changing them needs a matching update to [docs/CLINICAL_REVIEW.md](docs/CLINICAL_REVIEW.md) and a maintainer's sign-off.

### Predictions

Changes to `utils/predictions.ts` must keep `npm test` green. The backtest gate fails if accuracy regresses against simple baselines. Include `npm run backtest` output in the PR.

## Commits and pull requests

- Branch from `main`; keep PRs focused on one change.
- Write commit messages in the imperative: "Fix calendar shading on the first period day".
- Fill in the PR template, including screenshots for UI changes.
- By contributing, you agree your work is licensed under the [MIT License](LICENSE).

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Be kind. People here may be sharing health experiences.
