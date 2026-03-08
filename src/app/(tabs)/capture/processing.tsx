import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { get, ref, update } from "firebase/database";
import { ref as storageRef, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db, storage } from "../../../firebase/firebaseConfig";
import { showAlert } from "../../../utils/alert";

export default function ProcessingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState("Initializing...");
  const spinValue = React.useRef(new Animated.Value(0)).current;

  const { classId, activityId, studentId } = params;
  const imageUri = Array.isArray(params.imageUri) ? params.imageUri[0] : params.imageUri;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    if (!imageUri || !classId || !activityId) {
      showAlert("Error", "Missing data for processing.");
      router.back();
      return;
    }

    processExam();
  }, []);

  const processExam = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      setStatus("Analyzing Paper...");
      const activityRef = ref(db, `professors/${uid}/classes/${classId}/activities/${activityId}`);
      const snapshot = await get(activityRef);

      if (!snapshot.exists()) {
        throw new Error("Activity not found in database.");
      }

      setStatus("Uploading to AI Queue...");
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const fileRef = storageRef(storage, `exams/${uid}/${classId}/${activityId}/${studentId}.jpg`);
      await uploadBytes(fileRef, blob);

      const gradePath = `professors/${uid}/classes/${classId}/students/${studentId}/activities/${activityId}`;
      await update(ref(db, gradePath), {
        status: "grading",
        gradedAt: new Date().toISOString()
      });

      showAlert(
        "Upload Successful",
        "The AI is now grading this exam in the background. You can check the results in the class list shortly.",
        () => router.replace("/(tabs)/capture")
      );

    } catch (error: any) {
      console.error("Upload Error:", error);
      showAlert(
        "Upload Failed",
        "Could not upload the image for grading. Please check your internet connection.",
        () => router.back()
      );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#00b679", "#009e60"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.headerTitle}>AI Scorer</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#00b679" style={{ transform: [{ scale: 1.5 }] }} />
          <View style={styles.iconOverlay}>
            <Feather name="cpu" size={24} color="#00b679" />
          </View>
        </View>

        <Text style={styles.title}>Processing Exam</Text>
        <Text style={styles.subtitle}>{status}</Text>

        <View style={styles.infoBox}>
          <Feather name="clock" size={16} color="#666" style={{ marginRight: 8 }} />
          <Text style={styles.hint}>
            This usually takes 5-10 seconds.
          </Text>
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Did you know?</Text>
          <Text style={styles.tipText}>
            Our AI model works best with clear, high-contrast photos of handwritten text.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    paddingHorizontal: 18,
    paddingTop: 45,
    paddingBottom: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },

  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  loaderContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  iconOverlay: {
    position: 'absolute',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8, color: "#111" },
  subtitle: {
    textAlign: "center",
    color: "#00b679",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 40,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  hint: {
    color: "#666",
    fontSize: 14,
    fontWeight: '500',
  },
  tipBox: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    right: 30,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00b679',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
  },
});
