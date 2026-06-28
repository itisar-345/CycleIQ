import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, View } from "react-native";

type Props = {
  message?: string;
};

export function AppLoading({ message = "Preparing your secure vault…" }: Props) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const pulse = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.85, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.Text style={[styles.logo, { color: theme.tint, transform: [{ scale: pulse }] }]}>
        CycleIQ
      </Animated.Text>
      <ActivityIndicator size="large" color={theme.tint} style={styles.spinner} />
      <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  logo: { fontSize: 36, fontWeight: "bold", marginBottom: 24 },
  spinner: { marginBottom: 16 },
  message: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
