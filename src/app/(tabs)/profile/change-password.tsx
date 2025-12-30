import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChangePassword() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>Change Password</Text>

      {/* Fields */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Current Password"
          secureTextEntry
        />
        <Ionicons name="eye-off-outline" size={20} color="#777" />
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="New Password"
          secureTextEntry
        />
        <Ionicons name="eye-off-outline" size={20} color="#777" />
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          secureTextEntry
        />
        <Ionicons name="eye-off-outline" size={20} color="#777" />
      </View>

      {/* Save → Navigate to password-saved page */}
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => router.push("/(tabs)/profile/password-saved")}
      >
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1b8a50",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  inputRow: {
    borderWidth: 1,
    borderColor: "#1b8a50",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  input: { flex: 1, paddingVertical: 10 },
  saveBtn: {
    backgroundColor: "#06b06f",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
