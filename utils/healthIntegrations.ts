import { NativeModules, Platform } from "react-native";

export type HealthProvider = "apple_health" | "health_connect";

export interface HealthImportPrefs {
  appleHealthSleep: boolean;
  appleHealthActivity: boolean;
  healthConnectSleep: boolean;
  healthConnectActivity: boolean;
}

export interface DailyHealthMetrics {
  sleepHours?: number | null;
  steps?: number | null;
  activityMinutes?: number | null;
  source: "Apple Health" | "Health Connect";
}

const getBridge = () => (NativeModules as any).CycleIQHealthBridge;

export const getActiveHealthProvider = (prefs: HealthImportPrefs): HealthProvider | null => {
  if (Platform.OS === "ios" && (prefs.appleHealthSleep || prefs.appleHealthActivity)) {
    return "apple_health";
  }
  if (Platform.OS === "android" && (prefs.healthConnectSleep || prefs.healthConnectActivity)) {
    return "health_connect";
  }
  return null;
};

export const getHealthSourceLabel = (provider: HealthProvider | null) => {
  if (provider === "apple_health") return "Apple Health";
  if (provider === "health_connect") return "Health Connect";
  return null;
};

export const isHealthBridgeAvailable = () => {
  const bridge = getBridge();
  return !!bridge?.requestPermissions && !!bridge?.readDailyMetrics;
};

export const requestHealthPermissions = async (
  prefs: HealthImportPrefs,
): Promise<boolean> => {
  const provider = getActiveHealthProvider(prefs);
  const bridge = getBridge();
  if (!provider || !bridge?.requestPermissions) return false;

  const permissions = {
    sleep: provider === "apple_health" ? prefs.appleHealthSleep : prefs.healthConnectSleep,
    activity: provider === "apple_health" ? prefs.appleHealthActivity : prefs.healthConnectActivity,
  };

  try {
    return !!(await bridge.requestPermissions(provider, permissions));
  } catch {
    return false;
  }
};

export const readDailyHealthMetrics = async (
  isoDate: string,
  prefs: HealthImportPrefs,
): Promise<DailyHealthMetrics | null> => {
  const provider = getActiveHealthProvider(prefs);
  const source = getHealthSourceLabel(provider);
  const bridge = getBridge();
  if (!provider || !source || !bridge?.readDailyMetrics) return null;

  const permissions = {
    sleep: provider === "apple_health" ? prefs.appleHealthSleep : prefs.healthConnectSleep,
    activity: provider === "apple_health" ? prefs.appleHealthActivity : prefs.healthConnectActivity,
  };

  try {
    const metrics = await bridge.readDailyMetrics(provider, isoDate, permissions);
    return {
      sleepHours: typeof metrics?.sleepHours === "number" ? metrics.sleepHours : null,
      steps: typeof metrics?.steps === "number" ? metrics.steps : null,
      activityMinutes: typeof metrics?.activityMinutes === "number" ? metrics.activityMinutes : null,
      source,
    };
  } catch {
    return null;
  }
};
