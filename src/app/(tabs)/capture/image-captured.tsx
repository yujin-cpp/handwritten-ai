import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageMotion } from "../../../components/PageMotion";
import {
  UI_COLORS,
  UI_GRADIENT_PRIMARY,
} from "../../../constants/DesignTokens";
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
  const imageUri = P(params.imageUri);
  const returnTo = P(params.returnTo);
  const originName = P(params.name, "Class");
  const originSection = P(params.section, "Section");
  const originColor = P(params.color, "#00b679");
  const originTitle = P(params.title, "Activity");

  const goBackToOrigin = () => {
    if (returnTo === "quiz-score" && classId && activityId) {
      router.replace({
        pathname: "/(tabs)/classes/quiz-score",
        params: {
          classId,
          activityId,
          name: originName,
          section: originSection,
          color: originColor,
          title: originTitle,
        },
      });
      return;
    }

    router.back();
  };

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

    if (!classId || !activityId || !studentId) {
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
        background: "1",
        returnTo,
        name: originName,
        section: originSection,
        color: originColor,
        title: originTitle,
      },
    });
  };

  const headerHeight = insets.top + HEADER_HEIGHT;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={UI_GRADIENT_PRIMARY}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.header,
          { paddingTop: insets.top + 16, height: headerHeight },
        ]}
      >
        <TouchableOpacity onPress={goBackToOrigin} style={styles.backBtn}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Scan</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <PageMotion delay={40} style={styles.content}>
        <View style={styles.imageCardContainer}>
          <Text style={styles.imageLabel}>Captured Sheet</Text>
          <View style={styles.imageCard}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.noImage}>
                <Feather name="image" size={40} color="#333" />
                <Text style={{ color: "#666", marginTop: 10 }}>
                  No Image Captured
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.hintContainer}>
          <Feather
            name="info"
            size={16}
            color={UI_COLORS.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.hint}>
            Tap Continue to start AI validation. If clear, grading runs in
            background and the app auto-moves to the next student after 5
            seconds.
          </Text>
        </View>
      </PageMotion>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 104 }]}>
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
          <Text style={styles.confirmText}>Continue</Text>
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
  container: { flex: 1, backgroundColor: UI_COLORS.appBackground },

  // ── Header ─────────────────────────────────────────────
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: { padding: 4, width: 30 },
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  imageCard: {
    backgroundColor: UI_COLORS.appSurface,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8edf4",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  imageLabel: {
    color: "#52606d",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  imageList: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  imageCardContainer: {
    width: "100%",
    height: 500,
    maxHeight: "72%",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#0b1220",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1c283a",
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
    alignItems: "flex-start",
    marginTop: 18,
    backgroundColor: "#ecfff7",
    borderWidth: 1,
    borderColor: "#d5f5e7",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
  },
  hint: {
    flex: 1,
    color: "#0d7b5a",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  // ── Footer ─────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: UI_COLORS.appBackground,
  },
  retakeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#cad3df",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#fff",
  },
  retakeText: {
    color: "#4b5563",
    fontSize: 16,
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
    backgroundColor: UI_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    elevation: 3,
    shadowColor: UI_COLORS.primary,
    shadowOpacity: 0.22,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
  },
  confirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
