import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { getAllCycles, getAllEntries, getRedFlagPromptLogs } from '@/database';
import { generateSpecialistReportHtml } from '@/utils/reportGenerator';
import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { format } from 'date-fns';

const getDocumentDir = (): string => {
  // expo-file-system v2 uses FileSystem.documentDirectory (string | null)
  return (FileSystem as any).documentDirectory ?? '';
};

export default function ReportScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { currentMode, userName } = useAppStore();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
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
      
      let flares = 0;
      const symptomCounts: Record<string, number> = {};
      
      entries.forEach(e => {
        if (e.flare_start) flares++;
        if (e.extended_symptoms) {
          try {
            const ext = JSON.parse(e.extended_symptoms);
            if (ext.flare && ext.flare.start) flares++;
          } catch(err) {}
        }
      });
      
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
      // Persist to permanent local storage
      const reportsDir = (FileSystem as any).documentDirectory + 'cycleiq_reports/';
      await (FileSystem as any).makeDirectoryAsync(reportsDir, { intermediates: true });
      const fileName = `CycleIQ_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
      const permanentUri = reportsDir + fileName;
      await (FileSystem as any).copyAsync({ from: tempUri, to: permanentUri });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(permanentUri);
      } else {
        Alert.alert('Report saved', `PDF saved to: ${permanentUri}`);
      }
    } catch (e) {
      console.error('PDF generation failed', e);
      Alert.alert('Error', 'Could not generate or share the report.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <IconSymbol name="chevron.left" size={24} color={theme.tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Specialist Report</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 40 }}>Generating report...</Text>
        ) : (
          <View>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
               <Text style={[styles.cardTitle, { color: theme.text }]}>Patient Summary</Text>
               <Text style={[styles.text, { color: theme.textSecondary }]}>Mode: {currentMode.toUpperCase()} Focus</Text>
               <Text style={[styles.text, { color: theme.textSecondary }]}>Total Cycles Logged: {data.cyclesCount}</Text>
               <Text style={[styles.text, { color: theme.textSecondary }]}>Average Cycle Length: {data.avgLength} days</Text>
               <Text style={[styles.text, { color: theme.textSecondary }]}>Total Daily Logs: {data.entriesCount}</Text>
            </View>
            
            {(currentMode === 'endo' || currentMode === 'pcos') && (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                 <Text style={[styles.cardTitle, { color: theme.text }]}>Condition Tracking</Text>
                 <Text style={[styles.text, { color: theme.textSecondary }]}>Documented Flares: {data.flares}</Text>
                 <Text style={[styles.text, { color: theme.textSecondary, marginTop: 8 }]}>*This data is ready to be exported for physician review.*</Text>
              </View>
            )}
            
            <TouchableOpacity style={[styles.exportBtn, { backgroundColor: theme.tint }]} onPress={handleExport}>
              <Text style={styles.exportText}>Export as PDF</Text>
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
  exportText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
