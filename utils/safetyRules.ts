import {
  SAFEGUARDING_LOW_MOOD_SCORE,
  SAFEGUARDING_LOW_MOOD_THRESHOLD_DAYS,
} from "../constants/safeguarding";

export type RedFlagTriggerType = "severe_pain_3_days" | "bowel_shoulder_heavy_flow";

export interface RedFlagInput {
  painScore: number;
  /** Highest pain on each of the previous calendar days, most recent first; null = not logged. */
  previousPainScores?: (number | null)[];
  bowelSymptoms?: string[];
  shoulderSide?: string | null;
  flowIntensity?: string | null;
}

export interface RedFlagResult {
  shouldPrompt: boolean;
  triggerType: RedFlagTriggerType | null;
  message: string;
}

const heavyFlowValues = new Set(["Heavy", "Very Heavy", "heavy", "very heavy"]);

export const isHeavyFlow = (flow: string | null | undefined): boolean => !!flow && heavyFlowValues.has(flow);

/** Local calendar date "YYYY-MM-DD". */
const localDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * For each of the `days` calendar days before `today` (most recent first), that day's
 * highest ("max") or lowest ("min") logged value, or null if nothing was logged.
 * Safety rules about "N consecutive days" need real calendar days, not "the last N entries".
 */
export const valuesForPreviousDays = (
  entries: { logged_date: string; value: number | null }[],
  today: Date,
  days: number,
  aggregate: "max" | "min" = "max",
): (number | null)[] => {
  const byDay = new Map<string, number>();
  const pick = aggregate === "max" ? Math.max : Math.min;
  for (const e of entries) {
    if (e.value === null || e.value === undefined) continue;
    const key = localDateKey(new Date(e.logged_date));
    const prev = byDay.get(key);
    byDay.set(key, prev === undefined ? e.value : pick(prev, e.value));
  }
  const result: (number | null)[] = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    result.push(byDay.get(localDateKey(d)) ?? null);
  }
  return result;
};

/** Number of consecutive calendar days immediately before `today` whose logged value matches. */
export const countConsecutivePriorDays = (
  entries: { logged_date: string; value: number | null }[],
  today: Date,
  matches: (value: number) => boolean,
  aggregate: "max" | "min" = "max",
  maxDays = 30,
): number => {
  const values = valuesForPreviousDays(entries, today, maxDays, aggregate);
  let count = 0;
  for (const v of values) {
    if (v === null || !matches(v)) break;
    count++;
  }
  return count;
};

export const shouldShowSafeguardingPrompt = (
  moodScore: number,
  consecutiveLowMoodDaysBeforeToday: number,
  cooldownOpen: boolean,
): boolean => {
  if (!cooldownOpen || moodScore !== SAFEGUARDING_LOW_MOOD_SCORE) return false;
  return consecutiveLowMoodDaysBeforeToday + 1 >= SAFEGUARDING_LOW_MOOD_THRESHOLD_DAYS;
};

export const evaluateEndoRedFlag = (input: RedFlagInput): RedFlagResult => {
  const bowelSymptoms = input.bowelSymptoms ?? [];
  const shoulderSide = input.shoulderSide ?? null;
  const hasShoulderPain = !!shoulderSide && shoulderSide !== "None";
  const hasHeavyFlow = isHeavyFlow(input.flowIntensity);

  if (bowelSymptoms.length > 0 && hasShoulderPain && hasHeavyFlow) {
    return {
      shouldPrompt: true,
      triggerType: "bowel_shoulder_heavy_flow",
      message:
        "You've logged bowel symptoms, shoulder pain and heavy flow on the same day. That combo is worth getting checked by a doctor — please don't brush it off 💛",
    };
  }

  const recentPainScores = [input.painScore, ...(input.previousPainScores ?? [])].slice(0, 3);
  if (recentPainScores.length >= 3 && recentPainScores.every((score) => score !== null && score >= 8)) {
    return {
      shouldPrompt: true,
      triggerType: "severe_pain_3_days",
      message:
        "You've had severe pain (8+) three days in a row. That's not something you should have to push through — please reach out to a healthcare provider 💛",
    };
  }

  return {
    shouldPrompt: false,
    triggerType: null,
    message: "",
  };
};
