import { initDb, getAllCycles } from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { startSyncEngine, markDbReady } from "@/utils/syncEngine";
import {
  requestNotificationPermission,
  scheduleDailyLogReminder,
  schedulePeriodReminder,
  scheduleOvulationReminder,
} from "@/utils/notifications";


export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isOnboarded, notificationsEnabled, notificationPrefs, postPillMode, postPillStartDate } = useAppStore();
  const segments = useSegments();
  const [mounted, setMounted] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    initDb()
      .then(() => { markDbReady(); setDbReady(true); startSyncEngine(); })
      .catch((error) => { console.error("Database initialization error:", error); });
  }, []);

  // Wire up all scheduled notifications after onboarding
  useEffect(() => {
    if (!isOnboarded || !dbReady) return;
    const setupNotifications = async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      await scheduleDailyLogReminder(
        notificationsEnabled && notificationPrefs.period,
        notificationPrefs.dailyLogHour ?? 20
      );
      try {
        const cycles = await getAllCycles();
        const { runPredictionEngine } = await import("@/utils/predictions");
        const stats = runPredictionEngine({ cycles, currentMode: "standard", postPillMode, postPillStartDate: postPillStartDate ?? null });
        if (stats.model !== "none" && cycles.length > 0 && stats.predictedStartISO) {
          const predictedStart = new Date(stats.predictedStartISO);
          await schedulePeriodReminder(predictedStart, notificationsEnabled && notificationPrefs.period);
          await scheduleOvulationReminder(
            new Date(cycles[0].start_date),
            cycles[0].cycle_length || 28,
            notificationsEnabled && notificationPrefs.ovulation
          );
        }
      } catch (e) {
        console.warn("Notification scheduling failed", e);
      }
    };
    setupNotifications();
  }, [isOnboarded, dbReady, notificationsEnabled, notificationPrefs]);

  useEffect(() => {
    if (!mounted) return;
    const inTabsGroup = segments[0] === "(tabs)";
    const inOnboardingGroup = segments[0] === "onboarding";
    if (!isOnboarded && !inOnboardingGroup) {
      router.replace("/onboarding");
    } else if (isOnboarded && !inTabsGroup) {
      router.replace("/(tabs)");
    }
  }, [isOnboarded, mounted, segments]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
