import { Stack } from 'expo-router';

export default function CaptureLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="photo-taking" />
      <Stack.Screen name="image-captured" />
      <Stack.Screen name="processing" />
      <Stack.Screen name="result" />
      <Stack.Screen name="saved" />
    </Stack>
  );
}
