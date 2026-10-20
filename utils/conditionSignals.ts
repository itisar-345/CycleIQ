/**
 * Condition-mode signals derived from cycle history (PCOS pattern, endometriosis flare
 * timing). Pure and descriptive — they summarise the data, they don't forecast.
 */
import type { CycleInput, PredictionResult } from "./predictions";

/** Ovulation is estimated this many days before the next period (luteal phase). */
export const LUTEAL_PHASE_DAYS = 14;

const DAY_MS = 86400000;

export const daysBetween = (fromISO: string, now: number): number =>
  Math.floor((now - new Date(fromISO).getTime()) / DAY_MS);

export const mean = (arr: number[]): number => arr.reduce((a, b) => a + b, 0) / arr.length;

const stdDev = (arr: number[]): number => {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
};

const median = (arr: number[]): number => {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
};

export type PcosFields = Pick<PredictionResult,
  "irregularFlag" | "longestRecentCycle" | "daysSinceLastPeriod" | "cycleVariability" |
  "pcosCyclePattern" | "amenorrheaFlag" | "predictedOvulationDay" |
  "widePredictionWindow" | "inStressFlareWindow">;

export type EndoFields = Pick<PredictionResult,
  "flareRiskWindowStart" | "ovulationPainDay" | "currentCycleDay" |
  "inFlareRiskWindow" | "periodLengthAvg">;

export const EMPTY_PCOS_FIELDS: PcosFields = {
  irregularFlag: false, longestRecentCycle: null, daysSinceLastPeriod: null,
  cycleVariability: null, pcosCyclePattern: null, amenorrheaFlag: false,
  predictedOvulationDay: null, widePredictionWindow: false, inStressFlareWindow: false,
};

export const EMPTY_ENDO_FIELDS: EndoFields = {
  flareRiskWindowStart: null, ovulationPainDay: null,
  currentCycleDay: null, inFlareRiskWindow: false, periodLengthAvg: null,
};

/** lengths: completed cycle lengths, newest first. */
export function computePcosFields(lengths: number[], latestStartDate: string | null, now: number): PcosFields {
  const daysSince = latestStartDate ? daysBetween(latestStartDate, now) : null;
  const amenorrheaFlag = daysSince !== null && daysSince >= 90;
  if (lengths.length < 2) {
    return { ...EMPTY_PCOS_FIELDS, daysSinceLastPeriod: daysSince, amenorrheaFlag };
  }
  const sd = stdDev(lengths);
  const meanLen = mean(lengths);
  const irregularFlag = sd > 7;
  const ovulationDay = Math.round(meanLen - LUTEAL_PHASE_DAYS);
  return {
    irregularFlag,
    longestRecentCycle: Math.max(...lengths.slice(0, 6)),
    daysSinceLastPeriod: daysSince,
    cycleVariability: Math.round(sd * 10) / 10,
    pcosCyclePattern: median(lengths) > 35 ? "oligomenorrhea" : irregularFlag ? "irregular" : "regular",
    amenorrheaFlag,
    predictedOvulationDay: Math.max(10, ovulationDay),
    widePredictionWindow: sd >= 7,
    inStressFlareWindow: daysSince !== null && daysSince >= Math.max(7, ovulationDay),
  };
}

export function computeEndoFields(cycles: CycleInput[], lengths: number[], latestStartDate: string | null, now: number): EndoFields {
  if (lengths.length < 2) return EMPTY_ENDO_FIELDS;
  const meanLen = Math.round(mean(lengths));
  const flareRiskWindowStart = meanLen - 7;
  const currentCycleDay = latestStartDate ? daysBetween(latestStartDate, now) + 1 : null;
  const periodLengths = cycles
    .map((c) => c.period_length)
    .filter((l): l is number => typeof l === "number" && l > 0 && l <= 14);
  return {
    flareRiskWindowStart,
    ovulationPainDay: meanLen - LUTEAL_PHASE_DAYS,
    currentCycleDay,
    inFlareRiskWindow: currentCycleDay !== null && currentCycleDay >= flareRiskWindowStart,
    periodLengthAvg: periodLengths.length > 0 ? Math.round(mean(periodLengths) * 10) / 10 : null,
  };
}
