/**
 * Health Connect via react-native-health-connect.
 * Required lazily so Expo Go — which doesn't ship the native module — degrades to
 * "not linked" instead of crashing at import time.
 */
import type * as HealthConnectModule from "react-native-health-connect";
import type { Permission } from "react-native-health-connect";
import { NativeModules, TurboModuleRegistry } from "react-native";
import { getDailyWindows, roundTo, type HealthBridge, type HealthReadPermissions } from "./types";

type HealthConnect = typeof HealthConnectModule;
type TimeRangeFilter = Parameters<HealthConnect["readRecords"]>[1]["timeRangeFilter"];

let cached: HealthConnect | null | undefined;
const loadHealthConnect = (): HealthConnect | null => {
  if (cached !== undefined) return cached;
  try {
    // On the old architecture the package returns a throwing proxy instead of failing
    // to load, so check the native side directly.
    if (!TurboModuleRegistry.get("HealthConnect") && !NativeModules.HealthConnect) {
      cached = null;
      return cached;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("react-native-health-connect") as HealthConnect;
  } catch {
    cached = null;
  }
  return cached;
};

let initialized = false;
/** Health Connect must be installed/up to date and the client initialised before any call. */
const ready = async (hc: HealthConnect): Promise<boolean> => {
  if (initialized) return true;
  try {
    const status = await hc.getSdkStatus();
    if (status !== hc.SdkAvailabilityStatus.SDK_AVAILABLE) return false;
    initialized = await hc.initialize();
  } catch {
    initialized = false;
  }
  return initialized;
};

const requestedPermissions = (permissions: HealthReadPermissions): Permission[] => [
  ...(permissions.sleep ? [{ accessType: "read", recordType: "SleepSession" } as const] : []),
  ...(permissions.activity
    ? [
        { accessType: "read", recordType: "Steps" } as const,
        { accessType: "read", recordType: "ExerciseSession" } as const,
      ]
    : []),
];

const between = (start: Date, end: Date): TimeRangeFilter => ({
  operator: "between",
  startTime: start.toISOString(),
  endTime: end.toISOString(),
});

export const healthBridge: HealthBridge = {
  isLinked: () => loadHealthConnect() !== null,

  requestPermissions: async (permissions) => {
    const hc = loadHealthConnect();
    const wanted = requestedPermissions(permissions);
    if (!hc || wanted.length === 0 || !(await ready(hc))) return false;
    const granted = await hc.requestPermission(wanted);
    return wanted.every((w) =>
      granted.some((g) => g.accessType === w.accessType && g.recordType === w.recordType),
    );
  },

  readDailyMetrics: async (isoDate, permissions) => {
    const hc = loadHealthConnect();
    const result = { sleepHours: null as number | null, steps: null as number | null, activityMinutes: null as number | null };
    if (!hc || !(await ready(hc))) return result;
    const windows = getDailyWindows(isoDate);

    if (permissions.sleep) {
      // Aggregates de-duplicate overlapping sessions from multiple apps.
      const sleep = await hc.aggregateRecord({
        recordType: "SleepSession",
        timeRangeFilter: between(windows.sleep.start, windows.sleep.end),
      });
      result.sleepHours = sleep.SLEEP_DURATION_TOTAL > 0 ? roundTo(sleep.SLEEP_DURATION_TOTAL / 3600, 1) : null;
    }

    if (permissions.activity) {
      const range = between(windows.activity.start, windows.activity.end);
      const [steps, exercise] = await Promise.all([
        hc.aggregateRecord({ recordType: "Steps", timeRangeFilter: range }),
        hc.aggregateRecord({ recordType: "ExerciseSession", timeRangeFilter: range }),
      ]);
      result.steps = steps.COUNT_TOTAL > 0 ? Math.round(steps.COUNT_TOTAL) : null;
      const exerciseSeconds = exercise.EXERCISE_DURATION_TOTAL?.inSeconds ?? 0;
      result.activityMinutes = exerciseSeconds > 0 ? Math.round(exerciseSeconds / 60) : null;
    }

    return result;
  },
};
