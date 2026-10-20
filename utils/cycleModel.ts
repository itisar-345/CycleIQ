/**
 * Bayesian cycle-length model — pure maths, no dates or database.
 *
 * Each person's cycle length is treated as a slowly moving level observed with noise
 * (a Kalman filter on [level, trend]):
 *
 *   level[t] = level[t-1] + trend[t-1] + drift,   drift ~ N(0, q)
 *   trend[t] = 0.9 · trend[t-1]                    (damped; off for most settings)
 *   y[t]     = level[t] + noise,                  noise ~ N(0, σ²)   (or, rarely, an outlier)
 *
 * σ (how much cycles vary), q (how fast the pattern moves) and whether there is a trend
 * are unknown, so the filter runs over a small grid of them and the results are averaged
 * by posterior weight. A
 * contamination component (missed logs, one-off long or short cycles) keeps a single odd
 * cycle from dragging the level; its rate is learned from the data.
 *
 * The output is a full predictive distribution over whole-day lengths, so the point
 * estimate, the window and the confidence all describe the same belief.
 */

export interface ModelPrior {
  /** Prior mean of the person's typical cycle length (days). */
  levelMean: number;
  /** Prior uncertainty about that typical length (days, 1 sd). */
  levelSd: number;
  /** Most likely cycle-to-cycle variation (days, 1 sd). */
  noiseSd: number;
}

export interface CycleForecast {
  /** Whole-day point forecast (posterior mean ≈ median of the predictive distribution). */
  point: number;
  /** Smallest h with P(|next − point| ≤ h) ≥ 80%. */
  halfWidth: number;
  /** P(next length within ±HIT_TOLERANCE_DAYS of the point forecast). */
  hitProbability: number;
  /** Posterior-mean trend (days per cycle); 0 when no trend is supported by the data. */
  slopePerCycle: number;
  /** Per observation (oldest first): judged more likely an outlier than an ordinary cycle. */
  unusual: boolean[];
  /** Posterior mean typical variation (days). */
  noiseSd: number;
  /** 90th percentile of the predictive distribution — a late-but-plausible length. */
  p90: number;
}

/** A prediction "hits" when the period starts within this many days of the predicted date. */
export const HIT_TOLERANCE_DAYS = 2;
const WINDOW_COVERAGE = 0.8;
const MAX_LENGTH = 200;

// Grid over cycle-to-cycle noise (σ, days) — geometric so it covers regular to PCOS.
const NOISE_GRID = [1, 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
// Drift sd as a fraction of σ, with prior weights favouring a stable pattern.
const DRIFT_GRID: { ratio: number; weight: number }[] = [
  { ratio: 0, weight: 0.45 },
  { ratio: 0.2, weight: 0.35 },
  { ratio: 0.5, weight: 0.2 },
];
// Optional damped trend (days/cycle prior sd): most people have none.
const TREND_GRID: { sd: number; weight: number }[] = [
  { sd: 0, weight: 0.7 },
  { sd: 0.5, weight: 0.3 },
];
/** Log-normal prior on σ around the mode's typical variation. */
const NOISE_PRIOR_LOG_SD = 0.8;
/** Outlier rate prior: Beta(1, 29) ≈ 1 cycle in 30. */
const OUTLIER_PRIOR = { a: 1, b: 29 };
const PRIOR_OUTLIER_RATE = OUTLIER_PRIOR.a / (OUTLIER_PRIOR.a + OUTLIER_PRIOR.b);
/** Outliers are drawn from a broad distribution around the level. */
const OUTLIER_SD = 20;

// ─── distributions ───────────────────────────────────────────────────────────

/** Abramowitz & Stegun 7.1.26, |error| < 1.5e-7. */
const erf = (x: number): number => {
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
};

const normalCdf = (x: number, mean: number, sd: number) => 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)));

const normalLogPdf = (x: number, mean: number, variance: number) =>
  -0.5 * (Math.log(2 * Math.PI * variance) + (x - mean) ** 2 / variance);

const logSumExp = (a: number, b: number) => {
  const m = Math.max(a, b);
  return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
};

// ─── filter ──────────────────────────────────────────────────────────────────

/** How the level may move between cycles. */
interface Dynamics {
  /** Random-walk sd of the level per cycle (days). */
  driftSd: number;
  /** Prior sd of a per-cycle trend (days/cycle); 0 = no trend term. */
  trendSd: number;
}

/** A trend fades by this factor each cycle, so it is never extrapolated far. */
const TREND_DAMPING = 0.9;

interface FilterRun {
  logLik: number;
  /** Predictive mean / variance of the next cycle (ordinary component). */
  nextMean: number;
  nextVar: number;
  /** Posterior probability each observation was an outlier. */
  outlierProbs: number[];
  /** Filtered trend (days/cycle) after the last observation. */
  trend: number;
}

/**
 * Kalman filter on state [level, trend] (trend switched off when trendSd = 0), with a
 * two-component observation model: ordinary cycle or outlier. The posterior after each
 * observation is moment-matched back to one Gaussian.
 */
function runFilter(lengths: number[], prior: ModelPrior, noiseSd: number, dyn: Dynamics, outlierRate: number): FilterRun {
  const r = noiseSd ** 2;
  const qLevel = dyn.driftSd ** 2;
  const phi = dyn.trendSd > 0 ? TREND_DAMPING : 0;
  // State mean (l, t) and covariance [[a, b], [b, c]].
  let l = prior.levelMean;
  let t = 0;
  let a = prior.levelSd ** 2;
  let b = 0;
  let c = dyn.trendSd ** 2;
  let logLik = 0;
  const outlierProbs: number[] = [];

  const predict = () => {
    l += t;
    t *= phi;
    const a2 = a + 2 * b + c + qLevel;
    b = phi * (b + c);
    c = phi * phi * c;
    a = a2;
  };

  for (const y of lengths) {
    predict();
    const s = a + r;
    const v = y - l;
    const logIn = Math.log(1 - outlierRate) + normalLogPdf(y, l, s);
    const logOut = Math.log(outlierRate) + normalLogPdf(y, l, a + OUTLIER_SD ** 2);
    const logTotal = logSumExp(logIn, logOut);
    logLik += logTotal;
    const pOut = Math.exp(logOut - logTotal);
    outlierProbs.push(pOut);

    // Ordinary-cycle update…
    const k0 = a / s;
    const k1 = b / s;
    const lIn = l + k0 * v;
    const tIn = t + k1 * v;
    const aIn = a - a * k0;
    const bIn = b - b * k0;
    const cIn = c - b * k1;
    // …mixed with "outlier: learn nothing", then collapsed to one Gaussian.
    const lNew = (1 - pOut) * lIn + pOut * l;
    const tNew = (1 - pOut) * tIn + pOut * t;
    const dlIn = lIn - lNew, dtIn = tIn - tNew, dlOut = l - lNew, dtOut = t - tNew;
    a = (1 - pOut) * (aIn + dlIn * dlIn) + pOut * (a + dlOut * dlOut);
    b = (1 - pOut) * (bIn + dlIn * dtIn) + pOut * (b + dlOut * dtOut);
    c = (1 - pOut) * (cIn + dtIn * dtIn) + pOut * (c + dtOut * dtOut);
    l = lNew;
    t = tNew;
  }

  predict();
  return { logLik, nextMean: l, nextVar: a + r, outlierProbs, trend: t };
}

// ─── posterior over hyperparameters ──────────────────────────────────────────

interface Component {
  weight: number;
  run: FilterRun;
  noiseSd: number;
}

function fitComponents(lengths: number[], prior: ModelPrior, outlierRate: number): Component[] {
  const comps: { logW: number; run: FilterRun; noiseSd: number }[] = [];
  const logNoiseCentre = Math.log(prior.noiseSd);
  for (const noiseSd of NOISE_GRID) {
    const logPriorNoise = -0.5 * ((Math.log(noiseSd) - logNoiseCentre) / NOISE_PRIOR_LOG_SD) ** 2;
    for (const drift of DRIFT_GRID) {
      for (const trend of TREND_GRID) {
        const dyn = { driftSd: drift.ratio * noiseSd, trendSd: trend.sd };
        const run = runFilter(lengths, prior, noiseSd, dyn, outlierRate);
        comps.push({ logW: logPriorNoise + Math.log(drift.weight * trend.weight) + run.logLik, run, noiseSd });
      }
    }
  }
  const maxLogW = Math.max(...comps.map((c) => c.logW));
  const total = comps.reduce((s, c) => s + Math.exp(c.logW - maxLogW), 0);
  return comps.map((c) => ({ weight: Math.exp(c.logW - maxLogW) / total, run: c.run, noiseSd: c.noiseSd }));
}

/**
 * Two passes: estimate the outlier rate from a first fit, then refit with it, so a user
 * who never misses a log gets tight windows and one who often does isn't overconfident.
 */
function fit(lengths: number[], prior: ModelPrior): { comps: Component[]; outlierRate: number } {
  const first = fitComponents(lengths, prior, PRIOR_OUTLIER_RATE);
  const expectedOutliers = lengths.reduce(
    (sum, _, i) => sum + first.reduce((s, c) => s + c.weight * c.run.outlierProbs[i], 0),
    0,
  );
  const outlierRate = (OUTLIER_PRIOR.a + expectedOutliers) / (OUTLIER_PRIOR.a + OUTLIER_PRIOR.b + lengths.length);
  return { comps: fitComponents(lengths, prior, outlierRate), outlierRate };
}

// ─── predictive distribution ─────────────────────────────────────────────────

/** Components carrying less posterior weight than this are skipped when building the pmf. */
const MIN_COMPONENT_WEIGHT = 1e-4;

/** P(next length = d) for whole days d = 1..MAX_LENGTH (index d). */
function predictivePmf(comps: Component[], outlierRate: number): number[] {
  const pmf = new Array<number>(MAX_LENGTH + 1).fill(0);
  const binMass = (mean: number, sd: number, scale: number) => {
    let prev = normalCdf(0.5, mean, sd);
    for (let d = 1; d <= MAX_LENGTH; d++) {
      const next = normalCdf(d + 0.5, mean, sd);
      pmf[d] += scale * (next - prev);
      prev = next;
    }
  };
  for (const { weight, run } of comps) {
    if (weight < MIN_COMPONENT_WEIGHT) continue;
    binMass(run.nextMean, Math.sqrt(run.nextVar), weight * (1 - outlierRate));
    binMass(run.nextMean, Math.sqrt(run.nextVar + OUTLIER_SD ** 2), weight * outlierRate);
  }
  const total = pmf.reduce((a, b) => a + b, 0);
  return pmf.map((v) => v / total);
}

const massWithin = (pmf: number[], centre: number, h: number): number => {
  let s = 0;
  for (let d = Math.max(1, centre - h); d <= Math.min(pmf.length - 1, centre + h); d++) s += pmf[d];
  return s;
};

const quantile = (pmf: number[], q: number): number => {
  let acc = 0;
  for (let d = 1; d < pmf.length; d++) {
    acc += pmf[d];
    if (acc >= q) return d;
  }
  return pmf.length - 1;
};

const posteriorMean = (comps: Component[]) => comps.reduce((s, c) => s + c.weight * c.run.nextMean, 0);

/**
 * Point forecast only (no predictive distribution) — cheap enough to re-run on every
 * historical prefix for the walk-forward accuracy check.
 * @param lengths completed cycle lengths, oldest first.
 */
export function pointForecast(lengths: number[], prior: ModelPrior): number {
  // One pass at the prior outlier rate: the point barely depends on it.
  return Math.round(posteriorMean(fitComponents(lengths, prior, PRIOR_OUTLIER_RATE)));
}

/**
 * Forecast the next cycle length.
 * @param lengths completed cycle lengths, oldest first (may be empty: prior only).
 */
export function forecastNextCycle(lengths: number[], prior: ModelPrior): CycleForecast {
  const { comps, outlierRate } = fit(lengths, prior);
  const pmf = predictivePmf(comps, outlierRate);

  // Every component is symmetric around its mean, so the posterior mean is also the
  // median to within a day; using it keeps this and pointForecast identical.
  const point = Math.round(posteriorMean(comps));
  let halfWidth = 0;
  while (halfWidth < MAX_LENGTH && massWithin(pmf, point, halfWidth) < WINDOW_COVERAGE) halfWidth++;

  let slopePerCycle = 0;
  let noiseSd = 0;
  const outlierProb = lengths.map(() => 0);
  for (const { weight, run, noiseSd: sd } of comps) {
    slopePerCycle += weight * run.trend;
    noiseSd += weight * sd;
    run.outlierProbs.forEach((p, i) => { outlierProb[i] += weight * p; });
  }

  return {
    point,
    halfWidth,
    hitProbability: massWithin(pmf, point, HIT_TOLERANCE_DAYS),
    slopePerCycle,
    unusual: outlierProb.map((p) => p > 0.5),
    noiseSd,
    p90: quantile(pmf, 0.9),
  };
}
