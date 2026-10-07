import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTx } from "@/utils/tone";
import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const tx = useTx();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      // History and Learn are opened from other tabs; Back should return there, not Home.
      backBehavior="history"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        // The default 49pt bar clips the bold labels when there is no bottom inset (web,
        // Android 3-button navigation). Height must include the inset the navigator pads with.
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 58 + insets.bottom,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tx("Home", "Home"),
          tabBarIcon: ({ color }: { color: string | import('react-native').ColorValue }) => (
            <IconSymbol size={24} name="house.fill" color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: tx("Log", "Log"),
          tabBarIcon: ({ color }: { color: string | import('react-native').ColorValue }) => (
            <IconSymbol size={24} name="square.and.pencil" color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: tx("Calendar", "Calendar"),
          tabBarIcon: ({ color }: { color: string | import('react-native').ColorValue }) => (
            <IconSymbol size={24} name="calendar" color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: tx("Insights", "Insights"),
          tabBarIcon: ({ color }: { color: string | import('react-native').ColorValue }) => (
            <IconSymbol size={24} name="chart.bar.fill" color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: tx("You", "Profile"),
          tabBarIcon: ({ color }: { color: string | import('react-native').ColorValue }) => (
            <IconSymbol size={24} name="person.fill" color={color as string} />
          ),
        }}
      />
      {/* Routable but kept off the tab bar (5 tabs max): History opens from Calendar
          and Home, Learn opens from Insights. */}
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="education" options={{ href: null }} />
    </Tabs>
  );
}
