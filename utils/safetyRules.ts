import {
  SAFEGUARDING_LOW_MOOD_SCORE,
  SAFEGUARDING_LOW_MOOD_THRESHOLD_DAYS,
} from "../constants/safeguarding";

export type RedFlagTriggerType = "severe_pain_3_days" | "bowel_shoulder_heavy_flow";

export interface RedFlagInput {
  painScore: number;
  previousPainScores?: number[];
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
  const hasHeavyFlow = !!input.flowIntensity && heavyFlowValues.has(input.flowIntensity);

  if (bowelSymptoms.length > 0 && hasShoulderPain && hasHeavyFlow) {
    return {
      shouldPrompt: true,
      triggerType: "bowel_shoulder_heavy_flow",
      message:
        "You've logged complex symptoms (bowel + shoulder pain + heavy flow) on the same day. This combination warrants medical attention.",
    };
  }

  const recentPainScores = [input.painScore, ...(input.previousPainScores ?? [])].slice(0, 3);
  if (recentPainScores.length >= 3 && recentPainScores.every((score) => score >= 8)) {
    return {
      shouldPrompt: true,
      triggerType: "severe_pain_3_days",
      message:
        "You've logged severe pain (8+) for 3 consecutive days. We strongly recommend contacting your healthcare provider.",
    };
  }

  return {
    shouldPrompt: false,
    triggerType: null,
    message: "",
  };
};
