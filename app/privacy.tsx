import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";

const sections = [
  {
    title: "📱 everything lives on your phone",
    body: "Your cycle logs, symptoms, settings, predictions, insights and reports are stored on this device. We don't have a server that receives your health data — there's literally nowhere for it to go.",
  },
  {
    title: "📤 when data leaves the app",
    body: "Only when YOU do it — like sharing a report with your doctor or exporting a backup. Where it goes is up to you (your phone's share sheet handles it).",
  },
  {
    title: "🔐 encryption",
    body: "Private notes (food, meds, flare reflections, cycle notes) are encrypted with a key that stays in your phone's secure storage. The whole database is encrypted too in the real app (not in Expo Go) — Settings shows which one you're on.",
  },
  {
    title: "⌚ Health app syncing",
    body: "Totally optional and read-only. If you turn it on, we read sleep, steps and exercise to pre-fill your log. We never write anything to your Health app.",
  },
  {
    title: "🚫 no trackers",
    body: "No analytics, no ads, no third-party crash reporters sending your info anywhere. Your data isn't the product.",
  },
  {
    title: "🎛️ you're in control",
    body: "From the You tab you can export your data, make a backup, or delete everything. Deleting is permanent — we'll double-check before we do it.",
  },
];

export default function PrivacyScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.tint }]}>‹ back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>privacy, no jargon</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: theme.textSecondary }]}>
          tl;dr: your data stays on your phone, and we can&apos;t see it. here&apos;s the full story 👇
        </Text>
        {sections.map((section) => (
          <View key={section.title} style={[styles.section, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>{section.body}</Text>
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
  backButton: { width: 56, paddingVertical: 8 },
  backText: { fontWeight: "700" },
  content: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  section: { borderWidth: 0, borderRadius: Radius.lg, padding: 18, marginBottom: 12, ...Shadow },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21 },
});
