import { Stack } from "expo-router";

export default function CycleLayout() {
  return (
    <Stack screenOptions={{ headerTitle: "Cycle Details" }}>
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/edit" options={{ headerTitle: "Edit Cycle" }} />
    </Stack>
  );
}
