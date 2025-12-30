// app/(auth)/signup.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { auth } from "../../firebase/firebaseConfig";
import { createProfessor } from "../../services/professor.service";

WebBrowser.maybeCompleteAuthSession();

export default function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); 

  const [request, , promptAsync] = Google.useAuthRequest({
    androidClientId: "697036998946-jvtj1jbf839cfu3lij5bu161oididnke.apps.googleusercontent.com",
    webClientId: "697036998946-ia341ph7pidihf3r519ltr443u2k1a5l.apps.googleusercontent.com"
  });


  const handleGoogleSignUp = async () => {
    try {
      if (!request) return;
      const result = await promptAsync();

      if (result.type !== "success") return;

      const { id_token } = result.params;

      const credential = GoogleAuthProvider.credential(id_token);

      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      // Save to Realtime Database (same schema)
      await createProfessor(user.uid, {
        name: user.displayName || "Professor",
        email: user.email,
      });

      router.replace("/(auth)/account-created");
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSignUp = async () => {
  if (!fullName || !email || !password || password !== confirmPassword) {
    alert("Please complete the form correctly");
    return;
  }

  try {
    // 1️⃣ Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    // 2️⃣ Save to Realtime Database (matches your schema)
    await createProfessor(user.uid, {
      name: fullName,
      email: email,
    });

    // 3️⃣ Navigate
    router.replace("/(auth)/account-created");

  } catch (error: any) {
    alert(error.message);
  }
};

  return (
  <LinearGradient colors={['#0EA47A', '#017EBA']} style={styles.container}>
    <Text style={styles.title}>Create Account</Text>
    <Text style={styles.subtitle}>to get started now!</Text>

    <TextInput
      style={styles.input}
      placeholder="Full name"
      placeholderTextColor="#ccc"
      value={fullName}
      onChangeText={setFullName}
    />

    <TextInput
      style={styles.input}
      placeholder="University Email Address"
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
      value={password}
      onChangeText={setPassword}
    />

    <TextInput
      style={styles.input}
      placeholder="Confirm Password"
      placeholderTextColor="#ccc"
      secureTextEntry
      value={confirmPassword}
      onChangeText={setConfirmPassword}
    />

    <TouchableOpacity style={styles.button} onPress={handleSignUp}>
      <Text style={styles.buttonText}>Sign Up</Text>
    </TouchableOpacity>

    <Text style={styles.or}>Or Signup with</Text>

    <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignUp}>
      <Ionicons name="logo-google" size={22} color="#000" />
    </TouchableOpacity>

    <Text style={styles.footer}>
      Already have an account?{' '}
      <Text style={styles.link} onPress={() => router.push('/(auth)/login')}>
        Login Now
      </Text>
    </Text>
  </LinearGradient>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 30 },
  title: { fontSize: 28, color: "#fff", fontWeight: "bold" },
  subtitle: { fontSize: 16, color: "#fff", marginBottom: 40 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
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
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 30,
  },
  footer: { color: "#fff", textAlign: "center" },
  link: { fontWeight: "bold", textDecorationLine: "underline" },
});
