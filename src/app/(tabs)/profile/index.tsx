import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileSettings() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.title}>Profile & Settings</Text>

      {/* Profile Photo */}
      <Image
        source={{ uri: "https://i.imgur.com/4YQZ6uM.png" }}
        style={styles.profileImage}
      />

      {/* Profile Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile Information</Text>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>Princess Jade</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/profile/edit-name")}>
            <Ionicons name="create-outline" size={20} color="#1b8a50" />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>princessjade.domingao@g.teup.edu.ph</Text>
        </View>
      </View>

      {/* Security Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Security</Text>

        <TouchableOpacity
          style={styles.securityRow}
          onPress={() => router.push("/profile/change-password")}
        >
          {/* CHANGED THIS STYLE FROM styles.label TO styles.menuText */}
          <Text style={styles.menuText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={18} color="#333" />
        </TouchableOpacity>

        <View style={styles.securityEmail}>
          <Text style={styles.value}>princessjade.domingao@g.teup.edu.ph</Text>
          <Text style={styles.verified}>✓ Verified</Text>
        </View>

        <TouchableOpacity
          style={styles.addEmailBtn}
          onPress={() => router.push("/profile/add-email")}
        >
          <Text style={styles.addEmailText}>+ Add personal email</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => router.push("/")}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#1b8a50",
    marginBottom: 20,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignSelf: "center",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginTop: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "#f2f2f2",
  },
  cardTitle: { fontWeight: "700", fontSize: 15, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  
  label: { fontSize: 13, color: "#666" }, 
  
  menuText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },

  value: { fontSize: 14, fontWeight: "600" },
  verified: { color: "green", marginTop: 5 },
  securityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1, 
    borderBottomColor: "#eee",
    marginBottom: 10,
  },
  securityEmail: { marginTop: 3 },
  addEmailBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#139f60",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  addEmailText: { color: "#139f60", fontWeight: "600" },
  logoutBtn: {
    backgroundColor: "#cc1b1b",
    marginTop: 15,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});