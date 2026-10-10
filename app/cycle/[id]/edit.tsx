import { Colors } from "@/constants/theme";
import { getCycle, updateCycle, type CycleRow } from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DateField, toDateKey } from "@/components/date-field";
import { decryptField, encryptField } from "@/utils/fieldEncryption";
import { useTx } from "@/utils/tone";
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

/** Date-only values are stored at local-noon-safe UTC noon so they never shift a day across time zones. */
const toStoredDate = (dateKey: string) => `${dateKey}T12:00:00.000Z`;

export default function CycleEdit() {
  const tx = useTx();
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
        // Local calendar dates: the stored UTC date can be a day off for evening logs.
        setStartDate(toDateKey(new Date(thisCycle.start_date)));
        setEndDate(thisCycle.end_date ? toDateKey(new Date(thisCycle.end_date)) : "");
        let decrypted = "";
        try {
          decrypted = thisCycle.notes_encrypted ? await decryptField(thisCycle.notes_encrypted) : "";
        } catch {
          Alert.alert(tx("can't open these notes", "Notes unavailable"), tx("They were encrypted with a key this phone doesn't have anymore.", "These notes were encrypted with a key this device no longer has."));
        }
        setNotes(decrypted);
        setOriginalNotes(decrypted);
      }
    };
    load();
  }, [id, tx]);

  const today = toDateKey(new Date());
  const dateError =
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate)
      ? tx("pick a start date", "Please choose a start date.")
      : startDate > today
      ? tx("the start can't be in the future", "The start date can't be in the future.")
      : endDate && endDate < startDate
      ? tx("the end has to be after the start", "The end date must be on or after the start date.")
      : endDate && endDate > today
      ? tx("the end can't be in the future", "The end date can't be in the future.")
      : null;

  const handleSave = async () => {
    if (!cycle || !id || dateError) return;
    const updates: Parameters<typeof updateCycle>[1] = {};
    if (startDate !== toDateKey(new Date(cycle.start_date)))
      updates.start_date = toStoredDate(startDate);
    if (endDate !== (cycle.end_date ? toDateKey(new Date(cycle.end_date)) : ""))
      updates.end_date = endDate ? toStoredDate(endDate) : null;
    if (notes !== originalNotes)
      updates.notes_encrypted = notes ? await encryptField(notes) : "";

    await updateCycle(id, updates);
    Alert.alert(tx("updated", "Saved"), tx("Your cycle's been fixed up.", "Your cycle has been updated."));
    router.back();
  };

  if (!cycle) return <Text style={{ color: theme.textSecondary, padding: 20 }}>{tx("loading…", "Loading…")}</Text>;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backHit} accessibilityRole="button">
          <Text style={{ color: theme.tint, fontWeight: "700", fontSize: 16 }}>{tx("‹ back", "‹ Back")}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">{tx("edit this cycle", "Edit cycle")}</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {tx("when did it start?", "Start date")}
          </Text>
          <DateField
            value={startDate}
            onChange={setStartDate}
            label={tx("Period start date", "Period start date")}
            maximumDate={new Date()}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {tx("when did your period end? (optional)", "Period end date (optional)")}
          </Text>
          <DateField
            value={endDate || null}
            onChange={setEndDate}
            onClear={() => setEndDate("")}
            label={tx("Period end date", "Period end date")}
            placeholder={tx("not ended / not logged", "Not set")}
            minimumDate={/^\d{4}-\d{2}-\d{2}$/.test(startDate) ? new Date(`${startDate}T00:00:00`) : undefined}
            maximumDate={new Date()}
          />
        </View>

        {dateError && (
          <Text style={[styles.error, { color: theme.error }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
            {dateError}
          </Text>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {tx("notes (encrypted)", "Notes (encrypted)")}
          </Text>
          <TextInput
            style={[
              styles.textarea,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt },
            ]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            accessibilityLabel={tx("Cycle notes", "Cycle notes")}
            placeholder={tx("anything worth remembering about this cycle…", "Notes about this cycle")}
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.tint, opacity: dateError ? 0.5 : 1 }]}
          onPress={handleSave}
          disabled={!!dateError}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!dateError }}
        >
          <Text style={[styles.saveText, { color: theme.onTint }]}>{tx("save changes", "Save changes")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 8 },
  backHit: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  error: { fontSize: 14, fontWeight: "700" },
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
