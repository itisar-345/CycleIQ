/**
 * Condition-specific cards on the Daily Log screen. Each owns no state: it renders a
 * slice of the form (see utils/logEntry.ts) and reports changes as patches.
 */
import { useCopy } from "@/constants/copy";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { EndoLog, FlareLog, PcosLog, PeriLog } from "@/utils/logEntry";
import { useTx } from "@/utils/tone";
import { Activity, HeartPulse, Thermometer } from "@/components/icons";
import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Card, Divider, Question } from "./card";
import { MultiSelect, RadioGroup, Scale, Slider4, ToggleRow } from "./inputs";

const useTheme = () => Colors[useColorScheme() ?? "light"];

function NoteInput({ value, onChange, placeholder }: { value: string; onChange: (t: string) => void; placeholder: string }) {
  const theme = useTheme();
  return (
    <TextInput
      accessibilityLabel={placeholder}
      style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      multiline
    />
  );
}

export function PcosSection({ value, onChange }: { value: PcosLog; onChange: (patch: Partial<PcosLog>) => void }) {
  const theme = useTheme();
  const tx = useTx();
  const { captions: Captions, options: Options, severity: SeverityLabels } = useCopy();
  return (
    <Card icon={HeartPulse} title={tx("PCOS check-in", "PCOS symptoms")} subtitle={tx("the stuff your doctor will actually want to know", "Details that are useful for your doctor.")} accent={theme.pcos}>
      <Question first>{tx("Skin today?", "Acne today")}</Question>
      <Slider4 value={value.acneSeverity} onChange={(acneSeverity) => onChange(acneSeverity === 0 ? { acneSeverity, acneLocations: [] } : { acneSeverity })} labels={SeverityLabels.acne} />
      {value.acneSeverity > 0 && (
        <>
          <Question>{tx("Where are the breakouts?", "Acne locations")}</Question>
          <MultiSelect options={Options.acneLocations} selected={value.acneLocations} onChange={(acneLocations) => onChange({ acneLocations })} />
        </>
      )}

      <Divider />
      <ToggleRow
        label={tx("Hair shedding / thinning", "Hair thinning")}
        value={value.hairThinningNote.length > 0}
        onChange={() => onChange({ hairThinningNote: value.hairThinningNote ? "" : "yes" })}
      />
      {value.hairThinningNote.length > 0 && (
        <NoteInput
          value={value.hairThinningNote === "yes" ? "" : value.hairThinningNote}
          onChange={(t) => onChange({ hairThinningNote: t || "yes" })}
          placeholder={tx("anything to note? (optional)", "Notes (optional)")}
        />
      )}
      <ToggleRow label={tx("New or extra hair growth", "Excess hair growth")} value={value.hirsutism} onChange={(hirsutism) => onChange({ hirsutism })} />
      <ToggleRow label={tx("Anxiety spike today", "Anxiety spike")} value={value.anxietySpike} onChange={(anxietySpike) => onChange({ anxietySpike })} />

      <Question>{tx("Weight lately?", "Weight change")}</Question>
      <RadioGroup options={Options.weight} selected={value.weightDir} onChange={(weightDir) => onChange({ weightDir })} />
      {value.weightDir && (
        <NoteInput value={value.weightNote} onChange={(weightNote) => onChange({ weightNote })} placeholder={tx("add context if you want (optional)", "Notes (optional)")} />
      )}

      <Question>{tx("Cravings?", "Cravings")}</Question>
      <Slider4 value={value.cravingsInt} onChange={(cravingsInt) => onChange(cravingsInt === 0 ? { cravingsInt, cravingsTypes: [] } : { cravingsInt })} labels={SeverityLabels.cravings} />
      {value.cravingsInt > 0 && (
        <>
          <Question hint={tx("pick all that apply", "Select all that apply")}>{tx("Craving what?", "Type of craving")}</Question>
          <MultiSelect options={Options.cravings} selected={value.cravingsTypes} onChange={(cravingsTypes) => onChange({ cravingsTypes })} />
        </>
      )}

      <Question>{tx("Pelvic pressure?", "Pelvic pressure")}</Question>
      <Scale
        min={0}
        max={10}
        value={value.pelvicPressurePain}
        onChange={(pelvicPressurePain) => onChange({ pelvicPressurePain })}
        caption={Captions.pain}
        lowLabel={tx("none", "None")}
        highLabel={tx("worst", "Worst")}
      />

      <Question hint={tx("pick all that apply", "Select all that apply")}>{tx("Sleep messed with?", "Sleep disruption")}</Question>
      <MultiSelect options={Options.sleepDisruption} selected={value.sleepDisruptTypes} onChange={(sleepDisruptTypes) => onChange({ sleepDisruptTypes })} />
    </Card>
  );
}

export function PeriSection({
  value,
  onChange,
  inclusiveLanguage,
}: {
  value: PeriLog;
  onChange: (patch: Partial<PeriLog>) => void;
  inclusiveLanguage: boolean;
}) {
  const theme = useTheme();
  const tx = useTx();
  const { options: Options, severity: SeverityLabels } = useCopy();
  return (
    <Card
      icon={Thermometer}
      title={inclusiveLanguage ? tx("Body changes check-in", "Body changes") : tx("Perimenopause check-in", "Perimenopause symptoms")}
      subtitle={tx("tracking this helps spot patterns your doctor can use", "Tracking these helps identify patterns.")}
      accent={theme.peri}
    >
      <ToggleRow label={tx("Hot flashes today", "Hot flashes")} value={value.hotFlashes} onChange={(hotFlashes) => onChange({ hotFlashes })} />
      {value.hotFlashes && (
        <View style={{ marginBottom: Spacing.sm }}>
          <Question>{tx("How many?", "Number of hot flashes")}</Question>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepBtn, { borderColor: theme.tint }]}
              onPress={() => onChange({ hotFlashFrequency: Math.max(0, value.hotFlashFrequency - 1) })}
              accessibilityLabel={tx("One fewer", "One fewer")}
            >
              <Text style={[styles.stepBtnText, { color: theme.tint }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.stepValue, { color: theme.text }]} accessibilityLabel={`${value.hotFlashFrequency} hot flashes`}>{value.hotFlashFrequency}</Text>
            <TouchableOpacity
              style={[styles.stepBtn, { borderColor: theme.tint }]}
              onPress={() => onChange({ hotFlashFrequency: value.hotFlashFrequency + 1 })}
              accessibilityLabel={tx("One more", "One more")}
            >
              <Text style={[styles.stepBtnText, { color: theme.tint }]}>+</Text>
            </TouchableOpacity>
          </View>
          <Question>{tx("How intense?", "Severity")}</Question>
          <Slider4 value={value.hotFlashSeverity} onChange={(hotFlashSeverity) => onChange({ hotFlashSeverity })} labels={SeverityLabels.hotFlash} />
          <Question>{tx("When did they hit?", "Time of day")}</Question>
          <RadioGroup options={Options.hotFlashTime} selected={value.hotFlashTimeOfDay} onChange={(hotFlashTimeOfDay) => onChange({ hotFlashTimeOfDay })} />
        </View>
      )}
      <ToggleRow label={tx("Night sweats", "Night sweats")} value={value.nightSweats} onChange={(nightSweats) => onChange({ nightSweats })} />
      <ToggleRow label={tx("Vaginal dryness / changes", "Vaginal dryness or changes")} value={value.vaginalChanges} onChange={(vaginalChanges) => onChange({ vaginalChanges })} />
      <ToggleRow label={tx("Brain blanks / forgetting stuff", "Memory or concentration problems")} value={value.memoryIssues} onChange={(memoryIssues) => onChange({ memoryIssues })} />
    </Card>
  );
}

export function EndoSection({
  value,
  onChange,
  clotsSize,
  onClotsSizeChange,
  isTeen,
  flareActive,
  onFlareToggle,
  endingFlare,
  reflection,
  onReflectionChange,
  onFinishFlare,
  flare,
  onFlareChange,
}: {
  value: EndoLog;
  onChange: (patch: Partial<EndoLog>) => void;
  clotsSize: string | null;
  onClotsSizeChange: (size: string) => void;
  isTeen: boolean;
  /** In a flare and not currently ending it. */
  flareActive: boolean;
  onFlareToggle: (on: boolean) => void;
  endingFlare: boolean;
  reflection: string;
  onReflectionChange: (text: string) => void;
  onFinishFlare: (reflection: string) => void;
  flare: FlareLog;
  onFlareChange: (patch: Partial<FlareLog>) => void;
}) {
  const theme = useTheme();
  const tx = useTx();
  const { captions: Captions, options: Options, severity: SeverityLabels } = useCopy();
  return (
    <Card icon={Activity} title={tx("Endo check-in", "Endometriosis symptoms")} subtitle={tx("flare on? flip the switch and we'll keep it short", "If you're in a flare, switch on flare mode for a shorter log.")} accent={theme.endo}>
      <ToggleRow
        label={tx("I'm in a flare", "Flare mode")}
        hint={tx("switches to a quick 3-question log", "Shows a shorter 3-question log")}
        value={flareActive}
        onChange={onFlareToggle}
      />

      {/* Alert.alert can't collect text, so ending a flare opens this inline reflection card. */}
      {endingFlare && (
        <View style={[styles.reflection, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={[styles.reflectionTitle, { color: theme.endo }]} accessibilityRole="header">{tx("Flare over — you made it through", "Flare ended")}</Text>
          <Text style={[styles.reflectionHint, { color: theme.textSecondary }]}>
            {tx("What helped, even a little? Future-you will thank you. (optional)", "What helped during this flare? (optional)")}
          </Text>
          <NoteInput value={reflection} onChange={onReflectionChange} placeholder={tx("heat pad, rest, meds timing, a good playlist…", "e.g. heat, rest, medication timing")} />
          <View style={styles.reflectionActions}>
            <TouchableOpacity onPress={() => onFinishFlare("")} style={[styles.ghostBtn, { borderColor: theme.border }]} accessibilityRole="button">
              <Text style={{ color: theme.text, fontWeight: "600" }}>{tx("Skip", "Skip")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onFinishFlare(reflection.trim())}
              style={[styles.solidBtn, { backgroundColor: theme.endo }]}
              accessibilityRole="button"
            >
              <Text style={{ color: theme.onAccent, fontWeight: "800" }}>{tx("Save it", "Save")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {flareActive ? (
        // Condensed 3-field flare mode
        <View>
          <Text style={[styles.flareBadge, { color: theme.endo }]}>{tx("flare mode — just the essentials", "Flare mode: essentials only")}</Text>
          <Question>{tx("Flare pain right now?", "Flare pain")}</Question>
          <Scale min={0} max={10} value={flare.pain} onChange={(pain) => onFlareChange({ pain })} caption={Captions.pain} lowLabel={tx("none", "None")} highLabel={tx("worst", "Worst")} />
          <ToggleRow label={tx("Nauseous", "Nausea")} value={flare.nausea} onChange={(nausea) => onFlareChange({ nausea })} />
          <Question>{tx("How's moving around?", "Mobility")}</Question>
          <RadioGroup options={Options.flareMovement} selected={flare.movement} onChange={(movement) => onFlareChange({ movement })} />
        </View>
      ) : (
        // Full endo symptom palette
        <View>
          <Question>{tx("Any clots?", "Clots")}</Question>
          <RadioGroup options={Options.clotSizeWithNone} selected={clotsSize} onChange={onClotsSizeChange} />

          <Question hint={tx("pick all that apply", "Select all that apply")}>{tx("Bowel stuff?", "Bowel symptoms")}</Question>
          <MultiSelect options={Options.bowel} selected={value.bowelSymptoms} onChange={(bowelSymptoms) => onChange({ bowelSymptoms })} />

          <Question hint={tx("pick all that apply", "Select all that apply")}>{tx("Bladder stuff?", "Bladder symptoms")}</Question>
          <MultiSelect options={Options.bladder} selected={value.bladderSymptoms} onChange={(bladderSymptoms) => onChange({ bladderSymptoms })} />

          <Question hint={tx("pain that shows up in your shoulder can be linked to endo", "Shoulder pain can be linked to endometriosis.")}>{tx("Shoulder pain?", "Shoulder pain")}</Question>
          <RadioGroup options={Options.shoulder} selected={value.shoulderSide} onChange={(shoulderSide) => onChange({ shoulderSide })} />

          <Question>{tx("Nausea?", "Nausea")}</Question>
          <Slider4 value={value.nauseaSeverity} onChange={(nauseaSeverity) => onChange({ nauseaSeverity })} labels={SeverityLabels.generic} />

          {!isTeen && (
            <>
              <Divider />
              <ToggleRow
                label={tx("Pain during sex", "Pain during sex")}
                hint={tx("private, stays on your phone", "Private — stored only on this device")}
                value={value.dyspareunia}
                onChange={(dyspareunia) => onChange({ dyspareunia })}
              />
            </>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    minHeight: 64,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    fontSize: 15,
    textAlignVertical: "top",
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: Spacing.lg },
  stepBtn: { width: 48, height: 48, borderRadius: Radius.pill, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontSize: 22, fontWeight: "700" },
  stepValue: { fontSize: 22, fontWeight: "800", minWidth: 32, textAlign: "center" },
  reflection: { borderRadius: Radius.md, padding: Spacing.lg, marginVertical: Spacing.md },
  reflectionTitle: { fontSize: 16, fontWeight: "800" },
  reflectionHint: { fontSize: 13, marginTop: 4 },
  reflectionActions: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.md, justifyContent: "flex-end" },
  ghostBtn: { paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1.5, minHeight: 44, justifyContent: "center" },
  solidBtn: { paddingHorizontal: Spacing.xl, paddingVertical: 10, borderRadius: Radius.pill, minHeight: 44, justifyContent: "center" },
  flareBadge: { fontSize: 14, fontWeight: "800", marginTop: Spacing.md },
});
