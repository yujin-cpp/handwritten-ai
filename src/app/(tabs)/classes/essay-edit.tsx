import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Asset } from "expo-asset";
import { useLocalSearchParams, useRouter } from "expo-router";
import { get, push, ref, set, update } from "firebase/database";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../../../firebase/firebaseConfig";
import { showAlert } from "../../../utils/alert";
import {
  buildEssayInstructionPayload,
  DEFAULT_RUBRIC_NAME,
  normalizeLessonRefs,
  normalizeRubric,
  type EssayInstructionRecord,
  type EssayMaterialLink,
  type EssayRubricLink,
} from "../../../utils/essayMaterials";

const DEFAULT_RUBRICS_IMAGE = require("../../../assets/images/default-rubrics.png");

type UploadableAsset = {
  name: string;
  uri: string;
  source?: "upload" | "default";
};

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

export default function EssayEdit() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, "#00b679");
  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const instructionId = P(params.instructionId);

  const SAMPLE_TEXT =
    "e.g., Use keywords such as 'propagandist', 'Ambeth Ocampo', and 'sketch'. Refer to Lesson 3 of Noli Me Tangere. Partial credit allowed for logical coherence.";

  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(!!instructionId);
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [lessonAssets, setLessonAssets] = useState<UploadableAsset[]>([]);
  const [rubricAsset, setRubricAsset] = useState<UploadableAsset | null>(null);

  const screenTitle = instructionId ? "Edit Rubric" : "Configure Rubric";

  useEffect(() => {
    const uid = auth.currentUser?.uid;

    if (!uid || !classId || !activityId || !instructionId) {
      setInitializing(false);
      return;
    }

    let active = true;

    async function loadInstruction() {
      try {
        const instructionRef = ref(
          db,
          `professors/${uid}/classes/${classId}/activities/${activityId}/essayInstructions/${instructionId}`
        );
        const snapshot = await get(instructionRef);

        if (!snapshot.exists() || !active) {
          return;
        }

        const record = snapshot.val() as EssayInstructionRecord;
        setInstructions(record.fullInstructions ?? "");
        setCreatedAt(record.createdAt);
        setLessonAssets(
          normalizeLessonRefs(record).map((item) => ({
            name: item.name,
            uri: item.url,
            source: "upload",
          }))
        );

        const existingRubric = normalizeRubric(record);
        setRubricAsset(
          existingRubric
            ? {
                name: existingRubric.name,
                uri: existingRubric.url,
                source: existingRubric.source,
              }
            : null
        );
      } catch (error) {
        console.error("Failed to load rubric instruction", error);
        showAlert("Error", "Unable to load the rubric details.");
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    }

    void loadInstruction();

    return () => {
      active = false;
    };
  }, [activityId, classId, instructionId]);

  const firstLineTitle = useMemo(() => {
    const firstLine = instructions.trim().split("\n")[0];
    return (firstLine && firstLine.slice(0, 40)) || "Essay Instruction";
  }, [instructions]);

  async function pickLessonFiles() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setLessonAssets((current) => {
        const next = [...current];
        for (const asset of result.assets) {
          if (!next.some((item) => item.uri === asset.uri || item.name === asset.name)) {
            next.push({ name: asset.name, uri: asset.uri, source: "upload" });
          }
        }
        return next;
      });
    } catch {
      showAlert("Error", "Unable to select lesson reference.");
    }
  }

  async function pickRubricsFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      setRubricAsset({
        name: result.assets[0].name,
        uri: result.assets[0].uri,
        source: "upload",
      });
    } catch {
      showAlert("Error", "Unable to select rubric file.");
    }
  }

  async function applyDefaultRubric() {
    try {
      const [asset] = await Asset.loadAsync(DEFAULT_RUBRICS_IMAGE);
      const uri = asset.localUri ?? asset.uri;

      if (!uri) {
        throw new Error("Default rubric asset did not resolve.");
      }

      setRubricAsset({
        name: DEFAULT_RUBRIC_NAME,
        uri,
        source: "default",
      });
    } catch (error) {
      console.error("Failed to load default rubric", error);
      showAlert("Error", "Unable to load the default rubric.");
    }
  }

  async function uploadFile(asset: UploadableAsset, path: string): Promise<string> {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const storage = getStorage();
    const fileRef = storageRef(storage, `${path}/${asset.name}`);

    await uploadBytes(fileRef, blob);
    return await getDownloadURL(fileRef);
  }

  async function onSave() {
    if (!instructions.trim()) {
      showAlert("Missing Info", "Please enter essay instructions.");
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid || !classId || !activityId) {
      showAlert("Error", "Missing class context. Cannot save.");
      return;
    }

    setLoading(true);

    try {
      const basePath = `essay_assets/${uid}/${classId}/${activityId}/${instructionId || Date.now()}`;

      const lessonRefs: EssayMaterialLink[] = [];
      for (const asset of lessonAssets) {
        const url = asset.uri.startsWith("http")
          ? asset.uri
          : await uploadFile(asset, `${basePath}/lesson_refs`);
        lessonRefs.push({ name: asset.name, url });
      }

      let rubric: EssayRubricLink | null = null;
      if (rubricAsset) {
        const url = rubricAsset.uri.startsWith("http")
          ? rubricAsset.uri
          : await uploadFile(rubricAsset, `${basePath}/rubrics`);
        rubric = {
          name: rubricAsset.name,
          url,
          source: rubricAsset.source ?? "upload",
        };
      }

      const payload = buildEssayInstructionPayload({
        title: firstLineTitle,
        fullInstructions: instructions.trim(),
        lessonRefs,
        rubric,
        createdAt,
      });

      const instructionsRef = ref(
        db,
        `professors/${uid}/classes/${classId}/activities/${activityId}/essayInstructions`
      );

      if (instructionId) {
        await update(
          ref(
            db,
            `professors/${uid}/classes/${classId}/activities/${activityId}/essayInstructions/${instructionId}`
          ),
          payload
        );
      } else {
        const newRef = push(instructionsRef);
        await set(newRef, payload);
      }

      router.replace({
        pathname: "/(tabs)/classes/essay",
        params: {
          classId,
          activityId,
          name: className,
          section,
          color: headerColor,
        },
      });
    } catch (error) {
      console.error("Save Error:", error);
      showAlert("Error", "Failed to save instructions.");
    } finally {
      setLoading(false);
    }
  }

  function removeLesson(index: number) {
    setLessonAssets((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

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
            {screenTitle}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {initializing ? (
          <ActivityIndicator color={headerColor} size="large" style={{ marginTop: 50 }} />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>Instructions & Context</Text>
              <View style={styles.textInputBox}>
                <TextInput
                  multiline
                  value={instructions}
                  onChangeText={setInstructions}
                  style={styles.textarea}
                  placeholder={SAMPLE_TEXT}
                  placeholderTextColor="#bbb"
                />
              </View>
              <Text style={styles.helpText}>
                Explain specific criteria or focus points for the AI grader.
              </Text>
            </View>

            <View style={[styles.card, { marginTop: 20 }]}>
              <Text style={styles.label}>Support Materials</Text>

              <View style={styles.attachmentGroup}>
                <View style={styles.attachmentHeader}>
                  <Text style={styles.subLabel}>Lesson References</Text>
                  <TouchableOpacity style={styles.inlineAction} onPress={pickLessonFiles}>
                    <Feather name="plus" size={15} color={headerColor} />
                    <Text style={[styles.inlineActionText, { color: headerColor }]}>
                      Add material link
                    </Text>
                  </TouchableOpacity>
                </View>

                {lessonAssets.length === 0 ? (
                  <TouchableOpacity style={styles.emptyAttachBtn} onPress={pickLessonFiles}>
                    <Feather name="paperclip" size={18} color="#999" />
                    <Text style={styles.attachText}>Add lesson references</Text>
                  </TouchableOpacity>
                ) : (
                  lessonAssets.map((asset, index) => (
                    <View key={`${asset.name}-${index}`} style={styles.materialRow}>
                      <View style={[styles.materialIconBox, { backgroundColor: "#eff6ff" }]}>
                        <Feather name="book-open" size={18} color="#2563eb" />
                      </View>
                      <Text style={styles.materialName} numberOfLines={1}>
                        {asset.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeLesson(index)}
                        style={styles.materialDeleteBtn}
                      >
                        <Feather name="trash-2" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              <View style={[styles.attachmentGroup, { marginTop: 18 }]}>
                <View style={styles.attachmentHeader}>
                  <Text style={styles.subLabel}>Scoring Rubrics</Text>
                  {!rubricAsset && (
                    <TouchableOpacity style={styles.inlineAction} onPress={pickRubricsFile}>
                      <Feather name="plus" size={15} color={headerColor} />
                      <Text style={[styles.inlineActionText, { color: headerColor }]}>
                        Add material link
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {rubricAsset ? (
                  <View style={styles.materialRow}>
                    <View style={[styles.materialIconBox, { backgroundColor: "#ecfdf3" }]}>
                      <Feather
                        name={rubricAsset.source === "default" ? "star" : "list"}
                        size={18}
                        color="#00b679"
                      />
                    </View>
                    <View style={styles.materialInfo}>
                      <Text style={styles.materialName} numberOfLines={1}>
                        {rubricAsset.name}
                      </Text>
                      {rubricAsset.source === "default" && (
                        <Text style={styles.materialMeta}>Using the built-in rubric</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => setRubricAsset(null)}
                      style={styles.materialDeleteBtn}
                    >
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.rubricActions}>
                    <TouchableOpacity style={styles.secondaryActionBtn} onPress={pickRubricsFile}>
                      <Feather name="upload" size={16} color="#444" />
                      <Text style={styles.secondaryActionText}>Upload rubric file</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.secondaryActionBtn, styles.defaultRubricBtn]}
                      onPress={applyDefaultRubric}
                    >
                      <Feather name="star" size={16} color={headerColor} />
                      <Text style={[styles.secondaryActionText, { color: headerColor }]}>
                        Use default rubric
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.saveBtnAction,
                { backgroundColor: headerColor },
                loading && { opacity: 0.7 },
              ]}
              onPress={onSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.saveBtnText}>
                    {instructionId ? "Update Configuration" : "Save Configuration"}
                  </Text>
                  <Feather
                    name="arrow-right"
                    size={18}
                    color="#fff"
                    style={{ marginLeft: 8 }}
                  />
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
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
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: {
    color: "#fff",
    fontSize: 11,
    opacity: 0.8,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  headerBig: { color: "#fff", fontSize: 18, fontWeight: "800" },

  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#bbb",
    textTransform: "uppercase",
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#bbb",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  attachmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  inlineAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: "700",
  },

  textInputBox: {
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    padding: 15,
    minHeight: 180,
  },
  textarea: { fontSize: 15, color: "#111", lineHeight: 22, textAlignVertical: "top" },
  helpText: { fontSize: 12, color: "#999", marginTop: 12, fontStyle: "italic" },

  attachmentGroup: {},
  emptyAttachBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  attachText: { flex: 1, fontSize: 14, color: "#666" },
  materialRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eef2f7",
    marginBottom: 10,
  },
  materialIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  materialInfo: { flex: 1 },
  materialName: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "700",
  },
  materialMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  materialDeleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff1f2",
    marginLeft: 10,
  },
  rubricActions: {
    gap: 10,
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  defaultRubricBtn: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },

  saveBtnAction: {
    marginTop: 35,
    paddingVertical: 18,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
