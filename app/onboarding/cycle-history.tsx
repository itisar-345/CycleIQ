import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CycleHistoryInputScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { setCycleHistory, setProfileInfo } = useAppStore();

  const [averageLength, setAverageLength] = useState<string>("28");
  const [lastPeriodDate, setLastPeriodDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [postPill, setPostPill] = useState<boolean>(false);

  const onContinue = () => {
    const parsed = parseInt(averageLength, 10);
    if (isNaN(parsed) || parsed < 18 || parsed > 60) {
      Alert.alert("Please enter a valid average cycle length (18-60).");
      return;
    }

    setCycleHistory(parsed, lastPeriodDate);
    setProfileInfo(0, "female", "en", true, postPill);

    router.push("profile" as any);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Cycle history</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Tell us where you’re at today so we can personalize predictions.
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>
            Average cycle length (days)
          </Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: theme.border, color: theme.text },
            ]}
            keyboardType="number-pad"
            value={averageLength}
            onChangeText={(val) => setAverageLength(val)}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>
            Last period start date
          </Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: theme.border, color: theme.text },
            ]}
            value={lastPeriodDate}
            onChangeText={setLastPeriodDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>
            Post-pill mode
          </Text>
          <Text style={[styles.optionText, { color: theme.textSecondary }]}>
            Are you recently off hormonal contraception?
          </Text>
          <TouchableOpacity
            onPress={() => setPostPill(!postPill)}
            style={[
              styles.checkbox,
              {
                borderColor: theme.tint,
                backgroundColor: postPill ? theme.tint : "transparent",
              },
            ]}
          >
            {postPill && (
              <Text style={{ color: "#fff", fontWeight: "bold" }}>✓</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: theme.tint }]}
          onPress={onContinue}
        >
          <Text style={styles.nextText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: "center", gap: 16 },
  title: { fontSize: 32, fontWeight: "bold" },
  subtitle: { fontSize: 16, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: "500" },
  optionText: { fontSize: 14, marginVertical: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    minHeight: 44,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  nextButton: { padding: 16, borderRadius: 14, alignItems: "center" },
  nextText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
