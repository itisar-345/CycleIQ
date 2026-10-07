# Prediction Engine

`utils/predictions.ts`: a pure, on-device function from past cycle lengths to a next-period estimate. No network, no model download, and the same code runs in the tests.

## Input

Cycles **newest first**. `cycles[0]` is the cycle in progress; its length is unknown and ignored. Every other cycle contributes its completed length (gap between period starts, 1–365 days).

The user's mode picks a **condition prior**:

| Mode | Prior mean | Narrowest window (± days) | Window multiplier | Confidence penalty |
|---|---|---|---|---|
| Cycle tracking | 28 | 2 | 1.0 | 0 |
| Endometriosis | 28 | 3 | 1.1 | 0.03 |
| PCOD | 32 | 5 | 1.4 | 0.07 |
| PCOS | 35 | 7 | 1.6 | 0.10 |
| Perimenopause | 32 | 10 | 1.8 | 0.15 |

## Tiers

| Completed cycles | Method |
|---|---|
| 0 | No prediction ("log your next period") |
| 1–4 | **Prior blend**: median of the user's cycles blended with the prior mean, weighted by a pseudo-count |
| 5–11 | **Trimmed exponentially weighted mean**: outliers outside an IQR fence (at least ±4 days) are dropped, recent cycles weigh more, plus a trend term |
| 12+ | Same as above over the last 12 cycles, plus **regime detection**: if the last 3 cycles differ from the older ones by more than 5 days, history is down-weighted |

Post-pill mode returns no prediction for the first 90 days.

## Calibration: numbers you can trust

Instead of assuming a distribution, the engine **back-tests itself on the user's own history**. It re-runs the point prediction on each earlier slice of data (up to 12 steps) and records how far off it was.

- **Window.** With at least 4 back-test errors, the half-width is the 80th percentile of those errors × the mode's multiplier, so it should cover about 80% of outcomes. Before that, the model's own spread is used. Never narrower than the mode's minimum.
- **"Past guesses were off by ~X days."** The back-test mean absolute error (shown once there are 3+ steps).
- **Confidence.** The share of back-test predictions that landed within ±2 days, smoothed toward a tier-based prior and reduced by the mode penalty. Clamped to 15–95%.

### Feedback & bias correction

When a new period starts, the prediction the user actually saw (stored before the period began) is compared with reality and saved in `prediction_feedback`. The mean signed error of the last 6 is shrunk toward zero (`n / (n + 2)`), capped at ±7 days, and used to shift future dates. This corrects a consistent early or late bias without overreacting to one odd cycle.

## Accuracy

`npm run backtest` runs the engine walk-forward on seeded synthetic users and compares it with simple baselines (MAE in days, lower is better):

| Profile | Engine | Last cycle | Median of 3 | Median of 6 | Mean of 6 | Window coverage | Avg. width |
|---|---|---|---|---|---|---|---|
| Regular (28 ± 2) | **1.69** | 2.17 | 1.88 | 1.74 | 1.70 | 83% | 5.1 d |
| Regular, long (32 ± 2) | **1.74** | 2.17 | 1.88 | 1.74 | 1.70 | 85% | 5.6 d |
| Variable (± 4) | **3.41** | 4.33 | 3.78 | 3.47 | 3.42 | 76% | 9.4 d |
| PCOS-like (long, very variable) | **8.46** | 10.58 | 9.30 | 8.54 | 8.38 | 88% | 36.8 d |
| Trending 27 → 33 | **1.66** | 1.64 | 1.54 | 1.59 | 1.61 | 82% | 4.8 d |
| One missed log | **3.61** | 5.86 | 3.83 | 3.67 | 4.94 | 80% | 5.9 d |

The engine matches or beats the strongest simple baseline in most profiles, and its windows cover close to the intended 80%. `npm test` includes this backtest as a **regression gate**: a change that makes predictions worse fails CI.

These are synthetic profiles, not clinical validation. Real-world accuracy depends on how consistently periods are logged.

## Other outputs

The engine also returns fields used by the condition modes:

- **PCOS:** irregularity flags, cycle pattern, days since the last period, a late-arrival estimate (90th percentile)
- **Endometriosis:** cycle day, a flare-risk window, an ovulation-pain day
- **All modes:** an estimated ovulation day (14 days before the next period), shown with a "not for contraception" caution

## Not for contraception

Ovulation and fertile-window estimates are approximate and **must not be used to prevent pregnancy**.
