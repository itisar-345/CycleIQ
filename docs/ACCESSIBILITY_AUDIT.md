# Accessibility Audit Script — VoiceOver (iOS) & TalkBack (Android)

Automated coverage already in place:
- **Contrast:** every text/background pair in `constants/theme.ts` meets WCAG AA (4.5:1) in light and dark.
- **Labels/roles:** `tests/ui/*.test.tsx` fail if any tappable element on Log, Home, Calendar, Insights or Profile lacks a role or label.
- **Touch targets:** interactive controls are ≥ 44 pt.
- **Motion:** decorative animation stops when Reduce Motion is on.

This script covers what automation can't: how it actually *sounds* and whether tasks are completable without sight. Run on a QA build (see `docs/QA_DEVICE_TEST_PLAN.md`), once with VoiceOver and once with TalkBack, in **both** tones.

## Tasks (must be completable with the screen reader only)

| # | Task | Pass criteria |
|---|------|---------------|
| 1 | Complete onboarding, choosing "classic" tone | Every control announced with a meaningful name; progress bar announces the step (e.g. "Step 3: your condition") |
| 2 | Log today: mood 2, pain 6, headache on, save | Mood faces announce "Mood 2 of 5: meh"; scale steps announce "6 out of 10"; caption change is announced |
| 3 | Find yesterday in Calendar and hear its details | Day cell announces date + period / predicted / high pain / phase |
| 4 | Log a period start, then end it | Alerts are read out in full; buttons named |
| 5 | Hide an insight on Insights | "Hide insight: <title>" is announced; card disappears |
| 6 | Turn on app lock and discreet notifications | Switches announce name + state |
| 7 | Open Support and call a crisis line | "Call Tele-MANAS…, 14416" (or local line) is announced as a button |
| 8 | Read a Learn article | Card announces collapsed/expanded state |

## Checks on every screen

- Focus order follows the visual order; nothing is skipped or trapped (especially the lock screen and date picker sheet).
- Headers are announced as headings and the rotor/heading navigation jumps between sections.
- Decorative emoji are not read aloud as noise ("fire", "sparkles") where they're only decoration.
- Text scales to the largest accessibility size without clipping.
- Nothing relies on colour alone (calendar dots have spoken equivalents).

## Results

| Platform | Screen reader | Tone | Tester | Date | Tasks passed (/8) | Issues filed |
|----------|---------------|------|--------|------|-------------------|--------------|
| iOS | VoiceOver | chill | | | | |
| iOS | VoiceOver | classic | | | | |
| Android | TalkBack | chill | | | | |
| Android | TalkBack | classic | | | | |
