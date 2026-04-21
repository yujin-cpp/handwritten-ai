import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ref as dbRef, onValue } from "firebase/database";
import { ref as storageRef, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db, storage } from "../../../firebase/firebaseConfig";
import { showAlert } from "../../../utils/alert";

import { AI_SERVER_URL } from "../../../constants/Config";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

export default function Masterlist() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const classId = P(params.classId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, "#00b679");

  const [modalVisible, setModalVisible] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !classId) return;

    const studentsRef = dbRef(
      db,
      `professors/${uid}/classes/${classId}/students`,
    );
    const unsubscribe = onValue(studentsRef, (snapshot) => {
      setHasFile(snapshot.exists() && snapshot.hasChildren());
    */

    return () => unsubscribe();
  }, [classId]);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      */

      if (result.canceled) return;
      const fileAsset = result.assets[0];
      setUploading(true);
      setModalVisible(false);

      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("User not authenticated");

      // uploading via REST API...
      

      const fileRef = storageRef(storage, `masterlists/${uid}/${classId}/${fileAsset.name}`);
      const aiResponse = await fetch('https://handwritten-ai-server-1093390926434.us-central1.run.app/upload-masterlist', { method: 'POST', body: formData });
      const data = await aiResponse.json();
      if (!aiResponse.ok || !data.success) throw new Error(data.error || 'Failed to upload to AI Server');
      /*
        // Ensure the storage trigger sees a PDF content type.
        
      */

      showAlert("Success", "Masterlist uploaded! Processing student data...");
    } catch (error: any) {
      const rawServerResponse =
        typeof error?.serverResponse === "string" ? error.serverResponse : "";
      const statusMatch = rawServerResponse.match(/"code"\s*:\s*(\d{3})/);
      const httpStatus = statusMatch?.[1] ? `HTTP ${statusMatch[1]}` : "";

      console.error("Masterlist upload failed", {
        code: error?.code,
        message: error?.message,
        serverResponse: error?.serverResponse,
      */

      const detail = [error?.code, httpStatus].filter(Boolean).join(" | ");
      showAlert(
        "Error",
        detail
          ? `Failed to upload masterlist (${detail}). Check console for details.`
          : "Failed to upload masterlist.",
      );
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
          <Text style={styles.headerSmall}>{section}</Text>
          <Text style={styles.headerBig} numberOfLines={1}>
            {className}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>Student Roster</Text>
          <Text style={styles.sectionTitle}>Class Masterlist</Text>
          <Text style={styles.sectionDesc}>
            Upload a PDF masterlist to automatically populate your class with
            students. Each page should follow the standard roster format.
          </Text>
        </View>

        {uploading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={headerColor} />
            <Text style={styles.loadingText}>Processing PDF Roster...</Text>
            <Text style={styles.loadingSub}>
              This might take a few seconds.
            </Text>
          </View>
        ) : hasFile ? (
          <View style={styles.statusSection}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listLabel}>CURRENT ROSTER</Text>
              <View
                style={[
                  styles.activeBadge,
                  { backgroundColor: headerColor + "15" },
                ]}
              >
                <Text style={[styles.activeBadgeText, { color: headerColor }]}>
                  ACTIVE
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.fileCard}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/classes/masterlist-view-section",
                  params: {
                    classId,
                    name: className,
                    section,
                    color: headerColor,
                  },
                })
              }
            >
              <View
                style={[
                  styles.fileIconBox,
                  { backgroundColor: headerColor + "10" },
                ]}
              >
                <Feather name="file-text" size={24} color={headerColor} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{className}_Masterlist.pdf</Text>
                <Text style={styles.fileDate}>Tap to manage students</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.replaceBtn}
              onPress={() => setModalVisible(true)}
            >
              <Feather name="refresh-cw" size={14} color="#666" />
              <Text style={styles.replaceText}>Upload New Masterlist</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <TouchableOpacity
              style={styles.uploadMainBtn}
              onPress={() => setModalVisible(true)}
            >
              <View
                style={[
                  styles.largeIconBox,
                  { backgroundColor: headerColor + "10" },
                ]}
              >
                <Feather name="upload-cloud" size={40} color={headerColor} />
              </View>
              <Text style={styles.uploadMainTitle}>No Masterlist Found</Text>
              <Text style={styles.uploadMainSub}>
                Tap here to upload your student roster (PDF)
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Upload Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Import Roster</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formatCard}>
                <Feather name="alert-circle" size={18} color="#f97316" />
                <Text style={styles.formatText}>
                  Only PDF files are supported for automatic student extraction.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.selectBtn, { backgroundColor: headerColor }]}
                onPress={handleUpload}
              >
                <Feather name="plus" size={20} color="#fff" />
                <Text style={styles.selectBtnText}>Select PDF File</Text>
              </TouchableOpacity>

              <Text style={styles.modalHelp}>
                Ensure names are clearly legible for accurate parsing.
              </Text>
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
  headerSmall: {
    color: "#fff",
    fontSize: 11,
    opacity: 0.8,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  headerBig: { color: "#fff", fontSize: 18, fontWeight: "800" },

  content: { padding: 20 },
  infoSection: { marginBottom: 35, paddingHorizontal: 5 },
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

  statusSection: {},
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  listLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#bbb",
    letterSpacing: 1,
  },
  activeBadge: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: { fontSize: 10, fontWeight: "900" },

  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  fileIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  fileInfo: { flex: 1, marginLeft: 15 },
  fileName: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 4 },
  fileDate: { fontSize: 13, color: "#999", fontWeight: "500" },

  replaceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 8,
    opacity: 0.6,
  },
  replaceText: { fontSize: 13, fontWeight: "700", color: "#666" },

  loadingCard: {
    alignItems: "center",
    paddingVertical: 50,
    backgroundColor: "#fff",
    borderRadius: 24,
  },
  loadingText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
    marginTop: 20,
  },
  loadingSub: { fontSize: 13, color: "#999", marginTop: 6 },

  emptyContainer: { alignItems: "center" },
  uploadMainBtn: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 60,
    backgroundColor: "#fff",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderStyle: "dashed",
  },
  largeIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  uploadMainTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  uploadMainSub: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    padding: 25,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  modalBody: {},
  formatCard: { flexDirection: 'row', gap: 12, backgroundColor: '#fff7ed', padding: 15, borderRadius: 16, marginBottom: 20, alignItems: 'center' },
  formatText: { flex: 1, fontSize: 13, color: '#c2410c', fontWeight: '600', lineHeight: 18 },
  selectBtn: { paddingVertical: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  selectBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  modalHelp: { textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 20, fontStyle: 'italic' },
*/

