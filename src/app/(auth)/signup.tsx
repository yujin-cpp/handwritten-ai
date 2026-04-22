// app/(auth)/signup.tsx
import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signInWithPopup } from "firebase/auth";
import { useEffect, useState } from 'react';
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView
} from "react-native";
import { auth } from "../../firebase/firebaseConfig";
import {
  EXPO_GO_GOOGLE_AUTH_MESSAGE,
  GOOGLE_AUTH_CONFIG,
  MOBILE_GOOGLE_AUTH_SETUP_MESSAGE,
  hasNativeGoogleAuthConfig,
  isExpoGo,
} from "../../constants/googleAuth";
import { createProfessor } from "../../services/professor.service";

WebBrowser.maybeCompleteAuthSession();

export default function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const isGoogleDisabled = Platform.OS !== "web" && (!request || isExpoGo);

  // 🔹 MODAL STATE
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_AUTH_CONFIG.expoClientId || undefined,
    androidClientId: GOOGLE_AUTH_CONFIG.androidClientId || undefined,
    webClientId: GOOGLE_AUTH_CONFIG.webClientId || undefined,
    responseType: AuthSession.ResponseType.IdToken,
    shouldAutoExchangeCode: false,
    scopes: ["profile", "email"],
  });

  // 🔹 HELPER: Trigger the Popup
  const showErrorPopup = (message: string) => {
    setModalMessage(message);
    setModalVisible(true);
  };

  const getFirebaseErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return "This email is already registered. Please login instead.";
      case 'auth/invalid-email':
        return "Please enter a valid email address.";
      case 'auth/weak-password':
        return "Password should be at least 6 characters.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token, access_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token || null, access_token || null);
      handleFirebaseGoogleSignUp(credential);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const handleFirebaseGoogleSignUp = async (credential: any) => {
    try {
      const userCredential = await signInWithCredential(auth, credential);
      await createProfessor(userCredential.user.uid, {
        name: userCredential.user.displayName || "Professor",
        email: userCredential.user.email,
      });
      router.replace("/(auth)/account-created");
    } catch (err: any) {
      showErrorPopup(getFirebaseErrorMessage(err.code));
    }
  };

  const onGoogleButtonPress = async () => {
    if (Platform.OS === 'web') {
      try {
        const provider = new GoogleAuthProvider();
        const userCred = await signInWithPopup(auth, provider);
        await createProfessor(userCred.user.uid, {
          name: userCred.user.displayName || "Professor",
          email: userCred.user.email,
        });
        router.replace("/(auth)/account-created");
      } catch (err: any) {
        showErrorPopup(getFirebaseErrorMessage(err.code));
      }
    } else {
      if (!hasNativeGoogleAuthConfig) {
        showErrorPopup(MOBILE_GOOGLE_AUTH_SETUP_MESSAGE);
        return;
      }

      if (isExpoGo) {
        showErrorPopup(EXPO_GO_GOOGLE_AUTH_MESSAGE);
        return;
      }

      if (!request) {
        showErrorPopup("Google sign-in is still preparing. Try again in a moment.");
        return;
      }

      promptAsync();
    }
  };

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      showErrorPopup("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      showErrorPopup("Passwords do not match.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createProfessor(userCredential.user.uid, { name: fullName, email: email });
      router.replace("/(auth)/account-created");
    } catch (err: any) {
      showErrorPopup(getFirebaseErrorMessage(err.code));
    }
  };

  return (
    <LinearGradient colors={['#0EA47A', '#017EBA']} style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>to get started now!</Text>

      <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#ccc" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="University Email" placeholderTextColor="#ccc" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#ccc" secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#ccc" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <Text style={styles.or}>Or Signup with</Text>
      <TouchableOpacity
        style={[styles.googleButton, isGoogleDisabled && styles.googleButtonDisabled]}
        onPress={onGoogleButtonPress}
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
        Already have an account?{' '}
        <Text style={styles.link} onPress={() => router.push('/(auth)/login')}>Login Now</Text>
      </Text>
      </ScrollView>

      {/* 🔹 ERROR POPUP MODAL */}
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
  container: { flex: 1, padding: 30 },
  title: { fontSize: 28, color: "#fff", fontWeight: "bold" },
  subtitle: { fontSize: 16, color: "#fff", marginBottom: 40 },
  input: { backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 15 },
  button: { backgroundColor: "#fff", borderRadius: 8, padding: 14, alignItems: "center", marginBottom: 20 },
  buttonText: { color: "#0EA47A", fontWeight: "bold" },
  or: { color: "#fff", textAlign: "center", marginBottom: 15 },
  googleButton: { backgroundColor: "#fff", padding: 10, borderRadius: 8, alignItems: "center", marginBottom: 30 },
  googleButtonDisabled: { backgroundColor: "rgba(255,255,255,0.62)" },
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

  // 🔹 POPUP STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 10,
  },
  modalText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginVertical: 15,
    lineHeight: 20,
  },
  modalCloseButton: {
    backgroundColor: '#0EA47A',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
