import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { httpsCallable } from "firebase/functions";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { PasswordChecklist } from "../../components/auth/PasswordChecklist";
import { functions } from "../../firebase/firebaseConfig";
import { isPasswordStrong } from "../../utils/passwordRules";

export default function NewPassword() {
  const router = useRouter();
  const { email, otp } = useLocalSearchParams<{ email: string; otp: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    message: "",
    isError: false,
    icon: "checkmark-circle-outline" as any,
  });

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      showModal(
        "Missing Fields",
        "Please enter and confirm your new password.",
        true
      );
      return;
    }

    if (password !== confirmPassword) {
      showModal("Mismatch", "Passwords do not match.", true);
      return;
    }

    if (!isPasswordStrong(password)) {
      showModal(
        "Weak Password",
        "Please follow the password requirements before resetting your password.",
        true
      );
      return;
    }

    setLoading(true);
    try {
      const resetFn = httpsCallable(functions, "resetPasswordWithOtp");

      await resetFn({
        email,
        otp,
        newPassword: password,
      });

      showModal("Success", "Your password has been reset successfully!", false);

      setTimeout(() => {
        setModalVisible(false);
        router.replace("/(auth)/reset-success");
      }, 1500);
    } catch (error: any) {
      console.error(error);
      let msg = error.message || "Failed to reset password.";

      if (msg.includes("Invalid code") || msg.includes("Incorrect code")) {
        msg = "The verification code is incorrect.";
      } else if (msg.includes("Code expired")) {
        msg = "The code has expired. Please request a new one.";
      }

      showModal("Reset Failed", msg, true);
    } finally {
      setLoading(false);
    }
  };

  const showModal = (title: string, message: string, isError: boolean) => {
    setModalContent({
      title,
      message,
      isError,
      icon: isError ? "alert-circle-outline" : "checkmark-circle-outline",
    });
    setModalVisible(true);
  };

  return (
    <LinearGradient colors={["#0EA47A", "#017EBA"]} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Create a stronger password for your account.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter New Password"
            placeholderTextColor="#7f948d"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            placeholderTextColor="#7f948d"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <PasswordChecklist password={password} />

          <TouchableOpacity
            style={styles.button}
            onPress={handleUpdatePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0EA47A" size="small" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </View>

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Ionicons
                name={modalContent.icon}
                size={45}
                color={modalContent.isError ? "#cc1b1b" : "#1b8a50"}
                style={{ marginBottom: 15 }}
              />
              <Text
                style={[
                  styles.modalTitle,
                  { color: modalContent.isError ? "#cc1b1b" : "#333" },
                ]}
              >
                {modalContent.title}
              </Text>
              <Text style={styles.modalText}>{modalContent.message}</Text>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: modalContent.isError
                      ? "#cc1b1b"
                      : "#1b8a50",
                  },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingBottom: 50,
  },
  backBtn: { flexDirection: "row", alignItems: "center" },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 5,
  },
  title: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#e8fff5",
    textAlign: "center",
    marginBottom: 26,
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
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    alignSelf: "stretch",
  },
  buttonText: { color: "#0EA47A", fontWeight: "800" },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  modalText: {
    marginBottom: 25,
    textAlign: "center",
    color: "#666",
    fontSize: 15,
    lineHeight: 20,
  },
  modalButton: {
    borderRadius: 10,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: { color: "white", fontWeight: "bold" },
});
