import { setGradingResult } from "@/src/utils/gradingStore";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { get, ref, update } from "firebase/database";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db, storage } from "../../../firebase/firebaseConfig";
import { showAlert } from "../../../utils/alert";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

const isHttpUrl = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("http");

const isPersistableProofUri = (value: unknown): value is string =>
  typeof value === "string" && /^https?:\/\//i.test(value);

const normalizeItemCount = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

type NormalizedExamSettings = {
  totalScore: number;
  professorInstructions: string;
  objectiveTypes: {
    multipleChoice: { enabled: boolean; items: number };
    trueFalse: { enabled: boolean; items: number };
    identification: { enabled: boolean; items: number };
  };
};

const normalizeExamSettings = (activityData: any): NormalizedExamSettings => {
  const savedSettings = activityData?.examSettings || {};
  const savedTypes = savedSettings?.objectiveTypes || {};

  const totalScore = Number(savedSettings?.totalScore);

  return {
    totalScore,
    professorInstructions: String(
      savedSettings?.professorInstructions || "",
    ).trim(),
    objectiveTypes: {
      multipleChoice: {
        enabled: Boolean(savedTypes?.multipleChoice?.enabled),
        items: normalizeItemCount(savedTypes?.multipleChoice?.items),
      },
      trueFalse: {
        enabled: Boolean(savedTypes?.trueFalse?.enabled),
        items: normalizeItemCount(savedTypes?.trueFalse?.items),
      },
      identification: {
        enabled: Boolean(savedTypes?.identification?.enabled),
        items: normalizeItemCount(savedTypes?.identification?.items),
      },
    },
  };
};

const buildContextPayload = (
  activityData: any,
  examSettings: NormalizedExamSettings,
) => {
  const contextParts: string[] = [];

  const essayInstructions = activityData?.essayInstructions
    ? (Object.values(activityData.essayInstructions) as any[])
    : [];

  const rubricTexts = essayInstructions
    .map((instruction: any) => instruction?.fullInstructions)
    .filter(
      (text: unknown) => typeof text === "string" && text.trim().length > 0,
    );

  if (examSettings.professorInstructions) {
    contextParts.push(
      `=== PROFESSOR INSTRUCTIONS ===\n${examSettings.professorInstructions}`,
    );
  }

  if (rubricTexts.length > 0) {
    contextParts.push(
      `=== RUBRICS / ESSAY INSTRUCTIONS ===\n${rubricTexts.join("\n\n")}`,
    );
  }

  const objectiveSummaryLines = [
    `Total exam score: ${examSettings.totalScore}`,
    `Multiple Choice: ${examSettings.objectiveTypes.multipleChoice.enabled ? "ENABLED" : "DISABLED"} (${examSettings.objectiveTypes.multipleChoice.items} items)`,
    `True/False: ${examSettings.objectiveTypes.trueFalse.enabled ? "ENABLED" : "DISABLED"} (${examSettings.objectiveTypes.trueFalse.items} items)`,
    `Identification: ${examSettings.objectiveTypes.identification.enabled ? "ENABLED" : "DISABLED"} (${examSettings.objectiveTypes.identification.items} items)`,
  ];
  contextParts.push(
    `=== OBJECTIVE EXAM SETTINGS ===\n${objectiveSummaryLines.join("\n")}`,
  );

  const objectiveFiles = activityData?.files
    ? (Object.values(activityData.files) as any[])
    : [];
  const answerKeyUrls = objectiveFiles
    .map((file: any) => file?.url)
    .filter(isHttpUrl);

  if (objectiveFiles.length > 0) {
    const fileNames = objectiveFiles
      .map(
        (file: any, index: number) =>
          `${index + 1}. ${file?.name || "Unnamed answer key"}`,
      )
      .join("\n");
    contextParts.push(`=== OBJECTIVE ANSWER KEY FILES ===\n${fileNames}`);
  }

  const referenceUrls = [
    ...essayInstructions.map((instruction: any) => instruction?.rubricsUrl),
    ...essayInstructions.map((instruction: any) => instruction?.lessonUrl),
  ].filter(isHttpUrl);

  return {
    context: contextParts.join("\n\n").trim(),
    answerKeyUrls: Array.from(new Set(answerKeyUrls)),
    referenceUrls: Array.from(new Set(referenceUrls)),
  };
};

export default function ProcessingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState("Initializing...");
  const [backgroundCountdown, setBackgroundCountdown] = useState<number | null>(
    null,
  );
  const mountedRef = React.useRef(true);
  const backgroundModeRef = React.useRef(false);

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const studentId = P(params.studentId);
  const imageUri = P(params.imageUri);
  const imageUris = useMemo<string[]>(() => {
    return params.imageUris ? JSON.parse(P(params.imageUris)) : [imageUri];
  }, [params.imageUris, imageUri]);
  const shouldAutoBackground = P(params.background) === "1";

  const safeSetStatus = useCallback((nextStatus: string) => {
    if (mountedRef.current) {
      setStatus(nextStatus);
    }
  }, []);

  const sleep = useCallback((ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }, []);

  const resolveNextStudentId = useCallback(
    async (uid: string) => {
      try {
        const studentsRef = ref(
          db,
          `professors/${uid}/classes/${classId}/students`,
        );
        const studentsSnapshot = await get(studentsRef);
        if (!studentsSnapshot.exists()) return "";

        const data = studentsSnapshot.val() || {};
        const students = Object.keys(data)
          .map((id) => ({
            id,
            name: String(data[id]?.name || ""),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (students.length === 0) return "";

        const currentIndex = students.findIndex(
          (student) => student.id === studentId,
        );
        if (currentIndex === -1) {
          return students[0]?.id || "";
        }

        return students[currentIndex + 1]?.id || "";
      } catch (error) {
        console.warn("Failed to resolve next student:", error);
        return "";
      }
    },
    [classId, studentId],
  );

  const uploadProofImage = useCallback(
    async (uid: string, sourceUri: string) => {
      const response = await fetch(sourceUri);
      if (!response.ok) {
        throw new Error("Unable to prepare proof image upload.");
      }

      const blob = await response.blob();
      const mime = blob.type || "image/jpeg";
      const extension = mime.split("/")[1] || "jpg";
      const proofPath = `grading-proofs/${uid}/${classId}/${activityId}/${studentId}/${Date.now()}.${extension}`;
      const proofRef = storageRef(storage, proofPath);

      await uploadBytes(proofRef, blob, { contentType: mime });
      return await getDownloadURL(proofRef);
    },
    [activityId, classId, studentId],
  );

  const continueInBackground = useCallback(
    (nextStudentId?: string) => {
      backgroundModeRef.current = true;

      const paramsToSend: Record<string, string> = {
        classId,
        activityId,
      };

      if (nextStudentId) {
        paramsToSend.studentId = nextStudentId;
      }

      router.replace({
        pathname: "/(tabs)/capture",
        params: paramsToSend,
      });
    },
    [activityId, classId, router],
  );

  const handleContinueNow = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      continueInBackground();
      return;
    }

    const nextStudentId = await resolveNextStudentId(uid);
    continueInBackground(nextStudentId || undefined);
  }, [continueInBackground, resolveNextStudentId]);

  const processExam = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      safeSetStatus("Loading Activity...");
      const activityRef = ref(
        db,
        `professors/${uid}/classes/${classId}/activities/${activityId}`,
      );
      const snapshot = await get(activityRef);

      if (!snapshot.exists()) throw new Error("Activity not found.");

      const activityData = snapshot.val();
      const examSettings = normalizeExamSettings(activityData);

      if (
        !Number.isFinite(examSettings.totalScore) ||
        examSettings.totalScore <= 0
      ) {
        throw new Error(
          "Please set the Total Score in Activity > Objective (Q&A) before grading this test.",
        );
      }

      const { context, answerKeyUrls, referenceUrls } = buildContextPayload(
        activityData,
        examSettings,
      );

      const gradePath = `professors/${uid}/classes/${classId}/students/${studentId}/activities/${activityId}`;

      const gradeSnapshot = await get(ref(db, gradePath));
      const existingGrade = gradeSnapshot.exists() ? gradeSnapshot.val() : {};
      const existingLatestImage = isPersistableProofUri(
        existingGrade?.latestImage,
      )
        ? existingGrade.latestImage
        : "";
      const existingImages = Array.isArray(existingGrade?.images)
        ? existingGrade.images.filter((img: unknown) =>
            isPersistableProofUri(img),
          )
        : [];

      let proofImageUrl = "";
      if (imageUri) {
        try {
          proofImageUrl = await uploadProofImage(uid, imageUri);
        } catch (error) {
          console.warn(
            "Proof upload failed; skipping local URI fallback:",
            error,
          );

          // Never persist local/blob URIs; they break when reopening proof pages.
          if (Platform.OS === "web" && imageUri.startsWith("blob:")) {
            safeSetStatus(
              "Proof upload is delayed. Grading continues while keeping previous proof images.",
            );
          }

          proofImageUrl = "";
        }
      }

      const mergedImages = Array.from(
        new Set([...(proofImageUrl ? [proofImageUrl] : []), ...existingImages]),
      );

      await update(ref(db, gradePath), {
        status: "grading",
        total: examSettings.totalScore,
        images: mergedImages,
        latestImage: proofImageUrl || existingLatestImage || "",
        gradingQueuedAt: new Date().toISOString(),
      });

      if (shouldAutoBackground && !backgroundModeRef.current) {
        const nextStudentId = await resolveNextStudentId(uid);
        for (let seconds = 5; seconds >= 1; seconds -= 1) {
          if (backgroundModeRef.current) break;

          setBackgroundCountdown(seconds);
          safeSetStatus(
            `Validation complete. Continuing in background in ${seconds}s...`,
          );
          await sleep(1000);
        }

        setBackgroundCountdown(null);
        if (!backgroundModeRef.current) {
          safeSetStatus("Opening next student while grading continues...");
          continueInBackground(nextStudentId || undefined);
        }
      }

      safeSetStatus("Analyzing Handwriting...");
      const { processWithAI } = await import("../../../services/AIService");

      const result = await processWithAI(
        imageUris,
        "grade",
        context,
        answerKeyUrls,
        referenceUrls,
        {
          totalScore: examSettings.totalScore,
          professorInstructions: examSettings.professorInstructions,
          objectiveTypes: examSettings.objectiveTypes,
        },
      );

      if (!result || typeof result.score === "undefined") {
        throw new Error("No grading result returned by AI server.");
      }

      safeSetStatus("Saving Results...");
      const resolvedTotal =
        Number.isFinite(Number(result.total)) && Number(result.total) > 0
          ? Number(result.total)
          : examSettings.totalScore;

      const essayScoreLog =
        result.essay_score_log || result.true_enough_reasoning || "";

      await update(ref(db, gradePath), {
        status: "graded",
        score: result.score,
        total: resolvedTotal,
        feedback: result.feedback,
        confidence: result.confidence_score,
        confidenceScore: result.confidence_score,
        legibility: result.legibility,
        gradingType: result.grading_type,
        verificationLog: essayScoreLog,
        transcribedText: result.transcribed_text,
        transcription: result.transcribed_text,
        essayScoreLog,
        images: mergedImages,
        latestImage: proofImageUrl || existingLatestImage || "",
        professorInstructions: examSettings.professorInstructions,
        objectiveTypes: examSettings.objectiveTypes,
        totalConfiguredScore: examSettings.totalScore,
        gradedAt: new Date().toISOString(),
      });

      setGradingResult({
        essayScoreLog,
        feedback: result.feedback ?? "",
      });

      if (!backgroundModeRef.current && mountedRef.current) {
        router.replace({
          pathname: "/(tabs)/capture/result",
          params: {
            score: String(result.score),
            total: String(resolvedTotal),
            feedback: result.feedback,
            classId,
            activityId,
            studentId,
          },
        });
      }
    } catch (error: any) {
      console.error("Processing Error:", error);
      setBackgroundCountdown(null);
      if (!backgroundModeRef.current && mountedRef.current) {
        showAlert(
          "Processing Failed",
          error.message || "Could not process the exam.",
          () => router.back(),
        );
      }
    }
  }, [
    activityId,
    classId,
    continueInBackground,
    imageUris,
    imageUri,
    resolveNextStudentId,
    router,
    safeSetStatus,
    sleep,
    shouldAutoBackground,
    studentId,
    uploadProofImage,
  ]);

  useEffect(() => {
    if (!imageUris.length || !classId || !activityId || !studentId) {
      showAlert("Error", "Missing data for processing.");
      router.back();
      return;
    }

    processExam();
  }, [activityId, classId, imageUris.length, processExam, router, studentId]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0EA47A", "#017EBA"]}
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

        {backgroundCountdown !== null ? (
          <View style={styles.validationBox}>
            <Feather name="check-circle" size={16} color="#00b679" />
            <Text style={styles.validationText}>
              Validation passed. Background processing starts in{" "}
              {backgroundCountdown}s.
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.backgroundBtn}
          onPress={handleContinueNow}
          activeOpacity={0.85}
        >
          <Feather name="minimize-2" size={16} color="#00b679" />
          <Text style={styles.backgroundBtnText}>Continue In Background</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Feather
            name="clock"
            size={16}
            color="#666"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.hint}>This usually takes 5-10 seconds.</Text>
        </View>

        <View style={[styles.tipBox, { bottom: insets.bottom + 96 }]}>
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
  container: { flex: 1, backgroundColor: "#f4f7fb" },
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
    padding: 6,
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
    marginBottom: 18,
  },
  backgroundBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#00b67933",
    backgroundColor: "#ecfff7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 18,
  },
  backgroundBtnText: {
    color: "#00b679",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  validationBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4fffa",
    borderWidth: 1,
    borderColor: "#00b67933",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  validationText: {
    color: "#0a7c56",
    fontSize: 13,
    fontWeight: "600",
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
