import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { push, ref, set } from "firebase/database";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import React, { useState } from "react";
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

  const SAMPLE_TEXT =
    "e.g., Use keywords such as 'propagandist', 'Ambeth Ocampo', and 'sketch'. Refer to Lesson 3 of Noli Me Tangere. Partial credit allowed for logical coherence.";

  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [lessonAsset, setLessonAsset] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [rubricsAsset, setRubricsAsset] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  async function pickLessonFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setLessonAsset(result.assets[0]);
    } catch {
      showAlert("Error", "Unable to select file.");
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
      if (result.canceled || !result.assets?.[0]) return;
      setRubricsAsset(result.assets[0]);
    } catch {
      showAlert("Error", "Unable to select file.");
    }
  }

  async function uploadFile(
    asset: DocumentPicker.DocumentPickerAsset | null,
    path: string,
  ): Promise<string> {
    if (!asset) return "No file attached";

    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const storage = getStorage();
      const fileRef = storageRef(storage, path + "/" + asset.name);

      await uploadBytes(fileRef, blob);
      return await getDownloadURL(fileRef);
    } catch (e) {
      console.error("File upload failed", e);
      return "Upload Failed";
    }
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
      const firstLine = instructions.trim().split("\n")[0];
      const shortTitle =
        (firstLine && firstLine.slice(0, 40)) || "Essay Instruction";
      const basePath = `essay_assets/${uid}/${classId}/${activityId}`;

      const [lessonUrl, rubricsUrl] = await Promise.all([
        lessonAsset
          ? uploadFile(lessonAsset, basePath)
          : Promise.resolve("No file attached"),
        rubricsAsset
          ? uploadFile(rubricsAsset, basePath)
          : Promise.resolve("No file attached"),
      ]);

      const instructionsRef = ref(
        db,
        `professors/${uid}/classes/${classId}/activities/${activityId}/essayInstructions`,
      );
      const newRef = push(instructionsRef);

      await set(newRef, {
        title: shortTitle,
        fullInstructions: instructions,
        lessonRef: lessonAsset ? lessonAsset.name : "No file attached",
        lessonUrl: lessonUrl,
        rubrics: rubricsAsset ? rubricsAsset.name : "No file attached",
        rubricsUrl: rubricsUrl,
        createdAt: new Date().toISOString(),
      });

      router.back();
    } catch (error) {
      console.error("Save Error:", error);
      showAlert("Error", "Failed to save instructions.");
    } finally {
      setLoading(false);
    }
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
            Configure Rubric
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
            <Text style={styles.subLabel}>Lesson Reference</Text>
            <TouchableOpacity
              style={[
                styles.attachBtn,
                lessonAsset && {
                  borderColor: headerColor,
                  backgroundColor: headerColor + "05",
                },
              ]}
              onPress={pickLessonFile}
            >
              <Feather
                name="paperclip"
                size={18}
                color={lessonAsset ? headerColor : "#999"}
              />
              <Text
                style={[
                  styles.attachText,
                  lessonAsset && { color: headerColor, fontWeight: "700" },
                ]}
                numberOfLines={1}
              >
                {lessonAsset ? lessonAsset.name : "Attach PDF or Doc"}
              </Text>
              {lessonAsset && (
                <Feather name="check" size={16} color={headerColor} />
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.attachmentGroup, { marginTop: 15 }]}>
            <Text style={styles.subLabel}>Scoring Rubrics</Text>
            <TouchableOpacity
              style={[
                styles.attachBtn,
                rubricsAsset && {
                  borderColor: headerColor,
                  backgroundColor: headerColor + "05",
                },
              ]}
              onPress={pickRubricsFile}
            >
              <Feather
                name="paperclip"
                size={18}
                color={rubricsAsset ? headerColor : "#999"}
              />
              <Text
                style={[
                  styles.attachText,
                  rubricsAsset && { color: headerColor, fontWeight: "700" },
                ]}
                numberOfLines={1}
              >
                {rubricsAsset ? rubricsAsset.name : "Attach Detailed Rubric"}
              </Text>
              {rubricsAsset && (
                <Feather name="check" size={16} color={headerColor} />
              )}
            </TouchableOpacity>
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
              <Text style={styles.saveBtnText}>Save Configuration</Text>
              <Feather
                name="arrow-right"
                size={18}
                color="#fff"
                style={{ marginLeft: 8 }}
              />
            </>
          )}
        </TouchableOpacity>
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

  textInputBox: {
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    padding: 15,
    minHeight: 180,
  },
  textarea: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    lineHeight: 22,
    textAlignVertical: "top",
  },
  helpText: { fontSize: 12, color: "#999", marginTop: 12, fontStyle: "italic" },

  attachmentGroup: {},
  attachBtn: {
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
