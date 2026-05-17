/**
 * CycleIQ — Local Data Integrity Engine
 *
 * This app is fully local — no server, no account, no sync.
 * This module previously contained a mock server push; that has been removed.
 *
 * What this module now does:
 * - Runs a periodic WAL checkpoint to keep the SQLite write-ahead log compact
 * - Marks all locally written entries as "synced = 1" (local confirmation only)
 * - Persists the current Zustand settings snapshot to SQLite on app resume
 *
 * The `synced` column is retained for potential future opt-in export features.
 */

import { AppState, AppStateStatus } from "react-native";
import { checkpointDatabase, markEntriesSynced, persistAppSettingsSnapshot } from "@/database";
import { useAppStore } from "@/store";

let engineStarted = false;
let checkpointInterval: ReturnType<typeof setInterval> | null = null;

const runLocalMaintenance = async () => {
  try {
    // 1. Mark all unsynced entries as locally confirmed
    await markEntriesSynced();

    // 2. WAL checkpoint — keeps DB file size compact
    await checkpointDatabase();

    // 3. Persist current settings snapshot to SQLite
    const state = useAppStore.getState();
    await persistAppSettingsSnapshot({
      currentMode: state.currentMode,
      language: state.language,
      languagePreset: state.languagePreset,
      customTerms: state.customTerms,
      notificationsEnabled: state.notificationsEnabled,
      notificationPrefs: state.notificationPrefs,
      healthImportPrefs: state.healthImportPrefs,
      dismissedInsights: state.dismissedInsights,
    });
  } catch (error) {
    // Non-fatal — local maintenance should never crash the app
    console.warn("Local maintenance cycle failed", error);
  }
};

export const startSyncEngine = () => {
  if (engineStarted) return;
  engineStarted = true;

  // Run on app resume
  AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      runLocalMaintenance();
    }
  });

  // Run every 5 minutes while app is in foreground
  if (!checkpointInterval) {
    checkpointInterval = setInterval(runLocalMaintenance, 5 * 60 * 1000);
  }

  // Run once on startup
  runLocalMaintenance();
};

export const stopSyncEngine = () => {
  if (checkpointInterval) {
    clearInterval(checkpointInterval);
    checkpointInterval = null;
  }
  engineStarted = false;
};
