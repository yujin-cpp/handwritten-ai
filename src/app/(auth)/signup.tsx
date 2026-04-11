import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";
import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { PasswordChecklist } from "../../components/auth/PasswordChecklist";
import { auth } from "../../firebase/firebaseConfig";
import { createProfessor } from "../../services/professor.service";
import { isPasswordStrong } from "../../utils/passwordRules";

WebBrowser.maybeCompleteAuthSession();

export default function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const [, response, promptAsync] = Google.useAuthRequest({
    androidClientId:
      "697036998946-jvtj1jbf839cfu3lij5bu161oididnke.apps.googleusercontent.com",
    webClientId:
      "697036998946-ia341ph7pidihf3r519ltr443u2k1a5l.apps.googleusercontent.com",
  });

  const showErrorPopup = (message: string) => {
    setModalMessage(message);
    setModalVisible(true);
  };

  const getFirebaseErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please login instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Please follow all password requirements before signing up.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token, access_token } = response.params;
      const credential = GoogleAuthProvider.credential(
        id_token || null,
        access_token || null
      );
      void handleFirebaseGoogleSignUp(credential);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const handleFirebaseGoogleSignUp = async (credential: any) => {
    try {
      setLoading(true);
      const userCredential = await signInWithCredential(auth, credential);
      await createProfessor(userCredential.user.uid, {
        name: userCredential.user.displayName || "Professor",
        email: userCredential.user.email,
      });
      router.replace("/(auth)/account-created");
    } catch (err: any) {
      showErrorPopup(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const onGoogleButtonPress = async () => {
    if (Platform.OS === "web") {
      try {
        setLoading(true);
        const provider = new GoogleAuthProvider();
        const userCred = await signInWithPopup(auth, provider);
        await createProfessor(userCred.user.uid, {
          name: userCred.user.displayName || "Professor",
          email: userCred.user.email,
        });
        router.replace("/(auth)/account-created");
      } catch (err: any) {
        showErrorPopup(getFirebaseErrorMessage(err.code));
      } finally {
        setLoading(false);
      }
    } else {
      promptAsync();
    }
  };

  const handleSignUp = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      showErrorPopup("Please fill in all fields.");
      return;
    }

    if (!isPasswordStrong(password)) {
      showErrorPopup("Please follow all password requirements before signing up.");
      return;
    }

    if (password !== confirmPassword) {
      showErrorPopup("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await Promise.all([
        createProfessor(userCredential.user.uid, {
          name: fullName,
          email,
        }),
        sendEmailVerification(userCredential.user),
      ]);

      router.replace("/(auth)/account-created");
    } catch (err: any) {
      showErrorPopup(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0EA47A", "#017EBA"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Set up your account and verify your university email to unlock the app.
          </Text>
        </View>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#97a6a0"
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={styles.input}
            placeholder="University Email"
            placeholderTextColor="#97a6a0"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#97a6a0"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#97a6a0"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <PasswordChecklist password={password} />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating account..." : "Sign Up"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.or}>Or signup with</Text>
          <TouchableOpacity
            style={[styles.googleButton, loading && styles.buttonDisabled]}
            onPress={onGoogleButtonPress}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Already have an account?{" "}
          <Text
            style={styles.link}
            onPress={() => router.push("/(auth)/login")}
          >
            Login Now
          </Text>
        </Text>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="alert-circle" size={50} color="#D32F2F" />
            <Text style={styles.modalTitle}>Registration Error</Text>
            <Text style={styles.modalText}>{modalMessage}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 34,
  },
  hero: {
    marginBottom: 22,
  },
  title: {
    fontSize: 31,
    color: "#fff",
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#e8fff5",
    lineHeight: 22,
    maxWidth: 430,
  },
  card: {
    backgroundColor: "rgba(9, 63, 52, 0.16)",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: "#063f35",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  input: {
    backgroundColor: "#f8fffb",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 14,
    color: "#14332d",
  },
  button: {
    backgroundColor: "#f8fffb",
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
    marginBottom: 18,
    shadowColor: "#0d6f59",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: { color: "#0EA47A", fontWeight: "800" },
  or: { color: "#fff", textAlign: "center", marginBottom: 14 },
  googleButton: {
    backgroundColor: "#f8fffb",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  footer: {
    color: "#fff",
    textAlign: "center",
    marginTop: 18,
  },
  link: { fontWeight: "bold", textDecorationLine: "underline" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginTop: 10,
  },
  modalText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginVertical: 15,
    lineHeight: 20,
  },
  modalCloseButton: {
    backgroundColor: "#0EA47A",
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  modalCloseButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
