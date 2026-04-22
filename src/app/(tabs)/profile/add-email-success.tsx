import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { GlassCard } from "../../../components/GlassCard";
import { PageMotion } from "../../../components/PageMotion";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AddEmailSuccess() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get the email passed from the previous screen (or fallback)
  const email = params.email as string || "your email";

  // Optional: Auto-redirect after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(tabs)/profile");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <PageMotion delay={50} style={{ alignItems: 'center' }}>
        <Text style={styles.title}>Email Added!</Text>

        <View style={styles.circle}>
          <Ionicons name="checkmark" size={60} color="#0a8f6d" />
        </View>

        <Text style={styles.message}>
          A verification link has been sent to{"\n"}
          <Text style={{ fontWeight: "700", color: '#1b8a50' }}>
            {email}!
          </Text>
        </Text>

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
    padding: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#1b8a50",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 30,
    textAlign: 'center',
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
  message: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 40,
    color: "#444",
    lineHeight: 24,
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
