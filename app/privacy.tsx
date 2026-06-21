import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";

const sections = [
  {
    title: "What stays on your device",
    body: "Cycle logs, symptoms, settings, predictions, insights, and generated reports are stored locally on this device. CycleIQ does not send health data to a server for core app features.",
  },
  {
    title: "When data leaves the app",
    body: "Data leaves CycleIQ only when you choose an explicit action such as sharing a report or exporting your local data file. The share sheet is controlled by your device.",
  },
  {
    title: "Encryption",
    body: "Sensitive free-text notes are encrypted before storage with a key kept in device secure storage. SQLite database encryption is configured for native builds that include SQLCipher support.",
  },
  {
    title: "Health imports",
    body: "Health data import is optional and read-only. If enabled, CycleIQ uses it to fill local log fields such as sleep, steps, and activity.",
  },
  {
    title: "Analytics and crash reporting",
    body: "This app build does not include analytics SDKs or third-party crash reporting SDKs that transmit personal or health data.",
  },
  {
    title: "Your controls",
    body: "You can export a copy of local data, create a SQLite database-file backup, or delete local SQLite data and generated files from Settings after confirmation.",
  },
];

export default function PrivacyScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.tint }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: theme.textSecondary }]}>
          CycleIQ is designed around local-first menstrual and symptom tracking.
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
  section: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21 },
});
