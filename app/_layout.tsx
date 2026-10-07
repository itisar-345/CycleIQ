import { initDb, getCyclePredictions, getLatestCycle } from "@/database";
import { AppLoading } from "@/components/app-loading";
import { AppLockGate } from "@/components/app-lock";
import { useAppStore, waitForStoreHydration } from "@/store";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, Platform, View, StyleSheet } from "react-native";
import { currentTx } from "@/utils/tone";
import "react-native-reanimated";
import {
  cancelCycleNotifications,
  syncNotificationsWithOsPermission,
} from "@/utils/notifications";


export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const { isOnboarded, notificationsEnabled, notificationPrefs, postPillMode, postPillStartDate, currentMode, tone, discreetNotifications } = useAppStore();
  const segments = useSegments();
  const [mounted, setMounted] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [dbFailed, setDbFailed] = useState(false);
  const [dbAttempt, setDbAttempt] = useState(0);
  const [storeReady, setStoreReady] = useState(false);

  useEffect(() => {
    setMounted(true);
    waitForStoreHydration().then(() => setStoreReady(true));
  }, []);

  useEffect(() => {
    setDbFailed(false);
    initDb()
      .then(async () => {
        // Web preview / screenshots only: fill the in-memory database with sample data.
        if (Platform.OS === "web" && process.env.EXPO_PUBLIC_DEMO_DATA === "1" && !(await getLatestCycle())) {
          const { seedDemoData } = await import("@/database/demoData");
          await seedDemoData();
        }
        setDbReady(true);
      })
      .catch((error) => {
        console.error("Database initialization error:", error);
        setDbFailed(true);
      });
  }, [dbAttempt]);

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
    // tone / discreetNotifications: rescheduling rewrites already-scheduled wording.
  }, [isOnboarded, dbReady, notificationsEnabled, notificationPrefs, currentMode, postPillMode, postPillStartDate, tone, discreetNotifications]);

  useEffect(() => {
    if (!mounted || !dbReady || !storeReady) return;
    const inOnboardingGroup = segments[0] === "onboarding";
    // Condition setup screens are also opened from Profile after onboarding (switching mode).
    const segs = segments as string[];
    const inConditionSetup = inOnboardingGroup && ["pcos", "pcod", "endo"].includes(segs[1] ?? "");
    if (!isOnboarded && !inOnboardingGroup) {
      router.replace("/onboarding/goal");
    } else if (isOnboarded && inOnboardingGroup && !inConditionSetup) {
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
      <AppLockGate ready={mounted && dbReady && storeReady} />
      {(!mounted || !dbReady || !storeReady) && (
        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
          {dbFailed ? (
            <AppLoading
              message={currentTx()(
                "couldn't open your data 😕 it's still safe on this phone — try again, or restart the app.",
                "Your data couldn't be opened. It's still stored safely on this device. Try again or restart the app.",
              )}
              onRetry={() => setDbAttempt((n) => n + 1)}
            />
          ) : (
            <AppLoading />
          )}
        </View>
      )}
      <StatusBar style="auto" />
    </>
  );
}
