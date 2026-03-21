import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppMode, useAppStore } from "@/store";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ConditionSelection() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { setMode } = useAppStore();

  const handleSelect = (mode: AppMode, path: string) => {
    setMode(mode);
    router.push(path);
  };

  const ConditionCard = ({
    title,
    desc,
    mode,
    path,
    bgColor,
    borderColor,
  }: any) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bgColor, borderColor }]}
      onPress={() => handleSelect(mode, path)}
      activeOpacity={0.8}
    >
      <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
        {desc}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>CycleIQ Setup</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          What is your primary focus?
        </Text>
      </View>

      <View style={styles.content}>
        <ConditionCard
          title="Standard Tracking"
          desc="Cycle length history and general symptom tracking."
          mode="standard"
          path="/onboarding/cycle-history"
          bgColor={theme.surface}
          borderColor={theme.border}
        />
        <ConditionCard
          title="PCOS"
          desc="Diagnosis, custom symptom palette, & metabolic proxies."
          mode="pcos"
          path="/onboarding/pcos"
          bgColor={theme.pcos + "20"}
          borderColor={theme.pcos}
        />
        <ConditionCard
          title="Endometriosis"
          desc="Stage, flare history, and advanced pain tracking."
          mode="endo"
          path="/onboarding/endo"
          bgColor={theme.endo + "20"}
          borderColor={theme.endo}
        />
        <ConditionCard
          title="Irregular (Perimenopause)"
          desc="Adaptive predictions without assuming regularity."
          mode="peri"
          path="/onboarding/cycle-history"
          bgColor={theme.peri + "20"}
          borderColor={theme.peri}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 30, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 18 },
  content: { padding: 20, gap: 16 },
  card: { padding: 20, borderRadius: 16, borderWidth: 2 },
  cardTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 6 },
  cardDesc: { fontSize: 15, lineHeight: 22 },
});
