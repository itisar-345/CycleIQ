/**
 * Rebuilds lifestyle guidance from stored logs and reschedules its notification. Called
 * after a log is saved so the next tip reflects the newest data.
 */
import { getAllCycles, getAllEntries } from "@/database";
import { useAppStore } from "@/store";
import { buildLifestyleGuidance, pickNotifiableGuidance } from "./lifestyleGuidance";
import { scheduleLifestyleNotification } from "./notifications";

export const refreshLifestyleNotification = async (): Promise<void> => {
  const { currentMode, isTeen, inFlare, notificationPrefs } = useAppStore.getState();
  const [cycles, entries] = await Promise.all([getAllCycles(), getAllEntries()]);
  const guidance = buildLifestyleGuidance({
    mode: currentMode,
    isTeen,
    inFlare,
    entries,
    periodStarts: cycles.filter((c) => c.is_confirmed !== 0).map((c) => c.start_date),
  });
  await scheduleLifestyleNotification(pickNotifiableGuidance(guidance), notificationPrefs.lifestyleTips ?? true);
};
