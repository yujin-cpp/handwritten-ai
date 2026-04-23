import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { showAlert } from "../../../utils/alert";
import { storageRepository } from "../../../data/repositories/FirebaseStorageRepository";
import { safeGoBack } from "../../../utils/navigation";

// Quick Firebase imports for settings
import { onValue, push, ref, set, update } from "firebase/database";
import { db } from "../../../firebase/firebaseConfig";

const P = (v: string | string[] | undefined, fb = "") => Array.isArray(v) ? v[0] : (v ?? fb);

type QAFile = { id: string; name: string; url: string; type?: string };
type ExamTypeKey = "multipleChoice" | "trueFalse" | "identification" | "matching" | "enumeration";
type ObjectiveTypeState = Record<ExamTypeKey, { enabled: boolean; items: string }>;

const EXAM_TYPE_KEYS: ExamTypeKey[] = ["multipleChoice", "trueFalse", "identification", "matching", "enumeration"];

const createDefaultObjectiveTypes = (): ObjectiveTypeState => ({
  multipleChoice: { enabled: true, items: "0" },
  trueFalse: { enabled: false, items: "0" },
  identification: { enabled: false, items: "0" },
  matching: { enabled: false, items: "0" },
  enumeration: { enabled: false, items: "0" },
});

const parsePositiveInt = (value: string) => {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const examTypeLabelMap: Record<ExamTypeKey, string> = {
  multipleChoice: "Multiple Choice",
  trueFalse: "True/False",
  identification: "Identification",
  matching: "Matching Type",
  enumeration: "Enumeration",
};

export const QAScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { uid } = useAuthSession();

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, colors.primary);
  const title = P(params.title, "Activity");

  const [qaFiles, setQaFiles] = useState<QAFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [totalScore, setTotalScore] = useState("");
  const [professorInstructions, setProfessorInstructions] = useState("");
  const [objectiveTypes, setObjectiveTypes] = useState<ObjectiveTypeState>(createDefaultObjectiveTypes());

  useEffect(() => {
    if (!uid || !classId || !activityId) return;

    const activityRef = ref(db, `professors/${uid}/classes/${classId}/activities/${activityId}`);
    const unsubscribe = onValue(activityRef, (snapshot) => {
      if (!snapshot.exists()) {
        setQaFiles([]);
        setTotalScore("");
        setProfessorInstructions("");
        setObjectiveTypes(createDefaultObjectiveTypes());
        setLoading(false);
        return;
      }

      const activityData = snapshot.val() || {};
      const filesData = activityData.files || {};
      const loadedFiles = Object.keys(filesData).map((key) => ({
        id: key,
        name: filesData[key].name,
        url: filesData[key].url,
        type: filesData[key].type,
      }));

      const savedSettings = activityData.examSettings || {};
      const savedTypes = savedSettings.objectiveTypes || {};

      setQaFiles(loadedFiles);
      setTotalScore(savedSettings.totalScore ? String(savedSettings.totalScore) : "");
      setProfessorInstructions(savedSettings.professorInstructions || "");
      const loaded: ObjectiveTypeState = {} as ObjectiveTypeState;
      for (const key of EXAM_TYPE_KEYS) {
        loaded[key] = {
          enabled: savedTypes[key]?.enabled ?? (key === "multipleChoice"),
          items: String(savedTypes[key]?.items ?? 0),
        };
      }
      setObjectiveTypes(loaded);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activityId, classId, uid]);

  const saveExamSettings = async () => {
    if (!uid || !classId || !activityId) {
      showAlert("Error", "Missing class/activity information.");
      return;
    }

    const parsedTotalScore = parsePositiveInt(totalScore);
    if (parsedTotalScore <= 0) {
      showAlert("Missing Total Score", "Please enter the total exam score for this test.");
      return;
    }

    const normalizedTypes: Record<ExamTypeKey, { enabled: boolean; items: number }> = {} as any;
    for (const key of EXAM_TYPE_KEYS) {
      normalizedTypes[key] = { enabled: objectiveTypes[key].enabled, items: parsePositiveInt(objectiveTypes[key].items) };
    }

    const enabledTypes = (Object.keys(normalizedTypes) as ExamTypeKey[]).filter((key) => normalizedTypes[key].enabled);

    if (enabledTypes.length === 0) {
      showAlert("No Exam Type Enabled", "Enable at least one objective exam type.");
      return;
    }

    const invalidType = enabledTypes.find((key) => normalizedTypes[key].items <= 0);
    if (invalidType) {
      showAlert("Missing Item Count", `Set the number of items for ${examTypeLabelMap[invalidType]}.`);
      return;
    }

    try {
      setSavingSettings(true);
      await update(ref(db, `professors/${uid}/classes/${classId}/activities/${activityId}`), {
        examSettings: {
          totalScore: parsedTotalScore,
          professorInstructions: professorInstructions.trim(),
          objectiveTypes: normalizedTypes,
          updatedAt: new Date().toISOString(),
        },
      });
      showAlert("Saved", "Exam settings updated successfully.");
    } catch (error) {
      console.error("Settings save error", error);
      showAlert("Error", "Failed to save exam settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      setUploading(true);
      if (!uid) throw new Error("User not logged in");

      const answerKeyFor = {
        multipleChoice: { enabled: objectiveTypes.multipleChoice.enabled, items: parsePositiveInt(objectiveTypes.multipleChoice.items) },
        trueFalse: { enabled: objectiveTypes.trueFalse.enabled, items: parsePositiveInt(objectiveTypes.trueFalse.items) },
        identification: { enabled: objectiveTypes.identification.enabled, items: parsePositiveInt(objectiveTypes.identification.items) },
      };

      const storagePath = `qa_uploads/${uid}/${classId}/${activityId}/${asset.name}`;
      const downloadUrl = await storageRepository.uploadFileFromUri(storagePath, asset.uri);

      const dbRef = ref(db, `professors/${uid}/classes/${classId}/activities/${activityId}/files`);
      const newFileRef = push(dbRef);

      await set(newFileRef, {
        name: asset.name,
        url: downloadUrl,
        type: asset.mimeType || "application/pdf",
        gradingRole: "objective-answer-key",
        answerKeyFor,
        uploadedAt: new Date().toISOString(),
      });

      showAlert("Success", "Answer key uploaded successfully!");
    } catch (e) {
      console.error("Upload error", e);
      showAlert("Error", "Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSmall}>{className} • {section}</Text>
          <Text style={styles.headerBig} numberOfLines={1}>{title}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>Grading Method</Text>
          <Text style={styles.sectionTitle}>Objective Answer Keys</Text>
          <Text style={styles.sectionDesc}>
            Upload PDF, Word, or Image files containing the correct answers. Our AI will use these to grade objective portions.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.settingsTitle}>Exam Blueprint</Text>
          <Text style={styles.settingsDesc}>
            Set the total score and active objective sections before grading. Uploaded keys are treated as the official correct answers for enabled sections.
          </Text>

          <Text style={styles.inputLabel}>Total Score (required)</Text>
          <TextInput
            value={totalScore}
            onChangeText={setTotalScore}
            keyboardType="number-pad"
            placeholder="e.g. 75"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Professor Instructions for AI (optional)</Text>
          <TextInput
            value={professorInstructions}
            onChangeText={setProfessorInstructions}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholder="Add constraints or grading priorities for this exam..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, styles.multilineInput]}
          />

          <Text style={styles.inputLabel}>Objective Sections</Text>

          {EXAM_TYPE_KEYS.map((key) => (
            <React.Fragment key={key}>
              <View style={styles.typeRow}>
                <View style={styles.typeLabelWrap}>
                  <Text style={styles.typeTitle}>{examTypeLabelMap[key]}</Text>
                  <Text style={styles.typeSub}>Auto-grade this section</Text>
                </View>
                <Switch
                  value={objectiveTypes[key].enabled}
                  onValueChange={(enabled) => setObjectiveTypes((prev) => ({ ...prev, [key]: { ...prev[key], enabled } }))}
                  trackColor={{ false: colors.grayLight, true: headerColor + "66" }}
                  thumbColor={objectiveTypes[key].enabled ? headerColor : colors.white}
                />
              </View>
              <TextInput
                value={objectiveTypes[key].items}
                onChangeText={(items) => setObjectiveTypes((prev) => ({ ...prev, [key]: { ...prev[key], items } }))}
                editable={objectiveTypes[key].enabled}
                keyboardType="number-pad"
                placeholder="Number of items"
                placeholderTextColor={colors.textSecondary}
                style={[styles.itemsInput, !objectiveTypes[key].enabled && styles.inputDisabled]}
              />
            </React.Fragment>
          ))}

          <TouchableOpacity
            style={[styles.saveSettingsBtn, { backgroundColor: headerColor }, savingSettings && { opacity: 0.75 }]}
            onPress={saveExamSettings}
            disabled={savingSettings}
          >
            {savingSettings ? <ActivityIndicator color={colors.white} /> : (
              <>
                <Feather name="save" size={18} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.saveSettingsText}>Save Exam Settings</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.uploadCard, uploading && { opacity: 0.8 }]}
          activeOpacity={0.8}
          onPress={handleUpload}
          disabled={uploading}
        >
          <View style={[styles.uploadIconBox, { backgroundColor: headerColor + "15" }]}>
            {uploading ? <ActivityIndicator color={headerColor} /> : <Feather name="upload-cloud" size={28} color={headerColor} />}
          </View>
          <View style={styles.uploadInfo}>
            <Text style={styles.uploadTitle}>{uploading ? "Uploading File..." : "Tap to Upload Key"}</Text>
            <Text style={styles.uploadSub}>Supports PDF, DOCX, and JPG/PNG</Text>
          </View>
          {!uploading && <Feather name="plus" size={20} color={colors.grayLight} />}
        </TouchableOpacity>

        <View style={styles.listSection}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeader}>UPLOADED KEYS</Text>
            <View style={[styles.badge, { backgroundColor: headerColor + "15" }]}>
              <Text style={[styles.badgeText, { color: headerColor }]}>{qaFiles.length}</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginTop: 30 }} />
          ) : qaFiles.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="file-minus" size={40} color={colors.grayLight} />
              <Text style={styles.emptyText}>No files uploaded for this activity.</Text>
            </View>
          ) : (
            <View style={styles.fileList}>
              {qaFiles.map((file) => (
                <TouchableOpacity
                  key={file.id}
                  style={styles.fileItem}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/classes/qa-view",
                      params: {
                        name: className, section, color: headerColor, title,
                        fileId: file.id, fileName: file.name, classId, activityId, fileUrl: encodeURIComponent(file.url),
                      },
                    })
                  }
                >
                  <View style={styles.fileIconBox}>
                    <Feather name={file.name.match(/\.(jpg|jpeg|png|gif)$/i) ? "image" : "file-text"} size={24} color={colors.textSecondary} />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                    <Text style={styles.fileType}>Tap to open and review</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.grayLight} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24, flexDirection: "row", alignItems: "center", ...shadows.medium },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerInfo: { flex: 1, paddingHorizontal: 10, alignItems: "center" },
  headerSmall: { color: colors.white, fontSize: 11, fontFamily: typography.fontFamily.bold, textTransform: "uppercase", opacity: 0.9 },
  headerBig: { color: colors.white, fontSize: 18, fontFamily: typography.fontFamily.bold },
  content: { padding: 24, paddingBottom: 150 },
  infoSection: { marginBottom: 32 },
  sectionLabel: { fontSize: 13, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: "uppercase", marginBottom: 8 },
  sectionTitle: { fontSize: 24, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 12 },
  sectionDesc: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, lineHeight: 24 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, marginBottom: 24, ...shadows.soft },
  settingsTitle: { fontSize: 18, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 8 },
  settingsDesc: { fontSize: 14, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, lineHeight: 22, marginBottom: 20 },
  inputLabel: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: "uppercase", marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colors.grayLight, borderRadius: 16, padding: 16, fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.text },
  multilineInput: { minHeight: 100 },
  typeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  typeLabelWrap: { flex: 1, paddingRight: 10 },
  typeTitle: { fontSize: 16, fontFamily: typography.fontFamily.bold, color: colors.text },
  typeSub: { fontSize: 13, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginTop: 4 },
  itemsInput: { backgroundColor: colors.grayLight, borderRadius: 16, padding: 16, fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.text, marginTop: 12 },
  inputDisabled: { backgroundColor: "#f3f3f3", color: colors.textSecondary },
  saveSettingsBtn: { marginTop: 24, borderRadius: 16, paddingVertical: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", ...shadows.soft },
  saveSettingsText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  uploadCard: { backgroundColor: colors.white, borderRadius: 24, padding: 24, flexDirection: "row", alignItems: "center", marginBottom: 32, ...shadows.soft },
  uploadIconBox: { width: 64, height: 64, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  uploadInfo: { flex: 1, marginLeft: 20 },
  uploadTitle: { fontSize: 17, fontFamily: typography.fontFamily.bold, color: colors.text },
  uploadSub: { fontSize: 13, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginTop: 4 },
  listSection: { marginTop: 10 },
  listHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  listHeader: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, letterSpacing: 1 },
  badge: { marginLeft: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontFamily: typography.fontFamily.bold },
  emptyState: { alignItems: "center", paddingVertical: 50 },
  emptyText: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginTop: 16 },
  fileList: { gap: 16 },
  fileItem: { backgroundColor: colors.white, borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", ...shadows.soft },
  fileIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.grayLight, justifyContent: "center", alignItems: "center" },
  fileInfo: { flex: 1, marginLeft: 16 },
  fileName: { fontSize: 16, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 4 },
  fileType: { fontSize: 13, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
});
