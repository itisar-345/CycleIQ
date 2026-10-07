import { EndoSection, PcosSection, PeriSection } from "@/components/log/sections";
import { Card, Divider, Question } from "@/components/log/card";
import { MoodFaces, MultiSelect, RadioGroup, Scale, ToggleRow } from "@/components/log/inputs";
import { logStyles as styles } from "@/components/log/styles";
import { useCopy } from "@/constants/copy";
import { Colors } from "@/constants/theme";
import {
  SAFEGUARDING_CLINICAL_REVIEW_REQUIRED,
  SAFEGUARDING_LOW_MOOD_SCORE,
  SAFEGUARDING_RESOURCES_ROUTE,
} from "@/constants/safeguarding";
import { createRedFlagPromptLog, createSymptomEntry, getAllEntries, parseJsonColumn, saveFlareEnd } from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { encryptField, decryptFieldOrEmpty } from "@/utils/fieldEncryption";
import { readDailyHealthMetrics } from "@/utils/healthIntegrations";
import { useTx } from "@/utils/tone";
import {
  buildExtendedSymptoms,
  EMPTY_ENDO_LOG,
  EMPTY_FLARE_LOG,
  EMPTY_PCOS_LOG,
  EMPTY_PERI_LOG,
  type EndoLog,
  type FlareLog,
  type PcosLog,
  type PeriLog,
} from "@/utils/logEntry";
import {
  countConsecutivePriorDays,
  evaluateEndoRedFlag,
  shouldShowSafeguardingPrompt,
  valuesForPreviousDays,
} from "@/utils/safetyRules";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LogScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const tx = useTx();
  const { captions: Captions, options: Options } = useCopy();
  const {
    currentMode,
    activePeriodId,
    inFlare,
    setInFlare,
    setFlareEnd,
    flareStartDate,
    isTeen,
    languagePreset,
    customTerms,
    healthImportPrefs
  } = useAppStore();

  // Scores start unanswered (null) so an untouched control is saved as "not logged",
  // never as a made-up 0 or 3 that would skew insights and predictions.
  const [pain, setPain] = useState<number | null>(null);
  const [painLocations, setPainLocations] = useState<string[]>([]);
  const [painTypes, setPainTypes] = useState<string[]>([]);
  const [mood, setMood] = useState<number | null>(null); // 1-5 faces (1=very low, 5=very good)
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [brainFog, setBrainFog] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [bloating, setBloating] = useState<string | null>(null);
  const [nausea, setNausea] = useState<boolean>(false);
  const [headache, setHeadache] = useState<boolean>(false);
  const [fatigue, setFatigue] = useState<number | null>(null);
  const [flow, setFlow] = useState<string | null>(null);
  const [clots, setClots] = useState<boolean>(false);
  const [clotsSize, setClotsSize] = useState<string | null>(null);
  const [spotting, setSpotting] = useState<boolean>(false);
  const [stressScore, setStressScore] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [exerciseType, setExerciseType] = useState<string>("None");
  const [exerciseDuration, setExerciseDuration] = useState<number>(0);
  const [stepsCount, setStepsCount] = useState<number | null>(null);
  const [healthSleepSource, setHealthSleepSource] = useState<string | null>(null);
  const [healthActivitySource, setHealthActivitySource] = useState<string | null>(null);
  const [dietNotes, setDietNotes] = useState<string>("");
  const [medicationLog, setMedicationLog] = useState<string>("");
  const [autoFillYesterday, setAutoFillYesterday] = useState<boolean>(false);

  // Condition-specific sections
  const [pcos, setPcos] = useState<PcosLog>(EMPTY_PCOS_LOG);
  const [endo, setEndo] = useState<EndoLog>(EMPTY_ENDO_LOG);
  const [peri, setPeri] = useState<PeriLog>(EMPTY_PERI_LOG);
  const [flare, setFlare] = useState<FlareLog>(EMPTY_FLARE_LOG);
  const [flareReflection, setFlareReflection] = useState<string>('');
  const [endingFlare, setEndingFlare] = useState<boolean>(false);

  // Dynamic terminology tokens
  const term = {
    cycle: languagePreset === 'inclusive' ? 'cycle' : languagePreset === 'custom' ? customTerms.cycle : 'cycle',
    flow: languagePreset === 'inclusive' ? 'flow' : languagePreset === 'custom' ? customTerms.flow : 'flow',
    body: languagePreset === 'inclusive' ? 'body' : languagePreset === 'custom' ? customTerms.body : 'body',
  };

  useEffect(() => {
    const populateHealthMetrics = async () => {
      const metrics = await readDailyHealthMetrics(new Date().toISOString(), healthImportPrefs);
      if (!metrics) return;
      if (metrics.sleepHours !== null && metrics.sleepHours !== undefined) {
        setSleepHours(metrics.sleepHours);
        setHealthSleepSource(metrics.source);
      }
      if (metrics.steps !== null && metrics.steps !== undefined) {
        setStepsCount(metrics.steps);
        setHealthActivitySource(metrics.source);
      }
      if (metrics.activityMinutes !== null && metrics.activityMinutes !== undefined) {
        setExerciseDuration(metrics.activityMinutes);
        setExerciseType("Health activity");
        setHealthActivitySource(metrics.source);
      }
    };
    populateHealthMetrics();
  }, [healthImportPrefs]);

  useEffect(() => {
    const populateYesterday = async () => {
      if (!autoFillYesterday) return;
      const entries = await getAllEntries();
      if (entries.length > 0) {
        const latest = entries[0];
        setPain(latest.pain_score);
        setPainLocations(parseJsonColumn<string[]>(latest.pain_locations) ?? []);
        setPainTypes(parseJsonColumn<string[]>(latest.pain_type) ?? []);
        setMood(latest.mood_score);
        setMoodTags(parseJsonColumn<string[]>(latest.mood_tags) ?? []);
        setBrainFog(latest.brain_fog_score);
        setEnergy(latest.energy_score);
        setBloating(latest.bloating);
        setNausea(!!latest.nausea);
        setHeadache(!!latest.headache);
        setFatigue(latest.fatigue_score);
        setFlow(latest.flow_intensity);
        setClots(!!latest.clots_present || !!latest.clots_size);
        setClotsSize(latest.clots_size);
        setSpotting(!!latest.spotting);
        setStressScore(latest.stress_score);
        setSleepHours(latest.sleep_hours);
        setHealthSleepSource(latest.health_sleep_source);
        setSleepQuality(latest.sleep_quality);
        setExerciseType(latest.exercise_type ?? "None");
        setExerciseDuration(latest.exercise_duration ?? 0);
        setStepsCount(latest.steps_count);
        setHealthActivitySource(latest.health_activity_source);
        setDietNotes(await decryptFieldOrEmpty(latest.diet_notes_encrypted));
        setMedicationLog(await decryptFieldOrEmpty(latest.medication_log_encrypted));
      }
    };
    populateYesterday();
  }, [autoFillYesterday]);

  /** Safeguarding and endo red-flag prompts. Both look at whole calendar days of history. */
  const runSafetyChecks = async () => {
    if (__DEV__ && SAFEGUARDING_CLINICAL_REVIEW_REQUIRED) {
      console.warn(
        "[CycleIQ] Safeguarding thresholds require clinical review before public release — see docs/CLINICAL_REVIEW.md",
      );
    }
    const needsSafeguardCheck = mood === SAFEGUARDING_LOW_MOOD_SCORE;
    const needsRedFlagCheck = currentMode === "endo" && useAppStore.getState().checkRedFlagCooldown();
    if (!needsSafeguardCheck && !needsRedFlagCheck) return;

    const history = await getAllEntries();
    const today = new Date();

    // Safeguarding — thresholds in constants/safeguarding.ts (clinical review required)
    if (needsSafeguardCheck) {
      const cooldownOpen = useAppStore.getState().checkSafeguardCooldown();
      const priorLowMoodDays = countConsecutivePriorDays(
        history.map((e) => ({ logged_date: e.logged_date, value: e.mood_score })),
        today,
        (value) => value <= SAFEGUARDING_LOW_MOOD_SCORE,
        "min",
      );
      if (shouldShowSafeguardingPrompt(mood, priorLowMoodDays, cooldownOpen)) {
        useAppStore.getState().setLastSafeguardPrompt(new Date().toISOString());
        Alert.alert(
          tx("Hey, checking in 🫶", "Checking in"),
          tx(
            "You've had a few really hard days in a row. You don't have to carry this alone — want to see some people you can talk to?",
            "You've logged several very difficult days in a row. You don't have to manage this alone. Would you like to see support options?",
          ),
          [
            { text: tx("Not right now", "Not now"), style: "cancel" },
            { text: tx("Show me support", "View support"), onPress: () => router.push(SAFEGUARDING_RESOURCES_ROUTE) },
          ],
        );
      }
    }

    // Endo red flags
    if (needsRedFlagCheck) {
      const painToday = pain ?? 0;
      const redFlag = evaluateEndoRedFlag({
        painScore: painToday,
        previousPainScores: valuesForPreviousDays(
          history.map((e) => ({ logged_date: e.logged_date, value: e.pain_score })),
          today,
          2,
          "max",
        ),
        bowelSymptoms: endo.bowelSymptoms,
        shoulderSide: endo.shoulderSide,
        flowIntensity: flow,
      });

      if (redFlag.shouldPrompt && redFlag.triggerType) {
        useAppStore.getState().setLastRedFlagPrompt(new Date().toISOString());
        await createRedFlagPromptLog({
          trigger_type: redFlag.triggerType,
          logged_date: new Date().toISOString(),
          message: redFlag.message,
          severity: painToday,
          cycle_id: activePeriodId ?? null,
          entry_context: {
            pain_score: pain,
            bowel_symptoms: endo.bowelSymptoms,
            shoulder_side: endo.shoulderSide,
            flow_intensity: flow,
          },
        });
        Alert.alert(tx("Please check this out 💛", "Please review"), redFlag.message, [{ text: tx("Okay, noted", "OK") }]);
      }
    }
  };

  const handleSave = async () => {
    try {
      await runSafetyChecks();
    } catch (error) {
      // A failed safety lookup must not block saving the log.
      console.error("Safety checks failed:", error);
    }

    try {
      const nowISO = new Date().toISOString();
      await createSymptomEntry({
        logged_date: nowISO,
        pain_score: pain ?? undefined,
        pain_locations: painLocations,
        pain_type: painTypes,
        mood_score: mood ?? undefined,
        mood_tags: moodTags,
        brain_fog_score: brainFog ?? undefined,
        energy_score: energy ?? undefined,
        stress_score: stressScore ?? undefined,
        bloating,
        nausea,
        headache,
        fatigue_score: fatigue ?? undefined,
        extended_symptoms: buildExtendedSymptoms({
          mode: currentMode,
          pcos,
          endo,
          peri,
          clotsSize,
          inFlare,
          flare,
          nowISO,
        }),
        flare_start: inFlare ? (flareStartDate ?? nowISO) : undefined,
        flow_intensity: flow,
        clots_present: clots,
        clots_size: clotsSize,
        spotting,
        sleep_hours: sleepHours ?? undefined,
        sleep_quality: sleepQuality ?? undefined,
        exercise_type: exerciseType,
        exercise_duration: exerciseDuration,
        steps_count: stepsCount ?? undefined,
        activity_minutes: healthActivitySource ? exerciseDuration : undefined,
        health_sleep_source: healthSleepSource ?? undefined,
        health_activity_source: healthActivitySource ?? undefined,
        diet_notes_encrypted: dietNotes ? await encryptField(dietNotes) : undefined,
        medication_log_encrypted: medicationLog ? await encryptField(medicationLog) : undefined,
      });
      Alert.alert(tx("Logged ✨", "Saved"), tx("Saved to your phone. Future-you says thanks.", "Your log has been saved on this device."));
      router.push("/");
    } catch (error) {
      console.error("Failed saving log entry:", error);
      Alert.alert(tx("Hmm, that didn't save 😕", "Couldn't save"), tx("Nothing was lost on screen — give it another tap.", "Your entries are still on screen. Please try again."));
    }
  };

  const handleFlareToggle = (val: boolean) => {
    if (!val && inFlare) {
      setEndingFlare(true);
    } else {
      setEndingFlare(false);
      setInFlare(val);
    }
  };

  const finishFlare = async (reflection: string) => {
    const endDate = new Date().toISOString();
    const { flareStartDate: startISO, flareDurationDays } = useAppStore.getState();
    setFlareEnd(endDate, reflection);
    setEndingFlare(false);
    setFlareReflection("");
    try {
      await saveFlareEnd(startISO ?? endDate, endDate, reflection, flareDurationDays ?? 1);
    } catch (error) {
      console.error("Failed saving flare end:", error);
      Alert.alert(tx("Hmm, that didn't save 😕", "Couldn't save"), tx("Couldn't record the end of your flare — try once more.", "The end of your flare couldn't be saved. Please try again."));
    }
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const flowTitle = tx(`${capitalize(term.flow)} check 🩸`, capitalize(term.flow));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.eyebrow, { color: theme.tint }]}>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</Text>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">{tx("How we doing today?", "Daily log")}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {tx("30 seconds, no wrong answers. Skip anything you don't feel like answering 💅", "Answer whatever you like — every question is optional.")}
        </Text>

        {/* Teen simplified view — only core fields */}
        {isTeen ? (
          <>
            <Card title={tx("Vibe check ✨", "Mood")}>
              <MoodFaces value={mood} onChange={setMood} />
            </Card>
            <Card title={tx("Any pain?", "Pain")}>
              <Scale min={0} max={10} value={pain} onChange={setPain} caption={Captions.pain} lowLabel={tx("none", "None")} highLabel={tx("worst", "Worst")} />
            </Card>
            <Card title={tx("Energy battery 🔋", "Energy")}>
              <Scale min={0} max={10} value={energy} onChange={setEnergy} caption={Captions.energy} lowLabel={tx("empty", "Low")} highLabel={tx("full", "High")} />
            </Card>
            {activePeriodId && (
              <Card title={flowTitle} accent={theme.error}>
                <RadioGroup options={Options.flowTeen} selected={flow} onChange={setFlow} />
              </Card>
            )}
            <Card title={tx("Sleep last night 😴", "Hours of sleep")}>
              <Scale min={0} max={12} value={sleepHours === null ? null : Math.round(sleepHours)} onChange={setSleepHours} caption={Captions.sleepHours} lowLabel="0h" highLabel="12h" />
            </Card>
          </>
        ) : (
          <>
        <View style={[styles.autofill, { backgroundColor: theme.surfaceAlt }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.autofillTitle, { color: theme.text }]}>{tx("Same as yesterday?", "Copy yesterday's answers")}</Text>
            <Text style={[styles.autofillHint, { color: theme.textSecondary }]}>{tx("copy yesterday's answers, then tweak", "Fill in from your last log, then adjust.")}</Text>
          </View>
          <Switch
            accessibilityLabel={tx("Copy yesterday's answers", "Copy yesterday's answers")}
            value={autoFillYesterday}
            onValueChange={setAutoFillYesterday}
            trackColor={{ true: theme.tint, false: theme.border }}
          />
        </View>

        <Card title={tx("Vibe check ✨", "Mood")} subtitle={tx("how are you feeling, honestly?", "How are you feeling today?")}>
          <MoodFaces value={mood} onChange={setMood} />
          <Question hint={tx("pick any that fit", "Select any that apply")}>{tx("What's the mood made of?", "Mood details")}</Question>
          <MultiSelect options={Options.moodTags} selected={moodTags} onChange={setMoodTags} />
        </Card>

        <Card title={tx("Pain check 🔥", "Pain")}>
          <Question first>{tx("How bad is it?", "Pain level")}</Question>
          <Scale min={0} max={10} value={pain} onChange={setPain} caption={Captions.pain} lowLabel={tx("none", "None")} highLabel={tx("worst", "Worst")} />
          {(pain ?? 0) > 0 && (
            <>
              <Question hint={tx("pick all that apply", "Select all that apply")}>{tx("Where's it hitting?", "Pain location")}</Question>
              <MultiSelect options={Options.painLocations} selected={painLocations} onChange={setPainLocations} />
              <Question>{tx("What kind of pain?", "Type of pain")}</Question>
              <MultiSelect options={Options.painTypes} selected={painTypes} onChange={setPainTypes} />
            </>
          )}
        </Card>

        <Card title={tx("Body & brain 🧠", "Body and mind")}>
          <Question first>{tx("Energy battery 🔋", "Energy")}</Question>
          <Scale min={0} max={10} value={energy} onChange={setEnergy} caption={Captions.energy} lowLabel={tx("empty", "Low")} highLabel={tx("full", "High")} />
          <Question>{tx("How foggy is it up there?", "Brain fog")}</Question>
          <Scale min={0} max={10} value={brainFog} onChange={setBrainFog} caption={Captions.brainFog} lowLabel={tx("clear", "Clear")} highLabel={tx("foggy", "Foggy")} />
          <Question>{tx("How drained are you?", "Fatigue")}</Question>
          <Scale min={0} max={10} value={fatigue} onChange={setFatigue} caption={Captions.fatigue} lowLabel={tx("fresh", "None")} highLabel={tx("wiped", "Exhausted")} />
          <Question>{tx("Bloat status 🎈", "Bloating")}</Question>
          <RadioGroup options={Options.bloating} selected={bloating} onChange={setBloating} />
          <Divider />
          <ToggleRow label="Spotting" value={spotting} onChange={setSpotting} />
          <ToggleRow label={tx("Headache 🤕", "Headache")} value={headache} onChange={setHeadache} />
          <ToggleRow label={tx("Nauseous 🤢", "Nausea")} value={nausea} onChange={setNausea} />
        </Card>

        {activePeriodId && (
          <Card title={flowTitle} subtitle={tx(`your ${term.cycle} is on — how's the ${term.flow}?`, `How heavy is your ${term.flow} today?`)} accent={theme.error}>
            <RadioGroup options={Options.flow} selected={flow} onChange={setFlow} />
            <Divider />
            <ToggleRow label={tx("Any clots?", "Clots")} hint={tx("totally normal to track — helps spot heavy days", "Tracking clots helps identify heavy days.")} value={clots} onChange={setClots} />
            {clots && (
              <>
                <Question>{tx("How big?", "Clot size")}</Question>
                <RadioGroup options={Options.clotSize} selected={clotsSize} onChange={setClotsSize} />
              </>
            )}
          </Card>
        )}

        {currentMode === "pcos" && (
          <PcosSection value={pcos} onChange={(patch) => setPcos((prev) => ({ ...prev, ...patch }))} />
        )}

        {currentMode === "peri" && (
          <PeriSection
            value={peri}
            onChange={(patch) => setPeri((prev) => ({ ...prev, ...patch }))}
            inclusiveLanguage={languagePreset === 'inclusive'}
          />
        )}

        {currentMode === "endo" && (
          <EndoSection
            value={endo}
            onChange={(patch) => setEndo((prev) => ({ ...prev, ...patch }))}
            clotsSize={clotsSize}
            onClotsSizeChange={setClotsSize}
            isTeen={isTeen}
            flareActive={inFlare && !endingFlare}
            onFlareToggle={handleFlareToggle}
            endingFlare={endingFlare}
            reflection={flareReflection}
            onReflectionChange={setFlareReflection}
            onFinishFlare={finishFlare}
            flare={flare}
            onFlareChange={(patch) => setFlare((prev) => ({ ...prev, ...patch }))}
          />
        )}

        {/* 4.5 Lifestyle & Trigger Analysis */}
        <Card title={tx("Lifestyle stuff 🌙", "Lifestyle")} subtitle={tx("sleep, movement and stress — the usual suspects", "Sleep, activity and stress")}>
          <Question first>{tx("Sleep last night", "Hours of sleep")}</Question>
          {healthSleepSource && (
            <Text style={[styles.sourceTag, { color: theme.tint }]}>
              {tx("⌚ synced from", "From")} {healthSleepSource}
            </Text>
          )}
          <Scale min={0} max={12} value={sleepHours === null ? null : Math.round(sleepHours)} onChange={setSleepHours} caption={Captions.sleepHours} lowLabel="0h" highLabel="12h" />

          <Question>{tx("And how was it?", "Sleep quality")}</Question>
          <Scale min={1} max={5} value={sleepQuality} onChange={setSleepQuality} caption={Captions.sleepQuality} lowLabel={tx("awful", "Poor")} highLabel={tx("amazing", "Excellent")} />

          <Question>{tx("Did you move today?", "Exercise")}</Question>
          <RadioGroup
            options={exerciseType === "Health activity" ? [...Options.exercise, Options.exerciseFromHealth] : Options.exercise}
            selected={exerciseType}
            onChange={(type) => {
              setExerciseType(type);
              if (type === "None") setExerciseDuration(0);
            }}
          />
          {exerciseType !== "None" && (
            <>
              <Question>{tx("For how long?", "Duration")}</Question>
              {healthActivitySource && (
                <Text style={[styles.sourceTag, { color: theme.tint }]}>
                  {tx("⌚ synced from", "From")} {healthActivitySource}{stepsCount !== null ? ` • ${stepsCount.toLocaleString()} steps` : ""}
                </Text>
              )}
              <View style={styles.durationRow}>
                <TouchableOpacity
                  style={[styles.adjustBtn, { borderColor: theme.tint }]}
                  onPress={() => setExerciseDuration(Math.max(0, exerciseDuration - 5))}
                  accessibilityRole="button"
                  accessibilityLabel={tx("5 minutes less", "5 minutes less")}
                >
                  <Text style={[styles.adjustText, { color: theme.tint }]}>−5</Text>
                </TouchableOpacity>
                <Text style={[styles.valueText, { color: theme.text }]} accessibilityLabel={`${exerciseDuration} minutes`}>{exerciseDuration} min</Text>
                <TouchableOpacity
                  style={[styles.adjustBtn, { borderColor: theme.tint }]}
                  onPress={() => setExerciseDuration(exerciseDuration + 5)}
                  accessibilityRole="button"
                  accessibilityLabel={tx("5 minutes more", "5 minutes more")}
                >
                  <Text style={[styles.adjustText, { color: theme.tint }]}>+5</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Question>{tx("Stress level?", "Stress")}</Question>
          <Scale min={1} max={5} value={stressScore} onChange={setStressScore} caption={Captions.stress} lowLabel={tx("chill", "Low")} highLabel={tx("maxed", "High")} />

          <Question hint={tx("🔒 encrypted on your phone", "Encrypted on this device")}>{tx("What did you eat? (optional)", "Diet notes (optional)")}</Question>
          <TextInput
            style={[styles.inputText, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
            value={dietNotes}
            onChangeText={setDietNotes}
            accessibilityLabel={tx("Diet notes", "Diet notes")}
            placeholder={tx("meals, snacks, anything that didn't agree with you…", "Meals or foods that affected you")}
            placeholderTextColor={theme.textSecondary}
            multiline
          />

          <Question hint={tx("🔒 encrypted on your phone", "Encrypted on this device")}>{tx("Meds or supplements? (optional)", "Medication and supplements (optional)")}</Question>
          <TextInput
            style={[styles.inputText, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
            value={medicationLog}
            onChangeText={setMedicationLog}
            accessibilityLabel={tx("Medication and supplements", "Medication and supplements")}
            placeholder={tx("e.g. ibuprofen 400mg, iron, magnesium", "e.g. ibuprofen 400 mg, iron")}
            placeholderTextColor={theme.textSecondary}
            multiline
          />
        </Card>
        </> /* end non-teen */
        )}

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.tint }]}
          onPress={handleSave}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={[styles.saveButtonText, { color: theme.onTint }]}>{tx("Save today's log ✨", "Save log")}</Text>
        </TouchableOpacity>
        <Text style={[styles.privacyNote, { color: theme.textSecondary }]}>{tx("🔒 stays on your phone. always.", "Your data is stored only on this device.")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
