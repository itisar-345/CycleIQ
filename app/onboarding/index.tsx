import { Colors } from "@/constants/theme";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppMode, useAppStore } from "@/store";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CONDITIONS = [
  {
    title: "PCOS",
    desc: "Polycystic ovary syndrome — irregular cycles, hormonal & metabolic symptoms.",
    mode: "pcos" as AppMode,
    path: "/onboarding/pcos",
    accent: "#E8A0BF",
  },
  {
    title: "PCOD",
    desc: "Polycystic ovarian disease — cyst tracking & hormonal symptom palette.",
    mode: "pcod" as AppMode,
    path: "/onboarding/pcod",
    accent: "#80DEEA",
  },
  {
    title: "Endometriosis",
    desc: "Flare tracking, advanced pain logging, and red-flag alerts.",
    mode: "endo" as AppMode,
    path: "/onboarding/endo",
    accent: "#CE93D8",
  },
];

export default function ConditionSelectionScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { setMode } = useAppStore();

  const handleSelect = (mode: AppMode, path: string) => {
    setMode(mode);
    router.push(path as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.tint }]}>← Back</Text>
        </TouchableOpacity>
        <OnboardingProgress step={3} total={5} label="Step 3 — Pick condition" />
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Which condition?</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {"We'll tailor your log fields and insights. You can change this any time in Settings."}
        </Text>
      </View>

      <View style={styles.content}>
        {CONDITIONS.map((c) => (
          <TouchableOpacity
            key={c.mode}
            style={[styles.card, { backgroundColor: c.accent + "20", borderColor: c.accent }]}
            onPress={() => handleSelect(c.mode, c.path)}
            activeOpacity={0.8}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>{c.title}</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{c.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: "600" },
  header: { padding: 24, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  content: { padding: 20, gap: 14 },
  card: { padding: 20, borderRadius: 16, borderWidth: 2 },
  cardTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 6 },
  cardDesc: { fontSize: 14, lineHeight: 20 },
});
