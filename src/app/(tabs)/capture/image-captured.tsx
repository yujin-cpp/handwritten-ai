import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showAlert } from "../../../utils/alert";
import {
  parseImageUrisParam,
  serializeImageUrisParam,
} from "../../../utils/captureSubmission";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

export default function ImageCaptured() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const studentId = P(params.studentId);
  const className = P(params.className, "Selected Class");
  const activityName = P(params.activityName, "Selected Activity");
  const studentName = P(params.studentName, "Selected Student");

  const imageUris = useMemo(
    () => parseImageUrisParam(params.imageUris ?? params.imageUri),
    [params.imageUri, params.imageUris]
  );

  const handleRetakeLastPage = () => {
    const nextPages = imageUris.slice(0, -1);
    router.replace({
      pathname: "/(tabs)/capture/photo-taking",
      params: {
        classId,
        activityId,
        studentId,
        className,
        activityName,
        studentName,
        imageUris: serializeImageUrisParam(nextPages),
      },
    });
  };

  const handleAddAnotherPage = () => {
    router.push({
      pathname: "/(tabs)/capture/photo-taking",
      params: {
        classId,
        activityId,
        studentId,
        className,
        activityName,
        studentName,
        imageUris: serializeImageUrisParam(imageUris),
      },
    });
  };

  const handleProceed = () => {
    if (!imageUris.length) {
      showAlert("Error", "No image data found.");
      return;
    }

    if (!classId || !activityId || !studentId || classId === "0" || activityId === "0") {
      showAlert(
        "Missing Data",
        "Class or Student information was lost. Please go back and select again."
      );
      return;
    }

    router.push({
      pathname: "/(tabs)/capture/processing",
      params: {
        imageUris: serializeImageUrisParam(imageUris),
        classId,
        activityId,
        studentId,
        className,
        activityName,
        studentName,
      },
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
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Review Scan</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {activityName} • {studentName}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contextCard}>
          <Text style={styles.contextLabel}>{className}</Text>
          <Text style={styles.contextValue}>
            {imageUris.length} captured page{imageUris.length === 1 ? "" : "s"}
          </Text>
        </View>

        <View style={styles.hintContainer}>
          <Feather name="info" size={16} color="#00b679" style={{ marginRight: 8 }} />
          <Text style={styles.hint}>
            Check if all handwriting is clear and readable before grading.
          </Text>
        </View>

        <View style={styles.pageList}>
          {imageUris.length > 0 ? (
            imageUris.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.imageCard}>
                <View style={styles.imageCardHeader}>
                  <Text style={styles.pageLabel}>Page {index + 1}</Text>
                </View>
                <Image source={{ uri }} style={styles.image} resizeMode="contain" />
              </View>
            ))
          ) : (
            <View style={styles.noImage}>
              <Feather name="image" size={40} color="#333" />
              <Text style={{ color: "#666", marginTop: 10 }}>No Image Captured</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.addPageBtn} onPress={handleAddAnotherPage}>
          <Feather name="plus-circle" size={18} color="#00b679" />
          <Text style={styles.addPageText}>Add another page</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.retakeBtn, imageUris.length === 0 && { opacity: 0.5 }]}
          onPress={handleRetakeLastPage}
          disabled={imageUris.length === 0}
        >
          <Text style={styles.retakeText}>Retake Last Page</Text>
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
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, alignItems: "center" },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },

  content: {
    paddingHorizontal: 15,
    paddingTop: 18,
    paddingBottom: 180,
  },
  contextCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  contextLabel: {
    color: "#d1fae5",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  contextValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    backgroundColor: "rgba(0,182,121,0.12)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
  },
  hint: {
    color: "#00b679",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  pageList: { gap: 16 },
  imageCard: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
  },
  imageCardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0f172a",
  },
  pageLabel: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  image: {
    width: "100%",
    height: 460,
    backgroundColor: "#111",
  },
  noImage: { alignItems: "center", paddingVertical: 60 },
  addPageBtn: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#0f766e",
    borderStyle: "dashed",
    backgroundColor: "#001a14",
    paddingVertical: 16,
  },
  addPageText: {
    color: "#00b679",
    fontSize: 15,
    fontWeight: "700",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
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
    alignItems: "center",
    marginRight: 10,
  },
  retakeText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 1.4,
    backgroundColor: "#00b679",
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    elevation: 4,
  },
  confirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
