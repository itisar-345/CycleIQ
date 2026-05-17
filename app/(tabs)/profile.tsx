import { Alert, Platform, StyleSheet, View, Text, Switch, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore, AppMode } from '@/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { differenceInDays, parseISO } from 'date-fns';
import { scheduleDailyLogReminder } from '@/utils/notifications';
import { isHealthBridgeAvailable, requestHealthPermissions } from '@/utils/healthIntegrations';
import { getDatabaseEncryptionStatus } from '@/database';
import { useEffect, useState } from 'react';
import { exportAndShareDatabaseFileBackup, exportAndShareLocalData, restoreLocalDataBackupFromUri, wipeLocalDataAndFiles } from '@/utils/privacyData';
import * as DocumentPicker from 'expo-document-picker';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const {
    currentMode, setMode,
    notificationPrefs, setNotificationPrefs,
    healthImportPrefs, setHealthImportPrefs,
    languagePreset, setLanguagePreset,
    customTerms, setCustomTerms,
    postPillMode, postPillStartDate,
  } = useAppStore();
  const [databaseEncryption, setDatabaseEncryption] = useState<{
    keyApplied: boolean;
    sqlCipherAvailable: boolean;
    cipherVersion: string | null;
  } | null>(null);
  const [privacyActionInProgress, setPrivacyActionInProgress] = useState(false);

  useEffect(() => {
    getDatabaseEncryptionStatus()
      .then(setDatabaseEncryption)
      .catch(() => setDatabaseEncryption(null));
  }, []);

  const toggleMode = (mode: AppMode) => setMode(mode);

  // Post-pill progress (0–90 days)
  const postPillProgress = (() => {
    if (!postPillMode || !postPillStartDate) return null;
    const days = differenceInDays(new Date(), parseISO(postPillStartDate));
    return Math.min(days, 90);
  })();

  const ActionRow = ({ title, iconName, color, onPress }: { title: string; iconName: string; color: string; onPress?: () => void }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.actionRow, { borderBottomColor: theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconSymbol name={iconName as any} size={24} color={color} />
        <Text style={[styles.actionText, { color: theme.text }]}>{title}</Text>
      </View>
      <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  const handleDailyHourChange = async (delta: number) => {
    const newHour = Math.max(8, Math.min(21, (notificationPrefs.dailyLogHour ?? 20) + delta));
    setNotificationPrefs({ dailyLogHour: newHour });
    await scheduleDailyLogReminder(notificationPrefs.dailyLog, newHour);
  };

  const handleHealthToggle = async (key: keyof typeof healthImportPrefs, value: boolean) => {
    const nextPrefs = { ...healthImportPrefs, [key]: value };
    setHealthImportPrefs({ [key]: value });
    if (!value) return;
    const granted = await requestHealthPermissions(nextPrefs);
    if (!granted && !isHealthBridgeAvailable()) {
      Alert.alert(
        "Health integration unavailable",
        "This build needs the CycleIQ native health bridge to read Apple Health or Health Connect data. Your opt-in preference was saved and will work in a native build that includes it.",
      );
    }
  };

  const handleExportLocalData = async (format: 'json' | 'csv') => {
    try {
      setPrivacyActionInProgress(true);
      const uri = await exportAndShareLocalData(format);
      Alert.alert("Export ready", `Your ${format.toUpperCase()} export was saved locally and shared only if you chose a destination.\n\n${uri}`);
    } catch (error) {
      console.error("Local data export failed", error);
      Alert.alert("Export failed", "CycleIQ could not create your local data export. Please try again.");
    } finally {
      setPrivacyActionInProgress(false);
    }
  };

  const handleDatabaseBackup = async () => {
    try {
      setPrivacyActionInProgress(true);
      const uri = await exportAndShareDatabaseFileBackup();
      Alert.alert("Database backup ready", `Your SQLite database backup was saved locally and shared only if you chose a destination.\n\n${uri}`);
    } catch (error) {
      console.error("Database backup failed", error);
      Alert.alert("Backup failed", "CycleIQ could not create a database-file backup in this build.");
    } finally {
      setPrivacyActionInProgress(false);
    }
  };

  const confirmDeleteLocalData = () => {
    Alert.alert(
      "Delete local data?",
      "This removes CycleIQ's local SQLite data and generated files on this device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setPrivacyActionInProgress(true);
              await wipeLocalDataAndFiles();
              Alert.alert("Local data deleted", "Your CycleIQ database records and generated files were removed from this device.");
            } catch (error) {
              console.error("Local data wipe failed", error);
              Alert.alert("Delete failed", "CycleIQ could not delete all local data. Please try again.");
            } finally {
              setPrivacyActionInProgress(false);
            }
          },
        },
      ],
    );
  };

  const handleRestoreBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      Alert.alert(
        "Restore backup?",
        "This replaces all current local data with the selected backup. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "destructive",
            onPress: async () => {
              try {
                setPrivacyActionInProgress(true);
                await restoreLocalDataBackupFromUri(result.assets[0].uri);
                Alert.alert("Restore complete", "Your backup has been restored. Restart the app to see your data.");
              } catch (e) {
                Alert.alert("Restore failed", "The selected file could not be restored. Make sure it is a valid CycleIQ JSON backup.");
              } finally {
                setPrivacyActionInProgress(false);
              }
            },
          },
        ],
      );
    } catch {
      Alert.alert("File picker error", "Could not open the file picker. Please try again.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

        {/* Post-pill progress bar */}
        {postPillMode && postPillProgress !== null && (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Post-Pill Baseline Building</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              Day {postPillProgress} of 90 — predictions unlock after your hormones rebalance.
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <View style={[styles.progressFill, { backgroundColor: theme.tint, width: `${(postPillProgress / 90) * 100}%` as any }]} />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
              {90 - postPillProgress} days remaining
            </Text>
          </View>
        )}

        {/* Condition Modes */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Condition & Mode</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Your dashboard and logs adapt instantly.
          </Text>
          {(['standard', 'pcos', 'endo', 'peri'] as AppMode[]).map((mode) => (
            <View key={mode} style={styles.toggleRow}>
              <Text style={[styles.toggleText, { color: theme.text }]}>
                {({ standard: 'Standard', pcos: 'PCOS Focus', endo: 'Endometriosis Focus', peri: 'Perimenopause' } as Record<string, string>)[mode]}
              </Text>
              <Switch
                value={currentMode === mode}
                onValueChange={() => toggleMode(mode)}
                trackColor={{ true: (theme as any)[mode] || theme.tint }}
              />
            </View>
          ))}
        </View>

        {/* Language & Terminology */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Language & Terminology</Text>
          {(['default', 'inclusive', 'custom'] as const).map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[styles.presetRow, { borderColor: languagePreset === preset ? theme.tint : theme.border }]}
              onPress={() => setLanguagePreset(preset)}
            >
              <Text style={{ color: languagePreset === preset ? theme.tint : theme.text, fontWeight: languagePreset === preset ? 'bold' : 'normal' }}>
                {{ default: 'Default', inclusive: 'Gender-neutral', custom: 'Custom' }[preset]}
              </Text>
            </TouchableOpacity>
          ))}

          {languagePreset === 'custom' && (
            <View style={{ marginTop: 12, gap: 8 }}>
              {(['cycle', 'flow', 'body'] as const).map((field) => (
                <View key={field}>
                  <Text style={[styles.description, { color: theme.textSecondary }]}>
                    Term for &quot;{field}&quot;
                  </Text>
                  <TextInput
                    style={[styles.termInput, { borderColor: theme.border, color: theme.text }]}
                    value={customTerms[field]}
                    onChangeText={(val) => setCustomTerms({ [field]: val })}
                    placeholder={field}
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Notifications */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications & Reminders</Text>

          {[
            { key: 'period',           label: '🩸 Period Reminders' },
            { key: 'dailyLog',         label: 'Daily Log Reminder' },
            { key: 'padReminder',      label: '🛍️ Stock Up on Pads (5 days before)' },
            { key: 'hydrationNudge',   label: '💧 Hydration Nudge (3 days before)' },
            { key: 'ironFoodReminder', label: '🥩 Anti-Inflam Food Tips (2 days before)' },
            { key: 'heatPadReminder',  label: '🔥 Heat Pad Reminder (predicted Day 1)' },
            { key: 'periodDayTips',    label: '🌸 Period Day Tips (Days 1–5, AM & PM)' },
            { key: 'moodCheckIn',      label: '💭 PMS Mood Check-In (Luteal phase)' },
            { key: 'insights',         label: '✨ Predictive Insights' },
            { key: 'ovulation',        label: '🌸 Ovulation Window' },
            { key: 'flares',           label: '💜 Flare & Symptom Warnings' },
            ...(currentMode === 'endo' ? [{ key: 'endoDayTips', label: '💜 Endo Full-Cycle Tips (Days 1–5 + Recovery)' }] : []),
            ...(currentMode === 'pcos' ? [{ key: 'pcosNotifications', label: '💚 PCOS Cycle Notifications' }] : []),
          ].map(({ key, label }) => (
            <View key={key} style={styles.toggleRow}>
              <Text style={[styles.toggleText, { color: theme.text }]}>{label}</Text>
              <Switch
                value={!!(notificationPrefs as any)[key]}
                onValueChange={(val) => setNotificationPrefs({ [key]: val } as any)}
                trackColor={{ true: theme.tint }}
              />
            </View>
          ))}

          {/* Daily log reminder time */}
          <View style={[styles.toggleRow, { marginTop: 8 }]}>
            <Text style={[styles.toggleText, { color: theme.text }]}>Daily reminder time</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => handleDailyHourChange(-1)} style={[styles.adjBtn, { borderColor: theme.tint }]}>
                <Text style={{ color: theme.tint }}>−</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.text, fontWeight: 'bold', minWidth: 40, textAlign: 'center' }}>
                {String(notificationPrefs.dailyLogHour ?? 20).padStart(2, '0')}:00
              </Text>
              <TouchableOpacity onPress={() => handleDailyHourChange(1)} style={[styles.adjBtn, { borderColor: theme.tint }]}>
                <Text style={{ color: theme.tint }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quiet hours */}
          <Text style={[styles.description, { color: theme.textSecondary, marginTop: 12 }]}>
            Quiet hours (no notifications sent)
          </Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            {(['quietHoursStart', 'quietHoursEnd'] as const).map((field) => (
              <View key={field} style={{ flex: 1 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                  {field === 'quietHoursStart' ? 'From' : 'Until'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setNotificationPrefs({ [field]: Math.max(0, (notificationPrefs[field] ?? (field === 'quietHoursStart' ? 22 : 8)) - 1) } as any)}
                    style={[styles.adjBtn, { borderColor: theme.border }]}
                  >
                    <Text style={{ color: theme.text }}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ color: theme.text, fontWeight: 'bold', minWidth: 36, textAlign: 'center' }}>
                    {String(notificationPrefs[field] ?? (field === 'quietHoursStart' ? 22 : 8)).padStart(2, '0')}:00
                  </Text>
                  <TouchableOpacity
                    onPress={() => setNotificationPrefs({ [field]: Math.min(23, (notificationPrefs[field] ?? (field === 'quietHoursStart' ? 22 : 8)) + 1) } as any)}
                    style={[styles.adjBtn, { borderColor: theme.border }]}
                  >
                    <Text style={{ color: theme.text }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Health Data Import</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Read-only, opt-in auto-fill for sleep, steps, and activity.
          </Text>
          {Platform.OS === 'ios' ? (
            <>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleText, { color: theme.text }]}>Apple Health sleep</Text>
                <Switch
                  value={healthImportPrefs.appleHealthSleep}
                  onValueChange={(val) => handleHealthToggle('appleHealthSleep', val)}
                  trackColor={{ true: theme.tint }}
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleText, { color: theme.text }]}>Apple Health steps & activity</Text>
                <Switch
                  value={healthImportPrefs.appleHealthActivity}
                  onValueChange={(val) => handleHealthToggle('appleHealthActivity', val)}
                  trackColor={{ true: theme.tint }}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleText, { color: theme.text }]}>Health Connect sleep</Text>
                <Switch
                  value={healthImportPrefs.healthConnectSleep}
                  onValueChange={(val) => handleHealthToggle('healthConnectSleep', val)}
                  trackColor={{ true: theme.tint }}
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleText, { color: theme.text }]}>Health Connect steps & activity</Text>
                <Switch
                  value={healthImportPrefs.healthConnectActivity}
                  onValueChange={(val) => handleHealthToggle('healthConnectActivity', val)}
                  trackColor={{ true: theme.tint }}
                />
              </View>
            </>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Protection</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Sensitive notes use AES-256-GCM with a SecureStore-backed key.
          </Text>
          <Text style={[styles.description, { color: databaseEncryption?.sqlCipherAvailable ? theme.tint : theme.error }]}>
            SQLite database encryption: {databaseEncryption?.sqlCipherAvailable
              ? `SQLCipher active${databaseEncryption.cipherVersion ? ` (${databaseEncryption.cipherVersion})` : ""}`
              : "Native SQLCipher support not available in this build"}
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            No analytics or third-party crash reporting SDKs are bundled in this app build.
          </Text>
        </View>

        {/* Reports & Export */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border, paddingVertical: 8 }]}>
          <ActionRow onPress={() => router.push('/privacy' as any)} title="Plain-Language Privacy Policy" iconName="lock.shield.fill" color="#4DB6AC" />
          <ActionRow onPress={() => router.push('/report' as any)} title="Doctor-Ready Symptom Report" iconName="doc.text.fill" color="#E57373" />
          <ActionRow onPress={() => router.push('/reports' as any)} title="Saved Reports" iconName="doc.text.fill" color="#64B5F6" />
          <ActionRow onPress={() => router.push('/appointment-prep' as any)} title="Appointment Prep" iconName="doc.text.fill" color="#BA68C8" />
          <ActionRow
            onPress={() => !privacyActionInProgress && handleExportLocalData('json')}
            title="Export Local Data (JSON)"
            iconName="arrow.down.doc.fill"
            color="#81C784"
          />
          <ActionRow
            onPress={() => !privacyActionInProgress && handleExportLocalData('csv')}
            title="Export Local Data (CSV)"
            iconName="square.and.arrow.up.fill"
            color="#64B5F6"
          />
          <ActionRow
            onPress={() => !privacyActionInProgress && handleDatabaseBackup()}
            title="Backup SQLite Database"
            iconName="lock.shield.fill"
            color="#4DB6AC"
          />
          <ActionRow
            onPress={() => !privacyActionInProgress && handleRestoreBackup()}
            title="Restore from JSON Backup"
            iconName="arrow.down.doc.fill"
            color="#FFB74D"
          />
          <ActionRow
            onPress={() => !privacyActionInProgress && confirmDeleteLocalData()}
            title="Delete All Local Data"
            iconName="trash.fill"
            color={theme.error}
          />
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
  description: { fontSize: 14, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  toggleText: { fontSize: 16, fontWeight: '500' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  actionText: { fontSize: 16, fontWeight: '500' },
  progressTrack: { height: 8, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  presetRow: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginBottom: 8, alignSelf: 'flex-start' },
  termInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 15 },
  adjBtn: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderRadius: 8 },
});
