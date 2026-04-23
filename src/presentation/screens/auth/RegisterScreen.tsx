import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithCredential } from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

import { auth } from '../../../firebase/firebaseConfig';
import { colors, typography, shadows } from '../../theme';
import { GOOGLE_AUTH_CONFIG, hasNativeGoogleAuthConfig, isExpoGo, MOBILE_GOOGLE_AUTH_SETUP_MESSAGE, EXPO_GO_GOOGLE_AUTH_MESSAGE } from '../../../constants/googleAuth';
import { get, ref, set } from 'firebase/database';
import { db } from '../../../firebase/firebaseConfig';

export const RegisterScreen = () => {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_AUTH_CONFIG.expoClientId || undefined,
    iosClientId: GOOGLE_AUTH_CONFIG.iosClientId || undefined,
    androidClientId: GOOGLE_AUTH_CONFIG.androidClientId || undefined,
    webClientId: GOOGLE_AUTH_CONFIG.webClientId || undefined,
    responseType: AuthSession.ResponseType.IdToken,
    shouldAutoExchangeCode: false,
    scopes: ['profile', 'email'],
  });

  const isGoogleDisabled = loading || (Platform.OS !== "web" && !request);

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, access_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token || null, access_token || null);
      handleFirebaseGoogleSignUp(credential);
    }
  }, [response]);

  const createProfile = async (uid: string, name: string, userEmail: string) => {
    const profRef = ref(db, `professors/${uid}`);
    await set(profRef, {
      name: name || 'Professor',
      email: userEmail,
      createdAt: new Date().toISOString(),
    });
  };

  const handleFirebaseGoogleSignUp = async (credential: any) => {
    try {
      setLoading(true);
      const userCred = await signInWithCredential(auth, credential);
      await createProfile(userCred.user.uid, userCred.user.displayName || 'Professor', userCred.user.email || '');
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Signup Error', error.message);
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
        await createProfile(userCred.user.uid, userCred.user.displayName || 'Professor', userCred.user.email || '');
        router.replace('/(tabs)/home');
      } catch (error: any) {
        Alert.alert('Web Signup Error', error.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!hasNativeGoogleAuthConfig) return Alert.alert("Setup Required", MOBILE_GOOGLE_AUTH_SETUP_MESSAGE);
      if (!request) return Alert.alert("Please Wait", "Preparing Google Sign-In...");
      promptAsync();
    }
  };

  const handleSignUp = async () => {
    if (!fullName || !email || !password || !confirmPassword) return Alert.alert('Error', 'All fields are required');
    if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');

    try {
      setLoading(true);
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await createProfile(userCred.user.uid, fullName, email);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0EA47A', '#017EBA']} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>to get started now!</Text>

          <View style={styles.formGroup}>
            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={colors.grayLight} value={fullName} onChangeText={setFullName} />
            <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor={colors.grayLight} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.grayLight} secureTextEntry value={password} onChangeText={setPassword} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor={colors.grayLight} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} autoCapitalize="none" />
          </View>

          <TouchableOpacity style={styles.registerBtn} onPress={handleSignUp} disabled={loading}>
            <Text style={styles.registerBtnText}>{loading ? 'Creating Account...' : 'Sign Up'}</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>Or signup with</Text>

          <TouchableOpacity style={[styles.googleBtn, isGoogleDisabled && styles.googleBtnDisabled]} onPress={onGoogleButtonPress} disabled={isGoogleDisabled}>
            <Ionicons name="logo-google" size={24} color={isGoogleDisabled ? colors.textSecondary : colors.text} />
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginText}>Login Now</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 48 },
  content: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  title: { fontSize: 36, fontFamily: typography.fontFamily.bold, color: colors.white, marginBottom: 8 },
  subtitle: { fontSize: 18, fontFamily: typography.fontFamily.medium, color: colors.white + 'CC', marginBottom: 40 },
  formGroup: { gap: 16, marginBottom: 32 },
  input: { backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, fontFamily: typography.fontFamily.medium, color: colors.text, ...shadows.soft },
  registerBtn: { backgroundColor: colors.white, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 32, ...shadows.medium },
  registerBtnText: { color: colors.primary, fontSize: 18, fontFamily: typography.fontFamily.bold },
  orText: { textAlign: 'center', color: colors.white + 'CC', fontFamily: typography.fontFamily.medium, marginBottom: 24 },
  googleBtn: { backgroundColor: colors.white, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 40, ...shadows.soft },
  googleBtnDisabled: { opacity: 0.7 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: colors.white, fontFamily: typography.fontFamily.medium, fontSize: 15 },
  loginText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 15, textDecorationLine: 'underline' },
});
