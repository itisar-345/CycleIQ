import { Colors } from "@/constants/theme";
import { getCycle, updateCycle, type CycleRow } from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { decryptField, encryptField } from "@/utils/fieldEncryption";
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
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const [cycle, setCycle] = useState<CycleRow | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  // Decrypted notes as loaded, so Save only re-encrypts when the text actually changed.
  const [originalNotes, setOriginalNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const thisCycle = await getCycle(id);
      if (thisCycle) {
        setCycle(thisCycle);
        setStartDate(thisCycle.start_date.slice(0, 10)); // YYYY-MM-DD
        setEndDate(thisCycle.end_date ? thisCycle.end_date.slice(0, 10) : "");
        let decrypted = "";
        try {
          decrypted = thisCycle.notes_encrypted ? await decryptField(thisCycle.notes_encrypted) : "";
        } catch {
          Alert.alert("can't open these notes 🔒", "They were encrypted with a key this phone doesn't have anymore.");
        }
        setNotes(decrypted);
        setOriginalNotes(decrypted);
      }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (!cycle || !id) return;
    const updates: Parameters<typeof updateCycle>[1] = {};
    if (startDate !== cycle.start_date.slice(0, 10))
      updates.start_date = startDate;
    if (endDate !== (cycle.end_date?.slice(0, 10) || ""))
      updates.end_date = endDate || null;
    if (notes !== originalNotes)
      updates.notes_encrypted = notes ? await encryptField(notes) : "";

    await updateCycle(id, updates);
    Alert.alert("updated ✅", "Your cycle's been fixed up.");
    router.back();
  };

  if (!cycle) return <Text style={{ color: theme.textSecondary, padding: 20 }}>loading…</Text>;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>edit this cycle ✏️</Text>

        <View style={[styles.field, { borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            when did it start?
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
            when did your period end?
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
            notes 🔒 (encrypted)
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
            placeholder="anything worth remembering about this cycle…"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.tint }]}
          onPress={handleSave}
        >
          <Text style={[styles.saveText, { color: theme.onTint }]}>save changes</Text>
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
  saveText: { fontSize: 18, fontWeight: "bold" },
});
