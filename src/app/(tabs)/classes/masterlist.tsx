import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from "expo-router";
import { ref as dbRef, onValue } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../../../firebase/firebaseConfig"; // Ensure 'storage' is initialized in firebaseConfig or use getStorage()

export default function Masterlist() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // 1. Get Params
  const params = useLocalSearchParams();
  const getParam = (v: any) => (Array.isArray(v) ? v[0] : v || "");

  const classId = getParam(params.classId);
  const className = getParam(params.name) || "BSCS-4B";
  const section = getParam(params.section) || "GEM14-M";
  const headerColor = getParam(params.color) || "#BB73E0";

  const [modalVisible, setModalVisible] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 2. Listen for Masterlist Data (Students)
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !classId) return;

    const studentsRef = dbRef(db, `professors/${uid}/classes/${classId}/students`);
    
    const unsubscribe = onValue(studentsRef, (snapshot) => {
      setHasFile(snapshot.exists() && snapshot.hasChildren());
    });

    return () => unsubscribe();
  }, [classId]);

  // 3. Handle File Pick & Upload
  const handleUpload = async () => {
    try {
      // Pick the PDF
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf", // STRICTLY PDF
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileAsset = result.assets[0];
      setUploading(true);
      setModalVisible(false); // Close modal while uploading

      // Prepare Upload
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("User not authenticated");

      // Fetch the file as a Blob (Required for React Native Firebase)
      const response = await fetch(fileAsset.uri);
      const blob = await response.blob();

      // Upload to the path triggers the Cloud Function
      // Path: masterlists/{uid}/{classId}/{filename}
      const storage = getStorage();
      const fileRef = storageRef(storage, `masterlists/${uid}/${classId}/${fileAsset.name}`);

      await uploadBytes(fileRef, blob);

      Alert.alert("Success", "Masterlist uploaded! Processing student data...");

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to upload masterlist.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.className}>{className}</Text>
          <Text style={styles.sectionName}>{section}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Class Masterlist</Text>

        {/* LOADING STATE */}
        {uploading ? (
           <View style={styles.emptyStateContainer}>
             <ActivityIndicator size="large" color={headerColor} />
             <Text style={styles.uploadedLabel}>Uploading & Parsing PDF...</Text>
           </View>
        ) : hasFile ? (
          /* STATE: Masterlist Exists -> Show Filename Button */
          <View style={{ marginTop: 10 }}>
            <Text style={styles.uploadedLabel}>Uploaded Masterlist</Text>
            
            <TouchableOpacity
              style={styles.fileCard}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/classes/masterlist-view-section",
                  params: {
                    classId: classId,
                    name: className,
                    section: section,
                    color: headerColor,
                  },
                })
              }
            >
              {/* Changed CSV to PDF label */}
              <Text style={styles.fileName}>{className}.pdf</Text>
              <Ionicons name="chevron-forward" size={18} color="#000" />
            </TouchableOpacity>
          </View>
        ) : (
          /* STATE: No Masterlist -> Show Upload Button + Indicator */
          <View>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#000" style={{ marginRight: 6 }} />
              <Text style={styles.uploadText}>Upload a masterlist</Text>
            </TouchableOpacity>

            <View style={styles.emptyStateContainer}>
                <Ionicons name="document-outline" size={40} color="#ccc" />
                <Text style={styles.noFileText}>No masterlist uploaded.</Text>
            </View>
          </View>
        )}
      </View>

      {/* Upload Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={20} color="#2E7D32" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Upload a file</Text>
            <Ionicons name="cloud-upload-outline" size={36} color="#000" style={{ marginVertical: 10 }} />
            <Text style={styles.modalText}>Choose a PDF masterlist to upload.</Text>

            {/* Trigger Handle Upload directly */}
            <TouchableOpacity style={styles.modalUploadBtn} onPress={handleUpload}>
              <Text style={styles.modalUploadText}>Select PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 17,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 10,
  },
  headerTextContainer: {
    flexDirection: "column",
  },
  className: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.8,
  },
  sectionName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    color: "#01B468",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
  
  // Upload Styles
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    elevation: 2,
  },
  uploadText: {
    fontSize: 15,
    color: "#000",
  },
  
  // Empty State Styles
  emptyStateContainer: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  noFileText: {
    color: "#999",
    fontSize: 14,
    fontStyle: "italic",
  },

  // File Card Styles
  uploadedLabel: {
    fontSize: 15,
    color: "#000",
    fontWeight: "500",
    marginBottom: 8,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    elevation: 2,
  },
  fileName: {
    fontSize: 15,
    color: "#000",
    fontWeight: "600",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    elevation: 5,
  },
  closeIcon: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E7D32",
  },
  modalText: {
    fontSize: 14,
    color: "#000",
    marginVertical: 8,
  },
  modalUploadBtn: {
    backgroundColor: "#2E7D32",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 30,
    marginTop: 8,
  },
  modalUploadText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});