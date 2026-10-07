import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTx } from "@/utils/tone";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  message?: string;
  /** When set, loading failed: show the message with a retry button instead of a spinner. */
  onRetry?: () => void;
};

export function AppLoading({ message, onRetry }: Props) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const tx = useTx();
  const reduceMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.85, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      accessible={!onRetry}
      accessibilityRole={onRetry ? undefined : "progressbar"}
      accessibilityLabel={message ?? tx("Loading CycleIQ", "Loading CycleIQ")}
    >
      <Animated.Text style={[styles.logo, { color: theme.tint, transform: [{ scale: pulse }] }]}>
        CycleIQ
      </Animated.Text>
      {!onRetry && <ActivityIndicator size="large" color={theme.tint} style={styles.spinner} />}
      <Text style={[styles.message, { color: theme.textSecondary }]}>{message ?? tx("locking in your private vault 🔒…", "Loading your data securely…")}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={[styles.retry, { backgroundColor: theme.tint }]} accessibilityRole="button">
          <Text style={[styles.retryText, { color: theme.onTint }]}>{tx("try again", "Try again")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  logo: { fontSize: 36, fontWeight: "bold", marginBottom: 24 },
  spinner: { marginBottom: 16 },
  message: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  retry: { marginTop: 24, paddingHorizontal: 28, minHeight: 48, borderRadius: 24, justifyContent: "center" },
  retryText: { fontSize: 16, fontWeight: "800" },
});
