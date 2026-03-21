import { Colors } from "@/constants/theme";
import { getAllCycles, updateCycle } from "@/database";
import { useAppStore } from "@/store";
import { router, useLocalSearchParams } from "expo-router";
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

export default function CycleEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useAppStore(
    (state) => state.currentMode ?? "light",
  ) as any;
  const theme = Colors[colorScheme];
  const [cycle, setCycle] = useState<any>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const allCycles = await getAllCycles();
      const thisCycle = allCycles.find((c) => c.id === id);
      if (thisCycle) {
        setCycle(thisCycle);
        setStartDate(thisCycle.start_date.slice(0, 10)); // YYYY-MM-DD
        setEndDate(thisCycle.end_date ? thisCycle.end_date.slice(0, 10) : "");
        setNotes(thisCycle.notes_encrypted || "");
      }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (!cycle || !id) return;
    const updates: any = {};
    if (startDate !== cycle.start_date.slice(0, 10))
      updates.start_date = startDate;
    if (endDate !== (cycle.end_date?.slice(0, 10) || ""))
      updates.end_date = endDate || null;
    if (notes !== (cycle.notes_encrypted || ""))
      updates.notes_encrypted = notes;

    await updateCycle(id as string, updates);
    Alert.alert("Saved", "Cycle updated.");
    router.back();
  };

  if (!cycle) return <Text>Loading...</Text>;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Edit Cycle</Text>

        <View style={[styles.field, { borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Start Date
          </Text>
          <TextInput
            style={[
              styles.input,
              { color: theme.text, borderColor: theme.tint },
            ]}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={[styles.field, { borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            End Date
          </Text>
          <TextInput
            style={[
              styles.input,
              { color: theme.text, borderColor: theme.tint },
            ]}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD (optional)"
          />
        </View>

        <View style={[styles.field, { borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Notes (encrypted)
          </Text>
          <TextInput
            style={[
              styles.textarea,
              { color: theme.text, borderColor: theme.tint },
            ]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholder="Private notes..."
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.tint }]}
          onPress={handleSave}
        >
          <Text style={styles.saveText}>Update Cycle</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "500" },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
  },
  saveBtn: { padding: 16, borderRadius: 16, alignItems: "center" },
  saveText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
});
