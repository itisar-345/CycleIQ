import { Colors } from '@/constants/theme';
import { getAllCycles, getCycleEntries, getCyclePhases, getDayOfCycle, getPhaseForDay } from '@/database';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CycleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [cycle, setCycle] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      // Fetch cycle from DB (reuse getAllCycles filter or add getCycle)
        const allCycles = await getAllCycles(); // Temp
        const thisCycle = allCycles.find((c: any) => c.id === id);
        setCycle(thisCycle);
      if (thisCycle) {
        const cycleEntries = await getCycleEntries(id as string);
        setEntries(cycleEntries);
        setPhases(getCyclePhases(thisCycle.cycle_length));
      }
    };
    load();
  }, [id]);

  if (!cycle) return <Text>Loading...</Text>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          Cycle {new Date(cycle.start_date).toLocaleDateString()}
        </Text>
        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Period Length</Text>
          <Text style={[styles.value, { color: theme.text }]}>{cycle.period_length || '—'} days</Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Cycle Length</Text>
          <Text style={[styles.value, { color: theme.text }]}>{cycle.cycle_length || '—'} days</Text>
        </View>

        <Text style={[styles.section, { color: theme.text }]}>Phases Overview</Text>
        <View style={styles.phasesRow}>
          {phases.map(phase => (
            <View key={phase.name} style={[styles.phaseBadge, { backgroundColor: phase.color + '20' }]}>
              <Text style={[styles.phaseName, { color: phase.color }]}>{phase.name}</Text>
              <Text style={styles.phaseRange}>{phase.dayRange.join('-')}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.section, { color: theme.text }]}>Daily Symptoms ({entries.length} days)</Text>
        {entries.length === 0 ? (
          <Text style={{ color: theme.textSecondary }}>No symptoms logged for this cycle.</Text>
        ) : (
          entries.map(entry => {
            const day = getDayOfCycle(entry.logged_date, cycle.start_date);
            const phase = getPhaseForDay(day, cycle.cycle_length);
            return (
              <View key={entry.id} style={[styles.dayCard, { backgroundColor: theme.surface }]}>
                <Text style={styles.dayHeader}>Day {day} ({phase})</Text>
                <View style={styles.symptomRow}>
                  <Text>Pain: {entry.pain_score || '—'}</Text>
                  <Text>Mood: {entry.mood_score || '—'}</Text>
                  <Text>Energy: {entry.energy_score || '—'}</Text>
                </View>
                {entry.flow_intensity && <Text style={styles.periodNote}>Flow: {entry.flow_intensity}</Text>}
                {(entry.health_sleep_source || entry.health_activity_source) && (
                  <Text style={styles.sourceNote}>
                    Auto-filled from {Array.from(new Set([entry.health_sleep_source, entry.health_activity_source].filter(Boolean))).join(" + ")}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  infoCard: { padding: 20, borderRadius: 16, marginBottom: 24, gap: 8 },
  label: { fontSize: 14 },
  value: { fontSize: 24, fontWeight: 'bold' },
  section: { fontSize: 20, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  phasesRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  phaseBadge: { padding: 12, borderRadius: 12, alignItems: 'center', minWidth: 70 },
  phaseName: { fontWeight: 'bold', fontSize: 14 },
  phaseRange: { fontSize: 12, opacity: 0.8 },
  dayCard: { padding: 16, borderRadius: 12, marginBottom: 12 },
  dayHeader: { fontWeight: 'bold', marginBottom: 8 },
  symptomRow: { flexDirection: 'row', gap: 20, marginBottom: 4 },
  periodNote: { color: '#FF6B9D', fontWeight: '500', marginTop: 4 },
  sourceNote: { color: '#6B7280', fontSize: 12, fontWeight: '600', marginTop: 6 },
});

