import { Activity, HeartPulse, Leaf, ShieldCheck, type LucideIcon } from "@/components/icons";
import { EVIDENCE_SOURCES, type EvidenceGrade } from "@/data/evidence";
import type { Guidance, GuidanceKind } from "@/utils/lifestyleGuidance";
import type { Tx } from "@/utils/tone";
import React, { useState } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Theme = { surface: string; border: string; text: string; textSecondary: string; tint: string; error: string; success: string };

const KIND_ICON: Record<GuidanceKind, LucideIcon> = {
  warning: HeartPulse,
  suggestion: Activity,
  positive: ShieldCheck,
  learn: Leaf,
};

const gradeLabel = (grade: EvidenceGrade, tx: Tx): string =>
  ({
    guideline: tx("backed by guidelines", "Guideline recommendation"),
    strong: tx("strong evidence", "Strong evidence"),
    moderate: tx("decent evidence", "Moderate evidence"),
    limited: tx("early / limited evidence", "Limited evidence"),
  })[grade];

/** One evidence-based suggestion, with its grade and tappable sources. */
export function GuidanceCard({ item, theme, tx }: { item: Guidance; theme: Theme; tx: Tx }) {
  const [showSources, setShowSources] = useState(false);
  const Icon = KIND_ICON[item.kind];
  const accent = item.kind === "warning" ? theme.error : item.kind === "positive" ? theme.success : theme.tint;
  const title = tx(item.title[0], item.title[1]);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: item.kind === "warning" ? theme.error : theme.border }]}>
      <View style={styles.header}>
        <Icon size={20} color={accent} strokeWidth={2.25} />
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">{title}</Text>
      </View>
      <Text style={[styles.body, { color: theme.text }]}>{tx(item.body[0], item.body[1])}</Text>
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
          {gradeLabel(item.grade, tx)} · {tx("not medical advice", "Not medical advice")}
        </Text>
        <TouchableOpacity
          onPress={() => setShowSources((v) => !v)}
          style={styles.hit}
          accessibilityRole="button"
          accessibilityState={{ expanded: showSources }}
          accessibilityLabel={`${tx("Sources", "Sources")}: ${title}`}
        >
          <Text style={{ color: theme.tint, fontWeight: "700", fontSize: 13 }}>{tx("sources", "Sources")}</Text>
        </TouchableOpacity>
      </View>
      {showSources &&
        item.sources.map((id) => (
          <TouchableOpacity
            key={id}
            onPress={() => Linking.openURL(EVIDENCE_SOURCES[id].url).catch(() => {})}
            style={styles.source}
            accessibilityRole="link"
            accessibilityLabel={EVIDENCE_SOURCES[id].citation}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 17, textDecorationLine: "underline" }}>
              {EVIDENCE_SOURCES[id].citation}
            </Text>
          </TouchableOpacity>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { fontSize: 17, fontWeight: "bold", flex: 1 },
  body: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, paddingTop: 4 },
  hit: { minHeight: 44, minWidth: 44, alignItems: "flex-end", justifyContent: "center" },
  source: { paddingVertical: 8, minHeight: 44, justifyContent: "center" },
});
