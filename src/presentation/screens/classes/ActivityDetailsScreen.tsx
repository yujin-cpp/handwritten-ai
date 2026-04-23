import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { activityRepository } from "../../../data/repositories/FirebaseActivityRepository";
import { showAlert } from "../../../utils/alert";
import { safeGoBack } from "../../../utils/navigation";
import { getContrastColor } from "../../../utils/colorUtils";

const P = (v: string | string[] | undefined, fb = "") => Array.isArray(v) ? v[0] : v ?? fb;

export const ActivityDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { uid } = useAuthSession();

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, colors.primary);
  const initialTitle = P(params.title) || P(params.activityTitle) || "Activity";

  const [title, setTitle] = useState(initialTitle);
  const [editOpen, setEditOpen] = useState(false);
  const [tempTitle, setTempTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);

  function openEdit() {
    setTempTitle(title);
    setEditOpen(true);
  }

  async function saveTitle() {
    const t = tempTitle.trim();
    if (!t) return;

    if (!uid || !classId || !activityId) {
      setTitle(t);
      setEditOpen(false);
      return;
    }

    try {
      setSaving(true);
      await activityRepository.updateActivity(uid, classId, activityId, t);
      setTitle(t);
      setEditOpen(false);
    } catch {
      showAlert("Error", "Failed to update activity title.");
    } finally {
      setSaving(false);
    }
  }

  const headerTextColor = getContrastColor(headerColor);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={headerTextColor} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerSmall, { color: headerTextColor }]}>{className}</Text>
          <Text style={[styles.headerBig, { color: headerTextColor }]} numberOfLines={1}>{section}</Text>
        </View>
        <TouchableOpacity onPress={openEdit} style={styles.editBtn}>
          <Feather name="edit-3" size={20} color={headerTextColor} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleCard}>
          <Text style={styles.titleLabel}>Selected Activity</Text>
          <Text style={styles.activityTitle}>{title}</Text>
          <View style={[styles.titleBar, { backgroundColor: headerColor }]} />
        </View>

        <Text style={styles.sectionHeading}>Grading Configurations</Text>

        <View style={styles.cardContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.card}
            onPress={() => router.push({
              pathname: "/(tabs)/classes/qa",
              params: { classId, activityId, name: className, section, color: headerColor, title },
            })}
          >
            <View style={[styles.iconBox, { backgroundColor: '#f0f4ff' }]}>
              <Feather name="message-square" size={24} color="#4c6fff" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Objective (Q&A)</Text>
              <Text style={styles.cardSubtitle}>Set answer keys for auto-grading</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.grayLight} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.card}
            onPress={() => router.push({
              pathname: "/(tabs)/classes/essay",
              params: { classId, activityId, name: className, section, color: headerColor, title },
            })}
          >
            <View style={[styles.iconBox, { backgroundColor: '#fff7ed' }]}>
              <Feather name="file-text" size={24} color="#f97316" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Subjective (Essay)</Text>
              <Text style={styles.cardSubtitle}>Configure rubrics for long answers</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.grayLight} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.card}
            onPress={() => router.push({
              pathname: "/(tabs)/classes/quiz-score",
              params: { classId, activityId, name: className, section, color: headerColor, title },
            })}
          >
            <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
              <Feather name="users" size={24} color="#00b679" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Student Scores</Text>
              <Text style={styles.cardSubtitle}>View results and individual cards</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.grayLight} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Activity Name Modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setEditOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Rename Activity</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Title</Text>
              <TextInput
                value={tempTitle}
                onChangeText={setTempTitle}
                placeholder="e.g. Final Exam"
                style={styles.modalInput}
                autoFocus
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSave, { backgroundColor: headerColor }, saving && { opacity: 0.7 }]}
              onPress={saveTitle}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color={colors.white} size="small" /> : (
                <>
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                  <Feather name="check" size={20} color={colors.white} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
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
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: { color: colors.white, fontSize: 12, opacity: 0.9, fontFamily: typography.fontFamily.bold, textTransform: 'uppercase' },
  headerBig: { color: colors.white, fontSize: 18, fontFamily: typography.fontFamily.bold },
  editBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 150 },
  titleCard: { backgroundColor: colors.white, borderRadius: 24, padding: 24, marginBottom: 32, ...shadows.soft },
  titleLabel: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily.bold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  activityTitle: { fontSize: 24, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 16 },
  titleBar: { width: 40, height: 4, borderRadius: 2 },
  sectionHeading: { fontSize: 18, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 20 },
  cardContainer: { gap: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.soft,
  },
  iconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, marginLeft: 16 },
  cardTitle: { fontSize: 17, fontFamily: typography.fontFamily.bold, color: colors.text },
  cardSubtitle: { fontSize: 13, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: colors.white, borderRadius: 24, padding: 24, ...shadows.medium },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalHeaderTitle: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.text },
  inputContainer: { marginBottom: 24 },
  inputLabel: { fontSize: 13, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  modalInput: { backgroundColor: colors.grayLight, padding: 16, borderRadius: 16, fontSize: 16, fontFamily: typography.fontFamily.medium, color: colors.text },
  modalSave: { paddingVertical: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...shadows.soft },
  modalSaveText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
});
