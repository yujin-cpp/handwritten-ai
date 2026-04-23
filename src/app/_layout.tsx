import { Feather, Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { 
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold 
} from "@expo-google-fonts/outfit";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { AlertProvider } from "../components/AlertProvider";
import { UI_COLORS } from "../constants/DesignTokens";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...Feather.font,
    ...Ionicons.font,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    if (Platform.OS === "web") {
      const style = document.createElement("style");
      style.innerHTML = `
          html, body, #root {
            height: 100%;
          }

          body {
            background-color: ${UI_COLORS.appBackground};
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            min-height: 100dvh;
          }

          @media print {
            body * {
              visibility: hidden;
            }

            #print-area, #print-area * {
              visibility: visible;
            }

            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <AlertProvider>
      <View style={styles.webWrapper}>
        <Stack
          initialRouteName="index"
          screenOptions={{
            headerShown: false,
            animation: "fade_from_bottom",
            contentStyle: { backgroundColor: UI_COLORS.appBackground },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
    </AlertProvider>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 500 : undefined,
    alignSelf: "center",
    backgroundColor: UI_COLORS.appBackground,
    // Premium shadow for web "app-in-a-box" look
    ...Platform.select({
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        height: "100dvh" as any,
        minHeight: "100vh" as any,
      },
    }),
  },
});
