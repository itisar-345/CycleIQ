import { StyleSheet, View, Text, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore, AppMode } from '@/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { currentMode, setMode } = useAppStore();

  const toggleMode = (mode: AppMode) => {
    setMode(mode);
  };

  const ActionRow = ({ title, iconName, color }: { title: string, iconName: string, color: string }) => (
    <TouchableOpacity style={[styles.actionRow, { borderBottomColor: theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconSymbol name={iconName} size={24} color={color} />
        <Text style={[styles.actionText, { color: theme.text }]}>{title}</Text>
      </View>
      <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

        {/* Condition Modes */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Inclusivity & Condition</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Change your focus. Your dashboard and logs will adapt instantly.
          </Text>

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleText, { color: theme.text }]}>Standard</Text>
            <Switch value={currentMode === 'standard'} onValueChange={() => toggleMode('standard')} trackColor={{ true: theme.tint }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleText, { color: theme.text }]}>PCOS Focus</Text>
            <Switch value={currentMode === 'pcos'} onValueChange={() => toggleMode('pcos')} trackColor={{ true: theme.pcos }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleText, { color: theme.text }]}>Endometriosis Focus</Text>
            <Switch value={currentMode === 'endo'} onValueChange={() => toggleMode('endo')} trackColor={{ true: theme.endo }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleText, { color: theme.text }]}>Perimenopause</Text>
            <Switch value={currentMode === 'peri'} onValueChange={() => toggleMode('peri')} trackColor={{ true: theme.peri }} />
          </View>
        </View>

        {/* Utilities & Education */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border, paddingVertical: 8 }]}>
          <ActionRow title="Support & Education Hub" iconName="book.fill" color={theme.info} />
          <ActionRow title="Evidence-Based Pain Management" iconName="heart.fill" color={theme.error} />
          <ActionRow title="Medical & Diagnostic Tools" iconName="stethoscope" color={theme.tint} />
        </View>

        {/* Reports & Export */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border, paddingVertical: 8 }]}>
          <ActionRow title="Doctor-Ready Symptom Report (PDF)" iconName="doc.text.fill" color="#E57373" />
          <ActionRow title="Export Cycle Data (CSV)" iconName="arrow.down.doc.fill" color="#81C784" />
        </View>

        {/* Reminders */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border, paddingVertical: 8 }]}>
          <ActionRow title="Notification & Reminder Settings" iconName="bell.fill" color="#FFB74D" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 24 },
  section: { paddingHorizontal: 20, paddingVertical: 20, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  description: { fontSize: 14, marginBottom: 20 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  toggleText: { fontSize: 16, fontWeight: '500' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  actionText: { fontSize: 16, fontWeight: '500' }
});
