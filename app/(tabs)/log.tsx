import { Colors } from "@/constants/theme";
import { createSymptomEntry, getAllEntries, saveFlareEnd } from "@/database";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { encryptField, decryptField } from "@/utils/fieldEncryption";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
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
  const {
    currentMode,
    activePeriodId,
    inFlare,
    setInFlare,
    consecutiveLowMoodDays,
    incrementLowMood,
    resetLowMood,
    setFlareEnd,
    flareStartDate,
    isTeen,
    languagePreset,
    customTerms
  } = useAppStore();

  const [pain, setPain] = useState<number>(0);
  const [painLocations, setPainLocations] = useState<string[]>([]);
  const [painTypes, setPainTypes] = useState<string[]>([]);
  const [mood, setMood] = useState<number>(3); // 1-5 faces (1=very low, 5=very good)
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [brainFog, setBrainFog] = useState<number>(0);
  const [energy, setEnergy] = useState<number>(0);
  const [bloating, setBloating] = useState<string | null>(null);
  const [nausea, setNausea] = useState<boolean>(false);
  const [headache, setHeadache] = useState<boolean>(false);
  const [fatigue, setFatigue] = useState<number>(0);
  const [flow, setFlow] = useState<string | null>(null);
  const [clots, setClots] = useState<boolean>(false);
  const [spotting, setSpotting] = useState<boolean>(false);
  const [stressScore, setStressScore] = useState<number>(3);
  const [sleepHours, setSleepHours] = useState<number>(8);
  const [sleepQuality, setSleepQuality] = useState<number>(3);
  const [exerciseType, setExerciseType] = useState<string>("None");
  const [exerciseDuration, setExerciseDuration] = useState<number>(0);
  const [dietNotes, setDietNotes] = useState<string>("");
  const [medicationLog, setMedicationLog] = useState<string>("");
  const [autoFillYesterday, setAutoFillYesterday] = useState<boolean>(false);

  // Extended
  // PCOS Sec5 extended
  const [acneSeverity, setAcneSeverity] = useState<number>(0);
  const [acneLocations, setAcneLocations] = useState<string[]>([]);
  const [hairThinningNote, setHairThinningNote] = useState<string>('');
  const [hirsutism, setHirsutism] = useState<boolean>(false);
  const [weightDir, setWeightDir] = useState<string | null>(null);
  const [weightNote, setWeightNote] = useState<string>('');
  const [cravingsInt, setCravingsInt] = useState<number>(0);
  const [cravingsTypes, setCravingsTypes] = useState<string[]>([]);
  const [pelvicPressurePain, setPelvicPressurePain] = useState<number>(0);
  const [sleepDisruptTypes, setSleepDisruptTypes] = useState<string[]>([]);
  const [anxietySpike, setAnxietySpike] = useState<boolean>(false);

  // Endo Sec6 extended
  const [clotsSize, setClotsSize] = useState<string | null>(null);
  const [bowelSymptoms, setBowelSymptoms] = useState<string[]>([]);
  const [bladderSymptoms, setBladderSymptoms] = useState<string[]>([]);
  const [shoulderSide, setShoulderSide] = useState<string | null>(null);
  const [dyspareunia, setDyspareunia] = useState<boolean>(false);
  const [nauseaSeverity, setNauseaSeverity] = useState<number>(0);

  // Flare Sec6.10
  const [flareModePain, setFlareModePain] = useState<number>(0);
  const [flareModeNausea, setFlareModeNausea] = useState<boolean>(false);
  const [flareModeMovement, setFlareModeMovement] = useState<string>('normal');
  const [flareReflection, setFlareReflection] = useState<string>('');

  // Peri Sec14 extended
  const [hotFlashes, setHotFlashes] = useState<boolean>(false);
  const [hotFlashFrequency, setHotFlashFrequency] = useState<number>(0);
  const [hotFlashSeverity, setHotFlashSeverity] = useState<number>(0);
  const [hotFlashTimeOfDay, setHotFlashTimeOfDay] = useState<string | null>(null);
  const [nightSweats, setNightSweats] = useState<boolean>(false);
  const [vaginalChanges, setVaginalChanges] = useState<boolean>(false);
  const [memoryIssues, setMemoryIssues] = useState<boolean>(false);

  // Dynamic terminology tokens
  const term = {
    cycle: languagePreset === 'inclusive' ? 'cycle' : languagePreset === 'custom' ? customTerms.cycle : 'cycle',
    flow: languagePreset === 'inclusive' ? 'flow' : languagePreset === 'custom' ? customTerms.flow : 'flow',
    body: languagePreset === 'inclusive' ? 'body' : languagePreset === 'custom' ? customTerms.body : 'body',
  };

  useEffect(() => {
    const populateYesterday = async () => {
      if (!autoFillYesterday) return;
      const entries = await getAllEntries();
      if (entries.length > 0) {
        const latest = entries[0];
        setPain(latest.pain_score ?? 0);
        setPainLocations(
          latest.pain_locations ? JSON.parse(latest.pain_locations) : [],
        );
        setPainTypes(latest.pain_type ? JSON.parse(latest.pain_type) : []);
        setMood(latest.mood_score ?? 3);
        setMoodTags(latest.mood_tags ? JSON.parse(latest.mood_tags) : []);
        setBrainFog(latest.brain_fog_score ?? 0);
        setEnergy(latest.energy_score ?? 0);
        setBloating(latest.bloating ?? null);
        setNausea(!!latest.nausea);
        setHeadache(!!latest.headache);
        setFatigue(latest.fatigue_score ?? 0);
        setFlow(latest.flow_intensity ?? null);
        setClots(!!latest.clots);
        setSpotting(!!latest.spotting);
        setStressScore(latest.stress_score ?? 3);
        setSleepHours(latest.sleep_hours ?? 8);
        setSleepQuality(latest.sleep_quality ?? 3);
        setExerciseType(latest.exercise_type ?? "None");
        setExerciseDuration(latest.exercise_duration ?? 0);
        setDietNotes(latest.diet_notes_encrypted ? await decryptField(latest.diet_notes_encrypted) : "");
        setMedicationLog(latest.medication_log_encrypted ? await decryptField(latest.medication_log_encrypted) : "");
      }
    };
    populateYesterday();
  }, [autoFillYesterday]);

  const handleSave = async () => {
    // 3.3.4 Safeguarding Logic
    if (mood === 1) {
      const needsCooldown = useAppStore.getState().checkSafeguardCooldown();
      if (consecutiveLowMoodDays + 1 >= 3 && needsCooldown) {
        useAppStore.getState().setLastSafeguardPrompt(new Date().toISOString());
        Alert.alert(
          "We're here for you",
          "It looks like you've been having a tough few days. You don't have to manage this alone — would it help to look at some resources?",
          [
            {
              text: "Dismiss",
              style: "cancel",
              onPress: () => {
                router.push("/");
                resetLowMood();
              },
            },
            {
              text: "View Resources",
              onPress: () => {
                router.push("/education/resources");
                resetLowMood();
              },
            },
          ],
        );
        return;
      } else if (!needsCooldown) {
        Alert.alert('Support Notice', 'You recently saw this message. Keep logging — resources available anytime in Education tab.');
        return;
      } else {
        incrementLowMood();
      }
    } else {
      resetLowMood();
    }

    // Endo Red Flags
    if (currentMode === "endo") {
      const needsRedFlagCooldown = useAppStore.getState().checkRedFlagCooldown();
      if (needsRedFlagCooldown) {
        let triggerPrompt = false;
        let promptMessage = "";

        if (bowelSymptoms.length > 0 && !!shoulderSide && shoulderSide !== "None" && shoulderSide !== null && (flow === "Heavy" || flow === "Very Heavy")) {
          triggerPrompt = true;
          promptMessage = "You've logged complex symptoms (bowel + shoulder pain + heavy flow) on the same day. This combination warrants medical attention.";
        } else if (pain >= 8) {
          const entries = await getAllEntries();
          const recentDays = entries.slice(0, 2);
          if (recentDays.length >= 2 && recentDays.every(e => e.pain_score && e.pain_score >= 8)) {
            triggerPrompt = true;
            promptMessage = "You've logged severe pain (8+) for 3 consecutive days. We strongly recommend contacting your healthcare provider.";
          }
        }

        if (triggerPrompt) {
          useAppStore.getState().setLastRedFlagPrompt(new Date().toISOString());
          Alert.alert("Red Flag Notice", promptMessage, [{ text: "Got it" }]);
        }
      }
    }

    try {
      const extended: Record<string, any> = {};
      if (currentMode === 'pcos') {
        extended.pcos = {
          acne: {severity: acneSeverity, locations: acneLocations},
          hair_thinning: hairThinningNote,
          hirsutism,
          weight: {dir: weightDir, note: weightNote},
          cravings: {int: cravingsInt, types: cravingsTypes},
          pelvic_pressure: pelvicPressurePain,
          sleep_disruption: sleepDisruptTypes,
          anxiety_spike: anxietySpike
        };
      } else if (currentMode === 'endo') {
        extended.endo = {
          clots: clotsSize,
          bowel: bowelSymptoms,
          bladder: bladderSymptoms,
          shoulder: shoulderSide,
          dyspareunia,
          nausea: nauseaSeverity
        };
      } else if (currentMode === 'peri') {
        extended.peri = { hotFlashes, hotFlashFrequency, hotFlashSeverity, hotFlashTimeOfDay, nightSweats, vaginalChanges, memoryIssues };
      }
      if (inFlare) {
        extended.flare = {start: new Date().toISOString(), mode: {pain: flareModePain, nausea: flareModeNausea, movement: flareModeMovement}};
      }
      await createSymptomEntry({
        cycle_id: activePeriodId ?? null,
        logged_date: new Date().toISOString(),
        pain_score: pain,
        pain_locations: painLocations,
        pain_type: painTypes,
        mood_score: mood,
        mood_tags: moodTags,
        brain_fog_score: brainFog,
        energy_score: energy,
        stress_score: stressScore,
        bloating,
        nausea,
        headache,
        fatigue_score: fatigue,
        extended_symptoms: extended,
        flow_intensity: flow,
        clots_size: clotsSize,
        spotting,
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        exercise_type: exerciseType,
        exercise_duration: exerciseDuration,
        diet_notes_encrypted: dietNotes ? await encryptField(dietNotes) : undefined,
        medication_log_encrypted: medicationLog ? await encryptField(medicationLog) : undefined,
      });
      Alert.alert("Saved", "Log saved securely to local database.");
      router.push("/");
    } catch (error) {
      console.error("Failed saving log entry:", error);
      Alert.alert("Error", "Failed to save log entry. Please try again.");
    }
  };

  const toggleArrayItem = (setter: any, arr: string[], item: string) => {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const handleFlareToggle = (val: boolean) => {
    if (!val && inFlare) {
      Alert.prompt(
        "Flare Ended",
        "What helped you during this flare? (Optional)",
        [
          { text: "Skip", onPress: () => setInFlare(false), style: "cancel" },
          {
            text: "Save",
            onPress: async (reflection?: string) => {
              const endDate = new Date().toISOString();
              const { flareStartDate: startISO, flareDurationDays } = useAppStore.getState();
              setFlareEnd(endDate, reflection || "");
              // Persist to SQLite
              await saveFlareEnd(
                activePeriodId ?? null,
                startISO ?? endDate,
                endDate,
                reflection || "",
                flareDurationDays ?? 1
              );
            }
          }
        ],
        "plain-text"
      );
    } else {
      setInFlare(val);
    }
  };

  const renderMultiSelect = (
    options: string[],
    selectedArr: string[],
    setter: any,
  ) => (
    <View style={styles.buttonGroup}>
      {options.map((opt) => {
        const isSelected = selectedArr.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.chip,
              {
                borderColor: theme.tint,
                backgroundColor: isSelected ? theme.tint : "transparent",
              },
            ]}
            onPress={() => toggleArrayItem(setter, selectedArr, opt)}
          >
            <Text
              style={{
                color: isSelected ? "#FFF" : theme.text,
                fontSize: 13,
                fontWeight: isSelected ? "bold" : "normal",
              }}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderRadio = (
    options: string[],
    selected: string | null,
    setter: any,
  ) => (
    <View style={styles.buttonGroup}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[
            styles.chip,
            {
              borderColor: theme.tint,
              backgroundColor: selected === opt ? theme.tint : "transparent",
            },
          ]}
          onPress={() => setter(opt)}
        >
          <Text
            style={{
              color: selected === opt ? "#FFF" : theme.text,
              fontSize: 13,
            }}
          >
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSlider4 = (
    value: number,
    onValueChange: (val: number) => void,
  ) => (
    <View style={styles.sliderContainer}>
      {[0,1,2,3].map((num) => (
        <TouchableOpacity key={num} onPress={() => onValueChange(num)} style={{ paddingVertical: 10, width: 60, alignItems: 'center' }}>
          <View style={[
            styles.dot,
            { backgroundColor: value >= num ? theme.tint : theme.border, width: value === num ? 20 : 12, height: value === num ? 20 : 12 }
          ]} />
          <Text style={{ fontSize: 12 }}>{num}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSlider10 = (
    value: number,
    onValueChange: (val: number) => void,
  ) => (
    <View style={styles.sliderContainer}>
      <Text style={[styles.sliderHint, { color: theme.textSecondary }]}>0</Text>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 10,
        }}
      >
        {[...Array(11).keys()].map((num) => (
          <TouchableOpacity
            key={num}
            onPress={() => onValueChange(num)}
            style={{ paddingVertical: 10, alignItems: "center", width: 25 }}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: value >= num ? theme.tint : theme.border,
                  width: value === num ? 14 : 10,
                  height: value === num ? 14 : 10,
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.sliderHint, { color: theme.textSecondary }]}>
        10
      </Text>
    </View>
  );

  const renderMoodFaces = () => {
    const faces = ["😢", "🙁", "😐", "🙂", "😁"];
    return (
      <View style={styles.facesContainer}>
        {faces.map((f, i) => {
          const val = i + 1;
          const isSelected = mood === val;
          return (
            <TouchableOpacity key={val} onPress={() => setMood(val)}>
              <Text
                style={{
                  fontSize: isSelected ? 48 : 32,
                  opacity: isSelected ? 1 : 0.4,
                }}
              >
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderToggle = (label: string, value: boolean, setter: any) => (
    <View style={styles.toggleRow}>
      <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>
        {label}
      </Text>
      <Switch value={value} onValueChange={setter} trackColor={{ true: theme.tint }} />
    </View>
  );


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Daily Log</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Under 30 seconds to lock in data.</Text>

        {/* Teen simplified view — only core fields */}
        {isTeen ? (
          <>
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>How are you feeling?</Text>
              {renderMoodFaces()}
            </View>
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Pain (0-10)</Text>
              {renderSlider10(pain, setPain)}
            </View>
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Energy (0-10)</Text>
              {renderSlider10(energy, setEnergy)}
            </View>
            {activePeriodId && (
              <View style={[styles.card, { borderColor: theme.error, borderWidth: 2 }]}>
                <Text style={[styles.sectionTitle, { color: theme.error }]}>Flow</Text>
                {renderRadio(["None", "Light", "Medium", "Heavy"], flow, setFlow)}
              </View>
            )}
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Sleep Hours</Text>
              <View style={styles.sliderContainer}>
                <Text style={[styles.sliderHint, { color: theme.textSecondary }]}>0</Text>
                <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10 }}>
                  {[...Array(13).keys()].map((num) => (
                    <TouchableOpacity key={num} onPress={() => setSleepHours(num)} style={{ paddingVertical: 10, alignItems: "center", width: 25 }}>
                      <View style={[styles.dot, { backgroundColor: sleepHours >= num ? theme.tint : theme.border, width: sleepHours === num ? 14 : 10, height: sleepHours === num ? 14 : 10 }]} />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.sliderHint, { color: theme.textSecondary }]}>12</Text>
              </View>
            </View>
          </>
        ) : (
          <>
        <View style={[styles.toggleRow, { marginVertical: 12 }]}>
          <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>Auto-fill yesterday’s values</Text>
          <Switch value={autoFillYesterday} onValueChange={setAutoFillYesterday} trackColor={{ true: theme.tint }} />
        </View>
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Pain Score (0-10)
          </Text>
          {renderSlider10(pain, setPain)}

          <Text
            style={[
              styles.label,
              { color: theme.textSecondary, marginTop: 16 },
            ]}
          >
            Pain Locations
          </Text>
          {renderMultiSelect(
            [
              "Pelvic",
              "Lower back",
              "Head",
              "Legs",
              "Neck/shoulders",
              "Chest",
              "Other",
            ],
            painLocations,
            setPainLocations,
          )}

          <Text
            style={[
              styles.label,
              { color: theme.textSecondary, marginTop: 16 },
            ]}
          >
            Pain Type
          </Text>
          {renderMultiSelect(
            [
              "Cramping",
              "Stabbing",
              "Aching",
              "Burning",
              "Pressure",
              "Throbbing",
            ],
            painTypes,
            setPainTypes,
          )}
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Mood</Text>
          {renderMoodFaces()}
          <Text
            style={[
              styles.label,
              { color: theme.textSecondary, marginTop: 16 },
            ]}
          >
            Mood Tags
          </Text>
          {renderMultiSelect(
            [
              "Anxious",
              "Irritable",
              "Low",
              "Hopeful",
              "Stable",
              "Overwhelmed",
              "Calm",
              "Tearful",
              "Dissociated",
              "Angry",
            ],
            moodTags,
            setMoodTags,
          )}
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Physical & Cognitive
          </Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Brain Fog (0-10) "How clear is your thinking?"
          </Text>
          {renderSlider10(brainFog, setBrainFog)}

          <Text
            style={[
              styles.label,
              { color: theme.textSecondary, marginTop: 16 },
            ]}
          >
            Energy Level (0-10)
          </Text>
          {renderSlider10(energy, setEnergy)}

          <Text
            style={[
              styles.label,
              { color: theme.textSecondary, marginTop: 16 },
            ]}
          >
            Fatigue Level (0-10)
          </Text>
          {renderSlider10(fatigue, setFatigue)}

          <Text
            style={[
              styles.label,
              { color: theme.textSecondary, marginTop: 16 },
            ]}
          >
            Bloating
          </Text>
          {renderRadio(
            ["None", "Mild", "Moderate", "Severe"],
            bloating,
            setBloating,
          )}

          <View
            style={{
              marginTop: 16,
              borderTopWidth: 1,
              borderTopColor: theme.border,
              paddingTop: 16,
            }}
          >
            {!isTeen && renderToggle("Spotting", spotting, setSpotting)}
            {renderToggle("Headache", headache, setHeadache)}
            {renderToggle("Nausea", nausea, setNausea)}
          </View>
        </View>

        {activePeriodId && (
          <View
            style={[styles.card, { borderColor: theme.error, borderWidth: 2 }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.error }]}>
              Active {term.cycle.charAt(0).toUpperCase() + term.cycle.slice(1)} — {term.flow.charAt(0).toUpperCase() + term.flow.slice(1)} & Clots
            </Text>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {term.flow.charAt(0).toUpperCase() + term.flow.slice(1)} Intensity
            </Text>
            {renderRadio(
              ["None", "Spotting", "Light", "Medium", "Heavy", "Very Heavy"],
              flow,
              setFlow,
            )}
            {!isTeen && (
              <View style={{ marginTop: 16 }}>
                {renderToggle("Clotting Present", clots, setClots)}
              </View>
            )}
          </View>
        )}

        {currentMode === "pcos" && (
          <View style={[styles.card, { borderColor: theme.pcos, borderWidth: 2 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>PCOS Symptoms Sec5</Text>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Acne severity (0-3)</Text>
            {renderSlider4(acneSeverity, setAcneSeverity)}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 8 }]}>Acne locations</Text>
            {renderMultiSelect(['face', 'back', 'chest'], acneLocations, setAcneLocations)}
        {renderToggle('Hair thinning', hairThinningNote.length > 0, () => setHairThinningNote(hairThinningNote ? '' : 'yes'))}
            <TextInput style={[styles.inputText, { color: theme.text }]} value={hairThinningNote} onChangeText={setHairThinningNote} placeholder="Hair thinning note" />
            {renderToggle('Hirsutism', hirsutism, setHirsutism)}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>Weight change</Text>
            {renderRadio(['Gaining', 'Losing', 'Stable'], weightDir, setWeightDir)}
            <TextInput style={[styles.inputText, { color: theme.text }]} value={weightNote} onChangeText={setWeightNote} placeholder="Weight note" />
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>Cravings intensity (0-3)</Text>
            {renderSlider4(cravingsInt, setCravingsInt)}
            {renderMultiSelect(['sugar', 'carbs', 'salty', 'general'], cravingsTypes, setCravingsTypes)}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Pelvic pressure pain (0-10)</Text>
            {renderSlider10(pelvicPressurePain, setPelvicPressurePain)}
            {renderMultiSelect(['nightmares', 'insomnia', 'waking'], sleepDisruptTypes, setSleepDisruptTypes)}
            {renderToggle('Anxiety spike', anxietySpike, setAnxietySpike)}
          </View>
        )}

        {currentMode === "peri" && (
          <View style={[styles.card, { borderColor: theme.tint, borderWidth: 2 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {languagePreset === 'inclusive' ? 'Body Changes (Peri)' : 'Perimenopause Tracking'}
            </Text>
            {renderToggle("Hot Flashes", hotFlashes, setHotFlashes)}
            {hotFlashes && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Frequency today (episodes)</Text>
                <View style={styles.durationRow}>
                  <TouchableOpacity style={[styles.adjustBtn, { borderColor: theme.tint }]} onPress={() => setHotFlashFrequency(Math.max(0, hotFlashFrequency - 1))}>
                    <Text style={{ color: theme.tint }}>-1</Text>
                  </TouchableOpacity>
                  <Text style={[styles.valueText, { color: theme.text }]}>{hotFlashFrequency}</Text>
                  <TouchableOpacity style={[styles.adjustBtn, { borderColor: theme.tint }]} onPress={() => setHotFlashFrequency(hotFlashFrequency + 1)}>
                    <Text style={{ color: theme.tint }}>+1</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>Severity (0-3)</Text>
                {renderSlider4(hotFlashSeverity, setHotFlashSeverity)}
                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>Time of day</Text>
                {renderRadio(['Morning', 'Afternoon', 'Evening', 'Night'], hotFlashTimeOfDay, setHotFlashTimeOfDay)}
              </View>
            )}
            {renderToggle("Night Sweats", nightSweats, setNightSweats)}
            {renderToggle("Vaginal Dryness/Changes", vaginalChanges, setVaginalChanges)}
            {renderToggle("Cognitive / Memory Blanks", memoryIssues, setMemoryIssues)}
          </View>
        )}

        {currentMode === "endo" && (
          <View
            style={[styles.card, { borderColor: theme.endo, borderWidth: 2 }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Endo Extended Symptoms
            </Text>
            {renderToggle("Declare Endo Flare", inFlare, handleFlareToggle)}

            {inFlare ? (
              // Condensed 3-field flare mode
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.label, { color: theme.endo, fontWeight: 'bold', marginBottom: 8 }]}>⚡ Flare Mode — Quick Log</Text>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Flare Pain (0-10)</Text>
                {renderSlider10(flareModePain, setFlareModePain)}
                {renderToggle("Nausea", flareModeNausea, setFlareModeNausea)}
                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>Movement Ability</Text>
                {renderRadio(["Normal", "Limited", "Bed-bound"], flareModeMovement, setFlareModeMovement)}
              </View>
            ) : (
              // Full endo symptom palette
              <View>
                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>Clot Size</Text>
                {renderRadio(["None", "Small", "Medium", "Large"], clotsSize, setClotsSize)}

                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>Bowel Symptoms</Text>
                {renderMultiSelect(["Constipation", "Diarrhoea", "Pain", "Bleeding"], bowelSymptoms, setBowelSymptoms)}

                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>Bladder Symptoms</Text>
                {renderMultiSelect(["Pain", "Frequency", "Urgency", "Blood"], bladderSymptoms, setBladderSymptoms)}

                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>Shoulder/Referred Pain</Text>
                {renderRadio(["None", "Left", "Right", "Both"], shoulderSide, setShoulderSide)}

                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>Nausea Severity (0-3)</Text>
                {renderSlider4(nauseaSeverity, setNauseaSeverity)}

                {!isTeen && (
                  <View style={{ marginTop: 16 }}>
                    {renderToggle("Dyspareunia (Pain during sex)", dyspareunia, setDyspareunia)}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* 4.5 Lifestyle & Trigger Analysis */}
        <View
          style={[styles.card, { borderColor: theme.border, borderWidth: 1 }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Lifestyle Triggers
          </Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Sleep Quality (1-5)
          </Text>
          {renderSlider10(sleepQuality, setSleepQuality)}

          <Text
            style={[
              styles.label,
              { color: theme.textSecondary, marginTop: 16 },
            ]}
          >
            Sleep Hours (0-12)
          </Text>
          <View style={styles.sliderContainer}>
            <Text style={[styles.sliderHint, { color: theme.textSecondary }]}>0</Text>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 10,
              }}
            >
              {[...Array(13).keys()].map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => setSleepHours(num)}
                  style={{ paddingVertical: 10, alignItems: "center", width: 25 }}
                >
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: sleepHours >= num ? theme.tint : theme.border,
                        width: sleepHours === num ? 14 : 10,
                        height: sleepHours === num ? 14 : 10,
                      },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.sliderHint, { color: theme.textSecondary }]}>
              12
            </Text>
          </View>

          <Text
            style={[
              styles.label,
              { color: theme.textSecondary, marginTop: 16 },
            ]}
          >
            Exercise Type
          </Text>
          {renderMultiSelect(
            ["Walking", "Yoga", "Running", "Cycling", "Strength", "None"],
            exerciseType ? [exerciseType] : ['None'],
            (vals: string[]) => setExerciseType(vals[0] ?? 'None'),
          )}

          <Text
            style={[
              styles.label,
              { color: theme.textSecondary, marginTop: 16 },
            ]}
          >
            Exercise Duration (minutes)
          </Text>
          <View style={styles.durationRow}>
            <TouchableOpacity style={[styles.adjustBtn, { borderColor: theme.tint }]} onPress={() => setExerciseDuration(Math.max(0, exerciseDuration - 5))}>
              <Text style={{ color: theme.tint }}>-5</Text>
            </TouchableOpacity>
            <Text style={[styles.valueText, { color: theme.text }]}>{exerciseDuration} min</Text>
            <TouchableOpacity style={[styles.adjustBtn, { borderColor: theme.tint }]} onPress={() => setExerciseDuration(exerciseDuration + 5)}>
              <Text style={{ color: theme.tint }}>+5</Text>
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.label,
              { color: theme.textSecondary, marginTop: 16 },
            ]}
          >
            Stress Score (1-5)
          </Text>
          {renderSlider10(stressScore, setStressScore)}

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>Diet Notes</Text>
          <TextInput
            style={[styles.inputText, { color: theme.text, borderColor: theme.border }]}
            value={dietNotes}
            onChangeText={setDietNotes}
            placeholder="Brief notes about meals or intolerances"
            placeholderTextColor={theme.textSecondary}
            multiline
          />

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>Medication / Supplements</Text>
          <TextInput
            style={[styles.inputText, { color: theme.text, borderColor: theme.border }]}
            value={medicationLog}
            onChangeText={setMedicationLog}
            placeholder="List medications or supplements taken today"
            placeholderTextColor={theme.textSecondary}
            multiline
          />
        </View>
        </> /* end non-teen */
        )}

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.tint }]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save Log</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 50 },
  title: { fontSize: 32, fontWeight: "bold" },
  subtitle: { fontSize: 16, marginBottom: 20 },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFF",
    marginBottom: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: "500" },
  buttonGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dot: { borderRadius: 10 },
  sliderHint: { fontSize: 16, fontWeight: "bold" },
  facesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
    paddingHorizontal: 10,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  adjustBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  valueText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  inputText: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 80,
    padding: 12,
    marginTop: 8,
  },
  saveButton: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButtonText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
});
