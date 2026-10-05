import { Colors, Radius, Shadow, Spacing } from "@/constants/theme";
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
    label: "Just track my cycle",
    desc: "Periods, symptoms, moods — all in one place. Regular or not, we got you.",
    icon: "🗓️",
    mode: "standard" as AppMode,
    next: "/onboarding/cycle-history",
  },
  {
    id: "peri",
    label: "My cycle does whatever it wants",
    desc: "Perimenopause, post-pill, teen, or just unpredictable — predictions adapt to you.",
    icon: "🌙",
    mode: "peri" as AppMode,
    next: "/onboarding/cycle-history",
  },
  {
    id: "condition",
    label: "I'm dealing with a condition",
    desc: "PCOS, PCOD or endometriosis — deeper tracking + reports your doctor will actually use.",
    icon: "💜",
    mode: "standard" as AppMode,
    next: "/onboarding/cycle-history?next=condition",
  },
] as const;

export default function GoalScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { setMode } = useAppStore();

  const handleSelect = (goal: (typeof GOALS)[number]) => {
    setMode(goal.mode);
    router.push(goal.next);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <OnboardingProgress step={1} total={3} label="step 1 · what brings you here" />
        <Text style={[styles.title, { color: theme.text }]}>hey, welcome 👋</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          What brings you to CycleIQ?
        </Text>
        <View style={[styles.privacyPill, { backgroundColor: theme.tintSoft }]}>
          <Text style={[styles.privacy, { color: theme.onTintSoft }]}>
            🔒 everything stays on your phone — no account, no cloud
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {GOALS.map((goal, i) => (
          <TouchableOpacity
            key={goal.id}
            style={[styles.card, { backgroundColor: theme.surface }, Shadow]}
            onPress={() => handleSelect(goal)}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.cardIcon}>{goal.icon}</Text>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{goal.label}</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{goal.desc}</Text>
            <Text style={[styles.cardArrow, { color: theme.tint }]}>this is me →</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.xxl, paddingBottom: Spacing.lg, gap: Spacing.md },
  title: { fontSize: 34, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { fontSize: 18, fontWeight: "500" },
  privacyPill: { alignSelf: "flex-start", paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.pill },
  privacy: { fontSize: 13, fontWeight: "700" },
  content: { paddingHorizontal: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card: { padding: Spacing.xl, borderRadius: Radius.lg, gap: 6 },
  cardIcon: { fontSize: 30 },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  cardArrow: { fontSize: 14, fontWeight: "800", marginTop: 6 },
});
