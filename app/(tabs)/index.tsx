import { useCopy } from "@/constants/copy";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTx } from "@/utils/tone";
import { Colors, getModeColor, Radius, Shadow } from "@/constants/theme";
import { closeCycle, createCycle, getAllEntries, getLatestCycle, getDayOfCycle, getPhaseForDay, getCyclePredictions, generateInsights, CycleInsight, getLatestPredictionFeedback } from "@/database";
import { PredictionResult } from "@/utils/predictions";
import { scheduleAllCycleNotifications, requestNotificationPermission } from "@/utils/notifications";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { differenceInDays, format, parseISO } from "date-fns";
import { router, useFocusEffect, type Href } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InteractivePressable } from "@/components/interactive-pressable";

export default function HomeScreen() {
  const tx = useTx();
  const copy = useCopy();
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
    checkPCOSPromptCooldown,
    setLastPCOSPrompt,
    age,
    notificationsEnabled,
    setNotificationPrefs,
    postPillMode,
    postPillStartDate,
    dismissedInsights,
    languagePreset,
    customTerms,
    healthImportPrefs,
    setLastNotificationPrompt,
    checkNotificationPromptCooldown,
  } = useAppStore();
  const [cycleLength, setCycleLength] = useState<number>(28);
  const [latestStartDate, setLatestStartDate] = useState<string | null>(null);
  const [currentCycleDay, setCurrentCycleDay] = useState<number>(1);
  const [currentPhase, setCurrentPhase] = useState<string>("menstrual");
  const [predictionStats, setPredictionStats] = useState<PredictionResult | null>(null);
  const [latestInsight, setLatestInsight] = useState<CycleInsight | null>(null);
  const [medicationLoggedToday, setMedicationLoggedToday] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Miss acknowledgment: shown once per session when last prediction was off by >4 days.
  const [lastMissErrorDays, setLastMissErrorDays] = useState<number | null>(null);
  const missShownRef = useRef(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim, reduceMotion]);

  // Profile completion checklist — deferred items from onboarding
  // Spec: detailed condition profile, notifications, age/language, health data import
  const healthImportEnabled = healthImportPrefs.appleHealthSleep || healthImportPrefs.appleHealthActivity ||
    healthImportPrefs.healthConnectSleep || healthImportPrefs.healthConnectActivity;
  const profileItems = [
    !notificationsEnabled && { label: tx("turn on reminders", "Turn on reminders"), route: "/profile" },
    !age && { label: tx("add your age", "Add your age"), route: "/profile" },
    ["pcos","pcod","endo"].includes(currentMode) && !useAppStore.getState().pcosData && !useAppStore.getState().endoData && { label: tx("finish your condition profile", "Complete your condition profile"), route: "/profile" },
    !healthImportEnabled && { label: tx("connect your Health app", "Connect your Health app"), route: "/profile" },
  ].filter(Boolean) as { label: string; route: Href }[];

  // Dynamic terminology
  const flowTerm = languagePreset === 'custom' ? customTerms.flow : 'flow';
  const cycleTerm = languagePreset === 'custom' ? customTerms.cycle : languagePreset === 'inclusive' ? 'cycle' : 'period';

  const loadLatestCycle = useCallback(async () => {
    try {
      const latest = await getLatestCycle();
      const stats = await getCyclePredictions(currentMode, postPillMode, postPillStartDate ?? null);
      setPredictionStats(stats);
      // The current cycle is in progress, so its expected length comes from the prediction.
      const expectedLength = stats.model !== "none" ? stats.mean : 28;
      setCycleLength(expectedLength);

      if (latest && latest.start_date) {
        setLatestStartDate(latest.start_date);
        const cycleDay = getDayOfCycle(new Date().toISOString(), latest.start_date);
        setCurrentCycleDay(cycleDay);
        setCurrentPhase(getPhaseForDay(cycleDay, expectedLength));
      } else {
        setLatestStartDate(null);
      }

      if (stats.predictedStartISO) {
        await scheduleAllCycleNotifications(stats);
      }

      const generatedInsights = await generateInsights(currentMode, useAppStore.getState().tone);
      const validInsights = generatedInsights.filter((i: CycleInsight) => !dismissedInsights.includes(i.title));
      validInsights.sort((a: CycleInsight, b: CycleInsight) => Math.abs(b.correlation || 0) - Math.abs(a.correlation || 0));
      setLatestInsight(validInsights.length > 0 ? validInsights[0] : null);

      const todayStr = new Date().toISOString().split("T")[0];
      const allEntries = await getAllEntries();
      const todayEntry = allEntries.find((e) => e.logged_date.startsWith(todayStr));
      setMedicationLoggedToday(!!(todayEntry?.medication_log_encrypted));

      if (!missShownRef.current) {
        const feedback = await getLatestPredictionFeedback();
        if (feedback && Math.abs(feedback.error_days) > 4) {
          setLastMissErrorDays(Math.round(feedback.error_days));
          missShownRef.current = true;
        }
      }

      setDataLoaded(true);
      if (latest && currentMode === "pcos" && !activePeriodId && latest.start_date) {
        const daysSinceStart = differenceInDays(new Date(), parseISO(latest.start_date));
        if (daysSinceStart >= 90) {
          const is120 = daysSinceStart >= 120;
          if (checkPCOSPromptCooldown()) {
            setLastPCOSPrompt(new Date().toISOString());
            const title = is120 ? tx("checking in on you 💛", "Time to check in") : tx("it's been a minute 👀", "It's been a while");
            const message = is120
              ? tx(`It's been ${daysSinceStart} days since your last period. Worth a quick chat with a healthcare provider, just to be safe 🫶`, `It has been ${daysSinceStart} days since your last period. Please consider speaking with a healthcare provider.`)
              : tx(`It's been ${daysSinceStart} days since your last period. All good? Logging symptoms helps us (and your doctor) spot patterns.`, `It has been ${daysSinceStart} days since your last period. Logging symptoms can help identify patterns.`);
            setTimeout(() => {
              Alert.alert(title, message, [{ text: tx("okay, noted", "OK") }]);
            }, 500);
          }
        }
      }
    } catch (error) {
      console.error("Unable to load latest cycle length", error);
      setDataLoaded(true);
    }
  }, [activePeriodId, currentMode, dismissedInsights, postPillMode, postPillStartDate, checkPCOSPromptCooldown, setLastPCOSPrompt, tx]);

  useEffect(() => {
    loadLatestCycle();
  }, [loadLatestCycle]);

  useFocusEffect(
    useCallback(() => {
      loadLatestCycle();
    }, [loadLatestCycle]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLatestCycle();
    setRefreshing(false);
  };

  const handleStartPeriod = () => {
    Alert.alert(tx("period started? 🩸", "Log period start"), tx("Is today day 1?", "Is today the first day of your period?"), [
      { text: tx("Cancel", "Cancel"), style: "cancel" },
      {
        text: tx("yep, today", "Yes, log today"),
        onPress: async () => {
          try {
            const startDate = new Date().toISOString();
            const newId = await createCycle(startDate);
            setActivePeriod(newId, startDate);
            const stats = await getCyclePredictions(currentMode, postPillMode, postPillStartDate ?? null);
            setPredictionStats(stats);
            await scheduleAllCycleNotifications(stats, new Date(startDate));
            // Contextual notification ask — max once per 30 days, only when not yet granted
            if (!notificationsEnabled && checkNotificationPromptCooldown()) {
              setLastNotificationPrompt(new Date().toISOString());
              setTimeout(() => {
                Alert.alert(
                  tx("want a heads-up next time? 🔔", "Turn on reminders?"),
                  tx("We'll ping you ~2 days before your next predicted period. You can tweak every reminder in Profile.", "We can remind you 2 days before your next predicted period. You can change reminders in Profile."),
                  [
                    { text: tx("Not now", "Not now"), style: "cancel" },
                    {
                      text: tx("yes pls", "Yes, remind me"),
                      onPress: async () => {
                        const granted = await requestNotificationPermission();
                        if (granted) setNotificationPrefs({ period: true, dailyLog: true });
                      },
                    },
                  ],
                );
              }, 800);
            }
          } catch (error) {
            console.error("Failed starting period", error);
            Alert.alert(tx("hmm, that didn't save 😕", "Couldn't save"), tx("Couldn't log your period start — give it another tap.", "Your period start couldn't be saved. Please try again."));
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
      Alert.alert(tx("hmm, that didn't save 😕", "Couldn't save"), tx("Couldn't mark your period as ended — try once more.", "Your period end couldn't be saved. Please try again."));
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

  // Loading state
  if (!dataLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{tx("getting your stuff ready…", "Loading…")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // First-run empty state: data loaded but no cycle ever logged
  if (dataLoaded && !latestStartDate && !activePeriodId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon} importantForAccessibility="no" accessibilityElementsHidden>🩸</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]} accessibilityRole="header">{tx("you're all set ✨", "You're all set")}</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            {tx("Log your last period and your dashboard, predictions and insights unlock.", "Log your last period to see your dashboard, predictions and insights.")}
          </Text>
          <TouchableOpacity
            style={[styles.emptyCTA, { backgroundColor: theme.error }]}
            onPress={handleStartPeriod}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={[styles.emptyCTAText, { color: theme.onAccent }]}>{tx("log my last period", "Log my last period")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.emptySecondary, { borderColor: theme.border }]}
            onPress={() => router.push("/log")}
            accessibilityRole="button"
          >
            <Text style={[styles.emptySecondaryText, { color: theme.textSecondary }]}>
              {tx("just log how today's going instead", "Log today's symptoms instead")}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>
            {format(new Date(), "EEEE, MMM d")}
          </Text>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {tx(`hey${userName ? ` ${userName}` : ""} 👋`, `Hello${userName ? `, ${userName}` : ""}`)}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: getModeColor(theme, currentMode) },
            ]}
          >
            <Text style={[styles.badgeText, { color: theme.onAccent }]}>
              {copy.modeBadge[currentMode] ?? tx("tracking mode", "Cycle tracking")}
            </Text>
          </View>
        </View>

        {/* Profile completion banner — shown until all deferred items are done */}
        {profileItems.length > 0 && (
          <InteractivePressable
            style={[styles.profileBanner, { backgroundColor: theme.surface, borderColor: theme.tint }]}
            onPress={() => router.push("/profile")}
            haptic="light"
            accessibilityLabel={`${tx("Finish setting up", "Complete your profile")}: ${profileItems.map(i => i.label).join(", ")}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileBannerTitle, { color: theme.text }]}>
                {tx("finish setting up ✨", "Complete your profile")}
              </Text>
              <Text style={[styles.profileBannerDesc, { color: theme.textSecondary }]}>
                {profileItems.map(i => i.label).join(" · ")}
              </Text>
            </View>
            <Text style={[styles.profileBannerArrow, { color: theme.tint }]}>→</Text>
          </InteractivePressable>
        )}

        {/* Post-pill progress bar */}
        {postPillMode && postPillStartDate && (() => {
          const elapsed = differenceInDays(new Date(), parseISO(postPillStartDate));
          const progress = Math.min(elapsed, 90);
          const remaining = Math.max(0, 90 - elapsed);
          return (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.tint, borderWidth: 1, alignItems: 'flex-start' }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{tx("post-pill reset 💊", "Post-pill baseline")}</Text>
              <Text style={{ color: theme.textSecondary, marginBottom: 8 }}>
                {tx(
                  `day ${progress} of 90 — ${remaining > 0 ? `${remaining} days till predictions unlock. your body's recalibrating, be patient with it 🫶` : "baseline done — predictions are live ✨"}`,
                  `Day ${progress} of 90. ${remaining > 0 ? `Predictions unlock in ${remaining} days.` : "Baseline complete — predictions are active."}`,
                )}
              </Text>
              <View style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: 'hidden' }}>
                <View style={{ width: `${(progress / 90) * 100}%`, height: 8, borderRadius: 4, backgroundColor: theme.tint }} />
              </View>
            </View>
          );
        })()}

        {currentMode === "endo" && inFlare && (
          <View style={[styles.periodBanner, { backgroundColor: theme.endo + '15', borderColor: theme.endo }]}>
             <Text style={[styles.bannerTitle, { color: theme.endo }]}>{tx("flare mode is on 💜", "Flare in progress")}</Text>
             <Text style={{ marginTop: 8, color: theme.textSecondary }}>
                 {tx(`day ${getFlareDuration()} of this flare. Quick logs each day = way better reports for your doctor. You've got this.`, `Day ${getFlareDuration()} of this flare. Logging daily helps produce accurate reports for your doctor.`)}
             </Text>
             <InteractivePressable style={[styles.bannerBtn, { backgroundColor: theme.endo, marginTop: 16 }]} onPress={() => router.push('/log')} haptic="medium">
                 <Text style={[styles.bannerBtnText, { color: theme.onAccent }]}>{tx("quick flare log", "Log flare symptoms")}</Text>
             </InteractivePressable>
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
              {tx(`day ${getDayOfPeriod()} of your ${cycleTerm} 🩸`, `Day ${getDayOfPeriod()} of your ${cycleTerm}`)}
            </Text>
            <Text style={{ marginTop: 6, color: theme.textSecondary }}>
              {tx("be gentle with yourself today — rest counts as productive.", "Take care of yourself today.")}
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <InteractivePressable
                style={[styles.bannerBtn, { backgroundColor: theme.error }]}
                onPress={() => router.push("/log")}
                haptic="medium"
              >
                <Text style={[styles.bannerBtnText, { color: theme.onAccent }]}>{tx(`log ${flowTerm} & pain`, `Log ${flowTerm} and pain`)}</Text>
              </InteractivePressable>
              <InteractivePressable
                style={[styles.bannerBtnOutline, { borderColor: theme.error }]}
                onPress={handleEndPeriod}
                haptic="heavy"
              >
                <Text style={[styles.bannerBtnText, { color: theme.error }]}>
                  {tx("it's over 🎉", "Period ended")}
                </Text>
              </InteractivePressable>
            </View>
          </View>
        ) : (
          <InteractivePressable
            style={[styles.startPeriodBtn, { backgroundColor: theme.error }]}
            onPress={handleStartPeriod}
            haptic="heavy"
          >
            <Text style={[styles.startPeriodText, { color: theme.onAccent }]}>{tx("🩸 my period started", "Log period start")}</Text>
          </InteractivePressable>
        )}

        {/* Cycle Overview */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]} accessibilityRole="header">{tx("where you're at", "Cycle status")}</Text>
          <View style={styles.circleContainer}>
            <Animated.View
              style={[styles.cycleCircle, { borderColor: theme.tint, transform: [{ scale: pulseAnim }] }]}
              accessible
              accessibilityLabel={`Cycle day ${currentCycleDay} of about ${cycleLength}`}
            >
              <Text style={[styles.dayText, { color: theme.tint }]}>Day {currentCycleDay}</Text>
              <Text style={[styles.subDayText, { color: theme.textSecondary }]}>of ~{cycleLength}</Text>
            </Animated.View>
          </View>
          <View style={[styles.phaseChip, { backgroundColor: theme.tintSoft }]}>
            <Text style={[styles.phaseChipText, { color: theme.onTintSoft }]}>
              {tx(`${copy.phases[currentPhase]?.name ?? currentPhase} · ${copy.phases[currentPhase]?.vibe ?? ""}`, copy.phases[currentPhase]?.vibe ?? currentPhase)}
            </Text>
          </View>
          {copy.phases[currentPhase] && (
            <Text style={[styles.phaseHint, { color: theme.textSecondary }]}>{copy.phases[currentPhase].hint}</Text>
          )}
        </View>

        {/* Next Period Prediction Card */}
        {predictionStats && predictionStats.model !== "none" ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.tint, borderWidth: 2, alignItems: 'flex-start' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: 22 }} importantForAccessibility="no" accessibilityElementsHidden>🔮</Text>
              <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]} accessibilityRole="header">{tx(`next ${cycleTerm}, probably`, `Next ${cycleTerm} prediction`)}</Text>
            </View>

            {predictionStats.predictedStartISO && (
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.tint, marginBottom: 4 }}>
                {format(parseISO(predictionStats.predictedStartISO), 'MMM d')}
              </Text>
            )}

            {predictionStats.windowStartISO && predictionStats.windowEndISO && (
              <Text style={{ color: theme.textSecondary, fontSize: 15, marginBottom: 12 }}>
                {tx("likely between", "Likely window:")} {format(parseISO(predictionStats.windowStartISO), 'MMM d')} – {format(parseISO(predictionStats.windowEndISO), 'MMM d')}
              </Text>
            )}

            {/* Confidence bar */}
            <View
              style={{ width: '100%', marginBottom: 8 }}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={tx("How sure we are", "Confidence")}
              accessibilityValue={{ min: 0, max: 100, now: Math.round(predictionStats.confidence * 100), text: `${Math.round(predictionStats.confidence * 100)}%` }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{tx("how sure we are", "Confidence")}</Text>
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
                {tx(`past guesses were off by ~${predictionStats.mae} days on average`, `Past predictions were off by ${predictionStats.mae} days on average`)}
              </Text>
            )}

            {predictionStats.outlierFlagged && (
              <Text style={{ color: theme.error, fontSize: 13, marginTop: 6 }}>
                {tx("heads up: your last cycle ran long, so the window's a bit wider this time.", "Your last cycle was unusually long, so the window is wider than usual.")}
              </Text>
            )}

            {predictionStats.widePredictionWindow && (
              <View style={[styles.predictionNote, { backgroundColor: theme.tint + "12", borderColor: theme.tint }]}>
                <Text style={{ color: theme.text, fontSize: 13, lineHeight: 19 }}>
                  {currentMode === "pcos"
                    ? tx("PCOS keeps timing unpredictable, so a wide window is totally expected. It narrows as we learn your pattern 💚", "PCOS can make cycle timing vary, so a wider window is expected. It will narrow as your pattern builds.")
                    : tx("Your cycles vary, so a wider window is normal. It narrows as we learn your pattern.", "Your cycles vary, so a wider window is normal. It will narrow as your pattern builds.")}
                </Text>
              </View>
            )}

            {lastMissErrorDays !== null && (
              <TouchableOpacity
                onPress={() => setLastMissErrorDays(null)}
                style={[styles.missNote, { backgroundColor: theme.border }]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityHint={tx("Hides this note", "Hides this note")}
              >
                <Text style={{ color: theme.text, fontSize: 13, lineHeight: 19 }}>
                  {tx(
                    `our last guess was ${Math.abs(lastMissErrorDays)}d ${lastMissErrorDays > 0 ? "early" : "late"} — we're learning, promise 🫡 (tap to hide)`,
                    `The last prediction was ${Math.abs(lastMissErrorDays)} days ${lastMissErrorDays > 0 ? "early" : "late"}. Predictions improve as you log. (Tap to dismiss.)`,
                  )}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 10 }}>
              {predictionStats.label} · {tx("not medical advice", "Not medical advice")}
            </Text>
          </View>
        ) : predictionStats?.model === "none" ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'flex-start' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 22 }} importantForAccessibility="no" accessibilityElementsHidden>🔮</Text>
              <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]} accessibilityRole="header">{tx("predictions", "Predictions")}</Text>
            </View>
            <Text style={{ color: theme.textSecondary }}>{predictionStats.label}</Text>
          </View>
        ) : null}

        {/* Pain management card — suppressed if medication already logged today */}
        {activePeriodId && !medicationLoggedToday && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.error, borderWidth: 2 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <IconSymbol name="heart.fill" size={20} color={theme.error} />
              <Text style={[styles.cardTitle, { color: theme.error, flex: 1 }]}>{tx("cramp care 🔥", "Pain relief")}</Text>
            </View>
            <Text style={{ color: theme.text, marginBottom: 12 }}>{tx("A heat pad on your lower belly or back for ~20 mins can really take the edge off cramps.", "Applying heat to your lower abdomen or back for about 20 minutes can ease cramps.")}</Text>
            <InteractivePressable onPress={() => router.push('/(tabs)/education')} style={[styles.bannerBtn, { backgroundColor: theme.error }]} haptic="light">
              <Text style={[styles.bannerBtnText, { color: theme.onAccent }]}>{tx("more comfort tips", "More pain relief tips")}</Text>
            </InteractivePressable>
          </View>
        )}

        {latestInsight && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.tint, borderWidth: 1 }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{tx("new pattern unlocked 👀", "Latest insight")}</Text>
            <Text style={{ color: theme.textSecondary, fontWeight: 'bold', marginBottom: 4 }}>{latestInsight.title}</Text>
            <Text style={{ color: theme.text, marginBottom: 12 }}>{latestInsight.description}</Text>
            <InteractivePressable onPress={() => router.push('/analytics')} style={[styles.bannerBtnOutline, { borderColor: theme.tint }]} haptic="light">
              <Text style={[styles.bannerBtnText, { color: theme.tint }]}>{tx("see all insights", "View all insights")}</Text>
            </InteractivePressable>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.quickActions}>
          {([
            { label: tx("calendar", "Calendar"), icon: "📅", route: "/calendar" },
            { label: tx("insights", "Insights"), icon: "📊", route: "/analytics" },
            { label: tx("history", "History"), icon: "🗂️", route: "/history" },
          ] as const).map((action) => (
            <InteractivePressable
              key={action.route}
              style={[styles.quickAction, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push(action.route)}
              haptic="selection"
              accessibilityLabel={action.label}
            >
              <Text style={styles.quickIcon} importantForAccessibility="no" accessibilityElementsHidden>{action.icon}</Text>
              <Text style={[styles.quickLabel, { color: theme.text }]}>{action.label}</Text>
            </InteractivePressable>
          ))}
        </View>

        {/* Quick Log Action */}
        <InteractivePressable
          style={[styles.logButton, { backgroundColor: theme.tint }]}
          onPress={() => router.push("/log")}
          haptic="medium"
        >
          <Text style={[styles.logButtonText, { color: theme.onTint }]}>{tx("✏️ log today", "Log today")}</Text>
        </InteractivePressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24, paddingVertical: 10 },
  greeting: { fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -0.6, marginBottom: 12 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  badgeText: { fontSize: 13, fontWeight: "800" },
  phaseChip: { alignSelf: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  phaseChipText: { fontSize: 14, fontWeight: "800" },
  phaseHint: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 10, paddingHorizontal: 8 },
  periodBanner: {
    padding: 20,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  bannerTitle: { fontSize: 20, fontWeight: "800" },
  bannerBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.pill,
    alignItems: "center",
  },
  bannerBtnOutline: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  bannerBtnText: { fontWeight: "800", fontSize: 14 },
  startPeriodBtn: {
    paddingVertical: 18,
    borderRadius: Radius.pill,
    marginBottom: 20,
    alignItems: "center",
    ...Shadow,
  },
  startPeriodText: { fontSize: 17, fontWeight: "800" },
  card: {
    padding: 22,
    borderRadius: Radius.lg,
    borderWidth: 0,
    marginBottom: 20,
    alignItems: "center",
    ...Shadow,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "800",
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
  dayText: { fontSize: 40, fontWeight: "800", letterSpacing: -1 },
  subDayText: { fontSize: 16, marginTop: 4 },
  logButton: { paddingVertical: 18, borderRadius: Radius.pill, alignItems: "center", ...Shadow },
  logButtonText: { fontSize: 17, fontWeight: "800" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 36, gap: 16 },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: 28, fontWeight: "800", textAlign: "center" },
  emptyDesc: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  emptyCTA: { width: "100%", paddingVertical: 18, borderRadius: Radius.pill, alignItems: "center", marginTop: 8, ...Shadow },
  emptyCTAText: { fontSize: 17, fontWeight: "800" },
  emptySecondary: { width: "100%", padding: 14, borderRadius: Radius.pill, borderWidth: 1.5, alignItems: "center" },
  emptySecondaryText: { fontSize: 15 },
  profileBanner: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: Radius.md, borderWidth: 1.5, marginBottom: 20 },
  profileBannerTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  profileBannerDesc: { fontSize: 13, lineHeight: 18 },
  profileBannerArrow: { fontSize: 20, fontWeight: "bold", paddingLeft: 8 },
  missNote: { borderRadius: 10, padding: 10, marginTop: 10 },
  predictionNote: { borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 10 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 15 },
  quickActions: { flexDirection: "row", gap: 10, marginBottom: 20 },
  quickAction: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 0,
    alignItems: "center",
    gap: 6,
    ...Shadow,
  },
  quickIcon: { fontSize: 22 },
  quickLabel: { fontSize: 12, fontWeight: "700", textAlign: "center" },
});
