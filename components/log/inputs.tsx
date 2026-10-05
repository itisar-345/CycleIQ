/**
 * Small controlled inputs used by the Daily Log screen.
 *
 * Options are either plain strings or { value, label } pairs: `value` is what gets
 * stored (safety rules, insights and reports match on it — don't change stored values),
 * `label` is the friendly text shown to the user.
 */
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

const useTheme = () => Colors[useColorScheme() ?? "light"];

const tap = () => {
  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
};

export type Option = string | { value: string; label: string };
const valueOf = (o: Option) => (typeof o === "string" ? o : o.value);
const labelOf = (o: Option) => (typeof o === "string" ? o : o.label);

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={() => {
        tap();
        onPress();
      }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: theme.tintSoft, borderColor: theme.tint }
          : { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? theme.onTintSoft : theme.text, fontWeight: selected ? "700" : "500" }]}>
        {selected ? "✓ " : ""}
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function MultiSelect({
  options,
  selected,
  onChange,
}: {
  options: readonly Option[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (item: string) =>
    onChange(selected.includes(item) ? selected.filter((i) => i !== item) : [...selected, item]);
  return (
    <View style={styles.buttonGroup}>
      {options.map((opt) => (
        <Chip key={valueOf(opt)} label={labelOf(opt)} selected={selected.includes(valueOf(opt))} onPress={() => toggle(valueOf(opt))} />
      ))}
    </View>
  );
}

export function RadioGroup({
  options,
  selected,
  onChange,
}: {
  options: readonly Option[];
  selected: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.buttonGroup}>
      {options.map((opt) => (
        <Chip key={valueOf(opt)} label={labelOf(opt)} selected={selected === valueOf(opt)} onPress={() => onChange(valueOf(opt))} />
      ))}
    </View>
  );
}

/**
 * Integer scale picker from `min` to `max`, drawn as a segmented bar. `null` means
 * "not answered yet" — nothing is highlighted, and the screen saves null instead of
 * inventing a value. `caption` turns the chosen value into a friendly line of text.
 */
export function Scale({
  min,
  max,
  value,
  onChange,
  caption,
  lowLabel,
  highLabel,
}: {
  min: number;
  max: number;
  value: number | null;
  onChange: (val: number) => void;
  caption?: (val: number) => string;
  lowLabel?: string;
  highLabel?: string;
}) {
  const theme = useTheme();
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <View style={{ marginVertical: Spacing.xs }}>
      <View style={styles.scaleRow}>
        {steps.map((num) => {
          const filled = value !== null && num <= value;
          const isValue = value === num;
          return (
            <TouchableOpacity
              key={num}
              onPress={() => {
                tap();
                onChange(num);
              }}
              style={styles.scaleHit}
              accessibilityRole="adjustable"
              accessibilityLabel={`${num} out of ${max}`}
              accessibilityState={{ selected: isValue }}
            >
              <View
                style={[
                  styles.scaleSegment,
                  {
                    backgroundColor: filled ? theme.tint : theme.surfaceAlt,
                    borderColor: isValue ? theme.tint : theme.border,
                    height: isValue ? 28 : 22,
                  },
                ]}
              >
                {isValue && <Text style={[styles.scaleValue, { color: theme.onTint }]}>{num}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.scaleEnds}>
        <Text style={[styles.scaleEndText, { color: theme.textSecondary }]}>{lowLabel ?? min}</Text>
        <Text style={[styles.scaleEndText, { color: theme.textSecondary }]}>{highLabel ?? max}</Text>
      </View>
      {value !== null && caption && (
        <Text style={[styles.caption, { color: theme.tint }]}>{caption(value)}</Text>
      )}
    </View>
  );
}

/** 0–3 severity picker. */
export function Slider4({
  value,
  onChange,
  labels = ["none", "a little", "noticeable", "a lot"],
}: {
  value: number;
  onChange: (val: number) => void;
  labels?: [string, string, string, string];
}) {
  return (
    <RadioGroup
      options={labels.map((label, i) => ({ value: String(i), label }))}
      selected={String(value)}
      onChange={(v) => onChange(Number(v))}
    />
  );
}

const FACES = [
  { emoji: "😭", label: "rough" },
  { emoji: "🙁", label: "meh" },
  { emoji: "😐", label: "mid" },
  { emoji: "🙂", label: "decent" },
  { emoji: "🤩", label: "thriving" },
];

/** 1–5 mood picker; null = not answered yet. */
export function MoodFaces({ value, onChange }: { value: number | null; onChange: (val: number) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.facesContainer}>
      {FACES.map((face, i) => {
        const val = i + 1;
        const isSelected = value === val;
        return (
          <TouchableOpacity
            key={val}
            onPress={() => {
              tap();
              onChange(val);
            }}
            style={[
              styles.face,
              isSelected && { backgroundColor: theme.tintSoft, borderColor: theme.tint },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Mood: ${face.label}`}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={{ fontSize: isSelected ? 34 : 28, opacity: isSelected || value === null ? 1 : 0.45 }}>
              {face.emoji}
            </Text>
            <Text
              style={[
                styles.faceLabel,
                { color: isSelected ? theme.onTintSoft : theme.textSecondary, fontWeight: isSelected ? "800" : "500" },
              ]}
            >
              {face.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function ToggleRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: Spacing.md }}>
        <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
        {hint && <Text style={[styles.toggleHint, { color: theme.textSecondary }]}>{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          tap();
          onChange(v);
        }}
        trackColor={{ true: theme.tint, false: theme.border }}
        thumbColor={Platform.OS === "android" ? (value ? theme.onTint : theme.surface) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  buttonGroup: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 14 },
  scaleRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  scaleHit: { flex: 1, paddingVertical: 8, alignItems: "stretch", justifyContent: "center" },
  scaleSegment: { borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  scaleValue: { fontSize: 12, fontWeight: "800" },
  scaleEnds: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  scaleEndText: { fontSize: 12, fontWeight: "600" },
  caption: { fontSize: 14, fontWeight: "700", marginTop: Spacing.sm },
  facesContainer: { flexDirection: "row", justifyContent: "space-between", gap: 4 },
  face: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  faceLabel: { fontSize: 12, marginTop: 2 },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  toggleLabel: { fontSize: 15, fontWeight: "600" },
  toggleHint: { fontSize: 12, marginTop: 2 },
});
