import { Feather, Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { AlertProvider } from "../components/AlertProvider";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...Feather.font,
    ...Ionicons.font,
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
          body {
            background-color: #f0f2f5;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
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
        <Stack screenOptions={{ headerShown: false }}>
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
    backgroundColor: "#fff",
    // Premium shadow for web "app-in-a-box" look
    ...Platform.select({
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        height: "100vh" as any,
      },
    }),
  },
});

