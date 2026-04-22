import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
    GoogleAuthProvider,
    signInWithCredential,
    signInWithEmailAndPassword,
    signInWithPopup, // 1. Import this for Web
} from "firebase/auth";
import { useEffect, useState } from "react";
import {
    Alert,
    Platform, // 2. Import Platform
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView,
} from "react-native";

import { auth } from "../../firebase/firebaseConfig";
import {
    EXPO_GO_GOOGLE_AUTH_MESSAGE,
    GOOGLE_AUTH_CONFIG,
    MOBILE_GOOGLE_AUTH_SETUP_MESSAGE,
    hasNativeGoogleAuthConfig,
    isExpoGo,
} from "../../constants/googleAuth";
import {
    createProfessor,
    getProfessorProfile,
} from "../../services/professor.service";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();

  // 🔹 STATE
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const isGoogleDisabled = loading || (Platform.OS !== "web" && (!request || isExpoGo));

  // 🔹 GOOGLE AUTH CONFIG (For Android/iOS)
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_AUTH_CONFIG.expoClientId || undefined,
    androidClientId: GOOGLE_AUTH_CONFIG.androidClientId || undefined,
    webClientId: GOOGLE_AUTH_CONFIG.webClientId || undefined,
    responseType: AuthSession.ResponseType.IdToken,
    shouldAutoExchangeCode: false,
    scopes: ["profile", "email"],
  });

  // 🔹 HANDLE MOBILE RESPONSE (Android/iOS Only)
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token, access_token } = response.params;

      // Create credential safely
      const credential = GoogleAuthProvider.credential(
        id_token || null,
        access_token || null,
      );

      handleFirebaseSignIn(credential);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  // 🔹 SHARED SIGN-IN LOGIC
  const handleFirebaseSignIn = async (credential: any) => {
    try {
      setLoading(true);

      // Authenticate
      const userCred = await signInWithCredential(auth, credential);
      const user = userCred.user;

      // Check/Create Profile
      await checkAndCreateProfile(user);

      // Navigate
      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("Login Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 PROFILE CHECKER
  const checkAndCreateProfile = async (user: any) => {
    const professor = await getProfessorProfile(user.uid);
    if (!professor) {
      await createProfessor(user.uid, {
        name: user.displayName || "Professor",
        email: user.email,
      });
    }
  };

  // 🔹 TRIGGER GOOGLE LOGIN
  const onGoogleButtonPress = async () => {
    if (Platform.OS === "web") {
      // ✅ WEB: Use native Popup (More reliable)
      try {
        setLoading(true);
        const provider = new GoogleAuthProvider();
        const userCred = await signInWithPopup(auth, provider);
        await checkAndCreateProfile(userCred.user);
        router.replace("/(tabs)/home");
      } catch (error: any) {
        Alert.alert("Web Login Error", error.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!hasNativeGoogleAuthConfig) {
        Alert.alert("Google Sign-In Setup Required", MOBILE_GOOGLE_AUTH_SETUP_MESSAGE);
        return;
      }

      if (isExpoGo) {
        Alert.alert("Google Sign-In Unavailable", EXPO_GO_GOOGLE_AUTH_MESSAGE);
        return;
      }

      if (!request) {
        Alert.alert("Please Wait", "Google sign-in is still preparing. Try again in a moment.");
        return;
      }

      promptAsync();
    }
  };

  // 🔹 EMAIL/PASSWORD LOGIN
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required");
      return;
    }

    try {
      setLoading(true);
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      await checkAndCreateProfile(userCred.user);
      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0EA47A", "#017EBA"]} style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
      {/* WRAP CONTENT IN VIEW FOR WEB ALIGNMENT */}
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Welcome,</Text>
        <Text style={styles.subtitle}>Glad to see you!</Text>

        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#ccc"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#ccc"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity onPress={() => router.push("/(auth)/forgotpass")}>
          <Text style={styles.forgot}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Logging in..." : "Login"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.or}>Or login with</Text>

        {/* 🔹 GOOGLE BUTTON */}
        <TouchableOpacity
          style={[styles.googleButton, isGoogleDisabled && styles.googleButtonDisabled]}
          onPress={onGoogleButtonPress} // Call our new function
          disabled={isGoogleDisabled}
        >
          <Ionicons name="logo-google" size={22} color={isGoogleDisabled ? "#6b7280" : "#000"} />
        </TouchableOpacity>
        {isExpoGo ? (
          <Text style={styles.googleHint}>
            Google sign-in needs a development build or installed Android app.
          </Text>
        ) : null}

        <Text style={styles.footer}>
          Don’t have an account?{" "}
          <Text
            style={styles.link}
            onPress={() => router.push("/(auth)/signup")}
          >
            Sign Up
          </Text>
        </Text>
      </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  contentContainer: {
    padding: 30,
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
  }, // Better for web layout
  title: { fontSize: 32, color: "#fff", fontWeight: "bold" },
  subtitle: { fontSize: 18, color: "#fff", marginBottom: 40 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  forgot: { color: "#fff", textAlign: "right", marginBottom: 15 },
  button: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: { color: "#0EA47A", fontWeight: "bold" },
  or: { color: "#fff", textAlign: "center", marginBottom: 15 },
  googleButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    marginBottom: 30,
  },
  googleButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.62)",
  },
  googleHint: {
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    marginTop: -16,
    marginBottom: 24,
  },
  footer: { color: "#fff", textAlign: "center" },
  link: { fontWeight: "bold", textDecorationLine: "underline" },
});
