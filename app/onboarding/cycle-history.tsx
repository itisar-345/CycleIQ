import { Colors, Radius, Shadow, Spacing } from "@/constants/theme";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MIN_LENGTH = 18;
const MAX_LENGTH = 60;

/** Local calendar date as YYYY-MM-DD. */
const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

const QUICK_DATES = [
  { label: "today", days: 0 },
  { label: "yesterday", days: 1 },
  { label: "~1 week ago", days: 7 },
  { label: "~2 weeks ago", days: 14 },
  { label: "~3 weeks ago", days: 21 },
];

/** Returns an error message, or null when the date is usable. */
const validateDate = (value: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "use the format YYYY-MM-DD";
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return "that date doesn't exist";
  if (value > toDateKey(new Date())) return "that's in the future 👀";
  if (value < daysAgo(180)) return "that's over 6 months ago — pick your most recent period";
  return null;
};

export default function CycleHistoryInputScreen() {
  const theme = Colors[useColorScheme() ?? "light"];
  const { setCycleHistory, currentMode } = useAppStore();
  const { next } = useLocalSearchParams<{ next?: string }>();

  const [averageLength, setAverageLength] = useState(28);
  const [lastPeriodDate, setLastPeriodDate] = useState(daysAgo(0));
  const [customDate, setCustomDate] = useState<string | null>(null);

  const dateError = validateDate(lastPeriodDate);

  const onContinue = () => {
    if (dateError) return;
    setCycleHistory(
      averageLength,
      lastPeriodDate,
      // Store a sensible default variance so the consent screen can render an honest window
      next === "condition" ? 10 : currentMode === "peri" ? 14 : undefined,
    );
    // Condition path: pick the condition next, then go to consent
    // Standard/Peri path: go straight to consent (payoff + finish)
    router.push(next === "condition" ? "/onboarding" : "/onboarding/consent");
  };

  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: theme.tintSoft, borderColor: theme.tint }
          : { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
      ]}
    >
      <Text style={{ color: selected ? theme.onTintSoft : theme.text, fontWeight: selected ? "800" : "500", fontSize: 14 }}>
        {selected ? "✓ " : ""}{label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
          <Text style={[styles.backText, { color: theme.tint }]}>← Back</Text>
        </TouchableOpacity>
        <OnboardingProgress
          step={2}
          total={next === "condition" ? 5 : 3}
          label="step 2 · cycle basics"
        />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.text }]}>Quick setup ⚡</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Two questions, then you get your first prediction. Best guesses are totally fine.
        </Text>

        <View style={[styles.card, { backgroundColor: theme.surface }, Shadow]}>
          <Text style={[styles.question, { color: theme.text }]}>When did your last period start? 🩸</Text>
          <View style={styles.chips}>
            {QUICK_DATES.map((q) =>
              chip(q.label, customDate === null && lastPeriodDate === daysAgo(q.days), () => {
                setCustomDate(null);
                setLastPeriodDate(daysAgo(q.days));
              }),
            )}
            {chip("pick a date", customDate !== null, () => {
              setCustomDate(lastPeriodDate);
            })}
          </View>
          {customDate !== null && (
            <>
              <TextInput
                style={[styles.input, { borderColor: dateError ? theme.error : theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }]}
                value={customDate}
                onChangeText={(t) => {
                  setCustomDate(t);
                  setLastPeriodDate(t.trim());
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
                autoCorrect={false}
                maxLength={10}
                accessibilityLabel="Last period start date, year month day"
              />
              {dateError && <Text style={[styles.error, { color: theme.error }]}>{dateError}</Text>}
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }, Shadow]}>
          <Text style={[styles.question, { color: theme.text }]}>How long is your cycle, usually?</Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            day 1 of one period → day 1 of the next
          </Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepBtn, { borderColor: theme.tint }]}
              onPress={() => setAverageLength((v) => Math.max(MIN_LENGTH, v - 1))}
              accessibilityLabel="One day shorter"
            >
              <Text style={[styles.stepBtnText, { color: theme.tint }]}>−</Text>
            </TouchableOpacity>
            <View style={{ alignItems: "center" }}>
              <Text style={[styles.stepValue, { color: theme.text }]}>{averageLength}</Text>
              <Text style={[styles.stepUnit, { color: theme.textSecondary }]}>days</Text>
            </View>
            <TouchableOpacity
              style={[styles.stepBtn, { borderColor: theme.tint }]}
              onPress={() => setAverageLength((v) => Math.min(MAX_LENGTH, v + 1))}
              accessibilityLabel="One day longer"
            >
              <Text style={[styles.stepBtnText, { color: theme.tint }]}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setAverageLength(28)} style={styles.unsure}>
            <Text style={[styles.unsureText, { color: theme.tint }]}>
              no idea? use 28 — we&apos;ll learn your real number as you log
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: theme.tint, opacity: dateError ? 0.5 : 1 }]}
          onPress={onContinue}
          disabled={!!dateError}
          accessibilityRole="button"
        >
          <Text style={[styles.nextText, { color: theme.onTint }]}>
            {next === "condition" ? "Next →" : "Show my prediction ✨"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },
  backBtn: { alignSelf: "flex-start", paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: "700" },
  content: { padding: Spacing.xl, paddingBottom: 40, gap: Spacing.lg },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  card: { borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.md },
  question: { fontSize: 17, fontWeight: "800" },
  hint: { fontSize: 13, marginTop: -6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1.5 },
  input: { borderWidth: 1.5, borderRadius: Radius.md, padding: 14, fontSize: 16 },
  error: { fontSize: 13, fontWeight: "700" },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.xl },
  stepBtn: { width: 52, height: 52, borderRadius: Radius.pill, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontSize: 26, fontWeight: "700" },
  stepValue: { fontSize: 40, fontWeight: "800", letterSpacing: -1 },
  stepUnit: { fontSize: 13, fontWeight: "600" },
  unsure: { alignSelf: "center", paddingVertical: 4 },
  unsureText: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  nextButton: { paddingVertical: 18, borderRadius: Radius.pill, alignItems: "center", ...Shadow },
  nextText: { fontSize: 17, fontWeight: "800" },
});
