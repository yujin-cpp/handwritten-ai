// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false }}
    >
      {/* Auth flow */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />

      {/* Main app flow */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
