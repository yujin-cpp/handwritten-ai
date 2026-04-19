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

const HEADER_HEIGHT = 70;

export default function ImageCaptured() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const studentId = P(params.studentId);
  const imageUris = useMemo(
    () => parseImageUrisParam(params.imageUris ?? params.imageUri),
    [params.imageUri, params.imageUris],
  );

  const handleRetake = () => router.back();

  const handleAddAnotherPage = () => {
    router.push({
      pathname: "/(tabs)/capture/photo-taking",
      params: {
        imageUris: serializeImageUrisParam(imageUris),
        classId,
        activityId,
        studentId,
      },
    });
  };

  const handleProceed = () => {
    if (imageUris.length === 0) {
      showAlert("Error", "No image data found.");
      return;
    }
    if (
      !classId ||
      !activityId ||
      !studentId ||
      classId === "0" ||
      activityId === "0"
    ) {
      showAlert(
        "Missing Data",
        "Class or Student information was lost. Please go back and select again.",
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
      },
    });
  };

  const headerHeight = insets.top + HEADER_HEIGHT;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#00b679", "#009e60"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.header,
          { paddingTop: insets.top + 16, height: headerHeight },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Scan</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {/* Content */}
      <View style={[styles.content, { paddingTop: headerHeight + 12 }]}>
        <ScrollView
          contentContainerStyle={styles.imageList}
          showsVerticalScrollIndicator={false}
        >
          {imageUris.length > 0 ? (
            imageUris.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.imageCard}>
                <Text style={styles.pageLabel}>Page {index + 1}</Text>
                <Image
                  source={{ uri }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>
            ))
          ) : (
            <View style={styles.noImage}>
              <Feather name="image" size={40} color="#555" />
              <Text style={styles.noImageText}>No Image Captured</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.hintContainer}>
          <Feather
            name="info"
            size={16}
            color="#00b679"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.hint}>
            Check if all handwriting is clear and readable.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
          <Text style={styles.retakeText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addPageBtn}
          onPress={handleAddAnotherPage}
        >
          <Text style={styles.addPageText}>Add page</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleProceed}>
          <Text style={styles.confirmText}>Proceed</Text>
          <Feather
            name="arrow-right"
            size={18}
            color="#fff"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  // ── Header ─────────────────────────────────────────────
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    // No backgroundColor here — LinearGradient handles it
  },
  backBtn: {
    padding: 4,
    width: 32,
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  // ── Content ────────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  imageList: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  imageCard: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 16,
  },
  pageLabel: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    padding: 14,
    backgroundColor: "#0f172a",
  },
  image: {
    width: "100%",
    height: 320,
    backgroundColor: "#111",
  },
  noImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  noImageText: {
    color: "#666",
    marginTop: 10,
    fontSize: 14,
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    backgroundColor: "rgba(0,182,121,0.1)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
  },
  hint: {
    color: "#00b679",
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 1,
  },

  // ── Footer ─────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  retakeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  retakeText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  addPageBtn: {
    flex: 1.2,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#00b679",
    backgroundColor: "#001f12",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  addPageText: {
    color: "#00b679",
    fontSize: 15,
    fontWeight: "700",
  },
  confirmBtn: {
    flex: 1.5,
    backgroundColor: "#00b679",
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  confirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
