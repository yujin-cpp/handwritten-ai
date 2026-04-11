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
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db, storage } from "../../../firebase/firebaseConfig";
import { showAlert } from "../../../utils/alert";
import {
  createSubmissionArtifact,
  parseImageUrisParam,
} from "../../../utils/captureSubmission";

const P = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? value[0] : (value ?? fallback);

export default function ProcessingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState("Initializing...");

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const studentId = P(params.studentId);
  const className = P(params.className, "Selected Class");
  const activityName = P(params.activityName, "Selected Activity");
  const studentName = P(params.studentName, "Selected Student");
  const imageUris = useMemo(
    () => parseImageUrisParam(params.imageUris ?? params.imageUri),
    [params.imageUri, params.imageUris],
  );

  const uploadProofPages = useCallback(
    async (uid: string, submissionId: string): Promise<string[]> => {
      const urls: string[] = [];

      for (const [index, imageUri] of imageUris.entries()) {
        setStatus(`Uploading Page ${index + 1} of ${imageUris.length}...`);
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const proofRef = storageRef(
          storage,
          `exam_pages/${uid}/${classId}/${activityId}/${studentId}/${submissionId}/page-${index + 1}.jpg`,
        );
        await uploadBytes(proofRef, blob);
        urls.push(await getDownloadURL(proofRef));
      }

      return urls;
    },
    [activityId, classId, imageUris, studentId],
  );

  const processExam = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return;
    }

    try {
      setStatus("Validating Activity...");
      const activityRef = ref(
        db,
        `professors/${uid}/classes/${classId}/activities/${activityId}`,
      );
      const snapshot = await get(activityRef);

      if (!snapshot.exists()) {
        throw new Error("Activity not found in database.");
      }

      const submissionId = Date.now().toString();
      const proofImageUrls = await uploadProofPages(uid, submissionId);

      setStatus("Preparing Multi-Page Submission...");
      const artifact = await createSubmissionArtifact(imageUris);

      const fileRef = storageRef(
        storage,
        `exams/${uid}/${classId}/${activityId}/${studentId}.${artifact.extension}`,
      );
      setStatus("Sending Submission to AI Queue...");
      await uploadBytes(fileRef, artifact.blob, {
        contentType: artifact.contentType,
      });

      const gradePath = `professors/${uid}/classes/${classId}/students/${studentId}/activities/${activityId}`;
      await update(ref(db, gradePath), {
        status: "grading",
        gradedAt: new Date().toISOString(),
        images: proofImageUrls,
        submissionId,
        submissionPageCount: imageUris.length,
      });

      showAlert(
        "Upload Successful",
        "The AI is now grading this exam in the background. You can check the results in the class list shortly.",
        () =>
          router.replace({
            pathname: "/(tabs)/capture",
            params: {
              classId,
              activityId,
              className,
              activityName,
            },
          }),
      );
    } catch (error: any) {
      console.error("Upload Error:", error);
      showAlert(
        "Upload Failed",
        "Could not upload the submission for grading. Please check your connection and try again.",
        () => router.back(),
      );
    }
  }, [
    activityId,
    activityName,
    classId,
    className,
    imageUris,
    router,
    studentId,
    uploadProofPages,
  ]);

  useEffect(() => {
    if (!imageUris.length || !classId || !activityId || !studentId) {
      showAlert("Error", "Missing data for processing.");
      router.back();
      return;
    }

    void processExam();
  }, [activityId, classId, imageUris.length, processExam, router, studentId]);

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
          <Text style={styles.infoLabel}>Class</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {className}
          </Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Activity</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {activityName}
          </Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Student</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {studentName}
          </Text>
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Submission Summary</Text>
          <Text style={styles.tipText}>
            {imageUris.length} answer page{imageUris.length === 1 ? "" : "s"}{" "}
            will be combined into one grading submission.
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
    marginBottom: 30,
  },
  infoBox: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#eef2f7",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  infoValue: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  tipBox: {
    marginTop: 24,
    width: "100%",
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
