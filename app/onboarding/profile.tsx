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

export default function ProfileSetupScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { setProfileInfo } = useAppStore();

  const [age, setAge] = useState<string>("25");
  const [gender, setGender] = useState<
    "female" | "male" | "nonbinary" | "other"
  >("female");
  const [language, setLanguage] = useState<string>("en");

  const onContinue = () => {
    const parsedAge = parseInt(age, 10);
    if (Number.isNaN(parsedAge) || parsedAge < 12 || parsedAge > 120) {
      Alert.alert("Please enter a valid age between 12 and 120.");
      return;
    }

    const isTeenMode = parsedAge < 18;
    setProfileInfo(parsedAge, gender, language, true, false, isTeenMode);
    router.push("notify" as any);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Profile setup</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Age</Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: theme.border, color: theme.text },
            ]}
            keyboardType="number-pad"
            value={age}
            onChangeText={setAge}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Gender</Text>
          <View style={styles.row}>
            {["female", "male", "nonbinary", "other"].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      gender === opt ? theme.tint : "transparent",
                  },
                ]}
                onPress={() => setGender(opt as any)}
              >
                <Text style={{ color: gender === opt ? "#fff" : theme.text }}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Language</Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: theme.border, color: theme.text },
            ]}
            value={language}
            onChangeText={setLanguage}
          />
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
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { fontSize: 16, fontWeight: "500", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 44 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  nextButton: { padding: 16, borderRadius: 14, alignItems: "center" },
  nextText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
