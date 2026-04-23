import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../firebase/firebaseConfig';
import { colors, typography, shadows } from '../../theme';

export const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleResetPassword = async () => {
    if (!email) return Alert.alert('Error', 'Please enter your email address');
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Success', 'Password reset email sent! Check your inbox.');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0EA47A', '#017EBA']} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} overScrollMode="never" keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your email to receive a reset link</Text>

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
            </View>

            <TouchableOpacity style={styles.resetBtn} onPress={handleResetPassword} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.resetBtnText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  content: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  backBtn: { marginBottom: 24, alignSelf: 'flex-start' },
  title: { fontSize: 32, fontFamily: typography.fontFamily.bold, color: colors.white, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: typography.fontFamily.medium, color: colors.white + 'CC', marginBottom: 32 },
  formGroup: { marginBottom: 24 },
  input: { backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, fontFamily: typography.fontFamily.medium, color: colors.text, ...shadows.soft },
  resetBtn: { backgroundColor: colors.text, borderRadius: 16, paddingVertical: 16, alignItems: 'center', ...shadows.medium },
  resetBtnText: { color: colors.white, fontSize: 16, fontFamily: typography.fontFamily.bold },
});
