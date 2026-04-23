import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../components/GlassCard";
import { FloatMotion, PageMotion } from "../components/PageMotion";

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={["#0B8C70", "#0E7E99", "#14546F"]} style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.backdropOrbOne} />
      <View style={styles.backdropOrbTwo} />
      <View style={styles.backdropOrbThree} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PageMotion delay={50} style={styles.heroBlock}>
          <View style={styles.heroInner}>
            <FloatMotion amplitude={7} duration={2600}>
              <Image
                source={require("../assets/images/logo-aiscorer.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </FloatMotion>

            <View style={styles.copyBlock}>
              <Text style={styles.title}>Handwritten AI Scorer</Text>
              <Text style={styles.tagline}>Fast. Accurate. Automated.</Text>
              <Text style={styles.subline}>
                Modern grading, built for busy classrooms.
              </Text>
            </View>
          </View>
        </PageMotion>

        <PageMotion delay={180} style={styles.buttonContainer}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.buttonTouch}
            onPress={() => router.push("/(auth)/login")}
          >
            <GlassCard borderRadius={18} intensity={86}>
              <View style={styles.button}>
                <Text style={[styles.buttonText, styles.loginText]}>Login</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.buttonTouch}
            onPress={() => router.push("/(auth)/register")}
          >
            <GlassCard borderRadius={18} intensity={86}>
              <View style={styles.button}>
                <Text style={[styles.buttonText, styles.signupText]}>Sign Up</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        </PageMotion>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backdropOrbOne: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(255,255,255,0.14)",
    top: -40,
    right: -70,
  },
  backdropOrbTwo: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(255,255,255,0.08)",
    bottom: -60,
    left: -80,
  },
  backdropOrbThree: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: "34%",
    left: -50,
  },
  heroBlock: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    marginBottom: 34,
  },
  heroInner: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  logo: { width: 140, height: 140, marginBottom: 18 },
  copyBlock: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.18)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  tagline: {
    color: "rgba(255,255,255,0.96)",
    fontSize: 17,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.12)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  subline: {
    marginTop: 10,
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },

  buttonContainer: { width: "100%", gap: 14, maxWidth: 520, alignSelf: "center" },
  buttonTouch: {
    width: "100%",
  },
  button: {
    minHeight: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  loginText: { color: "#083344", fontSize: 16 },
  signupText: { color: "#083344", fontSize: 16 },
  buttonText: { fontWeight: "800", letterSpacing: 0.2 },
});
