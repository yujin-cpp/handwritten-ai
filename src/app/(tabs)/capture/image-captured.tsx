import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showAlert } from "../../../utils/alert";

// 1. Helper to safely extract string params
const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

export default function ImageCaptured() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const studentId = P(params.studentId);
  const imageUri = P(params.imageUri);

  const handleRetake = () => {
    router.back();
  };

  const handleProceed = () => {
    if (!imageUri) {
      showAlert("Error", "No image data found.");
      return;
    }

    if (!classId || !activityId || !studentId || classId === "0" || activityId === "0") {
      showAlert(
        "Missing Data",
        "Class or Student information was lost. Please go back and select again.",
      );
      return;
    }

    router.push({
      pathname: "/(tabs)/capture/processing",
      params: { imageUri, classId, activityId, studentId },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#00b679", "#009e60"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Scan</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.noImage}>
              <Feather name="image" size={40} color="#333" />
              <Text style={{ color: "#666", marginTop: 10 }}>No Image Captured</Text>
            </View>
          )}
        </View>

        <View style={styles.hintContainer}>
          <Feather name="info" size={16} color="#00b679" style={{ marginRight: 8 }} />
          <Text style={styles.hint}>
            Check if all handwriting is clear and readable.
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
          <Text style={styles.retakeText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleProceed}>
          <Text style={styles.confirmText}>Proceed</Text>
          <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingHorizontal: 18,
    paddingTop: 45,
    paddingBottom: 25,
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backBtn: { padding: 4 },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 100,
  },
  imageContainer: {
    width: "100%",
    height: "100%",
    maxHeight: '75%',
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  noImage: { alignItems: 'center' },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    backgroundColor: 'rgba(0,182,121,0.1)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
  },
  hint: {
    color: "#00b679",
    fontSize: 13,
    fontWeight: '500',
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    paddingTop: 20,
    backgroundColor: "#000",
  },
  retakeBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#333",
    alignItems: 'center',
    marginRight: 10,
  },
  retakeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 1.5,
    backgroundColor: "#00b679",
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center',
    marginLeft: 10,
    elevation: 4,
  },
  confirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
