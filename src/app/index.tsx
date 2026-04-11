import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SplashScreen() {
  const router = useRouter();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(16)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(12)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(14)).current;
  const orbScale = useRef(new Animated.Value(0.96)).current;
  const orbFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(orbScale, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslateY, {
            toValue: 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(180),
        Animated.parallel([
          Animated.timing(buttonsOpacity, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(buttonsTranslateY, {
            toValue: 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orbFloat, {
          toValue: -5,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbFloat, {
          toValue: 5,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [
    buttonsOpacity,
    buttonsTranslateY,
    logoOpacity,
    logoTranslateY,
    orbFloat,
    orbScale,
    titleOpacity,
    titleTranslateY,
  ]);

  return (
    <LinearGradient colors={["#0EA47A", "#017EBA"]} style={styles.container}>
      <StatusBar style="light" />

      <Animated.View
        style={[
          styles.orbLarge,
          {
            transform: [{ scale: orbScale }, { translateY: orbFloat }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orbSmall,
          {
            transform: [{ translateY: Animated.multiply(orbFloat, -0.7) }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslateY }],
          },
        ]}
      >
        <View style={styles.logoHalo}>
          <Image
            source={require("../assets/images/logo-aiscorer.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.copyWrap,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        <Text style={styles.title}>AI Scorer</Text>
        <Text style={styles.tagline}>Fast. Accurate. Automated.</Text>
        <Text style={styles.caption}>
          Grade handwritten work with a cleaner, guided scoring workflow.
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonsOpacity,
            transform: [{ translateY: buttonsTranslateY }],
          },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, styles.login]}
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.9}
        >
          <Text style={[styles.buttonText, styles.loginText]}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, styles.signup]}
          onPress={() => router.push("/(auth)/signup")}
          activeOpacity={0.9}
        >
          <Text style={[styles.buttonText, styles.signupText]}>Sign Up</Text>
        </TouchableOpacity>
      </Animated.View>
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
  orbLarge: {
    position: "absolute",
    top: 100,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  orbSmall: {
    position: "absolute",
    right: -30,
    bottom: 140,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 18,
  },
  logoHalo: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 148,
    height: 148,
  },
  copyWrap: {
    alignItems: "center",
    marginBottom: 34,
    maxWidth: 420,
  },
  title: {
    fontSize: 31,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  tagline: {
    marginTop: 8,
    color: "rgba(255,255,255,0.96)",
    fontSize: 16,
    fontWeight: "700",
  },
  caption: {
    marginTop: 10,
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 300,
  },
  buttonContainer: {
    width: "100%",
    gap: 14,
    maxWidth: 420,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  login: {
    backgroundColor: "#fff",
    shadowColor: "#0a6a57",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  loginText: { color: "#0EA47A" },
  signup: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  signupText: { color: "#fff" },
  buttonText: { fontWeight: "800", fontSize: 16 },
});
