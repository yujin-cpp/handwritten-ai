import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageMotion } from "../../../components/PageMotion";
import { GlassCard } from "../../../components/GlassCard";
import { useAuthSession } from "../../../hooks/useAuthSession";
import {
    getActivities,
    getStudentsInClass,
    listenToClasses,
} from "../../../services/class.service";
import { showAlert } from "../../../utils/alert";

type PickerType = "section" | "activity" | "name" | null;
type ClassOption = {
  id: string;
  name: string;
  section: string;
  color: string;
  label: string;
};

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

export default function Capture() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { uid } = useAuthSession();

  const returnTo = P(params.returnTo);
  const originClassId = P(params.classId);
  const originActivityId = P(params.activityId);
  const originName = P(params.name, "Class");
  const originSection = P(params.section, "Section");
  const originColor = P(params.color, "#00b679");
  const originTitle = P(params.title, "Activity");

  // --- DATA LISTS ---
  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);

  // --- SELECTION STATE ---
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  const [selectedClassSection, setSelectedClassSection] = useState<string>("");
  const [selectedClassColor, setSelectedClassColor] = useState<string>(originColor);

  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [selectedActivityName, setSelectedActivityName] = useState<string>("");

  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedStudentName, setSelectedStudentName] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [fetchingSubData, setFetchingSubData] = useState(false);

  // --- UI STATE ---
  const [confirmed, setConfirmed] = useState(false);
  const [pickerType, setPickerType] = useState<PickerType>(null);
  const [pickerY, setPickerY] = useState(0);

  // 1. INITIAL LOAD & DATA VALIDATION
  useEffect(() => {
    if (!uid) {
      setClassesList([]);
      setLoading(false);
      return;
    }

    setConfirmed(false);
    setLoading(true);

    const unsubscribe = listenToClasses(uid, (data) => {
      if (!data) {
        setClassesList([]);
        setLoading(false);
        return;
      }

      const list = Object.keys(data).map((key) => ({
        id: key,
        name: data[key].className,
        section: data[key].section,
        color: data[key].themeColor || originColor,
        label: `${data[key].className} - ${data[key].section}`,
      }));
      setClassesList(list);

      if (params.classId) {
        const pClassId = Array.isArray(params.classId)
          ? params.classId[0]
          : params.classId;
        const foundClass = list.find((c) => c.id === pClassId);

        if (foundClass) {
          setSelectedClassId(foundClass.id);
          setSelectedClassName(foundClass.name);
          setSelectedClassSection(foundClass.section);
          setSelectedClassColor(foundClass.color);

          fetchSubData(foundClass.id).then((result) => {
            let validActId = "";
            let validActName = "";
            let validStuId = "";
            let validStuName = "";

            if (params.activityId) {
              const pActId = Array.isArray(params.activityId)
                ? params.activityId[0]
                : params.activityId;
              const foundAct = result.activities.find(
                (a: any) => a.id === pActId,
              );
              if (foundAct) {
                validActId = foundAct.id;
                validActName = foundAct.title;
              }
            }

            if (params.studentId) {
              const pStuId = Array.isArray(params.studentId)
                ? params.studentId[0]
                : params.studentId;
              const foundStu = result.students.find(
                (s: any) => s.id === pStuId,
              );
              if (foundStu) {
                validStuId = foundStu.id;
                validStuName = foundStu.name;
              }
            }

            setSelectedActivityId(validActId);
            setSelectedActivityName(validActName);
            setSelectedStudentId(validStuId);
            setSelectedStudentName(validStuName);

            if (foundClass && validActId && validStuId) {
              setConfirmed(true);
            } else {
              setConfirmed(false);
            }
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [originColor, params.activityId, params.classId, params.studentId, uid]);

  const fetchSubData = async (classId: string) => {
    if (!uid) return { activities: [], students: [] };

    setFetchingSubData(true);
    try {
      const [activities, students] = await Promise.all([
        getActivities(uid, classId),
        getStudentsInClass(uid, classId),
      ]);

      const formattedActivities = activities
        ? (Array.isArray(activities)
            ? activities
            : Object.keys(activities).map((k) => ({
                id: k,
                ...(activities as Record<string, any>)[k],
              }))
          ).map((a: any) => ({
            id: a.id || a.key,
            title: a.title,
          }))
        : [];

      const formattedStudents = students
        ? (Array.isArray(students)
            ? students
            : Object.keys(students).map((k) => ({
                id: k,
                ...(students as Record<string, any>)[k],
              }))
          ).map((s: any) => ({
            id: s.id || s.key,
            name: s.name,
          }))
        : [];

      setActivitiesList(formattedActivities);
      setStudentsList(formattedStudents);

      return { activities: formattedActivities, students: formattedStudents };
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

  const handleSelectActivity = (id: string, name: string) => {
    setSelectedActivityId(id);
    setSelectedActivityName(name);
    setPickerType(null);
    setConfirmed(false);
  };

  const handleSelectStudent = (id: string, name: string) => {
    setSelectedStudentId(id);
    setSelectedStudentName(name);
    setPickerType(null);
    setConfirmed(false);
  };

  const canConfirm =
    !!selectedClassId && !!selectedActivityId && !!selectedStudentId;

  const goBackToOrigin = () => {
    if (returnTo === "quiz-score" && originClassId && originActivityId) {
      router.replace({
        pathname: "/(tabs)/classes/quiz-score",
        params: {
          classId: originClassId,
          activityId: originActivityId,
          name: originName,
          section: originSection,
          color: originColor,
          title: originTitle,
        },
      });
      return;
    }

    router.back();
  };

  const handleNext = () => {
    if (!canConfirm) {
      showAlert(
        "Incomplete",
        "Please select a Section, Activity, and Student.",
      );
      return;
    }
    setConfirmed(true);
  };

  const handlePickImage = async () => {
    if (!canConfirm) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Permission required", "Gallery access is needed.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      router.push({
        pathname: "/(tabs)/capture/image-captured",
        params: {
          imageUri: result.assets[0].uri,
          classId: selectedClassId,
          activityId: selectedActivityId,
          studentId: selectedStudentId,
          returnTo,
          name: selectedClassName || originName,
          section: selectedClassSection || originSection,
          color: selectedClassColor || originColor,
          title: selectedActivityName || originTitle,
        },
      });
    }
  };

  const handleTakePhoto = () => {
    if (!canConfirm) return;
    router.push({
      pathname: "/(tabs)/capture/photo-taking",
      params: {
        classId: selectedClassId,
        activityId: selectedActivityId,
        studentId: selectedStudentId,
        returnTo,
        name: selectedClassName || originName,
        section: selectedClassSection || originSection,
        color: selectedClassColor || originColor,
        title: selectedActivityName || originTitle,
      },
    });
  };

  const getPickerOptions = () => {
    if (pickerType === "section")
      return classesList.map((c) => ({ id: c.id, label: c.label }));
    if (pickerType === "activity")
      return activitiesList.map((a) => ({ id: a.id, label: a.title }));
    if (pickerType === "name")
      return studentsList.map((s) => ({ id: s.id, label: s.name }));
    return [];
  };

  const handlePickerSelect = (id: string, label: string) => {
    if (pickerType === "section") {
      const selectedClass = classesList.find((item) => item.id === id);
      if (selectedClass) {
        handleSelectClass(selectedClass);
      }
    }
    if (pickerType === "activity") handleSelectActivity(id, label);
    if (pickerType === "name") handleSelectStudent(id, label);
  };

  return (
    <View style={styles.page}>
      <LinearGradient
        colors={["#0EA47A", "#017EBA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <TouchableOpacity onPress={goBackToOrigin} style={{ marginRight: 12 }}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Capture Score</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#00b679"
            style={{ marginTop: 50 }}
          />
        ) : (
          <>
            {!confirmed ? (
              <PageMotion delay={80}>
              <GlassCard>
                <View style={{ padding: 20 }}>
                <Text style={styles.label}>Select Section</Text>
                <Pressable
                  style={styles.dropdownBtn}
                  onPress={(e) => {
                    setPickerY(e.nativeEvent.pageY);
                    setPickerType("section");
                  }}
                >
                  <Text
                    style={
                      !selectedClassName ? { color: "#999" } : { color: "#333" }
                    }
                    numberOfLines={1}
                  >
                    {selectedClassId
                      ? `${selectedClassName} - ${selectedClassSection}`
                      : "Choose a class..."}
                  </Text>
                  <Feather name="chevron-down" size={18} color="#999" />
                </Pressable>

                <Text style={styles.label}>Select Activity</Text>
                <Pressable
                  style={[
                    styles.dropdownBtn,
                    !selectedClassId && {
                      opacity: 0.5,
                      backgroundColor: "#f9f9f9",
                    },
                  ]}
                  disabled={!selectedClassId}
                  onPress={(e) => {
                    setPickerY(e.nativeEvent.pageY);
                    setPickerType("activity");
                  }}
                >
                  <Text
                    style={
                      !selectedActivityName
                        ? { color: "#999" }
                        : { color: "#333" }
                    }
                    numberOfLines={1}
                  >
                    {fetchingSubData
                      ? "Loading..."
                      : selectedActivityName || "Choose an activity..."}
                  </Text>
                  <Feather name="chevron-down" size={18} color="#999" />
                </Pressable>

                <Text style={styles.label}>Select Student</Text>
                <Pressable
                  style={[
                    styles.dropdownBtn,
                    !selectedClassId && {
                      opacity: 0.5,
                      backgroundColor: "#f9f9f9",
                    },
                  ]}
                  disabled={!selectedClassId}
                  onPress={(e) => {
                    setPickerY(e.nativeEvent.pageY);
                    setPickerType("name");
                  }}
                >
                  <Text
                    style={
                      !selectedStudentName
                        ? { color: "#999" }
                        : { color: "#333" }
                    }
                    numberOfLines={1}
                  >
                    {fetchingSubData
                      ? "Loading..."
                      : selectedStudentName || "Search student..."}
                  </Text>
                  <Feather name="chevron-down" size={18} color="#999" />
                </Pressable>

                <TouchableOpacity
                  style={[styles.nextBtn, !canConfirm && { opacity: 0.5 }]}
                  onPress={handleNext}
                  disabled={!canConfirm}
                >
                  <Text style={styles.nextText}>Next Step</Text>
                  <Feather name="arrow-right" size={20} color="#fff" />
                </TouchableOpacity>
                </View>
              </GlassCard>
              </PageMotion>
            ) : (
              <>
                <PageMotion delay={40}>
                <GlassCard>
                  <View style={{ padding: 20 }}>
                  <View style={styles.summaryRow}>
                    <Feather name="map-pin" size={14} color="#00b679" />
                    <Text style={styles.summaryLabel}>Section:</Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>
                      {selectedClassName}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Feather name="hash" size={14} color="#00b679" />
                    <Text style={styles.summaryLabel}>Activity:</Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>
                      {selectedActivityName}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Feather name="user" size={14} color="#00b679" />
                    <Text style={styles.summaryLabel}>Student:</Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>
                      {selectedStudentName}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setConfirmed(false)}
                    style={styles.editSelectionBtn}
                  >
                    <Text style={styles.editSelectionText}>
                      Change Selection
                    </Text>
                  </TouchableOpacity>
                  </View>
                </GlassCard>
                </PageMotion>

                <PageMotion delay={120} style={{ marginTop: 25 }}>
                  <GlassCard color={confirmed ? 'rgba(14, 164, 122, 0.08)' : undefined} borderRadius={24}>
                    <View style={{ width: '100%', height: 180, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: confirmed ? '#00b679' : 'rgba(0,0,0,0.05)', borderStyle: confirmed ? 'solid' : 'dashed', borderRadius: 24 }}>
                      <Feather
                        name="maximize"
                        size={60}
                        color={confirmed ? "#00b679" : "#ccc"}
                      />
                      <Text
                        style={[
                          styles.cameraBoxLabel,
                          { color: confirmed ? "#00b679" : "#999" },
                        ]}
                      >
                        Ready to Score
                      </Text>
                    </View>
                  </GlassCard>
                </PageMotion>

                <PageMotion delay={190} style={{ marginTop: 30 }}>
                  <TouchableOpacity onPress={handleTakePhoto}>
                    <GlassCard color="rgba(14, 164, 122, 0.9)" borderRadius={16}>
                      <View style={{ paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                        <Feather name="camera" size={20} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.takePhotoText}>Open Camera</Text>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>

                  <View style={{ height: 15 }} />

                  <TouchableOpacity onPress={handlePickImage}>
                    <GlassCard color="rgba(255,255,255,0.5)" borderRadius={16}>
                      <View style={{ paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#00b679', borderRadius: 16 }}>
                        <Feather name="image" size={20} color="#00b679" style={{ marginRight: 10 }} />
                        <Text style={styles.galleryText}>Upload from Gallery</Text>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                </PageMotion>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* CUSTOM PICKER MODAL */}
      <Modal
        visible={pickerType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerType(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setPickerType(null)}
          />
          <View style={[styles.popup, { top: Math.min(pickerY + 12, 550) }]}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupHeaderText}>
                Select{" "}
                {pickerType === "section"
                  ? "Class"
                  : pickerType === "activity"
                    ? "Activity"
                    : "Student"}
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {getPickerOptions().length === 0 ? (
                <View style={{ padding: 30, alignItems: "center" }}>
                  <Feather name="search" size={24} color="#ccc" />
                  <Text style={{ marginTop: 10, color: "#999" }}>
                    No items found.
                  </Text>
                </View>
              ) : (
                getPickerOptions().map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => handlePickerSelect(opt.id, opt.label)}
                    style={styles.popupItem}
                  >
                    <Text style={styles.popupItemText}>{opt.label}</Text>
                    <Feather name="chevron-right" size={16} color="#eee" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "transparent" },
  header: {
    paddingHorizontal: 18,
    paddingTop: 45,
    paddingBottom: 25,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700", flex: 1 },
  content: { padding: 20, paddingBottom: 150 },

  selectionCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: "#eef2f7",
  },
  label: {
    marginTop: 15,
    marginBottom: 8,
    fontWeight: "600",
    color: "#444",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dropdownBtn: {
    borderWidth: 1,
    borderColor: "#f0f0f0",
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },

  summaryCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 22,
    marginTop: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 9,
    borderWidth: 1,
    borderColor: "#eef2f7",
  },
  summaryRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  summaryLabel: {
    fontWeight: "700",
    color: "#666",
    width: 75,
    marginLeft: 8,
    fontSize: 13,
  },
  summaryValue: { fontWeight: "500", color: "#111", flex: 1, fontSize: 14 },
  editSelectionBtn: {
    marginTop: 5,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    alignItems: "center",
  },
  editSelectionText: { color: "#00b679", fontWeight: "600", fontSize: 14 },

  cameraBox: {
    marginTop: 25,
    width: "100%",
    height: 180,
    backgroundColor: "#fff",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#f0f0f0",
    borderStyle: "dashed",
  },
  cameraBoxFocused: {
    borderColor: "#00b679",
    backgroundColor: "#f0fdf4",
    borderStyle: "solid",
  },
  cameraBoxLabel: { marginTop: 12, fontWeight: "700", fontSize: 15 },

  nextBtn: {
    marginTop: 30,
    backgroundColor: "#00b679",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 3,
  },
  nextText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  actionContainer: { marginTop: 30 },
  takePhotoBtn: {
    backgroundColor: "#00b679",
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    elevation: 4,
    shadowColor: "#00b679",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  takePhotoText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  galleryBtn: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#00b679",
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  galleryText: { color: "#00b679", fontWeight: "700", fontSize: 16 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.2)" },
  popup: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 15,
    overflow: "hidden",
  },
  popupHeader: {
    backgroundColor: "#f9fcfb",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f5f3",
  },
  popupHeaderText: { fontWeight: "700", color: "#1a3d2e", fontSize: 16 },
  popupItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f8f8",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  popupItemText: { fontSize: 15, color: "#333", fontWeight: "500" },
});
