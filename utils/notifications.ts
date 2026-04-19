import * as Notifications from "expo-notifications";
import { addDays, format } from "date-fns";
import { useAppStore } from "@/store";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermission = async (): Promise<boolean> => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
};

/**
 * Returns a safe trigger hour that respects the user's configured quiet hours.
 * Falls back to 09:00 if the preferred hour falls inside the quiet window.
 */
const safeHour = (preferredHour: number): number => {
  const { notificationPrefs } = useAppStore.getState();
  const qStart = notificationPrefs?.quietHoursStart ?? 22;
  const qEnd = notificationPrefs?.quietHoursEnd ?? 8;
  // Quiet window can wrap midnight (e.g. 22–08)
  const inQuiet =
    qStart > qEnd
      ? preferredHour >= qStart || preferredHour < qEnd   // wraps midnight
      : preferredHour >= qStart && preferredHour < qEnd;  // same day
  return inQuiet ? qEnd : preferredHour;
};

export const schedulePeriodReminder = async (
  predictedStartDate: Date,
  enabled: boolean
): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync("period-reminder").catch(() => {});
  if (!enabled) return;
  const triggerDate = addDays(predictedStartDate, -2);
  if (triggerDate <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: "period-reminder",
    content: {
      title: "Period due soon",
      body: "Your next period is predicted to start in ~2 days. Stay prepared 🩸",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(
        triggerDate.getFullYear(),
        triggerDate.getMonth(),
        triggerDate.getDate(),
        safeHour(9),
        0,
      ),
    },
  });
};

export const scheduleDailyLogReminder = async (
  enabled: boolean,
  hourOfDay: number = 20
): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync("daily-log").catch(() => {});
  if (!enabled) return;
  await Notifications.scheduleNotificationAsync({
    identifier: "daily-log",
    content: {
      title: "Daily log reminder",
      body: "Take 30 seconds to log today's symptoms and keep your patterns accurate.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: safeHour(hourOfDay),
      minute: 0,
    },
  });
};

export const scheduleInsightNotification = async (
  insightTitle: string,
  enabled: boolean
): Promise<void> => {
  if (!enabled) return;
  await Notifications.scheduleNotificationAsync({
    identifier: `insight-${Date.now()}`,
    content: {
      title: "New insight available",
      body: `We noticed a strong pattern: "${insightTitle}". Tap to explore.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 5000), // fire 5s after computation
    },
  });
};

export const scheduleOvulationReminder = async (
  cycleStartDate: Date,
  cycleLength: number,
  enabled: boolean
): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync("ovulation-window").catch(() => {});
  if (!enabled) return;
  // Ovulation ~14 days before next period
  const ovulationDay = cycleLength - 14;
  const ovulationDate = addDays(cycleStartDate, ovulationDay - 1);
  const reminderDate = addDays(ovulationDate, -1);
  if (reminderDate <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: "ovulation-window",
    content: {
      title: "Ovulation window approaching",
      body: `Your predicted ovulation window starts around ${format(ovulationDate, "MMM d")}.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(
        reminderDate.getFullYear(),
        reminderDate.getMonth(),
        reminderDate.getDate(),
        safeHour(9),
        0,
      ),
    },
  });
};

export const scheduleFlareWarning = async (
  predictedFlareDate: Date,
  confidence: number,
  enabled: boolean
): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync("flare-warning").catch(() => {});
  if (!enabled || confidence < 0.7) return;
  const reminderDate = addDays(predictedFlareDate, -1);
  if (reminderDate <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: "flare-warning",
    content: {
      title: "Possible flare approaching",
      body: `Based on your patterns, a flare may be coming around ${format(predictedFlareDate, "MMM d")}. Consider reducing triggers.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(
        reminderDate.getFullYear(),
        reminderDate.getMonth(),
        reminderDate.getDate(),
        safeHour(9),
        0,
      ),
    },
  });
};
