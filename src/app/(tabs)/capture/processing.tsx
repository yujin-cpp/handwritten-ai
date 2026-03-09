import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { get, ref, update } from "firebase/database";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../../../firebase/firebaseConfig";
import { showAlert } from "../../../utils/alert";

export default function ProcessingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState("Initializing...");
  const spinValue = React.useRef(new Animated.Value(0)).current;

  const { classId, activityId, studentId } = params;
  const imageUri = Array.isArray(params.imageUri)
    ? params.imageUri[0]
    : params.imageUri;

  const processExam = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      setStatus("Loading Activity...");
      const activityRef = ref(
        db,
        `professors/${uid}/classes/${classId}/activities/${activityId}`,
      );
      const snapshot = await get(activityRef);

      if (!snapshot.exists()) throw new Error("Activity not found.");

      const activityData = snapshot.val();
      let context = "";

      // ✅ Declare answerKeyUrl with let FIRST so it can be reassigned below
      let answerKeyUrl = activityData.files
        ? (Object.values(activityData.files) as any[])[0]?.url
        : undefined;

      // For essay: pull rubric text + URL from essayInstructions
      if (activityData.essayInstructions) {
        const instructions = Object.values(
          activityData.essayInstructions,
        ) as any[];

        // ✅ Use fullInstructions (the actual text), not rubrics (just the filename)
        const rubricTexts = instructions
          .map((i: any) => i.fullInstructions)
          .filter(Boolean);

        const rubricUrls = instructions
          .map((i: any) => i.rubricsUrl)
          .filter((u: string) => u && u.startsWith("http")); // ✅ Only real URLs, not "No file attached"

        context = rubricTexts.join("\n\n");

        if (rubricUrls.length > 0 && !answerKeyUrl) {
          answerKeyUrl = rubricUrls[0];
        }
      }
      // For Q&A: if no essay context, at least note the filename
      if (!context && activityData.files) {
        const files = Object.values(activityData.files) as any[];
        context = files
          .map((f: any) => `Answer key file: ${f.name}`)
          .join("\n");
      }

      console.log("📋 Context:", context);
      console.log("📎 Answer key URL:", answerKeyUrl);

      //analyzing
      setStatus("Analyzing Handwriting...");
      const { processWithAI } = await import("../../../services/AIService");
      const result = await processWithAI(
        imageUri!,
        "grade",
        context,
        answerKeyUrl,
      );

      setStatus("Saving Results...");
      const gradePath = `professors/${uid}/classes/${classId}/students/${studentId}/activities/${activityId}`;
      await update(ref(db, gradePath), {
        status: "graded",
        score: result.score,
        feedback: result.feedback,
        confidence: result.confidence_score,
        gradingType: result.grading_type,
        transcription: result.transcribed_text,
        gradedAt: new Date().toISOString(),
      });

      router.replace({
        pathname: "/(tabs)/capture/result",
        params: {
          score: String(result.score),
          total: String(result.total ?? 100),
          feedback: result.feedback,
          classId,
          activityId,
          studentId,
        },
      });
    } catch (error: any) {
      console.error("Processing Error:", error);
      showAlert(
        "Processing Failed",
        error.message || "Could not process the exam.",
        () => router.back(),
      );
    }
  }, [classId, activityId, studentId, imageUri, router]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    ).start();

    if (!imageUri || !classId || !activityId) {
      showAlert("Error", "Missing data for processing.");
      router.back();
      return;
    }

    processExam();
  }, [imageUri, classId, activityId, processExam, router, spinValue]);

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
          <ActivityIndicator
            size="large"
            color="#00b679"
            style={{ transform: [{ scale: 1.5 }] }}
          />
          <View style={styles.iconOverlay}>
            <Feather name="cpu" size={24} color="#00b679" />
          </View>
        </View>

        <Text style={styles.title}>Processing Exam</Text>
        <Text style={styles.subtitle}>{status}</Text>

        <View style={styles.infoBox}>
          <Feather
            name="clock"
            size={16}
            color="#666"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.hint}>This usually takes 5-10 seconds.</Text>
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Did you know?</Text>
          <Text style={styles.tipText}>
            Our AI model works best with clear, high-contrast photos of
            handwritten text.
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  iconOverlay: {
    position: "absolute",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  hint: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  tipBox: {
    position: "absolute",
    bottom: 50,
    left: 30,
    right: 30,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00b679",
    marginBottom: 5,
  },
  tipText: {
    fontSize: 13,
    color: "#777",
    lineHeight: 18,
  },
});
