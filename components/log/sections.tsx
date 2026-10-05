/**
 * Condition-specific cards on the Daily Log screen. Each owns no state: it renders a
 * slice of the form (see utils/logEntry.ts) and reports changes as patches.
 */
import { Captions, Options, SeverityLabels } from "@/constants/copy";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { EndoLog, FlareLog, PcosLog, PeriLog } from "@/utils/logEntry";
import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Card, Divider, Question } from "./card";
import { MultiSelect, RadioGroup, Scale, Slider4, ToggleRow } from "./inputs";

const useTheme = () => Colors[useColorScheme() ?? "light"];

function NoteInput({ value, onChange, placeholder }: { value: string; onChange: (t: string) => void; placeholder: string }) {
  const theme = useTheme();
  return (
    <TextInput
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
  return (
    <Card title="PCOS check-in 💚" subtitle="the stuff your doctor will actually want to know" accent={theme.pcos}>
      <Question first>Skin today?</Question>
      <Slider4 value={value.acneSeverity} onChange={(acneSeverity) => onChange(acneSeverity === 0 ? { acneSeverity, acneLocations: [] } : { acneSeverity })} labels={SeverityLabels.acne} />
      {value.acneSeverity > 0 && (
        <>
          <Question>Where are the breakouts?</Question>
          <MultiSelect options={Options.acneLocations} selected={value.acneLocations} onChange={(acneLocations) => onChange({ acneLocations })} />
        </>
      )}

      <Divider />
      <ToggleRow
        label="Hair shedding / thinning"
        value={value.hairThinningNote.length > 0}
        onChange={() => onChange({ hairThinningNote: value.hairThinningNote ? "" : "yes" })}
      />
      {value.hairThinningNote.length > 0 && (
        <NoteInput
          value={value.hairThinningNote === "yes" ? "" : value.hairThinningNote}
          onChange={(t) => onChange({ hairThinningNote: t || "yes" })}
          placeholder="anything to note? (optional)"
        />
      )}
      <ToggleRow label="New or extra hair growth" value={value.hirsutism} onChange={(hirsutism) => onChange({ hirsutism })} />
      <ToggleRow label="Anxiety spike today" value={value.anxietySpike} onChange={(anxietySpike) => onChange({ anxietySpike })} />

      <Question>Weight lately?</Question>
      <RadioGroup options={Options.weight} selected={value.weightDir} onChange={(weightDir) => onChange({ weightDir })} />
      {value.weightDir && (
        <NoteInput value={value.weightNote} onChange={(weightNote) => onChange({ weightNote })} placeholder="add context if you want (optional)" />
      )}

      <Question>Cravings?</Question>
      <Slider4 value={value.cravingsInt} onChange={(cravingsInt) => onChange(cravingsInt === 0 ? { cravingsInt, cravingsTypes: [] } : { cravingsInt })} labels={SeverityLabels.cravings} />
      {value.cravingsInt > 0 && (
        <>
          <Question hint="pick all that apply">Craving what?</Question>
          <MultiSelect options={Options.cravings} selected={value.cravingsTypes} onChange={(cravingsTypes) => onChange({ cravingsTypes })} />
        </>
      )}

      <Question>Pelvic pressure?</Question>
      <Scale
        min={0}
        max={10}
        value={value.pelvicPressurePain}
        onChange={(pelvicPressurePain) => onChange({ pelvicPressurePain })}
        caption={Captions.pain}
        lowLabel="none"
        highLabel="worst"
      />

      <Question hint="pick all that apply">Sleep messed with?</Question>
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
  return (
    <Card
      title={inclusiveLanguage ? "Body changes check-in 🌡️" : "Perimenopause check-in 🌡️"}
      subtitle="tracking this helps spot patterns your doctor can use"
      accent={theme.peri}
    >
      <ToggleRow label="Hot flashes today 🔥" value={value.hotFlashes} onChange={(hotFlashes) => onChange({ hotFlashes })} />
      {value.hotFlashes && (
        <View style={{ marginBottom: Spacing.sm }}>
          <Question>How many?</Question>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepBtn, { borderColor: theme.tint }]}
              onPress={() => onChange({ hotFlashFrequency: Math.max(0, value.hotFlashFrequency - 1) })}
              accessibilityLabel="One fewer"
            >
              <Text style={[styles.stepBtnText, { color: theme.tint }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.stepValue, { color: theme.text }]}>{value.hotFlashFrequency}</Text>
            <TouchableOpacity
              style={[styles.stepBtn, { borderColor: theme.tint }]}
              onPress={() => onChange({ hotFlashFrequency: value.hotFlashFrequency + 1 })}
              accessibilityLabel="One more"
            >
              <Text style={[styles.stepBtnText, { color: theme.tint }]}>+</Text>
            </TouchableOpacity>
          </View>
          <Question>How intense?</Question>
          <Slider4 value={value.hotFlashSeverity} onChange={(hotFlashSeverity) => onChange({ hotFlashSeverity })} labels={SeverityLabels.hotFlash} />
          <Question>When did they hit?</Question>
          <RadioGroup options={Options.hotFlashTime} selected={value.hotFlashTimeOfDay} onChange={(hotFlashTimeOfDay) => onChange({ hotFlashTimeOfDay })} />
        </View>
      )}
      <ToggleRow label="Night sweats 💦" value={value.nightSweats} onChange={(nightSweats) => onChange({ nightSweats })} />
      <ToggleRow label="Vaginal dryness / changes" value={value.vaginalChanges} onChange={(vaginalChanges) => onChange({ vaginalChanges })} />
      <ToggleRow label="Brain blanks / forgetting stuff" value={value.memoryIssues} onChange={(memoryIssues) => onChange({ memoryIssues })} />
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
  return (
    <Card title="Endo check-in 💜" subtitle="flare on? flip the switch and we'll keep it short" accent={theme.endo}>
      <ToggleRow
        label="I'm in a flare"
        hint="switches to a quick 3-question log"
        value={flareActive}
        onChange={onFlareToggle}
      />

      {/* Alert.alert can't collect text, so ending a flare opens this inline reflection card. */}
      {endingFlare && (
        <View style={[styles.reflection, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={[styles.reflectionTitle, { color: theme.endo }]}>Flare over — you made it through 💜</Text>
          <Text style={[styles.reflectionHint, { color: theme.textSecondary }]}>
            What helped, even a little? Future-you will thank you. (optional)
          </Text>
          <NoteInput value={reflection} onChange={onReflectionChange} placeholder="heat pad, rest, meds timing, a good playlist…" />
          <View style={styles.reflectionActions}>
            <TouchableOpacity onPress={() => onFinishFlare("")} style={[styles.ghostBtn, { borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontWeight: "600" }}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onFinishFlare(reflection.trim())}
              style={[styles.solidBtn, { backgroundColor: theme.endo }]}
            >
              <Text style={{ color: theme.onAccent, fontWeight: "800" }}>Save it</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {flareActive ? (
        // Condensed 3-field flare mode
        <View>
          <Text style={[styles.flareBadge, { color: theme.endo }]}>⚡ flare mode — just the essentials</Text>
          <Question>Flare pain right now?</Question>
          <Scale min={0} max={10} value={flare.pain} onChange={(pain) => onFlareChange({ pain })} caption={Captions.pain} lowLabel="none" highLabel="worst" />
          <ToggleRow label="Nauseous 🤢" value={flare.nausea} onChange={(nausea) => onFlareChange({ nausea })} />
          <Question>How&apos;s moving around?</Question>
          <RadioGroup options={Options.flareMovement} selected={flare.movement} onChange={(movement) => onFlareChange({ movement })} />
        </View>
      ) : (
        // Full endo symptom palette
        <View>
          <Question>Any clots?</Question>
          <RadioGroup options={Options.clotSizeWithNone} selected={clotsSize} onChange={onClotsSizeChange} />

          <Question hint="pick all that apply">Bowel stuff?</Question>
          <MultiSelect options={Options.bowel} selected={value.bowelSymptoms} onChange={(bowelSymptoms) => onChange({ bowelSymptoms })} />

          <Question hint="pick all that apply">Bladder stuff?</Question>
          <MultiSelect options={Options.bladder} selected={value.bladderSymptoms} onChange={(bladderSymptoms) => onChange({ bladderSymptoms })} />

          <Question hint="pain that shows up in your shoulder can be linked to endo">Shoulder pain?</Question>
          <RadioGroup options={Options.shoulder} selected={value.shoulderSide} onChange={(shoulderSide) => onChange({ shoulderSide })} />

          <Question>Nausea?</Question>
          <Slider4 value={value.nauseaSeverity} onChange={(nauseaSeverity) => onChange({ nauseaSeverity })} labels={SeverityLabels.generic} />

          {!isTeen && (
            <>
              <Divider />
              <ToggleRow
                label="Pain during sex"
                hint="private, stays on your phone"
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
  stepBtn: { width: 44, height: 44, borderRadius: Radius.pill, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontSize: 22, fontWeight: "700" },
  stepValue: { fontSize: 22, fontWeight: "800", minWidth: 32, textAlign: "center" },
  reflection: { borderRadius: Radius.md, padding: Spacing.lg, marginVertical: Spacing.md },
  reflectionTitle: { fontSize: 16, fontWeight: "800" },
  reflectionHint: { fontSize: 13, marginTop: 4 },
  reflectionActions: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.md, justifyContent: "flex-end" },
  ghostBtn: { paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1.5 },
  solidBtn: { paddingHorizontal: Spacing.xl, paddingVertical: 10, borderRadius: Radius.pill },
  flareBadge: { fontSize: 14, fontWeight: "800", marginTop: Spacing.md },
});
