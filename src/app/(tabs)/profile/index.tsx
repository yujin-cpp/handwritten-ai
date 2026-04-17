import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { sendEmailVerification, signOut, updateProfile } from "firebase/auth";
import { get, ref } from "firebase/database";
import { httpsCallable } from "firebase/functions";
import {
    getDownloadURL,
    ref as storageRef,
    uploadBytes,
} from "firebase/storage";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db, functions, storage } from "../../../firebase/firebaseConfig";
import { showAlert, showConfirm } from "../../../utils/alert";

// Default placeholder if no photo exists
const DEFAULT_AVATAR = "https://i.imgur.com/4YQZ6uM.png";

export default function ProfileSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // User Data State
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Personal Email OTP Modal State
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // Image Upload State
  const [imageUploading, setImageUploading] = useState(false);

  // Logout State
  const [loggingOut, setLoggingOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        const currentUser = auth.currentUser;
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
    }, []),
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
      const fileRef = storageRef(
        storage,
        `professors/${currentUser.uid}/profile.jpg`,
      );

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

  // --- PRIMARY EMAIL VERIFICATION (Firebase Auth) ---
  const handleVerifyEmail = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      setVerifying(true);
      await currentUser.reload();

      if (currentUser.emailVerified) {
        showAlert(
          "Already Verified",
          "Your email address is already verified.",
        );
        return;
      }

      await sendEmailVerification(currentUser, {
        url:
          Platform.OS === "web"
            ? window.location.origin
            : "https://handwritten-ai-scorer.firebaseapp.com",
        handleCodeInApp: false,
      });

      showAlert(
        "Verification Sent",
        `A verification link has been sent to ${currentUser.email}. Please check your inbox and spam folder.`,
      );
    } catch (error: any) {
      let msg = "Failed to send verification email.";
      if (error.code === "auth/too-many-requests")
        msg = "Too many attempts. Please wait a few minutes.";
      showAlert("Verification Error", msg);
    } finally {
      setVerifying(false);
    }
  };

  // --- PERSONAL EMAIL VERIFICATION FLOW ---

  // 1. Send OTP
  const handleVerifyPersonalEmail = async () => {
    if (!user?.personalEmail) return;
    setVerifying(true);

    try {
      const sendOtpFn = httpsCallable(functions, "sendOtpEmail");
      await sendOtpFn({ email: user.personalEmail });

      // Open the input modal
      setOtpInput("");
      setOtpModalVisible(true);
    } catch (error: any) {
      console.error(error);
      showAlert("Error", "Failed to send OTP. Try again later.");
    } finally {
      setVerifying(false);
    }
  };

  // 2. Submit OTP
  const handleSubmitOtp = async () => {
    if (otpInput.length < 6) {
      showAlert("Invalid Code", "Please enter the 6-digit code.");
      return;
    }
    setOtpLoading(true);

    try {
      const verifyFn = httpsCallable(functions, "verifyPersonalEmail");
      await verifyFn({
        email: user.personalEmail,
        otp: otpInput,
      });

      // Success! Update local state and close modal
      setOtpModalVisible(false);
      setUser((prev: any) => ({ ...prev, personalEmailVerified: true }));
      showAlert("Success", "Personal email has been verified successfully!");
    } catch (error: any) {
      console.error(error);
      showAlert("Verification Failed", error.message || "Invalid code.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogoutRequest = () => {
    showConfirm(
      "Logout",
      "Are you sure you want to log out?",
      confirmLogout,
      undefined,
      "Logout",
      "Cancel",
    );
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut(auth);
      router.replace("/");
    } catch {
      showAlert("Error", "Failed to logout.");
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#00b679" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.title}>Profile & Settings</Text>

      <View style={styles.avatarContainer}>
        <Image source={{ uri: user?.photoURL }} style={styles.profileImage} />
        {imageUploading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
        <TouchableOpacity
          style={styles.editIconContainer}
          onPress={handlePickImage}
          disabled={imageUploading}
        >
          <Feather name="camera" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile Information</Text>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{user?.name}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile/edit-name")}
          >
            <Feather name="edit-3" size={18} color="#00b679" />
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Security</Text>
        <TouchableOpacity
          style={styles.securityRow}
          onPress={() => router.push("/(tabs)/profile/change-password")}
        >
          <Text style={styles.menuText}>Change Password</Text>
          <Feather name="chevron-right" size={18} color="#999" />
        </TouchableOpacity>

        {/* Primary Email */}
        <View style={styles.securityEmail}>
          <Text style={styles.value}>{user?.email}</Text>
          {user?.emailVerified ? (
            <Text style={styles.verified}>✓ Verified</Text>
          ) : (
            <TouchableOpacity onPress={handleVerifyEmail} disabled={verifying}>
              <Text style={styles.unverified}>
                {verifying ? "Sending..." : "⚠ Unverified (Tap to verify)"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Personal Email */}
        {user?.personalEmail && (
          <View
            style={[
              styles.securityEmail,
              {
                marginTop: 12,
                borderTopWidth: 1,
                borderTopColor: "#eee",
                paddingTop: 12,
              },
            ]}
          >
            <Text style={styles.label}>Personal Email:</Text>
            <Text style={styles.value}>{user.personalEmail}</Text>

            {user.personalEmailVerified ? (
              <Text style={styles.verified}>✓ Verified</Text>
            ) : (
              <TouchableOpacity
                onPress={handleVerifyPersonalEmail}
                disabled={verifying}
              >
                <Text style={styles.unverified}>
                  {verifying ? "Sending..." : "⚠ Unverified (Tap to verify)"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.addEmailBtn}
          onPress={() => router.push("/(tabs)/profile/add-email")}
        >
          <Text style={styles.addEmailText}>
            {user?.personalEmail
              ? "Update personal email"
              : "+ Add personal email"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogoutRequest}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.logoutText}>Logout</Text>
        )}
      </TouchableOpacity>

      {/* --- OTP INPUT MODAL (Kept for custom input, but using Feather) --- */}
      <Modal
        animationType="fade"
        transparent
        visible={otpModalVisible}
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Verification Code</Text>
            <Text style={styles.modalText}>
              Enter the 6-digit code sent to{"\n"}
              {user?.personalEmail}
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              value={otpInput}
              onChangeText={setOtpInput}
              placeholderTextColor="#999"
            />

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={() => setOtpModalVisible(false)}
              >
                <Text style={styles.textCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#00b679" }]}
                onPress={handleSubmitOtp}
                disabled={otpLoading}
              >
                {otpLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.textConfirm}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fb", padding: 20 },
  center: { justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#333",
    marginBottom: 25,
  },
  avatarContainer: {
    alignSelf: "center",
    marginBottom: 15,
    position: "relative",
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#eee",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
  },
  editIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#00b679",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#f8f9fa",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginTop: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 15,
    color: "#111",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 13, color: "#888", marginBottom: 2 },
  menuText: { fontSize: 15, color: "#333", fontWeight: "500" },
  value: { fontSize: 15, fontWeight: "600", color: "#111" },
  verified: { color: "#00b679", marginTop: 5, fontWeight: "600", fontSize: 13 },
  unverified: {
    color: "#ff9500",
    marginTop: 5,
    fontWeight: "600",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  securityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 5,
  },
  securityEmail: { marginTop: 5 },
  addEmailBtn: {
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#00b679",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  addEmailText: { color: "#00b679", fontWeight: "600" },
  logoutBtn: {
    backgroundColor: "#fff",
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff3b30",
  },
  logoutText: { color: "#ff3b30", fontSize: 16, fontWeight: "600" },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalView: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111",
  },
  modalText: {
    marginBottom: 20,
    textAlign: "center",
    color: "#666",
    fontSize: 15,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 10,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonCancel: { backgroundColor: "#f5f5f5" },
  textCancel: { color: "#333", fontWeight: "600" },
  textConfirm: { color: "white", fontWeight: "600" },
  otpInput: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 25,
    fontSize: 24,
    color: "#111",
    textAlign: "center",
    letterSpacing: 10,
    width: "100%",
    borderWidth: 1,
    borderColor: "#eee",
  },
});
