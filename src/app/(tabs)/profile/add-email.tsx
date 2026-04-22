import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { GlassCard } from "../../../components/GlassCard";
import { PageMotion } from "../../../components/PageMotion";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// FIREBASE IMPORTS
import { ref, update } from "firebase/database";
import { auth, db } from "../../../firebase/firebaseConfig";

export default function AddEmail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    // 1. Basic Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);

      // 2. Save to Realtime Database
      // Path: professors/{uid}/personalEmail
      const professorRef = ref(db, `professors/${user.uid}`);
      await update(professorRef, {
        personalEmail: email.trim()
      });

      // 3. Navigate to Success Screen
      router.replace({
        pathname: "/(tabs)/profile/add-email-success",
        params: { email: email.trim() }
      });

    } catch (error: any) {
      Alert.alert("Error", "Failed to add email: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        <PageMotion delay={50}>
          <Text style={styles.title}>Add personal email</Text>
          <Text style={styles.subtitle}>
            Enter your personal email to store it{"\n"}as a secondary contact method.
          </Text>
        </PageMotion>

        <PageMotion delay={100}>
          <GlassCard style={{ padding: 20 }}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. jane.doe@gmail.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => router.back()}
                disabled={loading}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendBtn, loading && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.sendText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </PageMotion>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent", paddingHorizontal: 20 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 10 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1b8a50",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 30,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontWeight: "700",
    marginBottom: 8,
    color: "#333",
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: 'rgba(27, 138, 80, 0.2)',
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelBtn: {
    width: "47%",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: '#444',
  },
  sendBtn: {
    width: "47%",
    backgroundColor: "#1b8a50",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: '#1b8a50',
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  sendText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});