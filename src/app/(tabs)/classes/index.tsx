import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ref, remove } from "firebase/database";
import React, { useEffect, useMemo, useState } from "react";
import {
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
import { auth, db } from "../../../firebase/firebaseConfig";
import { listenToClasses } from "../../../services/class.service";
import { showAlert } from "../../../utils/alert";

type ClassItem = {
  id: string;
  name: string;
  section: string;
  color: string;
  academicYear?: string;
  studentCount: number;
};

const COLORS = ["#BB73E0", "#EE89B0", "#AEBAF8", "#F4A261", "#2A9D8F"];

export default function ClassesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ClassItem[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  // REAL-TIME DATA FETCHING
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsubscribe = listenToClasses(uid, (data) => {
      if (data) {
        const classArray = Object.entries(data).map(
          ([key, val]: any, index) => ({
            id: key,
            name: val.className,
            section: val.section,
            color: val.themeColor || COLORS[index % COLORS.length],
            academicYear: val.semester,
            studentCount: val.students ? Object.keys(val.students).length : 0,
          }),
        );
        setItems(classArray);
      } else {
        setItems([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const anySelected = selected.size > 0;
  const selectedNames = useMemo(
    () =>
      items
        .filter((i) => selected.has(i.id))
        .map((i) => i.name)
        .join(", "),
    [selected, items],
  );

  function toggleEdit() {
    if (editMode) setSelected(new Set());
    setEditMode(!editMode);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // DELETE FROM FIREBASE
  const handleDeleteRequest = () => {
    setConfirmModalVisible(true);
  };

  async function handleDeleteConfirmed() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      const deletePromises = Array.from(selected).map((classId) =>
        remove(ref(db, `professors/${uid}/classes/${classId}`)),
      );

      await Promise.all(deletePromises);

      console.log("✅ Delete successful");
      setSelected(new Set());
      setEditMode(false);
      setConfirmModalVisible(false);
    } catch (error) {
      console.error(error);
      showAlert("Error", "Failed to delete selected classes.");
    }
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{ paddingBottom: 150 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO HEADER */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 20 }}>
        <PageMotion delay={30}>
          <LinearGradient
            colors={["#0EA47A", "#0079B2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroCard}
          >
            <View style={styles.heroHeaderRow}>
              <Text style={styles.welcomeText}>Your Classes</Text>
              {items.length > 0 && (
                <TouchableOpacity
                  onPress={toggleEdit}
                  style={[styles.pill, editMode && styles.pillActive]}
                >
                  <Text
                    style={[styles.pillText, editMode && { color: "#fff" }]}
                  >
                    {editMode ? "Cancel" : "Edit"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.welcomeSub}>
              Manage your class lists and sections.
            </Text>
          </LinearGradient>
        </PageMotion>

        {/* OVERLAPPING STATS CARD */}
        <PageMotion delay={100}>
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsRow}>
              <View style={styles.analyticsIconBox}>
                <Feather name="book" size={20} color="#0EA47A" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.analyticsTitle}>
                  {items.length} Total Classes
                </Text>
              </View>
            </View>
          </View>
        </PageMotion>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {items.length === 0 && !editMode && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No classes found.</Text>
            <Text style={styles.emptySub}>Tap Add Class to get started!</Text>
          </View>
        )}

        <View style={styles.classGrid}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.classCard,
                { backgroundColor: item.color },
                editMode &&
                  selected.has(item.id) && {
                    opacity: 0.8,
                    borderWidth: 2,
                    borderColor: "#fff",
                  },
              ]}
              onPress={() =>
                editMode
                  ? toggleSelect(item.id)
                  : router.push({
                      pathname: "/(tabs)/classes/classinformation",
                      params: {
                        classId: item.id,
                        name: item.name,
                        section: item.section,
                        color: item.color,
                        academicYear: item.academicYear,
                      },
                    })
              }
            >
              <Text style={styles.className} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.classSection} numberOfLines={1}>
                {item.section}
              </Text>

              <View
                style={{
                  marginTop: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Feather
                  name="users"
                  size={14}
                  color="rgba(255,255,255,0.9)"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    fontSize: 13,
                    fontWeight: "500",
                  }}
                >
                  {item.studentCount} Students
                </Text>
              </View>

              {editMode && (
                <View
                  style={[
                    styles.selectCircle,
                    selected.has(item.id) && styles.selectCircleActive,
                  ]}
                >
                  {selected.has(item.id) && (
                    <Feather name="check" size={12} color="#0EA47A" />
                  )}
                </View>
              )}
            </Pressable>
          ))}

          {!editMode && (
            <TouchableOpacity
              style={[styles.classCard, styles.addClassGridCard]}
              onPress={() => router.push("/(tabs)/classes/addclass")}
            >
              <Feather
                name="plus"
                size={32}
                color="#0EA47A"
                style={{ marginBottom: 6 }}
              />
              <Text style={styles.addGridText}>Add Class</Text>
            </TouchableOpacity>
          )}
        </View>

        {editMode && (
          <TouchableOpacity
            disabled={!anySelected}
            style={[styles.deleteBar, !anySelected && { opacity: 0.5 }]}
            onPress={handleDeleteRequest}
          >
            <Text style={styles.deleteBarText}>
              Delete {selected.size} selected{" "}
              {selected.size === 1 ? "class" : "classes"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Custom Delete Confirmation Modal */}

      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Class?</Text>
            <Text style={styles.modalSub}>
              Are you sure you want to delete{" "}
              {selected.size === 1
                ? selectedNames
                : `${selected.size} selected classes`}
              ? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalDelete]}
                onPress={handleDeleteConfirmed}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f7fb" },

  heroCard: {
    borderRadius: 24,
    padding: 24,
    paddingBottom: 45,
    shadowColor: "#0079B2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  welcomeSub: {
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    fontSize: 14,
  },

  analyticsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginTop: -25,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  analyticsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  analyticsIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#e6f7f2",
    justifyContent: "center",
    alignItems: "center",
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },

  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  pillActive: { backgroundColor: "rgba(0,0,0,0.2)", borderWidth: 0 },
  pillText: { fontWeight: "700", color: "#0EA47A", fontSize: 13 },

  content: { paddingHorizontal: 20, marginTop: 30 },

  emptyState: { alignItems: "center", marginTop: 30, marginBottom: 20 },
  emptyText: { fontSize: 18, color: "#333", fontWeight: "600" },
  emptySub: { fontSize: 14, color: "#888", marginTop: 4 },

  classGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  classCard: {
    width: "47%",
    borderRadius: 16,
    padding: 15,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    position: "relative",
  },
  className: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "700",
  },
  classSection: {
    color: "#fff",
    fontSize: 15,
    marginTop: 2,
  },

  selectCircle: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  selectCircleActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },

  addClassGridCard: {
    backgroundColor: "rgba(14, 164, 122, 0.05)",
    borderWidth: 2,
    borderColor: "rgba(14, 164, 122, 0.4)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  addGridText: {
    color: "#0EA47A",
    fontWeight: "800",
    fontSize: 15,
  },

  deleteBar: {
    marginTop: 15,
    backgroundColor: "#D32F2F",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#D32F2F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteBarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1a1a1a",
  },
  modalSub: {
    fontSize: 14,
    color: "#555",
    marginBottom: 24,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCancel: {
    backgroundColor: "#f0f0f0",
  },
  modalCancelText: {
    color: "#333",
    fontWeight: "600",
  },
  modalDelete: {
    backgroundColor: "#e53935",
  },
  modalDeleteText: {
    color: "#fff",
    fontWeight: "600",
  },
});
