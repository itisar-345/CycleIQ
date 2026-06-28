import { initDb, getCyclePredictions } from "@/database";
import { AppLoading } from "@/components/app-loading";
import { useAppStore, waitForStoreHydration } from "@/store";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, View, StyleSheet } from "react-native";
import "react-native-reanimated";
import {
  cancelCycleNotifications,
  syncNotificationsWithOsPermission,
} from "@/utils/notifications";


export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const { isOnboarded, notificationsEnabled, notificationPrefs, postPillMode, postPillStartDate, currentMode } = useAppStore();
  const segments = useSegments();
  const [mounted, setMounted] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [storeReady, setStoreReady] = useState(false);

  useEffect(() => {
    setMounted(true);
    waitForStoreHydration().then(() => setStoreReady(true));
  }, []);

  useEffect(() => {
    initDb()
      .then(() => { setDbReady(true); })
      .catch((error) => { console.error("Database initialization error:", error); });
  }, []);

  // Sync notifications on every cold launch and foreground — OS permission check only, never prompts.
  useEffect(() => {
    if (!isOnboarded || !dbReady) return;

    const syncNotifications = async () => {
      try {
        const prediction = await getCyclePredictions(currentMode, postPillMode, postPillStartDate ?? null);
        await syncNotificationsWithOsPermission(prediction, notificationPrefs, currentMode);
      } catch (e) {
        console.warn("Notification sync failed", e);
        await cancelCycleNotifications();
      }
    };

    syncNotifications();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") syncNotifications();
    });
    return () => sub.remove();
  }, [isOnboarded, dbReady, notificationsEnabled, notificationPrefs, currentMode, postPillMode, postPillStartDate]);

  useEffect(() => {
    if (!mounted || !dbReady || !storeReady) return;
    const inOnboardingGroup = segments[0] === "onboarding";
    if (!isOnboarded && !inOnboardingGroup) {
      router.replace("/onboarding/goal" as any);
    } else if (isOnboarded && inOnboardingGroup) {
      router.replace("/(tabs)");
    }
  }, [isOnboarded, mounted, dbReady, storeReady, segments]);

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
      {(!mounted || !dbReady || !storeReady) && (
        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
          <AppLoading />
        </View>
      )}
      <StatusBar style="auto" />
    </>
  );
}
