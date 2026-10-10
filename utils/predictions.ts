/**
 * CycleIQ — On-Device Prediction Engine v4
 *
 * Input: cycles newest-first. cycles[0] is the current (in-progress) cycle; its
 * cycle_length is ignored. Every other cycle contributes its completed length.
 *
 * Tier 1 (0 completed cycles) : No prediction.
 * Tier 2 (1–4)                : Prior/median blend (pseudo-count weighting).
 * Tier 3 (5–11)               : Outlier-trimmed EW mean + trend.
 * Tier 4 (12+)                : Regime detection, outlier trimming, EW mean
 *                               over the last 12 cycles, trend.
 *
 * Window width, "historical accuracy" (MAE) and confidence are calibrated from a
 * walk-forward backtest of the same point predictor on the user's own history,
 * so the numbers shown in the UI describe how this engine actually performed.
 *
 * Condition priors widen windows for PCOS / PCOD / peri.
 * Post-pill suppresses predictions for 90 days.
 */

export interface PredictionResult {
  mean: number;
  /** Half-width of the prediction window in days (window = mean ± stdDev). */
  stdDev: number;
  confidence: number;
  model: "none" | "rule-based" | "weighted-average" | "full-rules";
  label: string;
  predictedStartISO: string | null;
  windowStartISO: string | null;
  windowEndISO: string | null;
  /** Mean absolute error (days) of this engine in a walk-forward backtest on the user's history. */
  mae: number | null;
  outlierFlagged: boolean;
  trendDirection: "lengthening" | "shortening" | "stable";
  /** True when recent 3 cycles diverge >5d from long-run mean — model down-weights history */
  regimeChangeDetected: boolean;
  /** 90th-percentile cycle length — PCOS: latest plausible arrival */
  lateArrivalP90: number | null;
  /** ISO date the estimated ovulation window opens (2 days before estimated ovulation) */
  nextOvulationWindowISO: string | null;
  /** Days the dates were shifted by the feedback bias correction (0 = none). */
  biasAppliedDays: number;

  // ── PCOS ──────────────────────────────────────────────────────────────────
  irregularFlag: boolean;
  longestRecentCycle: number | null;
  daysSinceLastPeriod: number | null;
  cycleVariability: number | null;
  pcosCyclePattern: "oligomenorrhea" | "irregular" | "regular" | null;
  amenorrheaFlag: boolean;
  predictedOvulationDay: number | null;
  widePredictionWindow: boolean;
  inStressFlareWindow: boolean;

  // ── Endo ──────────────────────────────────────────────────────────────────
  flareRiskWindowStart: number | null;
  ovulationPainDay: number | null;
  currentCycleDay: number | null;
  inFlareRiskWindow: boolean;
  periodLengthAvg: number | null;
}

/** Ovulation is estimated this many days before the next period (luteal phase). */
export const LUTEAL_PHASE_DAYS = 14;
/** The ovulation window is shown as opening this many days before estimated ovulation. */
const OVULATION_WINDOW_LEAD_DAYS = 2;

const DAY_MS = 86400000;

// ─── helpers ─────────────────────────────────────────────────────────────────

const addDaysToISO = (iso: string, days: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString();
};

const daysBetween = (fromISO: string, now: number): number =>
  Math.floor((now - new Date(fromISO).getTime()) / DAY_MS);

const median = (arr: number[]): number => {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
};

const mean = (arr: number[]): number =>
  arr.reduce((a, b) => a + b, 0) / arr.length;

const stdDev = (arr: number[], avg?: number): number => {
  const m = avg ?? mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
};

/** p in 0–1, e.g. 0.9 for P90 */
const percentile = (arr: number[], p: number): number => {
  const s = [...arr].sort((a, b) => a - b);
  const idx = p * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
};

const trimOutliers = (arr: number[]): { trimmed: number[]; removed: number } => {
  if (arr.length < 5) return { trimmed: arr, removed: 0 };
  const q1 = percentile(arr, 0.25);
  const q3 = percentile(arr, 0.75);
  // Floor the fence so very regular users (IQR ≈ 0) don't lose normal ±2d cycles.
  const fence = Math.max(1.5 * (q3 - q1), 4);
  const trimmed = arr.filter((v) => v >= q1 - fence && v <= q3 + fence);
  return { trimmed, removed: arr.length - trimmed.length };
};

/**
 * Exponentially weighted mean. decay controls how fast older values fade.
 * arr[0] = most recent.
 */
const ewMean = (arr: number[], decay: number): number => {
  let wSum = 0, wVal = 0;
  for (let i = 0; i < arr.length; i++) {
    const w = Math.exp(-decay * i);
    wSum += w; wVal += arr[i] * w;
  }
  return wVal / wSum;
};

/** Least-squares slope, arr oldest-first */
const trendSlope = (arr: number[]): number => {
  const n = arr.length;
  if (n < 3) return 0;
  const xs = arr.map((_, i) => i);
  const mx = mean(xs), my = mean(arr);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (arr[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den === 0 ? 0 : num / den;
};

/**
 * Regime-change detection: if the mean of the 3 most-recent cycles differs
 * from the mean of all older cycles by more than 5 days, the user's pattern
 * has shifted — we down-weight history.
 */
const detectRegimeChange = (lengths: number[]): boolean => {
  if (lengths.length < 6) return false;
  const recent = mean(lengths.slice(0, 3));
  const older  = mean(lengths.slice(3));
  return Math.abs(recent - older) > 5;
};

const isValidLength = (value: unknown): value is number =>
  typeof value === "number" && value > 0 && value <= 365;

// ─── condition priors ─────────────────────────────────────────────────────────

interface ConditionPrior {
  /** Population prior mean for cycle length */
  priorMean: number;
  /** Prior strength in "equivalent cycles" for the Tier 2 blend */
  priorPseudoCount: number;
  /** Narrowest allowed window half-width (days) */
  minStdDev: number;
  stdDevMultiplier: number;
  confidencePenalty: number;
  outlierThreshold: number;
}

const CONDITION_PRIORS: Record<string, ConditionPrior> = {
  standard: { priorMean: 28, priorPseudoCount: 1,   minStdDev: 2,  stdDevMultiplier: 1.0, confidencePenalty: 0,    outlierThreshold: 45  },
  teen:     { priorMean: 30, priorPseudoCount: 1.5, minStdDev: 4,  stdDevMultiplier: 1.3, confidencePenalty: 0.05, outlierThreshold: 60  },
  pcos:     { priorMean: 35, priorPseudoCount: 1,   minStdDev: 7,  stdDevMultiplier: 1.6, confidencePenalty: 0.10, outlierThreshold: 120 },
  pcod:     { priorMean: 32, priorPseudoCount: 1,   minStdDev: 5,  stdDevMultiplier: 1.4, confidencePenalty: 0.07, outlierThreshold: 90  },
  endo:     { priorMean: 28, priorPseudoCount: 1,   minStdDev: 3,  stdDevMultiplier: 1.1, confidencePenalty: 0.03, outlierThreshold: 50  },
  peri:     { priorMean: 32, priorPseudoCount: 1.5, minStdDev: 10, stdDevMultiplier: 1.8, confidencePenalty: 0.15, outlierThreshold: 150 },
};

const getPrior = (mode: string): ConditionPrior =>
  CONDITION_PRIORS[mode] ?? CONDITION_PRIORS.standard;

// ─── post-pill suppression ────────────────────────────────────────────────────

const isPostPillSuppressed = (
  postPillMode: boolean,
  postPillStartDate: string | null,
  now: number,
): { suppressed: boolean; daysRemaining: number } => {
  if (!postPillMode || !postPillStartDate) return { suppressed: false, daysRemaining: 0 };
  const remaining = Math.max(0, 90 - daysBetween(postPillStartDate, now));
  return { suppressed: remaining > 0, daysRemaining: remaining };
};

// ─── null result factory ──────────────────────────────────────────────────────

const nullResult = (label: string): PredictionResult => ({
  mean: 28, stdDev: 0, confidence: 0, model: "none", label,
  predictedStartISO: null, windowStartISO: null, windowEndISO: null,
  mae: null, outlierFlagged: false,
  trendDirection: "stable", regimeChangeDetected: false,
  lateArrivalP90: null, nextOvulationWindowISO: null, biasAppliedDays: 0,
  irregularFlag: false, longestRecentCycle: null, daysSinceLastPeriod: null,
  cycleVariability: null, pcosCyclePattern: null,
  amenorrheaFlag: false, predictedOvulationDay: null,
  widePredictionWindow: false, inStressFlareWindow: false,
  flareRiskWindowStart: null, ovulationPainDay: null,
  currentCycleDay: null, inFlareRiskWindow: false, periodLengthAvg: null,
});

// ─── condition-specific field computers ──────────────────────────────────────

type PcosFields = Pick<PredictionResult,
  "irregularFlag" | "longestRecentCycle" | "daysSinceLastPeriod" | "cycleVariability" |
  "pcosCyclePattern" | "amenorrheaFlag" | "predictedOvulationDay" |
  "widePredictionWindow" | "inStressFlareWindow">;

type EndoFields = Pick<PredictionResult,
  "flareRiskWindowStart" | "ovulationPainDay" | "currentCycleDay" |
  "inFlareRiskWindow" | "periodLengthAvg">;

function computePcosFields(lengths: number[], latestStartDate: string | null, now: number): PcosFields {
  const daysSince = latestStartDate ? daysBetween(latestStartDate, now) : null;
  const amenorrheaFlag = daysSince !== null && daysSince >= 90;
  if (lengths.length < 2) {
    return {
      irregularFlag: false, longestRecentCycle: null, daysSinceLastPeriod: daysSince,
      cycleVariability: null, pcosCyclePattern: null, amenorrheaFlag,
      predictedOvulationDay: null, widePredictionWindow: false, inStressFlareWindow: false,
    };
  }
  const cv = stdDev(lengths);
  const meanLen = mean(lengths);
  const med = median(lengths);
  const irregularFlag = cv > 7;
  const pcosCyclePattern: PredictionResult["pcosCyclePattern"] =
    med > 35 ? "oligomenorrhea" : irregularFlag ? "irregular" : "regular";
  const predictedOvulationDay = Math.max(10, Math.round(meanLen - LUTEAL_PHASE_DAYS));
  const stressWindowDay = Math.max(7, Math.round(meanLen - LUTEAL_PHASE_DAYS));
  return {
    irregularFlag,
    longestRecentCycle: Math.max(...lengths.slice(0, 6)),
    daysSinceLastPeriod: daysSince,
    cycleVariability: Math.round(cv * 10) / 10,
    pcosCyclePattern,
    amenorrheaFlag,
    predictedOvulationDay,
    widePredictionWindow: cv >= 7,
    inStressFlareWindow: daysSince !== null && daysSince >= stressWindowDay,
  };
}

function computeEndoFields(cycles: CycleInput[], lengths: number[], latestStartDate: string | null, now: number): EndoFields {
  if (lengths.length < 2) {
    return {
      flareRiskWindowStart: null, ovulationPainDay: null,
      currentCycleDay: null, inFlareRiskWindow: false, periodLengthAvg: null,
    };
  }
  const meanLen = Math.round(mean(lengths));
  const flareRiskWindowStart = meanLen - 7;
  const ovulationPainDay = meanLen - LUTEAL_PHASE_DAYS;
  const currentCycleDay = latestStartDate ? daysBetween(latestStartDate, now) + 1 : null;
  const periodLengths = cycles
    .map((c) => c.period_length)
    .filter((l): l is number => typeof l === "number" && l > 0 && l <= 14);
  const periodLengthAvg = periodLengths.length > 0
    ? Math.round((mean(periodLengths)) * 10) / 10
    : null;
  return {
    flareRiskWindowStart,
    ovulationPainDay,
    currentCycleDay,
    inFlareRiskWindow: currentCycleDay !== null && currentCycleDay >= flareRiskWindowStart,
    periodLengthAvg,
  };
}

// ─── point predictor ─────────────────────────────────────────────────────────

interface PointPrediction {
  mean: number;
  /** Model-based half-width, used until enough backtest errors exist. */
  modelSd: number;
  /** Starting confidence for this tier before history-based calibration. */
  baseConfidence: number;
  model: Exclude<PredictionResult["model"], "none">;
  label: string;
  outliersRemoved: number;
  trendDirection: PredictionResult["trendDirection"];
  regimeChangeDetected: boolean;
}

/** Tier 2: blend the condition prior with the user's median, weighted by sample size. */
function predictTier2(lengths: number[], prior: ConditionPrior): PointPrediction {
  const n = lengths.length;
  const dataMedian = median(lengths);
  const k = prior.priorPseudoCount;
  const blended = (k * prior.priorMean + n * dataMedian) / (k + n);
  const spread = n >= 2 ? (Math.max(...lengths) - Math.min(...lengths)) / 2 : 0;
  // With so little data the gap between prior and data is itself uncertainty.
  const modelSd = Math.max(
    spread * prior.stdDevMultiplier,
    Math.abs(dataMedian - blended) + prior.minStdDev,
    n === 1 ? prior.minStdDev * 2 : prior.minStdDev,
  );
  return {
    mean: blended,
    modelSd,
    baseConfidence: n === 1 ? 0.25 : 0.45,
    model: "rule-based",
    label: n === 1
      ? "Estimate from your reported cycle length — log more cycles to personalise"
      : `Prior + median blend (${n} cycles)`,
    outliersRemoved: 0,
    trendDirection: "stable",
    regimeChangeDetected: false,
  };
}

/** Tier 3: outlier-trimmed exponentially weighted mean with a damped trend. */
function predictTier3(lengths: number[], prior: ConditionPrior): PointPrediction {
  const { trimmed, removed } = trimOutliers(lengths);
  const working = trimmed.length >= 4 ? trimmed : lengths;
  const cv = stdDev(working) / mean(working);
  const decay = Math.min(0.1 + cv * 0.4, 0.4);
  const wAvg = ewMean(working, decay);
  const slope = trendSlope([...working].reverse());
  const predicted = wAvg + slope * 0.5;
  const residuals = working.map((l) => Math.abs(l - wAvg));
  const modelSd = Math.max(mean(residuals) * 1.25 * prior.stdDevMultiplier, prior.minStdDev);
  const trendDirection: PredictionResult["trendDirection"] =
    slope > 0.5 ? "lengthening" : slope < -0.5 ? "shortening" : "stable";
  return {
    mean: predicted,
    modelSd,
    baseConfidence: 0.6,
    model: "weighted-average",
    label: `Adaptive weighted avg (${lengths.length} cycles)` +
      (trendDirection === "stable" ? "" : ` — ${trendDirection}`) +
      (removed > 0 ? ` (${removed} outlier${removed > 1 ? "s" : ""} trimmed)` : ""),
    outliersRemoved: removed,
    trendDirection,
    regimeChangeDetected: false,
  };
}

/**
 * Tier 4: regime-aware, outlier-trimmed EW mean with trend. Uses only the last 12
 * cycles — older history lags behind real change. (Calendar seasonality was tried and
 * removed: it added nothing in backtests and lagged badly when cycles drift.)
 */
function predictTier4(lengths: number[], prior: ConditionPrior): PointPrediction {
  const regimeChange = detectRegimeChange(lengths);
  const workingLengths = regimeChange ? lengths.slice(0, 6) : lengths.slice(0, 12);
  const { trimmed, removed } = trimOutliers(workingLengths);
  const working = trimmed.length >= 4 ? trimmed : workingLengths;

  const cv = stdDev(working) / mean(working);
  const decay = Math.min(0.2 + cv * 0.3, 0.45);
  const wAvg = ewMean(working, decay);
  const slope = trendSlope([...working.slice(0, 6)].reverse());
  const predicted = wAvg + slope * 0.4;

  const modelSd = Math.max(stdDev(working, wAvg) * prior.stdDevMultiplier, prior.minStdDev);
  const trendDirection: PredictionResult["trendDirection"] =
    slope > 1 ? "lengthening" : slope < -1 ? "shortening" : "stable";
  return {
    mean: predicted,
    modelSd,
    baseConfidence: regimeChange ? 0.6 : 0.7,
    model: "full-rules",
    label: `Full engine (${lengths.length} cycles)` +
      (trendDirection === "stable" ? "" : ` — cycles ${trendDirection}`) +
      (removed > 0 ? ` (${removed} outlier${removed > 1 ? "s" : ""} trimmed)` : "") +
      (regimeChange ? " pattern shift detected" : ""),
    outliersRemoved: removed,
    trendDirection,
    regimeChangeDetected: regimeChange,
  };
}

/** lengths: completed cycle lengths, newest first. */
function predictPoint(lengths: number[], prior: ConditionPrior): PointPrediction {
  if (lengths.length < 5) return predictTier2(lengths, prior);
  if (lengths.length < 12) return predictTier3(lengths, prior);
  return predictTier4(lengths, prior);
}

// ─── walk-forward calibration ────────────────────────────────────────────────

const MAX_BACKTEST_STEPS = 12;
/** A prediction "hits" when the period starts within this many days of the predicted date. */
const HIT_TOLERANCE_DAYS = 2;

interface Calibration {
  absErrors: number[];
  hits: number;
}

/**
 * Re-runs the point predictor on each historical prefix (only data available at the
 * time) and records how far off it was. Needs at least 2 cycles of history per step
 * so the Tier 2 cold-start guesses don't dominate the error estimate.
 */
function backtest(lengths: number[], prior: ConditionPrior): Calibration {
  const absErrors: number[] = [];
  let hits = 0;
  for (let i = 0; i < Math.min(MAX_BACKTEST_STEPS, lengths.length - 2); i++) {
    const actual = lengths[i];
    const predicted = Math.round(predictPoint(lengths.slice(i + 1), prior).mean);
    const err = Math.abs(predicted - actual);
    absErrors.push(err);
    if (err <= HIT_TOLERANCE_DAYS) hits++;
  }
  return { absErrors, hits };
}

// ─── engine input ─────────────────────────────────────────────────────────────

/** The cycle fields the engine reads (a database CycleRow satisfies this). */
export interface CycleInput {
  start_date?: string | null;
  cycle_length?: number | null;
  period_length?: number | null;
}

export interface PredictionEngineInput {
  /** Newest first. cycles[0] is the in-progress cycle. */
  cycles: CycleInput[];
  currentMode: string;
  postPillMode?: boolean;
  postPillStartDate?: string | null;
  /** Mean signed error (actual − predicted, days) from past prediction feedback. */
  biasCorrection?: number;
  /** Clock override for deterministic tests. Defaults to Date.now(). */
  now?: Date | number;
}

// ─── main engine ─────────────────────────────────────────────────────────────

export function runPredictionEngine(input: PredictionEngineInput): PredictionResult {
  const {
    cycles,
    currentMode,
    postPillMode = false,
    postPillStartDate = null,
    biasCorrection = 0,
  } = input;
  const now = input.now === undefined ? Date.now() : new Date(input.now).getTime();
  const prior = getPrior(currentMode);

  const { suppressed, daysRemaining } = isPostPillSuppressed(postPillMode, postPillStartDate, now);
  if (suppressed) return nullResult(`Building baseline — ${daysRemaining} days until predictions unlock.`);

  const latestStartDate: string | null = cycles[0]?.start_date ?? null;
  const lengths: number[] = cycles
    .slice(1)
    .map((c) => c.cycle_length)
    .filter(isValidLength);

  if (lengths.length < 1 || !latestStartDate) return nullResult("Log your next period to unlock predictions.");

  const pcosFields = computePcosFields(lengths, latestStartDate, now);
  const endoFields = computeEndoFields(cycles, lengths, latestStartDate, now);

  const point = predictPoint(lengths, prior);
  const { absErrors, hits } = backtest(lengths, prior);

  // Window: once we have enough backtest errors, use their 80th percentile so the
  // window covers ~80% of outcomes; before that, fall back to the model's spread.
  const empiricalHalfWidth = absErrors.length >= 4 ? percentile(absErrors, 0.8) * prior.stdDevMultiplier : null;
  const halfWidth = Math.max(empiricalHalfWidth ?? point.modelSd, prior.minStdDev);
  const mae = absErrors.length >= 3 ? Math.round(mean(absErrors) * 10) / 10 : null;

  // Confidence ≈ smoothed share of past predictions that landed within ±2 days.
  const PRIOR_STRENGTH = 3;
  const smoothedHitRate = (hits + PRIOR_STRENGTH * point.baseConfidence) / (absErrors.length + PRIOR_STRENGTH);
  const confidence = Math.min(0.95, Math.max(0.15, smoothedHitRate - prior.confidencePenalty));

  const result = buildResult({
    mean: Math.max(12, Math.min(180, point.mean)),
    stdDev: halfWidth,
    confidence,
    model: point.model,
    label: point.label,
    latestStart: latestStartDate,
    mae,
    outlierFlagged: prior.outlierThreshold > 0 && lengths[0] > prior.outlierThreshold,
    trendDirection: point.trendDirection,
    regimeChangeDetected: point.regimeChangeDetected,
    lateArrivalP90: lengths.length >= 2 ? Math.round(percentile(lengths, 0.9)) : null,
    ...pcosFields,
    ...endoFields,
  });
  return applyBias(result, biasCorrection);
}

// ─── bias correction ──────────────────────────────────────────────────────────

function applyBias(result: PredictionResult, biasDays: number): PredictionResult {
  const shiftDays = Math.round(biasDays);
  if (shiftDays === 0 || result.model === "none") return result;
  const shift = (iso: string | null) => iso ? addDaysToISO(iso, shiftDays) : null;
  return {
    ...result,
    predictedStartISO: shift(result.predictedStartISO),
    windowStartISO: shift(result.windowStartISO),
    windowEndISO: shift(result.windowEndISO),
    nextOvulationWindowISO: shift(result.nextOvulationWindowISO),
    biasAppliedDays: shiftDays,
    label: result.label + ` (bias ${shiftDays > 0 ? "+" : ""}${shiftDays}d)`,
  };
}

// ─── result builder ───────────────────────────────────────────────────────────

interface BuildResultInput extends PcosFields, EndoFields {
  mean: number;
  stdDev: number;
  confidence: number;
  model: PredictionResult["model"];
  label: string;
  latestStart: string | null;
  mae: number | null;
  outlierFlagged: boolean;
  trendDirection: PredictionResult["trendDirection"];
  regimeChangeDetected: boolean;
  lateArrivalP90: number | null;
}

function buildResult(r: BuildResultInput): PredictionResult {
  const roundedMean = Math.round(r.mean);
  const roundedSd   = Math.round(r.stdDev);
  const roundedConf = Math.round(r.confidence * 100) / 100;

  let predictedStartISO: string | null = null;
  let windowStartISO: string | null = null;
  let windowEndISO: string | null = null;
  let nextOvulationWindowISO: string | null = null;

  if (r.latestStart) {
    predictedStartISO      = addDaysToISO(r.latestStart, roundedMean);
    windowStartISO         = addDaysToISO(r.latestStart, roundedMean - roundedSd);
    windowEndISO           = addDaysToISO(r.latestStart, roundedMean + roundedSd);
    nextOvulationWindowISO = addDaysToISO(
      r.latestStart,
      roundedMean - LUTEAL_PHASE_DAYS - OVULATION_WINDOW_LEAD_DAYS,
    );
  }

  return {
    mean: roundedMean, stdDev: roundedSd, confidence: roundedConf,
    model: r.model, label: r.label,
    predictedStartISO, windowStartISO, windowEndISO,
    mae: r.mae, outlierFlagged: r.outlierFlagged,
    trendDirection: r.trendDirection,
    regimeChangeDetected: r.regimeChangeDetected,
    lateArrivalP90: r.lateArrivalP90,
    nextOvulationWindowISO,
    biasAppliedDays: 0,
    irregularFlag: r.irregularFlag,
    longestRecentCycle: r.longestRecentCycle,
    daysSinceLastPeriod: r.daysSinceLastPeriod,
    cycleVariability: r.cycleVariability,
    pcosCyclePattern: r.pcosCyclePattern,
    amenorrheaFlag: r.amenorrheaFlag,
    predictedOvulationDay: r.predictedOvulationDay,
    widePredictionWindow: r.widePredictionWindow,
    inStressFlareWindow: r.inStressFlareWindow,
    flareRiskWindowStart: r.flareRiskWindowStart,
    ovulationPainDay: r.ovulationPainDay,
    currentCycleDay: r.currentCycleDay,
    inFlareRiskWindow: r.inFlareRiskWindow,
    periodLengthAvg: r.periodLengthAvg,
  };
}
