import { Colors, Radius, Shadow } from "@/constants/theme";
import { format } from "date-fns";
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
      "delete this cycle? 🗑️",
      "This also deletes its symptom logs, and it can't be undone.",
      [
        { text: "keep it", style: "cancel" },
        {
          text: "delete",
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
        <Text style={[styles.title, { color: theme.text }]}>your cycle history 🗂️</Text>
        {cycles.length === 0 ? (
          <Text style={{ color: theme.textSecondary }}>
            nothing here yet — tap &quot;my period started&quot; on Home and your history starts building ✨
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
              >
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {format(new Date(cycle.start_date), "MMM d, yyyy")}
                  {cycle.cycle_length === null ? "  ·  current cycle 🔄" : ""}
                </Text>
                <Text style={{ color: theme.textSecondary }}>
                  {cycle.cycle_length !== null ? `${cycle.cycle_length}-day cycle` : "still going"} · {cycle.period_length !== null ? `${cycle.period_length}-day period` : "period length not logged"}
                </Text>
              </TouchableOpacity>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.tint }]}
                  onPress={() => router.push(`/cycle/${cycle.id}`)}
                >
                  <Text style={{ color: theme.tint, fontWeight: "700" }}>view</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.tint }]}
                  onPress={() => router.push(`/cycle/${cycle.id}/edit`)}
                >
                  <Text style={{ color: theme.tint, fontWeight: "700" }}>edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.error }]}
                  onPress={() => handleDelete(cycle.id)}
                >
                  <Text style={{ color: theme.error, fontWeight: "700" }}>delete</Text>
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
  actionBtn: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5, borderRadius: Radius.pill },
});
