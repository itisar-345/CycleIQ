import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="goal" />
      <Stack.Screen name="cycle-history" />
      <Stack.Screen name="index" />
      <Stack.Screen name="pcos" />
      <Stack.Screen name="pcod" />
      <Stack.Screen name="endo" />
      <Stack.Screen name="consent" />
    </Stack>
  );
}
