import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { router } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { requestNotificationPermission } from "@/utils/notifications";

export default function NotificationPermissionScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { setProfileInfo, age, gender, language } = useAppStore();

  const requestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert("Notifications blocked", "You can enable them later in device Settings.");
    }
    setProfileInfo(age ?? 0, gender ?? "female", language ?? "en", granted, false, false);
    router.push("consent" as any);
  };

  const skipPermission = () => {
    setProfileInfo(age ?? 0, gender ?? "female", language ?? "en", false, false, false);
    router.push("consent" as any);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          Notification permissions
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Enable reminders and check-ins for better tracking consistency.
        </Text>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: theme.tint }]}
          onPress={requestPermission}
        >
          <Text style={styles.nextText}>Allow Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.skipButton, { borderColor: theme.textSecondary }]}
          onPress={skipPermission}
        >
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: "center", gap: 16 },
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 12 },
  subtitle: { fontSize: 16, marginBottom: 20 },
  nextButton: { padding: 16, borderRadius: 14, alignItems: "center" },
  nextText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  skipButton: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  skipText: { fontSize: 16 },
});
