import { Stack } from "expo-router";

export default function ClassesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="addclass" />
      <Stack.Screen name="classinformation" />
      <Stack.Screen name="editclass" />
      <Stack.Screen name="masterlist" />
      <Stack.Screen name="masterlist-view-section" />
      <Stack.Screen name="activities" />
      <Stack.Screen name="activity-details" />
      <Stack.Screen name="qa" />
      <Stack.Screen name="qa-view" />
      <Stack.Screen name="essay" />
      <Stack.Screen name="essay-edit" />
      <Stack.Screen name="essay-view" />
      <Stack.Screen name="quiz-score" />
      <Stack.Screen name="uploaded-image" />
    </Stack>
  );
}
