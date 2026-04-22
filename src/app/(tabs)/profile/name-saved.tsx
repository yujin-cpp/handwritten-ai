import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { GlassCard } from "../../../components/GlassCard";
import { PageMotion } from "../../../components/PageMotion";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NameSaved() {
  const insets = useSafeAreaInsets();

  // Optional: Auto-redirect after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(tabs)/profile");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <PageMotion delay={50} style={{ alignItems: 'center' }}>
        <View style={styles.circle}>
          <Ionicons name="checkmark" size={60} color="#0a8f6d" />
        </View>

        <Text style={styles.text}>Name Updated{"\n"}Successfully!</Text>

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.replace("/(tabs)/profile")}
        >
          <Text style={styles.doneText}>Return to Profile</Text>
        </TouchableOpacity>
      </PageMotion>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    padding: 20,
  },
  circle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(199, 248, 228, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#c7f8e4',
  },
  text: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 60,
    color: "#1b8a50",
    lineHeight: 34,
  },
  doneBtn: {
    backgroundColor: "#06b06f",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#06b06f',
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  doneText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});