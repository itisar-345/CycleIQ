import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { OnboardingProgress } from '@/components/onboarding-progress';
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

  const renderSingleSelect = (key: keyof EndoSetup, options: { value: string; label: string }[]) => (
    <View style={styles.buttonGroup}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.optionButton, {
            borderColor: theme.endo,
            backgroundColor: form[key] === opt.value ? theme.endo : 'transparent',
          }]}
          onPress={() => setForm({ ...form, [key]: opt.value })}
        >
          <Text style={{ color: form[key] === opt.value ? theme.onAccent : theme.text, fontWeight: form[key] === opt.value ? 'bold' : 'normal' }}>
            {opt.label}
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
        <OnboardingProgress step={4} total={5} label="step 4 · a few details" />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Let&apos;s set up endo mode 💜</Text>

        <View style={[styles.privacyNote, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
            🔒 This stays on your phone. We never see it — we literally can&apos;t.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Where are you at with a diagnosis?</Text>
          {renderSingleSelect('diagnosisStage', [{ value: 'Stage I-II', label: 'stage I–II' }, { value: 'Stage III-IV', label: 'stage III–IV' }, { value: 'Suspected', label: 'suspected' }, { value: 'Undiagnosed', label: 'no diagnosis yet' }])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Managing it with anything right now?</Text>
          {renderSingleSelect('currentManagement', [{ value: 'Hormonal suppression', label: 'hormonal treatment' }, { value: 'Excision surgery', label: 'had excision surgery' }, { value: 'Pain medication', label: 'pain meds' }, { value: 'None', label: 'nothing yet' }])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>In a flare right now?</Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>A flare = pain or symptoms ramping up, period or not. We&apos;ll keep logging extra short while it lasts.</Text>
          <View style={styles.buttonGroup}>
            {([['yep, flaring 😮‍💨', true], ['nope, all good', false]] as const).map(([label, val]) => (
              <TouchableOpacity
                key={label}
                style={[styles.optionButton, {
                  borderColor: theme.endo,
                  backgroundColor: form.currentlyInFlare === val ? theme.endo : 'transparent',
                }]}
                onPress={() => setForm({ ...form, currentlyInFlare: val })}
              >
                <Text style={{ color: form.currentlyInFlare === val ? theme.onAccent : theme.text, fontWeight: form.currentlyInFlare === val ? 'bold' : 'normal' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.deferNote, { color: theme.textSecondary }]}>
          You can add more detail later in Profile — zero pressure.
        </Text>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: theme.tint, opacity: form.diagnosisStage ? 1 : 0.5 }]}
          onPress={handleNext}
          disabled={!form.diagnosisStage}
        >
          <Text style={[styles.nextText, { color: theme.onTint }]}>Next →</Text>
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
  optionButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  hint: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  deferNote: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  nextButton: { padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 4 },
  nextText: { fontSize: 18, fontWeight: 'bold' },
});
