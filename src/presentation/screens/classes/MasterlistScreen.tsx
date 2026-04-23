import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { storageRepository } from "../../../data/repositories/FirebaseStorageRepository";
import { studentRepository } from "../../../data/repositories/FirebaseStudentRepository";
import { showAlert } from "../../../utils/alert";
import { safeGoBack } from "../../../utils/navigation";

const P = (v: string | string[] | undefined, fb = "") => Array.isArray(v) ? v[0] : (v ?? fb);

export const MasterlistScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { uid } = useAuthSession();

  const classId = P(params.classId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, colors.primary);

  const [modalVisible, setModalVisible] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!uid || !classId) return;

    // We use the repository to check if students exist. If the array is > 0, we have a file/students.
    const unsubscribe = studentRepository.listenToStudents(uid, classId, (students) => {
      setHasFile(students.length > 0);
    });

    return () => unsubscribe();
  }, [classId, uid]);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileAsset = result.assets[0];
      setUploading(true);
      setModalVisible(false);

      if (!uid) throw new Error("User not authenticated");

      // Upload to Firebase Storage — this automatically triggers the
      // `processMasterlist` Cloud Function which extracts student names
      // from the PDF and writes them to the Realtime Database.
      const storagePath = `masterlists/${uid}/${classId}/${fileAsset.name ?? "masterlist.pdf"}`;
      await storageRepository.uploadFileFromUri(storagePath, fileAsset.uri);

      showAlert("Success", "Masterlist uploaded! The system is processing your roster — students will appear shortly.");
    } catch (error: any) {
      console.error("Masterlist upload failed", error);
      showAlert("Error", error?.message || "Failed to upload masterlist.");
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
          <Text style={styles.headerSmall}>{section}</Text>
          <Text style={styles.headerBig} numberOfLines={1}>{className}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>Student Roster</Text>
          <Text style={styles.sectionTitle}>Class Masterlist</Text>
          <Text style={styles.sectionDesc}>
            Upload a PDF masterlist to automatically populate your class with students. Each page should follow the standard roster format.
          </Text>
        </View>

        {uploading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={headerColor} />
            <Text style={styles.loadingText}>Processing PDF Roster...</Text>
            <Text style={styles.loadingSub}>This might take a few seconds.</Text>
          </View>
        ) : hasFile ? (
          <View style={styles.statusSection}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listLabel}>CURRENT ROSTER</Text>
              <View style={[styles.activeBadge, { backgroundColor: headerColor + "15" }]}>
                <Text style={[styles.activeBadgeText, { color: headerColor }]}>ACTIVE</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/classes/masterlist-view-section",
                  params: { classId, name: className, section, color: headerColor },
                })
              }
              style={styles.actionCard}
            >
              <View style={[styles.fileIconBox, { backgroundColor: headerColor + "15" }]}>
                <Feather name="file-text" size={24} color={headerColor} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{className}_Masterlist.pdf</Text>
                <Text style={styles.fileDate}>Tap to manage students</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.replaceBtn} onPress={() => setModalVisible(true)}>
              <Feather name="refresh-cw" size={14} color={colors.textSecondary} />
              <Text style={styles.replaceText}>Upload New Masterlist</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.emptyCard} onPress={() => setModalVisible(true)}>
            <View style={[styles.largeIconBox, { backgroundColor: headerColor + "15" }]}>
              <Feather name="upload-cloud" size={40} color={headerColor} />
            </View>
            <Text style={styles.uploadMainTitle}>No Masterlist Found</Text>
            <Text style={styles.uploadMainSub}>Tap here to upload your student roster (PDF)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setModalVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Import Roster</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formatCard}>
                <Feather name="alert-circle" size={20} color="#c2410c" />
                <Text style={styles.formatText}>Only PDF files are supported for automatic student extraction.</Text>
              </View>

              <TouchableOpacity style={[styles.selectBtn, { backgroundColor: headerColor }]} onPress={handleUpload}>
                <Feather name="plus" size={20} color={colors.white} />
                <Text style={styles.selectBtnText}>Select PDF File</Text>
              </TouchableOpacity>

              <Text style={styles.modalHelp}>Ensure names are clearly legible for accurate parsing.</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: "row", alignItems: "center", ...shadows.soft },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
  headerInfo: { flex: 1, paddingHorizontal: 10, alignItems: "center" },
  headerSmall: { color: colors.white, fontSize: 11, fontFamily: typography.fontFamily.bold, textTransform: "uppercase", opacity: 0.9 },
  headerBig: { color: colors.white, fontSize: 18, fontFamily: typography.fontFamily.bold },
  content: { padding: 24, paddingBottom: 150 },
  infoSection: { marginBottom: 32 },
  sectionLabel: { fontSize: 13, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: "uppercase", marginBottom: 8 },
  sectionTitle: { fontSize: 24, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 12 },
  sectionDesc: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, lineHeight: 24 },
  statusSection: {},
  listHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  listLabel: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, letterSpacing: 1 },
  activeBadge: { marginLeft: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { fontSize: 10, fontFamily: typography.fontFamily.bold },
  actionCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, padding: 20, borderRadius: 20, ...shadows.soft },
  fileIconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  fileInfo: { flex: 1, marginLeft: 16 },
  fileName: { fontSize: 16, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 4 },
  fileDate: { fontSize: 13, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  replaceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 24, gap: 8, opacity: 0.7 },
  replaceText: { fontSize: 14, fontFamily: typography.fontFamily.bold, color: colors.textSecondary },
  loadingCard: { alignItems: "center", paddingVertical: 60, backgroundColor: colors.white, borderRadius: 24, ...shadows.soft },
  loadingText: { fontSize: 18, fontFamily: typography.fontFamily.bold, color: colors.text, marginTop: 20 },
  loadingSub: { fontSize: 14, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginTop: 8 },
  emptyCard: { alignItems: "center", paddingVertical: 60, backgroundColor: colors.white, borderRadius: 24, borderWidth: 2, borderColor: colors.grayLight, borderStyle: "dashed" },
  largeIconBox: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  uploadMainTitle: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.text },
  uploadMainSub: { fontSize: 14, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginTop: 8, textAlign: "center", paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: colors.white, borderRadius: 24, padding: 24, ...shadows.medium },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.text },
  modalBody: {},
  formatCard: { flexDirection: "row", gap: 12, backgroundColor: "#fff7ed", padding: 16, borderRadius: 16, marginBottom: 20, alignItems: "center" },
  formatText: { flex: 1, fontSize: 14, color: "#c2410c", fontFamily: typography.fontFamily.semiBold, lineHeight: 20 },
  selectBtn: { paddingVertical: 18, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  selectBtnText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  modalHelp: { textAlign: "center", fontSize: 13, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginTop: 20, fontStyle: "italic" },
});
