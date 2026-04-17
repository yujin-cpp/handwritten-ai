import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showAlert } from "../../../utils/alert";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

export default function EssayView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const id = P(params.id, "");
  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, "#00b679");
  const title = P(params.title, "Essay Rubric");

  const lessonRef = P(params.lessonRef, "No file attached");
  const rubrics = P(params.rubrics, "No file attached");
  const lessonUrl = P(params.lessonUrl, "");
  const rubricsUrl = P(params.rubricsUrl, "");

  const [confirmVisible, setConfirmVisible] = useState(false);

  function handleOpenFile(url: string, name: string) {
    if (url && url.startsWith("http")) {
      Linking.openURL(url).catch(() => {
        showAlert("Error", "Could not open file link.");
      });
    } else {
      showAlert("No File", `No downloadable file found for "${name}".`);
    }
  }

  function handleConfirmDelete() {
    setConfirmVisible(false);
    router.replace({
      pathname: "/(tabs)/classes/essay",
      params: {
        deletedId: id,
        classId,
        activityId,
        name: className,
        section,
        color: headerColor,
      },
    });
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSmall}>{className} • {section}</Text>
          <Text style={styles.headerBig} numberOfLines={1}>Review Rubric</Text>
        </View>
        <TouchableOpacity onPress={() => setConfirmVisible(true)} style={styles.headerActionBtn}>
          <Feather name="trash-2" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.label}>Instructions</Text>
            <Feather name="info" size={14} color="#ccc" />
          </View>
          <Text style={styles.titleText}>{title}</Text>
          <View style={styles.divider} />
          <Text style={styles.bodyText}>
            This rubric specifies the criteria for grading this essay. The AI model will prioritize these instructions during the evaluation process.
          </Text>
        </View>

        <View style={[styles.card, { marginTop: 25 }]}>
          <Text style={styles.label}>Material Links</Text>

          <TouchableOpacity
            style={styles.fileLink}
            onPress={() => handleOpenFile(lessonUrl, "Lesson Reference")}
          >
            <View style={[styles.iconBox, { backgroundColor: '#f0f0ff' }]}>
              <Feather name="book" size={20} color="#6c63ff" />
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileLabel}>Lesson Reference</Text>
              <Text style={styles.fileName} numberOfLines={1}>{lessonRef}</Text>
            </View>
            <Feather name="external-link" size={16} color="#ccc" />
          </TouchableOpacity>

          <View style={[styles.divider, { marginVertical: 15 }]} />

          <TouchableOpacity
            style={styles.fileLink}
            onPress={() => handleOpenFile(rubricsUrl, "Score Rubrics")}
          >
            <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
              <Feather name="list" size={20} color="#00b679" />
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileLabel}>Score Rubrics</Text>
              <Text style={styles.fileName} numberOfLines={1}>{rubrics}</Text>
            </View>
            <Feather name="external-link" size={16} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setConfirmVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.warnIcon}>
              <Feather name="alert-triangle" size={32} color="#ff3b30" />
            </View>
            <Text style={styles.modalTitle}>Delete Rubric?</Text>
            <Text style={styles.modalSub}>
              Are you sure you want to remove this grading instruction? This cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.cancelBtnText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleConfirmDelete}>
                <Text style={styles.deleteBtnText}>Delete Forever</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fb" },
  header: { paddingHorizontal: 20, paddingBottom: 25, flexDirection: "row", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: { color: "#fff", fontSize: 11, opacity: 0.8, fontWeight: '700', textTransform: 'uppercase' },
  headerBig: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerActionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  content: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  label: { fontSize: 12, fontWeight: '800', color: '#bbb', textTransform: 'uppercase', letterSpacing: 1 },
  titleText: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 15 },
  divider: { height: 1, backgroundColor: '#f0f0f0' },
  bodyText: { fontSize: 16, color: '#666', lineHeight: 26, marginTop: 15 },

  fileLink: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  fileInfo: { flex: 1, marginLeft: 15 },
  fileLabel: { fontSize: 11, fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: 2 },
  fileName: { fontSize: 15, fontWeight: '700', color: '#333' },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", padding: 25 },
  modalCard: { backgroundColor: "#fff", borderRadius: 28, padding: 30, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 30, elevation: 20 },
  warnIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 12 },
  modalSub: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%', justifyContent: 'center' },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#f5f5f5', alignItems: 'center' },
  cancelBtnText: { color: '#666', fontWeight: '800', fontSize: 15 },
  deleteBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#ff3b30', alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
