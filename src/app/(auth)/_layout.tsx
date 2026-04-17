// app/(auth)/_layout.tsx
import { Stack } from "expo-router";
import { UI_COLORS } from "../../constants/DesignTokens";

export default function AuthLayout() {
  return (
    <Stack
      initialRouteName="login"
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom",
        contentStyle: { backgroundColor: UI_COLORS.appBackground },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgotpass" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="newpass" />
      <Stack.Screen name="reset-success" />
      <Stack.Screen name="account-created" />
    </Stack>
  );
}
