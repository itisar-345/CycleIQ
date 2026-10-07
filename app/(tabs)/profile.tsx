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
import { authenticate, getLockSupport } from '@/utils/appLock';
import { useTx } from '@/utils/tone';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const tx = useTx();
  const {
    tone, setTone,
    discreetNotifications, setDiscreetNotifications,
    appLockEnabled, setAppLockEnabled,
    currentMode, setMode,
    notificationPrefs, setNotificationPrefs,
    healthImportPrefs, setHealthImportPrefs,
    languagePreset, setLanguagePreset,
    customTerms, setCustomTerms,
    postPillMode, postPillStartDate, setPostPillMode,
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

  const handleAppLockToggle = async (enable: boolean) => {
    if (!enable) {
      // Confirm it's really the owner turning protection off.
      if (await authenticate(tx("confirm to turn off app lock", "Confirm to turn off app lock"), tx("cancel", "Cancel"))) {
        setAppLockEnabled(false);
      }
      return;
    }
    const support = await getLockSupport();
    if (support === "unsupported") {
      Alert.alert(tx("not available here 😅", "Not available"), tx("App lock needs a phone with Face ID, fingerprint or a passcode.", "App lock requires Face ID, fingerprint or a device passcode."));
      return;
    }
    if (support === "no-security") {
      Alert.alert(
        tx("set up a phone lock first 🔐", "Set up a device lock first"),
        tx("Add a passcode, Face ID or fingerprint in your phone's settings, then come back.", "Add a passcode, Face ID or fingerprint in your device settings, then try again."),
      );
      return;
    }
    if (await authenticate(tx("confirm it's you", "Confirm it's you"), tx("cancel", "Cancel"))) {
      setAppLockEnabled(true);
    }
  };

  // Post-pill progress (0–90 days)
  const postPillProgress = (() => {
    if (!postPillMode || !postPillStartDate) return null;
    const days = differenceInDays(new Date(), parseISO(postPillStartDate));
    return Math.min(days, 90);
  })();

  const ActionRow = ({ title, iconName, color, onPress }: { title: string; iconName: ComponentProps<typeof IconSymbol>['name']; color: string; onPress?: () => void }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.actionRow, { borderBottomColor: theme.border }]} accessibilityRole="button" accessibilityLabel={title}>
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
        tx("not available here 😅", "Health sync unavailable"),
        tx("Health app syncing only works in the real CycleIQ app (not Expo Go or web). Your choice is saved and kicks in there.", "Health app syncing requires the full CycleIQ app (not Expo Go or web). Your preference has been saved."),
      );
      return;
    }
    const granted = await requestHealthPermissions(nextPrefs);
    if (!granted && Platform.OS === "android") {
      Alert.alert(
        tx("Health Connect said no 🚫", "Access not granted"),
        tx("We couldn't get access. Make sure Health Connect is installed & updated, then allow sleep, steps and exercise for CycleIQ.", "Make sure Health Connect is installed and up to date, then allow sleep, steps and exercise for CycleIQ."),
      );
    }
  };

  const handleExportLocalData = async (format: 'json' | 'csv') => {
    try {
      setPrivacyActionInProgress(true);
      const uri = await exportAndShareLocalData(format);
      Alert.alert(tx("export ready 📦", "Export ready"), tx(`Your ${format.toUpperCase()} file is saved on your phone. It only went somewhere else if you picked a destination.\n\n${uri}`, `Your ${format.toUpperCase()} file was saved on this device and shared only if you chose a destination.\n\n${uri}`));
    } catch (error) {
      console.error("Local data export failed", error);
      Alert.alert(tx("export didn't work 😕", "Export failed"), tx("Couldn't create your export — try again in a sec.", "Your export couldn't be created. Please try again."));
    } finally {
      setPrivacyActionInProgress(false);
    }
  };

  const handleDatabaseBackup = async () => {
    try {
      setPrivacyActionInProgress(true);
      const uri = await exportAndShareDatabaseFileBackup();
      Alert.alert(tx("backup ready 💾", "Backup ready"), tx(`Saved on your phone (encrypted with this device's key, so it restores here). It only went elsewhere if you picked a destination.\n\n${uri}`, `Saved on this device, encrypted with this device's key. It was shared only if you chose a destination.\n\n${uri}`));
    } catch (error) {
      console.error("Database backup failed", error);
      Alert.alert(tx("backup didn't work 😕", "Backup failed"), tx("Couldn't make a database backup in this version of the app. The JSON export still works.", "A database backup isn't available in this version of the app. The JSON export still works."));
    } finally {
      setPrivacyActionInProgress(false);
    }
  };

  const confirmDeleteLocalData = () => {
    Alert.alert(
      tx("delete everything? 🗑️", "Delete all data?"),
      tx("This wipes all your CycleIQ data, settings, reminders and saved reports from this phone, and takes you back to setup. There's no undo — export first if you might want it back.", "This permanently deletes all CycleIQ data, settings, reminders and saved reports from this device and returns you to setup. Export first if you may need it."),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setPrivacyActionInProgress(true);
              await wipeLocalDataAndFiles();
              Alert.alert(tx("all cleared ✨", "Data deleted"), tx("Everything's been deleted from this phone. Fresh start.", "All data has been deleted from this device."));
            } catch (error) {
              console.error("Local data wipe failed", error);
              Alert.alert(tx("hmm, that didn't fully work 😕", "Delete failed"), tx("Some data couldn't be deleted — please try again.", "Some data couldn't be deleted. Please try again."));
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
        tx("restore this backup? ⏪", "Restore backup?"),
        tx("This swaps everything currently in the app for what's in the backup. No undo.", "This replaces all current data with the backup. This can't be undone."),
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "destructive",
            onPress: async () => {
              try {
                setPrivacyActionInProgress(true);
                await restoreLocalDataBackupFromUri(result.assets[0].uri);
                Alert.alert(tx("restored ✅", "Restore complete"), tx("Your backup is back. Close and reopen the app to see it.", "Your backup has been restored. Restart the app to see your data."));
              } catch {
                Alert.alert(tx("couldn't restore that 😕", "Restore failed"), tx("That file doesn't look like a CycleIQ JSON backup.", "The selected file isn't a valid CycleIQ JSON backup."));
              } finally {
                setPrivacyActionInProgress(false);
              }
            },
          },
        ],
      );
    } catch {
      Alert.alert(tx("files won't open 😕", "Couldn't open files"), tx("Couldn't open the file picker — try again?", "The file picker couldn't be opened. Please try again."));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">{tx("you 💅", "Profile")}</Text>

        {/* How the app talks */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">{tx("how should we talk to you?", "App tone")}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {tx("same info either way — just a different vibe.", "The information is the same either way; only the style changes.")}
          </Text>
          <View style={styles.toneRow} accessibilityRole="radiogroup">
            {([
              ["chill", tx("chill ✨", "Casual"), tx("casual, emoji, lowercase", "Relaxed with emoji")],
              ["classic", tx("classic", "Classic"), tx("calm, plain sentences", "Plain and calm")],
            ] as const).map(([value, label, hint]) => {
              const selected = tone === value;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => setTone(value)}
                  style={[styles.toneOption, selected ? { backgroundColor: theme.tintSoft, borderColor: theme.tint } : { borderColor: theme.border }]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${label}, ${hint}`}
                >
                  <Text style={{ color: selected ? theme.onTintSoft : theme.text, fontWeight: '800', fontSize: 15 }}>{selected ? '✓ ' : ''}{label}</Text>
                  <Text style={{ color: selected ? theme.onTintSoft : theme.textSecondary, fontSize: 12, marginTop: 2 }}>{hint}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Post-pill progress bar */}
        {postPillMode && postPillProgress !== null && (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">{tx("post-pill reset 💊", "Post-pill baseline")}</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {tx(`day ${postPillProgress} of 90 — predictions unlock once your hormones settle. be patient with your body 🫶`, `Day ${postPillProgress} of 90. Predictions unlock once your hormones settle.`)}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <View style={[styles.progressFill, { backgroundColor: theme.tint, width: `${(postPillProgress / 90) * 100}%` }]} />
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
              {tx(`${90 - postPillProgress} days to go`, `${90 - postPillProgress} days remaining`)}
            </Text>
          </View>
        )}

        {/* Condition Modes */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">{tx("your mode", "Tracking mode")}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {tx("switch anytime — your home screen & daily questions change to match.", "Your home screen and daily questions adapt to the mode you choose.")}
          </Text>
          <View accessibilityRole="radiogroup">
            {(['standard', 'pcos', 'pcod', 'endo', 'peri'] as AppMode[]).map((mode) => {
              const selected = currentMode === mode;
              const label = ({
                standard: tx('just tracking 🗓️', 'Cycle tracking'),
                pcos: tx('PCOS 💚', 'PCOS'),
                pcod: tx('PCOD 💙', 'PCOD'),
                endo: tx('endometriosis 💜', 'Endometriosis'),
                peri: tx('perimenopause 🌙', 'Perimenopause'),
              } as Record<string, string>)[mode];
              return (
                <TouchableOpacity
                  key={mode}
                  style={styles.radioRow}
                  onPress={() => !selected && toggleMode(mode)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={label}
                >
                  <Text style={[styles.toggleText, { color: theme.text, fontWeight: selected ? '800' : '500' }]}>{label}</Text>
                  <View style={[styles.radioOuter, { borderColor: selected ? getModeColor(theme, mode) : theme.border }]}>
                    {selected && <View style={[styles.radioInner, { backgroundColor: getModeColor(theme, mode) }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.toggleRow, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.toggleText, { color: theme.text }]}>{tx("💊 just came off the pill", "Recently stopped hormonal contraception")}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                {tx("your first few cycles can be all over the place, so we go easy on predictions for ~90 days", "Cycles can be irregular at first, so predictions are held back for about 90 days")}
              </Text>
            </View>
            <Switch
              value={postPillMode}
              onValueChange={setPostPillMode}
              trackColor={{ true: theme.tint }}
              accessibilityLabel={tx("Just came off the pill", "Recently stopped hormonal contraception")}
            />
          </View>
        </View>

        {/* Language & Terminology */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">{tx("words we use", "Terminology")}</Text>
          {(['default', 'inclusive', 'custom'] as const).map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[styles.presetRow, { borderColor: languagePreset === preset ? theme.tint : theme.border }]}
              onPress={() => setLanguagePreset(preset)}
              accessibilityRole="radio"
              accessibilityState={{ checked: languagePreset === preset }}
            >
              <Text style={{ color: languagePreset === preset ? theme.tint : theme.text, fontWeight: languagePreset === preset ? 'bold' : 'normal' }}>
                {{ default: tx('default', 'Default'), inclusive: tx('gender-neutral', 'Gender-neutral'), custom: tx('my own words ✍️', 'Custom') }[preset]}
              </Text>
            </TouchableOpacity>
          ))}

          {languagePreset === 'custom' && (
            <View style={{ marginTop: 12, gap: 8 }}>
              {(['cycle', 'flow', 'body'] as const).map((field) => (
                <View key={field}>
                  <Text style={[styles.description, { color: theme.textSecondary }]}>
                    {tx(`what should we call "${field}"?`, `Term for "${field}"`)}
                  </Text>
                  <TextInput
                    style={[styles.termInput, { borderColor: theme.border, color: theme.text }]}
                    value={customTerms[field]}
                    onChangeText={(val) => setCustomTerms({ [field]: val })}
                    placeholder={field}
                    accessibilityLabel={tx(`What to call "${field}"`, `Term for "${field}"`)}
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Notifications */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">{tx("reminders & pings 🔔", "Notifications")}</Text>

          <View style={[styles.toggleRow, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.toggleText, { color: theme.text }]}>{tx("🤫 discreet mode", "Discreet notifications")}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                {tx("lock screen just says \"CycleIQ reminder\" — no period or symptom details", "Notifications show only \"CycleIQ\" with no health details.")}
              </Text>
            </View>
            <Switch
              value={discreetNotifications}
              onValueChange={setDiscreetNotifications}
              trackColor={{ true: theme.tint }}
              accessibilityLabel={tx("Discreet notifications", "Discreet notifications")}
            />
          </View>

          {([
            { key: 'period',           label: tx('🩸 period incoming heads-up', 'Period reminder') },
            { key: 'dailyLog',         label: tx('✏️ daily check-in reminder', 'Daily log reminder') },
            { key: 'padReminder',      label: tx('🛍️ restock reminder (5 days before)', 'Restock reminder (5 days before)') },
            { key: 'hydrationNudge',   label: tx('💧 water check (3 days before)', 'Hydration reminder (3 days before)') },
            { key: 'ironFoodReminder', label: tx('🥑 cramp-fighting food tips (2 days before)', 'Nutrition tips (2 days before)') },
            { key: 'heatPadReminder',  label: tx('🔥 heat pad reminder (day 1)', 'Heat pad reminder (day 1)') },
            { key: 'periodDayTips',    label: tx('🌸 period survival tips (days 1–5)', 'Period day tips (days 1–5)') },
            { key: 'moodCheckIn',      label: tx('💭 PMS vibe check', 'PMS mood check-in') },
            { key: 'insights',         label: tx('👀 new pattern alerts', 'New insight alerts') },
            { key: 'ovulation',        label: tx('✨ ovulation heads-up', 'Ovulation reminder') },
            { key: 'flares',           label: tx('💜 flare & symptom warnings', 'Flare and symptom warnings') },
            ...(currentMode === 'endo' ? [{ key: 'endoDayTips', label: tx('💜 endo care tips (period + recovery)', 'Endometriosis care tips') }] : []),
            ...(currentMode === 'pcos' ? [{ key: 'pcosNotifications', label: tx('💚 PCOS check-ins & tips', 'PCOS reminders and tips') }] : []),
          ] as { key: BooleanNotificationPref; label: string }[]).map(({ key, label }) => (
            <View key={key} style={styles.toggleRow}>
              <Text style={[styles.toggleText, { color: theme.text }]}>{label}</Text>
              <Switch
                value={notificationPrefs[key]}
                onValueChange={(val) => setNotificationPrefs({ [key]: val })}
                trackColor={{ true: theme.tint }}
                accessibilityLabel={label}
              />
            </View>
          ))}

          {/* Daily log reminder time */}
          <View style={[styles.toggleRow, { marginTop: 8 }]}>
            <Text style={[styles.toggleText, { color: theme.text }]}>{tx("check-in reminder time", "Daily reminder time")}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => handleDailyHourChange(-1)} style={[styles.adjBtn, { borderColor: theme.tint }]} accessibilityRole="button" accessibilityLabel={tx("One hour earlier", "One hour earlier")}>
                <Text style={{ color: theme.tint }}>−</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.text, fontWeight: 'bold', minWidth: 40, textAlign: 'center' }}>
                {String(notificationPrefs.dailyLogHour ?? 20).padStart(2, '0')}:00
              </Text>
              <TouchableOpacity onPress={() => handleDailyHourChange(1)} style={[styles.adjBtn, { borderColor: theme.tint }]} accessibilityRole="button" accessibilityLabel={tx("One hour later", "One hour later")}>
                <Text style={{ color: theme.tint }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quiet hours */}
          <Text style={[styles.description, { color: theme.textSecondary, marginTop: 12 }]}>
            {tx("do-not-disturb hours 🌙 (we stay quiet)", "Quiet hours (no notifications)")}
          </Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            {(['quietHoursStart', 'quietHoursEnd'] as const).map((field) => (
              <View key={field} style={{ flex: 1 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                  {field === 'quietHoursStart' ? tx('from', 'From') : tx('until', 'Until')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setNotificationPrefs({ [field]: Math.max(0, (notificationPrefs[field] ?? (field === 'quietHoursStart' ? 22 : 8)) - 1) })}
                    style={[styles.adjBtn, { borderColor: theme.border }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${field === 'quietHoursStart' ? 'Quiet hours start' : 'Quiet hours end'}: one hour earlier`}
                  >
                    <Text style={{ color: theme.text }}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ color: theme.text, fontWeight: 'bold', minWidth: 36, textAlign: 'center' }}>
                    {String(notificationPrefs[field] ?? (field === 'quietHoursStart' ? 22 : 8)).padStart(2, '0')}:00
                  </Text>
                  <TouchableOpacity
                    onPress={() => setNotificationPrefs({ [field]: Math.min(23, (notificationPrefs[field] ?? (field === 'quietHoursStart' ? 22 : 8)) + 1) })}
                    style={[styles.adjBtn, { borderColor: theme.border }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${field === 'quietHoursStart' ? 'Quiet hours start' : 'Quiet hours end'}: one hour later`}
                  >
                    <Text style={{ color: theme.text }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">{tx("sync your Health app ⌚", "Health app import")}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {tx("we only read sleep, steps & exercise to pre-fill your log. we never write anything back.", "Read-only: sleep, steps and exercise are used to pre-fill your log. Nothing is written back.")}
          </Text>
          {Platform.OS === 'ios' ? (
            <>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleText, { color: theme.text }]}>{tx("sleep from Apple Health", "Sleep (Apple Health)")}</Text>
                <Switch
                  value={healthImportPrefs.appleHealthSleep}
                  onValueChange={(val) => handleHealthToggle('appleHealthSleep', val)}
                  accessibilityLabel={tx("Sleep from Apple Health", "Sleep from Apple Health")}
                  trackColor={{ true: theme.tint }}
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleText, { color: theme.text }]}>{tx("steps & workouts from Apple Health", "Steps and workouts (Apple Health)")}</Text>
                <Switch
                  value={healthImportPrefs.appleHealthActivity}
                  onValueChange={(val) => handleHealthToggle('appleHealthActivity', val)}
                  accessibilityLabel={tx("Steps and workouts from Apple Health", "Steps and workouts from Apple Health")}
                  trackColor={{ true: theme.tint }}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleText, { color: theme.text }]}>{tx("sleep from Health Connect", "Sleep (Health Connect)")}</Text>
                <Switch
                  value={healthImportPrefs.healthConnectSleep}
                  onValueChange={(val) => handleHealthToggle('healthConnectSleep', val)}
                  accessibilityLabel={tx("Sleep from Health Connect", "Sleep from Health Connect")}
                  trackColor={{ true: theme.tint }}
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleText, { color: theme.text }]}>{tx("steps & workouts from Health Connect", "Steps and workouts (Health Connect)")}</Text>
                <Switch
                  value={healthImportPrefs.healthConnectActivity}
                  onValueChange={(val) => handleHealthToggle('healthConnectActivity', val)}
                  accessibilityLabel={tx("Steps and workouts from Health Connect", "Steps and workouts from Health Connect")}
                  trackColor={{ true: theme.tint }}
                />
              </View>
            </>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">{tx("your privacy 🔒", "Privacy and security")}</Text>

          <View style={[styles.toggleRow, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.toggleText, { color: theme.text }]}>{tx("🔐 app lock", "App lock")}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                {tx("Face ID, fingerprint or passcode to get in", "Require Face ID, fingerprint or passcode to open")}
              </Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={handleAppLockToggle}
              trackColor={{ true: theme.tint }}
              accessibilityLabel={tx("App lock", "App lock")}
            />
          </View>

          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {tx("your private notes are encrypted with a key that never leaves this phone.", "Private notes are encrypted with a key stored only on this device.")}
          </Text>
          <Text style={[styles.description, { color: databaseEncryption?.sqlCipherAvailable ? theme.tint : theme.error }]}>
            {databaseEncryption?.sqlCipherAvailable
              ? tx(`✅ whole database encrypted (SQLCipher${databaseEncryption.cipherVersion ? ` ${databaseEncryption.cipherVersion}` : ""})`, `Database encryption: on (SQLCipher${databaseEncryption.cipherVersion ? ` ${databaseEncryption.cipherVersion}` : ""})`)
              : tx("⚠️ full database encryption isn't available in this version of the app (e.g. Expo Go)", "Database encryption: not available in this build (e.g. Expo Go)")}
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {tx("zero trackers, zero analytics, zero ads. we can't see your data even if we wanted to.", "No analytics, tracking or advertising. We have no access to your data.")}
          </Text>
        </View>

        {/* Reports & Export */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border, paddingVertical: 8 }]}>
          <ActionRow onPress={() => router.push('/privacy')} title={tx("privacy policy (no legal jargon)", "Privacy policy")} iconName="lock.shield.fill" color="#4DB6AC" />
          <ActionRow onPress={() => router.push('/report')} title={tx("doctor-ready report 🩺", "Doctor report")} iconName="doc.text.fill" color="#E57373" />
          <ActionRow onPress={() => router.push('/reports')} title={tx("saved reports", "Saved reports")} iconName="doc.text.fill" color="#64B5F6" />
          <ActionRow onPress={() => router.push('/appointment-prep')} title={tx("prep for an appointment 📝", "Appointment preparation")} iconName="doc.text.fill" color="#BA68C8" />
          <ActionRow
            onPress={() => !privacyActionInProgress && handleExportLocalData('json')}
            title={tx("export my data (JSON)", "Export data (JSON)")}
            iconName="arrow.down.doc.fill"
            color="#81C784"
          />
          <ActionRow
            onPress={() => !privacyActionInProgress && handleExportLocalData('csv')}
            title={tx("export my data (spreadsheet / CSV)", "Export data (CSV)")}
            iconName="square.and.arrow.up.fill"
            color="#64B5F6"
          />
          <ActionRow
            onPress={() => !privacyActionInProgress && handleDatabaseBackup()}
            title={tx("back up the database file", "Back up database file")}
            iconName="lock.shield.fill"
            color="#4DB6AC"
          />
          <ActionRow
            onPress={() => !privacyActionInProgress && handleRestoreBackup()}
            title={tx("restore from a JSON backup", "Restore from JSON backup")}
            iconName="arrow.down.doc.fill"
            color="#FFB74D"
          />
          <ActionRow
            onPress={() => !privacyActionInProgress && confirmDeleteLocalData()}
            title={tx("delete all my data", "Delete all data")}
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
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, minHeight: 44 },
  radioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48 },
  radioOuter: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  toneRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  toneOption: { flex: 1, borderWidth: 1.5, borderRadius: Radius.md, padding: 12, minHeight: 64 },
  toggleText: { fontSize: 16, fontWeight: '500' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  actionText: { fontSize: 16, fontWeight: '500' },
  progressTrack: { height: 8, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  presetRow: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginBottom: 8, alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  termInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 15 },
  adjBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 22 },
});
