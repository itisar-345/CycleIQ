import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { listLocalReports, LocalReportFile, shareReport } from "@/utils/localReports";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatSize = (size: number | null) => {
  if (!size) return "Unknown size";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (timestamp: number | null) => {
  if (!timestamp) return "Unknown date";
  return new Date(timestamp * 1000).toLocaleString();
};

export default function ReportsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const [reports, setReports] = useState<LocalReportFile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const files = await listLocalReports();
    setReports(files);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports]),
  );

  const handleShare = async (report: LocalReportFile) => {
    const shared = await shareReport(report.uri);
    if (!shared) Alert.alert("Report saved locally", report.uri);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.tint }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Saved Reports</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={{ color: theme.textSecondary }}>Loading reports...</Text>
        ) : reports.length === 0 ? (
          <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No saved reports yet</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Export a specialist report or appointment prep PDF and it will appear here.
            </Text>
          </View>
        ) : (
          reports.map((report) => (
            <View key={report.uri} style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reportName, { color: theme.text }]}>{report.name}</Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {report.type === "appointment" ? "Appointment prep" : report.type === "specialist" ? "Specialist report" : "PDF"} · {formatDate(report.modifiedAt)} · {formatSize(report.size)}
                </Text>
              </View>
              <TouchableOpacity style={[styles.shareButton, { backgroundColor: theme.tint }]} onPress={() => handleShare(report)}>
                <Text style={styles.shareText}>Share</Text>
              </TouchableOpacity>
            </View>
          ))
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
  empty: { borderWidth: 1, borderRadius: 12, padding: 18 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptyText: { fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  reportName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  meta: { fontSize: 12, lineHeight: 18 },
  shareButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  shareText: { color: "#fff", fontWeight: "700" },
});
