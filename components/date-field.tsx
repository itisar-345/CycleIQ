/**
 * Date input using the native picker (Android dialog, iOS inline calendar in a sheet).
 * Web has no native picker, so it falls back to a YYYY-MM-DD text field.
 * Values are local calendar dates as "YYYY-MM-DD".
 */
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTx } from "@/utils/tone";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import React, { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fromDateKey = (key: string | null): Date | null => {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function DateField({
  value,
  onChange,
  label,
  placeholder,
  minimumDate,
  maximumDate,
  onClear,
}: {
  value: string | null;
  onChange: (dateKey: string) => void;
  /** Spoken by screen readers, e.g. "Period start date". */
  label: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Shows a "clear" action for optional dates. */
  onClear?: () => void;
}) {
  const theme = Colors[useColorScheme() ?? "light"];
  const tx = useTx();
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState<Date>(new Date());
  const date = fromDateKey(value);
  const shown = date ? format(date, "EEE, MMM d, yyyy") : placeholder ?? tx("pick a date", "Select a date");

  if (Platform.OS === "web") {
    return (
      <TextInput
        style={[styles.field, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }]}
        value={value ?? ""}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel={`${label}, year month day`}
        maxLength={10}
      />
    );
  }

  const open = () => {
    const initial = date ?? maximumDate ?? new Date();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: initial,
        mode: "date",
        minimumDate,
        maximumDate,
        onChange: (event: DateTimePickerEvent, picked?: Date) => {
          if (event.type === "set" && picked) onChange(toDateKey(picked));
        },
      });
    } else {
      setIosDraft(initial);
      setIosOpen(true);
    }
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
      <TouchableOpacity
        onPress={open}
        style={[styles.field, { flex: 1, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${date ? format(date, "MMMM d, yyyy") : tx("not set", "not set")}`}
        accessibilityHint={tx("Opens a date picker", "Opens a date picker")}
      >
        <Text style={{ color: date ? theme.text : theme.textSecondary, fontSize: 16 }}>📅  {shown}</Text>
      </TouchableOpacity>
      {onClear && date && (
        <TouchableOpacity onPress={onClear} style={styles.clear} accessibilityRole="button" accessibilityLabel={`Clear ${label}`}>
          <Text style={{ color: theme.tint, fontWeight: "700" }}>{tx("clear", "Clear")}</Text>
        </TouchableOpacity>
      )}

      {Platform.OS === "ios" && (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setIosOpen(false)} accessibilityLabel={tx("Close", "Close")} />
          <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <DateTimePicker
              value={iosDraft}
              mode="date"
              display="inline"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={(_e, picked) => picked && setIosDraft(picked)}
              accentColor={theme.tint}
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => setIosOpen(false)} style={styles.sheetBtn} accessibilityRole="button">
                <Text style={{ color: theme.textSecondary, fontWeight: "700", fontSize: 16 }}>{tx("cancel", "Cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onChange(toDateKey(iosDraft));
                  setIosOpen(false);
                }}
                style={[styles.sheetBtn, { backgroundColor: theme.tint }]}
                accessibilityRole="button"
              >
                <Text style={{ color: theme.onTint, fontWeight: "800", fontSize: 16 }}>{tx("done", "Done")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, minHeight: 48, justifyContent: "center", fontSize: 16 },
  clear: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.md, minHeight: 44, justifyContent: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { padding: Spacing.lg, paddingBottom: Spacing.xxl, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  sheetActions: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.md, marginTop: Spacing.sm },
  sheetBtn: { paddingHorizontal: Spacing.xl, paddingVertical: 12, borderRadius: Radius.pill, minHeight: 44, justifyContent: "center" },
});
