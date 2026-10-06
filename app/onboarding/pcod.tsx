import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { OnboardingProgress } from '@/components/onboarding-progress';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTx } from '@/utils/tone';
import { router } from 'expo-router';
import { useAppStore, PCOSSetup } from '@/store';

export default function PCODSetupScreen() {
  const tx = useTx();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const accentColor = theme.pcod;
  const { setPCOSData } = useAppStore();

  const [form, setForm] = useState<PCOSSetup>({
    diagnosisStatus: '',
    cyclePattern: '',
    comorbidities: [],
    currentManagement: '',
  });

  const handleNext = () => {
    setPCOSData(form);
    // From Profile (already onboarded) just go back; during onboarding continue to consent.
    if (useAppStore.getState().isOnboarded) router.back();
    else router.push('/onboarding/consent');
  };

  const renderSingleSelect = (key: keyof PCOSSetup, options: { value: string; label: string }[]) => (
    <View style={styles.buttonGroup}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.optionButton, {
            borderColor: accentColor,
            backgroundColor: form[key] === opt.value ? accentColor : 'transparent',
          }]}
          onPress={() => setForm({ ...form, [key]: opt.value })}
          accessibilityRole="radio"
          accessibilityState={{ checked: form[key] === opt.value }}
        >
          <Text style={{ color: form[key] === opt.value ? theme.onAccent : theme.text, fontWeight: form[key] === opt.value ? 'bold' : 'normal' }}>
            {tx(opt.label, opt.value)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: accentColor }]}>{tx("← back", "← Back")}</Text>
        </TouchableOpacity>
        <OnboardingProgress step={4} total={5} label={tx("step 4 · a few details", "Step 4: details")} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">{tx("Let's set up PCOD mode 💙", "PCOD setup")}</Text>

        <View style={[styles.privacyNote, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
            {tx("🔒 This stays on your phone. We never see it — we literally can't.", "Your health data stays on this device. We never see it.")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">{tx("Where are you at with a diagnosis?", "Diagnosis status")}</Text>
          {renderSingleSelect('diagnosisStatus', [{ value: 'Confirmed diagnosis', label: 'diagnosed by a doctor' }, { value: 'Suspected', label: 'doctor thinks maybe' }, { value: 'Self-identified', label: 'I think I have it' }])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">{tx("What do your periods usually do?", "Cycle pattern")}</Text>
          {renderSingleSelect('cyclePattern', [{ value: 'Regular with cysts', label: 'regular-ish, but cysts' }, { value: 'Irregular', label: 'all over the place' }, { value: 'Absent (Amenorrhoea)', label: 'basically ghosted me 👻' }])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">{tx("Managing it with anything right now?", "Current treatment")}</Text>
          {renderSingleSelect('currentManagement', [{ value: 'Hormonal BC', label: 'birth control / hormones' }, { value: 'Lifestyle changes', label: 'food & lifestyle' }, { value: 'Medication', label: 'medication' }, { value: 'None', label: 'nothing yet' }])}
        </View>

        <Text style={[styles.deferNote, { color: theme.textSecondary }]}>
          {tx("You can add more detail later in Profile — zero pressure.", "You can add symptom and cyst details in Profile later.")}
        </Text>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: theme.tint, opacity: form.diagnosisStatus ? 1 : 0.5 }]}
          onPress={handleNext}
          disabled={!form.diagnosisStatus}
        >
          <Text style={[styles.nextText, { color: theme.onTint }]}>{tx("Next →", "Continue")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6, minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 16, fontWeight: '600' },
  content: { padding: 24, paddingBottom: 50 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 16 },
  privacyNote: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  privacyText: { fontSize: 13, lineHeight: 19 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, minHeight: 44, justifyContent: 'center' },
  deferNote: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  nextButton: { padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 4 },
  nextText: { fontSize: 18, fontWeight: 'bold' },
});
