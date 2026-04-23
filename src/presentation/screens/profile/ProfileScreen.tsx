import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { sendEmailVerification, signOut, updateProfile } from "firebase/auth";
import { get, ref } from "firebase/database";
import { httpsCallable } from "firebase/functions";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";

import { auth, db, functions, storage } from "../../../firebase/firebaseConfig";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { showAlert, showConfirm } from "../../../utils/alert";

const DEFAULT_AVATAR = "https://i.imgur.com/4YQZ6uM.png";

export const ProfileScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: sessionUser, initializing } = useAuthSession();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        const currentUser = auth.currentUser ?? sessionUser;
        if (currentUser) {
          await currentUser.reload();
          let dbName = null;
          let personalEmail = null;
          let personalEmailVerified = false;

          try {
            const professorRef = ref(db, `professors/${currentUser.uid}`);
            const snapshot = await get(professorRef);
            if (snapshot.exists()) {
              const data = snapshot.val();
              dbName = data.name;
              personalEmail = data.personalEmail;
              personalEmailVerified = data.personalEmailVerified || false;
            }
          } catch (error) {
            console.log("Error fetching DB data:", error);
          }

          setUser({
            name: dbName || currentUser.displayName || "No Name Set",
            email: currentUser.email,
            emailVerified: currentUser.emailVerified,
            personalEmail: personalEmail,
            personalEmailVerified: personalEmailVerified,
            photoURL: currentUser.photoURL || DEFAULT_AVATAR,
          });
        }
        setLoading(false);
      };

      fetchData();
    }, [sessionUser]),
  );

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setImageUploading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const response = await fetch(uri);
      const blob = await response.blob();
      const fileRef = storageRef(storage, `professors/${currentUser.uid}/profile.jpg`);

      await uploadBytes(fileRef, blob);
      const downloadUrl = await getDownloadURL(fileRef);
      await updateProfile(currentUser, { photoURL: downloadUrl });

      setUser((prev: any) => ({ ...prev, photoURL: downloadUrl }));
      showAlert("Success", "Profile photo updated!");
    } catch (error: any) {
      showAlert("Upload Failed", error.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleVerifyEmail = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      setVerifying(true);
      await currentUser.reload();

      if (currentUser.emailVerified) {
        showAlert("Already Verified", "Your email address is already verified.");
        return;
      }

      await sendEmailVerification(currentUser);
      showAlert("Email Sent", "Verification email sent. Please check your inbox.");
    } catch (error: any) {
      let msg = error.message;
      if (error.code === "auth/too-many-requests") {
        msg = "Too many requests. Please try again later.";
      }
      showAlert("Error", msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyPersonalEmail = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !user?.personalEmail) {
      showAlert("Error", "No personal email found.");
      return;
    }
    try {
      setVerifying(true);
      const sendOtpFn = httpsCallable(functions, "sendEmailVerificationOTP");
      await sendOtpFn({ email: user.personalEmail, uid: currentUser.uid });
      setOtpModalVisible(true);
      showAlert("OTP Sent", "Check your personal email for the OTP.");
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to send OTP");
    } finally {
      setVerifying(false);
    }
  };

  const submitOtp = async () => {
    if (!otpInput) {
      showAlert("Error", "Please enter the OTP.");
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      setOtpLoading(true);
      const verifyOtpFn = httpsCallable(functions, "verifyEmailOTP");
      const result = await verifyOtpFn({ uid: currentUser.uid, otp: otpInput }) as any;

      if (result.data?.success) {
        setOtpModalVisible(false);
        setUser((prev: any) => ({ ...prev, personalEmailVerified: true }));
        showAlert("Verified", "Your personal email has been verified successfully!");
      } else {
        showAlert("Verification Failed", "Invalid OTP. Please try again.");
      }
    } catch (error: any) {
      showAlert("Error", error.message || "Verification failed");
    } finally {
      setOtpLoading(false);
      setOtpInput("");
    }
  };

  const handleLogout = async () => {
    showConfirm(
      "Log Out",
      "Are you sure you want to log out?",
      async () => {
        setLoggingOut(true);
        try {
          await signOut(auth);
          router.replace("/(auth)/login");
        } catch (error) {
          console.error("Logout failed", error);
          showAlert("Error", "Failed to log out. Please try again.");
          setLoggingOut(false);
        }
      },
      "Log Out"
    );
  };

  if (initializing || loading) {
    return (
      <View style={styles.loaderPage}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0EA47A", "#017EBA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Profile Settings</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={handlePickImage} disabled={imageUploading} style={styles.avatarContainer}>
              <Image source={{ uri: user?.photoURL || DEFAULT_AVATAR }} style={styles.avatar} />
              {imageUploading ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color={colors.white} />
                </View>
              ) : (
                <View style={styles.editBadge}>
                  <Feather name="camera" size={14} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userRole}>Professor</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account Details</Text>

        <View style={styles.card}>
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Feather name="mail" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>University Email</Text>
              <Text style={styles.settingValue}>{user?.email}</Text>
            </View>
            {user?.emailVerified ? (
              <View style={[styles.badge, styles.badgeSuccess]}>
                <Feather name="check" size={12} color={colors.white} style={{ marginRight: 4 }} />
                <Text style={styles.badgeText}>Verified</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyEmail} disabled={verifying}>
                {verifying ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.verifyBtnText}>Verify</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {user?.personalEmail && (
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Feather name="inbox" size={20} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Personal Email</Text>
                <Text style={styles.settingValue}>{user?.personalEmail}</Text>
              </View>
              {user?.personalEmailVerified ? (
                <View style={[styles.badge, styles.badgeSuccess]}>
                  <Feather name="check" size={12} color={colors.white} style={{ marginRight: 4 }} />
                  <Text style={styles.badgeText}>Verified</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyPersonalEmail} disabled={verifying}>
                  {verifying ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.verifyBtnText}>Verify</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Feather name="bell" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingValue}>Notifications</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.grayLight} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Feather name="shield" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingValue}>Privacy & Security</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.grayLight} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
          {loggingOut ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <>
              <Feather name="log-out" size={20} color={colors.danger} style={{ marginRight: 12 }} />
              <Text style={styles.logoutText}>Log Out</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Handwritten AI v1.0.0 </Text>
          <Text style={styles.versionText}> Pre-Release</Text>
        </View>
      </ScrollView>

      {/* OTP Modal */}
      <Modal visible={otpModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter OTP</Text>
            <Text style={styles.modalSubtitle}>Please check your personal email for the verification code.</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter 6-digit OTP"
              keyboardType="number-pad"
              value={otpInput}
              onChangeText={setOtpInput}
              maxLength={6}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setOtpModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitOtp} disabled={otpLoading}>
                {otpLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.modalSubmitText}>Verify</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loaderPage: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingBottom: 24, alignItems: "center", ...shadows.medium },
  headerTitle: { color: colors.white, fontSize: 18, fontFamily: typography.fontFamily.bold },
  content: { padding: 24, paddingBottom: 150 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 20, marginBottom: 24, ...shadows.soft },
  profileHeader: { flexDirection: "row", alignItems: "center" },
  avatarContainer: { position: "relative", marginRight: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.grayLight },
  avatarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 40, justifyContent: "center", alignItems: "center" },
  editBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: colors.primary, width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: colors.white },
  userInfo: { flex: 1 },
  userName: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 4 },
  userRole: { fontSize: 14, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  sectionTitle: { fontSize: 14, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, marginLeft: 8 },
  settingItem: { flexDirection: "row", alignItems: "center" },
  settingIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + "15", justifyContent: "center", alignItems: "center", marginRight: 16 },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, marginBottom: 4 },
  settingValue: { fontSize: 15, fontFamily: typography.fontFamily.bold, color: colors.text },
  verifyBtn: { backgroundColor: colors.primary + "15", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  verifyBtnText: { color: colors.primary, fontSize: 13, fontFamily: typography.fontFamily.bold },
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeSuccess: { backgroundColor: colors.primary },
  badgeText: { color: colors.white, fontSize: 12, fontFamily: typography.fontFamily.bold },
  divider: { height: 1, backgroundColor: colors.grayLight, marginVertical: 16, marginLeft: 56 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.white, paddingVertical: 18, borderRadius: 16, borderWidth: 2, borderColor: colors.danger + "33", ...shadows.soft, marginBottom: 32 },
  logoutText: { color: colors.danger, fontSize: 16, fontFamily: typography.fontFamily.bold },
  versionContainer: { alignItems: "center" },
  versionText: { fontSize: 13, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalContent: { backgroundColor: colors.white, borderRadius: 24, padding: 24, width: "100%", ...shadows.medium },
  modalTitle: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginBottom: 24, lineHeight: 20 },
  modalInput: { backgroundColor: colors.background, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, fontSize: 18, fontFamily: typography.fontFamily.bold, color: colors.text, textAlign: "center", letterSpacing: 4, marginBottom: 24 },
  modalActions: { flexDirection: "row", gap: 16 },
  modalCancel: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: colors.grayLight },
  modalCancelText: { color: colors.textSecondary, fontSize: 15, fontFamily: typography.fontFamily.bold },
  modalSubmit: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: colors.primary },
  modalSubmitText: { color: colors.white, fontSize: 15, fontFamily: typography.fontFamily.bold },
});
