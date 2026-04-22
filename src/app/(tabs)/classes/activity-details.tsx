import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { GlassCard } from "../../../components/GlassCard";
import { PageMotion } from "../../../components/PageMotion";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../../firebase/firebaseConfig";
import { updateActivity } from "../../../services/class.service";
import { showAlert } from "../../../utils/alert";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : v ?? fb;

export default function ActivityDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, "#00b679");
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

    const uid = auth.currentUser?.uid;
    if (!uid || !classId || !activityId) {
      setTitle(t);
      setEditOpen(false);
      return;
    }

    try {
      setSaving(true);
      await updateActivity(uid, classId, activityId, t);
      setTitle(t);
      setEditOpen(false);
    } catch {
      showAlert("Error", "Failed to update activity title.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSmall}>{className}</Text>
          <Text style={styles.headerBig} numberOfLines={1}>{section}</Text>
        </View>
        <TouchableOpacity onPress={openEdit} style={styles.editBtn}>
          <Feather name="edit-3" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageMotion delay={50}>
          <GlassCard>
            <View style={{ padding: 24 }}>
              <Text style={styles.titleLabel}>Selected Activity</Text>
              <Text style={styles.activityTitle}>{title}</Text>
              <View style={[styles.titleBar, { backgroundColor: headerColor }]} />
            </View>
          </GlassCard>
        </PageMotion>

        <Text style={styles.sectionHeading}>Grading Configurations</Text>

        <View style={styles.cardContainer}>
          <PageMotion delay={100}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/classes/qa",
                  params: { classId, activityId, name: className, section, color: headerColor, title },
                })
              }
            >
              <GlassCard borderRadius={20}>
                <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.iconBox, { backgroundColor: '#f0f4ff' }]}>
                    <Feather name="message-square" size={22} color="#4c6fff" />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Objective (Q&A)</Text>
                    <Text style={styles.cardSubtitle}>Set answer keys for auto-grading</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#ccc" />
                </View>
              </GlassCard>
            </TouchableOpacity>
          </PageMotion>

          <PageMotion delay={150}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/classes/essay",
                  params: { classId, activityId, name: className, section, color: headerColor, title },
                })
              }
            >
              <GlassCard borderRadius={20}>
                <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.iconBox, { backgroundColor: '#fff7ed' }]}>
                    <Feather name="file-text" size={22} color="#f97316" />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Subjective (Essay)</Text>
                    <Text style={styles.cardSubtitle}>Configure rubrics for long answers</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#ccc" />
                </View>
              </GlassCard>
            </TouchableOpacity>
          </PageMotion>

          <PageMotion delay={200}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/classes/quiz-score",
                  params: { classId, activityId, name: className, section, color: headerColor, title },
                })
              }
            >
              <GlassCard borderRadius={20}>
                <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
                    <Feather name="users" size={22} color="#00b679" />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Student Scores</Text>
                    <Text style={styles.cardSubtitle}>View results and individual cards</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#ccc" />
                </View>
              </GlassCard>
            </TouchableOpacity>
          </PageMotion>
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
                <Feather name="x" size={20} color="#999" />
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
                placeholderTextColor="#bbb"
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSave, { backgroundColor: headerColor }, saving && { opacity: 0.7 }]}
              onPress={saveTitle}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                  <Feather name="check" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: { paddingHorizontal: 20, paddingBottom: 45, flexDirection: "row", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: { color: "#fff", fontSize: 12, opacity: 0.8, fontWeight: '600', textTransform: 'uppercase' },
  headerBig: { color: "#fff", fontSize: 18, fontWeight: "800" },
  editBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  content: { padding: 20, paddingBottom: 150 },
  titleCard: { backgroundColor: "rgba(255, 255, 255, 0.85)", borderRadius: 24, padding: 24, marginBottom: 30, elevation: 1, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 15 },
  titleLabel: { fontSize: 13, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  activityTitle: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 15 },
  titleBar: { width: 40, height: 4, borderRadius: 2 },

  sectionHeading: { fontSize: 17, fontWeight: "800", color: "#111", marginBottom: 20, marginLeft: 5 },
  cardContainer: { gap: 12 },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  iconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, marginLeft: 16 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#222" },
  cardSubtitle: { fontSize: 13, color: "#999", marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", padding: 25 },
  modalCard: { backgroundColor: "rgba(255, 255, 255, 0.85)", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalHeaderTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  inputContainer: { marginBottom: 25 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#666", marginBottom: 10, textTransform: 'uppercase' },
  modalInput: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 14, fontSize: 16, color: '#111', borderWidth: 1, borderColor: '#f0f0f0' },
  modalSave: { paddingVertical: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});