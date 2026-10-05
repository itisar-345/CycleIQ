import type { HealthBridge } from "./types";

/** Web and any other platform: no health data source. */
export const healthBridge: HealthBridge = {
  isLinked: () => false,
  requestPermissions: async () => false,
  readDailyMetrics: async () => ({ sleepHours: null, steps: null, activityMinutes: null }),
};
