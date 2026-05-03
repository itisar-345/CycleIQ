import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { getAllCycles, getPhaseAverages, generateInsights, persistAndRetireInsights, CycleInsight, PhaseAverage, getCyclePredictions } from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { scheduleInsightNotification, scheduleFlareWarning } from "@/utils/notifications";
import { PredictionResult } from "@/utils/predictions";
import { format, parseISO } from "date-fns";
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
  const { currentMode, dismissedInsights, dismissInsight: storeDismissInsight, notificationPrefs } = useAppStore();

  const [cycles, setCycles] = useState<any[]>([]);
  const [phaseAverages, setPhaseAverages] = useState<PhaseAverage[]>([]);
  const [insights, setInsights] = useState<CycleInsight[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const allCycles = await getAllCycles();
      setCycles(allCycles);
      const pred = await getCyclePredictions(currentMode, false, null);
      setPrediction(pred);
      if (allCycles.length > 0) {
        const avgs = await getPhaseAverages(allCycles[0].id);
        setPhaseAverages(avgs);
      }
      const fetchedInsights = await generateInsights(currentMode);
      fetchedInsights.sort((a, b) => Math.abs(b.correlation || 0) - Math.abs(a.correlation || 0));
      setInsights(fetchedInsights);
      // Persist correlations and retire stale ones (90-day re-evaluation)
      await persistAndRetireInsights(fetchedInsights);
      // Fire notification for any new strong insight (|r| > 0.5)
      const strongNew = fetchedInsights.find(
        (i) => i.correlation !== undefined && Math.abs(i.correlation) > 0.5
      );
      if (strongNew && notificationPrefs.insights) {
        await scheduleInsightNotification(strongNew.title, true);
      }
      // Schedule flare warning for endo users if a flare onset pattern exists
      if (currentMode === "endo" && notificationPrefs.flares && allCycles.length > 0) {
        const flareInsight = fetchedInsights.find((i) => i.title === "Flare Onset Pattern");
        if (flareInsight?.description) {
          const match = flareInsight.description.match(/Cycle Day (\d+)/);
          if (match) {
            const avgOnsetDay = parseInt(match[1], 10);
            const latestStart = new Date(allCycles[0].start_date);
            const avgCycleLen = allCycles[0].cycle_length || 28;
            // Predict flare date in the current cycle
            const predictedFlare = new Date(latestStart);
            predictedFlare.setDate(predictedFlare.getDate() + avgOnsetDay - 1);
            // If it's in the future, schedule warning
            if (predictedFlare > new Date()) {
              await scheduleFlareWarning(predictedFlare, 0.75, true);
            } else {
              // Try next cycle
              const nextCycleStart = new Date(latestStart);
              nextCycleStart.setDate(nextCycleStart.getDate() + avgCycleLen);
              const nextFlare = new Date(nextCycleStart);
              nextFlare.setDate(nextFlare.getDate() + avgOnsetDay - 1);
              await scheduleFlareWarning(nextFlare, 0.75, true);
            }
          }
        }
      }
    };
    loadData();
  }, [currentMode]);
  const visibleInsights = insights.filter((i) => !dismissedInsights.includes(i.title));

  const dismissInsight = (title: string) => {
    storeDismissInsight(title);
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

        {/* Prediction Summary Card */}
        {prediction && prediction.model !== "none" && (
          <View style={[styles.predCard, { backgroundColor: theme.surface, borderColor: theme.tint }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 20 }}>🔮</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>Next Period Prediction</Text>
            </View>
            {prediction.predictedStartISO && (
              <Text style={{ fontSize: 26, fontWeight: 'bold', color: theme.tint, marginBottom: 2 }}>
                {format(parseISO(prediction.predictedStartISO), 'MMMM d, yyyy')}
              </Text>
            )}
            {prediction.windowStartISO && prediction.windowEndISO && (
              <Text style={{ color: theme.textSecondary, marginBottom: 10 }}>
                Likely window: {format(parseISO(prediction.windowStartISO), 'MMM d')} – {format(parseISO(prediction.windowEndISO), 'MMM d')}
              </Text>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Confidence</Text>
              <Text style={{ color: theme.tint, fontWeight: 'bold', fontSize: 13 }}>{Math.round(prediction.confidence * 100)}%</Text>
            </View>
            <View style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: 'hidden', marginBottom: 8 }}>
              <View style={{ width: `${Math.round(prediction.confidence * 100)}%`, height: 8, borderRadius: 4, backgroundColor: theme.tint }} />
            </View>
            {prediction.mae !== null && (
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Historical accuracy: ±{prediction.mae} days</Text>
            )}
            {prediction.outlierFlagged && (
              <Text style={{ color: theme.error ?? '#E53E3E', fontSize: 13, marginTop: 4 }}>
                ⚠️ Last cycle was unusually long — window is wider.
              </Text>
            )}
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 8 }}>
              {prediction.label} · Not medical advice
            </Text>
          </View>
        )}

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

        {visibleInsights.map((insight, idx) => (
          <View
            key={idx}
            style={[
              styles.insightCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.correlationBadge}>
                <Text style={{ color: theme.tint, fontWeight: "bold", fontSize: 12 }}>
                  {insight.correlation !== undefined
                    ? `|r| = ${Math.abs(insight.correlation)} (n=${insight.n || "?"})`
                    : "Pattern"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => dismissInsight(insight.title)}>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Not useful ×</Text>
              </TouchableOpacity>
            </View>

            {/* Sec 9: "Patterns we've noticed" label on every card */}
            <Text style={[styles.patternLabel, { color: theme.textSecondary }]}>
              Pattern we’ve noticed
            </Text>

            <Text style={[styles.insightTitle, { color: theme.text }]}>{insight.title}</Text>
            <Text style={[styles.insightText, { color: theme.text }]}>{insight.description}</Text>

            {/* Sec 9: Mental health disclaimer on relevant cards */}
            {insight.isMentalHealth && (
              <View style={[styles.mhDisclaimer, { backgroundColor: theme.border + "60" }]}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>
                  ⚠️ Mood and stress patterns can have many contributing factors. This is not a clinical assessment — if you’re struggling, please reach out to a healthcare professional.
                </Text>
              </View>
            )}

            <View style={styles.cardFooter}>
              <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                Not medical advice · 90-day history
              </Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    "How we calculated this",
                    "We run a Spearman correlation across 90 days of your logged data. Patterns require n≥20 days and p<0.05. This shows association only — not causation."
                  )
                }
              >
                <IconSymbol name="info.circle" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {visibleInsights.length === 0 && cycles.length >= 3 && (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ color: theme.textSecondary }}>
              No new insights right now. Keep logging!
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
  sectionCard: { padding: 20, borderRadius: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  avgRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  insightTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  patternLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" },
  mhDisclaimer: { padding: 10, borderRadius: 8, marginBottom: 12 },
  predCard: { padding: 20, borderRadius: 16, borderWidth: 2, marginBottom: 20 },
});
