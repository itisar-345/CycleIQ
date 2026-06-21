import { initDb, getCyclePredictions } from "@/database";
import { useAppStore } from "@/store";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import {
  cancelCycleNotifications,
  requestNotificationPermission,
  scheduleAllCycleNotifications,
} from "@/utils/notifications";


export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const { isOnboarded, notificationsEnabled, notificationPrefs, postPillMode, postPillStartDate, currentMode } = useAppStore();
  const segments = useSegments();
  const [mounted, setMounted] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    initDb()
      .then(() => { setDbReady(true); })
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
    // Wait for both mount and DB before routing — DB must be ready before
    // any screen that calls database functions mounts.
    if (!mounted || !dbReady) return;
    const inOnboardingGroup = segments[0] === "onboarding";
    if (!isOnboarded && !inOnboardingGroup) {
      router.replace("/onboarding/goal" as any);
    } else if (isOnboarded && inOnboardingGroup) {
      router.replace("/(tabs)");
    }
  }, [isOnboarded, mounted, dbReady, segments]);

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="cycle" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="report" options={{ headerShown: false }} />
        <Stack.Screen name="reports" options={{ headerShown: false }} />
        <Stack.Screen name="appointment-prep" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
