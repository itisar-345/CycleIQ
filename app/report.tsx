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
import { useTx } from '@/utils/tone';
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
  const tx = useTx();
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
      const cycles = (await getAllCycles()).filter((c) => c.is_confirmed !== 0); // the onboarding estimate is not a logged period
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
      if (!shared) Alert.alert(tx('report saved 📄', 'Report saved'), tx(`It's in Saved Reports.\n\n${permanentUri}`, `Saved to Saved Reports.\n\n${permanentUri}`));
    } catch (e) {
      console.error('PDF generation failed', e);
      Alert.alert(tx("report didn't work 😕", 'Report failed'), tx("Couldn't make or share the PDF — try again?", 'The PDF could not be created or shared. Please try again.'));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, minWidth: 44, minHeight: 44, justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={tx("Back", "Back")}>
          <IconSymbol name="chevron.left" size={24} color={theme.tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} accessibilityRole="header">{tx("doctor report 🩺", "Doctor report")}</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 40 }}>{tx("putting your report together…", "Preparing report…")}</Text>
        ) : (
          <View>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
               <Text style={[styles.cardTitle, { color: theme.text }]} accessibilityRole="header">{tx("the summary", "Summary")}</Text>
               <Text style={[styles.text, { color: theme.textSecondary }]}>{tx("mode:", "Mode:")} {currentMode === 'standard' ? tx('cycle tracking', 'Cycle tracking') : currentMode.toUpperCase()}</Text>
               <Text style={[styles.text, { color: theme.textSecondary }]}>{tx("cycles logged:", "Cycles logged:")} {data.cyclesCount}</Text>
               <Text style={[styles.text, { color: theme.textSecondary }]}>{tx("average cycle:", "Average cycle length:")} {data.avgLength} days</Text>
               <Text style={[styles.text, { color: theme.textSecondary }]}>{tx("daily logs:", "Daily logs:")} {data.entriesCount}</Text>
            </View>
            
            {(currentMode === 'endo' || currentMode === 'pcos') && (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                 <Text style={[styles.cardTitle, { color: theme.text }]} accessibilityRole="header">{tx("condition tracking", "Condition tracking")}</Text>
                 <Text style={[styles.text, { color: theme.textSecondary }]}>{tx("flare days documented:", "Flare days documented:")} {data.flares}</Text>
                 <Text style={[styles.text, { color: theme.textSecondary, marginTop: 8 }]}>{tx("The PDF is written in proper doctor-speak so your appointment goes smoother 💪", "The PDF is written in clinical language for your healthcare provider.")}</Text>
              </View>
            )}
            
            <TouchableOpacity style={[styles.exportBtn, { backgroundColor: theme.tint }]} onPress={handleExport} accessibilityRole="button">
              <Text style={[styles.exportText, { color: theme.onTint }]}>{tx("export PDF for my doctor", "Export PDF")}</Text>
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
