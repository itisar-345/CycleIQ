import { Alert, StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { getAllCycles, getAllEntries, getRedFlagPromptLogs, readExtendedSymptoms, type CycleRow, type RedFlagPromptLogRow, type SymptomEntryRow } from '@/database';
import { generateSpecialistReportHtml } from '@/utils/reportGenerator';
import * as Print from 'expo-print';
import { format } from 'date-fns';
import { savePdfToReports, shareReport } from '@/utils/localReports';

interface ReportData {
  cyclesCount: number;
  avgLength: number;
  entriesCount: number;
  flares: number;
  rawCycles: CycleRow[];
  rawEntries: SymptomEntryRow[];
  redFlagPromptLogs: RedFlagPromptLogRow[];
}

export default function ReportScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { currentMode } = useAppStore();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData>({
    cyclesCount: 0,
    avgLength: 0,
    entriesCount: 0,
    flares: 0,
    rawCycles: [],
    rawEntries: [],
    redFlagPromptLogs: []
  });

  useEffect(() => {
    const loadReportData = async () => {
      const cycles = await getAllCycles();
      const entries = await getAllEntries();
      const redFlagPromptLogs = await getRedFlagPromptLogs();
      
      let totalLength = 0;
      let validCycles = 0;
      cycles.forEach(c => {
        if (c.cycle_length) {
          totalLength += c.cycle_length;
          validCycles++;
        }
      });
      
      // A flare-day entry carries both flare_start and extended.flare — count it once.
      const flares = entries.filter((e) => e.flare_start || readExtendedSymptoms(e).flare?.start).length;
      
      setData({
        cyclesCount: validCycles,
        avgLength: validCycles > 0 ? Math.round(totalLength / validCycles) : 0,
        flares,
        entriesCount: entries.length,
        rawCycles: cycles,
        rawEntries: entries,
        redFlagPromptLogs
      });
      
      setLoading(false);
    };
    loadReportData();
  }, []);

  const handleExport = async () => {
    try {
      const html = generateSpecialistReportHtml(data.rawCycles, data.rawEntries, currentMode, data.redFlagPromptLogs);
      const { uri: tempUri } = await Print.printToFileAsync({ html });
      const fileName = `CycleIQ_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
      const permanentUri = await savePdfToReports(tempUri, fileName);
      const shared = await shareReport(permanentUri);
      if (!shared) Alert.alert('report saved 📄', `It's in Saved Reports.\n\n${permanentUri}`);
    } catch (e) {
      console.error('PDF generation failed', e);
      Alert.alert('report didn\'t work 😕', 'Couldn\'t make or share the PDF — try again?');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <IconSymbol name="chevron.left" size={24} color={theme.tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>doctor report 🩺</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 40 }}>putting your report together…</Text>
        ) : (
          <View>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
               <Text style={[styles.cardTitle, { color: theme.text }]}>the summary</Text>
               <Text style={[styles.text, { color: theme.textSecondary }]}>mode: {currentMode === 'standard' ? 'cycle tracking' : currentMode.toUpperCase()}</Text>
               <Text style={[styles.text, { color: theme.textSecondary }]}>cycles logged: {data.cyclesCount}</Text>
               <Text style={[styles.text, { color: theme.textSecondary }]}>average cycle: {data.avgLength} days</Text>
               <Text style={[styles.text, { color: theme.textSecondary }]}>daily logs: {data.entriesCount}</Text>
            </View>
            
            {(currentMode === 'endo' || currentMode === 'pcos') && (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                 <Text style={[styles.cardTitle, { color: theme.text }]}>condition tracking</Text>
                 <Text style={[styles.text, { color: theme.textSecondary }]}>flare days documented: {data.flares}</Text>
                 <Text style={[styles.text, { color: theme.textSecondary, marginTop: 8 }]}>The PDF is written in proper doctor-speak so your appointment goes smoother 💪</Text>
              </View>
            )}
            
            <TouchableOpacity style={[styles.exportBtn, { backgroundColor: theme.tint }]} onPress={handleExport}>
              <Text style={[styles.exportText, { color: theme.onTint }]}>export PDF for my doctor</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  text: { fontSize: 14, marginBottom: 4 },
  exportBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  exportText: { fontWeight: 'bold', fontSize: 16 }
});
