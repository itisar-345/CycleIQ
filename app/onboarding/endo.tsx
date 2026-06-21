import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore, EndoSetup } from '@/store';

export default function EndoSetupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { setEndoData, setInFlare } = useAppStore();

  const [form, setForm] = useState<EndoSetup>({
    diagnosisStage: '',
    flareHistory: '',
    painLocations: [],
    currentManagement: '',
    currentlyInFlare: false,
  });

  const handleNext = () => {
    setEndoData(form);
    if (form.currentlyInFlare) setInFlare(true);
    router.push('/onboarding/consent');
  };

  const renderSingleSelect = (key: keyof EndoSetup, options: string[]) => (
    <View style={styles.buttonGroup}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.optionButton, {
            borderColor: theme.endo,
            backgroundColor: form[key] === opt ? theme.endo : 'transparent',
          }]}
          onPress={() => setForm({ ...form, [key]: opt })}
        >
          <Text style={{ color: form[key] === opt ? '#FFF' : theme.text, fontWeight: form[key] === opt ? 'bold' : 'normal' }}>
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
          <Text style={[styles.backText, { color: theme.endo }]}>← Back</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Endometriosis Setup</Text>

        <View style={[styles.privacyNote, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
            🔒 Your health data stays on this device. We never store or transmit it.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Diagnosis & stage</Text>
          {renderSingleSelect('diagnosisStage', ['Stage I-II', 'Stage III-IV', 'Suspected', 'Undiagnosed'])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Current management</Text>
          {renderSingleSelect('currentManagement', ['Hormonal suppression', 'Excision surgery', 'Pain medication', 'None'])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Are you currently in a flare?</Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>A flare is a period of intensified pain or symptoms, with or without menstruation.</Text>
          <View style={styles.buttonGroup}>
            {([['Yes', true], ['No', false]] as const).map(([label, val]) => (
              <TouchableOpacity
                key={label}
                style={[styles.optionButton, {
                  borderColor: theme.endo,
                  backgroundColor: form.currentlyInFlare === val ? theme.endo : 'transparent',
                }]}
                onPress={() => setForm({ ...form, currentlyInFlare: val })}
              >
                <Text style={{ color: form.currentlyInFlare === val ? '#FFF' : theme.text, fontWeight: form.currentlyInFlare === val ? 'bold' : 'normal' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.deferNote, { color: theme.textSecondary }]}>
          You can add pain locations and flare history from your profile after setup.
        </Text>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: theme.tint, opacity: form.diagnosisStage ? 1 : 0.5 }]}
          onPress={handleNext}
          disabled={!form.diagnosisStage}
        >
          <Text style={styles.nextText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { paddingHorizontal: 16, paddingTop: 8 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: '600' },
  content: { padding: 24, paddingBottom: 50 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 16 },
  privacyNote: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  privacyText: { fontSize: 13, lineHeight: 19 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  hint: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  deferNote: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  nextButton: { padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 4 },
  nextText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
