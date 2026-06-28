import { Colors } from '@/constants/theme';
import { getAllCycles, getAllEntries, getCyclePredictions, getPhaseAverages, getDayOfCycle, getPhaseForDay } from '@/database';
import { differenceInDays, format, parseISO } from "date-fns";
import { useAppStore } from '@/store';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { PredictionResult } from '@/utils/predictions';

type DayData = {
  date: string;
  dayNum: number;
  periodScore: number;
  painScore: number;
  flare: boolean;
  phase: string | null;
  predictionConfidence: number;
  predictionEdgeFade: number;
};

export default function CalendarScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { currentMode, postPillMode, postPillStartDate } = useAppStore();
  const [currentMonthDays, setCurrentMonthDays] = useState<(DayData | null)[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [phaseAverages, setPhaseAverages] = useState<any[]>([]);
  const [entriesByDate, setEntriesByDate] = useState<Record<string, any>>({});
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const isPeriodDay = (dateStr: string, cycle: any): boolean => {
    if (!cycle.start_date) return false;
    const start = new Date(cycle.start_date);
    const end = cycle.end_date ? new Date(cycle.end_date) : null;
    const date = new Date(dateStr);
    if (end) return date >= start && date <= end;
    const daysSince = differenceInDays(date, start);
    return daysSince >= 0 && daysSince <= 7;
  };

  const generateMonth = useCallback((
    y: number,
    m: number,
    loadedCycles: any[],
    loadedEntriesMap: Record<string, any>,
    prediction: PredictionResult | null,
  ) => {
    const days: (DayData | null)[] = [];
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) days.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData: DayData = {
        date: dateStr,
        dayNum: day,
        periodScore: 0,
        painScore: 0,
        flare: false,
        phase: null,
        predictionConfidence: 0,
        predictionEdgeFade: 0,
      };

      loadedCycles.forEach(cycle => {
        if (isPeriodDay(dateStr, cycle)) dayData.periodScore += 1;
        const cycleDay = getDayOfCycle(dateStr, cycle.start_date);
        if (cycleDay > 0) dayData.phase = getPhaseForDay(cycleDay, cycle.cycle_length || 28);
      });

      if (loadedCycles.length > 0 && prediction) {
        if (prediction.windowStartISO && prediction.windowEndISO && prediction.predictedStartISO) {
          const winStart = parseISO(prediction.windowStartISO);
          const winEnd = parseISO(prediction.windowEndISO);
          const center = parseISO(prediction.predictedStartISO);
          const thisDayDate = new Date(dateStr);
          if (thisDayDate >= winStart && thisDayDate <= winEnd) {
            const halfSpan = Math.max(differenceInDays(winEnd, winStart) / 2, 1);
            const distFromCenter = Math.abs(differenceInDays(thisDayDate, center));
            dayData.predictionConfidence = Math.max(0, 1 - distFromCenter / halfSpan);
            dayData.predictionEdgeFade = Math.max(0.12, dayData.predictionConfidence * 0.34);
          }
        }
      }

      const entry = loadedEntriesMap[dateStr];
      if (entry) {
        dayData.painScore = entry.pain_score || 0;
        let isFlare = false;
        if (entry.extended_symptoms) {
          try {
            const ext = JSON.parse(entry.extended_symptoms);
            if (ext.flare && ext.flare.start) isFlare = true;
          } catch { /* ignore */ }
        }
        dayData.flare = isFlare || !!entry.flare_start;
      }

      days.push(dayData);
    }
    setCurrentMonthDays(days);
  }, []);

  const loadCalendar = useCallback(async () => {
    const allCycles = await getAllCycles();

    const allEntries = await getAllEntries();
    const entriesMap: Record<string, any> = {};
    allEntries.forEach(e => {
      const d = e.logged_date.split('T')[0];
      if (!entriesMap[d]) entriesMap[d] = e;
    });
    setEntriesByDate(entriesMap);

    const prediction = await getCyclePredictions(currentMode, postPillMode, postPillStartDate ?? null);
    generateMonth(year, month, allCycles, entriesMap, prediction);
    if (allCycles.length > 0) {
      const avgs = await getPhaseAverages(allCycles[0].id);
      setPhaseAverages(avgs);
    }
  }, [currentMode, postPillMode, postPillStartDate, generateMonth, year, month]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useFocusEffect(
    useCallback(() => {
      loadCalendar();
    }, [loadCalendar]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalendar();
    setRefreshing(false);
  };

  const shiftMonth = (delta: number) => {
    setSelectedDay(null);
    setViewDate(new Date(year, month + delta, 1));
  };

  const selectedEntry = selectedDay ? entriesByDate[selectedDay.date] : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
        }
      >
        <Text style={[styles.title, { color: theme.text }]}>Calendar</Text>

        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} style={[styles.navBtn, { borderColor: theme.border }]}>
            <Text style={{ color: theme.tint, fontWeight: '700' }}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.subtitle, { color: theme.text, marginBottom: 0 }]}>
            {viewDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </Text>
          <TouchableOpacity onPress={() => shiftMonth(1)} style={[styles.navBtn, { borderColor: theme.border }]}>
            <Text style={{ color: theme.tint, fontWeight: '700' }}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(null); }}>
          <Text style={[styles.todayLink, { color: theme.tint }]}>Jump to today</Text>
        </TouchableOpacity>

        <View style={styles.weekdays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={[styles.weekday, { color: theme.textSecondary }]}>{day}</Text>
          ))}
        </View>

        <View style={styles.monthGrid}>
          {currentMonthDays.map((day, i) => {
            const isToday = day?.date === todayStr;
            const isSelected = day?.date === selectedDay?.date;
            return (
              <TouchableOpacity
                key={i}
                style={styles.dayCell}
                onPress={() => day && setSelectedDay(day)}
                activeOpacity={day ? 0.7 : 1}
              >
                {day ? (
                  <View style={[
                    styles.dayContent,
                    isToday && { borderWidth: 2, borderColor: theme.tint },
                    isSelected && { backgroundColor: theme.tint + '25' },
                  ]}>
                    {day.predictionConfidence > 0 && (
                      <View style={styles.predictionLayer}>
                        <View style={[styles.predictionFade, { backgroundColor: theme.tint, opacity: Math.max(day.predictionEdgeFade * 0.35, 0.04) }]} />
                        <View style={[styles.predictionCore, { backgroundColor: theme.tint, opacity: day.predictionEdgeFade }]} />
                        <View style={[styles.predictionFade, { backgroundColor: theme.tint, opacity: Math.max(day.predictionEdgeFade * 0.35, 0.04) }]} />
                      </View>
                    )}
                    <Text style={[styles.dayNum, { color: isToday ? theme.tint : theme.text }]}>{day.dayNum}</Text>
                    {day.periodScore > 0 && <View style={[styles.periodDot, { backgroundColor: '#FF6B9D' }]} />}
                    {day.painScore > 5 && <View style={[styles.painDot, { backgroundColor: '#FF4757' }]} />}
                    {day.flare && <View style={[styles.flareDot, { backgroundColor: '#FF3838' }]} />}
                    {day.phase && <Text style={[styles.phaseLabel, { color: getPhaseColor(day.phase) }]}>{day.phase[0].toUpperCase()}</Text>}
                  </View>
                ) : (
                  <View style={styles.emptyCell} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedDay && (
          <View style={[styles.dayDetail, { backgroundColor: theme.surface, borderColor: theme.tint }]}>
            <Text style={[styles.dayDetailTitle, { color: theme.text }]}>
              {format(parseISO(selectedDay.date), 'EEEE, MMM d')}
            </Text>
            {selectedDay.phase && (
              <Text style={{ color: theme.textSecondary }}>
                Phase: <Text style={{ color: getPhaseColor(selectedDay.phase), fontWeight: '700' }}>{selectedDay.phase}</Text>
              </Text>
            )}
            {selectedEntry ? (
              <View style={styles.detailStats}>
                <Text style={{ color: theme.text }}>Pain: {selectedEntry.pain_score ?? 0}/10</Text>
                <Text style={{ color: theme.text }}>Mood: {selectedEntry.mood_score ?? '—'}/5</Text>
                <Text style={{ color: theme.text }}>Energy: {selectedEntry.energy_score ?? '—'}/10</Text>
              </View>
            ) : (
              <Text style={{ color: theme.textSecondary, marginTop: 8 }}>No symptoms logged this day.</Text>
            )}
            <TouchableOpacity
              style={[styles.logDayBtn, { backgroundColor: theme.tint }]}
              onPress={() => router.push('/log')}
            >
              <Text style={styles.logDayBtnText}>{selectedEntry ? 'Update log' : 'Log this day'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF6B9D' }]} />
            <Text style={{ color: theme.textSecondary }}>Period</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.tint, opacity: 0.5 }]} />
            <Text style={{ color: theme.textSecondary }}>Predicted</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF4757' }]} />
            <Text style={{ color: theme.textSecondary }}>High pain</Text>
          </View>
        </View>

        {phaseAverages.length > 0 && (
          <View style={styles.overlaysSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Phase trends</Text>
            {phaseAverages.map(avg => (
              <View key={avg.phase} style={[styles.avgRow, { backgroundColor: theme.surface }]}>
                <Text style={{ color: theme.text, fontWeight: '600' }}>{avg.phase}</Text>
                <Text style={{ color: theme.textSecondary }}>
                  Mood {avg.mood_avg} · Energy {avg.energy_avg}
                </Text>
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
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold' },
  subtitle: { fontSize: 18, fontWeight: '600', marginBottom: 24, textAlign: 'center', flex: 1 },
  monthNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  navBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  todayLink: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  weekdays: { flexDirection: 'row', marginBottom: 12 },
  weekday: { flex: 1, textAlign: 'center', fontWeight: '600' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', padding: 4 },
  emptyCell: { width: '100%', height: '100%' },
  dayContent: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', borderRadius: 8 },
  dayNum: { fontSize: 16, fontWeight: 'bold', marginBottom: 2, zIndex: 2 },
  periodDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2, zIndex: 2 },
  painDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 2, zIndex: 2 },
  flareDot: { width: 10, height: 10, borderRadius: 5, zIndex: 2 },
  phaseLabel: { fontSize: 10, marginTop: 1, zIndex: 2 },
  predictionLayer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 8, overflow: 'hidden', flexDirection: 'row' },
  predictionFade: { flex: 1 },
  predictionCore: { flex: 2 },
  dayDetail: { marginTop: 20, padding: 18, borderRadius: 16, borderWidth: 2, gap: 8 },
  dayDetailTitle: { fontSize: 18, fontWeight: '700' },
  detailStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  logDayBtn: { marginTop: 8, padding: 12, borderRadius: 12, alignItems: 'center' },
  logDayBtnText: { color: '#FFF', fontWeight: '700' },
  legend: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 24, paddingVertical: 16 },
  legendItem: { alignItems: 'center', gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  overlaysSection: { marginTop: 32 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  avgRow: { padding: 12, borderRadius: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
});
