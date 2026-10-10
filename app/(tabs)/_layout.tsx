import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTx } from "@/utils/tone";
import { Tabs } from "expo-router";
import { CalendarDays, ChartColumn, House, PencilLine, User } from "@/components/icons";
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
          tabBarIcon: ({ color, focused }) => <House size={24} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: tx("Log", "Log"),
          tabBarIcon: ({ color, focused }) => <PencilLine size={24} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: tx("Calendar", "Calendar"),
          tabBarIcon: ({ color, focused }) => <CalendarDays size={24} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: tx("Insights", "Insights"),
          tabBarIcon: ({ color, focused }) => <ChartColumn size={24} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: tx("You", "Profile"),
          tabBarIcon: ({ color, focused }) => <User size={24} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      {/* Routable but kept off the tab bar (5 tabs max): History opens from Calendar
          and Home, Learn opens from Insights. */}
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="education" options={{ href: null }} />
    </Tabs>
  );
}
