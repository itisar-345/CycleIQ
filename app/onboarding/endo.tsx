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
  const { setEndoData } = useAppStore();

  const [form, setForm] = useState<EndoSetup>({
    diagnosisStage: '',
    flareHistory: '',
    painLocations: [],
    currentManagement: ''
  });

  const handleNext = () => {
    setEndoData(form);
    router.push('/onboarding/consent');
  };

  const renderSingleSelect = (key: keyof EndoSetup, options: string[]) => (
    <View style={styles.buttonGroup}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.optionButton, { 
            borderColor: theme.endo, 
            backgroundColor: form[key] === opt ? theme.endo : 'transparent' 
          }]}
          onPress={() => setForm({ ...form, [key]: opt })}
        >
          <Text style={{ color: form[key] === opt ? '#FFF' : theme.text, fontWeight: form[key] === opt ? 'bold' : 'normal' }}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const toggleMultiSelect = (key: 'painLocations', opt: string) => {
    const list = form[key];
    const newArr = list.includes(opt) ? list.filter(i => i !== opt) : [...list, opt];
    setForm({ ...form, [key]: newArr });
  };

  const renderMultiSelect = (key: 'painLocations', options: string[]) => (
    <View style={styles.buttonGroup}>
      {options.map((opt) => {
        const isSelected = form[key].includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.optionButton, { 
              borderColor: theme.endo, 
              backgroundColor: isSelected ? theme.endo : 'transparent' 
            }]}
            onPress={() => toggleMultiSelect(key, opt)}
          >
            <Text style={{ color: isSelected ? '#FFF' : theme.text, fontWeight: isSelected ? 'bold' : 'normal' }}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Endometriosis Setup</Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Diagnosis & stage</Text>
          {renderSingleSelect('diagnosisStage', ['Stage I-II', 'Stage III-IV', 'Suspected', 'Undiagnosed'])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Flare history</Text>
          {renderSingleSelect('flareHistory', ['Cycle-linked', 'Chronic (daily)', 'Unpredictable'])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Pain locations</Text>
          <Text style={[styles.desc, { color: theme.textSecondary }]}>Select defaults for your daily log</Text>
          {renderMultiSelect('painLocations', ['Pelvic', 'Lower back', 'Legs', 'Bowel', 'Bladder', 'Shoulder (referred)'])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Current management</Text>
          {renderSingleSelect('currentManagement', ['Hormonal suppression', 'Excision surgery', 'Pain medication', 'None'])}
        </View>

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
  content: { padding: 24, paddingBottom: 50 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  desc: { fontSize: 14, marginBottom: 8, marginTop: -8 },
  buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  nextButton: { padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  nextText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});
