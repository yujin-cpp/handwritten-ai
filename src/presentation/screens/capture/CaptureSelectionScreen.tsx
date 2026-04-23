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
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { showAlert } from "../../../utils/alert";
import { safeGoBack } from "../../../utils/navigation";

import { classRepository } from "../../../data/repositories/FirebaseClassRepository";
import { activityRepository } from "../../../data/repositories/FirebaseActivityRepository";
import { studentRepository } from "../../../data/repositories/FirebaseStudentRepository";

type PickerType = "section" | "activity" | "name" | null;
type ClassOption = { id: string; name: string; section: string; color: string; label: string };

const P = (v: string | string[] | undefined, fb = "") => Array.isArray(v) ? v[0] : (v ?? fb);

export const CaptureSelectionScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { uid } = useAuthSession();

  const returnTo = P(params.returnTo);
  const originClassId = P(params.classId);
  const originActivityId = P(params.activityId);
  const originName = P(params.name, "Class");
  const originSection = P(params.section, "Section");
  const originColor = P(params.color, colors.primary);
  const originTitle = P(params.title, "Activity");

  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedClassSection, setSelectedClassSection] = useState("");
  const [selectedClassColor, setSelectedClassColor] = useState(originColor);

  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [selectedActivityName, setSelectedActivityName] = useState("");

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStudentName, setSelectedStudentName] = useState("");

  const [loading, setLoading] = useState(true);
  const [fetchingSubData, setFetchingSubData] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pickerType, setPickerType] = useState<PickerType>(null);
  const [pickerY, setPickerY] = useState(0);

  useEffect(() => {
    if (!uid) {
      setClassesList([]);
      setLoading(false);
      return;
    }

    setConfirmed(false);
    setLoading(true);

    const unsubscribe = classRepository.listenToClasses(uid, (data) => {
      const list = data.map((c) => ({
        id: c.id,
        name: c.className,
        section: c.section,
        color: c.themeColor || originColor,
        label: `${c.className} - ${c.section}`,
      }));
      setClassesList(list);

      const pClassId = P(params.classId);
      if (pClassId) {
        const foundClass = list.find((c) => c.id === pClassId);
        if (foundClass) {
          setSelectedClassId(foundClass.id);
          setSelectedClassName(foundClass.name);
          setSelectedClassSection(foundClass.section);
          setSelectedClassColor(foundClass.color);

          fetchSubData(foundClass.id).then((result) => {
            const pActId = P(params.activityId);
            const foundAct = result.activities.find((a: any) => a.id === pActId);
            if (foundAct) {
              setSelectedActivityId(foundAct.id);
              setSelectedActivityName(foundAct.title);
            }

            const pStuId = P(params.studentId);
            const foundStu = result.students.find((s: any) => s.id === pStuId);
            if (foundStu) {
              setSelectedStudentId(foundStu.id);
              setSelectedStudentName(foundStu.name);
            }

            if (foundClass && foundAct && foundStu) {
              setConfirmed(true);
            }
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid, originColor, params.classId, params.activityId, params.studentId]);

  const fetchSubData = async (classId: string) => {
    if (!uid) return { activities: [], students: [] };
    setFetchingSubData(true);
    try {
      const [activities, students] = await Promise.all([
        activityRepository.getActivities(uid, classId),
        studentRepository.getStudentsInClass(uid, classId),
      ]);
      setActivitiesList(activities);
      setStudentsList(students);
      return { activities, students };
    } catch (error) {
      console.error("Error fetching data:", error);
      return { activities: [], students: [] };
    } finally {
      setFetchingSubData(false);
    }
  };

  const handleSelectClass = async (selectedClass: ClassOption) => {
    setSelectedClassId(selectedClass.id);
    setSelectedClassName(selectedClass.name);
    setSelectedClassSection(selectedClass.section);
    setSelectedClassColor(selectedClass.color);
    setPickerType(null);
    setSelectedActivityId("");
    setSelectedActivityName("");
    setSelectedStudentId("");
    setSelectedStudentName("");
    setConfirmed(false);
    await fetchSubData(selectedClass.id);
  };

  const handleSelectActivity = async (id: string, name: string) => {
    setSelectedActivityId(id);
    setSelectedActivityName(name);
    setPickerType(null);
    setConfirmed(false);
    setSelectedStudentId("");
    setSelectedStudentName("");
    
    // Filter out students who are already graded for this activity
    if (uid && selectedClassId) {
      setFetchingSubData(true);
      try {
        const ungradedStudents = await studentRepository.getUngradedStudents(uid, selectedClassId, id);
        setStudentsList(ungradedStudents);
      } catch (error) {
        console.error("Error fetching ungraded students:", error);
      } finally {
        setFetchingSubData(false);
      }
    }
  };

  const handleSelectStudent = (id: string, name: string) => {
    setSelectedStudentId(id);
    setSelectedStudentName(name);
    setPickerType(null);
    setConfirmed(false);
  };

  const canConfirm = !!selectedClassId && !!selectedActivityId && !!selectedStudentId;

  const goBackToOrigin = () => {
    if (returnTo === "quiz-score" && originClassId && originActivityId) {
      router.replace({
        pathname: "/(tabs)/classes/quiz-score",
        params: { classId: originClassId, activityId: originActivityId, name: originName, section: originSection, color: originColor, title: originTitle },
      });
      return;
    }
    safeGoBack(router, '/(tabs)/home');
  };

  const handlePickImage = async () => {
    if (!canConfirm) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Permission required", "Gallery access is needed.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsMultipleSelection: true });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUris = result.assets.map((a) => a.uri);
      router.push({
        pathname: "/(tabs)/capture/image-captured",
        params: {
          imageUri: imageUris[0], imageUris: JSON.stringify(imageUris), classId: selectedClassId, activityId: selectedActivityId, studentId: selectedStudentId,
          returnTo, name: selectedClassName || originName, section: selectedClassSection || originSection, color: selectedClassColor || originColor, title: selectedActivityName || originTitle,
        },
      });
    }
  };

  const handleTakePhoto = () => {
    if (!canConfirm) return;
    router.push({
      pathname: "/(tabs)/capture/photo-taking",
      params: {
        classId: selectedClassId, activityId: selectedActivityId, studentId: selectedStudentId, returnTo,
        name: selectedClassName || originName, section: selectedClassSection || originSection, color: selectedClassColor || originColor, title: selectedActivityName || originTitle,
      },
    });
  };

  const getPickerOptions = () => {
    if (pickerType === "section") return classesList.map((c) => ({ id: c.id, label: c.label }));
    if (pickerType === "activity") return activitiesList.map((a) => ({ id: a.id, label: a.title }));
    if (pickerType === "name") return studentsList.map((s) => ({ id: s.id, label: s.name }));
    return [];
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0EA47A", "#017EBA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={goBackToOrigin} style={styles.backBtn}>
          <Feather name="arrow-left" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Capture Score</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <>
            {!confirmed ? (
              <View style={styles.card}>
                <Text style={styles.label}>Select Section</Text>
                <Pressable style={styles.dropdownBtn} onPress={(e) => { setPickerY(e.nativeEvent.pageY); setPickerType("section"); }}>
                  <Text style={!selectedClassName ? styles.dropdownPlaceholder : styles.dropdownText} numberOfLines={1}>
                    {selectedClassId ? `${selectedClassName} - ${selectedClassSection}` : "Choose a class..."}
                  </Text>
                  <Feather name="chevron-down" size={20} color={colors.textSecondary} />
                </Pressable>

                <Text style={styles.label}>Select Activity</Text>
                <Pressable style={[styles.dropdownBtn, !selectedClassId && styles.dropdownDisabled]} disabled={!selectedClassId} onPress={(e) => { setPickerY(e.nativeEvent.pageY); setPickerType("activity"); }}>
                  <Text style={!selectedActivityName ? styles.dropdownPlaceholder : styles.dropdownText} numberOfLines={1}>
                    {fetchingSubData ? "Loading..." : selectedActivityName || "Choose an activity..."}
                  </Text>
                  <Feather name="chevron-down" size={20} color={colors.textSecondary} />
                </Pressable>

                <Text style={styles.label}>Select Student</Text>
                <Pressable style={[styles.dropdownBtn, !selectedClassId && styles.dropdownDisabled]} disabled={!selectedClassId} onPress={(e) => { setPickerY(e.nativeEvent.pageY); setPickerType("name"); }}>
                  <Text style={!selectedStudentName ? styles.dropdownPlaceholder : styles.dropdownText} numberOfLines={1}>
                    {fetchingSubData ? "Loading..." : selectedStudentName || "Search student..."}
                  </Text>
                  <Feather name="chevron-down" size={20} color={colors.textSecondary} />
                </Pressable>

                <TouchableOpacity style={[styles.nextBtn, !canConfirm && { opacity: 0.5 }]} onPress={() => setConfirmed(true)} disabled={!canConfirm}>
                  <Text style={styles.nextText}>Next Step</Text>
                  <Feather name="arrow-right" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Feather name="map-pin" size={16} color={colors.primary} />
                    <Text style={styles.summaryLabel}>Section:</Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>{selectedClassName}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Feather name="hash" size={16} color={colors.primary} />
                    <Text style={styles.summaryLabel}>Activity:</Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>{selectedActivityName}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Feather name="user" size={16} color={colors.primary} />
                    <Text style={styles.summaryLabel}>Student:</Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>{selectedStudentName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setConfirmed(false)} style={styles.editSelectionBtn}>
                    <Text style={styles.editSelectionText}>Change Selection</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cameraBoxCard}>
                  <View style={[styles.cameraBox, { borderColor: colors.primary, backgroundColor: colors.primary + "10" }]}>
                    <Feather name="maximize" size={64} color={colors.primary} />
                    <Text style={styles.cameraBoxLabel}>Ready to Score</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.takePhotoBtn} onPress={handleTakePhoto}>
                  <Feather name="camera" size={20} color={colors.white} style={{ marginRight: 12 }} />
                  <Text style={styles.takePhotoText}>Open Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.galleryBtn} onPress={handlePickImage}>
                  <Feather name="image" size={20} color={colors.primary} style={{ marginRight: 12 }} />
                  <Text style={styles.galleryText}>Upload from Gallery</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* CUSTOM PICKER MODAL */}
      <Modal visible={pickerType !== null} transparent animationType="fade" onRequestClose={() => setPickerType(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPickerType(null)} />
          <View style={[styles.popup, { top: Math.min(pickerY + 12, 550) }]}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupHeaderText}>Select {pickerType === "section" ? "Class" : pickerType === "activity" ? "Activity" : "Student"}</Text>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {getPickerOptions().length === 0 ? (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Feather name="search" size={32} color={colors.grayLight} />
                  <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: typography.fontFamily.medium }}>No items found.</Text>
                </View>
              ) : (
                getPickerOptions().map((opt) => (
                  <TouchableOpacity key={opt.id} onPress={() => { if (pickerType === "section") { handleSelectClass(classesList.find(c => c.id === opt.id)!); } else if (pickerType === "activity") { handleSelectActivity(opt.id, opt.label); } else { handleSelectStudent(opt.id, opt.label); } }} style={styles.popupItem}>
                    <Text style={styles.popupItemText}>{opt.label}</Text>
                    <Feather name="chevron-right" size={20} color={colors.grayLight} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
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
  headerTitle: { color: colors.white, fontSize: 20, fontFamily: typography.fontFamily.bold, flex: 1, textAlign: 'center' },
  content: { padding: 24, paddingBottom: 150 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, ...shadows.soft },
  label: { fontSize: 13, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: "uppercase", marginBottom: 8, marginTop: 16, letterSpacing: 0.5 },
  dropdownBtn: { backgroundColor: colors.grayLight, padding: 16, borderRadius: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dropdownDisabled: { opacity: 0.5 },
  dropdownText: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.text },
  dropdownPlaceholder: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  nextBtn: { marginTop: 32, backgroundColor: colors.primary, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12, paddingVertical: 18, borderRadius: 16, ...shadows.soft },
  nextText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  summaryCard: { backgroundColor: colors.white, padding: 24, borderRadius: 24, ...shadows.soft, marginBottom: 24 },
  summaryRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  summaryLabel: { fontFamily: typography.fontFamily.bold, color: colors.textSecondary, width: 80, marginLeft: 12, fontSize: 14 },
  summaryValue: { fontFamily: typography.fontFamily.bold, color: colors.text, flex: 1, fontSize: 15 },
  editSelectionBtn: { marginTop: 8, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.grayLight, alignItems: "center" },
  editSelectionText: { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: 15 },
  cameraBoxCard: { backgroundColor: colors.white, borderRadius: 24, padding: 24, marginBottom: 24, ...shadows.soft },
  cameraBox: { width: "100%", height: 180, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 2, borderStyle: "solid" },
  cameraBoxLabel: { marginTop: 16, fontFamily: typography.fontFamily.bold, fontSize: 16, color: colors.primary },
  takePhotoBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 16, ...shadows.soft },
  takePhotoText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  galleryBtn: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.primary, paddingVertical: 18, borderRadius: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", ...shadows.soft },
  galleryText: { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  popup: { position: "absolute", left: 24, right: 24, backgroundColor: colors.white, borderRadius: 24, overflow: "hidden", ...shadows.medium },
  popupHeader: { backgroundColor: colors.grayLight, padding: 20, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  popupHeaderText: { fontFamily: typography.fontFamily.bold, color: colors.text, fontSize: 16 },
  popupItem: { paddingVertical: 18, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: colors.grayLight, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  popupItemText: { fontSize: 16, color: colors.text, fontFamily: typography.fontFamily.medium },
});
