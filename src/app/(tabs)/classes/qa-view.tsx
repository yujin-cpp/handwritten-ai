import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ref, remove } from "firebase/database";
import { deleteObject, getStorage, ref as storageRef } from "firebase/storage";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { auth, db } from "../../../firebase/firebaseConfig";
import { showAlert } from "../../../utils/alert";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

export default function QAView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, "#00b679");
  const title = P(params.title, "Activity Key");

  const fileName = P(params.fileName, "Unknown File");
  const fileUrl = P(params.fileUrl, "");
  const fileId = P(params.fileId, "");
  const classId = P(params.classId, "");
  const activityId = P(params.activityId, "");

  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  const lowerName = fileName.toLowerCase();
  const isImage = lowerName.match(/\.(jpg|jpeg|png|gif)$/i);
  const isPdf = lowerName.endsWith("pdf");

  const handleOpenLink = () => {
    if (fileUrl) {
      Linking.openURL(fileUrl);
    } else {
      showAlert("Error", "File URL not found.");
    }
  };

  const handleDelete = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !classId || !activityId || !fileId) {
      showAlert("Error", "Missing information to delete.");
      return;
    }

    setDeleting(true);
    try {
      const dbRef = ref(
        db,
        `professors/${uid}/classes/${classId}/activities/${activityId}/files/${fileId}`,
      );
      await remove(dbRef);

      try {
        const storage = getStorage();
        const fileRef = storageRef(
          storage,
          `qa_uploads/${uid}/${classId}/${activityId}/${fileName}`,
        );
        await deleteObject(fileRef);
      } catch (storageErr) {
        console.warn("Storage delete failed:", storageErr);
      }

      setConfirmDel(false);
      router.back();
      showAlert("Deleted", "File was successfully removed.");
    } catch (error) {
      console.error("Delete error", error);
      showAlert("Error", "Failed to delete file.");
    } finally {
      setDeleting(false);
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
            Answer Key
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setConfirmDel(true)}
          style={styles.headerActionBtn}
        >
          <Feather name="trash-2" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewCard}>
          <View style={styles.cardInfo}>
            <Text style={styles.activityName}>{title}</Text>
            <Text style={styles.fileName}>{fileName}</Text>
          </View>

          <View style={styles.viewerContainer}>
            {isImage && fileUrl ? (
              <View style={styles.imageViewer}>
                {imgLoading && (
                  <ActivityIndicator
                    style={styles.loader}
                    color={headerColor}
                  />
                )}
                <Image
                  source={{ uri: fileUrl }}
                  style={styles.previewImg}
                  resizeMode="contain"
                  onLoadEnd={() => setImgLoading(false)}
                />
              </View>
            ) : (
              <View style={styles.filePlaceholder}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: headerColor + "10" },
                  ]}
                >
                  <Feather
                    name={isPdf ? "file-text" : "file"}
                    size={64}
                    color={headerColor}
                  />
                </View>
                <Text style={styles.placeholderText}>
                  {isPdf ? "PDF Document" : "Word Document"}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: headerColor }]}
            onPress={handleOpenLink}
          >
            <Feather name="external-link" size={18} color={headerColor} />
            <Text style={[styles.actionBtnText, { color: headerColor }]}>
              Open Original File
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hintBox}>
          <Feather name="info" size={16} color="#999" />
          <Text style={styles.hintText}>
            This file is used by the AI to verify correct answers during
            automated grading.
          </Text>
        </View>
      </ScrollView>

      {/* Delete Modal */}
      <Modal
        visible={confirmDel}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDel(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setConfirmDel(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.warnIcon}>
              <Feather name="alert-triangle" size={32} color="#ff3b30" />
            </View>
            <Text style={styles.modalTitle}>Delete File?</Text>
            <Text style={styles.modalSub}>
              Are you sure you want to remove this answer key? This cannot be
              undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmDel(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelBtnText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteBtnText}>Confirm Delete</Text>
                )}
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
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  content: { padding: 20 },
  previewCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 15,
  },
  cardInfo: { marginBottom: 20, alignItems: "center" },
  activityName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#bbb",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  fileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },

  viewerContainer: {
    height: 350,
    backgroundColor: "#f9f9f9",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  imageViewer: { width: "100%", height: "100%" },
  previewImg: { width: "100%", height: "100%" },
  loader: { position: "absolute" },

  filePlaceholder: { alignItems: "center" },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  placeholderText: { fontSize: 16, fontWeight: "700", color: "#666" },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 5,
  },
  actionBtnText: { fontWeight: "800", fontSize: 15 },

  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 10,
    opacity: 0.6,
  },
  hintText: { fontSize: 12, color: "#333", flex: 1, lineHeight: 18 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    padding: 25,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  warnIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
  },
  modalSub: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  cancelBtnText: { color: "#666", fontWeight: "800", fontSize: 15 },
  deleteBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#ff3b30",
    alignItems: "center",
  },
  deleteBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
