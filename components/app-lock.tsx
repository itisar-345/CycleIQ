/**
 * App lock overlay.
 *
 * - Cold start: locked (if enabled) once the persisted settings have loaded.
 * - Leaving the app: a plain cover goes up immediately so the app-switcher snapshot
 *   shows nothing sensitive. Coming back within GRACE_MS (share sheet, file picker,
 *   control centre…) just removes it; after that, the user must unlock.
 * - Enabling the lock in Profile doesn't lock the current session.
 */
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import { authenticate } from "@/utils/appLock";
import { useTx } from "@/utils/tone";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const GRACE_MS = 60_000;

type Phase = "unlocked" | "covered" | "locked";

export function AppLockGate({ ready }: { ready: boolean }) {
  const theme = Colors[useColorScheme() ?? "light"];
  const tx = useTx();
  const appLockEnabled = useAppStore((s) => s.appLockEnabled);
  const [phase, setPhase] = useState<Phase>("unlocked");
  const initialized = useRef(false);
  const prompting = useRef(false);
  const leftAt = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("unlocked");
  phaseRef.current = phase;

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    const ok = await authenticate(tx("unlock CycleIQ 🔒", "Unlock CycleIQ"), tx("not now", "Cancel"));
    prompting.current = false;
    if (ok) setPhase("unlocked");
  }, [tx]);

  // Cold start: decide once the persisted settings are available.
  useEffect(() => {
    if (!ready || initialized.current) return;
    initialized.current = true;
    if (useAppStore.getState().appLockEnabled) setPhase("locked");
  }, [ready]);

  // Turning the lock off (in Profile) clears any cover.
  useEffect(() => {
    if (!appLockEnabled) setPhase("unlocked");
  }, [appLockEnabled]);

  useEffect(() => {
    if (!appLockEnabled) return;
    const sub = AppState.addEventListener("change", (state) => {
      // The system auth sheet itself makes the app inactive — ignore our own prompt.
      if (prompting.current) return;
      if (state === "inactive" || state === "background") {
        leftAt.current ??= Date.now();
        setPhase((p) => (p === "unlocked" ? "covered" : p));
      } else if (state === "active") {
        const away = leftAt.current === null ? 0 : Date.now() - leftAt.current;
        leftAt.current = null;
        setPhase((p) => (p === "covered" ? (away > GRACE_MS ? "locked" : "unlocked") : p));
        // Already locked before leaving (e.g. prompt was dismissed): ask again on return.
        if (phaseRef.current === "locked") unlock();
      }
    });
    return () => sub.remove();
  }, [appLockEnabled, unlock]);

  // Ask as soon as we're locked and in the foreground (a prompt while backgrounded gets cancelled).
  useEffect(() => {
    if (phase === "locked" && ready && AppState.currentState === "active") unlock();
  }, [phase, ready, unlock]);

  if (!appLockEnabled || phase === "unlocked") return null;

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.container, { backgroundColor: theme.background }]}
      accessibilityViewIsModal
    >
      <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">🔒</Text>
      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
        CycleIQ
      </Text>
      {phase === "locked" && (
        <>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {tx("only you get in here ✨", "Unlock to view your data.")}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.tint }]}
            onPress={unlock}
            accessibilityRole="button"
            accessibilityLabel={tx("Unlock", "Unlock")}
          >
            <Text style={[styles.buttonText, { color: theme.onTint }]}>{tx("unlock", "Unlock")}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", padding: Spacing.xxl, gap: Spacing.md, zIndex: 1000 },
  icon: { fontSize: 56 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 15, textAlign: "center" },
  button: { marginTop: Spacing.lg, paddingVertical: 16, paddingHorizontal: 48, borderRadius: Radius.pill, minHeight: 48 },
  buttonText: { fontSize: 17, fontWeight: "800" },
});
