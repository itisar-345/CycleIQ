import { Colors } from "@/constants/theme";
import { deleteCycle, getAllCycles } from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const [cycles, setCycles] = useState<any[]>([]);

  const loadCycles = async () => {
    const all = await getAllCycles();
    setCycles(all);
  };

  useEffect(() => {
    loadCycles();
  }, []);

  const handleDelete = (cycleId: string) => {
    Alert.alert(
      "Delete cycle",
      "Are you sure you want to delete this cycle and its symptom logs?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
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
        <Text style={[styles.title, { color: theme.text }]}>Cycle History</Text>
        {cycles.length === 0 ? (
          <Text style={{ color: theme.textSecondary }}>
            No cycles logged yet. Start your first period from home.
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
                onPress={() => router.push(`/cycle/${cycle.id}` as any)}
              >
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {new Date(cycle.start_date).toDateString()} →{" "}
                  {cycle.end_date
                    ? new Date(cycle.end_date).toDateString()
                    : "ongoing"}
                </Text>
                <Text style={{ color: theme.textSecondary }}>
                  Cycle: {cycle.cycle_length ?? "—"} d • Period:{" "}
                  {cycle.period_length ?? "—"} d
                </Text>
              </TouchableOpacity>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.tint }]}
                  onPress={() => router.push(`/cycle/${cycle.id}` as any)}
                >
                  <Text style={{ color: theme.tint }}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.error }]}
                  onPress={() => handleDelete(cycle.id)}
                >
                  <Text style={{ color: theme.error }}>Delete</Text>
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
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  row: { flexDirection: "row", marginTop: 12, gap: 10 },
  actionBtn: { padding: 8, borderWidth: 1, borderRadius: 10 },
});
