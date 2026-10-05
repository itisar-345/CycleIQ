import { Platform } from "react-native";
import { healthBridge } from "./health/bridge";
import type { HealthReadPermissions } from "./health/types";

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

/** False in Expo Go and on web, where the native health modules aren't linked. */
export const isHealthBridgeAvailable = () => healthBridge.isLinked();

const permissionsFor = (provider: HealthProvider, prefs: HealthImportPrefs): HealthReadPermissions => ({
  sleep: provider === "apple_health" ? prefs.appleHealthSleep : prefs.healthConnectSleep,
  activity: provider === "apple_health" ? prefs.appleHealthActivity : prefs.healthConnectActivity,
});

export const requestHealthPermissions = async (
  prefs: HealthImportPrefs,
): Promise<boolean> => {
  const provider = getActiveHealthProvider(prefs);
  if (!provider || !healthBridge.isLinked()) return false;
  try {
    return await healthBridge.requestPermissions(permissionsFor(provider, prefs));
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
  if (!provider || !source || !healthBridge.isLinked()) return null;

  try {
    const metrics = await healthBridge.readDailyMetrics(isoDate, permissionsFor(provider, prefs));
    return { ...metrics, source };
  } catch {
    return null;
  }
};
