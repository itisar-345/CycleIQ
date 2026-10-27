/**
 * Rebuilds lifestyle guidance and supplement tips from stored logs and reschedules their
 * notifications. Called after a log is saved so the next tip reflects the newest data, and
 * on launch / foreground for supplement tips, which follow the predicted cycle.
 */
import { getAllCycles, getAllEntries, getLatestStoredCyclePrediction } from "@/database";
import { useAppStore } from "@/store";
import { buildLifestyleGuidance, pickNotifiableGuidance, type GuidanceInput } from "./lifestyleGuidance";
import { scheduleLifestyleNotification, scheduleSupplementNotifications } from "./notifications";
import type { PredictionResult } from "./predictions";
import { buildSupplementGuidance, isSouthernHemisphereTimeZone, planSupplementNotifications } from "./supplementGuidance";

const loadGuidanceInput = async (): Promise<GuidanceInput> => {
  const { currentMode, isTeen, inFlare } = useAppStore.getState();
  const [cycles, entries] = await Promise.all([getAllCycles(), getAllEntries()]);
  return {
    mode: currentMode,
    isTeen,
    inFlare,
    entries,
    periodStarts: cycles.filter((c) => c.is_confirmed !== 0).map((c) => c.start_date),
  };
};

/** Supplement tips for the user's current logs and mode (empty for teens). */
export const loadSupplementTips = async (input?: GuidanceInput) =>
  buildSupplementGuidance({ ...(input ?? (await loadGuidanceInput())), southernHemisphere: isSouthernHemisphereTimeZone() });

/** Pass the prediction when the caller has a fresh one; otherwise the latest stored one is used. */
export const refreshSupplementNotifications = async (prediction?: PredictionResult | null, input?: GuidanceInput): Promise<void> => {
  const { currentMode, notificationPrefs } = useAppStore.getState();
  const pred = prediction !== undefined ? prediction : await getLatestStoredCyclePrediction(currentMode);
  const tips = await loadSupplementTips(input);
  const plan = pred && pred.model !== "none" && pred.predictedStartISO
    ? planSupplementNotifications(tips, pred.predictedStartISO, pred.mean)
    : [];
  await scheduleSupplementNotifications(plan, notificationPrefs.supplementTips ?? true);
};

export const refreshLifestyleNotification = async (): Promise<void> => {
  const { notificationPrefs } = useAppStore.getState();
  const input = await loadGuidanceInput();
  await scheduleLifestyleNotification(pickNotifiableGuidance(buildLifestyleGuidance(input)), notificationPrefs.lifestyleTips ?? true);
  await refreshSupplementNotifications(undefined, input);
};
