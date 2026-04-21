import { Stack } from "expo-router";
import { UI_COLORS } from "../../../constants/DesignTokens";

export default function AnalyticsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom",
        contentStyle: { backgroundColor: UI_COLORS.appBackground },
      }}
    >
      <Stack.Screen name="index" /> {/* Main screen */}
    </Stack>
  );
}
