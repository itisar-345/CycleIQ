import { initDb } from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isOnboarded } = useAppStore();
  const segments = useSegments();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    initDb()
      .then(() => {
        startSyncEngine();
      })
      .catch((error) => {
        console.error("Database initialization error:", error);
      });
  }, []);

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
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
