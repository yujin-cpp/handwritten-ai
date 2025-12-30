import { Ionicons } from '@expo/vector-icons';
import * as Google from "expo-auth-session/providers/google";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { auth } from '../../firebase/firebaseConfig';
import { createProfessor, getProfessorProfile } from '../../services/professor.service';

// Required for Web support
WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();

  // 🔹 STATE
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔹 GOOGLE AUTH CONFIG
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "697036998946-jvtj1jbf839cfu3lij5bu161oididnke.apps.googleusercontent.com",
    webClientId: "697036998946-ia341ph7pidihf3r519ltr443u2k1a5l.apps.googleusercontent.com",
  });

  // 🔹 HANDLE GOOGLE LOGIN RESPONSE
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithGoogle(credential);
    }
  }, [response]);

  const signInWithGoogle = async (credential: any) => {
    try {
      setLoading(true);
      // 1. Authenticate with Firebase
      const userCred = await signInWithCredential(auth, credential);
      const user = userCred.user;

      // 2. Check if Professor Profile exists
      const professor = await getProfessorProfile(user.uid);

      if (!professor) {
        // 3. If no profile (First time logging in), create one automatically
        await createProfessor(user.uid, {
            name: user.displayName || "Professor",
            email: user.email,
        });
      }

      // 4. Navigate Home
      router.replace('../(tabs)/home');
    } catch (error: any) {
      Alert.alert("Google Login Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 EMAIL/PASSWORD LOGIN
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }

    try {
      setLoading(true);

      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      const professor = await getProfessorProfile(uid);

      if (!professor) {
        Alert.alert('Account Error', 'Professor profile not found');
        return;
      }

      router.replace('../(tabs)/home');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0EA47A', '#017EBA']} style={styles.container}>
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
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity onPress={() => router.push('/(auth)/forgotpass')}>
        <Text style={styles.forgot}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.or}>Or login with</Text>

      {/* 🔹 GOOGLE BUTTON */}
      <TouchableOpacity 
        style={styles.googleButton} 
        onPress={() => promptAsync()}
        disabled={!request}
      >
        <Ionicons name="logo-google" size={22} color="#000" />
      </TouchableOpacity>

      <Text style={styles.footer}>
        Don’t have an account?{' '}
        <Text
          style={styles.link}
          onPress={() => router.push('/(auth)/signup')}
        >
          Sign Up
        </Text>
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30 },
  title: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  subtitle: { fontSize: 18, color: '#fff', marginBottom: 40 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  forgot: { color: '#fff', textAlign: 'right', marginBottom: 15 },
  button: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: { color: '#0EA47A', fontWeight: 'bold' },
  or: { color: '#fff', textAlign: 'center', marginBottom: 15 },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  footer: { color: '#fff', textAlign: 'center' },
  link: { fontWeight: 'bold', textDecorationLine: 'underline' },
});