import { Colors } from "@/constants/theme";
import { closeCycle, createCycle, getLatestCycle } from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { addDays, differenceInDays, format, parseISO } from "date-fns";
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
  } = useAppStore();
  const [cycleLength, setCycleLength] = useState<number>(28);

  useEffect(() => {
    const loadLatestCycle = async () => {
      try {
        const latest = await getLatestCycle();
        if (latest && latest.cycle_length) {
          setCycleLength(latest.cycle_length);
        }
      } catch (error) {
        console.error("Unable to load latest cycle length", error);
      }
    };
    loadLatestCycle();
  }, [activePeriodId]);

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
    } catch (error) {
      console.error("Failed closing period", error);
      Alert.alert("Error", "Could not close period. Please try again.");
    }
  };

  const getDayOfPeriod = () => {
    if (!activePeriodStartDate) return 1;
    return differenceInDays(new Date(), parseISO(activePeriodStartDate)) + 1;
  };

  const generatePrediction = () => {
    const today = new Date();
    if (currentMode === "pcos" || currentMode === "peri") {
      const startWindow = addDays(today, 12);
      const endWindow = addDays(today, 26);
      return `Your next period is likely between ${format(startWindow, "MMM d")}–${format(endWindow, "d")} (based on high variance history).`;
    } else {
      const startWindow = addDays(today, 14);
      const endWindow = addDays(today, 16);
      return `Your next period is likely between ${format(startWindow, "MMM d")}–${format(endWindow, "d")}.`;
    }
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
              { backgroundColor: theme[currentMode] || theme.tint },
            ]}
          >
            <Text style={styles.badgeText}>
              {currentMode.toUpperCase()} SETTINGS
            </Text>
          </View>
        </View>

        {/* 3.1.2 Active Period Banner */}
        {activePeriodId ? (
          <View
            style={[
              styles.periodBanner,
              { backgroundColor: theme.error + "15", borderColor: theme.error },
            ]}
          >
            <Text style={[styles.bannerTitle, { color: theme.error }]}>
              Day {getDayOfPeriod()} of your period
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.bannerBtn, { backgroundColor: theme.error }]}
                onPress={() => router.push("/log")}
              >
                <Text style={styles.bannerBtnText}>Log Flow & Pain</Text>
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

        {/* Cycle Overview & GPR Predictions */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Cycle Status
          </Text>
          <View style={styles.circleContainer}>
            <View style={[styles.cycleCircle, { borderColor: theme.tint }]}>
              <Text style={[styles.dayText, { color: theme.tint }]}>
                Day 14
              </Text>
              <Text style={[styles.subDayText, { color: theme.textSecondary }]}>
                of approx. {cycleLength}
              </Text>
            </View>
          </View>
          <Text style={[styles.predictionText, { color: theme.textSecondary }]}>
            {generatePrediction()}
          </Text>
        </View>

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
  predictionText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 22,
  },
  logButton: { padding: 18, borderRadius: 16, alignItems: "center" },
  logButtonText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
});
