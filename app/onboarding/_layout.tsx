import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pcos" />
      <Stack.Screen name="endo" />
      <Stack.Screen name="consent" />
    </Stack>
  );
}
