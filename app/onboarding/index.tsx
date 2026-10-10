import { Colors, getModeColor, Radius, Shadow, Spacing } from "@/constants/theme";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppMode, useAppStore } from "@/store";
import { router, type Href } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTx } from "@/utils/tone";

const CONDITIONS = [
  {
    title: ["PCOS", "PCOS"],
    desc: ["Polycystic ovary syndrome — irregular cycles, skin, hair, cravings & the hormone rollercoaster.", "Polycystic ovary syndrome — irregular cycles, hormonal and metabolic symptoms."],
    mode: "pcos" as AppMode,
    path: "/onboarding/pcos",
  },
  {
    title: ["PCOD", "PCOD"],
    desc: ["Polycystic ovarian disease — cyst-linked patterns and hormonal symptoms.", "Polycystic ovarian disease — cyst-related patterns and hormonal symptoms."],
    mode: "pcod" as AppMode,
    path: "/onboarding/pcod",
  },
  {
    title: ["Endometriosis", "Endometriosis"],
    desc: ["Flare mode, detailed pain logging, and alerts when something needs a doctor.", "Flare tracking, detailed pain logging and medical alerts."],
    mode: "endo" as AppMode,
    path: "/onboarding/endo",
  },
] as const;

export default function ConditionSelectionScreen() {
  const tx = useTx();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { setMode } = useAppStore();

  const handleSelect = (mode: AppMode, path: Href) => {
    setMode(mode);
    router.push(path);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.tint }]}>{tx("← back", "← Back")}</Text>
        </TouchableOpacity>
        <OnboardingProgress step={3} total={5} label={tx("step 3 · pick your condition", "Step 3: your condition")} />
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">{tx("Which one are we working with?", "Which condition?")}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {tx("We'll tailor your daily questions and insights to it. You can switch anytime in Profile.", "Your daily questions and insights will be tailored to it. You can change this in Profile.")}
        </Text>
      </View>

      <View style={styles.content}>
        {CONDITIONS.map((c) => (
          <TouchableOpacity
            key={c.mode}
            style={[styles.card, { backgroundColor: theme.surface, borderLeftColor: getModeColor(theme, c.mode) }, Shadow]}
            onPress={() => handleSelect(c.mode, c.path)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${tx<string>(c.title[0], c.title[1])}. ${tx<string>(c.desc[0], c.desc[1])}`}
          >
            <Text style={[styles.cardTitle, { color: getModeColor(theme, c.mode) }]}>{tx<string>(c.title[0], c.title[1])}</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{tx<string>(c.desc[0], c.desc[1])}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 6, minHeight: 44, justifyContent: "center" },
  backText: { fontSize: 16, fontWeight: "600" },
  header: { padding: 24, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  content: { padding: 20, gap: 14 },
  card: { padding: Spacing.xl, borderRadius: Radius.lg, borderLeftWidth: 5 },
  cardTitle: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  cardDesc: { fontSize: 14, lineHeight: 20 },
});
