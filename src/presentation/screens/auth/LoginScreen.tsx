import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithCredential } from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';

import { auth } from '../../../firebase/firebaseConfig';
import { classRepository } from '../../../data/repositories/FirebaseClassRepository'; // Just reusing a repository to ensure access to DB
import { colors, typography, shadows } from '../../theme';
import { GOOGLE_AUTH_CONFIG, hasNativeGoogleAuthConfig, isExpoGo, MOBILE_GOOGLE_AUTH_SETUP_MESSAGE, EXPO_GO_GOOGLE_AUTH_MESSAGE } from '../../../constants/googleAuth';
import { get, ref, set } from 'firebase/database';
import { db } from '../../../firebase/firebaseConfig';

export const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_AUTH_CONFIG.expoClientId || undefined,
    androidClientId: GOOGLE_AUTH_CONFIG.androidClientId || undefined,
    webClientId: GOOGLE_AUTH_CONFIG.webClientId || undefined,
    responseType: AuthSession.ResponseType.IdToken,
    shouldAutoExchangeCode: false,
    scopes: ['profile', 'email'],
  });

  const isGoogleDisabled = loading || (Platform.OS !== "web" && (!request || isExpoGo));

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, access_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token || null, access_token || null);
      handleFirebaseSignIn(credential);
    }
  }, [response]);

  const checkAndCreateProfile = async (user: any) => {
    const profRef = ref(db, `professors/${user.uid}`);
    const snapshot = await get(profRef);
    if (!snapshot.exists()) {
      await set(profRef, {
        name: user.displayName || 'Professor',
        email: user.email,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleFirebaseSignIn = async (credential: any) => {
    try {
      setLoading(true);
      const userCred = await signInWithCredential(auth, credential);
      await checkAndCreateProfile(userCred.user);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleButtonPress = async () => {
    if (Platform.OS === 'web') {
      try {
        setLoading(true);
        const provider = new GoogleAuthProvider();
        const userCred = await signInWithPopup(auth, provider);
        await checkAndCreateProfile(userCred.user);
        router.replace('/(tabs)/home');
      } catch (error: any) {
        Alert.alert('Web Login Error', error.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!hasNativeGoogleAuthConfig) return Alert.alert("Setup Required", MOBILE_GOOGLE_AUTH_SETUP_MESSAGE);
      if (isExpoGo) return Alert.alert("Unavailable", EXPO_GO_GOOGLE_AUTH_MESSAGE);
      if (!request) return Alert.alert("Please Wait", "Preparing Google Sign-In...");
      promptAsync();
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Email and password are required');
    try {
      setLoading(true);
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      await checkAndCreateProfile(userCred.user);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0EA47A', '#017EBA']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome,</Text>
          <Text style={styles.subtitle}>Glad to see you!</Text>

          <View style={styles.formGroup}>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={colors.grayLight}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.grayLight}
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.forgotPass}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            <Text style={styles.loginBtnText}>{loading ? 'Logging in...' : 'Login'}</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>Or login with</Text>

          <TouchableOpacity 
            style={[styles.googleBtn, isGoogleDisabled && styles.googleBtnDisabled]} 
            onPress={onGoogleButtonPress} 
            disabled={isGoogleDisabled}
          >
            <Ionicons name="logo-google" size={24} color={isGoogleDisabled ? colors.textSecondary : colors.text} />
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.signupText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  content: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  title: { fontSize: 36, fontFamily: typography.fontFamily.bold, color: colors.white, marginBottom: 8 },
  subtitle: { fontSize: 18, fontFamily: typography.fontFamily.medium, color: colors.white + 'CC', marginBottom: 40 },
  formGroup: { gap: 16, marginBottom: 16 },
  input: { backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, fontFamily: typography.fontFamily.medium, color: colors.text, ...shadows.soft },
  forgotPass: { alignSelf: 'flex-end', marginBottom: 32 },
  forgotText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 14 },
  loginBtn: { backgroundColor: colors.white, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 32, ...shadows.medium },
  loginBtnText: { color: colors.primary, fontSize: 18, fontFamily: typography.fontFamily.bold },
  orText: { textAlign: 'center', color: colors.white + 'CC', fontFamily: typography.fontFamily.medium, marginBottom: 24 },
  googleBtn: { backgroundColor: colors.white, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 40, ...shadows.soft },
  googleBtnDisabled: { opacity: 0.7 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: colors.white, fontFamily: typography.fontFamily.medium, fontSize: 15 },
  signupText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 15, textDecorationLine: 'underline' },
});
