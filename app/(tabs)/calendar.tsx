import { Colors } from '@/constants/theme';
import { getAllCycles, getAllEntries, getCyclePhases, getPhaseAverages, getDayOfCycle, getPhaseForDay } from '@/database';
import { differenceInDays, parseISO } from "date-fns";
import { useAppStore } from '@/store';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { runPredictionEngine } from '@/utils/predictions';

export default function CalendarScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { currentMode, postPillMode, postPillStartDate } = useAppStore();
  const [cycles, setCycles] = useState<any[]>([]);
  const [currentMonthDays, setCurrentMonthDays] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [phaseAverages, setPhaseAverages] = useState<any[]>([]);
  const [entriesByDate, setEntriesByDate] = useState<Record<string, any>>({});

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  useEffect(() => {
    const load = async () => {
      const allCycles = await getAllCycles();
      setCycles(allCycles);
      
      const allEntries = await getAllEntries();
      const entriesMap: Record<string, any> = {};
      allEntries.forEach(e => {
        const d = e.logged_date.split('T')[0];
        // Merge or take latest per day
        if (!entriesMap[d]) entriesMap[d] = e;
      });
      setEntriesByDate(entriesMap);
      
      generateMonth(year, month, allCycles, entriesMap);
      if (allCycles.length > 0) {
        const avgs = await getPhaseAverages(allCycles[0].id);
        setPhaseAverages(avgs);
      }
    };
    load();
  }, []);

  // Reload when screen comes back into focus (e.g. after cycle edit)
  useFocusEffect(
    useCallback(() => {
      const reload = async () => {
        const allCycles = await getAllCycles();
        setCycles(allCycles);
        const allEntries = await getAllEntries();
        const entriesMap: Record<string, any> = {};
        allEntries.forEach(e => {
          const d = e.logged_date.split('T')[0];
          if (!entriesMap[d]) entriesMap[d] = e;
        });
        setEntriesByDate(entriesMap);
        generateMonth(year, month, allCycles, entriesMap);
        if (allCycles.length > 0) {
          const avgs = await getPhaseAverages(allCycles[0].id);
          setPhaseAverages(avgs);
        }
      };
      reload();
    }, [])
  );

  const generateMonth = (y: number, m: number, loadedCycles: any[], loadedEntriesMap: Record<string, any>) => {
    const days = [];
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    // Empty cells
    for (let i = 0; i < firstDay; i++) days.push(null);

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = {
        date: dateStr,
        dayNum: day,
        periodScore: 0,
        painScore: 0,
        flare: false,
        phase: null as string | null,
        predictionConfidence: 0
      };

      // Check periods
      loadedCycles.forEach(cycle => {
        if (isPeriodDay(dateStr, cycle)) dayData.periodScore += 1;
        const cycleDay = getDayOfCycle(dateStr, cycle.start_date);
        if (cycleDay > 0) dayData.phase = getPhaseForDay(cycleDay, cycle.cycle_length || 28);
      });

      // Prediction window — use engine's ISO window dates directly
      if (loadedCycles.length > 0) {
        const prediction = runPredictionEngine({
          cycles: loadedCycles,
          currentMode,
          postPillMode,
          postPillStartDate: postPillStartDate ?? null,
        });
        if (prediction.windowStartISO && prediction.windowEndISO && prediction.predictedStartISO) {
          const winStart = parseISO(prediction.windowStartISO);
          const winEnd = parseISO(prediction.windowEndISO);
          const center = parseISO(prediction.predictedStartISO);
          const thisDayDate = new Date(dateStr);
          if (thisDayDate >= winStart && thisDayDate <= winEnd) {
            const halfSpan = Math.max(differenceInDays(winEnd, winStart) / 2, 1);
            const distFromCenter = Math.abs(differenceInDays(thisDayDate, center));
            dayData.predictionConfidence = Math.max(0, 1 - distFromCenter / halfSpan);
          }
        }
      }

      // Use real entry data
      const entry = loadedEntriesMap[dateStr];
      if (entry) {
        dayData.painScore = entry.pain_score || 0;
        
        let isFlare = false;
        if (entry.extended_symptoms) {
          try {
            const ext = JSON.parse(entry.extended_symptoms);
            if (ext.flare && ext.flare.start) {
              isFlare = true;
            }
          } catch (e) {}
        }
        dayData.flare = isFlare || !!entry.flare_start;
      }

      days.push(dayData);
    }
    setCurrentMonthDays(days);
  };

  const isPeriodDay = (dateStr: string, cycle: any): boolean => {
    if (!cycle.start_date || !cycle.end_date) return false;
    const start = new Date(cycle.start_date);
    const end = new Date(cycle.end_date);
    const date = new Date(dateStr);
    return date >= start && date <= end;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Calendar</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{today.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</Text>

        {/* Month Grid */}
        <View style={styles.weekdays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={[styles.weekday, { color: theme.textSecondary }]}>{day}</Text>
          ))}
        </View>

        <View style={styles.monthGrid}>
          {currentMonthDays.map((day, i) => (
            <TouchableOpacity key={i} style={styles.dayCell} onPress={() => day && setSelectedCycle(day)}>
              {day ? (
                <View style={styles.dayContent}>
                  <Text style={[styles.dayNum, { color: theme.text }]}>{day.dayNum}</Text>
                  {day.periodScore > 0 && <View style={[styles.periodDot, { backgroundColor: '#FF6B9D' }]} />}
                  {day.painScore > 5 && <View style={[styles.painDot, { backgroundColor: '#FF4757' }]} />}
                  {day.flare && <View style={[styles.flareDot, { backgroundColor: '#FF3838' }]} />}
                  {day.phase && <Text style={[styles.phaseLabel, { color: getPhaseColor(day.phase) }]}>{day.phase[0].toUpperCase()}</Text>}
                  {day.predictionConfidence > 0 && <View style={[styles.predictionBg, { backgroundColor: theme.tint, opacity: day.predictionConfidence * 0.3 }]} />}
                </View>
              ) : (
                <View style={styles.emptyCell} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF6B9D' }]} />
            <Text style={{ color: theme.textSecondary }}>Period</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF4757' }]} />
            <Text style={{ color: theme.textSecondary }}>High Pain</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF3838' }]} />
            <Text style={{ color: theme.textSecondary }}>Flare (Endo)</Text>
          </View>
        </View>

        {/* Phase Averages Sec 4 */}
        {phaseAverages.length > 0 && (
          <View style={styles.overlaysSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Phase Trends</Text>
            {phaseAverages.map(avg => (
              <View key={avg.phase} style={styles.avgRow}>
                <Text style={{ color: theme.text, fontWeight: '600' }}>{avg.phase}</Text>
                <Text>Mood: {avg.mood_avg} | Energy: {avg.energy_avg} | Fog: {avg.brain_fog_avg}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getPhaseColor = (phase: string) => {
  const phases = {
    menstrual: '#FF6B9D',
    follicular: '#4ECDC4',
    ovulatory: '#45B7D1',
    luteal: '#F7DC6F'
  };
  return phases[phase as keyof typeof phases] || '#666';
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginBottom: 24 },
  weekdays: { flexDirection: 'row', marginBottom: 12 },
  weekday: { flex: 1, textAlign: 'center', fontWeight: '600' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', padding: 4 },
  emptyCell: { width: '100%', height: '100%' },
  dayContent: { alignItems: 'center' },
  dayNum: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  periodDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  painDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 2 },
  flareDot: { width: 10, height: 10, borderRadius: 5 },
  phaseLabel: { fontSize: 10, marginTop: 1, zIndex: 2 },
  predictionBg: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 8, zIndex: 0 },
  legend: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 24, paddingVertical: 16 },
  legendItem: { alignItems: 'center', gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  overlaysSection: { marginTop: 32 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  avgRow: { padding: 12, backgroundColor: '#F8F9FA', borderRadius: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }
});

