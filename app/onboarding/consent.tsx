import { seedInitialCycleFromOnboarding } from "@/database";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { runPredictionEngine } from "@/utils/predictions";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { router } from "expo-router";
import { addDays, format, parseISO } from "date-fns";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MODE_META: Record<string, { icon: string; headline: string; bullets: string[] }> = {
  standard: {
    icon: "🗓️",
    headline: "Here's what you'll get ✨",
    bullets: [
      "Period start & end + flow, in two taps",
      "Daily vibe check: mood, pain, energy, sleep",
      "Lifestyle stuff — stress, food, movement",
      "Patterns you'd never spot yourself (like sleep vs. pain)",
    ],
  },
  peri: {
    icon: "🌙",
    headline: "Here's what you'll get ✨",
    bullets: [
      "Predictions that adapt — no 28-day assumptions",
      "Hot flashes, night sweats, brain blanks",
      "Mood & energy across unpredictable phases",
      "Post-pill? Predictions unlock after a 90-day baseline",
    ],
  },
  pcos: {
    icon: "💚",
    headline: "Here's what you'll get for PCOS ✨",
    bullets: [
      "Honest prediction windows built for irregular cycles",
      "Skin, cravings, weight & hormone symptoms",
      "Patterns your doctor will actually want to see",
      "A heads-up if your period goes missing for 90+ days",
    ],
  },
  pcod: {
    icon: "💙",
    headline: "Here's what you'll get for PCOD ✨",
    bullets: [
      "Cycle regularity & cyst-linked patterns",
      "Skin, hair & weight trends",
      "Ovarian symptom logging",
      "Insights tuned to your phases",
    ],
  },
  endo: {
    icon: "💜",
    headline: "Here's what you'll get for endo ✨",
    bullets: [
      "Flare mode: a 3-question log for bad days + reflections",
      "Bowel, bladder & shoulder pain tracking",
      "A gentle alert if pain is 8+ three days in a row",
      "Flare patterns across cycles",
    ],
  },
};

export default function ConsentScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { setOnboarded, setActivePeriod, currentMode, averageCycleLength, lastPeriodDate, postPillMode, postPillStartDate } = useAppStore();
  const [completing, setCompleting] = useState(false);

  const meta = MODE_META[currentMode] ?? MODE_META.standard;
  const isCondition = ["pcos", "pcod", "endo"].includes(currentMode);

  // Preview with the same engine and the same seeded cycles Home will use, so the date,
  // window and confidence here match what the user sees right after setup.
  const predictionDisplay = (() => {
    if (!lastPeriodDate || !averageCycleLength) return null;
    try {
      const start = lastPeriodDate.includes("T") ? lastPeriodDate : `${lastPeriodDate}T12:00:00.000Z`;
      const previousStart = addDays(parseISO(start), -averageCycleLength).toISOString();
      const prediction = runPredictionEngine({
        cycles: [
          { start_date: start, cycle_length: null },
          { start_date: previousStart, cycle_length: averageCycleLength },
        ],
        currentMode,
        postPillMode,
        postPillStartDate,
      });
      if (!prediction.predictedStartISO || !prediction.windowStartISO || !prediction.windowEndISO) return null;
      const qualifier =
        currentMode === "peri"
          ? "Your cycles like to freestyle, so this is a best guess — it gets sharper every time you log 🎯"
          : isCondition
          ? "Early days! This gets way more accurate with each period you log 🎯"
          : "Based on the cycle length you gave us. It learns your real rhythm as you log 🎯";
      return {
        date: format(parseISO(prediction.predictedStartISO), "MMMM d"),
        window: `${format(parseISO(prediction.windowStartISO), "MMM d")} – ${format(parseISO(prediction.windowEndISO), "MMM d")}`,
        confidence: prediction.confidence,
        qualifier,
      };
    } catch {
      return null;
    }
  })();

  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      if (lastPeriodDate && averageCycleLength) {
        const { cycleId, isRecentPeriod } = await seedInitialCycleFromOnboarding(
          lastPeriodDate,
          averageCycleLength,
        );
        if (isRecentPeriod && cycleId) {
          const normalizedDate = lastPeriodDate.includes("T")
            ? lastPeriodDate
            : `${lastPeriodDate}T12:00:00.000Z`;
          setActivePeriod(cycleId, normalizedDate);
        }
      }
      setOnboarded(true);
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Onboarding completion failed", error);
      setCompleting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.tint }]}>← Back</Text>
        </TouchableOpacity>
        <OnboardingProgress step={isCondition ? 5 : 3} total={isCondition ? 5 : 3} label="last step ✨" />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 1. AHA MOMENT — single-date anchor + confidence bar + mode-specific qualifier */}
        {predictionDisplay ? (
          <View style={[styles.ahaCard, { backgroundColor: theme.surface, borderColor: theme.tint }]}>
            <Text style={[styles.ahaLabel, { color: theme.textSecondary }]}>your next period, probably 🔮</Text>
            <Text style={[styles.ahaDate, { color: theme.tint }]}>{predictionDisplay.date}</Text>
            <Text style={[styles.ahaWindow, { color: theme.textSecondary }]}>likely window: {predictionDisplay.window}</Text>

            {/* Confidence bar — same pattern as the Home prediction card */}
            <View style={styles.ahaBarRow}>
              <Text style={[styles.ahaBarLabel, { color: theme.textSecondary }]}>how sure we are</Text>
              <Text style={[styles.ahaBarLabel, { color: theme.tint, fontWeight: "700" }]}>
                {Math.round(predictionDisplay.confidence * 100)}%
              </Text>
            </View>
            <View style={[styles.ahaBarTrack, { backgroundColor: theme.border }]}>
              <View style={[styles.ahaBarFill, { backgroundColor: theme.tint, width: `${Math.round(predictionDisplay.confidence * 100)}%` }]} />
            </View>

            {/* One-line qualifier — legible, mode-specific, not footnote-sized */}
            <Text style={[styles.ahaQualifier, { color: theme.text }]}>
              {predictionDisplay.qualifier}
            </Text>
          </View>
        ) : (
          <View style={[styles.ahaCard, { backgroundColor: theme.surface, borderColor: theme.tint }]}>
            <Text style={styles.ahaIcon}>{meta.icon}</Text>
            <Text style={[styles.ahaNote, { color: theme.textSecondary }]}>
              Log your first period and your personal prediction unlocks ✨
            </Text>
          </View>
        )}

        {/* 2. WHAT WE TRACK */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>{meta.headline}</Text>
        <View style={[styles.bulletCard, { backgroundColor: theme.surface }]}>
          {meta.bullets.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bullet, { color: theme.tint }]}>✓</Text>
              <Text style={[styles.bulletText, { color: theme.text }]}>{b}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.deferNote, { color: theme.textSecondary }]}>
          {isCondition
            ? "More details (other conditions, pain spots, flare history) can go in Profile later — no rush."
            : "Reminders, age and language live in Profile — set them whenever."}
        </Text>

        {/* 3. PRIVACY — minimal, with link to full policy */}
        <View style={[styles.privacyRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.privacyText}>
            <Text style={[styles.privacyTitle, { color: theme.text }]}>🔒 your data, your phone</Text>
            <Text style={[styles.privacyBody, { color: theme.textSecondary }]}>
              No account, no cloud, no tracking. Nothing leaves this device unless you export it yourself.
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/privacy")}>
            <Text style={[styles.privacyLink, { color: theme.tint }]}>read it →</Text>
          </TouchableOpacity>
        </View>

        {/* 4. FINISH */}
        <TouchableOpacity
          style={[styles.finishBtn, { backgroundColor: theme.tint, opacity: completing ? 0.7 : 1 }]}
          onPress={handleComplete}
          disabled={completing}
        >
          {completing ? (
            <ActivityIndicator color={theme.onTint} />
          ) : (
            <Text style={[styles.finishText, { color: theme.onTint }]}>let&apos;s go ✨</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: "600" },
  content: { padding: 24, paddingBottom: 48, gap: 18 },
  ahaCard: { padding: 22, borderRadius: Radius.lg, borderWidth: 2, gap: 6, ...Shadow },
  ahaLabel: { fontSize: 13, fontWeight: "700" },
  ahaDate: { fontSize: 36, fontWeight: "800", letterSpacing: -1 },
  ahaWindow: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  ahaNote: { fontSize: 13, lineHeight: 19 },
  ahaIcon: { fontSize: 40, textAlign: "center", marginBottom: 6 },
  ahaBarRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  ahaBarLabel: { fontSize: 13 },
  ahaBarTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 10 },
  ahaBarFill: { height: 8, borderRadius: 4 },
  ahaQualifier: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  sectionLabel: { fontSize: 19, fontWeight: "800" },
  bulletCard: { padding: 18, borderRadius: Radius.lg, gap: 12, ...Shadow },
  bulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  bullet: { fontWeight: "bold", fontSize: 15, marginTop: 1 },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 22 },
  deferNote: { fontSize: 13, lineHeight: 20 },
  privacyRow: { padding: 16, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  privacyText: { flex: 1, gap: 4 },
  privacyTitle: { fontSize: 15, fontWeight: "700" },
  privacyBody: { fontSize: 13, lineHeight: 19 },
  privacyLink: { fontSize: 13, fontWeight: "700", flexShrink: 0 },
  finishBtn: { paddingVertical: 18, borderRadius: Radius.pill, alignItems: "center", ...Shadow },
  finishText: { fontSize: 18, fontWeight: "800" },
});
