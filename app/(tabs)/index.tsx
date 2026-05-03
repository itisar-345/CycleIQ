import { Colors } from "@/constants/theme";
import { closeCycle, createCycle, getLatestCycle, getDayOfCycle, getPhaseForDay, getCyclePredictions, generateInsights, CycleInsight } from "@/database";
import { PredictionResult } from "@/utils/predictions";
import { scheduleAllCycleNotifications } from "@/utils/notifications";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { differenceInDays, format, parseISO } from "date-fns";
import { router } from "expo-router";
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

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const {
    currentMode,
    userName,
    activePeriodId,
    activePeriodStartDate,
    setActivePeriod,
    inFlare,
    flareStartDate,
    setInFlare,
    checkPCOSPromptCooldown,
    setLastPCOSPrompt,
    postPillMode,
    postPillStartDate,
    isTeen,
    dismissedInsights,
    languagePreset,
    customTerms
  } = useAppStore();
  const [cycleLength, setCycleLength] = useState<number>(28);
  const [latestStartDate, setLatestStartDate] = useState<string | null>(null);
  const [currentCycleDay, setCurrentCycleDay] = useState<number>(1);
  const [currentPhase, setCurrentPhase] = useState<string>("menstrual");
  const [predictionStats, setPredictionStats] = useState<PredictionResult | null>(null);
  const [latestInsight, setLatestInsight] = useState<CycleInsight | null>(null);
  const [medicationLoggedToday, setMedicationLoggedToday] = useState(false);

  // Dynamic terminology
  const flowTerm = languagePreset === 'custom' ? customTerms.flow : 'flow';
  const cycleTerm = languagePreset === 'custom' ? customTerms.cycle : languagePreset === 'inclusive' ? 'cycle' : 'period';

  useEffect(() => {
    const loadLatestCycle = async () => {
      try {
        const latest = await getLatestCycle();
        if (latest && latest.cycle_length) {
          setCycleLength(latest.cycle_length);
        }
        
        if (latest && latest.start_date) {
            setLatestStartDate(latest.start_date);
            const cycleDay = getDayOfCycle(new Date().toISOString(), latest.start_date);
            setCurrentCycleDay(cycleDay);
            setCurrentPhase(getPhaseForDay(cycleDay, latest.cycle_length || 28));
        }
        
        const stats = await getCyclePredictions(currentMode, postPillMode, postPillStartDate ?? null);
        setPredictionStats(stats);

        // Schedule all cycle-aware notifications in one go
        if (stats.predictedStartISO) {
          await scheduleAllCycleNotifications(stats);
        }
        
        const generatedInsights = await generateInsights(currentMode);
        const validInsights = generatedInsights.filter((i: CycleInsight) => !dismissedInsights.includes(i.title));
        validInsights.sort((a: CycleInsight, b: CycleInsight) => Math.abs(b.correlation || 0) - Math.abs(a.correlation || 0));
        if (validInsights.length > 0) {
          setLatestInsight(validInsights[0]);
        }

        // Check if medication was already logged today
        const { getAllEntries } = await import("@/database");
        const todayStr = new Date().toISOString().split("T")[0];
        const allEntries = await getAllEntries();
        const todayEntry = allEntries.find((e: any) => e.logged_date?.startsWith(todayStr));
        setMedicationLoggedToday(!!(todayEntry?.medication_log_encrypted));
        
        if (latest && currentMode === "pcos" && !activePeriodId && latest.start_date) {
          const daysSinceStart = differenceInDays(new Date(), parseISO(latest.start_date));
          if (daysSinceStart >= 90) {
            const is120 = daysSinceStart >= 120;
            if (checkPCOSPromptCooldown()) {
              setLastPCOSPrompt(new Date().toISOString());
              const title = is120 ? "Time to check in?" : "It's been a while";
              const message = is120 
                ? `It's been ${daysSinceStart} days since your last period. It might be a good idea to chat with a healthcare provider just to be safe.`
                : `It's been ${daysSinceStart} days since your last period — is everything okay? Remember to log any symptoms.`;
              // Small timeout to allow UI to render first
              setTimeout(() => {
                Alert.alert(title, message, [{ text: "Got it" }]);
              }, 500);
            }
          }
        }
      } catch (error) {
        console.error("Unable to load latest cycle length", error);
      }
    };
    loadLatestCycle();
  }, [activePeriodId, currentMode, dismissedInsights]);

  const handleStartPeriod = () => {
    Alert.alert("Log Period", "Is today the first day of your period?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Today",
        onPress: async () => {
          try {
            const startDate = new Date().toISOString();
            const newId = await createCycle(startDate);
            setActivePeriod(newId, startDate);
            // Refresh prediction immediately after new cycle is created
            const stats = await getCyclePredictions(currentMode, postPillMode, postPillStartDate ?? null);
            setPredictionStats(stats);
            // Schedule period-day self-care & nutrition notifications
            await scheduleAllCycleNotifications(
              stats,
              new Date(startDate)
            );
          } catch (error) {
            console.error("Failed starting period", error);
            Alert.alert(
              "Error",
              "Could not log period start. Please try again.",
            );
          }
        },
      },
    ]);
  };

  const handleEndPeriod = async () => {
    if (!activePeriodId) return;
    try {
      const endDate = new Date().toISOString();
      await closeCycle(activePeriodId, endDate);
      setActivePeriod(null, null);
      // Immediately refresh prediction after cycle is confirmed
      const stats = await getCyclePredictions(currentMode, postPillMode, postPillStartDate ?? null);
      setPredictionStats(stats);
    } catch (error) {
      console.error("Failed closing period", error);
      Alert.alert("Error", "Could not close period. Please try again.");
    }
  };

  const getDayOfPeriod = () => {
    if (!activePeriodStartDate) return 1;
    return differenceInDays(new Date(), parseISO(activePeriodStartDate)) + 1;
  };

  const getFlareDuration = () => {
    if (!flareStartDate) return 1;
    return differenceInDays(new Date(), parseISO(flareStartDate)) + 1;
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>
            Hello{userName ? `, ${userName}` : ""}
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>CycleIQ</Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: (theme as any)[currentMode] || theme.tint },
            ]}
          >
            <Text style={styles.badgeText}>
              {currentMode.toUpperCase()} SETTINGS
            </Text>
          </View>
        </View>

        {/* Post-pill progress bar */}
        {postPillMode && postPillStartDate && (() => {
          const elapsed = differenceInDays(new Date(), parseISO(postPillStartDate));
          const progress = Math.min(elapsed, 90);
          const remaining = Math.max(0, 90 - elapsed);
          return (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.tint, borderWidth: 1, alignItems: 'flex-start' }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Post-Pill Baseline</Text>
              <Text style={{ color: theme.textSecondary, marginBottom: 8 }}>
                Day {progress} of 90 — {remaining > 0 ? `${remaining} days until predictions unlock` : 'Baseline complete — predictions now active'}
              </Text>
              <View style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: 'hidden' }}>
                <View style={{ width: `${(progress / 90) * 100}%`, height: 8, borderRadius: 4, backgroundColor: theme.tint }} />
              </View>
            </View>
          );
        })()}

        {currentMode === "endo" && inFlare && (
          <View style={[styles.periodBanner, { backgroundColor: theme.endo + '15', borderColor: theme.endo }]}>
             <Text style={[styles.bannerTitle, { color: theme.endo }]}>Endo Flare Active</Text>
             <Text style={{ marginTop: 8, color: theme.textSecondary }}>
                 Day {getFlareDuration()} of active flare. Ensure you log your symptoms daily to generate accurate reports.
             </Text>
             <TouchableOpacity style={[styles.bannerBtn, { backgroundColor: theme.endo, marginTop: 16 }]} onPress={() => router.push('/log')}>
                 <Text style={styles.bannerBtnText}>Log Flare Details</Text>
             </TouchableOpacity>
          </View>
        )}

        {/* 3.1.2 Active Period Banner */}
        {activePeriodId ? (
          <View
            style={[
              styles.periodBanner,
              { backgroundColor: theme.error + "15", borderColor: theme.error },
            ]}
          >
            <Text style={[styles.bannerTitle, { color: theme.error }]}>
              Day {getDayOfPeriod()} of your {cycleTerm}
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.bannerBtn, { backgroundColor: theme.error }]}
                onPress={() => router.push("/log")}
              >
                <Text style={styles.bannerBtnText}>Log {flowTerm.charAt(0).toUpperCase() + flowTerm.slice(1)} & Pain</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bannerBtnOutline, { borderColor: theme.error }]}
                onPress={handleEndPeriod}
              >
                <Text style={[styles.bannerBtnText, { color: theme.error }]}>
                  Period Ended
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.startPeriodBtn, { backgroundColor: theme.error }]}
            onPress={handleStartPeriod}
            activeOpacity={0.8}
          >
            <Text style={styles.startPeriodText}>🩸 Log period start</Text>
          </TouchableOpacity>
        )}

        {/* Cycle Overview */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Cycle Status</Text>
          <View style={styles.circleContainer}>
            <View style={[styles.cycleCircle, { borderColor: theme.tint }]}>
              <Text style={[styles.dayText, { color: theme.tint }]}>Day {currentCycleDay}</Text>
              <Text style={[styles.subDayText, { color: theme.textSecondary }]}>of approx. {cycleLength}</Text>
              <Text style={{ color: theme.text, marginTop: 8, fontWeight: 'bold' }}>
                {currentPhase.toUpperCase()} PHASE
              </Text>
            </View>
          </View>
        </View>

        {/* Next Period Prediction Card */}
        {predictionStats && predictionStats.model !== "none" ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.tint, borderWidth: 2, alignItems: 'flex-start' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: 22 }}>🔮</Text>
              <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]}>Next {cycleTerm.charAt(0).toUpperCase() + cycleTerm.slice(1)} Prediction</Text>
            </View>

            {predictionStats.predictedStartISO && (
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.tint, marginBottom: 4 }}>
                {format(parseISO(predictionStats.predictedStartISO), 'MMM d')}
              </Text>
            )}

            {predictionStats.windowStartISO && predictionStats.windowEndISO && (
              <Text style={{ color: theme.textSecondary, fontSize: 15, marginBottom: 12 }}>
                Window: {format(parseISO(predictionStats.windowStartISO), 'MMM d')} – {format(parseISO(predictionStats.windowEndISO), 'MMM d')}
              </Text>
            )}

            {/* Confidence bar */}
            <View style={{ width: '100%', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Confidence</Text>
                <Text style={{ color: theme.tint, fontWeight: 'bold', fontSize: 13 }}>
                  {Math.round(predictionStats.confidence * 100)}%
                </Text>
              </View>
              <View style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: 'hidden' }}>
                <View style={{ width: `${Math.round(predictionStats.confidence * 100)}%`, height: 8, borderRadius: 4, backgroundColor: theme.tint }} />
              </View>
            </View>

            {predictionStats.mae !== null && (
              <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }}>
                Historical accuracy: ±{predictionStats.mae} days
              </Text>
            )}

            {predictionStats.outlierFlagged && (
              <Text style={{ color: theme.error, fontSize: 13, marginTop: 6 }}>
                ⚠️ Last cycle was unusually long — window is wider than normal.
              </Text>
            )}

            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 10 }}>
              {predictionStats.label} · Not medical advice
            </Text>
          </View>
        ) : predictionStats?.model === "none" ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'flex-start' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 22 }}>🔮</Text>
              <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]}>Predictions</Text>
            </View>
            <Text style={{ color: theme.textSecondary }}>{predictionStats.label}</Text>
          </View>
        ) : null}

        {/* Pain management card — suppressed if medication already logged today */}
        {activePeriodId && !medicationLoggedToday && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.error, borderWidth: 2 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <IconSymbol name="heart.fill" size={20} color={theme.error} />
              <Text style={[styles.cardTitle, { color: theme.error, flex: 1 }]}>Pain Management</Text>
            </View>
            <Text style={{ color: theme.text, marginBottom: 12 }}>Applying heat therapy directly to your lower abdomen or lower back can significantly reduce muscle tension and cramping.</Text>
            <TouchableOpacity onPress={() => router.push('/education' as any)} style={[styles.bannerBtn, { backgroundColor: theme.error }]}>
              <Text style={styles.bannerBtnText}>View Protocols</Text>
            </TouchableOpacity>
          </View>
        )}

        {latestInsight && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.tint, borderWidth: 1 }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Latest Insight</Text>
            <Text style={{ color: theme.textSecondary, fontWeight: 'bold', marginBottom: 4 }}>{latestInsight.title}</Text>
            <Text style={{ color: theme.text, marginBottom: 12 }}>{latestInsight.description}</Text>
            <TouchableOpacity onPress={() => router.push('/analytics' as any)} style={[styles.bannerBtnOutline, { borderColor: theme.tint }]}>
              <Text style={[styles.bannerBtnText, { color: theme.tint }]}>Explore Analytics</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Log Action */}
        <TouchableOpacity
          style={[styles.logButton, { backgroundColor: theme.tint }]}
          onPress={() => router.push("/log")}
        >
          <Text style={styles.logButtonText}>+ Log Today&apos;s Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.tint }]}
          onPress={() => router.push("/history")}
        >
          <Text style={[styles.secondaryText, { color: theme.tint }]}>
            View Cycle History
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24, paddingVertical: 10 },
  greeting: { fontSize: 16, marginBottom: 4 },
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 12 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: "bold", color: "#2A2422" },
  periodBanner: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 24,
  },
  bannerTitle: { fontSize: 20, fontWeight: "bold" },
  bannerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  bannerBtnOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  bannerBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  startPeriodBtn: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  startPeriodText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  secondaryButton: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  card: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    width: "100%",
  },
  circleContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  cycleCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontSize: 40, fontWeight: "bold" },
  subDayText: { fontSize: 16, marginTop: 4 },
  logButton: { padding: 18, borderRadius: 16, alignItems: "center" },
  logButtonText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
});
