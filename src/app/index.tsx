// app/(auth)/splash.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BlurView } from 'expo-blur';
import { FloatMotion, PageMotion } from "../components/PageMotion";

export default function SplashScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={["#0EA47A", "#017EBA"]} style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.backdropOrbOne} />
      <View style={styles.backdropOrbTwo} />

      <PageMotion delay={30} style={[styles.glassContainer, styles.logoWrapContainer]}>
        <BlurView intensity={90} tint="light" style={styles.logoWrapBlur}>
          <View style={styles.logoWrapContent}>
            <FloatMotion>
              <Image
                source={require("../assets/images/logo-aiscorer.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </FloatMotion>
            <Text style={styles.title}>AI Scorer</Text>
            <Text style={styles.tagline}>Fast. Accurate. Automated.</Text>
            <Text style={styles.subline}>
              Modern grading, built for busy classrooms.
            </Text>
          </View>
        </BlurView>
      </PageMotion>

      <PageMotion delay={180} style={styles.buttonContainer}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, styles.login]}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={[styles.buttonText, styles.loginText]}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, styles.signup]}
          onPress={() => router.push("/(auth)/signup")}
        >
          <Text style={[styles.buttonText, styles.signupText]}>Sign Up</Text>
        </TouchableOpacity>
      </PageMotion>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    overflow: "hidden",
  },
  backdropOrbOne: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.12)",
    top: -50,
    right: -40,
  },
  backdropOrbTwo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.10)",
    bottom: -80,
    left: -60,
  },
  glassContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 10,
    backgroundColor: 'transparent',
  },
  logoWrapContainer: {
    marginBottom: 40,
    width: "100%",
    maxWidth: 420,
  },
  logoWrapBlur: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftColor: 'rgba(255, 255, 255, 0.6)',
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  logoWrapContent: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  logo: { width: 120, height: 120, marginBottom: 6 },
  title: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },
  tagline: { marginTop: 6, color: "rgba(255,255,255,0.95)", fontSize: 15 },
  subline: {
    marginTop: 8,
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },

  buttonContainer: { width: "100%", gap: 14, maxWidth: 420 },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  // Primary (white) button
  login: {
    backgroundColor: "#fff",
    shadowColor: "#0A5",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 2,
  },
  loginText: { color: "#0EA47A" },

  // Outline button
  signup: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  signupText: { color: "#fff" },

  buttonText: { fontWeight: "700", fontSize: 16, letterSpacing: 0.2 },
});
