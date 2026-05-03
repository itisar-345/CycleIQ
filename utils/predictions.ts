/**
 * CycleIQ — On-Device Prediction Engine v3
 *
 * Tier 1 (< 2 cycles)  : No prediction.
 * Tier 2 (2–4 cycles)  : Bayesian prior blend + IQR window.
 * Tier 3 (5–11 cycles) : Adaptive EW mean + trend + MAE floor.
 * Tier 4 (12+ cycles)  : Full rules — regime detection, real seasonality,
 *                        outlier trimming, P90 late-arrival, MAE tracking.
 *
 * Condition priors widen stdDev for PCOS / peri.
 * Post-pill suppresses predictions for 90 days.
 */

export interface PredictionResult {
  mean: number;
  stdDev: number;
  confidence: number;
  model: "none" | "rule-based" | "weighted-average" | "full-rules";
  label: string;
  predictedStartISO: string | null;
  windowStartISO: string | null;
  windowEndISO: string | null;
  mae: number | null;
  outlierFlagged: boolean;
  /** "lengthening" | "shortening" | "stable" */
  trendDirection: "lengthening" | "shortening" | "stable";
  /** True when recent 3 cycles diverge >5d from long-run mean — model down-weights history */
  regimeChangeDetected: boolean;
  /** 90th-percentile late-arrival day — PCOS: when to expect the latest plausible period */
  lateArrivalP90: number | null;
  /** ISO date of predicted ovulation window open (mean - 16d from predicted start) */
  nextOvulationWindowISO: string | null;

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

// ─── helpers ─────────────────────────────────────────────────────────────────

const addDaysToISO = (iso: string, days: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString();
};

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

const iqr = (arr: number[]): number => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length * 0.75)] - s[Math.floor(s.length * 0.25)];
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
  const s = [...arr].sort((a, b) => a - b);
  const q1 = s[Math.floor(s.length * 0.25)];
  const q3 = s[Math.floor(s.length * 0.75)];
  const fence = 1.5 * (q3 - q1);
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

const computeMAE = (lengths: number[]): number | null => {
  if (lengths.length < 3) return null;
  let total = 0;
  for (let i = 1; i < lengths.length; i++) {
    total += Math.abs(lengths[i - 1] - median(lengths.slice(i)));
  }
  return Math.round((total / (lengths.length - 1)) * 10) / 10;
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

/**
 * Real calendar-quarter seasonality using actual start_dates.
 * Groups cycles by Q1/Q2/Q3/Q4 and returns the mean for the current quarter.
 * Falls back to overall mean when fewer than 2 same-quarter cycles exist.
 */
const computeSeasonalAdjustment = (
  cycles: any[],
  lengths: number[],
  fallback: number
): number => {
  if (lengths.length < 8) return fallback;
  const currentQ = Math.floor(new Date().getMonth() / 3);
  const sameBucket = cycles
    .filter((c) => c.start_date && Math.floor(new Date(c.start_date).getMonth() / 3) === currentQ)
    .map((c) => c.cycle_length)
    .filter((l): l is number => typeof l === "number" && l > 0);
  return sameBucket.length >= 2 ? mean(sameBucket) : fallback;
};

// ─── condition priors ─────────────────────────────────────────────────────────

interface ConditionPrior {
  /** Bayesian prior mean for cycle length */
  priorMean: number;
  /** Weight of prior vs data (0–1). Higher = prior dominates at low n */
  priorWeight: number;
  minStdDev: number;
  stdDevMultiplier: number;
  confidencePenalty: number;
  outlierThreshold: number;
}

const CONDITION_PRIORS: Record<string, ConditionPrior> = {
  standard: { priorMean: 28, priorWeight: 0.3, minStdDev: 2,  stdDevMultiplier: 1.0, confidencePenalty: 0,    outlierThreshold: 45  },
  teen:     { priorMean: 30, priorWeight: 0.4, minStdDev: 4,  stdDevMultiplier: 1.3, confidencePenalty: 0.05, outlierThreshold: 60  },
  pcos:     { priorMean: 35, priorWeight: 0.5, minStdDev: 7,  stdDevMultiplier: 1.6, confidencePenalty: 0.10, outlierThreshold: 120 },
  endo:     { priorMean: 28, priorWeight: 0.3, minStdDev: 3,  stdDevMultiplier: 1.1, confidencePenalty: 0.03, outlierThreshold: 50  },
  peri:     { priorMean: 32, priorWeight: 0.5, minStdDev: 10, stdDevMultiplier: 1.8, confidencePenalty: 0.15, outlierThreshold: 150 },
};

const getPrior = (mode: string): ConditionPrior =>
  CONDITION_PRIORS[mode] ?? CONDITION_PRIORS.standard;

// ─── post-pill suppression ────────────────────────────────────────────────────

const isPostPillSuppressed = (
  postPillMode: boolean,
  postPillStartDate: string | null
): { suppressed: boolean; daysRemaining: number } => {
  if (!postPillMode || !postPillStartDate) return { suppressed: false, daysRemaining: 0 };
  const elapsed = Math.floor((Date.now() - new Date(postPillStartDate).getTime()) / 86400000);
  const remaining = Math.max(0, 90 - elapsed);
  return { suppressed: remaining > 0, daysRemaining: remaining };
};

// ─── null result factory ──────────────────────────────────────────────────────

const nullResult = (label: string): PredictionResult => ({
  mean: 28, stdDev: 0, confidence: 0, model: "none", label,
  predictedStartISO: null, windowStartISO: null, windowEndISO: null,
  mae: null, outlierFlagged: false,
  trendDirection: "stable", regimeChangeDetected: false,
  lateArrivalP90: null, nextOvulationWindowISO: null,
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

function computePcosFields(lengths: number[], latestStartDate: string | null): PcosFields {
  if (lengths.length < 2) {
    return {
      irregularFlag: false, longestRecentCycle: null, daysSinceLastPeriod: null,
      cycleVariability: null, pcosCyclePattern: null, amenorrheaFlag: false,
      predictedOvulationDay: null, widePredictionWindow: false, inStressFlareWindow: false,
    };
  }
  const cv = stdDev(lengths);
  const meanLen = mean(lengths);
  const med = median(lengths);
  const daysSince = latestStartDate
    ? Math.floor((Date.now() - new Date(latestStartDate).getTime()) / 86400000)
    : null;
  const irregularFlag = cv > 7;
  const pcosCyclePattern: PredictionResult["pcosCyclePattern"] =
    med > 35 ? "oligomenorrhea" : irregularFlag ? "irregular" : "regular";
  const predictedOvulationDay = Math.max(10, Math.round(meanLen - 18));
  const stressWindowDay = Math.max(7, Math.round(meanLen - 14));
  return {
    irregularFlag,
    longestRecentCycle: Math.max(...lengths.slice(0, 6)),
    daysSinceLastPeriod: daysSince,
    cycleVariability: Math.round(cv * 10) / 10,
    pcosCyclePattern,
    amenorrheaFlag: daysSince !== null && daysSince >= 90,
    predictedOvulationDay,
    widePredictionWindow: cv >= 7,
    inStressFlareWindow: daysSince !== null && daysSince >= stressWindowDay,
  };
}

function computeEndoFields(cycles: any[], lengths: number[], latestStartDate: string | null): EndoFields {
  if (lengths.length < 2) {
    return {
      flareRiskWindowStart: null, ovulationPainDay: null,
      currentCycleDay: null, inFlareRiskWindow: false, periodLengthAvg: null,
    };
  }
  const meanLen = Math.round(mean(lengths));
  const flareRiskWindowStart = meanLen - 7;
  const ovulationPainDay = meanLen - 14;
  const currentCycleDay = latestStartDate
    ? Math.floor((Date.now() - new Date(latestStartDate).getTime()) / 86400000) + 1
    : null;
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

// ─── engine input ─────────────────────────────────────────────────────────────

export interface PredictionEngineInput {
  cycles: any[];
  currentMode: string;
  postPillMode?: boolean;
  postPillStartDate?: string | null;
  biasCorrection?: number;
}

// ─── main engine ─────────────────────────────────────────────────────────────

export function runPredictionEngine(input: PredictionEngineInput): PredictionResult {
  const { cycles, currentMode, postPillMode = false, postPillStartDate = null, biasCorrection = 0 } = input;
  const prior = getPrior(currentMode);

  const { suppressed, daysRemaining } = isPostPillSuppressed(postPillMode, postPillStartDate);
  if (suppressed) return nullResult(`Building baseline — ${daysRemaining} days until predictions unlock.`);

  const lengths: number[] = cycles
    .map((c) => c.cycle_length)
    .filter((l): l is number => typeof l === "number" && l > 0 && l <= 365);

  const latestStartDate: string | null = cycles[0]?.start_date ?? null;

  if (lengths.length < 2) return nullResult("Log 2+ cycles to unlock predictions.");

  const mae = computeMAE(lengths);
  const pcosFields = computePcosFields(lengths, latestStartDate);
  const endoFields = computeEndoFields(cycles, lengths, latestStartDate);

  if (lengths.length < 5)
    return applyBias(ruleTier2(lengths, latestStartDate, prior, mae, pcosFields, endoFields), biasCorrection);
  if (lengths.length < 12)
    return applyBias(ruleTier3(lengths, latestStartDate, prior, mae, pcosFields, endoFields), biasCorrection);
  return applyBias(ruleTier4(cycles, lengths, latestStartDate, prior, mae, pcosFields, endoFields), biasCorrection);
}

// ─── Tier 2: Bayesian prior blend ────────────────────────────────────────────

function ruleTier2(
  lengths: number[],
  latestStart: string | null,
  prior: ConditionPrior,
  mae: number | null,
  pcosFields: PcosFields,
  endoFields: EndoFields
): PredictionResult {
  const n = lengths.length;
  // Bayesian blend: weight prior by priorWeight, data by (1 - priorWeight) scaled by n
  const dataWeight = (1 - prior.priorWeight) * Math.min(n / 4, 1);
  const priorW = 1 - dataWeight;
  const blendedMean = priorW * prior.priorMean + dataWeight * median(lengths);

  const spread = Math.max(iqr(lengths), prior.minStdDev);
  const sd = Math.max(spread / 1.35, prior.minStdDev);
  const confidence = Math.max(0.45 - prior.confidencePenalty, 0.3);

  return buildResult({
    mean: blendedMean, stdDev: sd, confidence,
    model: "rule-based",
    label: `Bayesian blend (${n} cycles) — window ±${Math.round(sd)}d`,
    latestStart, mae, outlierFlagged: false,
    trendDirection: "stable", regimeChangeDetected: false,
    lateArrivalP90: lengths.length >= 2 ? Math.round(percentile(lengths, 0.9)) : null,
    ...pcosFields, ...endoFields,
  });
}

// ─── Tier 3: Adaptive EW mean + trend + MAE floor ────────────────────────────

function ruleTier3(
  lengths: number[],
  latestStart: string | null,
  prior: ConditionPrior,
  mae: number | null,
  pcosFields: PcosFields,
  endoFields: EndoFields
): PredictionResult {
  // Adaptive decay: higher variability → faster decay (trust recent more)
  const cv = stdDev(lengths) / mean(lengths);
  const decay = Math.min(0.1 + cv * 0.4, 0.4);
  const wAvg = ewMean(lengths, decay);

  const slope = trendSlope([...lengths].reverse());
  const trendAdjusted = wAvg + slope * 0.5;

  const residuals = lengths.map((l) => Math.abs(l - wAvg));
  let sd = Math.max(mean(residuals) * 1.25 * prior.stdDevMultiplier, prior.minStdDev);
  // MAE floor: stdDev should be at least as wide as our historical error
  if (mae !== null) sd = Math.max(sd, mae);

  const cvFinal = sd / trendAdjusted;
  const confidence = Math.max(0.72 - cvFinal * 0.8 - prior.confidencePenalty, 0.35);
  const outlierFlagged = prior.outlierThreshold > 0 && lengths[0] > prior.outlierThreshold;
  const trendDirection: PredictionResult["trendDirection"] =
    slope > 0.5 ? "lengthening" : slope < -0.5 ? "shortening" : "stable";

  return buildResult({
    mean: trendAdjusted, stdDev: sd, confidence,
    model: "weighted-average",
    label: `Adaptive weighted avg (${lengths.length} cycles)${slope > 0.5 ? " — lengthening" : slope < -0.5 ? " — shortening" : ""}`,
    latestStart, mae, outlierFlagged,
    trendDirection, regimeChangeDetected: false,
    lateArrivalP90: Math.round(percentile(lengths, 0.9)),
    ...pcosFields, ...endoFields,
  });
}

// ─── Tier 4: Full rules ───────────────────────────────────────────────────────

function ruleTier4(
  cycles: any[],
  lengths: number[],
  latestStart: string | null,
  prior: ConditionPrior,
  mae: number | null,
  pcosFields: PcosFields,
  endoFields: EndoFields
): PredictionResult {
  const regimeChange = detectRegimeChange(lengths);

  // When regime change detected, down-weight history: use only recent 6 cycles
  const workingLengths = regimeChange ? lengths.slice(0, 6) : lengths;
  const { trimmed, removed } = trimOutliers([...workingLengths]);
  const workingSet = trimmed.length >= 4 ? trimmed : workingLengths;

  // Adaptive decay: higher variability → trust recent more
  const cv = stdDev(workingSet) / mean(workingSet);
  const decay = Math.min(0.1 + cv * 0.3, 0.35);
  const wAvg = ewMean(workingSet, decay);

  // Trend from last 6 (oldest-first)
  const slope = trendSlope([...workingSet.slice(0, 6)].reverse());
  const trendAdjusted = wAvg + slope * 0.4;

  // Real calendar-quarter seasonality
  const seasonalAdj = computeSeasonalAdjustment(cycles, lengths, trendAdjusted);
  const finalMean = trendAdjusted * 0.8 + seasonalAdj * 0.2;

  let sd = Math.max(stdDev(workingSet, wAvg) * prior.stdDevMultiplier, prior.minStdDev);
  if (mae !== null) sd = Math.max(sd, mae * 0.9);

  const cvFinal = sd / finalMean;
  const outlierPenalty = removed > 2 ? 0.05 : 0;
  const regimePenalty = regimeChange ? 0.08 : 0;
  const confidence = Math.max(
    0.88 - cvFinal * 0.9 - prior.confidencePenalty - outlierPenalty - regimePenalty,
    0.35
  );

  const outlierFlagged = prior.outlierThreshold > 0 && lengths[0] > prior.outlierThreshold;
  const trendDirection: PredictionResult["trendDirection"] =
    slope > 1 ? "lengthening" : slope < -1 ? "shortening" : "stable";
  const lateArrivalP90 = Math.round(percentile(lengths, 0.9));

  const trendLabel = slope > 1 ? " — cycles lengthening" : slope < -1 ? " — cycles shortening" : "";
  const outlierNote = removed > 0 ? ` (${removed} outlier${removed > 1 ? "s" : ""} trimmed)` : "";
  const regimeNote = regimeChange ? " ⚡ pattern shift detected" : "";

  return buildResult({
    mean: finalMean, stdDev: sd, confidence,
    model: "full-rules",
    label: `Full engine (${lengths.length} cycles)${trendLabel}${outlierNote}${regimeNote}`,
    latestStart, mae, outlierFlagged,
    trendDirection, regimeChangeDetected: regimeChange,
    lateArrivalP90,
    ...pcosFields, ...endoFields,
  });
}

// ─── bias correction ──────────────────────────────────────────────────────────

function applyBias(result: PredictionResult, biasDays: number): PredictionResult {
  if (biasDays === 0 || result.model === "none") return result;
  const shift = (iso: string | null) => iso ? addDaysToISO(iso, biasDays) : null;
  return {
    ...result,
    predictedStartISO: shift(result.predictedStartISO),
    windowStartISO: shift(result.windowStartISO),
    windowEndISO: shift(result.windowEndISO),
    nextOvulationWindowISO: shift(result.nextOvulationWindowISO),
    label: result.label + ` (bias ${biasDays > 0 ? "+" : ""}${biasDays}d)`,
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
    // Ovulation window opens ~16 days before predicted period start
    nextOvulationWindowISO = addDaysToISO(r.latestStart, roundedMean - 16);
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

// ─── legacy shim ──────────────────────────────────────────────────────────────

export interface PredictionStats {
  mean: number;
  stdDev: number;
  confidence: number;
  model: "none" | "rule-based" | "gpr";
}

/** @deprecated Use runPredictionEngine directly. */
export function computeCyclePrediction(
  cycles: any[],
  currentMode: string,
  postPillMode = false,
  postPillStartDate: string | null = null
): PredictionStats {
  const r = runPredictionEngine({ cycles, currentMode, postPillMode, postPillStartDate });
  return {
    mean: r.mean, stdDev: r.stdDev, confidence: r.confidence,
    model: r.model === "none" ? "none"
         : r.model === "full-rules" || r.model === "weighted-average" ? "gpr"
         : "rule-based",
  };
}
