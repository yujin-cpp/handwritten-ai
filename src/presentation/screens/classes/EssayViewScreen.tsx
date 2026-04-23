import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { showAlert } from "../../../utils/alert";
import { safeGoBack } from "../../../utils/navigation";

// Quick Firebase import
import { ref, remove } from "firebase/database";
import { db } from "../../../firebase/firebaseConfig";

const P = (v: string | string[] | undefined, fb = "") => Array.isArray(v) ? v[0] : (v ?? fb);

export const EssayViewScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const id = P(params.id, "");
  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, colors.primary);
  const title = P(params.title, "Essay Rubric");

  const lessonRef = P(params.lessonRef, "No file attached");
  const rubrics = P(params.rubrics, "No file attached");
  const lessonUrl = P(params.lessonUrl, "");
  const rubricsUrl = P(params.rubricsUrl, "");

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleOpenFile(url: string, name: string) {
    if (url && url.startsWith("http")) {
      Linking.openURL(url).catch(() => {
        showAlert("Error", "Could not open file link.");
      });
    } else {
      showAlert("No File", `No downloadable file found for "${name}".`);
    }
  }

  async function handleConfirmDelete() {
    const { auth } = require("../../../firebase/firebaseConfig");
    const uid = auth.currentUser?.uid;
    if (!uid || !classId || !activityId || !id) {
      showAlert("Error", "Missing information to delete.");
      return;
    }

    setDeleting(true);
    try {
      const dbRef = ref(db, `professors/${uid}/classes/${classId}/activities/${activityId}/essayInstructions/${id}`);
      await remove(dbRef);
      setConfirmVisible(false);
      safeGoBack(router);
    } catch (error) {
      console.error("Delete error", error);
      showAlert("Error", "Failed to delete instruction.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSmall}>{className} • {section}</Text>
          <Text style={styles.headerBig} numberOfLines={1}>Review Rubric</Text>
        </View>
        <TouchableOpacity onPress={() => setConfirmVisible(true)} style={styles.headerActionBtn}>
          <Feather name="trash-2" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.label}>Instructions</Text>
            <Feather name="info" size={16} color={colors.textSecondary} />
          </View>
          <Text style={styles.titleText}>{title}</Text>
          <View style={styles.divider} />
          <Text style={styles.bodyText}>
            This rubric specifies the criteria for grading this essay. The AI model will prioritize these instructions during the evaluation process.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.label, { marginBottom: 16 }]}>Material Links</Text>

          <TouchableOpacity style={styles.fileLink} onPress={() => handleOpenFile(lessonUrl, "Lesson Reference")}>
            <View style={[styles.iconBox, { backgroundColor: '#f0f4ff' }]}>
              <Feather name="book" size={24} color="#4c6fff" />
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileLabel}>Lesson Reference</Text>
              <Text style={styles.fileName} numberOfLines={1}>{lessonRef}</Text>
            </View>
            <Feather name="external-link" size={20} color={colors.grayLight} />
          </TouchableOpacity>

          <View style={[styles.divider, { marginVertical: 16 }]} />

          <TouchableOpacity style={styles.fileLink} onPress={() => handleOpenFile(rubricsUrl, "Score Rubrics")}>
            <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
              <Feather name="list" size={24} color="#00b679" />
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileLabel}>Score Rubrics</Text>
              <Text style={styles.fileName} numberOfLines={1}>{rubrics}</Text>
            </View>
            <Feather name="external-link" size={20} color={colors.grayLight} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setConfirmVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.warnIcon}>
              <Feather name="alert-triangle" size={32} color={colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Delete Rubric?</Text>
            <Text style={styles.modalSub}>
              Are you sure you want to remove this grading instruction? This cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmVisible(false)} disabled={deleting}>
                <Text style={styles.cancelBtnText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleConfirmDelete} disabled={deleting}>
                {deleting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.deleteBtnText}>Delete Forever</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerActionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  content: { padding: 24, paddingBottom: 150 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, marginBottom: 24, ...shadows.soft },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 13, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  titleText: { fontSize: 24, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 16 },
  divider: { height: 1, backgroundColor: colors.grayLight },
  bodyText: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, lineHeight: 24, marginTop: 16 },
  fileLink: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  fileInfo: { flex: 1, marginLeft: 16 },
  fileLabel: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  fileName: { fontSize: 16, fontFamily: typography.fontFamily.bold, color: colors.text },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: colors.white, borderRadius: 24, padding: 32, alignItems: 'center', ...shadows.medium },
  warnIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 12 },
  modalSub: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  modalButtons: { flexDirection: 'row', gap: 16, width: '100%', justifyContent: 'center' },
  cancelBtn: { flex: 1, paddingVertical: 18, borderRadius: 16, backgroundColor: colors.grayLight, alignItems: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  deleteBtn: { flex: 1, paddingVertical: 18, borderRadius: 16, backgroundColor: colors.danger, alignItems: 'center', ...shadows.soft },
  deleteBtnText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
});
