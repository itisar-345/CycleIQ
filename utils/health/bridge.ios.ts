/**
 * Apple Health via @kingstinct/react-native-healthkit (Nitro module).
 * Required lazily so Expo Go — which doesn't ship the native module — degrades to
 * "not linked" instead of crashing at import time.
 */
import type * as HealthKitModule from "@kingstinct/react-native-healthkit";
import type { ObjectTypeIdentifier } from "@kingstinct/react-native-healthkit";
import { getDailyWindows, roundTo, unionDurationMs, type HealthBridge, type HealthReadPermissions } from "./types";

type HealthKit = typeof HealthKitModule;

const SLEEP = "HKCategoryTypeIdentifierSleepAnalysis" as const;
const STEPS = "HKQuantityTypeIdentifierStepCount" as const;
const EXERCISE_MINUTES = "HKQuantityTypeIdentifierAppleExerciseTime" as const;

// CategoryValueSleepAnalysis: 0 inBed, 1 asleepUnspecified, 2 awake, 3 core, 4 deep, 5 REM.
const ASLEEP_VALUES = new Set([1, 3, 4, 5]);

let cached: HealthKit | null | undefined;
const loadHealthKit = (): HealthKit | null => {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hk: HealthKit = require("@kingstinct/react-native-healthkit");
    cached = hk.isHealthDataAvailable() ? hk : null;
  } catch {
    cached = null;
  }
  return cached;
};

const readTypes = (permissions: HealthReadPermissions): ObjectTypeIdentifier[] => [
  ...(permissions.sleep ? [SLEEP] : []),
  ...(permissions.activity ? [STEPS, EXERCISE_MINUTES] : []),
];

export const healthBridge: HealthBridge = {
  isLinked: () => loadHealthKit() !== null,

  requestPermissions: async (permissions) => {
    const hk = loadHealthKit();
    const toRead = readTypes(permissions);
    if (!hk || toRead.length === 0) return false;
    // HealthKit never reveals whether *read* access was granted; true means the
    // request completed. Queries simply return no data if the user declined.
    return hk.requestAuthorization({ toRead });
  },

  readDailyMetrics: async (isoDate, permissions) => {
    const hk = loadHealthKit();
    const result = { sleepHours: null as number | null, steps: null as number | null, activityMinutes: null as number | null };
    if (!hk) return result;
    const windows = getDailyWindows(isoDate);

    if (permissions.sleep) {
      const samples = await hk.queryCategorySamples(SLEEP, {
        limit: 0,
        filter: { date: { startDate: windows.sleep.start, endDate: windows.sleep.end } },
      });
      const asleepMs = unionDurationMs(
        samples
          .filter((s) => ASLEEP_VALUES.has(Number(s.value)))
          .map((s) => ({ start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime() })),
      );
      result.sleepHours = asleepMs > 0 ? roundTo(asleepMs / 3_600_000, 1) : null;
    }

    if (permissions.activity) {
      const filter = { date: { startDate: windows.activity.start, endDate: windows.activity.end } };
      const [steps, exercise] = await Promise.all([
        hk.queryStatisticsForQuantity(STEPS, ["cumulativeSum"], { filter, unit: "count" }),
        hk.queryStatisticsForQuantity(EXERCISE_MINUTES, ["cumulativeSum"], { filter, unit: "min" }),
      ]);
      result.steps = steps.sumQuantity ? Math.round(steps.sumQuantity.quantity) : null;
      result.activityMinutes = exercise.sumQuantity ? Math.round(exercise.sumQuantity.quantity) : null;
    }

    return result;
  },
};
