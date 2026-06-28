import { Colors } from "@/constants/theme";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppMode, useAppStore } from "@/store";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GOALS = [
  {
    id: "track",
    label: "Track my cycle",
    desc: "Log periods, symptoms, and moods. Works for regular or irregular cycles.",
    icon: "🗓️",
    mode: "standard" as AppMode,
    next: "/onboarding/cycle-history",
  },
  {
    id: "peri",
    label: "My cycle is unpredictable",
    desc: "Perimenopause, post-pill, teen, or naturally irregular — predictions adapt accordingly.",
    icon: "🌙",
    mode: "peri" as AppMode,
    next: "/onboarding/cycle-history",
  },
  {
    id: "condition",
    label: "I have a diagnosed condition",
    desc: "PCOS, PCOD, or Endometriosis — unlock deeper clinical tracking tools.",
    icon: "💜",
    mode: "standard" as AppMode,
    next: "/onboarding/cycle-history?next=condition",
  },
];

export default function GoalScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { setMode } = useAppStore();

  const handleSelect = (goal: (typeof GOALS)[number]) => {
    setMode(goal.mode);
    router.push(goal.next as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <OnboardingProgress step={1} total={3} label="Step 1 — Choose your path" />
        <Text style={[styles.title, { color: theme.text }]}>Welcome to CycleIQ</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          What brings you here?
        </Text>
        <Text style={[styles.privacy, { color: theme.textSecondary }]}>
          🔒 All data stays on your phone — no accounts, no servers.
        </Text>
      </View>

      <View style={styles.content}>
        {GOALS.map((goal, i) => (
          <TouchableOpacity
            key={goal.id}
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            onPress={() => handleSelect(goal)}
            activeOpacity={0.7}
          >
            <Text style={styles.cardIcon}>{goal.icon}</Text>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{goal.label}</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{goal.desc}</Text>
            <Text style={[styles.cardArrow, { color: theme.tint }]}>Continue →</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 30, paddingBottom: 16, gap: 12 },
  title: { fontSize: 32, fontWeight: "bold" },
  subtitle: { fontSize: 18 },
  privacy: { fontSize: 13, marginTop: 4 },
  content: { paddingHorizontal: 20, gap: 12, paddingBottom: 24 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1.5, gap: 6 },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  cardArrow: { fontSize: 14, fontWeight: "700", marginTop: 4 },
});
