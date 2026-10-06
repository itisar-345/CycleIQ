import { seedInitialCycleFromOnboarding } from "@/database";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { runPredictionEngine } from "@/utils/predictions";
import { useTx } from "@/utils/tone";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { router } from "expo-router";
import { addDays, format, parseISO } from "date-fns";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Pair = readonly [chill: string, classic: string];

const MODE_META: Record<string, { icon: string; headline: Pair; bullets: Pair[] }> = {
  standard: {
    icon: "🗓️",
    headline: ["Here's what you'll get ✨", "What CycleIQ tracks"],
    bullets: [
      ["Period start & end + flow, in two taps", "Period start, end and flow"],
      ["Daily vibe check: mood, pain, energy, sleep", "Daily mood, pain, energy and sleep"],
      ["Lifestyle stuff — stress, food, movement", "Lifestyle factors: stress, diet and exercise"],
      ["Patterns you'd never spot yourself (like sleep vs. pain)", "Personal patterns, such as how sleep relates to pain"],
    ],
  },
  peri: {
    icon: "🌙",
    headline: ["Here's what you'll get ✨", "What CycleIQ tracks"],
    bullets: [
      ["Predictions that adapt — no 28-day assumptions", "Adaptive predictions with no fixed cycle length assumed"],
      ["Hot flashes, night sweats, brain blanks", "Hot flashes, night sweats and cognitive changes"],
      ["Mood & energy across unpredictable phases", "Mood and energy across irregular cycles"],
      ["Post-pill? Predictions unlock after a 90-day baseline", "Post-pill baseline: predictions start after 90 days"],
    ],
  },
  pcos: {
    icon: "💚",
    headline: ["Here's what you'll get for PCOS ✨", "What CycleIQ tracks for PCOS"],
    bullets: [
      ["Honest prediction windows built for irregular cycles", "Wider prediction windows suited to irregular cycles"],
      ["Skin, cravings, weight & hormone symptoms", "Acne, cravings, weight and hormonal symptoms"],
      ["Patterns your doctor will actually want to see", "Patterns that are useful for your doctor"],
      ["A heads-up if your period goes missing for 90+ days", "An alert if you have no period for 90 days or more"],
    ],
  },
  pcod: {
    icon: "💙",
    headline: ["Here's what you'll get for PCOD ✨", "What CycleIQ tracks for PCOD"],
    bullets: [
      ["Cycle regularity & cyst-linked patterns", "Cycle regularity and cyst-related patterns"],
      ["Skin, hair & weight trends", "Skin, hair and weight trends"],
      ["Ovarian symptom logging", "Ovarian symptom logging"],
      ["Insights tuned to your phases", "Phase-based insights"],
    ],
  },
  endo: {
    icon: "💜",
    headline: ["Here's what you'll get for endo ✨", "What CycleIQ tracks for endometriosis"],
    bullets: [
      ["Flare mode: a 3-question log for bad days + reflections", "Flare mode: a short log for difficult days, plus reflections"],
      ["Bowel, bladder & shoulder pain tracking", "Bowel, bladder and referred shoulder pain"],
      ["A gentle alert if pain is 8+ three days in a row", "An alert if pain is 8 or higher for 3 days in a row"],
      ["Flare patterns across cycles", "Flare patterns across cycles"],
    ],
  },
};

export default function ConsentScreen() {
  const tx = useTx();
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
          ? tx("Your cycles like to freestyle, so this is a best guess — it gets sharper every time you log 🎯", "Your cycles vary, so this is an estimate. It will improve as you log.")
          : isCondition
          ? tx("Early days! This gets way more accurate with each period you log 🎯", "This is an early estimate. It becomes more accurate with each period you log.")
          : tx("Based on the cycle length you gave us. It learns your real rhythm as you log 🎯", "Based on the cycle length you entered. It will adjust as you log.");
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
          <Text style={[styles.backText, { color: theme.tint }]}>{tx("← back", "← Back")}</Text>
        </TouchableOpacity>
        <OnboardingProgress step={isCondition ? 5 : 3} total={isCondition ? 5 : 3} label={tx("last step ✨", "Final step")} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 1. AHA MOMENT — single-date anchor + confidence bar + mode-specific qualifier */}
        {predictionDisplay ? (
          <View style={[styles.ahaCard, { backgroundColor: theme.surface, borderColor: theme.tint }]}>
            <Text style={[styles.ahaLabel, { color: theme.textSecondary }]} accessibilityRole="header">{tx("your next period, probably 🔮", "Estimated next period")}</Text>
            <Text style={[styles.ahaDate, { color: theme.tint }]}>{predictionDisplay.date}</Text>
            <Text style={[styles.ahaWindow, { color: theme.textSecondary }]}>{tx("likely window:", "Likely window:")} {predictionDisplay.window}</Text>

            {/* Confidence bar — same pattern as the Home prediction card */}
            <View style={styles.ahaBarRow} accessible accessibilityLabel={`${tx("How sure we are", "Confidence")}: ${Math.round(predictionDisplay.confidence * 100)}%`}>
              <Text style={[styles.ahaBarLabel, { color: theme.textSecondary }]}>{tx("how sure we are", "Confidence")}</Text>
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
            <Text style={styles.ahaIcon} importantForAccessibility="no" accessibilityElementsHidden>{meta.icon}</Text>
            <Text style={[styles.ahaNote, { color: theme.textSecondary }]}>
              {tx("Log your first period and your personal prediction unlocks ✨", "Log your first period to see your personal prediction.")}
            </Text>
          </View>
        )}

        {/* 2. WHAT WE TRACK */}
        <Text style={[styles.sectionLabel, { color: theme.text }]} accessibilityRole="header">{tx(meta.headline[0], meta.headline[1])}</Text>
        <View style={[styles.bulletCard, { backgroundColor: theme.surface }]}>
          {meta.bullets.map((b, i) => (
            <View key={i} style={styles.bulletRow} accessible>
              <Text style={[styles.bullet, { color: theme.tint }]} importantForAccessibility="no">✓</Text>
              <Text style={[styles.bulletText, { color: theme.text }]}>{tx(b[0], b[1])}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.deferNote, { color: theme.textSecondary }]}>
          {isCondition
            ? tx("More details (other conditions, pain spots, flare history) can go in Profile later — no rush.", "You can add more details, such as other conditions and flare history, in Profile.")
            : tx("Reminders, age and language live in Profile — set them whenever.", "Reminders, age and language can be set in Profile.")}
        </Text>

        {/* 3. PRIVACY — minimal, with link to full policy */}
        <View style={[styles.privacyRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.privacyText}>
            <Text style={[styles.privacyTitle, { color: theme.text }]}>{tx("🔒 your data, your phone", "Your data stays on your device")}</Text>
            <Text style={[styles.privacyBody, { color: theme.textSecondary }]}>
              {tx("No account, no cloud, no tracking. Nothing leaves this device unless you export it yourself.", "No account, cloud storage or tracking. Data leaves this device only if you export it.")}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/privacy")} accessibilityRole="link" style={styles.linkHit}>
            <Text style={[styles.privacyLink, { color: theme.tint }]}>{tx("read it →", "Privacy policy")}</Text>
          </TouchableOpacity>
        </View>

        {/* 4. FINISH */}
        <TouchableOpacity
          style={[styles.finishBtn, { backgroundColor: theme.tint, opacity: completing ? 0.7 : 1 }]}
          onPress={handleComplete}
          disabled={completing}
          accessibilityRole="button"
          accessibilityState={{ busy: completing, disabled: completing }}
        >
          {completing ? (
            <ActivityIndicator color={theme.onTint} />
          ) : (
            <Text style={[styles.finishText, { color: theme.onTint }]}>{tx("let's go ✨", "Get started")}</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 6, minHeight: 44, justifyContent: "center" },
  linkHit: { minHeight: 44, justifyContent: "center" },
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
