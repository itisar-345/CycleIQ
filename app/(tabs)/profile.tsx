import { Alert, Platform, StyleSheet, View, Text, Switch, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Colors, getModeColor, Radius, Shadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore, AppMode, type BooleanNotificationPref } from '@/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { differenceInDays, parseISO } from 'date-fns';
import { scheduleDailyLogReminder } from '@/utils/notifications';
import { isHealthBridgeAvailable, requestHealthPermissions } from '@/utils/healthIntegrations';
import { getDatabaseEncryptionStatus } from '@/database';
import { useEffect, useState, type ComponentProps } from 'react';
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

  const toggleMode = (mode: AppMode) => {
    setMode(mode);
    // If switching into a condition mode with no existing setup data, route to that condition's setup screen
    const { pcosData, endoData } = useAppStore.getState();
    if ((mode === 'pcos' || mode === 'pcod') && !pcosData) {
      router.push(`/onboarding/${mode}`);
    } else if (mode === 'endo' && !endoData) {
      router.push('/onboarding/endo');
    }
  };

  // Post-pill progress (0–90 days)
  const postPillProgress = (() => {
    if (!postPillMode || !postPillStartDate) return null;
    const days = differenceInDays(new Date(), parseISO(postPillStartDate));
    return Math.min(days, 90);
  })();

  const ActionRow = ({ title, iconName, color, onPress }: { title: string; iconName: ComponentProps<typeof IconSymbol>['name']; color: string; onPress?: () => void }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.actionRow, { borderBottomColor: theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconSymbol name={iconName} size={24} color={color} />
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
    if (!isHealthBridgeAvailable()) {
      Alert.alert(
        "not available here 😅",
        "Health app syncing only works in the real CycleIQ app (not Expo Go or web). Your choice is saved and kicks in there.",
      );
      return;
    }
    const granted = await requestHealthPermissions(nextPrefs);
    if (!granted && Platform.OS === "android") {
      Alert.alert(
        "Health Connect said no 🚫",
        "We couldn't get access. Make sure Health Connect is installed & updated, then allow sleep, steps and exercise for CycleIQ.",
      );
    }
  };

  const handleExportLocalData = async (format: 'json' | 'csv') => {
    try {
      setPrivacyActionInProgress(true);
      const uri = await exportAndShareLocalData(format);
      Alert.alert("export ready 📦", `Your ${format.toUpperCase()} file is saved on your phone. It only went somewhere else if you picked a destination.\n\n${uri}`);
    } catch (error) {
      console.error("Local data export failed", error);
      Alert.alert("export didn't work 😕", "Couldn't create your export — try again in a sec.");
    } finally {
      setPrivacyActionInProgress(false);
    }
  };

  const handleDatabaseBackup = async () => {
    try {
      setPrivacyActionInProgress(true);
      const uri = await exportAndShareDatabaseFileBackup();
      Alert.alert("backup ready 💾", `Saved on your phone (encrypted with this device's key, so it restores here). It only went elsewhere if you picked a destination.\n\n${uri}`);
    } catch (error) {
      console.error("Database backup failed", error);
      Alert.alert("backup didn't work 😕", "Couldn't make a database backup in this version of the app. The JSON export still works.");
    } finally {
      setPrivacyActionInProgress(false);
    }
  };

  const confirmDeleteLocalData = () => {
    Alert.alert(
      "delete everything? 🗑️",
      "This wipes all your CycleIQ data and saved reports from this phone. There's no undo — export first if you might want it back.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setPrivacyActionInProgress(true);
              await wipeLocalDataAndFiles();
              Alert.alert("all cleared ✨", "Everything's been deleted from this phone. Fresh start.");
            } catch (error) {
              console.error("Local data wipe failed", error);
              Alert.alert("hmm, that didn't fully work 😕", "Some data couldn't be deleted — please try again.");
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
        "restore this backup? ⏪",
        "This swaps everything currently in the app for what's in the backup. No undo.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "destructive",
            onPress: async () => {
              try {
                setPrivacyActionInProgress(true);
                await restoreLocalDataBackupFromUri(result.assets[0].uri);
                Alert.alert("restored ✅", "Your backup is back. Close and reopen the app to see it.");
              } catch {
                Alert.alert("couldn't restore that 😕", "That file doesn't look like a CycleIQ JSON backup.");
              } finally {
                setPrivacyActionInProgress(false);
              }
            },
          },
        ],
      );
    } catch {
      Alert.alert("files won't open 😕", "Couldn't open the file picker — try again?");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>you 💅</Text>

        {/* Post-pill progress bar */}
        {postPillMode && postPillProgress !== null && (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>post-pill reset 💊</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              day {postPillProgress} of 90 — predictions unlock once your hormones settle. be patient with your body 🫶
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <View style={[styles.progressFill, { backgroundColor: theme.tint, width: `${(postPillProgress / 90) * 100}%` }]} />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
              {90 - postPillProgress} days to go
            </Text>
          </View>
        )}

        {/* Condition Modes */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>your mode</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            switch anytime — your home screen & daily questions change to match.
          </Text>
          {(['standard', 'pcos', 'pcod', 'endo', 'peri'] as AppMode[]).map((mode) => (
            <View key={mode} style={styles.toggleRow}>
              <Text style={[styles.toggleText, { color: theme.text }]}>
                {({ standard: 'just tracking 🗓️', pcos: 'PCOS 💚', pcod: 'PCOD 💙', endo: 'endometriosis 💜', peri: 'perimenopause 🌙' } as Record<string, string>)[mode]}
              </Text>
              <Switch
                value={currentMode === mode}
                onValueChange={() => toggleMode(mode)}
                trackColor={{ true: getModeColor(theme, mode) }}
              />
            </View>
          ))}
        </View>

        {/* Language & Terminology */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>words we use</Text>
          {(['default', 'inclusive', 'custom'] as const).map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[styles.presetRow, { borderColor: languagePreset === preset ? theme.tint : theme.border }]}
              onPress={() => setLanguagePreset(preset)}
            >
              <Text style={{ color: languagePreset === preset ? theme.tint : theme.text, fontWeight: languagePreset === preset ? 'bold' : 'normal' }}>
                {{ default: 'default', inclusive: 'gender-neutral', custom: 'my own words ✍️' }[preset]}
              </Text>
            </TouchableOpacity>
          ))}

          {languagePreset === 'custom' && (
            <View style={{ marginTop: 12, gap: 8 }}>
              {(['cycle', 'flow', 'body'] as const).map((field) => (
                <View key={field}>
                  <Text style={[styles.description, { color: theme.textSecondary }]}>
                    what should we call &quot;{field}&quot;?
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>reminders & pings 🔔</Text>

          {([
            { key: 'period',           label: '🩸 period incoming heads-up' },
            { key: 'dailyLog',         label: '✏️ daily check-in reminder' },
            { key: 'padReminder',      label: '🛍️ restock reminder (5 days before)' },
            { key: 'hydrationNudge',   label: '💧 water check (3 days before)' },
            { key: 'ironFoodReminder', label: '🥑 cramp-fighting food tips (2 days before)' },
            { key: 'heatPadReminder',  label: '🔥 heat pad reminder (day 1)' },
            { key: 'periodDayTips',    label: '🌸 period survival tips (days 1–5)' },
            { key: 'moodCheckIn',      label: '💭 PMS vibe check' },
            { key: 'insights',         label: '👀 new pattern alerts' },
            { key: 'ovulation',        label: '✨ ovulation heads-up' },
            { key: 'flares',           label: '💜 flare & symptom warnings' },
            ...(currentMode === 'endo' ? [{ key: 'endoDayTips', label: '💜 endo care tips (period + recovery)' }] : []),
            ...(currentMode === 'pcos' ? [{ key: 'pcosNotifications', label: '💚 PCOS check-ins & tips' }] : []),
          ] as { key: BooleanNotificationPref; label: string }[]).map(({ key, label }) => (
            <View key={key} style={styles.toggleRow}>
              <Text style={[styles.toggleText, { color: theme.text }]}>{label}</Text>
              <Switch
                value={notificationPrefs[key]}
                onValueChange={(val) => setNotificationPrefs({ [key]: val })}
                trackColor={{ true: theme.tint }}
              />
            </View>
          ))}

          {/* Daily log reminder time */}
          <View style={[styles.toggleRow, { marginTop: 8 }]}>
            <Text style={[styles.toggleText, { color: theme.text }]}>check-in reminder time</Text>
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
            do-not-disturb hours 🌙 (we stay quiet)
          </Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            {(['quietHoursStart', 'quietHoursEnd'] as const).map((field) => (
              <View key={field} style={{ flex: 1 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                  {field === 'quietHoursStart' ? 'from' : 'until'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setNotificationPrefs({ [field]: Math.max(0, (notificationPrefs[field] ?? (field === 'quietHoursStart' ? 22 : 8)) - 1) })}
                    style={[styles.adjBtn, { borderColor: theme.border }]}
                  >
                    <Text style={{ color: theme.text }}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ color: theme.text, fontWeight: 'bold', minWidth: 36, textAlign: 'center' }}>
                    {String(notificationPrefs[field] ?? (field === 'quietHoursStart' ? 22 : 8)).padStart(2, '0')}:00
                  </Text>
                  <TouchableOpacity
                    onPress={() => setNotificationPrefs({ [field]: Math.min(23, (notificationPrefs[field] ?? (field === 'quietHoursStart' ? 22 : 8)) + 1) })}
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>sync your Health app ⌚</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            we only read sleep, steps & exercise to pre-fill your log. we never write anything back.
          </Text>
          {Platform.OS === 'ios' ? (
            <>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleText, { color: theme.text }]}>sleep from Apple Health</Text>
                <Switch
                  value={healthImportPrefs.appleHealthSleep}
                  onValueChange={(val) => handleHealthToggle('appleHealthSleep', val)}
                  trackColor={{ true: theme.tint }}
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleText, { color: theme.text }]}>steps & workouts from Apple Health</Text>
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
                <Text style={[styles.toggleText, { color: theme.text }]}>sleep from Health Connect</Text>
                <Switch
                  value={healthImportPrefs.healthConnectSleep}
                  onValueChange={(val) => handleHealthToggle('healthConnectSleep', val)}
                  trackColor={{ true: theme.tint }}
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleText, { color: theme.text }]}>steps & workouts from Health Connect</Text>
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>your privacy 🔒</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            your private notes are encrypted with a key that never leaves this phone.
          </Text>
          <Text style={[styles.description, { color: databaseEncryption?.sqlCipherAvailable ? theme.tint : theme.error }]}>
            {databaseEncryption?.sqlCipherAvailable
              ? `✅ whole database encrypted (SQLCipher${databaseEncryption.cipherVersion ? ` ${databaseEncryption.cipherVersion}` : ""})`
              : "⚠️ full database encryption isn't available in this version of the app (e.g. Expo Go)"}
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            zero trackers, zero analytics, zero ads. we can&apos;t see your data even if we wanted to.
          </Text>
        </View>

        {/* Reports & Export */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border, paddingVertical: 8 }]}>
          <ActionRow onPress={() => router.push('/privacy')} title="privacy policy (no legal jargon)" iconName="lock.shield.fill" color="#4DB6AC" />
          <ActionRow onPress={() => router.push('/report')} title="doctor-ready report 🩺" iconName="doc.text.fill" color="#E57373" />
          <ActionRow onPress={() => router.push('/reports')} title="saved reports" iconName="doc.text.fill" color="#64B5F6" />
          <ActionRow onPress={() => router.push('/appointment-prep')} title="prep for an appointment 📝" iconName="doc.text.fill" color="#BA68C8" />
          <ActionRow
            onPress={() => !privacyActionInProgress && handleExportLocalData('json')}
            title="export my data (JSON)"
            iconName="arrow.down.doc.fill"
            color="#81C784"
          />
          <ActionRow
            onPress={() => !privacyActionInProgress && handleExportLocalData('csv')}
            title="export my data (spreadsheet / CSV)"
            iconName="square.and.arrow.up.fill"
            color="#64B5F6"
          />
          <ActionRow
            onPress={() => !privacyActionInProgress && handleDatabaseBackup()}
            title="back up the database file"
            iconName="lock.shield.fill"
            color="#4DB6AC"
          />
          <ActionRow
            onPress={() => !privacyActionInProgress && handleRestoreBackup()}
            title="restore from a JSON backup"
            iconName="arrow.down.doc.fill"
            color="#FFB74D"
          />
          <ActionRow
            onPress={() => !privacyActionInProgress && confirmDeleteLocalData()}
            title="delete all my data"
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
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginBottom: 20 },
  section: { paddingHorizontal: 20, paddingVertical: 20, borderRadius: Radius.lg, borderWidth: 0, marginBottom: 16, ...Shadow },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
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
