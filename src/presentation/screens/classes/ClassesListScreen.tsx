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
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography, shadows } from "../../theme";
import { classRepository } from "../../../data/repositories/FirebaseClassRepository";
import { useAuthSession } from "../../../hooks/useAuthSession";

type ClassItem = {
  id: string;
  name: string;
  section: string;
  color: string;
  academicYear?: string;
  studentCount: number;
};

const COLORS = ["#00C897", "#1CB38E", "#D096EF", "#A3CEFE", "#FCFF7E"];

export const ClassesListScreen = () => {
  const router = useRouter();
  const { uid } = useAuthSession();
  const [items, setItems] = useState<ClassItem[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!uid) {
      setItems([]);
      return;
    }

    const unsubscribe = classRepository.listenToClassesRaw(uid, (data) => {
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
  }, [uid]);

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

  const handleDeleteRequest = () => {
    setConfirmModalVisible(true);
  };

  async function handleDeleteConfirmed() {
    if (!uid) return;

    try {
      // Clean architecture: we should ideally use the repository to delete
      // Since we don't have deleteClass in IClassRepository yet, we'll import Firebase directly here just for this port, 
      // but you should move this to the repository.
      const { ref, remove } = require("firebase/database");
      const { db } = require("../../../firebase/firebaseConfig");
      
      const deletePromises = Array.from(selected).map((classId) =>
        remove(ref(db, `professors/${uid}/classes/${classId}`)),
      );

      await Promise.all(deletePromises);

      setSelected(new Set());
      setEditMode(false);
      setConfirmModalVisible(false);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.bgWrapper}>
        <LinearGradient
          colors={['rgba(0, 200, 151, 0.15)', 'rgba(151, 255, 229, 0.0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.bgCurve}
        />
        <View style={styles.backdropOrbOne} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Your Classes</Text>
          {items.length > 0 && (
            <TouchableOpacity onPress={toggleEdit} style={styles.editBtn}>
              <Text style={styles.editBtnText}>
                {editMode ? "Cancel" : "Edit"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>Manage your class lists and sections.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsCard}>
          <Feather name="book" size={24} color={colors.primary} />
          <Text style={styles.statsTitle}>{items.length} Total Classes</Text>
        </View>

        {items.length === 0 && !editMode && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No classes found.</Text>
            <Text style={styles.emptySub}>Tap Add Class to get started!</Text>
          </View>
        )}

        <View style={styles.grid}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.classCard,
                { borderTopColor: item.color, borderTopWidth: 6 },
                editMode && selected.has(item.id) && { opacity: 0.7, transform: [{ scale: 0.96 }] }
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
                      academicYear: item.academicYear
                    },
                  })
              }
            >
              <Text style={styles.className} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.classSection} numberOfLines={1}>{item.section}</Text>
              
              <View style={styles.studentCount}>
                <Feather name="users" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.studentCountText}>{item.studentCount} Students</Text>
              </View>

              {editMode && (
                <View style={[styles.selectCircle, selected.has(item.id) && styles.selectCircleActive]}>
                  {selected.has(item.id) && <Feather name="check" size={12} color="#fff" />}
                </View>
              )}
            </Pressable>
          ))}

          {!editMode && (
            <TouchableOpacity style={styles.addCard} onPress={() => router.push("/(tabs)/classes/addclass")}>
              <View style={styles.addIconBg}>
                <Feather name="plus" size={24} color={colors.primary} />
              </View>
              <Text style={styles.addText}>Add Class</Text>
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
              Delete {selected.size} selected {selected.size === 1 ? "class" : "classes"}
            </Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={confirmModalVisible} transparent animationType="fade" onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Class?</Text>
            <Text style={styles.modalSub}>
              Are you sure you want to delete {selected.size === 1 ? selectedNames : `${selected.size} selected classes`}? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setConfirmModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalDelete]} onPress={handleDeleteConfirmed}>
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  bgWrapper: { position: "absolute", top: 0, left: 0, right: 0, height: 250 },
  bgCurve: { flex: 1 },
  backdropOrbOne: { position: "absolute", width: 250, height: 250, borderRadius: 125, backgroundColor: "rgba(0, 200, 151, 0.08)", top: -50, right: -80 },
  header: { paddingHorizontal: 24, paddingBottom: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontFamily: typography.fontFamily.bold, color: colors.text },
  subtitle: { fontSize: 14, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginTop: 4 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.grayLight },
  editBtnText: { color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: 12 },
  content: { paddingHorizontal: 24 },
  statsCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, padding: 20, borderRadius: 16, marginBottom: 20, ...shadows.soft },
  statsTitle: { fontSize: 16, fontFamily: typography.fontFamily.semiBold, color: colors.text, marginLeft: 12 },
  emptyState: { alignItems: "center", marginTop: 30, marginBottom: 20 },
  emptyText: { fontSize: 18, fontFamily: typography.fontFamily.semiBold, color: colors.text },
  emptySub: { fontSize: 14, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  classCard: { width: "47%", backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 16, ...shadows.soft, position: "relative" },
  className: { fontSize: 18, fontFamily: typography.fontFamily.bold, color: colors.text },
  classSection: { fontSize: 14, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginTop: 2 },
  studentCount: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  studentCountText: { color: colors.textSecondary, fontSize: 13, fontFamily: typography.fontFamily.medium },
  selectCircle: { position: "absolute", top: 12, right: 12, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.grayLight, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  selectCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  addCard: { width: "47%", backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 16, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "rgba(0, 200, 151, 0.2)", borderStyle: "dashed" },
  addIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0, 200, 151, 0.1)", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  addText: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: 14 },
  deleteBar: { marginTop: 10, backgroundColor: colors.danger, paddingVertical: 16, borderRadius: 16, alignItems: "center", ...shadows.medium },
  deleteBarText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalCard: { backgroundColor: colors.white, borderRadius: 24, padding: 28, width: "85%", ...shadows.soft },
  modalTitle: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 12 },
  modalSub: { fontSize: 15, fontFamily: typography.fontFamily.regular, color: colors.textSecondary, lineHeight: 22, marginBottom: 25 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  modalCancel: { backgroundColor: colors.grayLight },
  modalCancelText: { color: colors.text, fontFamily: typography.fontFamily.semiBold },
  modalDelete: { backgroundColor: colors.danger },
  modalDeleteText: { color: colors.white, fontFamily: typography.fontFamily.semiBold },
});
