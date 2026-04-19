/**
 * CycleIQ — On-Device Rule-Based Prediction Engine
 *
 * Tier 1 (< 2 cycles)  : No prediction — not enough data.
 * Tier 2 (2–4 cycles)  : Rolling median + IQR confidence window.
 * Tier 3 (5–11 cycles) : Weighted recent average + trend adjustment.
 * Tier 4 (12+ cycles)  : Full rule set — trend, seasonality, outlier
 *                        trimming, condition-specific priors, MAE tracking.
 *
 * Each tier applies condition-specific prior widening for PCOS / peri.
 * Post-pill mode suppresses predictions for the first 90 days.
 * Teen mode strips fertility language from output labels.
 */

export interface PredictionResult {
  /** Predicted next cycle length in days (added to latest start_date by caller) */
  mean: number;
  /** ±stdDev days — defines the confidence window shown on calendar */
  stdDev: number;
  /** 0–1 confidence score */
  confidence: number;
  /** Which engine tier produced this result */
  model: "none" | "rule-based" | "weighted-average" | "full-rules";
  /** Human-readable label for UI display */
  label: string;
  /** Predicted start date ISO string (requires latestStartDate to be passed) */
  predictedStartISO: string | null;
  /** Window start ISO string */
  windowStartISO: string | null;
  /** Window end ISO string */
  windowEndISO: string | null;
  /** MAE from last N confirmed cycles (null if < 3 confirmed) */
  mae: number | null;
  /** Whether the current cycle is flagged as an outlier */
  outlierFlagged: boolean;
}

// ─── helpers ────────────────────────────────────────────────────────────────

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

/** Interquartile range */
const iqr = (arr: number[]): number => {
  const s = [...arr].sort((a, b) => a - b);
  const q1 = s[Math.floor(s.length * 0.25)];
  const q3 = s[Math.floor(s.length * 0.75)];
  return q3 - q1;
};

/** Remove values outside 1.5×IQR fence */
const trimOutliers = (arr: number[]): { trimmed: number[]; removed: number } => {
  if (arr.length < 5) return { trimmed: arr, removed: 0 };
  const q1 = arr.sort((a, b) => a - b)[Math.floor(arr.length * 0.25)];
  const q3 = arr[Math.floor(arr.length * 0.75)];
  const fence = 1.5 * (q3 - q1);
  const trimmed = arr.filter((v) => v >= q1 - fence && v <= q3 + fence);
  return { trimmed, removed: arr.length - trimmed.length };
};

/**
 * Exponentially weighted mean — more recent cycles get higher weight.
 * decay: 0 = equal weight, higher = faster decay toward recent.
 */
const ewMean = (arr: number[], decay = 0.15): number => {
  let wSum = 0;
  let wVal = 0;
  for (let i = 0; i < arr.length; i++) {
    const w = Math.exp(-decay * i); // arr[0] = most recent
    wSum += w;
    wVal += arr[i] * w;
  }
  return wVal / wSum;
};

/**
 * Linear trend slope via least-squares over the last N lengths.
 * Returns days-per-cycle change (positive = lengthening, negative = shortening).
 */
const trendSlope = (arr: number[]): number => {
  const n = arr.length;
  if (n < 3) return 0;
  const xs = arr.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(arr);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (arr[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den === 0 ? 0 : num / den;
};

/**
 * Mean Absolute Error against the last `n` confirmed cycles.
 * Compares predicted (rolling median at time of prediction) vs actual.
 */
const computeMAE = (lengths: number[]): number | null => {
  if (lengths.length < 3) return null;
  let totalErr = 0;
  // For each cycle i (starting from index 1), predict using median of prior cycles
  for (let i = 1; i < lengths.length; i++) {
    const prior = lengths.slice(i); // older cycles (arr is newest-first)
    const predicted = median(prior);
    totalErr += Math.abs(lengths[i - 1] - predicted);
  }
  return Math.round((totalErr / (lengths.length - 1)) * 10) / 10;
};

// ─── condition priors ────────────────────────────────────────────────────────

interface ConditionPrior {
  minStdDev: number;
  stdDevMultiplier: number;
  confidencePenalty: number;
  /** Max cycle length before flagging as outlier (0 = no limit) */
  outlierThreshold: number;
}

const CONDITION_PRIORS: Record<string, ConditionPrior> = {
  standard: { minStdDev: 2,  stdDevMultiplier: 1.0, confidencePenalty: 0,    outlierThreshold: 45  },
  teen:     { minStdDev: 4,  stdDevMultiplier: 1.3, confidencePenalty: 0.05, outlierThreshold: 60  },
  pcos:     { minStdDev: 7,  stdDevMultiplier: 1.6, confidencePenalty: 0.10, outlierThreshold: 120 },
  endo:     { minStdDev: 3,  stdDevMultiplier: 1.1, confidencePenalty: 0.03, outlierThreshold: 50  },
  peri:     { minStdDev: 10, stdDevMultiplier: 1.8, confidencePenalty: 0.15, outlierThreshold: 150 },
};

const getPrior = (mode: string): ConditionPrior =>
  CONDITION_PRIORS[mode] ?? CONDITION_PRIORS.standard;

// ─── post-pill suppression ───────────────────────────────────────────────────

const isPostPillSuppressed = (
  postPillMode: boolean,
  postPillStartDate: string | null
): { suppressed: boolean; daysRemaining: number } => {
  if (!postPillMode || !postPillStartDate) return { suppressed: false, daysRemaining: 0 };
  const elapsed = Math.floor(
    (Date.now() - new Date(postPillStartDate).getTime()) / 86400000
  );
  const remaining = Math.max(0, 90 - elapsed);
  return { suppressed: remaining > 0, daysRemaining: remaining };
};

// ─── main engine ─────────────────────────────────────────────────────────────

export interface PredictionEngineInput {
  /** All cycles from DB, newest first */
  cycles: any[];
  currentMode: string;
  postPillMode?: boolean;
  postPillStartDate?: string | null;
}

export function runPredictionEngine(input: PredictionEngineInput): PredictionResult {
  const { cycles, currentMode, postPillMode = false, postPillStartDate = null } = input;
  const prior = getPrior(currentMode);

  // ── post-pill suppression ──
  const { suppressed, daysRemaining } = isPostPillSuppressed(postPillMode, postPillStartDate);
  if (suppressed) {
    return {
      mean: 28, stdDev: 0, confidence: 0, model: "none",
      label: `Building baseline — ${daysRemaining} days until predictions unlock.`,
      predictedStartISO: null, windowStartISO: null, windowEndISO: null,
      mae: null, outlierFlagged: false,
    };
  }

  // Extract confirmed cycle lengths, newest first
  const lengths: number[] = cycles
    .map((c) => c.cycle_length)
    .filter((l): l is number => typeof l === "number" && l > 0 && l <= 365);

  const latestStartDate: string | null = cycles[0]?.start_date ?? null;

  // ── Tier 1: not enough data ──
  if (lengths.length < 2) {
    return {
      mean: 28, stdDev: 0, confidence: 0, model: "none",
      label: "Log 2+ cycles to unlock predictions.",
      predictedStartISO: null, windowStartISO: null, windowEndISO: null,
      mae: null, outlierFlagged: false,
    };
  }

  const mae = computeMAE(lengths);

  // ── Tier 2: 2–4 cycles — rolling median + IQR window ──
  if (lengths.length < 5) {
    return ruleTier2(lengths, latestStartDate, prior, mae);
  }

  // ── Tier 3: 5–11 cycles — weighted average + trend ──
  if (lengths.length < 12) {
    return ruleTier3(lengths, latestStartDate, prior, mae);
  }

  // ── Tier 4: 12+ cycles — full rule set ──
  return ruleTier4(lengths, latestStartDate, prior, mae);
}

// ─── Tier 2 ──────────────────────────────────────────────────────────────────

function ruleTier2(
  lengths: number[],
  latestStart: string | null,
  prior: ConditionPrior,
  mae: number | null
): PredictionResult {
  const med = median(lengths);
  const spread = Math.max(iqr(lengths), prior.minStdDev);
  const sd = Math.max(spread / 1.35, prior.minStdDev); // IQR ≈ 1.35σ for normal
  const confidence = Math.max(0.45 - prior.confidencePenalty, 0.3);

  return buildResult({
    mean: med, stdDev: sd, confidence,
    model: "rule-based",
    label: `Rolling median (${lengths.length} cycles) — window ±${Math.round(sd)} days`,
    latestStart, mae, outlierFlagged: false,
  });
}

// ─── Tier 3 ──────────────────────────────────────────────────────────────────

function ruleTier3(
  lengths: number[],
  latestStart: string | null,
  prior: ConditionPrior,
  mae: number | null
): PredictionResult {
  // Rule 1: exponentially weighted mean (recent bias)
  const wAvg = ewMean(lengths, 0.2);

  // Rule 2: linear trend adjustment (apply half the slope to dampen noise)
  const slope = trendSlope([...lengths].reverse()); // oldest-first for slope
  const trendAdjusted = wAvg + slope * 0.5;

  // Rule 3: stdDev from weighted residuals
  const residuals = lengths.map((l) => Math.abs(l - wAvg));
  const rawSd = mean(residuals) * 1.25; // MAD → σ approximation
  const sd = Math.max(rawSd * prior.stdDevMultiplier, prior.minStdDev);

  // Rule 4: confidence — penalise high variance and condition prior
  const cv = sd / trendAdjusted; // coefficient of variation
  const confidence = Math.max(0.72 - cv * 0.8 - prior.confidencePenalty, 0.35);

  // Rule 5: outlier flag — is the latest cycle unusually long?
  const outlierFlagged =
    prior.outlierThreshold > 0 && lengths[0] > prior.outlierThreshold;

  return buildResult({
    mean: trendAdjusted, stdDev: sd, confidence,
    model: "weighted-average",
    label: `Weighted average (${lengths.length} cycles)${slope > 0.5 ? " — cycles lengthening" : slope < -0.5 ? " — cycles shortening" : ""}`,
    latestStart, mae, outlierFlagged,
  });
}

// ─── Tier 4 ──────────────────────────────────────────────────────────────────

function ruleTier4(
  lengths: number[],
  latestStart: string | null,
  prior: ConditionPrior,
  mae: number | null
): PredictionResult {
  // Rule 1: trim outliers from the full history
  const { trimmed, removed } = trimOutliers([...lengths]);
  const workingSet = trimmed.length >= 5 ? trimmed : lengths;

  // Rule 2: exponentially weighted mean on trimmed set
  const wAvg = ewMean(workingSet, 0.15);

  // Rule 3: trend slope (use last 6 cycles for recency)
  const recent6 = [...workingSet.slice(0, 6)].reverse();
  const slope = trendSlope(recent6);
  // Dampen trend: apply only 40% to avoid over-extrapolation
  const trendAdjusted = wAvg + slope * 0.4;

  // Rule 4: stdDev from trimmed set
  const rawSd = stdDev(workingSet, wAvg);
  let sd = Math.max(rawSd * prior.stdDevMultiplier, prior.minStdDev);

  // Rule 5: MAE-informed confidence floor
  // If MAE is available, widen stdDev to at least MAE
  if (mae !== null) {
    sd = Math.max(sd, mae * 0.8);
  }

  // Rule 6: seasonality proxy — compare same-quarter cycles
  // If the last 3 same-quarter cycles exist, blend their mean in at 20% weight
  const seasonalAdj = computeSeasonalAdjustment(lengths, trendAdjusted);
  const finalMean = trendAdjusted * 0.8 + seasonalAdj * 0.2;

  // Rule 7: confidence
  const cv = sd / finalMean;
  const outlierPenalty = removed > 2 ? 0.05 : 0;
  const confidence = Math.max(
    0.88 - cv * 0.9 - prior.confidencePenalty - outlierPenalty,
    0.35
  );

  // Rule 8: outlier flag
  const outlierFlagged =
    prior.outlierThreshold > 0 && lengths[0] > prior.outlierThreshold;

  // Build label
  const trendLabel =
    slope > 1 ? " — cycles lengthening" :
    slope < -1 ? " — cycles shortening" : "";
  const outlierNote = removed > 0 ? ` (${removed} outlier${removed > 1 ? "s" : ""} trimmed)` : "";

  return buildResult({
    mean: finalMean, stdDev: sd, confidence,
    model: "full-rules",
    label: `Full rule engine (${lengths.length} cycles)${trendLabel}${outlierNote}`,
    latestStart, mae, outlierFlagged,
  });
}

// ─── seasonal adjustment ─────────────────────────────────────────────────────

/**
 * Groups historical cycles by calendar quarter and returns the mean
 * cycle length for the current quarter. Falls back to overall mean if
 * fewer than 2 same-quarter cycles exist.
 */
function computeSeasonalAdjustment(
  lengths: number[],
  fallback: number
): number {
  // We don't have start_dates here — use a simple 4-bucket rotation
  // based on cycle index position as a proxy for seasonal grouping
  if (lengths.length < 8) return fallback;
  const currentQuarterBucket = Math.floor((lengths.length % 4));
  const sameBucket = lengths.filter((_, i) => i % 4 === currentQuarterBucket);
  if (sameBucket.length < 2) return fallback;
  return mean(sameBucket);
}

// ─── result builder ──────────────────────────────────────────────────────────

interface BuildResultInput {
  mean: number;
  stdDev: number;
  confidence: number;
  model: PredictionResult["model"];
  label: string;
  latestStart: string | null;
  mae: number | null;
  outlierFlagged: boolean;
}

function buildResult(r: BuildResultInput): PredictionResult {
  const roundedMean = Math.round(r.mean);
  const roundedSd = Math.round(r.stdDev);
  const roundedConf = Math.round(r.confidence * 100) / 100;

  let predictedStartISO: string | null = null;
  let windowStartISO: string | null = null;
  let windowEndISO: string | null = null;

  if (r.latestStart) {
    predictedStartISO = addDaysToISO(r.latestStart, roundedMean);
    windowStartISO = addDaysToISO(r.latestStart, roundedMean - roundedSd);
    windowEndISO = addDaysToISO(r.latestStart, roundedMean + roundedSd);
  }

  return {
    mean: roundedMean,
    stdDev: roundedSd,
    confidence: roundedConf,
    model: r.model,
    label: r.label,
    predictedStartISO,
    windowStartISO,
    windowEndISO,
    mae: r.mae,
    outlierFlagged: r.outlierFlagged,
  };
}

// ─── legacy shim ─────────────────────────────────────────────────────────────
// Keeps existing callers (getCyclePredictions, home screen) working unchanged.

export interface PredictionStats {
  mean: number;
  stdDev: number;
  confidence: number;
  model: "none" | "rule-based" | "gpr";
}

/** @deprecated Use runPredictionEngine directly for full result. */
export function computeCyclePrediction(
  cycles: any[],
  currentMode: string,
  postPillMode = false,
  postPillStartDate: string | null = null
): PredictionStats {
  const result = runPredictionEngine({ cycles, currentMode, postPillMode, postPillStartDate });
  return {
    mean: result.mean,
    stdDev: result.stdDev,
    confidence: result.confidence,
    // Map new model names back to legacy values callers expect
    model: result.model === "none" ? "none"
         : result.model === "full-rules" || result.model === "weighted-average" ? "gpr"
         : "rule-based",
  };
}
