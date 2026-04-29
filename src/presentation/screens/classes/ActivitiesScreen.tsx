import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { activityRepository } from "../../../data/repositories/FirebaseActivityRepository";
import { showAlert } from "../../../utils/alert";
import { safeGoBack } from "../../../utils/navigation";
import { getContrastColor, getIconBoxColors } from "../../../utils/colorUtils";

const P = (v: string | string[] | undefined, fb = "") => Array.isArray(v) ? v[0] : v ?? fb;

type Activity = { id: string; title: string };

export const ActivitiesScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { uid } = useAuthSession();

  const classId = P(params.classId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, colors.primary);

  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const anySelected = selected.size > 0;
  const displayItems = useMemo(() => items, [items]);

  useEffect(() => {
    if (!uid || !classId) return;

    const unsubscribe = activityRepository.listenToActivities(uid, classId, (data) => {
      setItems(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [classId, uid]);

  function toggleEdit() {
    if (editMode) setSelected(new Set());
    setEditMode((v) => !v);
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

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    if (!uid || !classId) return;

    try {
      setIsAdding(true);
      await activityRepository.addActivity(uid, classId, title);
      setNewTitle("");
      setAddOpen(false);
    } catch {
      showAlert("Error", "Failed to add activity.");
    } finally {
      setIsAdding(false);
    }
  }

  async function doDelete() {
    if (!uid || !classId) return;

    try {
      setIsDeleting(true);
      const deletePromises = Array.from(selected).map((id) =>
        activityRepository.deleteActivity(uid, classId, id)
      );

      await Promise.all(deletePromises);
      setSelected(new Set());
      setConfirmOpen(false);
      setEditMode(false);
    } catch {
      showAlert("Error", "Failed to delete activities.");
    } finally {
      setIsDeleting(false);
    }
  }

  const headerTextColor = getContrastColor(headerColor);
  const { bg: iconBg, icon: iconFg } = getIconBoxColors(headerColor);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={headerTextColor} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerSmall, { color: headerTextColor }]}>{className}</Text>
          <Text style={[styles.headerBig, { color: headerTextColor }]} numberOfLines={1}>{section}</Text>
        </View>
        <TouchableOpacity onPress={toggleEdit} style={styles.editHeaderBtn}>
          <Feather name={editMode ? "check" : "trash-2"} size={20} color={headerTextColor} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Activities</Text>
            <Text style={styles.subtitle}>{items.length} total items</Text>
          </View>

          {!editMode && (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: headerColor }]} onPress={() => setAddOpen(true)}>
              <Feather name="plus" size={18} color={colors.white} />
              <Text style={styles.addBtnText}>New</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={headerColor} />
          </View>
        ) : (
          <View style={styles.listContainer}>
            {displayItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={[styles.emptyIconBox, { backgroundColor: iconBg }]}>
                  <Feather name="book-open" size={40} color={iconFg} />
                </View>
                <Text style={styles.emptyText}>No activities created yet.</Text>
                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setAddOpen(true)}>
                  <Text style={[styles.emptyAddText, { color: headerColor }]}>Add your first activity</Text>
                </TouchableOpacity>
              </View>
            ) : (
              displayItems.map((a, idx) => (
                <TouchableOpacity
                  key={a.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (editMode) toggleSelect(a.id);
                    else router.push({
                      pathname: "/(tabs)/classes/activity-details",
                      params: { classId, activityId: a.id, name: className, section, color: headerColor, title: a.title },
                    });
                  }}
                  style={[styles.activityCard, selected.has(a.id) && styles.selectedCard]}
                >
                  <View style={styles.cardContent}>
                    {editMode ? (
                      <View style={[styles.checkCircle, selected.has(a.id) && styles.checkCircleSelected]}>
                        {selected.has(a.id) && <Feather name="check" size={14} color={colors.white} />}
                      </View>
                    ) : (
                      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                        <Feather name="file-text" size={20} color={iconFg} />
                      </View>
                    )}
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityText, selected.has(a.id) && { color: colors.danger }]} numberOfLines={1}>
                        {a.title}
                      </Text>
                      {!editMode && <Text style={styles.tapToView}>Tap to view details</Text>}
                    </View>
                  </View>
                  {!editMode && <Feather name="chevron-right" size={20} color={colors.grayLight} />}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {editMode && (
        <View style={[styles.deleteBarWrapper, { paddingBottom: insets.bottom + 120 }]}>
          <TouchableOpacity
            disabled={!anySelected || isDeleting}
            onPress={() => setConfirmOpen(true)}
            style={[styles.deleteBar, (!anySelected || isDeleting) && { opacity: 0.5 }]}
          >
            <Feather name="trash-2" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.deleteText}>
              {isDeleting ? "Deleting..." : `Delete ${selected.size} Item${selected.size > 1 ? "s" : ""}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleEdit} style={styles.cancelEditBtn}>
            <Text style={styles.cancelEditText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Modal */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setAddOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Activity</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Activity Title</Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Midterm Quiz 1"
                style={styles.modalInput}
                autoFocus
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSave, { backgroundColor: headerColor }, isAdding && { opacity: 0.7 }]}
              onPress={handleAdd}
              disabled={isAdding}
            >
              {isAdding ? <ActivityIndicator color={colors.white} size="small" /> : (
                <>
                  <Text style={styles.modalSaveText}>Create Activity</Text>
                  <Feather name="plus" size={20} color={colors.white} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation */}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center', padding: 32 }]}>
            <View style={styles.warningIconBox}>
              <Feather name="alert-triangle" size={32} color={colors.danger} />
            </View>
            <Text style={styles.confirmTitle}>Delete Activity?</Text>
            <Text style={styles.confirmBody}>
              This will permanently delete {selected.size} item{selected.size > 1 ? "s" : ""} and all associated grades.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmOpen(false)}>
                <Text style={styles.confirmCancelText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDelete} onPress={doDelete}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
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
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: { color: colors.white, fontSize: 12, opacity: 0.9, fontFamily: typography.fontFamily.bold, textTransform: 'uppercase' },
  headerBig: { color: colors.white, fontSize: 18, fontFamily: typography.fontFamily.bold },
  editHeaderBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 150 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 24, fontFamily: typography.fontFamily.bold, color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, fontFamily: typography.fontFamily.medium, marginTop: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, ...shadows.soft },
  addBtnText: { color: colors.white, fontFamily: typography.fontFamily.bold, marginLeft: 8, fontSize: 15 },
  loadingBox: { marginTop: 100, alignItems: "center" },
  listContainer: { gap: 16 },
  activityCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.soft,
  },
  selectedCard: { borderColor: colors.danger, borderWidth: 2, backgroundColor: '#fff5f5' },
  cardContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconBox: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.grayLight, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  checkCircleSelected: { backgroundColor: colors.danger, borderColor: colors.danger },
  activityInfo: { flex: 1, marginLeft: 16 },
  activityText: { fontSize: 17, fontFamily: typography.fontFamily.bold, color: colors.text },
  tapToView: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily.medium, marginTop: 4 },
  emptyBox: { alignItems: "center", marginTop: 80 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyText: { fontSize: 16, color: colors.textSecondary, fontFamily: typography.fontFamily.medium },
  emptyAddBtn: { marginTop: 16 },
  emptyAddText: { fontFamily: typography.fontFamily.bold, fontSize: 16 },
  deleteBarWrapper: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.grayLight, ...shadows.medium },
  deleteBar: { backgroundColor: colors.danger, paddingVertical: 18, borderRadius: 16, alignItems: "center", flexDirection: 'row', justifyContent: 'center' },
  deleteText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  cancelEditBtn: { marginTop: 16, alignItems: 'center' },
  cancelEditText: { color: colors.textSecondary, fontFamily: typography.fontFamily.bold, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: colors.white, borderRadius: 24, padding: 24, ...shadows.medium },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.text },
  inputBox: { marginBottom: 24 },
  inputLabel: { fontSize: 13, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  modalInput: { backgroundColor: colors.grayLight, padding: 16, borderRadius: 16, fontSize: 16, fontFamily: typography.fontFamily.medium, color: colors.text },
  modalSave: { paddingVertical: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...shadows.soft },
  modalSaveText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  warningIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  confirmTitle: { fontSize: 22, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 12 },
  confirmBody: { fontSize: 15, color: colors.textSecondary, fontFamily: typography.fontFamily.medium, textAlign: "center", lineHeight: 24, marginBottom: 32 },
  confirmActions: { flexDirection: "row", gap: 16 },
  confirmCancel: { flex: 1, paddingVertical: 18, borderRadius: 16, backgroundColor: colors.grayLight, alignItems: 'center' },
  confirmCancelText: { color: colors.textSecondary, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  confirmDelete: { flex: 1, paddingVertical: 18, borderRadius: 16, backgroundColor: colors.danger, alignItems: 'center', ...shadows.soft },
  confirmDeleteText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
});
