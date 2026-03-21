import { Stack } from "expo-router";

export default function CycleLayout() {
  return (
    <Stack
      screenOptions={{ headerTitle: "Cycle Details", presentation: "modal" }}
    >
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/edit" options={{ headerTitle: "Edit Cycle" }} />
    </Stack>
  );
}
