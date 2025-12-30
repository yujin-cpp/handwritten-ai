import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AddEmail() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>Add personal email</Text>

      <Text style={styles.subtitle}>
        Enter your personal email and we{"\n"}will send you a verification link!
      </Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="princessjade.domingao@gmail.com"
        value="princessjade.domingao@gmail.com"
      />

      {/* Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sendBtn}
          onPress={() => router.push("/profile/add-email-success")}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 10,
  },
  subtitle: {
    textAlign: "center",
    color: "#555",
    marginBottom: 30,
    fontSize: 14,
  },
  label: {
    fontWeight: "600",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#1b8a50",
    borderRadius: 8,
    padding: 10,
    marginBottom: 30,
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelBtn: {
    width: "45%",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  sendBtn: {
    width: "45%",
    backgroundColor: "#1b8a50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  sendText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
