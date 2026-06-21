import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { router } from "expo-router";
import { addDays, format, parseISO } from "date-fns";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MODE_META: Record<string, { icon: string; headline: string; bullets: string[] }> = {
  standard: {
    icon: "🗓️",
    headline: "Here's what we'll track",
    bullets: [
      "Period start & end, flow intensity",
      "Daily mood, pain, energy, and sleep",
      "Lifestyle triggers — stress, diet, exercise",
      "Pattern insights, e.g. sleep vs. pain correlation",
    ],
  },
  peri: {
    icon: "🌙",
    headline: "Here's what we'll track",
    bullets: [
      "Adaptive predictions — no fixed cycle assumed",
      "Hot flashes, night sweats, cognitive changes",
      "Mood and energy across irregular phases",
      "Post-pill baseline (predictions unlock after 90 days)",
    ],
  },
  pcos: {
    icon: "💚",
    headline: "Here's what we'll track for PCOS",
    bullets: [
      "Wider prediction window for irregular cycles",
      "Acne, cravings, weight, hormonal symptoms",
      "Metabolic proxy signals",
      "Alert if period is absent for 90+ days",
    ],
  },
  pcod: {
    icon: "🌿",
    headline: "Here's what we'll track for PCOD",
    bullets: [
      "Cycle regularity and cyst-linked patterns",
      "Hormonal acne, hair thinning, weight trends",
      "Ovarian symptom logging",
      "Personalised phase insights",
    ],
  },
  endo: {
    icon: "💜",
    headline: "Here's what we'll track for Endometriosis",
    bullets: [
      "Flare timer, severity, and reflection prompts",
      "Bowel, bladder, and referred shoulder pain",
      "Red-flag alerts — pain 8+ for 3 consecutive days",
      "Flare-onset pattern detection across cycles",
    ],
  },
};

export default function ConsentScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { setOnboarded, currentMode, averageCycleLength, lastPeriodDate, cycleVarianceDays } = useAppStore();

  const meta = MODE_META[currentMode] ?? MODE_META.standard;
  const isCondition = ["pcos", "pcod", "endo"].includes(currentMode);

  // Single-date anchor for all modes — paired with a legible confidence bar and mode-specific qualifier.
  // A window label alone ("May 12 – Jun 1") doesn't tell the user how confident we are; the bar does.
  const predictionDisplay = (() => {
    if (!lastPeriodDate || !averageCycleLength) return null;
    try {
      const center = addDays(parseISO(lastPeriodDate), averageCycleLength);
      const variance = cycleVarianceDays ?? (currentMode === "peri" ? 14 : isCondition ? 10 : 4);
      // Confidence: inversely proportional to variance, capped 0.3–0.85
      const confidence = Math.max(0.30, Math.min(0.85, 1 - variance / 28));
      const qualifier =
        currentMode === "peri"
          ? "Your cycles vary, so this is a best guess — it will sharpen as you log."
          : isCondition
          ? "Based on limited data — this gets more accurate with each logged cycle."
          : "Based on your reported cycle length. Refines as you log."
      return {
        date: format(center, "MMMM d, yyyy"),
        confidence,
        windowDays: variance,
        qualifier,
      };
    } catch {
      return null;
    }
  })();

  const handleComplete = () => {
    setOnboarded(true);
    router.replace("/(tabs)" as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.tint }]}>← Back</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 1. AHA MOMENT — single-date anchor + confidence bar + mode-specific qualifier */}
        {predictionDisplay ? (
          <View style={[styles.ahaCard, { backgroundColor: theme.surface, borderColor: theme.tint }]}>
            <Text style={[styles.ahaLabel, { color: theme.textSecondary }]}>ESTIMATED NEXT PERIOD</Text>
            <Text style={[styles.ahaDate, { color: theme.tint }]}>{predictionDisplay.date}</Text>

            {/* Confidence bar — same pattern as the Home prediction card */}
            <View style={styles.ahaBarRow}>
              <Text style={[styles.ahaBarLabel, { color: theme.textSecondary }]}>Confidence</Text>
              <Text style={[styles.ahaBarLabel, { color: theme.tint, fontWeight: "700" }]}>
                {Math.round(predictionDisplay.confidence * 100)}%
              </Text>
            </View>
            <View style={[styles.ahaBarTrack, { backgroundColor: theme.border }]}>
              <View style={[styles.ahaBarFill, { backgroundColor: theme.tint, width: `${Math.round(predictionDisplay.confidence * 100)}%` as any }]} />
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
              Log your first period to unlock your personalised prediction.
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
            ? "Comorbidities, pain locations, and flare history can be added from your profile after setup."
            : "Notifications, age, and language preferences can be set from your profile after setup."}
        </Text>

        {/* 3. PRIVACY — minimal, with link to full policy */}
        <View style={[styles.privacyRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.privacyText}>
            <Text style={[styles.privacyTitle, { color: theme.text }]}>🔒 Local-only storage</Text>
            <Text style={[styles.privacyBody, { color: theme.textSecondary }]}>
              No accounts, no servers, no analytics. Your data never leaves this device unless you export it.
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/privacy" as any)}>
            <Text style={[styles.privacyLink, { color: theme.tint }]}>Full policy →</Text>
          </TouchableOpacity>
        </View>

        {/* 4. FINISH */}
        <TouchableOpacity
          style={[styles.finishBtn, { backgroundColor: theme.tint }]}
          onPress={handleComplete}
        >
          <Text style={styles.finishText}>Start tracking</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { paddingHorizontal: 16, paddingTop: 8 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: "600" },
  content: { padding: 24, paddingBottom: 48, gap: 18 },
  ahaCard: { padding: 22, borderRadius: 18, borderWidth: 2, gap: 6 },
  ahaLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  ahaDate: { fontSize: 32, fontWeight: "bold", marginBottom: 12 },
  ahaNote: { fontSize: 13, lineHeight: 19 },
  ahaIcon: { fontSize: 40, textAlign: "center", marginBottom: 6 },
  ahaBarRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  ahaBarLabel: { fontSize: 13 },
  ahaBarTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 10 },
  ahaBarFill: { height: 8, borderRadius: 4 },
  ahaQualifier: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  sectionLabel: { fontSize: 18, fontWeight: "700" },
  bulletCard: { padding: 18, borderRadius: 16, gap: 10 },
  bulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  bullet: { fontWeight: "bold", fontSize: 15, marginTop: 1 },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 22 },
  deferNote: { fontSize: 13, lineHeight: 20 },
  privacyRow: { padding: 16, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  privacyText: { flex: 1, gap: 4 },
  privacyTitle: { fontSize: 15, fontWeight: "700" },
  privacyBody: { fontSize: 13, lineHeight: 19 },
  privacyLink: { fontSize: 13, fontWeight: "700", flexShrink: 0 },
  finishBtn: { padding: 18, borderRadius: 16, alignItems: "center" },
  finishText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
});
