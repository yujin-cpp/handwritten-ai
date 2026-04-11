import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function VerificationNoticeCard() {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Feather name="mail" size={18} color="#0EA47A" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Account</Text>
        <Text style={styles.body}>
          Protected actions are disabled until your university email is verified.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/(tabs)/profile")}
      >
        <Text style={styles.buttonText}>Open Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f4fbf8",
    borderWidth: 1,
    borderColor: "#d4f3e4",
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  content: {
    marginBottom: 14,
  },
  title: {
    color: "#14532d",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  body: {
    color: "#4b5563",
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#0EA47A",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
