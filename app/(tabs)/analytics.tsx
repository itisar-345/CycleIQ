import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { getAllCycles, getPhaseAverages } from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AnalyticsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { currentMode } = useAppStore();

  const [dismissedInsights, setDismissedInsights] = useState<number[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);

  useEffect(() => {
    const loadCycles = async () => {
      const allCycles = await getAllCycles();
      setCycles(allCycles);
      if (allCycles.length > 0) {
        const avgs = await getPhaseAverages(allCycles[0].id);
        // Add phase data to insights or new section
        console.log("Phase averages:", avgs); // Temp, UI below
      }
    };
    loadCycles();
  }, []);
  // 4.6.3 Mocked Generated Insight Strings mapping actual correlations
  const insights = [
    {
      id: 1,
      text: "Your pain scores are 40% higher on days when you sleep fewer than 6 hours. This pattern has held across 8 weeks.",
      sampleSize: 45,
      correlation: -0.62,
      type: "lifestyle",
    },
    {
      id: 2,
      text: "You tend to log better mood on days with 30+ minutes of exercise.",
      sampleSize: 24,
      correlation: 0.44,
      type: "lifestyle",
      mentalHealthWarning: true,
    },
    {
      id: 3,
      text:
        currentMode === "endo"
          ? "Your flares most often begin on cycle days 1–3. You have had 7 flares — 6 of them started in this window."
          : "Your cycles have been longer in months where you logged high-stress weeks.",
      sampleSize: currentMode === "endo" ? 7 : 6,
      correlation: 0.71,
      type: "condition",
    },
  ].filter((i) => !dismissedInsights.includes(i.id));

  const dismissInsight = (id: number) => {
    setDismissedInsights([...dismissedInsights, id]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          Smart Coaching
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Patterns we&apos;ve noticed in your data.
        </Text>

        {cycles.length < 3 && (
          <View
            style={[
              styles.placeholderCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.placeholderTitle, { color: theme.text }]}>
              Building your pattern
            </Text>
            <Text
              style={[styles.placeholderText, { color: theme.textSecondary }]}
            >
              Keep logging for 3+ cycles to unlock personalized insights.
              We&apos;re learning what makes your body unique!
            </Text>
          </View>
        )}

        {/* Sec 4 Cycle-phase overlays */}
        {phaseAverages.length > 0 && (
          <View
            style={[styles.sectionCard, { backgroundColor: theme.surface }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Cycle Phase Trends
            </Text>
            {phaseAverages.map((avg, i) => (
              <View key={i} style={styles.avgRow}>
                <Text style={{ fontWeight: "600", color: theme.text }}>
                  {avg.phase}
                </Text>
                <Text style={{ color: theme.textSecondary }}>
                  Mood: {avg.mood_avg} | Energy: {avg.energy_avg} | Fog:{" "}
                  {avg.brain_fog_avg} (n={avg.count})
                </Text>
              </View>
            ))}
          </View>
        )}
        {phaseAverages.length === 0 && cycles.length >= 3 && (
          <Text style={{ color: theme.textSecondary, textAlign: "center" }}>
            Log symptoms across cycle phases to see trends.
          </Text>
        )}

        {insights.map((insight) => (
          <View
            key={insight.id}
            style={[
              styles.insightCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.correlationBadge}>
                <Text
                  style={{
                    color: theme.tint,
                    fontWeight: "bold",
                    fontSize: 12,
                  }}
                >
                  |r| = {Math.abs(insight.correlation)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => dismissInsight(insight.id)}>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  Not useful ×
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.insightText, { color: theme.text }]}>
              {insight.text}
            </Text>

            <View style={styles.cardFooter}>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                Based on {insight.sampleSize} data points.
              </Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    "How we calculated this",
                    "We run a Spearman correlation pipeline across 90 days of your logged data requiring a minimum of 20 points and |r| > 0.3.",
                  )
                }
              >
                <IconSymbol
                  name="info.circle"
                  size={16}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {insight.mentalHealthWarning && (
              <View
                style={[
                  styles.disclaimer,
                  { backgroundColor: theme.error + "10" },
                ]}
              >
                <Text
                  style={{
                    color: theme.error,
                    fontSize: 11,
                    fontStyle: "italic",
                  }}
                >
                  This is a data pattern, not a diagnosis. If you&apos;re
                  concerned about your mental health, speaking to a doctor or
                  therapist is always a good idea.
                </Text>
              </View>
            )}
          </View>
        ))}

        {insights.length === 0 && (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ color: theme.textSecondary }}>
              No new insights. Keep logging!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: "bold" },
  subtitle: { fontSize: 16, marginBottom: 24 },
  insightCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    alignItems: "center",
  },
  correlationBadge: {
    backgroundColor: "#FFD7CD30",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  insightText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F2DED7",
    paddingTop: 12,
  },
  disclaimer: { marginTop: 12, padding: 10, borderRadius: 8 },
  placeholderCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: "center",
  },
  placeholderTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  placeholderText: { fontSize: 14, textAlign: "center" },
});
