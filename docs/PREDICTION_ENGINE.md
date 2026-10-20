# Prediction Engine

`utils/predictions.ts` (engine) and `utils/cycleModel.ts` (the statistical model): a pure, on-device function from past cycle lengths to a next-period estimate. No network, no model download, and the same code runs in the tests.

## Input

Cycles **newest first**. `cycles[0]` is the cycle in progress; its length is unknown and ignored. Every other cycle contributes its completed length (gap between period starts, 1–365 days).

The cycle estimated from onboarding answers (`is_confirmed = 0`) is the user's **reported** typical length. It sets the model's starting belief (±3 days) instead of counting as a logged cycle, so a remembered "about 30 days" is never treated as if it had been observed.

## The model

Each person's cycle length is a slowly moving **level** observed with noise: a Kalman filter on the state *[level, trend]*.

```
level[t] = level[t-1] + trend[t-1] + drift      drift ~ N(0, q)
trend[t] = 0.9 · trend[t-1]                      (damped: never extrapolated far)
length   = level[t] + noise                      noise ~ N(0, σ²), or an outlier
```

How variable someone's cycles are (σ), how fast their pattern moves (q) and whether they trend at all are unknown. So the filter runs over a small grid of all three (10 × 3 × 2 settings), and the forecasts are **averaged by posterior weight**. A regular user ends up on low-noise settings, a PCOS user on high-noise ones, and someone whose cycles are lengthening gives weight to the trend settings. Nothing is switched by hand-tuned thresholds.

**Outliers.** Each cycle is either ordinary or, with a small learned probability, an outlier drawn from a broad distribution (missed logs, a one-off very long or short cycle). A cycle the model finds more likely to be an outlier barely moves the level. The outlier rate is learned per user, starting from about 1 in 30.

**Condition priors** set the starting belief:

| Mode | Typical length | Spread between people (sd) | Cycle-to-cycle variation (sd) | Narrowest window (± days) |
|---|---|---|---|---|
| Cycle tracking | 28 | 4 | 2.5 | 2 |
| Teen | 30 | 5 | 5 | 4 |
| Endometriosis | 28 | 4 | 3 | 3 |
| PCOD | 32 | 7 | 6 | 5 |
| PCOS | 35 | 10 | 9 | 7 |
| Perimenopause | 32 | 10 | 9 | 10 |

With little data the prior dominates. As cycles are logged, the user's own history takes over.

| `model` | When |
|---|---|
| `none` | No completed or reported cycle, or post-pill baseline (first 90 days) |
| `prior` | Only the onboarding-reported length |
| `learning` | 1–2 logged cycles |
| `personal` | 3+ logged cycles |

## One distribution, three numbers

The model produces a full **predictive distribution** over whole-day cycle lengths. Everything shown comes from it, so the numbers can't disagree:

- **Date**: the posterior mean (≈ median) length, added to the current period start.
- **Window**: the smallest ± range holding at least 80% of the predicted probability (never narrower than the mode's minimum).
- **Confidence**: the probability the period starts within ±2 days of the date.
- **"Past guesses were off by ~X days"**: an honest walk-forward check. The forecast is re-run on each earlier slice of history (up to 12 steps, only data available at the time), and the mean absolute error is reported once there are 3+ steps. Cycles the model treats as outliers aren't scored, since a missed log says nothing about the guess.

### Prediction feedback

When a new period starts, the prediction the user actually saw (stored before the period began) is compared with reality and saved in `prediction_feedback`. Home uses it to acknowledge a big miss.

Earlier engines also shifted future dates by the average of recent errors. Backtests showed that shifting **hurts** on top of a model that already adapts to every new cycle: it double-counts the last cycle, and one missed log skews the next six predictions (MAE 3.59 → 4.48 days on the missed-log profile). It helped only for steady trends, which the model's trend term now covers. So feedback is recorded, not applied.

## Accuracy

`npm run backtest` runs the engine walk-forward on seeded synthetic users (150 users × 16 cycles per profile) and compares it with simple baselines. MAE is in days; lower is better.

| Profile | v5 engine | v4 as shipped | Last cycle | Median of 3 | Median of 6 | Mean of 6 | Window coverage | Avg. width | Confidence vs. real ±2 d hit rate |
|---|---|---|---|---|---|---|---|---|---|
| Regular (28 ± 2) | **1.68** | 1.80 | 2.17 | 1.88 | 1.74 | 1.70 | 90% | 6.5 d | 70% vs 76% |
| Regular, long (32 ± 2) | **1.70** | 1.86 | 2.17 | 1.88 | 1.74 | 1.70 | 90% | 6.6 d | 70% vs 76% |
| Variable (± 4) | **3.36** | 3.64 | 4.33 | 3.78 | 3.47 | 3.42 | 83% | 10.9 d | 49% vs 44% |
| PCOS-like (long, very variable) | **8.18** | 9.00 | 10.58 | 9.30 | 8.54 | 8.38 | 81% | 27.1 d | 21% vs 18% |
| Trending 27 → 33 | 1.56 | **1.42** | 1.64 | 1.54 | 1.59 | 1.61 | 89% | 5.8 d | 75% vs 78% |
| One missed log | **3.59** | 4.52 | 5.86 | 3.83 | 3.67 | 4.94 | 84% | 6.7 d | 69% vs 71% |
| Shift 28 → 35 | 2.72 | 2.94 | **2.48** | 2.55 | 2.84 | 2.79 | 81% | 8.3 d | 60% vs 58% |

"v4 as shipped" is the previous tiered engine including its feedback bias shift.

What changed with v5:

- **Lower error in 6 of 7 profiles**, and better than every simple baseline in 5. The trending profile is slightly worse than v4, because v4's bias shift happened to suit a perfectly steady trend. A sudden step change is still followed more cautiously than "repeat the last cycle", which is the price of not being thrown by a single odd cycle.
- **Windows cover at least 80% everywhere.** v4 dropped to 73% after a pattern shift and over-covered PCOS with 37-day windows; PCOS windows are now 10 days narrower. Regular users see ±3 days where v4 often showed ±2, because ±2 honestly covers only about 76%.
- **Confidence is a probability, not a score.** v4 smoothed a hit rate and subtracted a per-mode penalty; it was 9 points under the real hit rate for regular cycles. v5 is within 6 points on every profile. The leftover gap goes in opposite directions for the ±2 and ±4 profiles, as expected from one shared prior: it is calibrated across users and converges per user as history grows.

`npm test` includes this backtest as a **regression gate**. The engine must beat or tie a 6-cycle median on every profile, cover 78–93% of outcomes, and keep confidence within 8 points of the real hit rate.

These are synthetic profiles, not clinical validation. Real-world accuracy depends on how consistently periods are logged.

## Other outputs

Descriptive condition signals live in `utils/conditionSignals.ts`:

- **PCOS:** irregularity flags, cycle pattern, days since the last period, a late-arrival estimate (90th percentile of the predictive distribution)
- **Endometriosis:** cycle day, a flare-risk window, an ovulation-pain day
- **All modes:** an estimated ovulation day (14 days before the next period), shown with a "not for contraception" caution; a trend direction and a pattern-shift flag (last 3 cycles more than 5 days from the older ones)

## Cost

One prediction is about 5 ms with 24 cycles of history and 24 ms with 60 (5 years), including the walk-forward check.

## Not for contraception

Ovulation and fertile-window estimates are approximate and **must not be used to prevent pregnancy**.
