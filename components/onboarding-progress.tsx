import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  step: number;
  total: number;
  label?: string;
};

export function OnboardingProgress({ step, total, label }: Props) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {Array.from({ length: total }, (_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                {
                  backgroundColor: i < step ? theme.tint : theme.border,
                  marginRight: i < total - 1 ? 6 : 0,
                },
              ]}
            />
          ))}
      </View>
      <Text style={[styles.caption, { color: theme.textSecondary }]}>
        {label ?? `Step ${step} of ${total}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingHorizontal: 4 },
  row: { flexDirection: "row", alignItems: "center", height: 6 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  caption: { fontSize: 13, fontWeight: "600" },
});
