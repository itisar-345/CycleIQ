import { getUnsyncedEntries, markEntriesSynced } from "@/database";
import { AppState, AppStateStatus } from "react-native";

let syncInterval: ReturnType<typeof setInterval> | null = null;
let dbReady = false;

export const markDbReady = () => { dbReady = true; };

// Mock network request
const pushToServer = async (payload: any) => {
  console.log("Sending payload to server...", payload);
  // Implementation for HTTP POST with AES-256-GCM encrypted notes
  return { success: true, updatedFromServer: [] };
};

export const startSyncEngine = () => {
  // 1. Sync on App Resume
  AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      console.log("App resumed: Triggering immediate foreground sync...");
      executeSync();
    }
  });

  // 2. Foreground 60-Second Polling
  if (!syncInterval) {
    syncInterval = setInterval(() => {
      console.log("Running 60-second foreground sync cycle...");
      executeSync();
    }, 60000);
  }
};

const executeSync = async () => {
  if (!dbReady) return;
  try {
    // 1. Fetch unsynced local records
    const unsyncedEntries = await getUnsyncedEntries();

    if (unsyncedEntries.length > 0) {
      // 2. Push to server
      const response = await pushToServer(unsyncedEntries);

      if (response.success) {
        // 3. Mark as synced locally
        await markEntriesSynced();
        console.log(`Successfully synced ${unsyncedEntries.length} records.`);
      }
    }

    // 4. Handle Conflict Policy (Last-Write-Wins)
    // Server would return newer records modified elsewhere
    // If server `updated_at` > local `updated_at`, local DB is overwritten
    // We will implement conflict notes once the server contract is available.
  } catch (error) {
    console.error("Sync failed. Data remains safely offline.", error);
  }
};
// Note: Background Fetch (iOS) and WorkManager (Android) for 15-minute
// background syncs require `expo-background-fetch` and `expo-task-manager`.
