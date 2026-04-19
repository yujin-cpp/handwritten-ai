import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { onValue, push, ref, set } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../../../firebase/firebaseConfig";
import { uploadFileViaServer } from "../../../utils/uploadFile";

import { showAlert } from "../../../utils/alert";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

type QAFile = {
  id: string;
  name: string;
  url: string;
  type?: string;
};

export default function QAList() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, "#00b679");
  const title = P(params.title, "Activity");

  const [qaFiles, setQaFiles] = useState<QAFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !classId || !activityId) return;

    const filesRef = ref(
      db,
      `professors/${uid}/classes/${classId}/activities/${activityId}/files`,
    );
    const unsubscribe = onValue(filesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setQaFiles([]);
        setLoading(false);
        return;
      }

      const data = snapshot.val();
      const loadedFiles = Object.keys(data).map((key) => ({
        id: key,
        name: data[key].name,
        url: data[key].url,
        type: data[key].type,
      }));

      setQaFiles(loadedFiles);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [classId, activityId]);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/*",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      setUploading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("User not logged in");

      const storagePath = `qa_uploads/${uid}/${classId}/${activityId}/${asset.name}`;
      const downloadUrl = await uploadFileViaServer(
        asset.uri,
        asset.name,
        storagePath,
        asset.mimeType || "application/pdf",
      );

      const dbReference = ref(
        db,
        `professors/${uid}/classes/${classId}/activities/${activityId}/files`,
      );
      const newFileRef = push(dbReference);
      await set(newFileRef, {
        name: asset.name,
        url: downloadUrl,
        type: asset.mimeType || "application/pdf",
        uploadedAt: new Date().toISOString(),
      });

      showAlert("Success", "Answer key uploaded successfully!");
    } catch (e: any) {
      console.error("Upload error", e.message);
      showAlert("Error", "Failed to upload file. Please try again.");
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
          <Text style={styles.headerSmall}>
            {className} • {section}
          </Text>
          <Text style={styles.headerBig} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>Grading Method</Text>
          <Text style={styles.sectionTitle}>Objective Answer Keys</Text>
          <Text style={styles.sectionDesc}>
            Upload PDF, Word, or Image files containing the correct answers. Our
            AI will use these to grade objective portions.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.uploadCard, uploading && styles.uploadingCard]}
          activeOpacity={0.8}
          onPress={handleUpload}
          disabled={uploading}
        >
          <View
            style={[
              styles.uploadIconBox,
              { backgroundColor: headerColor + "15" },
            ]}
          >
            {uploading ? (
              <ActivityIndicator color={headerColor} />
            ) : (
              <Feather name="upload-cloud" size={28} color={headerColor} />
            )}
          </View>
          <View style={styles.uploadInfo}>
            <Text style={styles.uploadTitle}>
              {uploading ? "Uploading File..." : "Tap to Upload Key"}
            </Text>
            <Text style={styles.uploadSub}>
              Supports PDF, DOCX, and JPG/PNG
            </Text>
          </View>
          {!uploading && <Feather name="plus" size={20} color="#ccc" />}
        </TouchableOpacity>

        <View style={styles.listSection}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeader}>UPLOADED KEYS</Text>
            <View
              style={[styles.badge, { backgroundColor: headerColor + "15" }]}
            >
              <Text style={[styles.badgeText, { color: headerColor }]}>
                {qaFiles.length}
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="small"
              color="#888"
              style={{ marginTop: 30 }}
            />
          ) : qaFiles.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="file-minus" size={40} color="#eee" />
              <Text style={styles.emptyText}>
                No files uploaded for this activity.
              </Text>
            </View>
          ) : (
            <View style={styles.fileList}>
              {qaFiles.map((file) => (
                <TouchableOpacity
                  key={file.id}
                  style={styles.fileItem}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/classes/qa-view",
                      params: {
                        name: className,
                        section,
                        color: headerColor,
                        title,
                        fileId: file.id,
                        fileName: file.name,
                        classId,
                        activityId,
                        fileUrl: encodeURIComponent(file.url),
                      },
                    })
                  }
                >
                  <View style={styles.fileIconBox}>
                    <Feather
                      name={
                        file.name.match(/\.(jpg|jpeg|png|gif)$/i)
                          ? "image"
                          : "file-text"
                      }
                      size={20}
                      color="#666"
                    />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileType}>Tap to open and review</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#ccc" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
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

  content: { padding: 20 },
  infoSection: { marginBottom: 30, paddingHorizontal: 5 },
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

  uploadCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    marginBottom: 35,
  },
  uploadingCard: { opacity: 0.8 },
  uploadIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadInfo: { flex: 1, marginLeft: 20 },
  uploadTitle: { fontSize: 17, fontWeight: "800", color: "#111" },
  uploadSub: { fontSize: 13, color: "#999", marginTop: 4, fontWeight: "500" },

  listSection: { paddingHorizontal: 5 },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  listHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#bbb",
    letterSpacing: 1,
  },
  badge: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontSize: 12, fontWeight: "800" },

  emptyState: { alignItems: "center", paddingVertical: 50 },
  emptyText: { fontSize: 15, color: "#ccc", marginTop: 15, fontWeight: "500" },

  fileList: { gap: 12 },
  fileItem: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
  },
  fileInfo: { flex: 1, marginLeft: 15 },
  fileName: { fontSize: 15, fontWeight: "700", color: "#222" },
  fileType: { fontSize: 12, color: "#aaa", marginTop: 2 },
});
