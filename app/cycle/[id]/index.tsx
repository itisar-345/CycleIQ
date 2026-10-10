import { useCopy } from '@/constants/copy';
import { useTx } from '@/utils/tone';
import { Colors } from '@/constants/theme';
import { format } from 'date-fns';
import { BatteryMedium, Flame, Smile, type LucideIcon } from "@/components/icons";
import { getCycle, getCycleEntries, getCyclePhases, getDayOfCycle, getPhaseForDay, type CyclePhase, type CycleRow, type SymptomEntryRow } from '@/database';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CycleDetail() {
  const tx = useTx();
  const copy = useCopy();
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

  if (!cycle) return <Text style={{ color: theme.textSecondary, padding: 20 }}>{tx("loading…", "Loading…")}</Text>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backHit} accessibilityRole="button">
          <Text style={{ color: theme.tint, fontWeight: '700', fontSize: 16 }}>{tx("‹ back", "‹ Back")}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {tx("cycle from", "Cycle starting")} {format(new Date(cycle.start_date), "MMM d, yyyy")}
        </Text>
        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{tx("period length", "Period length")}</Text>
          <Text style={[styles.value, { color: theme.text }]}>{cycle.period_length ? `${cycle.period_length} days` : tx('not logged', 'Not logged')}</Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{tx("cycle length", "Cycle length")}</Text>
          <Text style={[styles.value, { color: theme.text }]}>{cycle.cycle_length ? `${cycle.cycle_length} days` : tx('still going', 'In progress')}</Text>
        </View>

        <Text style={[styles.section, { color: theme.text }]} accessibilityRole="header">{tx("phases, roughly", "Estimated phases")}</Text>
        <View style={styles.phasesRow}>
          {phases.map(phase => (
            <View key={phase.name} style={[styles.phaseBadge, { backgroundColor: phase.color + '20' }]} accessible accessibilityLabel={`${copy.phases[phase.name]?.name ?? phase.name}: days ${phase.dayRange[0]} to ${phase.dayRange[1]}`}>
              <Text style={[styles.phaseName, { color: theme.text }]}>{copy.phases[phase.name]?.name ?? phase.name}</Text>
              <Text style={[styles.phaseRange, { color: theme.textSecondary }]}>{tx("days", "Days")} {phase.dayRange.join('–')}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.section, { color: theme.text }]} accessibilityRole="header">{tx("daily logs", "Daily logs")} ({entries.length})</Text>
        {entries.length === 0 ? (
          <Text style={{ color: theme.textSecondary }}>{tx("nothing logged this cycle — that's okay.", "No logs for this cycle.")}</Text>
        ) : (
          entries.map(entry => {
            const day = getDayOfCycle(entry.logged_date, cycle.start_date);
            const phase = getPhaseForDay(day, cycle.cycle_length ?? 28);
            return (
              <View key={entry.id} style={[styles.dayCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.dayHeader, { color: theme.text }]} accessibilityRole="header">{tx("day", "Day")} {day} · {copy.phases[phase]?.vibe ?? phase}</Text>
                <View
                  style={styles.symptomRow}
                  accessible
                  accessibilityLabel={`Pain ${entry.pain_score ?? 'not logged'}, mood ${entry.mood_score ?? 'not logged'}, energy ${entry.energy_score ?? 'not logged'}`}
                >
                  {([
                    [Flame, tx("pain", "Pain"), entry.pain_score],
                    [Smile, tx("mood", "Mood"), entry.mood_score],
                    [BatteryMedium, tx("energy", "Energy"), entry.energy_score],
                  ] as [LucideIcon, string, number | null][]).map(([Icon, label, score]) => (
                    <View key={label} style={styles.stat}>
                      <Icon size={16} color={theme.tint} strokeWidth={2.25} />
                      <Text style={{ color: theme.text }}>{label} {score ?? '—'}</Text>
                    </View>
                  ))}
                </View>
                {entry.flow_intensity && <Text style={[styles.periodNote, { color: theme.error }]}>{tx("flow:", "Flow:")} {tx(entry.flow_intensity.toLowerCase(), entry.flow_intensity)}</Text>}
                {(entry.health_sleep_source || entry.health_activity_source) && (
                  <Text style={[styles.sourceNote, { color: theme.textSecondary }]}>
                    {tx("synced from", "From")} {Array.from(new Set([entry.health_sleep_source, entry.health_activity_source].filter(Boolean))).join(" + ")}
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
  backHit: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
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
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  periodNote: { fontWeight: '500', marginTop: 4 },
  sourceNote: { fontSize: 12, fontWeight: '600', marginTop: 6 },
});

