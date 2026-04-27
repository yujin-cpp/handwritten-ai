import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { get, ref, update } from "firebase/database";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { auth, db, storage } from "../../../firebase/firebaseConfig";
import {
  notifyExamProcessingComplete,
  notifyExamProcessingFailed,
} from "../../../services/notification.service";
import { showAlert } from "../../../utils/alert";
import { setGradingResult } from "../../../utils/gradingStore";
import { safeGoBack } from "../../../utils/navigation";

import { P } from "../../../utils/params";
import { fbPaths } from "../../../utils/firebasePaths";

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
    matching: { enabled: boolean; items: number };
    enumeration: { enabled: boolean; items: number };
  };
};

const normalizeExamSettings = (activityData: any): NormalizedExamSettings => {
  const savedSettings = activityData?.examSettings || {};
  const savedTypes = savedSettings?.objectiveTypes || {};
  return {
    totalScore: Number(savedSettings?.totalScore) || 0,
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
      matching: {
        enabled: Boolean(savedTypes?.matching?.enabled),
        items: normalizeItemCount(savedTypes?.matching?.items),
      },
      enumeration: {
        enabled: Boolean(savedTypes?.enumeration?.enabled),
        items: normalizeItemCount(savedTypes?.enumeration?.items),
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
    ? Object.values(activityData.essayInstructions)
    : [];
  const rubricTexts = essayInstructions
    .map((i: any) => i?.fullInstructions)
    .filter((t: unknown) => typeof t === "string" && t.trim().length > 0);

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

  const obj = examSettings.objectiveTypes;
  const typeEntries = [
    { key: "multipleChoice", label: "Multiple Choice" },
    { key: "trueFalse", label: "True/False" },
    { key: "identification", label: "Identification" },
    { key: "matching", label: "Matching Type" },
    { key: "enumeration", label: "Enumeration" },
  ];
  const typeLines = typeEntries
    .map(({ key, label }) => {
      const t = (obj as any)[key];
      if (!t) return `${label}: DISABLED (0 items)`;
      return `${label}: ${t.enabled ? "ENABLED" : "DISABLED"} (${t.items} items)`;
    })
    .join("\n");
  contextParts.push(
    `=== OBJECTIVE EXAM SETTINGS ===\nTotal exam score: ${examSettings.totalScore}\n${typeLines}`,
  );

  const objectiveFiles = activityData?.files
    ? Object.values(activityData.files)
    : [];
  const answerKeyUrls = objectiveFiles
    .map((f: any) => f?.url)
    .filter(isHttpUrl);

  if (objectiveFiles.length > 0) {
    contextParts.push(
      `=== OBJECTIVE ANSWER KEY FILES ===\n${objectiveFiles.map((f: any, idx) => `${idx + 1}. ${f?.name || "Unnamed key"}`).join("\n")}`,
    );
  }

  // Collect all reference URLs including multi-file lessonUrls
  const allLessonUrls = essayInstructions.flatMap((i: any) => {
    const urls: string[] = [];
    if (Array.isArray(i?.lessonUrls)) urls.push(...i.lessonUrls);
    else if (i?.lessonUrl) urls.push(i.lessonUrl);
    return urls;
  });
  const allRubricsUrls = essayInstructions.map((i: any) => i?.rubricsUrl);
  const referenceUrls = [...allRubricsUrls, ...allLessonUrls].filter(isHttpUrl);
  return {
    context: contextParts.join("\n\n").trim(),
    answerKeyUrls: Array.from(new Set(answerKeyUrls)),
    referenceUrls: Array.from(new Set(referenceUrls)),
  };
};

export const ProcessingScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState("Initializing...");
  const [backgroundCountdown, setBackgroundCountdown] = useState<number | null>(
    null,
  );
  const mountedRef = React.useRef(true);
  const backgroundModeRef = React.useRef(false);
  const isProcessingRef = React.useRef(false);
  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const studentId = P(params.studentId);
  const imageUri = P(params.imageUri);
  const imageUris = useMemo<string[]>(
    () => (params.imageUris ? JSON.parse(P(params.imageUris)) : [imageUri]),
    [params.imageUris, imageUri],
  );
  const shouldAutoBackground = P(params.background) === "1";

  // Cache nav params in a ref so processExam doesn't re-create on every render
  const navParamsRef = React.useRef({
    name: P(params.name),
    section: P(params.section),
    color: P(params.color),
    title: P(params.title),
  });
  navParamsRef.current = {
    name: P(params.name),
    section: P(params.section),
    color: P(params.color),
    title: P(params.title),
  };

  const safeSetStatus = useCallback((nextStatus: string) => {
    if (mountedRef.current) setStatus(nextStatus);
  }, []);
  const sleep = useCallback(
    (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
    [],
  );

  const resolveNextStudentId = useCallback(
    async (uid: string) => {
      try {
        const snapshot = await get(ref(db, fbPaths.students(uid, classId)));
        if (!snapshot.exists()) return "";
        const data = snapshot.val() || {};
        const students = Object.keys(data)
          .map((id) => ({ id, name: String(data[id]?.name || "") }))
          .sort((a, b) => a.name.localeCompare(b.name));
        if (students.length === 0) return "";
        const currentIndex = students.findIndex((s) => s.id === studentId);
        return currentIndex === -1
          ? students[0]?.id || ""
          : students[currentIndex + 1]?.id || "";
      } catch {
        return "";
      }
    },
    [classId, studentId],
  );

  const uploadProofImage = useCallback(
    async (uid: string, sourceUri: string) => {
      const response = await fetch(sourceUri);
      if (!response.ok)
        throw new Error("Unable to prepare proof image upload.");
      const blob = await response.blob();
      const mime = blob.type || "image/jpeg";
      const extension = mime.split("/")[1] || "jpg";
      const proofRef = storageRef(
        storage,
        `grading-proofs/${uid}/${classId}/${activityId}/${studentId}/${Date.now()}.${extension}`,
      );
      await uploadBytes(proofRef, blob, { contentType: mime });
      return await getDownloadURL(proofRef);
    },
    [activityId, classId, studentId],
  );

  const continueInBackground = useCallback(
    (nextStudentId?: string) => {
      backgroundModeRef.current = true;
      router.replace({
        pathname: "/(tabs)/capture",
        params: {
          classId,
          activityId,
          ...(nextStudentId ? { studentId: nextStudentId } : {}),
        },
      });
    },
    [activityId, classId, router],
  );

  const processExam = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      safeSetStatus("Loading Activity...");
      const snapshot = await get(
        ref(db, fbPaths.activity(uid, classId, activityId)),
      );
      if (!snapshot.exists()) throw new Error("Activity not found.");

      const activityData = snapshot.val();
      const examSettings = normalizeExamSettings(activityData);
      if (
        !Number.isFinite(examSettings.totalScore) ||
        examSettings.totalScore <= 0
      )
        throw new Error("Please set the Total Score before grading.");

      const { context, answerKeyUrls, referenceUrls } = buildContextPayload(
        activityData,
        examSettings,
      );
      const gradePath = fbPaths.grade(uid, classId, studentId, activityId);
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
        } catch {
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
        undefined,
        safeSetStatus,
      );

      if (!result || typeof result.score === "undefined")
        throw new Error("No grading result returned by AI server.");

      safeSetStatus("Saving Results...");
      const resolvedTotal =
        Number.isFinite(Number(result.total)) && Number(result.total) > 0
          ? Number(result.total)
          : examSettings.totalScore;
      const essayScoreLog =
        result.essay_score_log || result.true_enough_reasoning || "";
      const objectiveScoreLog = result.objective_score_log || "";

      // Only mark as fully graded if doing background auto-grading.
      // Otherwise, mark it as needs_review so the professor can confirm it.
      const finalStatus =
        !backgroundModeRef.current && mountedRef.current
          ? "needs_review"
          : "graded";

      await update(ref(db, gradePath), {
        status: finalStatus,
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
        objectiveScoreLog,
        images: mergedImages,
        latestImage: proofImageUrl || existingLatestImage || "",
        professorInstructions: examSettings.professorInstructions,
        objectiveTypes: examSettings.objectiveTypes,
        totalConfiguredScore: examSettings.totalScore,
        gradedAt: new Date().toISOString(),
      });

      if (backgroundModeRef.current || !mountedRef.current) {
        try {
          await notifyExamProcessingComplete({
            studentName: navParamsRef.current.name,
            activityTitle: navParamsRef.current.title,
            score: Number(result.score),
            total: resolvedTotal,
          });
        } catch (notifyError) {
          console.warn("Could not send completion notification", notifyError);
        }
      }

      setGradingResult({
        essayScoreLog,
        objectiveScoreLog,
        feedback: result.feedback ?? "",
      });

      if (!backgroundModeRef.current && mountedRef.current) {
        const np = navParamsRef.current;
        router.replace({
          pathname: "/(tabs)/capture/result",
          params: {
            score: String(result.score),
            total: String(resolvedTotal),
            feedback: result.feedback,
            classId,
            activityId,
            studentId,
            name: np.name,
            section: np.section,
            color: np.color,
            title: np.title,
          },
        });
      }
    } catch (error: any) {
      console.error("Processing Error:", error);
      setBackgroundCountdown(null);
      if (backgroundModeRef.current || !mountedRef.current) {
        try {
          await notifyExamProcessingFailed({
            studentName: navParamsRef.current.name,
            activityTitle: navParamsRef.current.title,
          });
        } catch (notifyError) {
          console.warn("Could not send failure notification", notifyError);
        }
      }
      if (!backgroundModeRef.current && mountedRef.current)
        showAlert(
          "Processing Failed",
          error.message || "Could not process the exam.",
          () => safeGoBack(router, "/(tabs)/capture"),
        );
    } finally {
      isProcessingRef.current = false;
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
      safeGoBack(router, "/(tabs)/capture");
      return;
    }
    // Guard: only run once per mount
    processExam();
  }, []);

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
          <ActivityIndicator size={64} color={colors.primary} />
          <View style={styles.iconOverlay}>
            <Feather name="cpu" size={24} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>Processing Exam</Text>
        <Text style={styles.subtitle}>{status}</Text>

        {backgroundCountdown !== null && (
          <View style={styles.validationBox}>
            <Feather name="check-circle" size={16} color={colors.primary} />
            <Text style={styles.validationText}>
              Validation passed. Background processing starts in{" "}
              {backgroundCountdown}s.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.backgroundBtn}
          onPress={() => continueInBackground()}
          activeOpacity={0.85}
        >
          <Feather name="minimize-2" size={16} color={colors.primary} />
          <Text style={styles.backgroundBtnText}>Continue In Background</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Feather
            name="clock"
            size={16}
            color={colors.textSecondary}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.hint}>This usually takes 5-10 seconds.</Text>
        </View>
        {status.startsWith("Failed:") && (
          <View style={{ marginTop: 24, gap: 12, width: "100%" }}>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                safeSetStatus("Initializing...");
                processExam();
              }}
            >
              <Feather name="refresh-cw" size={20} color={colors.white} />
              <Text style={styles.retryText}>Retry Grading</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => safeGoBack(router, "/(tabs)/capture")}
            >
              <Text style={styles.cancelText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.medium,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  loaderContainer: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  iconOverlay: {
    position: "absolute",
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 24,
    ...shadows.soft,
  },
  title: {
    fontSize: 24,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  validationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "15",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 32,
  },
  validationText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
    marginLeft: 8,
  },
  backgroundBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
    ...shadows.soft,
  },
  backgroundBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: typography.fontFamily.bold,
    textTransform: "uppercase",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.grayLight,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: typography.fontFamily.medium,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  retryText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: typography.fontFamily.bold,
    marginLeft: 8,
  },
  cancelBtn: { paddingVertical: 16, alignItems: "center" },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontFamily: typography.fontFamily.medium,
  },
});
