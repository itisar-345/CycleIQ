import { Colors } from "@/constants/theme";
import { getAllCycles, getAllEntries } from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import {
  AppointmentPrepSummary,
  buildAppointmentPrepSummary,
  generateAppointmentPrepHtml,
} from "@/utils/appointmentPrep";
import { savePdfToReports, shareReport } from "@/utils/localReports";
import { format } from "date-fns";
import { router } from "expo-router";
import * as Print from "expo-print";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AppointmentPrepScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { currentMode } = useAppStore();
  const [summary, setSummary] = useState<AppointmentPrepSummary | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const cycles = await getAllCycles();
      const entries = await getAllEntries();
      setSummary(buildAppointmentPrepSummary(cycles, entries, currentMode));
    };
    load();
  }, [currentMode]);

  const updateField = (field: keyof AppointmentPrepSummary, value: string) => {
    setSummary((current) => current ? { ...current, [field]: value } : current);
  };

  const exportPdf = async () => {
    if (!summary) return;
    setSaving(true);
    try {
      const html = generateAppointmentPrepHtml(summary);
      const { uri: tempUri } = await Print.printToFileAsync({ html });
      const fileName = `CycleIQ_Appointment_Prep_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`;
      const permanentUri = await savePdfToReports(tempUri, fileName);
      const shared = await shareReport(permanentUri);
      if (!shared) Alert.alert("prep saved 📄", `It's in Saved Reports.\n\n${permanentUri}`);
    } catch (error) {
      console.error("Appointment prep export failed", error);
      Alert.alert("export didn't work 😕", "Couldn't make the PDF — try again?");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.tint }]}>‹ back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>appointment prep 📝</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {!summary ? (
          <Text style={{ color: theme.textSecondary }}>pulling your notes together…</Text>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>what your logs say (auto-filled) ✨</Text>
              <Text style={[styles.label, { color: theme.textSecondary }]}>dates covered</Text>
              <Text style={[styles.value, { color: theme.text }]}>{summary.dateRange}</Text>
              <Text style={[styles.label, { color: theme.textSecondary }]}>cycles</Text>
              <Text style={[styles.value, { color: theme.text }]}>{summary.cycleSummary}</Text>
              <Text style={[styles.label, { color: theme.textSecondary }]}>pain</Text>
              <Text style={[styles.value, { color: theme.text }]}>{summary.painSummary}</Text>
              <Text style={[styles.label, { color: theme.textSecondary }]}>symptoms</Text>
              <Text style={[styles.value, { color: theme.text }]}>{summary.symptomSummary}</Text>
              <Text style={[styles.label, { color: theme.textSecondary }]}>flares & meds</Text>
              <Text style={[styles.value, { color: theme.text }]}>{summary.flareSummary} {summary.medicationSummary}</Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>what I want from this visit 🎯</Text>
              <TextInput
                style={[styles.textArea, { color: theme.text, borderColor: theme.border }]}
                value={summary.goals}
                onChangeText={(value) => updateField("goals", value)}
                multiline
              />
              <Text style={[styles.cardTitle, { color: theme.text, marginTop: 16 }]}>questions to ask (don&apos;t leave without asking!)</Text>
              <TextInput
                style={[styles.textArea, { color: theme.text, borderColor: theme.border }]}
                value={summary.questions}
                onChangeText={(value) => updateField("questions", value)}
                multiline
              />
              <Text style={[styles.cardTitle, { color: theme.text, marginTop: 16 }]}>my notes</Text>
              <TextInput
                style={[styles.textArea, { color: theme.text, borderColor: theme.border }]}
                value={summary.notes}
                onChangeText={(value) => updateField("notes", value)}
                placeholder="anything you don't want to forget in the moment…"
                placeholderTextColor={theme.textSecondary}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: theme.tint, opacity: saving ? 0.7 : 1 }]}
              onPress={exportPdf}
              disabled={saving}
            >
              <Text style={[styles.exportText, { color: theme.onTint }]}>{saving ? "saving…" : "export my one-pager"}</Text>
            </TouchableOpacity>
          </>
        )}
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
  card: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  label: { fontSize: 12, fontWeight: "700", marginTop: 10, marginBottom: 4, textTransform: "uppercase" },
  value: { fontSize: 14, lineHeight: 20 },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 82, textAlignVertical: "top" },
  exportButton: { padding: 16, borderRadius: 12, alignItems: "center" },
  exportText: { fontWeight: "700", fontSize: 16 },
});
