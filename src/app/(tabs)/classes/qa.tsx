import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { onValue, push, ref, set, update } from "firebase/database";
import {
    getDownloadURL,
    ref as storageRef,
    uploadBytes,
} from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db, storage } from "../../../firebase/firebaseConfig";
import { showAlert } from "../../../utils/alert";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

type QAFile = {
  id: string;
  name: string;
  url: string;
  type?: string;
};

type ExamTypeKey = "multipleChoice" | "trueFalse" | "identification";

type ObjectiveTypeState = Record<
  ExamTypeKey,
  { enabled: boolean; items: string }
>;

const createDefaultObjectiveTypes = (): ObjectiveTypeState => ({
  multipleChoice: { enabled: true, items: "0" },
  trueFalse: { enabled: false, items: "0" },
  identification: { enabled: false, items: "0" },
});

const parsePositiveInt = (value: string) => {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const examTypeLabelMap: Record<ExamTypeKey, string> = {
  multipleChoice: "Multiple Choice",
  trueFalse: "True/False",
  identification: "Identification",
};

export default function QAList() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, "#00b679");
  const title = P(params.title, "Activity");

  const [qaFiles, setQaFiles] = useState<QAFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [totalScore, setTotalScore] = useState("");
  const [professorInstructions, setProfessorInstructions] = useState("");
  const [objectiveTypes, setObjectiveTypes] = useState<ObjectiveTypeState>(
    createDefaultObjectiveTypes(),
  );

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !classId || !activityId) return;

    const activityRef = ref(
      db,
      `professors/${uid}/classes/${classId}/activities/${activityId}`,
    );
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
      setTotalScore(
        savedSettings.totalScore ? String(savedSettings.totalScore) : "",
      );
      setProfessorInstructions(savedSettings.professorInstructions || "");
      setObjectiveTypes({
        multipleChoice: {
          enabled: savedTypes.multipleChoice?.enabled ?? true,
          items: String(savedTypes.multipleChoice?.items ?? 0),
        },
        trueFalse: {
          enabled: savedTypes.trueFalse?.enabled ?? false,
          items: String(savedTypes.trueFalse?.items ?? 0),
        },
        identification: {
          enabled: savedTypes.identification?.enabled ?? false,
          items: String(savedTypes.identification?.items ?? 0),
        },
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [classId, activityId]);

  const saveExamSettings = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !classId || !activityId) {
      showAlert("Error", "Missing class/activity information.");
      return;
    }

    const parsedTotalScore = parsePositiveInt(totalScore);
    if (parsedTotalScore <= 0) {
      showAlert(
        "Missing Total Score",
        "Please enter the total exam score for this test.",
      );
      return;
    }

    const normalizedTypes = {
      multipleChoice: {
        enabled: objectiveTypes.multipleChoice.enabled,
        items: parsePositiveInt(objectiveTypes.multipleChoice.items),
      },
      trueFalse: {
        enabled: objectiveTypes.trueFalse.enabled,
        items: parsePositiveInt(objectiveTypes.trueFalse.items),
      },
      identification: {
        enabled: objectiveTypes.identification.enabled,
        items: parsePositiveInt(objectiveTypes.identification.items),
      },
    };

    const enabledTypes = (Object.keys(normalizedTypes) as ExamTypeKey[]).filter(
      (key) => normalizedTypes[key].enabled,
    );

    if (enabledTypes.length === 0) {
      showAlert(
        "No Exam Type Enabled",
        "Enable at least one objective exam type.",
      );
      return;
    }

    const invalidType = enabledTypes.find(
      (key) => normalizedTypes[key].items <= 0,
    );
    if (invalidType) {
      showAlert(
        "Missing Item Count",
        `Set the number of items for ${examTypeLabelMap[invalidType]}.`,
      );
      return;
    }

    try {
      setSavingSettings(true);
      await update(
        ref(
          db,
          `professors/${uid}/classes/${classId}/activities/${activityId}`,
        ),
        {
          examSettings: {
            totalScore: parsedTotalScore,
            professorInstructions: professorInstructions.trim(),
            objectiveTypes: normalizedTypes,
            updatedAt: new Date().toISOString(),
          },
        },
      );

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
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/*",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      setUploading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("User not logged in");

      const answerKeyFor = {
        multipleChoice: {
          enabled: objectiveTypes.multipleChoice.enabled,
          items: parsePositiveInt(objectiveTypes.multipleChoice.items),
        },
        trueFalse: {
          enabled: objectiveTypes.trueFalse.enabled,
          items: parsePositiveInt(objectiveTypes.trueFalse.items),
        },
        identification: {
          enabled: objectiveTypes.identification.enabled,
          items: parsePositiveInt(objectiveTypes.identification.items),
        },
      };

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const fileRef = storageRef(
        storage,
        `qa_uploads/${uid}/${classId}/${activityId}/${asset.name}`,
      );

      await uploadBytes(fileRef, blob);
      const downloadUrl = await getDownloadURL(fileRef);

      const dbRef = ref(
        db,
        `professors/${uid}/classes/${classId}/activities/${activityId}/files`,
      );
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
      <StatusBar barStyle="light-content" />
      <View
        style={[
          styles.header,
          { backgroundColor: headerColor, paddingTop: insets.top + 15 },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSmall}>
            {className} • {section}
          </Text>
          <Text style={styles.headerBig} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>Grading Method</Text>
          <Text style={styles.sectionTitle}>Objective Answer Keys</Text>
          <Text style={styles.sectionDesc}>
            Upload PDF, Word, or Image files containing the correct answers. Our
            AI will use these to grade objective portions.
          </Text>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Exam Blueprint</Text>
          <Text style={styles.settingsDesc}>
            Set the total score and active objective sections before grading.
            Uploaded keys are treated as the official correct answers for
            enabled sections.
          </Text>

          <Text style={styles.inputLabel}>Total Score (required)</Text>
          <TextInput
            value={totalScore}
            onChangeText={setTotalScore}
            keyboardType="number-pad"
            placeholder="e.g. 75"
            placeholderTextColor="#bbb"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>
            Professor Instructions for AI (optional)
          </Text>
          <TextInput
            value={professorInstructions}
            onChangeText={setProfessorInstructions}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholder="Add constraints or grading priorities for this exam..."
            placeholderTextColor="#bbb"
            style={[styles.input, styles.multilineInput]}
          />

          <Text style={styles.inputLabel}>Objective Sections</Text>

          <View style={styles.typeRow}>
            <View style={styles.typeLabelWrap}>
              <Text style={styles.typeTitle}>Multiple Choice</Text>
              <Text style={styles.typeSub}>Auto-grade this section</Text>
            </View>
            <Switch
              value={objectiveTypes.multipleChoice.enabled}
              onValueChange={(enabled) =>
                setObjectiveTypes((prev) => ({
                  ...prev,
                  multipleChoice: { ...prev.multipleChoice, enabled },
                }))
              }
              trackColor={{ false: "#ddd", true: headerColor + "66" }}
              thumbColor={
                objectiveTypes.multipleChoice.enabled ? headerColor : "#fff"
              }
            />
          </View>
          <TextInput
            value={objectiveTypes.multipleChoice.items}
            onChangeText={(items) =>
              setObjectiveTypes((prev) => ({
                ...prev,
                multipleChoice: { ...prev.multipleChoice, items },
              }))
            }
            editable={objectiveTypes.multipleChoice.enabled}
            keyboardType="number-pad"
            placeholder="Number of items"
            placeholderTextColor="#bbb"
            style={[
              styles.itemsInput,
              !objectiveTypes.multipleChoice.enabled && styles.inputDisabled,
            ]}
          />

          <View style={styles.typeRow}>
            <View style={styles.typeLabelWrap}>
              <Text style={styles.typeTitle}>True/False</Text>
              <Text style={styles.typeSub}>Auto-grade this section</Text>
            </View>
            <Switch
              value={objectiveTypes.trueFalse.enabled}
              onValueChange={(enabled) =>
                setObjectiveTypes((prev) => ({
                  ...prev,
                  trueFalse: { ...prev.trueFalse, enabled },
                }))
              }
              trackColor={{ false: "#ddd", true: headerColor + "66" }}
              thumbColor={
                objectiveTypes.trueFalse.enabled ? headerColor : "#fff"
              }
            />
          </View>
          <TextInput
            value={objectiveTypes.trueFalse.items}
            onChangeText={(items) =>
              setObjectiveTypes((prev) => ({
                ...prev,
                trueFalse: { ...prev.trueFalse, items },
              }))
            }
            editable={objectiveTypes.trueFalse.enabled}
            keyboardType="number-pad"
            placeholder="Number of items"
            placeholderTextColor="#bbb"
            style={[
              styles.itemsInput,
              !objectiveTypes.trueFalse.enabled && styles.inputDisabled,
            ]}
          />

          <View style={styles.typeRow}>
            <View style={styles.typeLabelWrap}>
              <Text style={styles.typeTitle}>Identification</Text>
              <Text style={styles.typeSub}>Auto-grade this section</Text>
            </View>
            <Switch
              value={objectiveTypes.identification.enabled}
              onValueChange={(enabled) =>
                setObjectiveTypes((prev) => ({
                  ...prev,
                  identification: { ...prev.identification, enabled },
                }))
              }
              trackColor={{ false: "#ddd", true: headerColor + "66" }}
              thumbColor={
                objectiveTypes.identification.enabled ? headerColor : "#fff"
              }
            />
          </View>
          <TextInput
            value={objectiveTypes.identification.items}
            onChangeText={(items) =>
              setObjectiveTypes((prev) => ({
                ...prev,
                identification: { ...prev.identification, items },
              }))
            }
            editable={objectiveTypes.identification.enabled}
            keyboardType="number-pad"
            placeholder="Number of items"
            placeholderTextColor="#bbb"
            style={[
              styles.itemsInput,
              !objectiveTypes.identification.enabled && styles.inputDisabled,
            ]}
          />

          <TouchableOpacity
            style={[
              styles.saveSettingsBtn,
              { backgroundColor: headerColor },
              savingSettings && { opacity: 0.75 },
            ]}
            onPress={saveExamSettings}
            disabled={savingSettings}
          >
            {savingSettings ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather
                  name="save"
                  size={16}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.saveSettingsText}>Save Exam Settings</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.uploadCard, uploading && styles.uploadingCard]}
          activeOpacity={0.8}
          onPress={handleUpload}
          disabled={uploading}
        >
          <View
            style={[
              styles.uploadIconBox,
              { backgroundColor: headerColor + "15" },
            ]}
          >
            {uploading ? (
              <ActivityIndicator color={headerColor} />
            ) : (
              <Feather name="upload-cloud" size={28} color={headerColor} />
            )}
          </View>
          <View style={styles.uploadInfo}>
            <Text style={styles.uploadTitle}>
              {uploading ? "Uploading File..." : "Tap to Upload Key"}
            </Text>
            <Text style={styles.uploadSub}>
              Supports PDF, DOCX, and JPG/PNG
            </Text>
          </View>
          {!uploading && <Feather name="plus" size={20} color="#ccc" />}
        </TouchableOpacity>

        <View style={styles.listSection}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeader}>UPLOADED KEYS</Text>
            <View
              style={[styles.badge, { backgroundColor: headerColor + "15" }]}
            >
              <Text style={[styles.badgeText, { color: headerColor }]}>
                {qaFiles.length}
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="small"
              color="#888"
              style={{ marginTop: 30 }}
            />
          ) : qaFiles.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="file-minus" size={40} color="#eee" />
              <Text style={styles.emptyText}>
                No files uploaded for this activity.
              </Text>
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
                        name: className,
                        section,
                        color: headerColor,
                        title,
                        fileId: file.id,
                        fileName: file.name,
                        classId,
                        activityId,
                        fileUrl: encodeURIComponent(file.url),
                      },
                    })
                  }
                >
                  <View style={styles.fileIconBox}>
                    <Feather
                      name={
                        file.name.match(/\.(jpg|jpeg|png|gif)$/i)
                          ? "image"
                          : "file-text"
                      }
                      size={20}
                      color="#666"
                    />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileType}>Tap to open and review</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#ccc" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fb" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 25,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: {
    color: "#fff",
    fontSize: 11,
    opacity: 0.8,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  headerBig: { color: "#fff", fontSize: 18, fontWeight: "800" },

  content: { padding: 20 },
  infoSection: { marginBottom: 30, paddingHorizontal: 5 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#bbb",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
  },
  sectionDesc: { fontSize: 15, color: "#666", lineHeight: 22 },

  settingsCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 6,
  },
  settingsDesc: {
    fontSize: 13,
    color: "#777",
    lineHeight: 20,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#222",
  },
  multilineInput: {
    minHeight: 90,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  typeLabelWrap: { flex: 1, paddingRight: 10 },
  typeTitle: { fontSize: 15, fontWeight: "700", color: "#222" },
  typeSub: { fontSize: 12, color: "#999", marginTop: 2 },
  itemsInput: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#222",
    marginTop: 8,
  },
  inputDisabled: {
    backgroundColor: "#f3f3f3",
    color: "#bbb",
  },
  saveSettingsBtn: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  saveSettingsText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  uploadCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    marginBottom: 35,
  },
  uploadingCard: { opacity: 0.8 },
  uploadIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadInfo: { flex: 1, marginLeft: 20 },
  uploadTitle: { fontSize: 17, fontWeight: "800", color: "#111" },
  uploadSub: { fontSize: 13, color: "#999", marginTop: 4, fontWeight: "500" },

  listSection: { paddingHorizontal: 5 },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  listHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#bbb",
    letterSpacing: 1,
  },
  badge: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontSize: 12, fontWeight: "800" },

  emptyState: { alignItems: "center", paddingVertical: 50 },
  emptyText: { fontSize: 15, color: "#ccc", marginTop: 15, fontWeight: "500" },

  fileList: { gap: 12 },
  fileItem: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f4f7fb",
    justifyContent: "center",
    alignItems: "center",
  },
  fileInfo: { flex: 1, marginLeft: 15 },
  fileName: { fontSize: 15, fontWeight: "700", color: "#222" },
  fileType: { fontSize: 12, color: "#aaa", marginTop: 2 },
});
