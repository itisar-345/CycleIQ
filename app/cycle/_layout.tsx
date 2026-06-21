import { Stack } from "expo-router";

export default function CycleLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]/index" options={{ headerTitle: "Cycle Details" }} />
      <Stack.Screen name="[id]/edit" options={{ headerTitle: "Edit Cycle" }} />
    </Stack>
  );
}
