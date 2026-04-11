import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth } from "../../firebase/firebaseConfig";
import {
  createProfessor,
  getProfessorProfile,
} from "../../services/professor.service";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const showModal = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };

  const getLoginErrorMessage = (error: any) => {
    switch (error?.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return {
          title: "Invalid Login Details",
          message:
            "The email or password you entered is incorrect. Please try again.",
        };
      case "auth/invalid-email":
        return {
          title: "Invalid Email",
          message: "Please enter a valid email address.",
        };
      default:
        return {
          title: "Login Failed",
          message:
            error?.message ||
            "Something went wrong while logging in. Please try again.",
        };
    }
  };

  const [, response, promptAsync] = Google.useAuthRequest({
    androidClientId:
      "697036998946-jvtj1jbf839cfu3lij5bu161oididnke.apps.googleusercontent.com",
    webClientId:
      "697036998946-ia341ph7pidihf3r519ltr443u2k1a5l.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token, access_token } = response.params;
      const credential = GoogleAuthProvider.credential(
        id_token || null,
        access_token || null,
      );

      handleFirebaseSignIn(credential);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const handleFirebaseSignIn = async (credential: any) => {
    try {
      setLoading(true);
      const userCred = await signInWithCredential(auth, credential);
      await checkAndCreateProfile(userCred.user);
      router.replace("/(tabs)/home");
    } catch (error: any) {
      const { title, message } = getLoginErrorMessage(error);
      showModal(title, message);
    } finally {
      setLoading(false);
    }
  };

  const checkAndCreateProfile = async (user: any) => {
    const professor = await getProfessorProfile(user.uid);
    if (!professor) {
      await createProfessor(user.uid, {
        name: user.displayName || "Professor",
        email: user.email,
      });
    }
  };

  const onGoogleButtonPress = async () => {
    if (Platform.OS === "web") {
      try {
        setLoading(true);
        const provider = new GoogleAuthProvider();
        const userCred = await signInWithPopup(auth, provider);
        await checkAndCreateProfile(userCred.user);
        router.replace("/(tabs)/home");
      } catch (error: any) {
        const { title, message } = getLoginErrorMessage(error);
        showModal(title, message);
      } finally {
        setLoading(false);
      }
    } else {
      promptAsync();
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showModal("Missing Fields", "Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      await checkAndCreateProfile(userCred.user);
      router.replace("/(tabs)/home");
    } catch (error: any) {
      const { title, message } = getLoginErrorMessage(error);
      showModal(title, message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0EA47A", "#017EBA"]} style={styles.container}>
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

        <TouchableOpacity
          style={styles.googleButton}
          onPress={onGoogleButtonPress}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={22} color="#000" />
        </TouchableOpacity>

        <Text style={styles.footer}>
          {"Don't have an account? "}
          <Text
            style={styles.link}
            onPress={() => router.push("/(auth)/signup")}
          >
            Sign Up
          </Text>
        </Text>

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Ionicons name="alert-circle-outline" size={48} color="#cc1b1b" />
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Text style={styles.modalText}>{modalMessage}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
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
  },
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
  footer: { color: "#fff", textAlign: "center" },
  link: { fontWeight: "bold", textDecorationLine: "underline" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#cc1b1b",
    marginTop: 12,
    marginBottom: 10,
    textAlign: "center",
  },
  modalText: {
    fontSize: 15,
    lineHeight: 20,
    color: "#666",
    textAlign: "center",
    marginBottom: 22,
  },
  modalButton: {
    width: "100%",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#0EA47A",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
