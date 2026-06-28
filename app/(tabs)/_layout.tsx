import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }: { color: string | import('react-native').ColorValue }) => (
            <IconSymbol size={28} name="house.fill" color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: "Log Hub",
          tabBarIcon: ({ color }: { color: string | import('react-native').ColorValue }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }: { color: string | import('react-native').ColorValue }) => (
            <IconSymbol size={28} name="calendar" color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="education"
        options={{
          title: "Education",
          tabBarIcon: ({ color }: { color: string | import('react-native').ColorValue }) => (
            <IconSymbol size={28} name="books.vertical.fill" color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }: { color: string | import('react-native').ColorValue }) => (
            <IconSymbol size={28} name="clock.fill" color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Insights",
          tabBarIcon: ({ color }: { color: string | import('react-native').ColorValue }) => (
            <IconSymbol size={28} name="chart.bar.fill" color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }: { color: string | import('react-native').ColorValue }) => (
            <IconSymbol size={28} name="person.fill" color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
