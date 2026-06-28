import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { OnboardingProgress } from '@/components/onboarding-progress';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore, PCOSSetup } from '@/store';

export default function PCODSetupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const accentColor = (theme as any).pcod ?? '#80DEEA';
  const { setPCOSData } = useAppStore();

  const [form, setForm] = useState<PCOSSetup>({
    diagnosisStatus: '',
    cyclePattern: '',
    comorbidities: [],
    currentManagement: '',
  });

  const handleNext = () => {
    setPCOSData(form);
    router.push('/onboarding/consent');
  };

  const renderSingleSelect = (key: keyof PCOSSetup, options: string[]) => (
    <View style={styles.buttonGroup}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.optionButton, {
            borderColor: accentColor,
            backgroundColor: form[key] === opt ? accentColor : 'transparent',
          }]}
          onPress={() => setForm({ ...form, [key]: opt })}
        >
          <Text style={{ color: form[key] === opt ? '#2A2422' : theme.text, fontWeight: form[key] === opt ? 'bold' : 'normal' }}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: accentColor }]}>← Back</Text>
        </TouchableOpacity>
        <OnboardingProgress step={4} total={5} label="Step 4 — Condition details" />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>PCOD Setup</Text>

        <View style={[styles.privacyNote, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
            🔒 Your health data stays on this device. We never store or transmit it.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Diagnosis status</Text>
          {renderSingleSelect('diagnosisStatus', ['Confirmed diagnosis', 'Suspected', 'Self-identified'])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Cycle pattern type</Text>
          {renderSingleSelect('cyclePattern', ['Regular with cysts', 'Irregular', 'Absent (Amenorrhoea)'])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Current management</Text>
          {renderSingleSelect('currentManagement', ['Hormonal BC', 'Lifestyle changes', 'Medication', 'None'])}
        </View>

        <Text style={[styles.deferNote, { color: theme.textSecondary }]}>
          You can add symptoms and cyst detail from your profile after setup.
        </Text>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: theme.tint, opacity: form.diagnosisStatus ? 1 : 0.5 }]}
          onPress={handleNext}
          disabled={!form.diagnosisStatus}
        >
          <Text style={styles.nextText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: '600' },
  content: { padding: 24, paddingBottom: 50 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 16 },
  privacyNote: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  privacyText: { fontSize: 13, lineHeight: 19 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  deferNote: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  nextButton: { padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 4 },
  nextText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
