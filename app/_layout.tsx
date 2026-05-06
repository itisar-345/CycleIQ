import { getCyclePredictions, initDb } from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { startSyncEngine, markDbReady } from "@/utils/syncEngine";
import {
  cancelCycleNotifications,
  requestNotificationPermission,
  scheduleAllCycleNotifications,
} from "@/utils/notifications";


export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isOnboarded, notificationsEnabled, notificationPrefs, postPillMode, postPillStartDate, currentMode } = useAppStore();
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
      if (!notificationsEnabled) {
        await cancelCycleNotifications();
        return;
      }
      const granted = await requestNotificationPermission();
      if (!granted) {
        await cancelCycleNotifications();
        return;
      }
      try {
        const prediction = await getCyclePredictions(currentMode, postPillMode, postPillStartDate ?? null);
        await scheduleAllCycleNotifications(prediction, null, notificationPrefs, currentMode);
      } catch (e) {
        console.warn("Notification scheduling failed", e);
      }
    };
    setupNotifications();
  }, [isOnboarded, dbReady, notificationsEnabled, notificationPrefs, currentMode, postPillMode, postPillStartDate]);

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
