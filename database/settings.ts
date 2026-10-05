/**
 * Key/value app settings mirrored from the Zustand store.
 */
import type { AppMode, NotificationPrefs } from "../store";
import type { HealthImportPrefs } from "../utils/healthIntegrations";

import { execSql, queryAll } from "./connection";

export const saveAppSetting = async (key: string, value: unknown): Promise<void> => {
  await execSql(
    `INSERT INTO app_settings (key, value_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at;`,
    [key, JSON.stringify(value), new Date().toISOString()],
  );
};

/** Values are whatever was saved; callers narrow with typeof checks. */
export const getAppSettings = async (): Promise<Record<string, unknown>> => {
  const rows = await queryAll<{ key: string; value_json: string }>(`SELECT key, value_json FROM app_settings;`);
  const settings: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value_json);
    } catch {
      settings[row.key] = row.value_json;
    }
  }
  return settings;
};

export const persistAppSettingsSnapshot = async (settings: {
  currentMode: AppMode;
  language: string;
  languagePreset: string;
  customTerms: Record<string, string>;
  notificationsEnabled: boolean;
  notificationPrefs: NotificationPrefs;
  healthImportPrefs: HealthImportPrefs;
  dismissedInsights: string[];
  tier?: string;
  isOnboarded?: boolean;
  pcosData?: unknown;
  endoData?: unknown;
  age?: number | null;
  gender?: string | null;
  isTeen?: boolean;
  postPillMode?: boolean;
  postPillStartDate?: string | null;
}): Promise<void> => {
  await saveAppSetting("current_mode", settings.currentMode);
  await saveAppSetting("language", settings.language);
  await saveAppSetting("language_preset", settings.languagePreset);
  await saveAppSetting("custom_terms", settings.customTerms);
  await saveAppSetting("notifications_enabled", settings.notificationsEnabled);
  await saveAppSetting("notification_prefs", settings.notificationPrefs);
  await saveAppSetting("health_import_prefs", settings.healthImportPrefs);
  await saveAppSetting("dismissed_insights", settings.dismissedInsights);
  await saveAppSetting("tier", settings.tier ?? "free");
  if (settings.isOnboarded !== undefined) await saveAppSetting("is_onboarded", settings.isOnboarded);
  if (settings.pcosData !== undefined) await saveAppSetting("pcos_data", settings.pcosData);
  if (settings.endoData !== undefined) await saveAppSetting("endo_data", settings.endoData);
  if (settings.age !== undefined) await saveAppSetting("age", settings.age);
  if (settings.gender !== undefined) await saveAppSetting("gender", settings.gender);
  if (settings.isTeen !== undefined) await saveAppSetting("is_teen", settings.isTeen);
  if (settings.postPillMode !== undefined) await saveAppSetting("post_pill_mode", settings.postPillMode);
  if (settings.postPillStartDate !== undefined) await saveAppSetting("post_pill_start_date", settings.postPillStartDate);
};
