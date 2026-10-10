import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";import { useTx } from "@/utils/tone";

import { Colors, Radius, Shadow } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";

type Pair = readonly [chill: string, classic: string];

const sections: { title: Pair; body: Pair }[] = [
  {
    title: ["everything lives on your phone", "What stays on your device"],
    body: [
      "Your cycle logs, symptoms, settings, predictions, insights and reports are stored on this device. We don't have a server that receives your health data — there's literally nowhere for it to go.",
      "Cycle logs, symptoms, settings, predictions, insights and reports are stored on this device. CycleIQ has no server that receives your health data.",
    ],
  },
  {
    title: ["when data leaves the app", "When data leaves the app"],
    body: [
      "Only when YOU do it — like sharing a report with your doctor or exporting a backup. Where it goes is up to you (your phone's share sheet handles it).",
      "Only when you choose to share a report or export your data. Your device's share sheet controls where it goes.",
    ],
  },
  {
    title: ["encryption", "Encryption"],
    body: [
      "Private notes (food, meds, flare reflections, cycle notes) are encrypted with a key that stays in your phone's secure storage. The whole database is encrypted too in the real app (not in Expo Go) — Settings shows which one you're on.",
      "Private notes (diet, medication, flare reflections and cycle notes) are encrypted with a key kept in your device's secure storage. The full database is also encrypted in the released app (not in Expo Go); Profile shows the current status.",
    ],
  },
  {
    title: ["app lock & notifications", "App lock and notifications"],
    body: [
      "Turn on app lock and only your face, fingerprint or passcode gets you in. Discreet mode keeps period and symptom details off your lock screen.",
      "App lock requires Face ID, fingerprint or your passcode to open CycleIQ. Discreet notifications keep health details off your lock screen.",
    ],
  },
  {
    title: ["Health app syncing", "Health app import"],
    body: [
      "Totally optional and read-only. If you turn it on, we read sleep, steps and exercise to pre-fill your log. We never write anything to your Health app.",
      "Optional and read-only. If enabled, sleep, steps and exercise are used to pre-fill your log. Nothing is written to your Health app.",
    ],
  },
  {
    title: ["no trackers", "No tracking"],
    body: [
      "No analytics, no ads, no third-party crash reporters sending your info anywhere. Your data isn't the product.",
      "CycleIQ contains no analytics, advertising or third-party crash reporting that sends your information anywhere.",
    ],
  },
  {
    title: ["you're in control", "Your controls"],
    body: [
      "From the You tab you can export your data, make a backup, or delete everything. Deleting is permanent — we'll double-check before we do it.",
      "From Profile you can export your data, create a backup, or delete all data. Deletion is permanent and requires confirmation.",
    ],
  },
];

export default function PrivacyScreen() {
  const tx = useTx();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Text style={[styles.backText, { color: theme.tint }]}>{tx("‹ back", "‹ Back")}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} accessibilityRole="header">{tx("privacy, no jargon", "Privacy policy")}</Text>
        <View style={{ width: 72 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: theme.textSecondary }]}>
          {tx("tl;dr: your data stays on your phone, and we can't see it. here's the full story", "In short: your data stays on your device and we can't see it. Details below.")}
        </Text>
        {sections.map((section) => (
          <View key={section.title[1]} style={[styles.section, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">{tx(section.title[0], section.title[1])}</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>{tx(section.body[0], section.body[1])}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  backButton: { width: 72, paddingVertical: 8, minHeight: 44, justifyContent: "center" },
  backText: { fontWeight: "700" },
  content: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  section: { borderWidth: 0, borderRadius: Radius.lg, padding: 18, marginBottom: 12, ...Shadow },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21 },
});
