import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore, PCOSSetup } from '@/store';

export default function PCOSSetupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { setPCOSData } = useAppStore();

  const [form, setForm] = useState<PCOSSetup>({
    diagnosisStatus: '',
    cyclePattern: '',
    comorbidities: [],
    currentManagement: ''
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
            borderColor: theme.pcos, 
            backgroundColor: form[key] === opt ? theme.pcos : 'transparent' 
          }]}
          onPress={() => setForm({ ...form, [key]: opt })}
        >
          <Text style={{ color: form[key] === opt ? '#2A2422' : theme.text, fontWeight: form[key] === opt ? 'bold' : 'normal' }}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const toggleMultiSelect = (key: 'comorbidities', opt: string) => {
    const list = form[key];
    const newArr = list.includes(opt) ? list.filter(i => i !== opt) : [...list, opt];
    setForm({ ...form, [key]: newArr });
  };

  const renderMultiSelect = (key: 'comorbidities', options: string[]) => (
    <View style={styles.buttonGroup}>
      {options.map((opt) => {
        const isSelected = form[key].includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.optionButton, { 
              borderColor: theme.pcos, 
              backgroundColor: isSelected ? theme.pcos : 'transparent' 
            }]}
            onPress={() => toggleMultiSelect(key, opt)}
          >
            <Text style={{ color: isSelected ? '#2A2422' : theme.text, fontWeight: isSelected ? 'bold' : 'normal' }}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>PCOS Setup</Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Diagnosis status</Text>
          {renderSingleSelect('diagnosisStatus', ['Confirmed diagnosis', 'Suspected', 'Self-identified'])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Cycle pattern type</Text>
          {renderSingleSelect('cyclePattern', ['Infrequent (Oligomenorrhoea)', 'Absent (Amenorrhoea)', 'Irregular'])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Known comorbidities</Text>
          <Text style={[styles.desc, { color: theme.textSecondary }]}>Select all that apply</Text>
          {renderMultiSelect('comorbidities', ['Insulin resistance', 'Thyroid issues', 'Anxiety', 'Depression'])}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Current management</Text>
          {renderSingleSelect('currentManagement', ['Hormonal BC', 'Metformin', 'Diet-only', 'None'])}
        </View>

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
  content: { padding: 24, paddingBottom: 50 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  desc: { fontSize: 14, marginBottom: 8, marginTop: -8 },
  buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  nextButton: { padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  nextText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});
