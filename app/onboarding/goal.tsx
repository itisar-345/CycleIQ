import { Colors, Radius, Shadow, Spacing } from "@/constants/theme";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppMode, useAppStore } from "@/store";
import { router } from "expo-router";
import { useTx } from "@/utils/tone";
import { CalendarDays, HeartPulse, Moon } from "@/components/icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GOALS = [
  {
    id: "track",
    label: ["Just track my cycle", "Track my cycle"],
    desc: ["Periods, symptoms, moods — all in one place. Regular or not, we got you.", "Log periods, symptoms and mood. Works for regular or irregular cycles."],
    Icon: CalendarDays,
    mode: "standard" as AppMode,
    next: "/onboarding/cycle-history",
  },
  {
    id: "peri",
    label: ["My cycle does whatever it wants", "My cycle is unpredictable"],
    desc: ["Perimenopause, post-pill, teen, or just unpredictable — predictions adapt to you.", "Perimenopause, post-pill, teen or naturally irregular — predictions adapt."],
    Icon: Moon,
    mode: "peri" as AppMode,
    next: "/onboarding/cycle-history",
  },
  {
    id: "condition",
    label: ["I'm dealing with a condition", "I have a diagnosed condition"],
    desc: ["PCOS, PCOD or endometriosis — deeper tracking + reports your doctor will actually use.", "PCOS, PCOD or endometriosis — detailed tracking and doctor-ready reports."],
    Icon: HeartPulse,
    mode: "standard" as AppMode,
    next: "/onboarding/cycle-history?next=condition",
  },
] as const;

export default function GoalScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { setMode, setPostPillMode, tone, setTone } = useAppStore();
  const tx = useTx();

  const handleSelect = (goal: (typeof GOALS)[number]) => {
    setMode(goal.mode);
    // The post-pill question only appears on the "unpredictable" path.
    if (goal.mode !== "peri") setPostPillMode(false);
    router.push(goal.next);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <OnboardingProgress step={1} total={3} label={tx("step 1 · what brings you here", "Step 1 of 3: your goal")} />
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">{tx("hey, welcome", "Welcome to CycleIQ")}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {tx("What brings you to CycleIQ?", "What would you like to do?")}
        </Text>
        <View style={[styles.privacyPill, { backgroundColor: theme.tintSoft }]}>
          <Text style={[styles.privacy, { color: theme.onTintSoft }]}>
            {tx("everything stays on your phone — no account, no cloud", "Your data stays on this device. No account needed.")}
          </Text>
        </View>

        {/* Pick the voice up front — easy to change later in Profile. */}
        <View style={styles.toneRow} accessibilityRole="radiogroup" accessibilityLabel={tx("How should we talk to you?", "Choose the app's tone")}>
          <Text style={[styles.toneLabel, { color: theme.textSecondary }]}>{tx("vibe:", "Tone:")}</Text>
          {([
            ["chill", "chill"],
            ["classic", "classic"],
          ] as const).map(([value, label]) => {
            const selected = tone === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setTone(value)}
                style={[styles.toneChip, selected ? { backgroundColor: theme.tintSoft, borderColor: theme.tint } : { borderColor: theme.border }]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={value === "chill" ? "Chill: casual and relaxed" : "Classic: plain and calm"}
              >
                <Text style={{ color: selected ? theme.onTintSoft : theme.text, fontWeight: selected ? "800" : "600" }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
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
            accessibilityLabel={`${tx<string>(goal.label[0], goal.label[1])}. ${tx<string>(goal.desc[0], goal.desc[1])}`}
          >
            <View style={[styles.cardIcon, { backgroundColor: theme.tintSoft }]} importantForAccessibility="no" accessibilityElementsHidden>
              <goal.Icon size={24} color={theme.tint} strokeWidth={2.25} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{tx<string>(goal.label[0], goal.label[1])}</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{tx<string>(goal.desc[0], goal.desc[1])}</Text>
            <Text style={[styles.cardArrow, { color: theme.tint }]}>{tx("this is me →", "Continue →")}</Text>
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
  toneRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  toneLabel: { fontSize: 13, fontWeight: "700" },
  toneChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1.5, minHeight: 40, justifyContent: "center" },
  content: { paddingHorizontal: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card: { padding: Spacing.xl, borderRadius: Radius.lg, gap: 6 },
  cardIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  cardArrow: { fontSize: 14, fontWeight: "800", marginTop: 6 },
});
