import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
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
import { showAlert } from "../../../utils/alert";
import { storageRepository } from "../../../data/repositories/FirebaseStorageRepository";
import { safeGoBack } from "../../../utils/navigation";
import { getContrastColor, getIconBoxColors } from "../../../utils/colorUtils";

// Quick Firebase import
import { push, ref, set } from "firebase/database";
import { db } from "../../../firebase/firebaseConfig";

const P = (v: string | string[] | undefined, fb = "") => Array.isArray(v) ? v[0] : (v ?? fb);

export const EssayEditScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, colors.primary);
  const classId = P(params.classId);
  const activityId = P(params.activityId);

  const SAMPLE_TEXT = "e.g., Use keywords such as 'propagandist', 'Ambeth Ocampo', and 'sketch'. Refer to Lesson 3 of Noli Me Tangere. Partial credit allowed for logical coherence.";

  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [lessonAssets, setLessonAssets] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [rubricsAsset, setRubricsAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  async function pickLessonFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled || !result.assets?.length) return;
      setLessonAssets((prev) => [...prev, ...result.assets]);
    } catch {
      showAlert("Error", "Unable to select file.");
    }
  }

  async function pickRubricsFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setRubricsAsset(result.assets[0]);
    } catch {
      showAlert("Error", "Unable to select file.");
    }
  }

  async function onSave() {
    if (!instructions.trim()) {
      showAlert("Missing Info", "Please enter essay instructions.");
      return;
    }

    const { auth } = require("../../../firebase/firebaseConfig");
    const uid = auth.currentUser?.uid;
    if (!uid || !classId || !activityId) {
      showAlert("Error", "Missing class context. Cannot save.");
      return;
    }

    setLoading(true);

    try {
      const firstLine = instructions.trim().split("\n")[0];
      const shortTitle = (firstLine && firstLine.slice(0, 40)) || "Essay Instruction";
      const basePath = `essay_assets/${uid}/${classId}/${activityId}`;

      // Upload all lesson assets in parallel
      const lessonUploads = await Promise.all(
        lessonAssets.map((asset) =>
          storageRepository.uploadFileFromUri(`${basePath}/${asset.name}`, asset.uri)
        )
      );
      const rubricsUrl = rubricsAsset
        ? await storageRepository.uploadFileFromUri(`${basePath}/${rubricsAsset.name}`, rubricsAsset.uri)
        : "";

      const instructionsRef = ref(db, `professors/${uid}/classes/${classId}/activities/${activityId}/essayInstructions`);
      const newRef = push(instructionsRef);

      await set(newRef, {
        title: shortTitle,
        fullInstructions: instructions,
        lessonRef: lessonAssets.length > 0 ? lessonAssets.map((a) => a.name).join(", ") : "No file attached",
        lessonUrl: lessonUploads[0] || "No file attached",
        lessonUrls: lessonUploads.length > 0 ? lessonUploads : [],
        lessonNames: lessonAssets.map((a) => a.name),
        rubrics: rubricsAsset ? rubricsAsset.name : "No file attached",
        rubricsUrl: rubricsUrl || "No file attached",
        createdAt: new Date().toISOString(),
      });

      safeGoBack(router);
    } catch (error) {
      console.error("Save Error:", error);
      showAlert("Error", "Failed to save instructions.");
    } finally {
      setLoading(false);
    }
  }

  const headerTextColor = getContrastColor(headerColor);
  const { bg: iconBg, icon: iconFg } = getIconBoxColors(headerColor);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={headerTextColor} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerSmall, { color: headerTextColor }]}>{className} • {section}</Text>
          <Text style={[styles.headerBig, { color: headerTextColor }]} numberOfLines={1}>Configure Rubric</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Instructions & Context</Text>
          <View style={styles.textInputBox}>
            <TextInput
              multiline
              value={instructions}
              onChangeText={setInstructions}
              style={styles.textarea}
              placeholder={SAMPLE_TEXT}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <Text style={styles.helpText}>Explain specific criteria or focus points for the AI grader.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Support Materials</Text>

          <View style={styles.attachmentGroup}>
            <Text style={styles.subLabel}>Lesson References</Text>
            {lessonAssets.map((asset, idx) => (
              <View key={`${asset.name}-${idx}`} style={[styles.attachBtn, { borderColor: headerColor, backgroundColor: iconBg, marginBottom: 8 }]}>
                <Feather name="file-text" size={20} color={headerColor} />
                <Text style={[styles.attachText, { color: headerColor, fontFamily: typography.fontFamily.bold, flex: 1 }]} numberOfLines={1}>
                  {asset.name}
                </Text>
                <TouchableOpacity onPress={() => setLessonAssets((prev) => prev.filter((_, i) => i !== idx))}>
                  <Feather name="x" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={pickLessonFile}
            >
              <Feather name="plus" size={20} color={colors.textSecondary} />
              <Text style={styles.attachText}>
                {lessonAssets.length === 0 ? "Attach PDF or Doc" : "Add More Files"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.attachmentGroup, { marginTop: 20 }]}>
            <Text style={styles.subLabel}>Scoring Rubrics</Text>
            <TouchableOpacity
              style={[styles.attachBtn, rubricsAsset && { borderColor: headerColor, backgroundColor: iconBg }]}
              onPress={pickRubricsFile}
            >
              <Feather name="paperclip" size={20} color={rubricsAsset ? headerColor : colors.textSecondary} />
              <Text style={[styles.attachText, rubricsAsset && { color: headerColor, fontFamily: typography.fontFamily.bold }]} numberOfLines={1}>
                {rubricsAsset ? rubricsAsset.name : "Attach Detailed Rubric"}
              </Text>
              {rubricsAsset && <Feather name="check" size={20} color={headerColor} />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtnAction, { backgroundColor: headerColor }, loading && { opacity: 0.7 }]}
          onPress={onSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.saveBtnText}>Save Configuration</Text>
              <Feather name="arrow-right" size={20} color={colors.white} style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
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
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, marginBottom: 24, ...shadows.soft },
  label: { fontSize: 14, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: "uppercase", marginBottom: 16, letterSpacing: 0.5 },
  subLabel: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: "uppercase", marginBottom: 12 },
  textInputBox: { backgroundColor: colors.grayLight, borderRadius: 16, padding: 16, minHeight: 200 },
  textarea: { flex: 1, fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.text, lineHeight: 24, textAlignVertical: "top" },
  helpText: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily.medium, marginTop: 12, fontStyle: "italic" },
  attachmentGroup: {},
  attachBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.grayLight, borderWidth: 1, borderColor: colors.grayLight, borderRadius: 16, padding: 16, gap: 12 },
  attachText: { flex: 1, fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  saveBtnAction: { marginTop: 16, paddingVertical: 18, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", ...shadows.soft },
  saveBtnText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
});
