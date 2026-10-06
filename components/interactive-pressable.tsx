import React, { useRef } from "react";
import { Animated, GestureResponderEvent, Platform, Pressable, StyleProp, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type HapticType = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error";

interface InteractivePressableProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: HapticType | null;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function InteractivePressable({
  children,
  onPress,
  style,
  scaleTo = 0.95,
  haptic = "light",
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: InteractivePressableProps) {
  const reduceMotion = useReducedMotion();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const triggerHaptic = async () => {
    if (disabled || !haptic || Platform.OS === "web") return;
    try {
      switch (haptic) {
        case "light":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "medium":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "heavy":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case "selection":
          await Haptics.selectionAsync();
          break;
        case "success":
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "warning":
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case "error":
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch {
      // Ignored: non-fatal if haptics fail or are unsupported
    }
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    if (disabled) return;
    triggerHaptic();
    if (reduceMotion) return;
    Animated.spring(scaleAnim, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 40,
      bounciness: 2,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
