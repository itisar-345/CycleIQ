import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CycleHistoryInputScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { setCycleHistory, currentMode } = useAppStore();
  const { next } = useLocalSearchParams<{ next?: string }>();

  const [averageLength, setAverageLength] = useState("28");
  const [lastPeriodDate, setLastPeriodDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const onContinue = () => {
    const parsed = parseInt(averageLength, 10);
    if (isNaN(parsed) || parsed < 18 || parsed > 60) {
      Alert.alert("Please enter a cycle length between 18 and 60 days.");
      return;
    }
    setCycleHistory(
      parsed,
      lastPeriodDate,
      // Store a sensible default variance so the consent screen can render an honest window
      next === "condition" ? 10 : currentMode === "peri" ? 14 : undefined,
    );
    // Condition path: pick the condition next, then go to consent
    // Standard/Peri path: go straight to consent (payoff + finish)
    router.push(next === "condition" ? "/onboarding/index" : "/onboarding/consent" as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.tint }]}>← Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Quick setup</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Two fields — we'll show your first prediction immediately after.
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Last period start date</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            value={lastPeriodDate}
            onChangeText={setLastPeriodDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Average cycle length (days)</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            keyboardType="number-pad"
            value={averageLength}
            onChangeText={setAverageLength}
          />
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            {next === "condition"
              ? "Unsure? Use your best estimate — we'll refine this as you log."
              : "Unsure? 28 is a common average — you can update it later."}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: theme.tint }]}
          onPress={onContinue}
        >
          <Text style={styles.nextText}>
            {next === "condition" ? "Continue →" : "Show my prediction →"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { paddingHorizontal: 16, paddingTop: 8 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: "600" },
  content: { flex: 1, padding: 24, justifyContent: "center", gap: 20 },
  title: { fontSize: 32, fontWeight: "bold" },
  subtitle: { fontSize: 15, lineHeight: 22 },
  field: { gap: 6 },
  label: { fontSize: 16, fontWeight: "600" },
  hint: { fontSize: 13, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 48, fontSize: 16 },
  nextButton: { padding: 18, borderRadius: 14, alignItems: "center", marginTop: 8 },
  nextText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
