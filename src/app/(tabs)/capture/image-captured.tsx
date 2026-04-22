import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { GlassCard } from "../../../components/GlassCard";
import { PageMotion } from "../../../components/PageMotion";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    UI_COLORS,
    UI_GRADIENT_PRIMARY,
} from "../../../constants/DesignTokens";
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

  const handleRetake = () => {
    router.back();
  };

  const handleProceed = () => {
    if (!imageUri) {
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
        imageUri,
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={UI_GRADIENT_PRIMARY}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <TouchableOpacity onPress={goBackToOrigin} style={styles.backBtn}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Scan</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 150 }]} showsVerticalScrollIndicator={false}>
        <PageMotion delay={40}>
          <GlassCard>
            <View style={{ padding: 14 }}>
              <Text style={styles.imageLabel}>Captured Sheet</Text>
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
                    <Text style={{ color: "#666", marginTop: 10 }}>
                      No Image Captured
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </GlassCard>
        </PageMotion>

        <PageMotion delay={80}>
          <GlassCard style={{ marginTop: 18 }}>
            <View style={{ padding: 15, flexDirection: 'row', alignItems: 'flex-start' }}>
              <Feather
                name="info"
                size={16}
                color={UI_COLORS.primary}
                style={{ marginRight: 10, marginTop: 2 }}
              />
              <Text style={styles.hint}>
                Tap Continue to start AI validation. If clear, grading runs in
                background and the app auto-moves to the next student after 5
                seconds.
              </Text>
            </View>
          </GlassCard>
        </PageMotion>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
          <Text style={styles.retakeText}>Retake</Text>
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
  container: { flex: 1, backgroundColor: "transparent" },

  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 45,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: { padding: 4, width: 30 },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  imageLabel: {
    color: "#52606d",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  imageContainer: {
    width: "100%",
    height: 450,
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
    height: "100%",
  },
  noImage: { alignItems: "center" },
  hint: {
    flex: 1,
    color: "#0d7b5a",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: 'transparent',
  },
  retakeBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#cad3df",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
  },
  retakeText: {
    color: "#4b5563",
    fontSize: 16,
    fontWeight: "600",
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
