/**
 * CycleIQ — On-Device Prediction Engine v5
 *
 * Input: cycles newest-first. cycles[0] is the current (in-progress) cycle; its
 * cycle_length is ignored. Every other confirmed cycle contributes its completed length.
 * Unconfirmed cycles (the onboarding estimate) are the user's *reported* typical length:
 * they set the prior instead of counting as an observed cycle.
 *
 * The forecast comes from a Bayesian local-level model (utils/cycleModel.ts) whose prior
 * depends on the mode. Its predictive distribution gives the date, the 80% window and
 * the confidence (chance of landing within ±2 days), so the three always agree. The
 * "past guesses were off by" figure is an honest walk-forward check on the user's own
 * history.
 *
 * There is no separate feedback "bias correction": the model already adapts to each new
 * cycle, and shifting dates by past errors on top of that made backtests worse.
 *
 * Post-pill suppresses predictions for 90 days.
 */
import { forecastNextCycle, pointForecast, type ModelPrior } from "./cycleModel";
import {
  computeEndoFields,
  computePcosFields,
  daysBetween,
  EMPTY_ENDO_FIELDS,
  EMPTY_PCOS_FIELDS,
  LUTEAL_PHASE_DAYS,
  mean,
  type EndoFields,
  type PcosFields,
} from "./conditionSignals";

export { LUTEAL_PHASE_DAYS } from "./conditionSignals";

/** Stored with every saved prediction so the audit trail says which engine made it. */
export const PREDICTION_MODEL_VERSION = "cycleiq-prediction-v5";

export interface PredictionResult {
  mean: number;
  /** Half-width of the prediction window in days (window = mean ± stdDev). */
  stdDev: number;
  /** Probability the period starts within ±2 days of the predicted date. */
  confidence: number;
  /** prior = reported length only · learning = 1–2 logged cycles · personal = 3+ */
  model: "none" | "prior" | "learning" | "personal";
  label: string;
  predictedStartISO: string | null;
  windowStartISO: string | null;
  windowEndISO: string | null;
  /** Mean absolute error (days) of this engine in a walk-forward backtest on the user's history. */
  mae: number | null;
  outlierFlagged: boolean;
  trendDirection: "lengthening" | "shortening" | "stable";
  /** True when the recent 3 cycles diverge >5d from the older ones. */
  regimeChangeDetected: boolean;
  /** 90th-percentile of the predicted length — PCOS: latest plausible arrival */
  lateArrivalP90: number | null;
  /** ISO date the estimated ovulation window opens (2 days before estimated ovulation) */
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

/** The ovulation window is shown as opening this many days before estimated ovulation. */
const OVULATION_WINDOW_LEAD_DAYS = 2;
const POST_PILL_BASELINE_DAYS = 90;
const MAX_BACKTEST_STEPS = 12;
/** A fitted trend at least this steep (days per cycle) is mentioned in the label. */
const TREND_LABEL_DAYS = 0.2;
/** How sure we are of a remembered cycle length (days, 1 sd). */
const REPORTED_LENGTH_SD = 3;

// ─── condition priors ─────────────────────────────────────────────────────────

interface ConditionPrior {
  /** Typical cycle length for this group, and how much individuals differ from it. */
  levelMean: number;
  levelSd: number;
  /** Typical cycle-to-cycle variation within one person. */
  noiseSd: number;
  /** Narrowest window half-width (days) we'll show, however regular the history. */
  minHalfWidth: number;
  /** A latest cycle longer than this is flagged for the user to check. */
  outlierThreshold: number;
}

const CONDITION_PRIORS: Record<string, ConditionPrior> = {
  standard: { levelMean: 28, levelSd: 4,  noiseSd: 2.5, minHalfWidth: 2,  outlierThreshold: 45  },
  teen:     { levelMean: 30, levelSd: 5,  noiseSd: 5,   minHalfWidth: 4,  outlierThreshold: 60  },
  pcos:     { levelMean: 35, levelSd: 10, noiseSd: 9,   minHalfWidth: 7,  outlierThreshold: 120 },
  pcod:     { levelMean: 32, levelSd: 7,  noiseSd: 6,   minHalfWidth: 5,  outlierThreshold: 90  },
  endo:     { levelMean: 28, levelSd: 4,  noiseSd: 3,   minHalfWidth: 3,  outlierThreshold: 50  },
  peri:     { levelMean: 32, levelSd: 10, noiseSd: 9,   minHalfWidth: 10, outlierThreshold: 150 },
};

const getPrior = (mode: string): ConditionPrior =>
  CONDITION_PRIORS[mode] ?? CONDITION_PRIORS.standard;

const modelPrior = (prior: ConditionPrior, reportedLengths: number[]): ModelPrior =>
  reportedLengths.length > 0
    ? { levelMean: mean(reportedLengths), levelSd: Math.min(prior.levelSd, REPORTED_LENGTH_SD), noiseSd: prior.noiseSd }
    : { levelMean: prior.levelMean, levelSd: prior.levelSd, noiseSd: prior.noiseSd };

// ─── helpers ─────────────────────────────────────────────────────────────────

const addDaysToISO = (iso: string, days: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString();
};

const isValidLength = (value: unknown): value is number =>
  typeof value === "number" && value > 0 && value <= 365;

/** Descriptive: have the last 3 cycles moved more than 5 days from the older ones? */
const detectRegimeChange = (lengthsNewestFirst: number[]): boolean =>
  lengthsNewestFirst.length >= 6 &&
  Math.abs(mean(lengthsNewestFirst.slice(0, 3)) - mean(lengthsNewestFirst.slice(3))) > 5;

/**
 * Re-runs the forecast on each earlier slice of history (only data available at the
 * time) and returns the absolute errors. Each step needs ≥ 2 cycles of history. Cycles
 * the model treats as unusual (mostly missed logs) aren't scored: they say nothing
 * about how good the guesses are.
 */
function walkForwardErrors(lengthsOldestFirst: number[], unusual: boolean[], prior: ModelPrior): number[] {
  const errors: number[] = [];
  const n = lengthsOldestFirst.length;
  for (let j = Math.max(2, n - MAX_BACKTEST_STEPS); j < n; j++) {
    if (unusual[j]) continue;
    errors.push(Math.abs(pointForecast(lengthsOldestFirst.slice(0, j), prior) - lengthsOldestFirst[j]));
  }
  return errors;
}

const describeModel = (observed: number, trend: PredictionResult["trendDirection"], outliers: number) => {
  if (observed === 0) {
    return { model: "prior" as const, label: "Estimate from your reported cycle length — log more cycles to personalise" };
  }
  const base = observed < 3
    ? `Learning your pattern (${observed} cycle${observed > 1 ? "s" : ""})`
    : `Personal model (${observed} cycles)`;
  return {
    model: observed < 3 ? ("learning" as const) : ("personal" as const),
    label: base +
      (trend === "stable" ? "" : ` — cycles ${trend}`) +
      (outliers > 0 ? ` (${outliers} unusual cycle${outliers > 1 ? "s" : ""} down-weighted)` : ""),
  };
};

// ─── null result ─────────────────────────────────────────────────────────────

const nullResult = (label: string): PredictionResult => ({
  mean: 28, stdDev: 0, confidence: 0, model: "none", label,
  predictedStartISO: null, windowStartISO: null, windowEndISO: null,
  mae: null, outlierFlagged: false,
  trendDirection: "stable", regimeChangeDetected: false,
  lateArrivalP90: null, nextOvulationWindowISO: null,
  ...EMPTY_PCOS_FIELDS,
  ...EMPTY_ENDO_FIELDS,
});

// ─── engine input ─────────────────────────────────────────────────────────────

/** The cycle fields the engine reads (a database CycleRow satisfies this). */
export interface CycleInput {
  start_date?: string | null;
  cycle_length?: number | null;
  period_length?: number | null;
  /** 0 = estimated from onboarding answers, not a logged period. */
  is_confirmed?: number | null;
}

export interface PredictionEngineInput {
  /** Newest first. cycles[0] is the in-progress cycle. */
  cycles: CycleInput[];
  currentMode: string;
  postPillMode?: boolean;
  postPillStartDate?: string | null;
  /** Clock override for deterministic tests. Defaults to Date.now(). */
  now?: Date | number;
}

// ─── main engine ─────────────────────────────────────────────────────────────

export function runPredictionEngine(input: PredictionEngineInput): PredictionResult {
  const { cycles, currentMode, postPillMode = false, postPillStartDate = null } = input;
  const now = input.now === undefined ? Date.now() : new Date(input.now).getTime();
  const prior = getPrior(currentMode);

  if (postPillMode && postPillStartDate) {
    const remaining = Math.max(0, POST_PILL_BASELINE_DAYS - daysBetween(postPillStartDate, now));
    if (remaining > 0) return nullResult(`Building baseline — ${remaining} days until predictions unlock.`);
  }

  const latestStartDate: string | null = cycles[0]?.start_date ?? null;
  const completed = cycles.slice(1).filter((c) => isValidLength(c.cycle_length));
  const lengths = completed.filter((c) => c.is_confirmed !== 0).map((c) => c.cycle_length as number);
  const reported = completed.filter((c) => c.is_confirmed === 0).map((c) => c.cycle_length as number);

  if ((lengths.length === 0 && reported.length === 0) || !latestStartDate) {
    return nullResult("Log your next period to unlock predictions.");
  }

  const mp = modelPrior(prior, reported);
  const oldestFirst = [...lengths].reverse();
  const forecast = forecastNextCycle(oldestFirst, mp);
  const errors = walkForwardErrors(oldestFirst, forecast.unusual, mp);

  const trendDirection: PredictionResult["trendDirection"] =
    forecast.slopePerCycle > TREND_LABEL_DAYS ? "lengthening" : forecast.slopePerCycle < -TREND_LABEL_DAYS ? "shortening" : "stable";
  const unusualCount = forecast.unusual.filter(Boolean).length;
  const { model, label } = describeModel(lengths.length, trendDirection, unusualCount);

  // Descriptive condition fields use every length we have, reported ones included.
  const allLengths = lengths.length > 0 ? lengths : reported;
  const meanLength = Math.max(12, Math.min(180, forecast.point));
  const halfWidth = Math.max(forecast.halfWidth, prior.minHalfWidth);

  return {
    mean: meanLength,
    stdDev: halfWidth,
    confidence: Math.round(Math.min(0.95, Math.max(0.1, forecast.hitProbability)) * 100) / 100,
    model,
    label,
    predictedStartISO: addDaysToISO(latestStartDate, meanLength),
    windowStartISO: addDaysToISO(latestStartDate, meanLength - halfWidth),
    windowEndISO: addDaysToISO(latestStartDate, meanLength + halfWidth),
    mae: errors.length >= 3 ? Math.round(mean(errors) * 10) / 10 : null,
    outlierFlagged: lengths.length > 0 && lengths[0] > prior.outlierThreshold,
    trendDirection,
    regimeChangeDetected: detectRegimeChange(lengths),
    lateArrivalP90: allLengths.length >= 2 ? forecast.p90 : null,
    nextOvulationWindowISO: addDaysToISO(latestStartDate, meanLength - LUTEAL_PHASE_DAYS - OVULATION_WINDOW_LEAD_DAYS),
    ...(computePcosFields(allLengths, latestStartDate, now) satisfies PcosFields),
    ...(computeEndoFields(cycles, allLengths, latestStartDate, now) satisfies EndoFields),
  };
}
