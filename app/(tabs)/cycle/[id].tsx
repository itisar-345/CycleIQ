import { Colors } from "@/constants/theme";
import {
    deleteCycle,
    getAllCycles,
    getCycleEntries,
    updateCycle,
} from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CycleDetailScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const params = useLocalSearchParams();
  const router = useRouter();
  const cycleId = params.id as string;

  const [cycle, setCycle] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  useEffect(() => {
    const load = async () => {
      const all = await getAllCycles();
      const found = all.find((item) => item.id === cycleId);
      setCycle(found);
      if (found) {
        setEditStartDate(found.start_date.split("T")[0]);
        setEditEndDate(found.end_date ? found.end_date.split("T")[0] : "");
        const cycleEntries = await getCycleEntries(cycleId);
        setEntries(cycleEntries);
      }
    };

    load();
  }, [cycleId]);

  const handleMarkEnded = async () => {
    if (!cycle) return;
    const today = new Date().toISOString();
    const start = new Date(cycle.start_date);
    const periodLen = Math.max(
      1,
      Math.ceil(
        (new Date(today).getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1,
    );
    await updateCycle(cycleId, { end_date: today, period_length: periodLen });
    load();
  };

  const handleSaveEdit = async () => {
    if (!cycle) return;
    const start = new Date(editStartDate);
    const end = editEndDate ? new Date(editEndDate) : null;
    const cycleLen = end
      ? Math.max(
          1,
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
            1,
        )
      : null;
    const periodLen = end
      ? Math.max(
          1,
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
            1,
        )
      : null;
    await updateCycle(cycleId, {
      start_date: start.toISOString(),
      end_date: end ? end.toISOString() : null,
      cycle_length: cycleLen,
      period_length: periodLen,
    });
    setIsEditing(false);
    load();
  };

  const handleDelete = () => {
    Alert.alert("Delete cycle", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteCycle(cycleId);
          router.replace("/history" as any);
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Stack.Screen options={{ title: "Cycle Detail" }} />
      <ScrollView contentContainerStyle={styles.content}>
        {!cycle ? (
          <Text style={{ color: theme.textSecondary }}>Loading...</Text>
        ) : (
          <>
            <Text style={[styles.title, { color: theme.text }]}>
              Cycle from {new Date(cycle.start_date).toLocaleDateString()}
            </Text>
            <Text style={{ color: theme.textSecondary }}>
              End date:{" "}
              {cycle.end_date
                ? new Date(cycle.end_date).toLocaleDateString()
                : "ongoing"}
            </Text>
            <Text style={{ color: theme.textSecondary }}>
              Cycle length: {cycle.cycle_length ?? "unknown"} day(s)
            </Text>
            <Text style={{ color: theme.textSecondary }}>
              Period length: {cycle.period_length ?? "unknown"} day(s)
            </Text>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: theme.tint }]}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Text style={{ color: theme.tint }}>
                {isEditing ? "Cancel Edit" : "Edit Cycle"}
              </Text>
            </TouchableOpacity>

            {isEditing && (
              <View style={styles.editContainer}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Start Date
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.border },
                  ]}
                  value={editStartDate}
                  onChangeText={setEditStartDate}
                  placeholder="YYYY-MM-DD"
                />
                <Text style={[styles.label, { color: theme.text }]}>
                  End Date (optional)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.border },
                  ]}
                  value={editEndDate}
                  onChangeText={setEditEndDate}
                  placeholder="YYYY-MM-DD"
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: theme.tint }]}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.primaryText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            )}

            {!cycle.end_date && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.tint }]}
                onPress={handleMarkEnded}
              >
                <Text style={styles.primaryText}>Mark as ended today</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.dangerBtn, { borderColor: theme.error }]}
              onPress={handleDelete}
            >
              <Text style={{ color: theme.error }}>Delete cycle</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Logged entries
            </Text>
            {entries.length === 0 ? (
              <Text style={{ color: theme.textSecondary }}>
                No entries for this cycle yet.
              </Text>
            ) : (
              entries.map((entry) => (
                <View
                  key={entry.id}
                  style={[styles.entryCard, { borderColor: theme.border }]}
                >
                  <Text style={{ color: theme.text }}>
                    {new Date(entry.logged_date).toLocaleDateString()}
                  </Text>
                  <Text style={{ color: theme.textSecondary }}>
                    Pain: {entry.pain_score ?? "—"}, Mood:{" "}
                    {entry.mood_score ?? "—"}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 6 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
  },
  primaryBtn: {
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
  },
  dangerBtn: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  entryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  editContainer: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    marginVertical: 8,
  },
  label: { fontSize: 14, marginBottom: 4, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
});
