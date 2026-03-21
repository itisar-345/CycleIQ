import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ConsentScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { setOnboarded } = useAppStore();

  const handleComplete = () => {
    setOnboarded(true);
    router.replace("(tabs)" as any);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol name="lock.shield" size={60} color={theme.tint} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          Privacy & Data Consent
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          CycleIQ stores your medical and tracking data locally on your device
          by default via SQLite. Your health insights and correlations never
          leave your phone unless you explicitly opt into Cloud Sync in
          settings.
        </Text>
        <Text
          style={[styles.body, { color: theme.textSecondary, marginTop: 10 }]}
        >
          By continuing, you acknowledge that you control your health data.
        </Text>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: theme.tint }]}
          onPress={handleComplete}
        >
          <Text style={styles.nextText}>Accept & Finish Setup</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 30, flex: 1, justifyContent: "center" },
  iconContainer: { marginBottom: 30, alignItems: "center" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  body: { fontSize: 16, lineHeight: 24, textAlign: "center" },
  nextButton: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 40,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nextText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
});
