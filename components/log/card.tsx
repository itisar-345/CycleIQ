/**
 * Layout pieces for the Daily Log: a themed card and a question heading.
 */
import { Colors, Radius, Shadow, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const useTheme = () => Colors[useColorScheme() ?? "light"];

export function Card({
  title,
  icon: Icon,
  subtitle,
  accent,
  children,
}: {
  title?: string;
  /** Lucide icon shown before the title. */
  icon?: LucideIcon;
  subtitle?: string;
  /** Colour for a left accent bar (condition / period cards). */
  accent?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface },
        accent ? { borderLeftWidth: 5, borderLeftColor: accent } : null,
        Shadow,
      ]}
    >
      {title && (
        <View style={styles.titleRow}>
          {Icon && <Icon size={20} color={accent ?? theme.tint} strokeWidth={2.25} accessibilityElementsHidden importantForAccessibility="no" />}
          <Text style={[styles.title, { color: accent ?? theme.text }]} accessibilityRole="header">{title}</Text>
        </View>
      )}
      {subtitle && <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      <View style={title || subtitle ? { marginTop: Spacing.md } : undefined}>{children}</View>
    </View>
  );
}

/** A question inside a card; `first` drops the top margin. */
export function Question({ children, hint, first }: { children: React.ReactNode; hint?: string; first?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: first ? 0 : Spacing.xl, marginBottom: Spacing.sm }}>
      <Text style={[styles.question, { color: theme.text }]}>{children}</Text>
      {hint && <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text>}
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.border, marginVertical: Spacing.lg }} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  title: { fontSize: 19, fontWeight: "800", letterSpacing: -0.2, flexShrink: 1 },
  subtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  question: { fontSize: 16, fontWeight: "700" },
  hint: { fontSize: 13, marginTop: 2, lineHeight: 18 },
});
