import { Colors, Radius, Shadow } from "@/constants/theme";
import { format } from "date-fns";
import { useTx } from "@/utils/tone";
import { deleteCycle, getAllCycles, type CycleRow } from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HistoryScreen() {
  const tx = useTx();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const [cycles, setCycles] = useState<CycleRow[]>([]);

  const loadCycles = async () => {
    const all = await getAllCycles();
    setCycles(all);
  };

  useEffect(() => {
    loadCycles();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCycles();
    }, []),
  );

  const handleDelete = (cycleId: string) => {
    Alert.alert(
      tx("delete this cycle? 🗑️", "Delete this cycle?"),
      tx("This also deletes its symptom logs, and it can't be undone.", "This also deletes its symptom logs. This can't be undone."),
      [
        { text: tx("keep it", "Cancel"), style: "cancel" },
        {
          text: tx("delete", "Delete"),
          style: "destructive",
          onPress: async () => {
            await deleteCycle(cycleId);
            loadCycles();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/calendar"))}
          style={styles.backHit}
          accessibilityRole="button"
        >
          <Text style={{ color: theme.tint, fontWeight: "700", fontSize: 16 }}>{tx("‹ back", "‹ Back")}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">{tx("your cycle history 🗂️", "Cycle history")}</Text>
        {cycles.length === 0 ? (
          <Text style={{ color: theme.textSecondary }}>
            {tx('nothing here yet — tap "my period started" on Home and your history starts building ✨', 'No cycles yet. Log a period start from Home to begin your history.')}
          </Text>
        ) : (
          cycles.map((cycle) => (
            <View
              key={cycle.id}
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <TouchableOpacity
                onPress={() => router.push(`/cycle/${cycle.id}`)}
                accessibilityRole="button"
                accessibilityHint={tx("Opens cycle details", "Opens cycle details")}
              >
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {format(new Date(cycle.start_date), "MMM d, yyyy")}
                  {cycle.cycle_length === null ? tx("  ·  current cycle 🔄", "  ·  Current cycle") : ""}
                </Text>
                <Text style={{ color: theme.textSecondary }}>
                  {cycle.cycle_length !== null ? `${cycle.cycle_length}-day cycle` : tx("still going", "In progress")} · {cycle.period_length !== null ? `${cycle.period_length}-day period` : tx("period length not logged", "Period length not logged")}
                </Text>
              </TouchableOpacity>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.tint }]}
                  onPress={() => router.push(`/cycle/${cycle.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${tx("View", "View")} ${format(new Date(cycle.start_date), "MMMM d, yyyy")}`}
                >
                  <Text style={{ color: theme.tint, fontWeight: "700" }}>{tx("view", "View")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.tint }]}
                  onPress={() => router.push(`/cycle/${cycle.id}/edit`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${tx("Edit", "Edit")} ${format(new Date(cycle.start_date), "MMMM d, yyyy")}`}
                >
                  <Text style={{ color: theme.tint, fontWeight: "700" }}>{tx("edit", "Edit")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.error }]}
                  onPress={() => handleDelete(cycle.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${tx("Delete", "Delete")} ${format(new Date(cycle.start_date), "MMMM d, yyyy")}`}
                >
                  <Text style={{ color: theme.error, fontWeight: "700" }}>{tx("delete", "Delete")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5, marginBottom: 16 },
  card: { borderRadius: Radius.lg, padding: 18, marginBottom: 12, ...Shadow },
  cardTitle: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
  row: { flexDirection: "row", marginTop: 12, gap: 10 },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1.5, borderRadius: Radius.pill, minHeight: 44, justifyContent: "center" },
  backHit: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginBottom: 4 },
});
