import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditProfile() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>Edit Profile</Text>

      <Image
        source={{ uri: "https://i.imgur.com/4YQZ6uM.png" }}
        style={styles.profileImage}
      />

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value="Princess Jade" />

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => router.push("/profile/name-saved")}
        >
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: "#1b8a50",
    marginTop: 30,
    marginBottom: 15,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignSelf: "center",
    marginVertical: 20,
  },
  label: { fontSize: 14, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#1b8a50",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: "#06b06f",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
