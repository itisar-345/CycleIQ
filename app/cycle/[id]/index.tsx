import { PHASE_COPY } from '@/constants/copy';
import { Colors } from '@/constants/theme';
import { format } from 'date-fns';
import { getCycle, getCycleEntries, getCyclePhases, getDayOfCycle, getPhaseForDay, type CyclePhase, type CycleRow, type SymptomEntryRow } from '@/database';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CycleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [cycle, setCycle] = useState<CycleRow | null>(null);
  const [entries, setEntries] = useState<SymptomEntryRow[]>([]);
  const [phases, setPhases] = useState<CyclePhase[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const thisCycle = await getCycle(id);
      setCycle(thisCycle);
      if (thisCycle) {
        setEntries(await getCycleEntries(id));
        // The in-progress cycle has no length yet; show phases for a typical 28-day cycle.
        setPhases(getCyclePhases(thisCycle.cycle_length ?? 28));
      }
    };
    load();
  }, [id]);

  if (!cycle) return <Text style={{ color: theme.textSecondary, padding: 20 }}>loading…</Text>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          cycle from {format(new Date(cycle.start_date), "MMM d, yyyy")}
        </Text>
        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>period length</Text>
          <Text style={[styles.value, { color: theme.text }]}>{cycle.period_length ? `${cycle.period_length} days` : 'not logged'}</Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>cycle length</Text>
          <Text style={[styles.value, { color: theme.text }]}>{cycle.cycle_length ? `${cycle.cycle_length} days` : 'still going 🔄'}</Text>
        </View>

        <Text style={[styles.section, { color: theme.text }]}>phases, roughly</Text>
        <View style={styles.phasesRow}>
          {phases.map(phase => (
            <View key={phase.name} style={[styles.phaseBadge, { backgroundColor: phase.color + '20' }]}>
              <Text style={[styles.phaseName, { color: phase.color }]}>{PHASE_COPY[phase.name]?.name ?? phase.name}</Text>
              <Text style={[styles.phaseRange, { color: theme.textSecondary }]}>days {phase.dayRange.join('–')}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.section, { color: theme.text }]}>daily logs ({entries.length})</Text>
        {entries.length === 0 ? (
          <Text style={{ color: theme.textSecondary }}>nothing logged this cycle — that&apos;s okay.</Text>
        ) : (
          entries.map(entry => {
            const day = getDayOfCycle(entry.logged_date, cycle.start_date);
            const phase = getPhaseForDay(day, cycle.cycle_length ?? 28);
            return (
              <View key={entry.id} style={[styles.dayCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.dayHeader, { color: theme.text }]}>day {day} · {PHASE_COPY[phase]?.vibe ?? phase}</Text>
                <View style={styles.symptomRow}>
                  <Text style={{ color: theme.text }}>🔥 {entry.pain_score ?? '—'}</Text>
                  <Text style={{ color: theme.text }}>✨ {entry.mood_score ?? '—'}</Text>
                  <Text style={{ color: theme.text }}>🔋 {entry.energy_score ?? '—'}</Text>
                </View>
                {entry.flow_intensity && <Text style={[styles.periodNote, { color: theme.error }]}>flow: {entry.flow_intensity.toLowerCase()}</Text>}
                {(entry.health_sleep_source || entry.health_activity_source) && (
                  <Text style={[styles.sourceNote, { color: theme.textSecondary }]}>
                    ⌚ synced from {Array.from(new Set([entry.health_sleep_source, entry.health_activity_source].filter(Boolean))).join(" + ")}
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
  periodNote: { fontWeight: '500', marginTop: 4 },
  sourceNote: { fontSize: 12, fontWeight: '600', marginTop: 6 },
});

